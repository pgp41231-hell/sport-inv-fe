import { useState } from "react";
import { ArrowRight, Award, CalendarDays, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatDay } from "../../lib/format.js";
import AddUpcomingModal from "./AddUpcomingModal.jsx";
import TournamentGallery from "./TournamentGallery.jsx";
import TournamentDetail from "./TournamentDetail.jsx";

// DEMO — see demoData.js for why this is example data, not live. Add/edit/
// delete are local React state only (see the tournament handlers passed in
// from App); a page refresh resets everything back to the demo data.
// Editing is admin-only — unlike fixtures/schedule/points, scorekeeper does
// not get a say here, per how the role was scoped for this feature.
//
// `view`/`selectedTournament` and the onOpenGallery/onOpenTournament/onBack
// callbacks all come from App.jsx, not local state — unlike everything else
// in this panel. That's specifically so the topbar breadcrumb can show
// "Fixtures & events / Tournaments / <name>": the breadcrumb is rendered way
// up in App's own JSX, so App has to know which of these three views is
// current. See App.jsx's tournamentsView/selectedTournamentId state.
export default function TournamentsPanel({
  view, selectedTournament, upcoming, past, canEdit,
  onAddUpcoming, onUpdateUpcoming, onDeleteUpcoming,
  onAddPast, onUpdatePast, onDeletePast,
  onOpenGallery, onOpenTournament, onBack,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const startEdit = (item) => {
    setConfirmDeleteId(null);
    setEditingId(item.id);
    setDraft({ name: item.name, date: item.date, note: item.note });
  };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveEdit = (id) => { onUpdateUpcoming(id, draft); setEditingId(null); setDraft(null); };

  if (view === "detail" && selectedTournament) {
    return (
      <TournamentDetail
        tournament={selectedTournament}
        canEdit={canEdit}
        onUpdate={onUpdatePast}
        onDelete={onDeletePast}
        onBack={onBack}
      />
    );
  }

  if (view === "gallery") {
    return (
      <TournamentGallery
        past={past}
        canEdit={canEdit}
        onAddPast={onAddPast}
        onOpenTournament={onOpenTournament}
        onBack={onBack}
      />
    );
  }

  return (
    <section className="panel tm-panel">
      <div className="section-heading"><div><p className="eyebrow">Tournaments</p><h2>On campus</h2></div></div>
      <div className="tm-boxes">
        <article className="tm-box">
          <div className="tm-box-cover tm-cover-1"><CalendarDays size={28} aria-hidden="true" /></div>
          <div className="tm-box-body">
            <div className="tm-box-head">
              <h3>Upcoming</h3>
              {canEdit && <button type="button" className="text-button" onClick={() => setAddOpen(true)}><Plus size={14} aria-hidden="true" />Add</button>}
            </div>
            {upcoming.length ? (
              <ul className="tm-upcoming-list">
                {upcoming.map((item) => {
                  const isEditing = editingId === item.id;
                  const isConfirmingDelete = confirmDeleteId === item.id;
                  return (
                    <li className="tm-upcoming-item" key={item.id}>
                      {isEditing ? (
                        <div className="tm-upcoming-edit">
                          <input className="tm-field-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} aria-label="Tournament name" placeholder="Name" />
                          <input className="tm-field-input" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} aria-label="Date" />
                          <input className="tm-field-input" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} aria-label="Note" placeholder="Note" />
                        </div>
                      ) : isConfirmingDelete ? (
                        <p className="tm-confirm-text">Delete this tournament?</p>
                      ) : (
                        <div>
                          <strong>{item.name}</strong>
                          <small>{formatDay(item.date)}{item.note ? ` · ${item.note}` : ""}</small>
                        </div>
                      )}
                      {canEdit && (
                        <div className="tm-item-actions">
                          {isConfirmingDelete ? (
                            <>
                              <button type="button" className="icon-button tm-item-btn" onClick={() => setConfirmDeleteId(null)} aria-label="Keep tournament"><X size={13} aria-hidden="true" /></button>
                              <button type="button" className="icon-button tm-item-btn tm-item-btn-danger" onClick={() => { onDeleteUpcoming(item.id); setConfirmDeleteId(null); }} aria-label="Confirm delete"><Trash2 size={13} aria-hidden="true" /></button>
                            </>
                          ) : isEditing ? (
                            <>
                              <button type="button" className="icon-button tm-item-btn" onClick={cancelEdit} aria-label="Cancel edit"><X size={13} aria-hidden="true" /></button>
                              <button type="button" className="icon-button tm-item-btn" onClick={() => saveEdit(item.id)} aria-label={`Save ${item.name}`}><Check size={13} aria-hidden="true" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="icon-button tm-item-btn" onClick={() => startEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={13} aria-hidden="true" /></button>
                              <button type="button" className="icon-button tm-item-btn tm-item-btn-danger" onClick={() => setConfirmDeleteId(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={13} aria-hidden="true" /></button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted-copy">No upcoming tournaments announced.</p>
            )}
          </div>
        </article>

        <button type="button" className="tm-box tm-box-link" onClick={onOpenGallery}>
          <div className="tm-box-cover tm-cover-2"><Award size={28} aria-hidden="true" /></div>
          <div className="tm-box-body">
            <div className="tm-box-head">
              <h3>Past Tournaments</h3>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
            <p className="muted-copy">{past.length} tournament{past.length === 1 ? "" : "s"} · Browse the gallery</p>
          </div>
        </button>
      </div>
      {addOpen && <AddUpcomingModal onAdd={onAddUpcoming} onClose={() => setAddOpen(false)} />}
    </section>
  );
}
