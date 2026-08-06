import { useRef, useState } from "react";
import { Award, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { titleCase } from "../../lib/format.js";
import ScheduleModal from "./ScheduleModal.jsx";
import AddFixtureModal from "./AddFixtureModal.jsx";
import PointsTableModal from "./PointsTableModal.jsx";

// DEMO — see demoData.js for why this is example data, not live. Add/edit/
// delete are all local React state only (see the fixture handlers passed in
// from App); there is no backend to persist to yet, so a page refresh resets
// everything back to FIXTURES_DEMO. Sport and live/upcoming status aren't
// editable on an existing card — changing what a fixture fundamentally is
// belongs to delete-and-re-add, not an edit form, to keep this demo's scope
// contained.
export default function FixturesPanel({
  fixtures, canEdit, onUpdateFixture, onAddFixture, onDeleteFixture,
  schedule, onUpdateScheduleMatch, onAddScheduleMatch, onDeleteScheduleMatch,
  points, onUpdatePointsSection,
}) {
  const trackRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const scrollTrack = (direction) => {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.9, behavior: "smooth" });
  };

  const startEdit = (match) => {
    setConfirmDeleteId(null);
    setEditingId(match.id);
    setDraft({ stage: match.stage, venue: match.venue, note: match.note, teams: match.teams.map((team) => ({ ...team })) });
  };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveEdit = (id) => { onUpdateFixture(id, draft); setEditingId(null); setDraft(null); };
  const updateDraftTeam = (index, field, value) => setDraft((current) => ({
    ...current,
    teams: current.teams.map((team, teamIndex) => teamIndex === index ? { ...team, [field]: value } : team),
  }));

  if (!fixtures.length) return null;
  return (
    <section className="panel fx-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Sangram · example data</p><h2>Fixtures</h2></div>
        <div className="fx-header-actions">
          {canEdit && <button type="button" className="text-button" onClick={() => setAddOpen(true)}><Plus size={15} aria-hidden="true" />Add fixture</button>}
          <button type="button" className="text-button" onClick={() => setPointsOpen(true)}><Award size={15} aria-hidden="true" />Points table</button>
          <button type="button" className="text-button" onClick={() => setScheduleOpen(true)}><CalendarDays size={15} aria-hidden="true" />Schedule</button>
        </div>
      </div>
      <div className="fx-row">
        <button type="button" className="icon-button fx-arrow" onClick={() => scrollTrack(-1)} aria-label="Scroll fixtures left">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="fx-viewport" ref={trackRef}>
          <div className="fx-track">
            {fixtures.map((match) => {
              const isLive = match.status === "live";
              const isEditing = editingId === match.id;
              const isConfirmingDelete = confirmDeleteId === match.id;
              return (
                <article className="fx-card" key={match.id}>
                  <div className="fx-top">
                    <span className="fx-sport">{titleCase(match.sport)}</span>
                    <span className={`status ${isLive ? "status-live" : "status-upcoming"}`}>{isLive ? "Live" : "Upcoming"}</span>
                  </div>
                  {isEditing ? (
                    <div className="fx-edit-fields">
                      <input className="fx-field-input" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))} aria-label="Stage" placeholder="Stage" />
                      <input className="fx-field-input" value={draft.venue} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} aria-label="Venue" placeholder="Venue" />
                    </div>
                  ) : (
                    <p className="fx-stage">{match.tournament} · {match.stage} · {match.venue}</p>
                  )}
                  {isLive ? (
                    <div className="fx-teams">
                      {(isEditing ? draft.teams : match.teams).map((team, index) => (
                        <div className="fx-team" key={index}>
                          {isEditing
                            ? <input className="fx-input fx-name-input" value={team.name} onChange={(event) => updateDraftTeam(index, "name", event.target.value)} aria-label={`Team ${index + 1} name`} />
                            : <span>{team.name}</span>}
                          {isEditing
                            ? <input className="fx-input" value={team.score} onChange={(event) => updateDraftTeam(index, "score", event.target.value)} aria-label={`Team ${index + 1} score`} />
                            : <strong>{team.score}</strong>}
                        </div>
                      ))}
                    </div>
                  ) : isEditing ? (
                    <div className="fx-teams">
                      {draft.teams.map((team, index) => (
                        <div className="fx-team" key={index}>
                          <input className="fx-input fx-name-input" value={team.name} onChange={(event) => updateDraftTeam(index, "name", event.target.value)} aria-label={`Team ${index + 1} name`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="fx-vs">
                      <strong>{match.teams[0].name}</strong>
                      <span>vs</span>
                      <strong>{match.teams[1].name}</strong>
                    </div>
                  )}
                  {isEditing
                    ? <input className="fx-input fx-note-input" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} aria-label={isLive ? "Match note" : "Kickoff time"} />
                    : <p className="fx-note"><span className="fx-note-icon">{isLive ? <span className="live-dot" /> : <Clock3 size={12} aria-hidden="true" />}</span><span className="fx-note-text">{match.note}</span></p>}
                  {canEdit && (
                    isConfirmingDelete ? (
                      <div className="fx-confirm">
                        <span>Delete this fixture?</span>
                        <div className="fx-confirm-actions">
                          <button type="button" className="button button-ghost fx-btn" onClick={() => setConfirmDeleteId(null)}>Keep</button>
                          <button type="button" className="button button-danger-soft fx-btn" onClick={() => { onDeleteFixture(match.id); setConfirmDeleteId(null); }}>Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div className="fx-actions">
                        {!isEditing && (
                          <button type="button" className="icon-button fx-delete" onClick={() => setConfirmDeleteId(match.id)} aria-label={`Delete ${match.sport} fixture`}>
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                        <div className="fx-actions-primary">
                          {isEditing ? (
                            <>
                              <button type="button" className="button button-ghost fx-btn" onClick={cancelEdit}><X size={13} aria-hidden="true" />Cancel</button>
                              <button type="button" className="button button-primary fx-btn" onClick={() => saveEdit(match.id)}><Check size={13} aria-hidden="true" />Save</button>
                            </>
                          ) : (
                            <button type="button" className="button button-ghost fx-btn" onClick={() => startEdit(match)}><Pencil size={13} aria-hidden="true" />Edit</button>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </article>
              );
            })}
          </div>
        </div>
        <button type="button" className="icon-button fx-arrow" onClick={() => scrollTrack(1)} aria-label="Scroll fixtures right">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      {scheduleOpen && (
        <ScheduleModal
          schedule={schedule}
          canEdit={canEdit}
          onUpdateMatch={onUpdateScheduleMatch}
          onAddMatch={onAddScheduleMatch}
          onDeleteMatch={onDeleteScheduleMatch}
          onClose={() => setScheduleOpen(false)}
        />
      )}
      {addOpen && <AddFixtureModal onAdd={onAddFixture} onClose={() => setAddOpen(false)} />}
      {pointsOpen && (
        <PointsTableModal
          points={points}
          canEdit={canEdit}
          onUpdateSection={onUpdatePointsSection}
          onClose={() => setPointsOpen(false)}
        />
      )}
    </section>
  );
}
