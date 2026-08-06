import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronDown, CircleAlert,
  Clock3, Dumbbell, Home, LayoutDashboard, LoaderCircle, MapPin, Menu, Plus,
  Search, ShieldCheck, Sparkles, Trophy, Warehouse, X,
} from "lucide-react";
import { API_BASE_URL, api } from "./api.js";
import { titleCase } from "./lib/format.js";
// EPIC-03 / EPIC-04 — booking calendar, slot holds, and alternative slots.
import BookingWizard from "./features/booking/BookingWizard.jsx";
import MyBookingsPanel from "./features/booking/MyBookingsPanel.jsx";
import "./features/booking/booking.css";
// Fixtures & schedule (demo — no backend endpoint exists yet). See
// src/features/fixtures/README.md.
import FixturesPanel from "./features/fixtures/FixturesPanel.jsx";
import { FIXTURES_DEMO, POINTS_TABLE_DEMO, SCHEDULE_DEMO } from "./features/fixtures/demoData.js";
import "./features/fixtures/fixtures.css";
// Tournaments (demo — no backend endpoint exists yet). See
// src/features/tournaments/README.md.
import TournamentsPanel from "./features/tournaments/TournamentsPanel.jsx";
import { PAST_TOURNAMENTS_DEMO, UPCOMING_TOURNAMENTS_DEMO } from "./features/tournaments/demoData.js";
import "./features/tournaments/tournaments.css";
// Sports Committee (demo — no backend data yet, see demoData.js).
import CommitteePanel from "./features/committee/CommitteePanel.jsx";
import { COMMITTEE_DEMO } from "./features/committee/demoData.js";
import "./features/committee/committee.css";

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

function SportsPage({
  fixtures, canEditScores, onUpdateFixture, onAddFixture, onDeleteFixture,
  schedule, onUpdateScheduleMatch, onAddScheduleMatch, onDeleteScheduleMatch,
  points, onUpdatePointsSection,
  upcomingTournaments, pastTournaments, canEditTournaments,
  onAddUpcomingTournament, onUpdateUpcomingTournament, onDeleteUpcomingTournament,
  onAddPastTournament, onUpdatePastTournament, onDeletePastTournament,
  tournamentsView, selectedTournament, onOpenTournamentGallery, onOpenTournament, onBackTournaments,
}) {
  // Fixtures and Sports Committee are the "Fixtures & events" landing page's
  // own content — once Tournaments has drilled into the gallery or a
  // specific tournament (its own breadcrumb trail, feels like its own page),
  // showing them above/below would just be clutter around that page. Only
  // the "main" two-box Tournaments view still shares the page with them.
  const onLandingView = tournamentsView === "main";
  return (
    <div className="page-stack">
      {onLandingView && <header className="page-header"><div><p className="eyebrow">Campus competition</p><h1>Fixtures & events</h1><p>Follow Sangram, Mahasangram, Sangharsh, and campus sports.</p></div></header>}
      {onLandingView && (
        <FixturesPanel
          fixtures={fixtures} canEdit={canEditScores} onUpdateFixture={onUpdateFixture} onAddFixture={onAddFixture} onDeleteFixture={onDeleteFixture}
          schedule={schedule} onUpdateScheduleMatch={onUpdateScheduleMatch} onAddScheduleMatch={onAddScheduleMatch} onDeleteScheduleMatch={onDeleteScheduleMatch}
          points={points} onUpdatePointsSection={onUpdatePointsSection}
        />
      )}
      <TournamentsPanel
        view={tournamentsView} selectedTournament={selectedTournament}
        upcoming={upcomingTournaments} past={pastTournaments} canEdit={canEditTournaments}
        onAddUpcoming={onAddUpcomingTournament} onUpdateUpcoming={onUpdateUpcomingTournament} onDeleteUpcoming={onDeleteUpcomingTournament}
        onAddPast={onAddPastTournament} onUpdatePast={onUpdatePastTournament} onDeletePast={onDeletePastTournament}
        onOpenGallery={onOpenTournamentGallery} onOpenTournament={onOpenTournament} onBack={onBackTournaments}
      />
      {onLandingView && <CommitteePanel committee={COMMITTEE_DEMO} />}
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
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);
  // DEMO — local-only state for the example fixtures; see FIXTURES_DEMO.
  const [fixtures, setFixtures] = useState(FIXTURES_DEMO);
  // DEMO — local-only state for the example schedule; see SCHEDULE_DEMO.
  const [schedule, setSchedule] = useState(SCHEDULE_DEMO);
  // DEMO — local-only state for the example points table; see POINTS_TABLE_DEMO.
  const [points, setPoints] = useState(POINTS_TABLE_DEMO);
  // DEMO — local-only state for the example tournaments; see demoData.js in
  // features/tournaments. The real GET /public/tournaments fetch (which only
  // ever returned {id, name, status}, no dates or history) was dropped from
  // loadCore below in favor of these two, superseding it entirely.
  const [upcomingTournaments, setUpcomingTournaments] = useState(UPCOMING_TOURNAMENTS_DEMO);
  const [pastTournaments, setPastTournaments] = useState(PAST_TOURNAMENTS_DEMO);
  // Sub-navigation within the Fixtures & events tab: "main" (the two boxes)
  // or "gallery" (the past-tournaments grid). A selected tournament id
  // always means "show its detail page", regardless of this value — see
  // tournamentsView below and TournamentsPanel's README §4.
  const [tournamentsView, setTournamentsView] = useState("main");
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const notify = useCallback((message, type = "success") => setToast({ message, type }), []);
  const loadCore = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.publicVenues(), api.publicEquipment(), api.bookings(user), api.publicContent("matches"),
    ]);
    const setters = [setVenues, setEquipment, setBookings, setMatches];
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
  // DEMO — local-only add/edit/delete for the example fixtures; no backend to persist to yet.
  const updateFixture = (id, patch) => {
    setFixtures((current) => current.map((match) => match.id === id ? { ...match, ...patch } : match));
    notify("Fixture updated (example data, not saved to a server)");
  };
  const addFixture = (fixture) => {
    setFixtures((current) => [...current, fixture]);
    notify("Fixture added (example data, not saved to a server)");
  };
  const deleteFixture = (id) => {
    setFixtures((current) => current.filter((match) => match.id !== id));
    notify("Fixture deleted (example data, not saved to a server)");
  };
  // DEMO — local-only add/edit/delete for the example schedule; no backend to persist to yet.
  const updateScheduleMatch = (id, patch) => {
    setSchedule((current) => current.map((group) => ({
      ...group,
      matches: group.matches.map((match) => match.id === id ? { ...match, ...patch } : match),
    })));
    notify("Schedule updated (example data, not saved to a server)");
  };
  const addScheduleMatch = (day, match) => {
    setSchedule((current) => current.map((group) => group.day === day ? { ...group, matches: [...group.matches, match] } : group));
    notify("Schedule entry added (example data, not saved to a server)");
  };
  const deleteScheduleMatch = (id) => {
    setSchedule((current) => current.map((group) => ({ ...group, matches: group.matches.filter((match) => match.id !== id) })));
    notify("Schedule entry deleted (example data, not saved to a server)");
  };
  // DEMO — local-only edit for the example points table; no backend to persist to yet.
  const updatePointsSection = (section, scores) => {
    setPoints((current) => current.map((row) => row.section === section ? { ...row, scores } : row));
    notify("Points table updated (example data, not saved to a server)");
  };
  // DEMO — local-only add/edit/delete for the example tournaments; no backend to persist to yet.
  const addUpcomingTournament = (tournament) => {
    setUpcomingTournaments((current) => [...current, tournament]);
    notify("Tournament added (example data, not saved to a server)");
  };
  const updateUpcomingTournament = (id, patch) => {
    setUpcomingTournaments((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    notify("Tournament updated (example data, not saved to a server)");
  };
  const deleteUpcomingTournament = (id) => {
    setUpcomingTournaments((current) => current.filter((item) => item.id !== id));
    notify("Tournament deleted (example data, not saved to a server)");
  };
  const addPastTournament = (tournament) => {
    setPastTournaments((current) => [...current, tournament]);
    notify("Tournament added (example data, not saved to a server)");
  };
  const updatePastTournament = (id, patch) => {
    setPastTournaments((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    notify("Tournament updated (example data, not saved to a server)");
  };
  const deletePastTournament = (id) => {
    setPastTournaments((current) => current.filter((item) => item.id !== id));
    notify("Tournament deleted (example data, not saved to a server)");
  };
  // Sub-navigation for the Tournaments section of the Fixtures & events tab
  // (main two-box view / gallery / a specific tournament's detail page) —
  // see tournamentsView/selectedTournamentId above for why this lives here
  // instead of inside TournamentsPanel.
  const openTournamentGallery = () => { setTournamentsView("gallery"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openTournament = (id) => { setSelectedTournamentId(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const backTournaments = () => {
    if (selectedTournamentId) setSelectedTournamentId(null);
    else setTournamentsView("main");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const tournamentsPageView = selectedTournamentId ? "detail" : tournamentsView;
  const selectedTournament = selectedTournamentId ? pastTournaments.find((item) => item.id === selectedTournamentId) : null;
  // The one place a page needs more than its own NAV label: drilling into a
  // tournament adds "Tournaments" and its name as extra breadcrumb segments.
  // Every other page is still just [NAV label], same as always.
  const breadcrumbTrail = page === "sports" && (tournamentsPageView === "gallery" || selectedTournament)
    ? [NAV.find((item) => item.id === "sports")?.label, "Tournaments", selectedTournament?.name].filter(Boolean)
    : [NAV.find((item) => item.id === page)?.label];
  const changeRole = (role) => { setUser((current) => ({ ...current, id: `demo-${role}`, role, name: role === "admin" ? "Sports Committee" : `Demo ${titleCase(role)}` })); setProfileOpen(false); };
  const changeRole = (role) => { setUser((current) => ({ ...current, id: `demo-${role}`, role, name: role === "admin" ? "Sports Committee" : roleLabel(role) })); setProfileOpen(false); };

  const content = {
    overview: <Overview venues={venues} equipment={equipment} bookings={bookings} matches={matches} navigate={navigate} onBook={openBooking} />,
    venues: <ResourcePage type="venue" items={venues} loading={loading} onBook={openBooking} refresh={loadCore} />,
    equipment: <ResourcePage type="equipment" items={equipment} loading={loading} onBook={openBooking} refresh={loadCore} />,
    bookings: <BookingsPage bookings={bookings} loading={loading} onCancel={cancelBooking} navigate={navigate} />,
    sports: (
      <SportsPage
        fixtures={fixtures}
        canEditScores={["scorekeeper", "admin"].includes(user.role)}
        onUpdateFixture={updateFixture} onAddFixture={addFixture} onDeleteFixture={deleteFixture}
        schedule={schedule} onUpdateScheduleMatch={updateScheduleMatch}
        onAddScheduleMatch={addScheduleMatch} onDeleteScheduleMatch={deleteScheduleMatch}
        points={points} onUpdatePointsSection={updatePointsSection}
        upcomingTournaments={upcomingTournaments} pastTournaments={pastTournaments}
        canEditTournaments={user.role === "admin"}
        onAddUpcomingTournament={addUpcomingTournament} onUpdateUpcomingTournament={updateUpcomingTournament} onDeleteUpcomingTournament={deleteUpcomingTournament}
        onAddPastTournament={addPastTournament} onUpdatePastTournament={updatePastTournament} onDeletePastTournament={deletePastTournament}
        tournamentsView={tournamentsPageView} selectedTournament={selectedTournament}
        onOpenTournamentGallery={openTournamentGallery} onOpenTournament={openTournament} onBackTournaments={backTournaments}
      />
    ),
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
          <div className="breadcrumb">
            <Home size={15} />
            {breadcrumbTrail.flatMap((segment, index, trail) => [
              <span key={`sep-${index}`}>/</span>,
              index === trail.length - 1
                ? <strong key={`seg-${index}`}>{segment}</strong>
                : <span key={`seg-${index}`}>{segment}</span>,
            ])}
          </div>
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
