import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BadgeCheck, Boxes, Check, Clock3, Dumbbell, ImagePlus, Layers3, LoaderCircle,
  MapPin, PackageCheck, PackagePlus, Pencil, Plus, ScanBarcode, ShieldAlert, Sparkles, Users, X,
} from "lucide-react";
import { api } from "../../api.js";
import { uploadRecordPhoto, validatePhoto } from "../../media.js";
import { catalogPhotoUrl } from "../../catalog-media.js";
import "./admin-operations.css";

const titleCase = (value) => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const when = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function EquipmentFormArtwork() {
  return <svg className="equipment-form-art" viewBox="0 0 440 220" role="img" aria-label="Sports equipment line illustration">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M45 176h350M92 46v130M348 46v130M92 76h256M220 76v100" opacity=".28" />
      <circle cx="220" cy="126" r="31" opacity=".34" />
      <path d="M190 126h60M220 96c-10 11-15 21-15 31 0 11 5 21 15 30M220 96c10 11 15 21 15 31 0 11-5 21-15 30" opacity=".34" />
      <g transform="translate(41 83) rotate(-20 40 40)"><ellipse cx="39" cy="28" rx="22" ry="31" /><path d="M39 59v45M29 70h20M26 17l27 23M53 17L26 40" /></g>
      <g transform="translate(321 94)"><path d="M8 62h68M18 49h48M28 37h28" /><path d="M32 6h20l8 31H24zM38 6l-7-13M46 6l7-13" /></g>
    </g>
  </svg>;
}

export function AdminOverview({ venueApprovals, equipmentRequests, equipment, sports, navigate }) {
  const pendingVenues = venueApprovals.filter((request) => !request.resourceType || request.resourceType === "venue");
  const legacyEquipmentPending = venueApprovals.filter((request) => request.resourceType === "equipment");
  const equipmentPending = [...legacyEquipmentPending, ...equipmentRequests.filter((request) => request.status === "PENDING")];
  const issued = equipmentRequests.filter((request) => request.status === "ISSUED");
  const overdue = issued.filter((request) => request.requestType === "CASUAL" && request.dueAt && new Date(request.dueAt) < new Date());
  const missingPocs = sports.filter((sport) => sport.active && !sport.primaryPocId && !sport.secondaryPocId);
  const issuedUnits = equipment.reduce((sum, item) => sum + Number(item.issuedQuantity || 0), 0);
  const cards = [
    { label: "Equipment approvals", value: equipmentPending.length, icon: BadgeCheck, tone: "amber", page: "approvals" },
    { label: "Equipment issued", value: issuedUnits || issued.length, icon: PackageCheck, tone: "green", page: "equipment" },
    { label: "Overdue returns", value: overdue.length, icon: Clock3, tone: "red", page: "approvals" },
    { label: "Sports without POCs", value: missingPocs.length, icon: ShieldAlert, tone: "violet", page: "admin" },
  ];
  return <div className="page-stack admin-operations-overview"><header className="page-header"><div><p className="eyebrow">Operations control</p><h1>Committee dashboard</h1><p>Approvals, custody, overdue returns, and configuration gaps at a glance.</p></div></header><section className="operations-stat-grid">{cards.map(({ label, value, icon: Icon, tone, page }) => <button className="operations-stat panel" key={label} onClick={() => navigate(page)}><span className={`stat-icon ${tone}`}><Icon /></span><span><strong>{value}</strong><small>{label}</small></span></button>)}</section>{overdue.length > 0 && <section className="panel operations-alert"><AlertTriangle /><div><strong>{overdue.length} casual return{overdue.length === 1 ? " is" : "s are"} overdue</strong><p>Open Approvals to identify the students and due times.</p></div><button className="button button-danger-soft" onClick={() => navigate("approvals")}>Review overdue</button></section>}{missingPocs.length > 0 && <section className="panel operations-alert neutral"><Users /><div><strong>POC assignment needed</strong><p>{missingPocs.map((sport) => sport.name).join(", ")}</p></div><button className="button button-secondary" onClick={() => navigate("admin")}>Assign POCs</button></section>}</div>;
}

const emptyForm = (type) => type === "venue"
  ? { name: "", sportId: "", location: "" }
  : { name: "", sportId: "", quantity: 1, assetCondition: "good", tracking: "BULK", assetMode: "auto", assetTags: "" };

export function AdminResourcePage({ type, items, equipmentRequests = [], loading, user, refresh, notify }) {
  const [form, setForm] = useState(emptyForm(type));
  const [editing, setEditing] = useState(null);
  const [editingOriginalTracking, setEditingOriginalTracking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState({ sports: [], locations: [] });
  const [photo, setPhoto] = useState(null);
  const isVenue = type === "venue";
  const loadCatalog = useCallback(() => api.equipmentCatalog().then((response) => setCatalog(response.data || { sports: [], locations: [] })).catch((error) => notify(error.message, "error")), [notify]);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  const filtered = items.filter((item) => `${item.name} ${item.sportName || ""} ${item.location || ""}`.toLowerCase().includes(search.toLowerCase()));
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const payload = () => isVenue
    ? { name: form.name, sportId: form.sportId, location: form.location.trim(), locationId: null, active: true }
    : { name: form.name, sportId: form.sportId, quantity: Number(form.quantity), metadata: {}, tracking: form.tracking, active: true };
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const data = payload();
      let record;
      if (editing) {
        delete data.active;
        record = isVenue ? await api.updateVenue(user, editing, data) : await api.updateEquipment(user, editing, data);
        notify(`${isVenue ? "Venue" : "Equipment"} updated`);
      } else if (isVenue) {
        record = await api.createVenue(user, data); notify("Venue added");
      } else {
        record = await api.createEquipment(user, data);
        notify("Equipment added");
      }
      if (!isVenue && form.tracking === "ASSET" && (!editing || editingOriginalTracking !== "ASSET")) {
        const manual = form.assetTags.split(",").map((item) => item.trim()).filter(Boolean);
        const prefix = form.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "ASSET";
        const tags = form.assetMode === "auto" ? Array.from({ length: Number(form.quantity) }, (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`) : manual;
        if (tags.length !== Number(form.quantity)) throw new Error("Provide one unique asset tag or serial for each unit");
        await api.createEquipmentAssets(user, record.data.id, tags.map((assetTag) => ({ assetTag, condition: form.assetCondition })));
      }
      if (photo) {
        const photoPath = await uploadRecordPhoto(isVenue ? "venues" : "equipment", record.data.id, photo);
        if (isVenue) await api.updateVenue(user, record.data.id, { photoPath }); else await api.updateEquipment(user, record.data.id, { photoPath });
      }
      setForm(emptyForm(type)); setPhoto(null); setEditing(null); setEditingOriginalTracking(null); await refresh();
    } catch (error) { notify(error.message, "error"); } finally { setSaving(false); }
  };
  const startEdit = (item) => {
    setEditing(item.id);
    setEditingOriginalTracking(item.tracking || null);
    setForm(isVenue ? { name: item.name, sportId: item.sportId || "", location: item.location || "" } : { name: item.name, sportId: item.sportId || "", quantity: item.quantity, assetCondition: "good", tracking: item.tracking || "BULK", assetMode: "auto", assetTags: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setActive = async (item) => {
    try { if (isVenue) await api.updateVenue(user, item.id, { active: !item.active }); else await api.updateEquipment(user, item.id, { active: !item.active }); notify(`${item.name} ${item.active ? "deactivated" : "reactivated"}`); await refresh(); }
    catch (error) { notify(error.message, "error"); }
  };
  const issued = useMemo(() => equipmentRequests.filter((request) => request.status === "ISSUED"), [equipmentRequests]);
  if (!isVenue) return <div className="page-stack equipment-admin-page">
    <header className="equipment-catalogue-hero">
      <div><p className="hero-kicker"><Sparkles size={15} />Equipment catalogue</p><h1>Manage equipment</h1><p>Add stock in a few clear steps. New items begin unallocated and can be assigned from the inventory below.</p><span className="hero-note"><PackageCheck size={15} />Nothing leaves the store from this form</span></div>
      <EquipmentFormArtwork />
    </header>
    <section className="panel inventory-editor equipment-editor">
      <div className="equipment-editor-heading"><span className="equipment-editor-icon">{editing ? <Pencil /> : <PackagePlus />}</span><div><p className="eyebrow">{editing ? "Edit equipment" : "Add equipment"}</p><h2>{editing ? "Update equipment" : "New equipment"}</h2><p>Required fields are marked with an asterisk.</p></div>{editing && <button className="button button-secondary" onClick={() => { setEditing(null); setForm(emptyForm(type)); setPhoto(null); }}><X size={16} />Cancel</button>}</div>
      <form className="equipment-create-form" onSubmit={save}>
        <section className="equipment-form-section">
          <div className="equipment-section-title"><span>1</span><div><strong>Equipment details</strong><small>Identify the item and the sport it belongs to.</small></div></div>
          <div className="equipment-field-grid">
            <label className="field field-full">Equipment name <b aria-hidden="true">*</b><input required name="name" value={form.name} onChange={change} placeholder="e.g. Badminton racquets" autoFocus /></label>
            <label className="field">Sport <b aria-hidden="true">*</b><select aria-label="Sport" required name="sportId" value={form.sportId} onChange={change}><option value="">Choose a sport</option>{catalog.sports.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name === "General" ? "General / Any sport" : item.name}</option>)}</select><small>Use General for cones, bibs, or shared items.</small></label>
            <label className="field">Total quantity <b aria-hidden="true">*</b><input required min="1" type="number" inputMode="numeric" name="quantity" value={form.quantity} onChange={change} /><small>Total units currently owned.</small></label>
          </div>
        </section>
        <section className="equipment-form-section">
          <div className="equipment-section-title"><span>2</span><div><strong>How should it be tracked?</strong><small>This decides whether units need their own asset labels.</small></div></div>
          <fieldset className="tracking-choice-group"><legend className="sr-only">Tracking</legend>
            <label className={form.tracking === "BULK" ? "selected" : ""}><input type="radio" name="tracking" value="BULK" checked={form.tracking === "BULK"} onChange={(event) => setForm((current) => ({ ...current, tracking: event.target.value, assetTags: "" }))} /><span className="tracking-choice-icon"><Layers3 /></span><span><strong>Bulk quantity</strong><small>Track only counts—for balls, shuttles, cones, or bibs.</small></span><i /></label>
            <label className={form.tracking === "ASSET" ? "selected" : ""}><input type="radio" name="tracking" value="ASSET" checked={form.tracking === "ASSET"} onChange={(event) => setForm((current) => ({ ...current, tracking: event.target.value, assetTags: "" }))} /><span className="tracking-choice-icon"><ScanBarcode /></span><span><strong>Individually tracked</strong><small>Give every unit its own QR asset tag or serial number.</small></span><i /></label>
          </fieldset>
          {form.tracking === "ASSET" && (!editing || editingOriginalTracking !== "ASSET") && <div className="asset-setup-panel"><div className="equipment-field-grid"><label className="field">Per-unit condition<select name="assetCondition" value={form.assetCondition} onChange={change}><option>excellent</option><option>good</option><option>fair</option><option>maintenance</option><option>retired</option></select></label><label className="field">Asset labels<select name="assetMode" value={form.assetMode} onChange={change}><option value="auto">Auto-generate sequential tags</option><option value="manual">Enter tags or serials</option></select></label>{form.assetMode === "manual" && <label className="field field-full">Tags or serials, one per unit<input required name="assetTags" value={form.assetTags} onChange={change} placeholder="RACKET-001, RACKET-002" /><small>Enter exactly {form.quantity || 0} unique values, separated by commas.</small></label>}</div></div>}
        </section>
        <section className="equipment-photo-section">
          <div className="equipment-section-title"><span>3</span><div><strong>Add a photo</strong><small>Optional, but helps students recognise the right equipment.</small></div></div>
          <label className={`equipment-photo-drop ${photo ? "has-file" : ""}`} htmlFor="equipment-photo"><ImagePlus /><span><strong>{photo ? photo.name : "Choose an equipment photo"}</strong><small>{photo ? "Ready to upload · click to replace" : "JPG, PNG, or WebP · maximum 5MB"}</small></span><em>{photo ? "Change" : "Browse"}</em><input id="equipment-photo" aria-label="Photo (optional)" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; try { validatePhoto(file); setPhoto(file); } catch (error) { event.target.value = ""; notify(error.message, "error"); } }} /></label>
        </section>
        <div className="equipment-form-footer"><div><Boxes /><span><strong>{form.quantity || 0} {Number(form.quantity) === 1 ? "unit" : "units"}</strong><small>{form.tracking === "ASSET" ? "Individual asset tracking" : "Bulk quantity tracking"}</small></span></div><button className="button button-primary equipment-save-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={18} /> : editing ? <Pencil size={18} /> : <Plus size={18} />}{editing ? "Save equipment changes" : "Add equipment to inventory"}</button></div>
      </form>
    </section>
  </div>;
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Inventory management</p><h1>Manage venues</h1><p>Add, edit, deactivate, or reactivate campus spaces.</p></div></header><section className="panel inventory-editor"><div className="section-heading"><div><h2>{editing ? "Update venue" : "New venue"}</h2></div>{editing && <button className="button button-secondary" onClick={() => { setEditing(null); setForm(emptyForm(type)); setPhoto(null); }}><X size={16} />Cancel</button>}</div><form className="form-grid" onSubmit={save}><label className="field">Name<input required name="name" value={form.name} onChange={change} /></label><label className="field">Sport<select required name="sportId" value={form.sportId} onChange={change}><option value="">Select sport</option>{catalog.sports.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Location<input required name="location" value={form.location} onChange={change} placeholder="e.g. Sports Complex, Ground 1" /></label><label className="field field-full">Photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; try { validatePhoto(file); setPhoto(file); } catch (error) { event.target.value = ""; notify(error.message, "error"); } }} /><small>JPG, PNG, or WebP up to 5MB. Compressed before upload.</small></label><button className="button button-primary field-full" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : editing ? <Pencil size={17} /> : <Plus size={17} />}{editing ? "Save changes" : "Add venue"}</button></form></section><section><div className="toolbar"><label className="search-box"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search venues" /></label><span>{filtered.length} records</span></div>{loading ? <LoaderCircle className="spin" /> : <div className="management-grid">{filtered.map((item) => { const photo = catalogPhotoUrl(item, "venue"); return <article className={`panel management-card ${item.active ? "" : "inactive"}`} key={item.id}>{photo ? <img className="management-thumb" src={photo} alt={item.name} /> : <span className="management-thumb placeholder"><MapPin /></span>}<div><span className="status status-neutral">{item.active ? "Active" : "Inactive"}</span><h3>{item.name}</h3><p>{item.sportName || "Sport not assigned"} · {item.location || "Location not assigned"}</p></div><div className="management-actions"><button className="button button-secondary" onClick={() => startEdit(item)}><Pencil size={15} />Edit</button><button className="button button-danger-soft" onClick={() => setActive(item)}>{item.active ? "Deactivate" : "Reactivate"}</button></div></article>; })}</div>}</section></div>;
}

export function CombinedApprovalsPage({ user, equipmentRequests, sports, loading, onEquipmentDecision }) {
  const [comments, setComments] = useState({});
  const pending = equipmentRequests.filter((request) => request.status === "PENDING");
  const overdue = equipmentRequests.filter((request) => request.status === "ISSUED" && request.requestType === "CASUAL" && request.dueAt && new Date(request.dueAt) < new Date());
  const canAct = (request) => {
    if (user.role === "admin") return true;
    if (request.requestType === "CASUAL") return user.role === "approver";
    const sport = sports.find((item) => item.id === request.sportId);
    return [sport?.primaryPocId, sport?.secondaryPocId].includes(user.id);
  };

  return <div className="page-stack">
    <header className="page-header"><div><p className="eyebrow">Committee workflow</p><h1>Equipment approval queue</h1><p>Review equipment requests awaiting a decision. Venue reservations are booked immediately.</p></div><span className="count-chip">{pending.length} pending</span></header>
    {overdue.length > 0 && <section className="panel operations-alert"><AlertTriangle /><div><strong>{overdue.length} overdue casual return{overdue.length === 1 ? "" : "s"}</strong><p>{overdue.map((request) => `${request.requesterName || request.requesterEmail} · ${when(request.dueAt)}`).join("; ")}</p></div></section>}
    {loading ? <div className="center-loader"><LoaderCircle className="spin" /></div> : pending.length === 0 ? <div className="empty-state"><BadgeCheck /><h3>All caught up</h3><p>There are no equipment requests awaiting approval.</p></div> : <div className="approval-grid">{pending.map((request) => <article className="panel approval-card" key={`equipment-${request.id}`}><div className="approval-top"><span className="request-type-label"><Dumbbell size={15} />{titleCase(request.requestType)} equipment</span><span className="status status-pending">Pending</span></div><h3>{request.items?.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</h3><p>{request.teamName || request.sportName || "Casual issue"}</p><dl><div><dt>Requester</dt><dd>{request.requesterName || request.requesterEmail}</dd></div><div><dt>Return</dt><dd>{request.expectedReturnAt ? when(request.expectedReturnAt) : "Team custody"}</dd></div></dl>{canAct(request) ? <><textarea value={comments[request.id] || ""} onChange={(event) => setComments((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Optional decision note" rows="2" /><div className="approval-actions"><button className="button button-danger-soft" onClick={() => onEquipmentDecision(request.id, "reject", comments[request.id])}><X size={17} />Reject</button><button className="button button-primary" onClick={() => onEquipmentDecision(request.id, "approve", comments[request.id])}><Check size={17} />Approve</button></div></> : <p className="read-only-note">Read only · assigned sport POC approval required</p>}</article>)}</div>}
  </div>;
}

function LegacyCombinedApprovalsPage({ user, venueApprovals: allBookingApprovals, equipmentRequests, sports, loading, onVenueDecision, onEquipmentDecision }) {
  const venueApprovals = allBookingApprovals.filter((item) => item.resourceType === "equipment");
  const [filter, setFilter] = useState("all");
  const [comments, setComments] = useState({});
  const pendingEquipment = equipmentRequests.filter((request) => request.status === "PENDING");
  const pendingVenues = venueApprovals.filter((request) => !request.resourceType || request.resourceType === "venue");
  const legacyEquipment = venueApprovals.filter((request) => request.resourceType === "equipment");
  const overdue = equipmentRequests.filter((request) => request.status === "ISSUED" && request.requestType === "CASUAL" && request.dueAt && new Date(request.dueAt) < new Date());
  const showEquipment = filter === "all" || filter === "equipment";
  const total = legacyEquipment.length + pendingEquipment.length;
  const canAct = (request) => {
    if (user.role === "admin") return true;
    if (request.requestType === "CASUAL") return user.role === "approver";
    const sport = sports.find((item) => item.id === request.sportId);
    return [sport?.primaryPocId, sport?.secondaryPocId].includes(user.id);
  };
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Committee workflow</p><h1>Approval queue</h1><p>Review venue reservations and equipment requests awaiting a decision.</p></div><span className="count-chip">{total} pending</span></header><div className="approval-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All ({total})</button><button className={filter === "venue" ? "active" : ""} onClick={() => setFilter("venue")}>Venues ({pendingVenues.length})</button><button className={filter === "equipment" ? "active" : ""} onClick={() => setFilter("equipment")}>Equipment ({pendingEquipment.length + legacyEquipment.length})</button></div>{overdue.length > 0 && <section className="panel operations-alert"><AlertTriangle /><div><strong>{overdue.length} overdue casual return{overdue.length === 1 ? "" : "s"}</strong><p>{overdue.map((request) => `${request.requesterName || request.requesterEmail} · ${when(request.dueAt)}`).join("; ")}</p></div></section>}{loading ? <div className="center-loader"><LoaderCircle className="spin" /></div> : total === 0 ? <div className="empty-state"><BadgeCheck /><h3>All caught up</h3><p>There are no venue reservations or equipment requests awaiting approval.</p></div> : <div className="approval-grid">{venueApprovals.filter((item) => filter === "all" || item.resourceType === filter).map((item) => <article className="panel approval-card" key={`reservation-${item.id}`}><div className="approval-top"><span className="request-type-label">{item.resourceType === "equipment" ? <Dumbbell size={15} /> : <MapPin size={15} />}{titleCase(item.resourceType || "venue")} reservation</span><span className="status status-pending">Pending</span></div><h3>{item.title}</h3><p>{item.purpose || "No purpose provided"}</p><dl><div><dt>Resource</dt><dd>{titleCase(item.resourceType)}</dd></div><div><dt>Schedule</dt><dd>{when(item.startAt)}</dd></div><div><dt>Requester</dt><dd>{item.requesterId}</dd></div></dl><textarea value={comments[`v-${item.id}`] || ""} onChange={(event) => setComments((current) => ({ ...current, [`v-${item.id}`]: event.target.value }))} placeholder="Optional decision note" rows="2" /><div className="approval-actions"><button className="button button-danger-soft" onClick={() => onVenueDecision(item.id, "reject", comments[`v-${item.id}`])}><X size={17} />Reject</button><button className="button button-primary" onClick={() => onVenueDecision(item.id, "approve", comments[`v-${item.id}`])}><Check size={17} />Approve</button></div></article>)}{showEquipment && pendingEquipment.map((request) => <article className="panel approval-card" key={`equipment-${request.id}`}><div className="approval-top"><span className="request-type-label"><Dumbbell size={15} />{titleCase(request.requestType)} equipment</span><span className="status status-pending">Pending</span></div><h3>{request.items?.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</h3><p>{request.teamName || request.sportName || "Casual issue"}</p><dl><div><dt>Requester</dt><dd>{request.requesterName || request.requesterEmail}</dd></div><div><dt>Return</dt><dd>{request.expectedReturnAt ? when(request.expectedReturnAt) : "Team custody"}</dd></div></dl>{canAct(request) ? <><textarea value={comments[`e-${request.id}`] || ""} onChange={(event) => setComments((current) => ({ ...current, [`e-${request.id}`]: event.target.value }))} placeholder="Optional decision note" rows="2" /><div className="approval-actions"><button className="button button-danger-soft" onClick={() => onEquipmentDecision(request.id, "reject", comments[`e-${request.id}`])}><X size={17} />Reject</button><button className="button button-primary" onClick={() => onEquipmentDecision(request.id, "approve", comments[`e-${request.id}`])}><Check size={17} />Approve</button></div></> : <p className="read-only-note">Read only · assigned sport POC approval required</p>}</article>)}</div>}</div>;
}
