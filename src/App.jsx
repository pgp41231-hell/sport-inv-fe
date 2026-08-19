import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronDown, CircleAlert,
  Clock3, Dumbbell, Home, LayoutDashboard, LoaderCircle, LogOut, MapPin, Menu, Plus,
  Save, Search, Settings, ShieldCheck, Sparkles, Trophy, Users, Warehouse, X,
} from "lucide-react";
import { API_BASE_URL, api, isMissingEndpoint } from "./api.js";
import { supabase, supabaseConfigured } from "./supabase.js";
import AuthPage from "./AuthPage.jsx";
import { titleCase } from "./lib/format.js";
// EPIC-03 / EPIC-04 — booking calendar, slot holds, and alternative slots.
import BookingWizard from "./features/booking/BookingWizard.jsx";
import MyBookingsPanel from "./features/booking/MyBookingsPanel.jsx";
import "./features/booking/booking.css";
// Fixtures & schedule. Cards and the points table load from the backend's
// sports-content endpoints when there's real data there (see adapters.js);
// the Schedule modal is still demo-only — see its own README note on why
// that one wasn't part of this pass.
import FixturesPanel from "./features/fixtures/FixturesPanel.jsx";
import { FIXTURES_DEMO, POINTS_SPORTS, POINTS_TABLE_DEMO, SCHEDULE_DEMO } from "./features/fixtures/demoData.js";
import { fixtureToMatch, matchToFixture, standingsToPointsRows } from "./features/fixtures/adapters.js";
import "./features/fixtures/fixtures.css";
// Tournaments. Loads from the backend's sports-content endpoints (tournaments
// + gallery) when there's real data there; falls back to the demo arrays
// otherwise — see adapters.js and the README's degradation note.
import TournamentsPanel from "./features/tournaments/TournamentsPanel.jsx";
import { PAST_TOURNAMENTS_DEMO, UPCOMING_TOURNAMENTS_DEMO } from "./features/tournaments/demoData.js";
import { photoFromGalleryItem, splitTournaments, tournamentToContent } from "./features/tournaments/adapters.js";
import "./features/tournaments/tournaments.css";
// Sports Committee. Loads from the backend's /committee endpoint when
// there's real data there; falls back to COMMITTEE_DEMO otherwise.
import CommitteePanel from "./features/committee/CommitteePanel.jsx";
import { COMMITTEE_DEMO } from "./features/committee/demoData.js";
import "./features/committee/committee.css";
import EquipmentModule from "./features/equipment/EquipmentModule.jsx";
import { AdminOverview, AdminResourcePage, CombinedApprovalsPage } from "./features/admin/AdminOperations.jsx";
import { publicPhotoUrl, uploadRecordPhoto, validatePhoto } from "./media.js";
import InventoryOverview from "./features/equipment/InventoryOverview.jsx";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "venues", label: "Venues", icon: MapPin },
  { id: "equipment", label: "Equipment", icon: Dumbbell },
  { id: "bookings", label: "My bookings", icon: CalendarDays, hiddenFor: ["admin"] },
  { id: "sports", label: "Fixtures & events", icon: Trophy },
  { id: "approvals", label: "Approvals", icon: BadgeCheck, roles: ["approver", "admin"] },
  { id: "admin", label: "Administration", icon: ShieldCheck, roles: ["admin"] },
];

const ROLE_LABELS = {
  requester: "Student",
  approver: "SportComm Member",
};

const formatDate = (value, options = {}) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: options.time === false ? undefined : "short" }).format(new Date(value))
  : "—";

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
  const label = value === "approved" ? "Booked" : titleCase(value || "unknown");
  return <span className={`status status-${value || "neutral"}`}>{label}</span>;
}

function ResourceCard({ item, type, onBook }) {
  const photo = publicPhotoUrl(item.photoPath);
  const label = type === "venue" ? (item.sportName || item.category) : item.category;
  const details = type === "venue"
    ? null
    : `${item.quantity} available · ${titleCase(item.condition)}`;
  const tags = type === "venue" ? [] : Object.keys(item.metadata || {});
  return (
    <article className="resource-card">
      <div className={`resource-visual visual-${type}`}>
        {photo ? <img className="resource-photo" src={photo} alt="" /> : type === "venue" ? <Warehouse size={28} /> : <Dumbbell size={28} />}
        <span>{titleCase(label)}</span>
      </div>
      <div className="resource-content">
        <div>
          <p className="eyebrow">{titleCase(label)}</p>
          <h3>{item.name}</h3>
        </div>
        <p className="resource-location"><MapPin size={15} />{item.location || "Sports complex"}</p>
        {details && <p className="resource-detail">{details}</p>}
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
          {venues.length ? <div className="compact-list">{venues.slice(0, 3).map((venue) => <button key={venue.id} className="compact-resource" onClick={() => onBook(venue, "venue")}><span className="compact-icon"><Warehouse size={20} /></span><span><strong>{venue.name}</strong><small>{venue.sportName || venue.category} · {venue.location || "Campus location"}</small></span><Plus size={18} /></button>)}</div> : <EmptyState icon={MapPin} title="No venues yet" copy="An admin can add the first campus venue." />}
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
  const filtered = items.filter((item) => `${item.name} ${item.sportName || item.category || ""} ${item.location || ""}`.toLowerCase().includes(search.toLowerCase()));
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
      <header className="page-header"><div><p className="eyebrow">Your activity</p><h1>My bookings</h1><p>Track confirmed reservations, upcoming slots, and cancellations.</p></div><button className="button button-primary" onClick={() => navigate("venues")}><Plus size={17} />New booking</button></header>
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
  photosAreReal, onAddPhoto, onRemovePhoto,
  committee,
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
        photosAreReal={photosAreReal} onAddPhoto={onAddPhoto} onRemovePhoto={onRemovePhoto}
      />
      {onLandingView && <CommitteePanel committee={committee} />}
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

function AdminPage({ user, onCreated, audit, equipment }) {
  const [kind, setKind] = useState("venue");
  const [form, setForm] = useState({ name: "", category: "", location: "", capacity: 20, quantity: 5, condition: "good", amenities: "", pool: "CASUAL", tracking: "BULK", assetTags: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [roleForm, setRoleForm] = useState({ email: "", role: "approver" });
  const [accessUsers, setAccessUsers] = useState([]);
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sportName, setSportName] = useState("");
  const [captainForm, setCaptainForm] = useState({ sportId: "", email: "" });
  const [custodyAudit, setCustodyAudit] = useState([]);
  const [auditFilters, setAuditFilters] = useState({ equipmentId: "", personId: "", from: "", to: "" });
  const [kioskPassword, setKioskPassword] = useState("");
  const [emailPattern, setEmailPattern] = useState("");
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [sportFeedback, setSportFeedback] = useState(null);
  const [captainFeedback, setCaptainFeedback] = useState(null);
  const [pocFeedback, setPocFeedback] = useState({});
  const loadAccess = useCallback(async () => {
    const [assignmentResult, settingsResult, usersResult, sportsResult, teamsResult] = await Promise.allSettled([api.roleAssignments(user), api.authSettings(user), api.adminUsers(user), api.equipmentSports(user), api.equipmentTeams(user)]);
    if (assignmentResult.status === "fulfilled") setAssignments(assignmentResult.value.data || []);
    else setAccessMessage(assignmentResult.reason.message);
    if (settingsResult.status === "fulfilled") setEmailPattern(settingsResult.value.data?.emailPattern || "");
    if (usersResult.status === "fulfilled") setAccessUsers(usersResult.value.data || []);
    if (sportsResult.status === "fulfilled") setSports(sportsResult.value.data || []);
    if (teamsResult.status === "fulfilled") setTeams(teamsResult.value.data || []);
  }, [user]);
  useEffect(() => { loadAccess(); }, [loadAccess]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (kind === "venue") await api.createVenue(user, { name: form.name, category: form.category, location: form.location || null, capacity: Number(form.capacity), amenities: form.amenities.split(",").map((item) => item.trim()).filter(Boolean), rules: {}, active: true });
      else {
        const tags = form.assetTags.split(",").map((item) => item.trim()).filter(Boolean);
        if (form.tracking === "ASSET" && tags.length !== Number(form.quantity)) throw new Error("Provide one unique asset tag per unit");
        const createdEquipment = await api.createEquipment(user, { name: form.name, category: form.category, location: form.location || null, quantity: Number(form.quantity), condition: form.condition, metadata: {}, pool: form.pool, tracking: form.tracking, active: true });
        if (tags.length) await api.createEquipmentAssets(user, createdEquipment.data.id, tags.map((assetTag) => ({ assetTag })));
      }
      setForm({ name: "", category: "", location: "", capacity: 20, quantity: 5, condition: "good", amenities: "", pool: "CASUAL", tracking: "BULK", assetTags: "" });
      onCreated(kind);
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  const addRoleAssignment = async (event) => {
    event.preventDefault(); setAccessSaving(true); setAccessMessage("");
    try {
      const response = await api.addRoleAssignment(user, roleForm);
      setAssignments((current) => [...current.filter((item) => item.email !== response.data.email), response.data].sort((a, b) => a.email.localeCompare(b.email)));
      setRoleForm({ email: "", role: "approver" });
      setAccessMessage("Role assignment saved successfully");
    } catch (requestError) { setAccessMessage(requestError.message); } finally { setAccessSaving(false); }
  };
  const removeRoleAssignment = async (email) => {
    setAccessMessage("");
    try {
      await api.removeRoleAssignment(user, email);
      setAssignments((current) => current.filter((item) => item.email !== email));
      setAccessMessage("Role removed; the account is now a Student");
    } catch (requestError) { setAccessMessage(requestError.message); }
  };
  const saveEmailRule = async (event) => {
    event.preventDefault(); setAccessSaving(true); setAccessMessage("");
    try {
      const response = await api.updateAuthSettings(user, emailPattern);
      setEmailPattern(response.data.emailPattern);
      setAccessMessage("Email eligibility rule saved. It applies to signup and future logins.");
    } catch (requestError) { setAccessMessage(requestError.message); } finally { setAccessSaving(false); }
  };
  const addSport = async (event) => { event.preventDefault(); setSportFeedback(null); try { await api.createSport(user, { name: sportName, active: true }); setSportName(""); setSportFeedback({ type: "success", text: "Sport added successfully" }); await loadAccess(); } catch (requestError) { setSportFeedback({ type: "error", text: requestError.message }); } };
  const setPocs = async (sportId, field, value) => { const sport = sports.find((item) => item.id === sportId); setPocFeedback((current) => ({ ...current, [sportId]: null })); try { await api.setSportPocs(user, sportId, { primaryPocId: field === "primary" ? value || null : sport.primaryPocId || null, secondaryPocId: field === "secondary" ? value || null : sport.secondaryPocId || null }); setPocFeedback((current) => ({ ...current, [sportId]: { type: "success", text: "POC saved" } })); await loadAccess(); } catch (requestError) { setPocFeedback((current) => ({ ...current, [sportId]: { type: "error", text: requestError.message } })); } };
  const assignCaptain = async (event) => { event.preventDefault(); setAccessSaving(true); setCaptainFeedback(null); try { await api.assignSportCaptain(user, captainForm.sportId, captainForm.email.trim().toLowerCase()); setCaptainForm({ sportId: "", email: "" }); setCaptainFeedback({ type: "success", text: "Captain assigned successfully" }); await loadAccess(); } catch (requestError) { setCaptainFeedback({ type: "error", text: requestError.message }); } finally { setAccessSaving(false); } };
  const sportCommUsers = accessUsers.filter((account) => account.role === "approver");
  const loadCustodyAudit = async () => { try { setCustodyAudit((await api.equipmentAudit(user, auditFilters)).data || []); } catch (requestError) { setAccessMessage(requestError.message); } };
  const createKiosk = async (event) => { event.preventDefault(); try { await api.createInventoryKiosk(user, kioskPassword); setKioskPassword(""); setAccessMessage("Inventory kiosk account created successfully"); } catch (requestError) { setAccessMessage(requestError.message); } };
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Operations desk</p><h1>Administration</h1><p>Manage portal access, committee roles, and bookable inventory.</p></div></header>
      <section className="panel access-panel">
        <div className="section-heading"><div><p className="eyebrow">Access policy</p><h2>Email eligibility</h2></div><ShieldCheck size={21} /></div>
        <p className="muted-copy">This case-insensitive regular expression is checked during signup and every new login. The fixed administrator account is always allowed.</p>
        <form className="rule-form" onSubmit={saveEmailRule}><label className="field">Allowed email regular expression<input required value={emailPattern} onChange={(event) => setEmailPattern(event.target.value)} placeholder="^pgp\\d{5}@iiml\\.ac\\.in$" /></label><button className="button button-primary" disabled={accessSaving}>{accessSaving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Save rule</button></form>
        <p className="rule-example">Default example: <code>^pgp\d{'{5}'}@iiml\.ac\.in$</code> allows five-digit PGP accounts. Administrator: <strong>sports@iiml.ac.in</strong>.</p>
      </section>
      <section className="panel users-panel">
        <div className="section-heading"><div><p className="eyebrow">Committee rotation</p><h2>Assign a role by email</h2></div><Users size={21} /></div>
        <p className="muted-copy">Everyone is a Student by default. Add only committee members and scorekeepers here; an assignment also applies if the person signs up later.</p>
        <form className="role-assignment-form" onSubmit={addRoleAssignment}><label className="field">Institute email<input required type="email" value={roleForm.email} onChange={(event) => setRoleForm((current) => ({ ...current, email: event.target.value.toLowerCase() }))} placeholder="pgp12345@iiml.ac.in" /></label><label className="field">Role<select value={roleForm.role} onChange={(event) => setRoleForm((current) => ({ ...current, role: event.target.value }))}><option value="approver">SportComm member</option><option value="scorekeeper">Scorekeeper</option></select></label><button className="button button-primary" disabled={accessSaving}>{accessSaving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Add</button></form>
        {accessMessage && <p className={accessMessage.includes("success") || accessMessage.includes("saved") ? "form-success" : "form-error"}>{accessMessage}</p>}
        {assignments.length ? <div className="assignment-list">{assignments.map((assignment) => { const pocSports = sports.filter((sport) => [sport.primaryPocEmail, sport.secondaryPocEmail].includes(assignment.email)).map((sport) => sport.name); return <div className="assignment-row" key={assignment.email}><span><strong>{assignment.email}</strong><small>{assignment.role === "approver" ? "SportComm member" : "Scorekeeper"}{pocSports.length ? ` · POC: ${pocSports.join(", ")}` : ""}</small></span><button className="button button-danger-soft" onClick={() => removeRoleAssignment(assignment.email)}><X size={15} />Remove</button></div>; })}</div> : <p className="empty-assignments">No special roles assigned. All registered users are Students.</p>}
        <form className="kiosk-setup" onSubmit={createKiosk}><div><strong>Inventory kiosk</strong><small>Create `inventory@iiml.ac.in` once. Existing accounts are never reset.</small></div><label className="field">Initial kiosk password<input required minLength="8" type="password" value={kioskPassword} onChange={(event) => setKioskPassword(event.target.value)} /></label><button className="button button-secondary">Set up kiosk</button></form>
      </section>
      <section className="panel sports-pocs-panel">
        <div className="section-heading"><div><p className="eyebrow">Equipment configuration</p><h2>Sports &amp; POCs</h2></div><ShieldCheck size={21} /></div>
        <form className="inline-admin-form" onSubmit={addSport}><label className="field">New sport<input required value={sportName} onChange={(event) => { setSportName(event.target.value); setSportFeedback(null); }} placeholder="Badminton" /></label><button className="button button-primary"><Plus size={16} />Add sport</button></form>
        {sportFeedback && <p className={sportFeedback.type === "success" ? "form-success inline-form-feedback" : "form-error inline-form-feedback"}>{sportFeedback.text}</p>}
        <div className="sport-admin-list">{sports.map((sport) => <div className="sport-admin-row" key={sport.id}><span><strong>{sport.name}</strong>{!sport.primaryPocId && !sport.secondaryPocId && <small className="missing-poc">No POC assigned</small>}{pocFeedback[sport.id] && <small className={`inline-action-feedback ${pocFeedback[sport.id].type}`}>{pocFeedback[sport.id].text}</small>}</span><label className="field">Primary POC<select value={sport.primaryPocId || ""} onChange={(event) => setPocs(sport.id, "primary", event.target.value)}><option value="">No primary POC assigned</option>{sportCommUsers.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}</select></label><label className="field">Secondary POC<select value={sport.secondaryPocId || ""} onChange={(event) => setPocs(sport.id, "secondary", event.target.value)}><option value="">None</option>{sportCommUsers.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}</select></label><span className="sport-actions"><button className="button button-secondary" onClick={() => { const name = window.prompt("Rename sport", sport.name); if (name && name !== sport.name) api.updateSport(user, sport.id, { name }).then(loadAccess); }}>Rename</button><button className="button button-secondary" onClick={() => api.updateSport(user, sport.id, { active: !sport.active }).then(loadAccess)}>{sport.active ? "Mark inactive" : "Reactivate"}</button></span></div>)}</div>
        <div className="section-heading team-heading"><div><p className="eyebrow">Captains</p><h2>Assign captain by email</h2><p className="muted-copy">Choose a sport and enter the institute email of a registered Student. Assigning again replaces that sport's current captain.</p></div></div>
        <form className="captain-assignment-form" onSubmit={assignCaptain}><label className="field">Sport<select required value={captainForm.sportId} onChange={(event) => { setCaptainForm((current) => ({ ...current, sportId: event.target.value })); setCaptainFeedback(null); }}><option value="">Select sport</option>{sports.filter((sport) => sport.active).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}</select></label><label className="field">Student email<input required type="email" value={captainForm.email} onChange={(event) => { setCaptainForm((current) => ({ ...current, email: event.target.value.toLowerCase() })); setCaptainFeedback(null); }} placeholder="pgp12345@iiml.ac.in" /></label><button className="button button-primary" disabled={accessSaving}><Plus size={16} />Assign captain</button></form>
        {captainFeedback && <p className={captainFeedback.type === "success" ? "form-success inline-form-feedback" : "form-error inline-form-feedback"}>{captainFeedback.text}</p>}
        {teams.some((team) => team.active) ? <div className="captain-assignment-list">{teams.filter((team) => team.active).map((team) => <div className="assignment-row" key={team.id}><span><strong>{team.sportName}</strong><small>{team.captainName || team.captainEmail} · {team.captainEmail}</small></span><span className="status status-neutral">Captain</span></div>)}</div> : <p className="empty-assignments">No sport captains assigned yet.</p>}
      </section>
      <div className="admin-grid">
        <section className="panel admin-form-panel" hidden><div className="segmented"><button className={kind === "venue" ? "active" : ""} onClick={() => setKind("venue")}><MapPin size={16} />Venue</button><button className={kind === "equipment" ? "active" : ""} onClick={() => setKind("equipment")}><Dumbbell size={16} />Equipment</button></div><h2>Add {kind}</h2><p className="muted-copy">New inventory is immediately available to the booking interface.</p><form className="form-grid" onSubmit={submit}><label className="field field-full">Name<input required name="name" value={form.name} onChange={update} placeholder={kind === "venue" ? "Badminton Court 1" : "Badminton Racquet"} /></label><label className="field">Category<input required name="category" value={form.category} onChange={update} placeholder={kind === "venue" ? "court" : "racquet"} /></label><label className="field">Location<input name="location" value={form.location} onChange={update} placeholder="Sports Complex" /></label>{kind === "venue" ? <><label className="field">Capacity<input min="1" required type="number" name="capacity" value={form.capacity} onChange={update} /></label><label className="field">Amenities<input name="amenities" value={form.amenities} onChange={update} placeholder="lighting, indoor" /></label></> : <><label className="field">Quantity<input min="1" required type="number" name="quantity" value={form.quantity} onChange={update} /></label><label className="field">Condition<select name="condition" value={form.condition} onChange={update}><option>excellent</option><option>good</option><option>fair</option><option>maintenance</option><option>retired</option></select></label><label className="field">Pool<select name="pool" value={form.pool} onChange={update}><option value="CASUAL">Casual</option><option value="TEAM">Team</option></select></label><label className="field">Tracking<select name="tracking" value={form.tracking} onChange={update}><option value="BULK">Bulk quantity</option><option value="ASSET">Asset tag / serial</option></select></label>{form.tracking === "ASSET" && <label className="field field-full">Asset tags (one per unit, comma separated)<input required name="assetTags" value={form.assetTags} onChange={update} placeholder="RACKET-001, RACKET-002" /></label>}</>}{error && <p className="form-error field-full"><CircleAlert size={16} />{error}</p>}<button className="button button-primary field-full" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Add to inventory</button></form></section>
        <section className="panel audit-panel"><div className="section-heading"><div><p className="eyebrow">Audit history</p><h2>Recent activity</h2></div><Activity size={20} /></div>{audit.length ? <div className="audit-list">{audit.map((entry) => <div className="audit-item" key={entry.id}><span className="audit-dot" /><div><strong>{titleCase(entry.action)}</strong><p>{titleCase(entry.entityType)} · {entry.actorId || "System"}</p><small>{formatDate(entry.createdAt)}</small></div></div>)}</div> : <EmptyState icon={Activity} title="No activity yet" copy="Inventory and booking actions will be recorded here." />}<div className="custody-audit"><div className="section-heading"><div><p className="eyebrow">Equipment custody</p><h2>State changes</h2></div></div><div className="audit-filter-grid"><label className="field">Item<select value={auditFilters.equipmentId} onChange={(event) => setAuditFilters((current) => ({ ...current, equipmentId: event.target.value }))}><option value="">All items</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Person<select value={auditFilters.personId} onChange={(event) => setAuditFilters((current) => ({ ...current, personId: event.target.value }))}><option value="">All people</option>{accessUsers.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="field">From<input type="date" value={auditFilters.from} onChange={(event) => setAuditFilters((current) => ({ ...current, from: event.target.value }))} /></label><button className="button button-secondary" onClick={loadCustodyAudit}>Filter</button></div>{custodyAudit.map((entry) => <div className="audit-item" key={entry.id}><span className="audit-dot" /><div><strong>{entry.equipmentName} × {entry.quantity}</strong><p>{titleCase(entry.fromState)} → {titleCase(entry.toState)} · {entry.personName || entry.teamName || "Inventory"}</p><small>{formatDate(entry.createdAt)}</small></div></div>)}</div></section>
      </div>
    </div>
  );
}

function PortalApp({ initialUser, onLogout }) {
  const [page, setPage] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [bookingResource, setBookingResource] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [equipmentRequests, setEquipmentRequests] = useState([]);
  const [sports, setSports] = useState([]);
  const [audit, setAudit] = useState([]);
  // Fixtures, points table, tournaments, and committee all start out on the
  // demo arrays and switch to real backend data the moment any is found —
  // see loadSportsContent below. The *AreReal flags gate whether each
  // section's add/edit/delete handlers write to the real backend (and
  // reload) or just mutate the local array (the original demo behaviour),
  // so this degrades exactly like the EPIC-03/04 holds/recommendations
  // endpoints already do: a backend with none of this deployed yet leaves
  // the page exactly as it was before this rewiring.
  const [fixtures, setFixtures] = useState(FIXTURES_DEMO);
  const [fixturesAreReal, setFixturesAreReal] = useState(false);
  // DEMO — local-only state for the example schedule; no backend equivalent
  // yet (see features/fixtures/README.md) — out of scope for this pass.
  const [schedule, setSchedule] = useState(SCHEDULE_DEMO);
  const [points, setPoints] = useState(POINTS_TABLE_DEMO);
  const [standingsAreReal, setStandingsAreReal] = useState(false);
  // "section|sportKey" -> the backend standings row id, so updatePointsSection
  // knows whether a cell needs a PATCH (row already exists) or a POST (first
  // time this section/sport pair has a value). Doesn't drive rendering, so a
  // ref instead of state.
  const standingsIndexRef = useRef(new Map());
  const [upcomingTournaments, setUpcomingTournaments] = useState(UPCOMING_TOURNAMENTS_DEMO);
  const [pastTournaments, setPastTournaments] = useState(PAST_TOURNAMENTS_DEMO);
  const [tournamentsAreReal, setTournamentsAreReal] = useState(false);
  // Which tournament standings belong to, and where a newly-added fixture
  // attaches — the live one if there is one, else the most recent
  // published one. Doesn't drive rendering directly, so a ref.
  const currentTournamentIdRef = useRef(null);
  const [committee, setCommittee] = useState(COMMITTEE_DEMO);
  // tournamentId -> that tournament's real photos ({id, url}[]), fetched
  // lazily (only once its detail page is actually opened, not for every
  // tournament in the gallery up front) — see openTournament below.
  const [tournamentPhotosById, setTournamentPhotosById] = useState({});
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
      user.role === "admin" ? api.venues(user) : api.publicVenues(),
      user.role === "admin" ? api.equipmentInventory(user) : api.publicEquipment(),
      user.role === "admin" ? Promise.resolve({ data: [] }) : api.bookings(user),
      api.publicContent("matches"),
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
      const equipmentResult = await Promise.allSettled([api.equipmentRequests(user), api.equipmentSports(user)]);
      setEquipmentRequests(equipmentResult[0].status === "fulfilled" ? equipmentResult[0].value.data || [] : []);
      setSports(equipmentResult[1].status === "fulfilled" ? equipmentResult[1].value.data || [] : []);
    } else setApprovals([]);
    if (user.role === "admin") {
      try { setAudit((await api.audit(user)).data || []); } catch (error) { if (error.status !== 403) notify(error.message, "error"); }
    } else setAudit([]);
  }, [user, notify]);

  // Tournaments, committee, and standings — the sports-content endpoints
  // this app didn't used to have real data behind (see api.js's "Sports
  // content" section). Public reads, so no `user` needed; runs once, not
  // tied to loadCore/loadRoleData's role-driven refresh. Any type with no
  // real rows yet (empty list, or the endpoint 404ing on an older backend)
  // just leaves that section on its demo array — "real data if there is
  // any, else the example so the page isn't empty" is the rule throughout.
  const loadSportsContent = useCallback(async () => {
    const results = await Promise.allSettled([
      api.publicContent("tournaments"),
      api.publicContent("committee"),
    ]);
    const [tournamentsResult, committeeResult] = results;

    let tournamentRecords = [];
    if (tournamentsResult.status === "fulfilled") tournamentRecords = tournamentsResult.value.data || [];
    else if (!isMissingEndpoint(tournamentsResult.reason)) notify(tournamentsResult.reason.message, "error");
    currentTournamentIdRef.current = tournamentRecords.find((item) => item.status === "live")?.id
      || tournamentRecords.find((item) => item.status === "published")?.id
      || tournamentRecords[0]?.id
      || null;
    if (tournamentRecords.length) {
      const { upcoming, past } = splitTournaments(tournamentRecords);
      if (upcoming.length || past.length) {
        setUpcomingTournaments(upcoming);
        setPastTournaments(past);
        setTournamentsAreReal(true);
      }
    }

    if (committeeResult.status === "fulfilled") {
      const committeeRecords = committeeResult.value.data || [];
      if (committeeRecords.length) setCommittee(committeeRecords);
    } else if (!isMissingEndpoint(committeeResult.reason)) notify(committeeResult.reason.message, "error");

    // Standings are scoped to the current tournament, so they need
    // currentTournamentIdRef resolved above first — not part of the
    // allSettled batch.
    if (currentTournamentIdRef.current) {
      try {
        const standingsResponse = await api.publicContent("standings", { tournamentId: currentTournamentIdRef.current });
        const standingsRecords = standingsResponse.data || [];
        if (standingsRecords.length) {
          const { rows, index } = standingsToPointsRows(standingsRecords, POINTS_SPORTS);
          if (rows.length) {
            setPoints(rows);
            standingsIndexRef.current = index;
            setStandingsAreReal(true);
          }
        }
      } catch (error) { if (!isMissingEndpoint(error)) notify(error.message, "error"); }
    }
  }, [notify]);

  useEffect(() => { loadSportsContent(); }, [loadSportsContent]);

  // Fixtures cards are matches (raw backend records, already fetched into
  // `matches` by loadCore for the Overview page's match-peek widget) joined
  // against the tournament names loaded above. Recomputes whenever either
  // side changes, rather than fetching matches a second time here.
  useEffect(() => {
    if (!matches.length) return;
    const tournamentNameById = new Map([...upcomingTournaments, ...pastTournaments].map((item) => [item.id, item.name]));
    const mapped = matches.map((record) => matchToFixture(record, tournamentNameById.get(record.tournamentId))).filter(Boolean);
    if (mapped.length) { setFixtures(mapped); setFixturesAreReal(true); }
  }, [matches, upcomingTournaments, pastTournaments]);

  // A tournament's photos are fetched only once its detail page is actually
  // opened (openTournament below), not for every card in the gallery.
  const loadTournamentPhotos = useCallback(async (tournamentId) => {
    try {
      const response = await api.publicContent("gallery", { tournamentId });
      setTournamentPhotosById((current) => ({ ...current, [tournamentId]: (response.data || []).map(photoFromGalleryItem) }));
    } catch (error) { if (!isMissingEndpoint(error)) notify(error.message, "error"); }
  }, [notify]);

  useEffect(() => { loadCore(); loadRoleData(); }, [loadCore, loadRoleData]);
  const allowedNav = useMemo(() => NAV.filter((item) => (!item.roles || item.roles.includes(user.role)) && !item.hiddenFor?.includes(user.role)), [user.role]);
  useEffect(() => { if (!allowedNav.some((item) => item.id === page)) setPage("overview"); }, [allowedNav, page]);

  const navigate = (next) => { setPage(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openBooking = (item, type) => setBookingResource({ item, type });
  const bookingSaved = async () => { setBookingResource(null); notify("Venue booked successfully"); await loadCore(); setPage("bookings"); };
  // Rethrows so MyBookingsPanel can show the failure on the row it belongs to,
  // rather than only as a toast that has drifted away from the action.
  const cancelBooking = async (id) => { try { await api.cancelBooking(user, id); notify("Booking cancelled"); await loadCore(); } catch (error) { notify(error.message, "error"); throw error; } };
  const decide = async (id, decision, comment) => { try { await api.decideApproval(user, id, { decision, comment: comment || undefined }); notify(`Booking ${decision === "approve" ? "approved" : "rejected"}`); await Promise.all([loadCore(), loadRoleData()]); } catch (error) { notify(error.message, "error"); } };
  const decideEquipment = async (id, decision, note) => { try { const request = equipmentRequests.find((item) => item.id === id); const hasActiveCasualIssue = decision === "approve" && request?.requestType === "CASUAL" && equipmentRequests.some((item) => item.id !== id && item.requesterId === request.requesterId && item.requestType === "CASUAL" && ["APPROVED", "ISSUED", "RETURN_PENDING"].includes(item.status)); await api.decideEquipmentRequest(user, id, { decision, note: note || undefined }); notify(hasActiveCasualIssue ? "Request approved. Warning: this student already has an active casual request or issue; kiosk handover waits until issued equipment is returned." : `Equipment request ${decision === "approve" ? "approved" : "rejected"}`); await loadRoleData(); } catch (error) { notify(error.message, "error"); } };
  const created = async (kind) => { notify(`${titleCase(kind)} added to inventory`); await Promise.all([loadCore(), loadRoleData()]); };
  // Fixtures cards: once fixturesAreReal (or there's a real current
  // tournament for a brand-new one to attach to, so the first real fixture
  // has somewhere to go), these call the backend and reload; otherwise it's
  // the original local-only demo mutation.
  const updateFixture = async (id, patch) => {
    if (fixturesAreReal) {
      try {
        const merged = { ...fixtures.find((item) => item.id === id), ...patch };
        await api.updateContent(user, "matches", id, fixtureToMatch(merged, currentTournamentIdRef.current));
        notify("Fixture updated");
        await loadCore();
      } catch (error) { notify(error.message, "error"); }
      return;
    }
    setFixtures((current) => current.map((match) => match.id === id ? { ...match, ...patch } : match));
    notify("Fixture updated (example data, not saved to a server)");
  };
  const addFixture = async (fixture) => {
    if (fixturesAreReal || currentTournamentIdRef.current) {
      try {
        await api.createContent(user, "matches", fixtureToMatch(fixture, currentTournamentIdRef.current));
        notify("Fixture added");
        setFixturesAreReal(true);
        await loadCore();
      } catch (error) { notify(error.message, "error"); }
      return;
    }
    setFixtures((current) => [...current, fixture]);
    notify("Fixture added (example data, not saved to a server)");
  };
  const deleteFixture = async (id) => {
    if (fixturesAreReal) {
      try { await api.deleteContent(user, "matches", id); notify("Fixture deleted"); await loadCore(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setFixtures((current) => current.filter((match) => match.id !== id));
    notify("Fixture deleted (example data, not saved to a server)");
  };
  // DEMO — local-only add/edit/delete for the example schedule; no backend
  // equivalent yet (see features/fixtures/README.md) — out of scope for
  // this pass, unlike the fixture cards and points table above/below.
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
  // Points table: real (PATCH a section/sport pair that already has a
  // standings row, POST one that doesn't yet — standingsIndexRef tracks
  // which) once standingsAreReal or there's a real current tournament to
  // attach new rows to; else the original local-only demo mutation.
  const updatePointsSection = async (section, scores) => {
    if (standingsAreReal || currentTournamentIdRef.current) {
      try {
        await Promise.all(POINTS_SPORTS.map(async (sport) => {
          const pointsValue = Number(scores[sport.key]) || 0;
          const key = `${section}|${sport.key}`;
          const existingId = standingsIndexRef.current.get(key);
          if (existingId) await api.updateContent(user, "standings", existingId, { points: pointsValue });
          else {
            const created = await api.createContent(user, "standings", { tournamentId: currentTournamentIdRef.current, section, sport: sport.key, points: pointsValue });
            standingsIndexRef.current.set(key, created.data.id);
          }
        }));
        setStandingsAreReal(true);
        setPoints((current) => current.map((row) => row.section === section ? { ...row, scores } : row));
        notify("Points table updated");
      } catch (error) { notify(error.message, "error"); }
      return;
    }
    setPoints((current) => current.map((row) => row.section === section ? { ...row, scores } : row));
    notify("Points table updated (example data, not saved to a server)");
  };
  // Tournaments: real (POST/PATCH/DELETE tournaments, then reload) once
  // tournamentsAreReal; else the original local-only demo mutation. status
  // is only ever sent on create — see tournamentToContent's own comment.
  const addUpcomingTournament = async (tournament) => {
    if (tournamentsAreReal) {
      try { await api.createContent(user, "tournaments", tournamentToContent(tournament, "published")); notify("Tournament added"); await loadSportsContent(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setUpcomingTournaments((current) => [...current, tournament]);
    notify("Tournament added (example data, not saved to a server)");
  };
  const updateUpcomingTournament = async (id, patch) => {
    if (tournamentsAreReal) {
      try { await api.updateContent(user, "tournaments", id, tournamentToContent(patch)); notify("Tournament updated"); await loadSportsContent(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setUpcomingTournaments((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    notify("Tournament updated (example data, not saved to a server)");
  };
  const deleteUpcomingTournament = async (id) => {
    if (tournamentsAreReal) {
      try { await api.deleteContent(user, "tournaments", id); notify("Tournament deleted"); await loadSportsContent(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setUpcomingTournaments((current) => current.filter((item) => item.id !== id));
    notify("Tournament deleted (example data, not saved to a server)");
  };
  const addPastTournament = async (tournament) => {
    if (tournamentsAreReal) {
      try { await api.createContent(user, "tournaments", tournamentToContent(tournament, "completed")); notify("Tournament added"); await loadSportsContent(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setPastTournaments((current) => [...current, tournament]);
    notify("Tournament added (example data, not saved to a server)");
  };
  const updatePastTournament = async (id, patch) => {
    if (tournamentsAreReal) {
      try { await api.updateContent(user, "tournaments", id, tournamentToContent(patch)); notify("Tournament updated"); await loadSportsContent(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setPastTournaments((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    notify("Tournament updated (example data, not saved to a server)");
  };
  const deletePastTournament = async (id) => {
    if (tournamentsAreReal) {
      try { await api.deleteContent(user, "tournaments", id); notify("Tournament deleted"); await loadSportsContent(); }
      catch (error) { notify(error.message, "error"); }
      return;
    }
    setPastTournaments((current) => current.filter((item) => item.id !== id));
    notify("Tournament deleted (example data, not saved to a server)");
  };
  // Tournament photos: real (upload + POST/DELETE gallery, then reload that
  // tournament's photos) once tournamentsAreReal, else the same local-only
  // array mutation TournamentDetail already did before this rewiring —
  // see TournamentDetail.jsx's addPhotos/removePhoto.
  const addTournamentPhoto = async (tournamentId, file) => {
    try {
      let mediaUrl;
      if (supabaseConfigured) {
        const path = await uploadRecordPhoto(`tournaments/${tournamentId}`, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file);
        mediaUrl = publicPhotoUrl(path);
      } else {
        validatePhoto(file);
        mediaUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      await api.createContent(user, "gallery", { title: "Tournament photo", mediaUrl, tournamentId });
      notify("Photo added");
      await loadTournamentPhotos(tournamentId);
    } catch (error) { notify(error.message, "error"); }
  };
  const removeTournamentPhoto = async (photoId) => {
    try {
      await api.deleteContent(user, "gallery", photoId);
      notify("Photo removed");
      if (selectedTournamentId) await loadTournamentPhotos(selectedTournamentId);
    } catch (error) { notify(error.message, "error"); }
  };
  // Sub-navigation for the Tournaments section of the Fixtures & events tab
  // (main two-box view / gallery / a specific tournament's detail page) —
  // see tournamentsView/selectedTournamentId above for why this lives here
  // instead of inside TournamentsPanel.
  const openTournamentGallery = () => { setTournamentsView("gallery"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openTournament = (id) => {
    setSelectedTournamentId(id);
    if (tournamentsAreReal) loadTournamentPhotos(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backTournaments = () => {
    if (selectedTournamentId) setSelectedTournamentId(null);
    else setTournamentsView("main");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const tournamentsPageView = selectedTournamentId ? "detail" : tournamentsView;
  const selectedTournamentBase = selectedTournamentId ? pastTournaments.find((item) => item.id === selectedTournamentId) : null;
  // Real photos are fetched separately (loadTournamentPhotos, above) rather
  // than living on the tournament record itself, so merge them in here —
  // TournamentDetail still just reads tournament.photos either way.
  const selectedTournament = selectedTournamentBase && tournamentsAreReal
    ? { ...selectedTournamentBase, photos: tournamentPhotosById[selectedTournamentBase.id] || [] }
    : selectedTournamentBase;
  // The one place a page needs more than its own NAV label: drilling into a
  // tournament adds "Tournaments" and its name as extra breadcrumb segments.
  // Every other page is still just [NAV label], same as always.
  const breadcrumbTrail = page === "sports" && (tournamentsPageView === "gallery" || selectedTournament)
    ? [NAV.find((item) => item.id === "sports")?.label, "Tournaments", selectedTournament?.name].filter(Boolean)
    : [NAV.find((item) => item.id === page)?.label];
  const logout = async () => { try { await api.logout(user); } catch {} onLogout(); };

  const content = {
    overview: user.role === "admin" ? <AdminOverview venueApprovals={approvals} equipmentRequests={equipmentRequests} equipment={equipment} sports={sports} navigate={navigate} /> : <Overview venues={venues} equipment={equipment} bookings={bookings} matches={matches} navigate={navigate} onBook={openBooking} />,
    venues: user.role === "admin" ? <AdminResourcePage type="venue" items={venues} loading={loading} user={user} refresh={loadCore} notify={notify} /> : <ResourcePage type="venue" items={venues} loading={loading} onBook={openBooking} refresh={loadCore} />,
    equipment: user.role === "admin" ? <><AdminResourcePage type="equipment" items={equipment} equipmentRequests={equipmentRequests} loading={loading} user={user} refresh={async () => { await Promise.all([loadCore(), loadRoleData()]); }} notify={notify} /><InventoryOverview user={user} notify={notify} /></> : <><EquipmentModule user={user} equipment={equipment} notify={notify} onLogout={onLogout} />{user.role === "approver" && <InventoryOverview user={user} notify={notify} />}</>,
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
        photosAreReal={tournamentsAreReal} onAddPhoto={addTournamentPhoto} onRemovePhoto={removeTournamentPhoto}
        committee={committee}
      />
    ),
    approvals: <CombinedApprovalsPage user={user} venueApprovals={approvals} equipmentRequests={equipmentRequests} sports={sports} loading={loading} onVenueDecision={decide} onEquipmentDecision={decideEquipment} />,
    admin: <AdminPage user={user} onCreated={created} audit={audit} equipment={equipment} />,
  }[page];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Trophy size={22} /></span><span><strong>Courtyard</strong><small>IIM Lucknow Sports</small></span></div>
        <nav>{allowedNav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === "approvals" && approvals.length + equipmentRequests.filter((request) => request.status === "PENDING").length > 0 && <b>{approvals.length + equipmentRequests.filter((request) => request.status === "PENDING").length}</b>}</button>)}</nav>
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
            <button className="profile-button" onClick={() => setProfileOpen((open) => !open)} aria-label={`Account menu. Current role: ${roleLabel(user.role)}`}><span className="avatar">{user.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span><span><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></span><ChevronDown size={16} /></button>
            {profileOpen && <div className="profile-menu"><p>{user.email}</p><button onClick={() => { setPasswordOpen(true); setProfileOpen(false); }}><span>Change password</span><Settings size={15} /></button><button onClick={logout}><span>Sign out</span><LogOut size={15} /></button></div>}
          </div>
        </header>
        <main className="content">{content}</main>
      </div>
      {bookingResource && <BookingWizard resource={bookingResource} user={user} myBookingIds={bookings.map((booking) => booking.id)} onClose={() => setBookingResource(null)} onSaved={bookingSaved} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
      {passwordOpen && <PasswordChange user={user} onDone={(updated) => { setUser((current) => ({ ...current, ...updated })); setPasswordOpen(false); notify("Password changed"); }} onCancel={() => setPasswordOpen(false)} />}
    </div>
  );
}

function PasswordChange({ user, mandatory = false, onDone, onCancel }) {
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (passwords.password.length < 8) return setError("Password must contain at least 8 characters");
    if (passwords.password !== passwords.confirm) return setError("Passwords do not match");
    setSaving(true);
    try { const response = await api.changePassword(user, passwords.password); onDone(response.data); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  const form = <form className="auth-card" onSubmit={submit}><div className="auth-icon"><Settings /></div><p className="eyebrow">Account security</p><h2>{mandatory ? "Choose a new password" : "Change password"}</h2><p className="muted-copy">{mandatory ? "The seeded administrator password must be replaced before the portal can be used." : "Update your Supabase account password."}</p><label className="field">New password<input required minLength="8" type="password" value={passwords.password} onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))} /></label><label className="field">Confirm password<input required minLength="8" type="password" value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} /></label>{error && <p className="form-error"><CircleAlert size={16} />{error}</p>}<button className="button button-primary button-wide" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Save password</button>{!mandatory && <button type="button" className="auth-switch" onClick={onCancel}>Cancel</button>}</form>;
  return mandatory ? <main className="auth-shell"><section className="auth-story"><div className="auth-brand"><span className="brand-mark"><Trophy /></span><strong>Courtyard</strong></div><div><p className="hero-kicker"><ShieldCheck size={15} />First login</p><h1>Secure the<br /><span>admin account.</span></h1></div></section><section className="auth-card-wrap">{form}</section></main> : <div className="modal-backdrop"><section className="modal-panel">{form}</section></div>;
}

const SESSION_KEY = "courtyard-session";

export default function App() {
  const [sessionUser, setSessionUser] = useState(undefined);
  useEffect(() => {
    if (supabaseConfigured) {
      const hydrate = async (session) => {
        if (!session) { setSessionUser(null); return; }
        try {
          const profile = (await api.me({ token: session.access_token })).data;
          setSessionUser({ ...profile, token: session.access_token, expiresAt: new Date(session.expires_at * 1000).toISOString() });
        } catch { setSessionUser(null); }
      };
      supabase.auth.getSession().then(({ data }) => hydrate(data.session));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => hydrate(session), 0); });
      return () => listener.subscription.unsubscribe();
    }
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) { setSessionUser(null); return; }
    try {
      const candidate = JSON.parse(stored);
      api.me(candidate).then((response) => {
        const current = { ...response.data, token: candidate.token, expiresAt: candidate.expiresAt };
        localStorage.setItem(SESSION_KEY, JSON.stringify(current));
        setSessionUser(current);
      }).catch(() => { localStorage.removeItem(SESSION_KEY); setSessionUser(null); });
    } catch { localStorage.removeItem(SESSION_KEY); setSessionUser(null); }
    return undefined;
  }, []);
  const authenticated = ({ user, token, expiresAt }) => {
    const current = { ...user, token, expiresAt };
    localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    setSessionUser(current);
  };
  const logout = () => { localStorage.removeItem(SESSION_KEY); setSessionUser(null); };
  if (sessionUser === undefined) return <div className="auth-loading"><LoaderCircle className="spin" /></div>;
  if (!sessionUser) return <AuthPage onAuthenticated={authenticated} />;
  if (sessionUser.mustChangePassword) return <PasswordChange mandatory user={sessionUser} onDone={(updated) => setSessionUser((current) => ({ ...current, ...updated }))} />;
  if (sessionUser.role === "inventory_kiosk") return <EquipmentModule user={sessionUser} equipment={[]} notify={() => {}} onLogout={logout} />;
  return <PortalApp initialUser={sessionUser} onLogout={logout} />;
}
