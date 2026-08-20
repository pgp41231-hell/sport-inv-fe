import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CameraOff, Check, CircleAlert, Clock3, LoaderCircle, LogOut, PackageCheck, Plus, QrCode, RotateCcw, ScanLine, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../api.js";
import { publicPhotoUrl } from "../../media.js";
import "./equipment.css";

const label = (value) => String(value || "").toLowerCase().replaceAll("_", " ").replace(/^./, (x) => x.toUpperCase());

function RequestCard({ request, user, sports, onChanged, notify }) {
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const qrDragStart = useRef(null);
  const sport = sports.find((item) => item.id === request.sportId);
  const canApprove = user.role === "admin" || (user.role === "approver" && (request.requestType === "CASUAL" || [sport?.primaryPocId, sport?.secondaryPocId].includes(user.id)));
  const decide = async (decision) => {
    try { await api.decideEquipmentRequest(user, request.id, { decision }); notify(`Request ${decision === "approve" ? "approved" : "rejected"}`); onChanged(); }
    catch (error) {
      const needsConfirmation = decision === "approve" && error.status === 409 && error.details?.details?.requiresConfirmation;
      if (needsConfirmation && window.confirm(`${error.message}\n\nApprove this additional request and allow kiosk handover anyway?`)) {
        try { await api.decideEquipmentRequest(user, request.id, { decision, confirmConcurrentIssue: true }); notify("Request approved after confirmation"); onChanged(); }
        catch (confirmedError) { notify(confirmedError.message, "error"); }
        return;
      }
      notify(error.message, "error");
    }
  };
  const generate = async () => {
    if (qr) { setQrOpen((open) => !open); return; }
    try { setQr((await api.equipmentQr(user, request.id)).data); setQrOpen(true); } catch (error) { notify(error.message, "error"); }
  };
  const returnItems = async () => {
    try {
      const created = await api.createEquipmentRequest(user, { requestType: "RETURN", parentRequestId: request.id, items: request.items.map((item) => ({ equipmentId: item.equipmentId, quantity: item.quantity })) });
      setQr((await api.equipmentQr(user, created.data.id)).data); setQrOpen(true); onChanged();
    } catch (error) { notify(error.message, "error"); }
  };
  return <article className="panel equipment-request-card"><div className="request-card-head"><div><strong>{label(request.requestType)} request</strong><small>{request.requesterName || request.requesterEmail}{request.teamName ? ` · ${request.teamName}` : ""}</small></div><span className={`status status-${String(request.status).toLowerCase()}`}>{label(request.status)}</span></div><div className="request-items">{request.items?.map((item) => <span key={item.equipmentId}>{item.name} × {item.quantity}</span>)}</div>{request.dueAt && <p className={new Date(request.dueAt) < new Date() && request.status === "ISSUED" ? "overdue" : "muted-copy"}><Clock3 size={14} />Due {new Date(request.dueAt).toLocaleString("en-IN")}</p>}<div className="request-actions">{request.status === "PENDING" && canApprove && <><button className="button button-danger-soft" onClick={() => decide("reject")}><X size={15} />Reject</button><button className="button button-primary" onClick={() => decide("approve")}><Check size={15} />Approve</button></>}{request.status === "APPROVED" && request.requesterId === user.id && <button className="button button-primary" onClick={generate} aria-expanded={qrOpen}><QrCode size={16} />{qrOpen ? "Hide QR" : "Show QR"}</button>}{request.status === "ISSUED" && request.requesterId === user.id && request.requestType !== "RETURN" && <button className="button button-secondary" onClick={returnItems}><RotateCcw size={16} />Return items</button>}</div>{qr && <div className={`qr-reveal ${qrOpen ? "open" : ""}`} aria-hidden={!qrOpen}><div className="qr-card"><button className="qr-drag-handle" type="button" aria-label="Drag up or click to hide QR" onClick={() => setQrOpen(false)} onPointerDown={(event) => { qrDragStart.current = event.clientY; event.currentTarget.setPointerCapture?.(event.pointerId); }} onPointerUp={(event) => { if (qrDragStart.current !== null && event.clientY - qrDragStart.current < -30) setQrOpen(false); qrDragStart.current = null; }}><span /></button><QRCodeSVG value={qr.token} size={190} level="M" /><strong>{qr.purpose} equipment</strong><small>Expires {new Date(qr.expiresAt).toLocaleString("en-IN")}</small><code>{qr.token}</code></div></div>}</article>;
}

function Kiosk({ user, notify, onLogout }) {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const [assetScans, setAssetScans] = useState([]);
  const [manualAssetTag, setManualAssetTag] = useState("");
  const [message, setMessage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanMode, setScanMode] = useState("REQUEST");
  const videoRef = useRef(null);
  const scannerControls = useRef(null);
  const report = (text, type = "success") => { setMessage({ text, type }); notify?.(text, type); };
  const inspectToken = useCallback(async (value) => {
    setMessage(null);
    try { setPreview((await api.inspectEquipmentQr(user, value.trim())).data); setAssetScans([]); setOutcomes({}); }
    catch (error) { setPreview(null); report(error.message, "error"); }
  }, [user]);
  const inspect = async (event) => { event.preventDefault(); await inspectToken(token); };
  const stopCamera = useCallback(() => {
    scannerControls.current?.stop(); scannerControls.current = null;
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    setCameraActive(false);
  }, []);
  const addAssetTag = useCallback((rawTag, forcedOutcome) => {
    const assetTag = String(rawTag || "").trim().replace(/^asset:/i, "");
    if (!assetTag) return;
    if (assetScans.some((scan) => scan.assetTag.toLowerCase() === assetTag.toLowerCase())) return report(`${assetTag} is already accounted for`, "error");
    const item = preview?.items?.find((candidate) => candidate.tracking === "ASSET" && candidate.assets?.some((asset) => asset.assetTag.toLowerCase() === assetTag.toLowerCase()));
    if (!item) return report("That asset tag is not valid for this request", "error");
    const itemScans = assetScans.filter((scan) => scan.equipmentId === item.equipmentId);
    if (itemScans.length >= Number(item.quantity)) return report(`All required ${item.name} assets are already accounted for`, "error");
    setAssetScans((current) => [...current, { equipmentId: item.equipmentId, assetTag, outcome: forcedOutcome || (preview.purpose === "RETURN" ? "RETURNED" : undefined), note: "" }]);
    setManualAssetTag("");
    report(`${assetTag} recorded`);
  }, [assetScans, preview]);
  const startCamera = async (mode = preview ? "ASSET" : "REQUEST") => {
    setMessage(null);
    setScanMode(mode);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      scannerControls.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } }, videoRef.current,
        (result) => {
          if (!result) return;
          const value = result.getText();
          stopCamera();
          if (mode === "REQUEST") { setToken(value); inspectToken(value); }
          else addAssetTag(value);
        },
      );
      setCameraActive(true);
    } catch (error) { stopCamera(); report(error?.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again." : `Could not start the camera: ${error.message}`, "error"); }
  };
  useEffect(() => stopCamera, [stopCamera]);
  const logout = async () => { stopCamera(); try { await api.logout(user); } catch {} onLogout?.(); };
  const confirm = async () => {
    try {
      const values = Object.entries(outcomes).map(([equipmentId, value]) => ({ equipmentId, damaged: Number(value.damaged || 0), missing: Number(value.missing || 0), note: value.note || null }));
      await api.confirmEquipmentQr(user, token.trim(), values, assetScans); report("Custody updated and token consumed"); setToken(""); setPreview(null); setOutcomes({}); setAssetScans([]);
    } catch (error) { report(error.message, "error"); }
  };
  const trackedItems = preview?.items?.filter((item) => item.tracking === "ASSET") || [];
  const trackedComplete = trackedItems.every((item) => assetScans.filter((scan) => scan.equipmentId === item.equipmentId).length === Number(item.quantity));
  const removeScan = (equipmentId, assetTag) => setAssetScans((current) => current.filter((scan) => !(scan.equipmentId === equipmentId && scan.assetTag === assetTag)));
  const updateScan = (equipmentId, assetTag, patch) => setAssetScans((current) => current.map((scan) => scan.equipmentId === equipmentId && scan.assetTag === assetTag ? { ...scan, ...patch } : scan));
  return <main className="kiosk-shell"><section className="kiosk-card">
    <div className="kiosk-header"><span><ScanLine size={52} /><span><h1>Inventory scanner</h1><p>{preview && trackedItems.length ? "Now scan each physical asset label." : "Scan a Courtyard issue or return QR."}</p></span></span><button className="button button-secondary" onClick={logout}><LogOut size={17} />Sign out</button></div>
    <div className="scan-steps"><span className={preview ? "done" : "active"}>1 · Request QR</span><span className={preview && trackedItems.length && !trackedComplete ? "active" : trackedComplete && trackedItems.length ? "done" : ""}>2 · Asset tags</span><span className={preview && trackedComplete ? "active" : ""}>3 · Confirm</span></div>
    <div className={`camera-scanner ${cameraActive ? "active" : ""}`}><video ref={videoRef} muted playsInline aria-label="QR camera preview" /><div className="camera-guide"><span /><p>Hold the {scanMode === "ASSET" ? "asset label" : "request QR"} inside the frame</p></div></div>
    <div className="camera-actions">{cameraActive ? <button className="button button-danger-soft" onClick={stopCamera}><CameraOff size={17} />Stop camera</button> : <button className="button button-primary" onClick={() => startCamera(preview && trackedItems.length ? "ASSET" : "REQUEST")}><Camera size={17} />{preview && trackedItems.length ? "Scan next asset" : "Scan request QR"}</button>}<small>The same camera reads the request and physical asset labels.</small></div>
    {!preview && <><div className="scan-divider"><span>or paste a token</span></div><form onSubmit={inspect}><input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste request QR token" /><button className="button button-secondary">Inspect</button></form></>}
    {message && <p className={message.type === "error" ? "form-error" : "form-success"}>{message.type === "error" && <CircleAlert size={16} />}{message.text}</p>}
    {preview && <div className="scan-preview"><h2>{preview.purpose} · {preview.requesterName}</h2>{preview.teamName && <p>Team: {preview.teamName}</p>}
      {preview.items.map((item) => {
        const scans = assetScans.filter((scan) => scan.equipmentId === item.equipmentId);
        return <div className="scan-item" key={item.equipmentId}><strong>{item.name} × {item.quantity}</strong><small>{item.tracking === "ASSET" ? `${scans.length} of ${item.quantity} physical assets accounted for` : "Bulk quantity"}</small>
          {item.tracking === "ASSET" && scans.map((scan) => <div className="asset-scan-row" key={scan.assetTag}><code>{scan.assetTag}</code>{preview.purpose === "RETURN" && <select aria-label={`Outcome for ${scan.assetTag}`} value={scan.outcome} onChange={(event) => updateScan(item.equipmentId, scan.assetTag, { outcome: event.target.value })}><option value="RETURNED">Returned</option><option value="DAMAGED">Damaged</option><option value="MISSING">Missing</option></select>}<button type="button" className="icon-button" aria-label={`Remove ${scan.assetTag}`} onClick={() => removeScan(item.equipmentId, scan.assetTag)}><X size={15} /></button></div>)}
          {item.tracking === "ASSET" && preview.purpose === "RETURN" && item.assets?.filter((asset) => !assetScans.some((scan) => scan.assetTag.toLowerCase() === asset.assetTag.toLowerCase())).map((asset) => <button type="button" className="button button-danger-soft missing-asset-button" key={asset.id} onClick={() => addAssetTag(asset.assetTag, "MISSING")}>Mark {asset.assetTag} missing</button>)}
          {preview.purpose === "RETURN" && item.tracking !== "ASSET" && <span><input type="number" min="0" max={item.quantity} placeholder="Damaged" onChange={(event) => setOutcomes((current) => ({ ...current, [item.equipmentId]: { ...current[item.equipmentId], damaged: event.target.value } }))} /><input type="number" min="0" max={item.quantity} placeholder="Missing" onChange={(event) => setOutcomes((current) => ({ ...current, [item.equipmentId]: { ...current[item.equipmentId], missing: event.target.value } }))} /></span>}
        </div>;
      })}
      {trackedItems.length > 0 && <form className="manual-asset-form" onSubmit={(event) => { event.preventDefault(); addAssetTag(manualAssetTag); }}><input value={manualAssetTag} onChange={(event) => setManualAssetTag(event.target.value)} placeholder="Enter asset tag if label cannot be scanned" /><button className="button button-secondary">Add tag</button></form>}
      <button className="button button-primary button-wide" disabled={!trackedComplete} onClick={confirm}><PackageCheck size={17} />Confirm custody change</button>{!trackedComplete && <small>Scan or account for every tracked asset before confirming.</small>}
    </div>}
  </section></main>;
}

function EquipmentCard({ item, clickable, onRequest }) {
  const content = <>{publicPhotoUrl(item.photoPath) ? <img className="pool-photo" src={publicPhotoUrl(item.photoPath)} alt="" /> : <span className="pool-photo placeholder"><PackageCheck /></span>}<span className="status status-neutral">CASUAL · {item.tracking || "BULK"}</span><h3>{item.name}</h3><p>{Number(item.casualPoolQuantity || 0)} available</p>{clickable && <small className="card-request-hint">Click to request</small>}</>;
  return clickable
    ? <button type="button" className="panel pool-card equipment-choice-card" onClick={() => onRequest(item)} aria-label={`Request ${item.name}`}>{content}</button>
    : <article className="panel pool-card">{content}</article>;
}

export default function EquipmentModule({ user, equipment, notify, onLogout }) {
  const [sports, setSports] = useState([]), [teams, setTeams] = useState([]), [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true), [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ requestType: "CASUAL", equipmentId: "", quantity: 1, expectedReturnAt: "", teamId: "" });
  const load = useCallback(async () => { setLoading(true); try { const [s, t, r] = await Promise.all([api.equipmentSports(user), api.equipmentTeams(user), api.equipmentRequests(user)]); setSports(s.data || []); setTeams(t.data || []); setRequests(r.data || []); } catch (error) { notify(error.message, "error"); } finally { setLoading(false); } }, [user, notify]);
  useEffect(() => { if (user.role !== "inventory_kiosk") load(); }, [load, user.role]);
  const isStudent = user.role === "requester";
  const captainTeams = useMemo(() => teams.filter((team) => team.captainId === user.id && team.active), [teams, user.id]);
  const availableForRequest = (item) => Number(form.requestType === "CASUAL" ? item.casualPoolQuantity : item.inInventoryQuantity);
  const choices = equipment.filter((item) => item.active && availableForRequest(item) > 0).map((item) => ({ ...item, availableQuantity: availableForRequest(item) }));
  const casualEquipment = equipment.filter((item) => item.active && Number(item.casualPoolQuantity || 0) > 0);
  const displayedEquipment = isStudent ? casualEquipment : equipment.filter((item) => item.active);
  const openNewRequest = () => { setForm((current) => ({ ...current, requestType: "CASUAL", equipmentId: "", quantity: 1 })); setShowForm(true); };
  const requestItem = (item) => {
    setForm({ requestType: "CASUAL", equipmentId: item.id, quantity: 1, expectedReturnAt: "", teamId: "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = async (event) => { event.preventDefault(); try { await api.createEquipmentRequest(user, { requestType: form.requestType, teamId: form.requestType === "TEAM" ? form.teamId : null, expectedReturnAt: form.requestType === "CASUAL" ? new Date(form.expectedReturnAt).toISOString() : null, items: [{ equipmentId: form.equipmentId, quantity: Number(form.quantity) }] }); notify("Equipment request submitted"); setShowForm(false); load(); } catch (error) { notify(error.message, "error"); } };
  if (user.role === "inventory_kiosk") return <Kiosk user={user} notify={notify} onLogout={onLogout} />;
  const visibleRequests = ["approver", "admin"].includes(user.role) ? requests : requests.filter((item) => item.requesterId === user.id);
  const selected = choices.find((item) => item.id === form.equipmentId);
  return <div className="page-stack">
    <header className="page-header"><div><p className="eyebrow">Equipment custody</p><h1>Equipment</h1><p>{isStudent ? "Choose casual equipment and submit a request for collection." : "Review available equipment and track issue or return status."}</p></div><button className="button button-primary" onClick={showForm ? () => setShowForm(false) : openNewRequest}>{showForm ? <X size={17} /> : <Plus size={17} />}{showForm ? "Close request" : "New request"}</button></header>
    {showForm && <form className="panel equipment-request-form" onSubmit={submit}><label className="field">Request type<select value={form.requestType} onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value, equipmentId: "" }))}><option value="CASUAL">Casual</option>{captainTeams.length > 0 && <option value="TEAM">Team practice</option>}</select></label>{form.requestType === "TEAM" && <label className="field">Team<select required value={form.teamId} onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}><option value="">Select team</option>{captainTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}<label className="field">Item<select required value={form.equipmentId} onChange={(event) => setForm((current) => ({ ...current, equipmentId: event.target.value }))}><option value="">Select equipment</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.availableQuantity} available)</option>)}</select></label><label className="field">Quantity<input required type="number" min="1" max={selected?.availableQuantity || undefined} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} /></label>{form.requestType === "CASUAL" && <label className="field">Expected return<input required type="datetime-local" value={form.expectedReturnAt} onChange={(event) => setForm((current) => ({ ...current, expectedReturnAt: event.target.value }))} /></label>}<button className="button button-primary"><Plus size={16} />Submit request</button></form>}
    <section><div className="section-heading"><div><p className="eyebrow">Casual pool</p><h2>{isStudent ? "Available to request" : "Equipment catalogue"}</h2></div></div>{displayedEquipment.length ? <div className="equipment-pool-grid">{displayedEquipment.map((item) => <EquipmentCard key={item.id} item={item} clickable={isStudent} onRequest={requestItem} />)}</div> : <div className="empty-assignments">No casual equipment is currently available.</div>}</section>
    <section><div className="section-heading"><div><p className="eyebrow">{["approver", "admin"].includes(user.role) ? "Review desk" : "My activity"}</p><h2>Equipment requests</h2></div>{requests.some((item) => item.status === "ISSUED" && item.dueAt && new Date(item.dueAt) < new Date()) && <span className="overdue-chip"><AlertTriangle size={15} />Overdue items</span>}</div>{loading ? <LoaderCircle className="spin" /> : visibleRequests.length ? <div className="equipment-request-grid">{visibleRequests.map((request) => <RequestCard key={request.id} request={request} user={user} sports={sports} onChanged={load} notify={notify} />)}</div> : <p className="empty-assignments">No equipment requests yet.</p>}</section>
  </div>;
}
