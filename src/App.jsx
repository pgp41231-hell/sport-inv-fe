import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronDown, CircleAlert,
  Clock3, Dumbbell, Home, LayoutDashboard, LoaderCircle, MapPin, Menu, Plus,
  Search, ShieldCheck, Sparkles, Trophy, Users, Warehouse, X,
} from "lucide-react";
import { API_BASE_URL, api } from "./api.js";
// EPIC-03 / EPIC-04 — booking calendar, slot holds, and alternative slots.
import BookingWizard from "./features/booking/BookingWizard.jsx";
import MyBookingsPanel from "./features/booking/MyBookingsPanel.jsx";
import "./features/booking/booking.css";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "venues", label: "Venues", icon: MapPin },
  { id: "equipment", label: "Equipment", icon: Dumbbell },
  { id: "bookings", label: "My bookings", icon: CalendarDays },
  { id: "sports", label: "Fixtures & events", icon: Trophy },
  { id: "approvals", label: "Approvals", icon: BadgeCheck, roles: ["approver", "admin"] },
  { id: "admin", label: "Administration", icon: ShieldCheck, roles: ["admin"] },
];

const DEFAULT_USER = {
  id: "demo-admin",
  name: "Sports Committee",
  email: "sports.committee@iiml.ac.in",
  role: "admin",
};

const ROLE_LABELS = {
  requester: "Student",
  approver: "SportComm Member",
};

const formatDate = (value, options = {}) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: options.time === false ? undefined : "short" }).format(new Date(value))
  : "—";

const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const roleLabel = (role) => ROLE_LABELS[role] || titleCase(role);

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type || "success"}`}>
      {toast.type === "error" ? <CircleAlert size={19} /> : <Check size={19} />}
      <span>{toast.message}</span>
      <button onClick={onClose} aria-label="Dismiss"><X size={17} /></button>
    </div>
  );
}

function EmptyState({ icon: Icon = Sparkles, title, copy, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} /></span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function StatusPill({ value }) {
  return <span className={`status status-${value || "neutral"}`}>{titleCase(value || "unknown")}</span>;
}

function ResourceCard({ item, type, onBook }) {
  const details = type === "venue"
    ? `${item.capacity} people`
    : `${item.quantity} available · ${titleCase(item.condition)}`;
  const tags = type === "venue" ? item.amenities : Object.keys(item.metadata || {});
  return (
    <article className="resource-card">
      <div className={`resource-visual visual-${type}`}>
        {type === "venue" ? <Warehouse size={28} /> : <Dumbbell size={28} />}
        <span>{titleCase(item.category)}</span>
      </div>
      <div className="resource-content">
        <div>
          <p className="eyebrow">{titleCase(item.category)}</p>
          <h3>{item.name}</h3>
        </div>
        <p className="resource-location"><MapPin size={15} />{item.location || "Sports complex"}</p>
        <p className="resource-detail">{details}</p>
        <div className="tag-row">
          {(tags || []).slice(0, 3).map((tag) => <span className="tag" key={tag}>{titleCase(tag)}</span>)}
        </div>
        <button className="button button-primary button-wide" onClick={() => onBook(item, type)}>
          Reserve {type === "venue" ? "venue" : "equipment"}<ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}

function Overview({ venues, equipment, bookings, matches, navigate, onBook }) {
  const nextBooking = bookings.filter((item) => new Date(item.startAt) > new Date() && !["cancelled", "rejected"].includes(item.status)).sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];
  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker"><Sparkles size={15} />Your campus, in motion</p>
          <h1>Find your space.<br /><span>Play your game.</span></h1>
          <p>Book venues, reserve equipment, and keep up with everything happening across IIM Lucknow sports.</p>
          <div className="hero-actions">
            <button className="button button-light" onClick={() => navigate("venues")}>Explore venues<ArrowRight size={17} /></button>
            <button className="button button-glass" onClick={() => navigate("bookings")}>My reservations</button>
          </div>
        </div>
        <div className="hero-mark"><span>IIML</span><Trophy size={72} strokeWidth={1.4} /></div>
      </section>

      <section className="stat-grid">
        <button className="stat-card" onClick={() => navigate("venues")}><span className="stat-icon green"><MapPin /></span><span><strong>{venues.length}</strong><small>Active venues</small></span><ArrowRight className="stat-arrow" size={18} /></button>
        <button className="stat-card" onClick={() => navigate("equipment")}><span className="stat-icon amber"><Dumbbell /></span><span><strong>{equipment.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</strong><small>Equipment units</small></span><ArrowRight className="stat-arrow" size={18} /></button>
        <button className="stat-card" onClick={() => navigate("bookings")}><span className="stat-icon blue"><CalendarDays /></span><span><strong>{bookings.length}</strong><small>Your bookings</small></span><ArrowRight className="stat-arrow" size={18} /></button>
      </section>

      <div className="overview-grid">
        <section className="panel featured-panel">
          <div className="section-heading"><div><p className="eyebrow">Popular spaces</p><h2>Ready when you are</h2></div><button className="text-button" onClick={() => navigate("venues")}>View all<ArrowRight size={15} /></button></div>
          {venues.length ? <div className="compact-list">{venues.slice(0, 3).map((venue) => <button key={venue.id} className="compact-resource" onClick={() => onBook(venue, "venue")}><span className="compact-icon"><Warehouse size={20} /></span><span><strong>{venue.name}</strong><small>{venue.location || venue.category} · {venue.capacity} people</small></span><Plus size={18} /></button>)}</div> : <EmptyState icon={MapPin} title="No venues yet" copy="An admin can add the first campus venue." />}
        </section>
        <section className="panel schedule-panel">
          <div className="section-heading"><div><p className="eyebrow">Up next</p><h2>Your schedule</h2></div></div>
          {nextBooking ? <div className="next-booking"><div className="calendar-tile"><strong>{new Date(nextBooking.startAt).getDate()}</strong><span>{new Date(nextBooking.startAt).toLocaleString("en", { month: "short" })}</span></div><div><StatusPill value={nextBooking.status} /><h3>{nextBooking.title}</h3><p><Clock3 size={15} />{formatDate(nextBooking.startAt)}</p></div></div> : <EmptyState icon={CalendarDays} title="Your calendar is clear" copy="Reserve a venue or equipment to get started." />}
          {matches.length > 0 && <div className="match-peek"><span className="live-dot" /><span><strong>{matches[0].homeTeam} vs {matches[0].awayTeam}</strong><small>{titleCase(matches[0].sport)} · {formatDate(matches[0].startsAt)}</small></span></div>}
        </section>
      </div>
    </div>
  );
}

function ResourcePage({ type, items, loading, onBook, refresh }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) => `${item.name} ${item.category} ${item.location || ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Discover & reserve</p><h1>{type === "venue" ? "Campus venues" : "Sports equipment"}</h1><p>{type === "venue" ? "Courts, grounds, and spaces for every kind of game." : "Everything you need, ready at the equipment desk."}</p></div><button className="button button-ghost" onClick={refresh}>Refresh</button></header>
      <div className="toolbar"><label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${type === "venue" ? "venues" : "equipment"}…`} /></label><span>{filtered.length} available</span></div>
      {loading ? <div className="loading-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item} />)}</div> : filtered.length ? <div className="resource-grid">{filtered.map((item) => <ResourceCard key={item.id} item={item} type={type} onBook={onBook} />)}</div> : <EmptyState icon={type === "venue" ? MapPin : Dumbbell} title={`No ${type === "venue" ? "venues" : "equipment"} found`} copy="Try another search, or ask an admin to add inventory." />}
    </div>
  );
}

// US-04D: the list itself lives in features/booking/MyBookingsPanel.jsx, which
// adds upcoming/past tabs, a status filter, a countdown, and confirmed cancels.
function BookingsPage({ bookings, loading, onCancel, navigate }) {
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Your activity</p><h1>My bookings</h1><p>Track requests, approvals, upcoming slots, and cancellations.</p></div><button className="button button-primary" onClick={() => navigate("venues")}><Plus size={17} />New booking</button></header>
      <MyBookingsPanel bookings={bookings} loading={loading} onCancel={onCancel} navigate={navigate} />
    </div>
  );
}

function SportsPage({ matches, tournaments, committee }) {
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Campus competition</p><h1>Fixtures & events</h1><p>Follow Sangram, Mahasangram, Sangharsh, and campus sports.</p></div></header>
      <div className="sports-grid">
        <section className="panel matches-panel"><div className="section-heading"><div><p className="eyebrow">Fixtures</p><h2>Upcoming matches</h2></div></div>{matches.length ? <div className="fixtures">{matches.map((match) => <article className="fixture" key={match.id}><div><span>{titleCase(match.sport)}</span><small>{formatDate(match.startsAt)}</small></div><div className="teams"><strong>{match.homeTeam}</strong><span>vs</span><strong>{match.awayTeam}</strong></div><StatusPill value={match.status} /></article>)}</div> : <EmptyState icon={Trophy} title="Fixtures coming soon" copy="Scorekeepers can publish upcoming matches here." />}</section>
        <aside className="side-stack"><section className="panel"><p className="eyebrow">Tournaments</p><h2>On campus</h2>{tournaments.length ? tournaments.map((item) => <div className="mini-item" key={item.id}><Trophy size={18} /><span><strong>{item.name}</strong><small>{titleCase(item.status)}</small></span></div>) : <p className="muted-copy">No published tournaments yet.</p>}</section><section className="panel"><p className="eyebrow">Sports Committee</p><h2>Need help?</h2>{committee.length ? committee.slice(0, 3).map((member) => <div className="mini-item" key={member.id}><Users size={18} /><span><strong>{member.name}</strong><small>{member.title}</small></span></div>) : <p className="muted-copy">Committee contacts will appear here once published.</p>}</section></aside>
      </div>
    </div>
  );
}

function ApprovalsPage({ approvals, loading, onDecision }) {
  const [comments, setComments] = useState({});
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Committee workflow</p><h1>Approval queue</h1><p>Review reservation requests awaiting your decision.</p></div><span className="count-chip">{approvals.length} pending</span></header>
      {loading ? <div className="center-loader"><LoaderCircle className="spin" /></div> : approvals.length ? <div className="approval-grid">{approvals.map((item) => <article className="panel approval-card" key={item.id}><div className="approval-top"><span className="stat-icon amber"><Clock3 /></span><StatusPill value="pending" /></div><h3>{item.title}</h3><p>{item.purpose || "No purpose provided"}</p><dl><div><dt>Resource</dt><dd>{titleCase(item.resourceType)}</dd></div><div><dt>Schedule</dt><dd>{formatDate(item.startAt)}</dd></div><div><dt>Requester</dt><dd>{item.requesterId}</dd></div></dl><textarea value={comments[item.id] || ""} onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Optional decision note" rows="2" /><div className="approval-actions"><button className="button button-danger-soft" onClick={() => onDecision(item.id, "reject", comments[item.id])}><X size={17} />Reject</button><button className="button button-primary" onClick={() => onDecision(item.id, "approve", comments[item.id])}><Check size={17} />Approve</button></div></article>)}</div> : <EmptyState icon={BadgeCheck} title="All caught up" copy="There are no reservation requests awaiting your approval." />}
    </div>
  );
}

function AdminPage({ user, onCreated, audit }) {
  const [kind, setKind] = useState("venue");
  const [form, setForm] = useState({ name: "", category: "", location: "", capacity: 20, quantity: 5, condition: "good", amenities: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (kind === "venue") await api.createVenue(user, { name: form.name, category: form.category, location: form.location || null, capacity: Number(form.capacity), amenities: form.amenities.split(",").map((item) => item.trim()).filter(Boolean), rules: {}, active: true });
      else await api.createEquipment(user, { name: form.name, category: form.category, location: form.location || null, quantity: Number(form.quantity), condition: form.condition, metadata: {}, active: true });
      setForm({ name: "", category: "", location: "", capacity: 20, quantity: 5, condition: "good", amenities: "" });
      onCreated(kind);
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Operations desk</p><h1>Administration</h1><p>Add bookable inventory and monitor recent system activity.</p></div></header>
      <div className="admin-grid">
        <section className="panel admin-form-panel"><div className="segmented"><button className={kind === "venue" ? "active" : ""} onClick={() => setKind("venue")}><MapPin size={16} />Venue</button><button className={kind === "equipment" ? "active" : ""} onClick={() => setKind("equipment")}><Dumbbell size={16} />Equipment</button></div><h2>Add {kind}</h2><p className="muted-copy">New inventory is immediately available to the booking interface.</p><form className="form-grid" onSubmit={submit}><label className="field field-full">Name<input required name="name" value={form.name} onChange={update} placeholder={kind === "venue" ? "Badminton Court 1" : "Badminton Racquet"} /></label><label className="field">Category<input required name="category" value={form.category} onChange={update} placeholder={kind === "venue" ? "court" : "racquet"} /></label><label className="field">Location<input name="location" value={form.location} onChange={update} placeholder="Sports Complex" /></label>{kind === "venue" ? <><label className="field">Capacity<input min="1" required type="number" name="capacity" value={form.capacity} onChange={update} /></label><label className="field">Amenities<input name="amenities" value={form.amenities} onChange={update} placeholder="lighting, indoor" /></label></> : <><label className="field">Quantity<input min="1" required type="number" name="quantity" value={form.quantity} onChange={update} /></label><label className="field">Condition<select name="condition" value={form.condition} onChange={update}><option>excellent</option><option>good</option><option>fair</option><option>maintenance</option><option>retired</option></select></label></>}{error && <p className="form-error field-full"><CircleAlert size={16} />{error}</p>}<button className="button button-primary field-full" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Add to inventory</button></form></section>
        <section className="panel audit-panel"><div className="section-heading"><div><p className="eyebrow">Audit history</p><h2>Recent activity</h2></div><Activity size={20} /></div>{audit.length ? <div className="audit-list">{audit.map((entry) => <div className="audit-item" key={entry.id}><span className="audit-dot" /><div><strong>{titleCase(entry.action)}</strong><p>{titleCase(entry.entityType)} · {entry.actorId || "System"}</p><small>{formatDate(entry.createdAt)}</small></div></div>)}</div> : <EmptyState icon={Activity} title="No activity yet" copy="Inventory and booking actions will be recorded here." />}</section>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(DEFAULT_USER);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookingResource, setBookingResource] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [committee, setCommittee] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);

  const notify = useCallback((message, type = "success") => setToast({ message, type }), []);
  const loadCore = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.publicVenues(), api.publicEquipment(), api.bookings(user), api.publicContent("matches"),
      api.publicContent("tournaments"), api.publicContent("committee"),
    ]);
    const setters = [setVenues, setEquipment, setBookings, setMatches, setTournaments, setCommittee];
    results.forEach((result, index) => { if (result.status === "fulfilled") setters[index](result.value.data || []); });
    const failure = results.find((result) => result.status === "rejected");
    if (failure) notify(failure.reason.message || "Some data could not be loaded", "error");
    setLoading(false);
  }, [user, notify]);

  const loadRoleData = useCallback(async () => {
    if (["approver", "admin"].includes(user.role)) {
      try { setApprovals((await api.pendingApprovals(user)).data || []); } catch (error) { if (error.status !== 403) notify(error.message, "error"); }
    } else setApprovals([]);
    if (user.role === "admin") {
      try { setAudit((await api.audit(user)).data || []); } catch (error) { if (error.status !== 403) notify(error.message, "error"); }
    } else setAudit([]);
  }, [user, notify]);

  useEffect(() => { loadCore(); loadRoleData(); }, [loadCore, loadRoleData]);
  const allowedNav = useMemo(() => NAV.filter((item) => !item.roles || item.roles.includes(user.role)), [user.role]);
  useEffect(() => { if (!allowedNav.some((item) => item.id === page)) setPage("overview"); }, [allowedNav, page]);

  const navigate = (next) => { setPage(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openBooking = (item, type) => setBookingResource({ item, type });
  const bookingSaved = async () => { setBookingResource(null); notify("Reservation submitted successfully"); await loadCore(); setPage("bookings"); };
  // Rethrows so MyBookingsPanel can show the failure on the row it belongs to,
  // rather than only as a toast that has drifted away from the action.
  const cancelBooking = async (id) => { try { await api.cancelBooking(user, id); notify("Booking cancelled"); await loadCore(); } catch (error) { notify(error.message, "error"); throw error; } };
  const decide = async (id, decision, comment) => { try { await api.decideApproval(user, id, { decision, comment: comment || undefined }); notify(`Booking ${decision === "approve" ? "approved" : "rejected"}`); await Promise.all([loadCore(), loadRoleData()]); } catch (error) { notify(error.message, "error"); } };
  const created = async (kind) => { notify(`${titleCase(kind)} added to inventory`); await Promise.all([loadCore(), loadRoleData()]); };
  const changeRole = (role) => { setUser((current) => ({ ...current, id: `demo-${role}`, role, name: role === "admin" ? "Sports Committee" : roleLabel(role) })); setProfileOpen(false); };

  const content = {
    overview: <Overview venues={venues} equipment={equipment} bookings={bookings} matches={matches} navigate={navigate} onBook={openBooking} />,
    venues: <ResourcePage type="venue" items={venues} loading={loading} onBook={openBooking} refresh={loadCore} />,
    equipment: <ResourcePage type="equipment" items={equipment} loading={loading} onBook={openBooking} refresh={loadCore} />,
    bookings: <BookingsPage bookings={bookings} loading={loading} onCancel={cancelBooking} navigate={navigate} />,
    sports: <SportsPage matches={matches} tournaments={tournaments} committee={committee} />,
    approvals: <ApprovalsPage approvals={approvals} loading={loading} onDecision={decide} />,
    admin: <AdminPage user={user} onCreated={created} audit={audit} />,
  }[page];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Trophy size={22} /></span><span><strong>Courtyard</strong><small>IIM Lucknow Sports</small></span></div>
        <nav>{allowedNav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === "approvals" && approvals.length > 0 && <b>{approvals.length}</b>}</button>)}</nav>
        <div className="sidebar-foot"><span className="connection-dot" /><span><strong>API connected</strong><small>{new URL(API_BASE_URL).host}</small></span></div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><Home size={15} /><span>/</span><strong>{NAV.find((item) => item.id === page)?.label}</strong></div>
          <div className="profile-wrap">
            <button className="profile-button" onClick={() => setProfileOpen((open) => !open)} aria-label={`Switch demo identity. Current role: ${roleLabel(user.role)}`}><span className="avatar">{user.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span><span><strong>{user.name}</strong><small>{roleLabel(user.role)} mode</small></span><ChevronDown size={16} /></button>
            {profileOpen && <div className="profile-menu"><p>Demo identity</p>{["requester", "approver", "scorekeeper", "admin"].map((role) => <button key={role} className={user.role === role ? "active" : ""} onClick={() => changeRole(role)}><span>{roleLabel(role)}</span>{user.role === role && <Check size={15} />}</button>)}</div>}
          </div>
        </header>
        <main className="content">{content}</main>
      </div>
      {bookingResource && <BookingWizard resource={bookingResource} user={user} myBookingIds={bookings.map((booking) => booking.id)} onClose={() => setBookingResource(null)} onSaved={bookingSaved} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
