import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleAlert, ClipboardList, LoaderCircle, MapPin, Plus, Send, Wrench } from "lucide-react";
import { api } from "../../api.js";
import { titleCase } from "../../lib/format.js";
import "./venue-maintenance.css";

const CATEGORIES = [
  ["CLEANING", "Cleaning"], ["LIGHTING", "Lighting"], ["PLAYING_SURFACE", "Playing surface"],
  ["NET_OR_POST", "Net or post"], ["SEATING", "Seating"], ["WATER", "Water"],
  ["ELECTRICAL", "Electrical"], ["SAFETY", "Safety hazard"], ["OTHER", "Other"],
];
const STATUSES = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const emptyForm = { venueId: "", category: "", title: "", description: "", exactArea: "", urgency: "NORMAL" };
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

function Status({ value }) {
  return <span className={`maintenance-status maintenance-${value.toLowerCase()}`}>{titleCase(value)}</span>;
}

function MaintenanceCard({ request, canReview, onUpdated, notify }) {
  const [status, setStatus] = useState(request.status);
  const [reviewNote, setReviewNote] = useState(request.reviewNote || "");
  const [expectedResolutionAt, setExpectedResolutionAt] = useState(request.expectedResolutionAt?.slice(0, 16) || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.updateVenueMaintenance(request.user, request.id, {
        status, reviewNote: reviewNote || null,
        expectedResolutionAt: expectedResolutionAt ? new Date(expectedResolutionAt).toISOString() : null,
      });
      notify("Maintenance request updated");
      await onUpdated();
    } catch (error) { notify(error.message, "error"); } finally { setSaving(false); }
  };
  return (
    <article className={`panel maintenance-card urgency-${request.urgency.toLowerCase()}`}>
      <div className="maintenance-card-top"><div><p className="eyebrow">{titleCase(request.category)}</p><h3>{request.title}</h3></div><Status value={request.status} /></div>
      <div className="maintenance-meta"><span><MapPin size={14} />{request.venueName}</span><span><CalendarClock size={14} />{formatDate(request.createdAt)}</span>{canReview && <span>Reported by {request.reporterName || request.reporterEmail}</span>}</div>
      {request.exactArea && <p className="maintenance-area"><strong>Area:</strong> {request.exactArea}</p>}
      <p className="maintenance-description">{request.description}</p>
      {request.reviewNote && !canReview && <div className="maintenance-response"><strong>Committee update</strong><p>{request.reviewNote}</p></div>}
      {request.expectedResolutionAt && !canReview && <p className="expected-date">Expected resolution: {formatDate(request.expectedResolutionAt)}</p>}
      {canReview && <div className="maintenance-review"><label className="field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUSES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label><label className="field">Expected resolution<input type="datetime-local" value={expectedResolutionAt} onChange={(event) => setExpectedResolutionAt(event.target.value)} /></label><label className="field field-full">Progress note<textarea rows="2" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Tell the reporter what is happening…" /></label><button className="button button-primary field-full" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}Save update</button></div>}
    </article>
  );
}

export default function VenueModule({ user, venues, notify, children }) {
  const [tab, setTab] = useState("venues");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const canReview = ["approver", "admin"].includes(user.role);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRequests((await api.venueMaintenance(user)).data || []); }
    catch (error) { notify(error.message, "error"); } finally { setLoading(false); }
  }, [notify, user]);
  useEffect(() => { if (tab === "maintenance") load(); }, [tab, load]);
  const counts = useMemo(() => ({ open: requests.filter((item) => !["RESOLVED", "REJECTED"].includes(item.status)).length, urgent: requests.filter((item) => item.urgency === "URGENT" && !["RESOLVED", "REJECTED"].includes(item.status)).length }), [requests]);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.createVenueMaintenance(user, { ...form, exactArea: form.exactArea || null });
      setForm(emptyForm); notify("Maintenance request submitted"); await load();
    } catch (error) { notify(error.message, "error"); } finally { setSaving(false); }
  };
  const shownRequests = requests.map((request) => ({ ...request, user }));
  return (
    <div className="venue-module">
      <nav className="venue-tabs" aria-label="Venue sections"><button className={tab === "venues" ? "active" : ""} onClick={() => setTab("venues")}><MapPin size={18} /><span><strong>{user.role === "admin" ? "Manage venues" : "Browse & book"}</strong><small>Courts, grounds and reservations</small></span></button><button className={tab === "maintenance" ? "active" : ""} onClick={() => setTab("maintenance")}><Wrench size={18} /><span><strong>Maintenance requests</strong><small>Report and track venue issues</small></span>{counts.open > 0 && <b>{counts.open}</b>}</button></nav>
      {tab === "venues" ? children : <div className="page-stack maintenance-page">
        <header className="maintenance-hero"><div><p className="eyebrow">Venue care</p><h1>{canReview ? "Maintenance desk" : "Report a venue issue"}</h1><p>{canReview ? "Review reports, coordinate repairs, and keep students informed." : "Tell the Sports Committee what needs attention and follow its progress."}</p></div><div className="maintenance-summary"><span><ClipboardList /><strong>{counts.open}</strong><small>Open</small></span><span><AlertTriangle /><strong>{counts.urgent}</strong><small>Urgent</small></span></div></header>
        <section className="panel maintenance-form-panel"><div className="section-heading"><div><p className="eyebrow">New report</p><h2>What needs attention?</h2></div><Plus size={21} /></div><form className="maintenance-form" onSubmit={submit}><label className="field">Active venue<select required value={form.venueId} onChange={(event) => setForm((current) => ({ ...current, venueId: event.target.value }))}><option value="">Select venue</option>{venues.filter((venue) => venue.active !== false).map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label><label className="field">Problem category<select required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option value="">Select problem</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Urgency<select value={form.urgency} onChange={(event) => setForm((current) => ({ ...current, urgency: event.target.value }))}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="URGENT">Urgent / safety concern</option></select></label><label className="field">Exact area (optional)<input value={form.exactArea} onChange={(event) => setForm((current) => ({ ...current, exactArea: event.target.value }))} placeholder="e.g. north floodlight" /></label><label className="field field-full">Short title<input required minLength="3" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Floodlight is not working" /></label><label className="field field-full">Description<textarea required minLength="5" rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the issue and where you noticed it…" /></label><button className="button button-primary field-full" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}Submit maintenance request</button></form></section>
        <section><div className="section-heading"><div><p className="eyebrow">{canReview ? "Committee queue" : "Your reports"}</p><h2>{canReview ? "All maintenance requests" : "Request history"}</h2></div></div>{loading ? <div className="center-loader"><LoaderCircle className="spin" /></div> : shownRequests.length ? <div className="maintenance-grid">{shownRequests.map((request) => <MaintenanceCard key={request.id} request={request} canReview={canReview} onUpdated={load} notify={notify} />)}</div> : <div className="panel empty-state"><span className="empty-icon"><CircleAlert /></span><h3>No maintenance reports</h3><p>{canReview ? "There are no venue issues waiting for review." : "Reports you submit will appear here."}</p></div>}</section>
      </div>}
    </div>
  );
}
