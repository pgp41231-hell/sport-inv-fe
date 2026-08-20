import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Award, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { titleCase } from "../../lib/format.js";
import ScheduleModal from "./ScheduleModal.jsx";
import AddFixtureModal from "./AddFixtureModal.jsx";
import PointsTableModal from "./PointsTableModal.jsx";

// DEMO — see demoData.js for why this is example data, not live. Add/edit/
// delete are all local React state only (see the fixture handlers passed in
// from App); there is no backend to persist to yet, so a page refresh resets
// everything back to FIXTURES_DEMO. Sport and live/upcoming/completed status
// aren't editable on an existing card — changing what a fixture fundamentally
// is belongs to delete-and-re-add, not an edit form, to keep this demo's
// scope contained.

// Display order for the card strip, left to right: completed, then live,
// then upcoming — the same order the matches actually happen in. The strip
// opens scrolled to the first live card (see the useLayoutEffect below), so
// "live" is what's visible on load; scrolling left reveals what's already
// finished, scrolling right reveals what's still to come. This is a display
// order only — FIXTURES_DEMO / a fixture added via AddFixtureModal keep
// whatever order they're stored/appended in, independent of this.
const STATUS_ORDER = { completed: 0, live: 1, upcoming: 2 };

export default function FixturesPanel({
  fixtures, canEdit, onUpdateFixture, onAddFixture, onDeleteFixture,
  schedule, onUpdateScheduleMatch, onAddScheduleMatch, onDeleteScheduleMatch,
  points, onUpdatePointsSection,
}) {
  const trackRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const orderedFixtures = useMemo(
    () => [...fixtures].sort((a, b) => (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1)),
    [fixtures],
  );

  // Runs once, before the first paint, so there's no visible jump from
  // "start of strip" to "first live card" — the strip just opens there.
  // Only ever runs once (hasOpenedRef), so later edits elsewhere don't yank
  // the scroll position back to live out from under the person using it.
  useLayoutEffect(() => {
    if (hasOpenedRef.current) return;
    const viewport = trackRef.current;
    const firstLiveIndex = orderedFixtures.findIndex((match) => match.status === "live");
    if (!viewport || firstLiveIndex <= 0) { hasOpenedRef.current = true; return; }
    const card = viewport.querySelectorAll(".fx-card")[firstLiveIndex];
    if (card) viewport.scrollLeft = card.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
    hasOpenedRef.current = true;
  }, [orderedFixtures]);

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

  if (!orderedFixtures.length) return null;
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
            {orderedFixtures.map((match) => {
              const isLive = match.status === "live";
              const isCompleted = match.status === "completed";
              // Live and completed cards both show a score per team; only
              // upcoming ones show a bare "Team A vs Team B" instead.
              const showScore = isLive || isCompleted;
              const isEditing = editingId === match.id;
              const isConfirmingDelete = confirmDeleteId === match.id;
              return (
                <article className="fx-card" key={match.id}>
                  <div className="fx-top">
                    <span className="fx-sport">{titleCase(match.sport)}</span>
                    <span className={`status ${isLive ? "status-live" : isCompleted ? "status-completed" : "status-upcoming"}`}>{isLive ? "Live" : isCompleted ? "Full time" : "Upcoming"}</span>
                  </div>
                  {isEditing ? (
                    <div className="fx-edit-fields">
                      <input className="fx-field-input" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))} aria-label="Stage" placeholder="Stage" />
                      <input className="fx-field-input" value={draft.venue} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} aria-label="Venue" placeholder="Venue" />
                    </div>
                  ) : (
                    <p className="fx-stage">{match.tournament} · {match.stage} · {match.venue}</p>
                  )}
                  {isEditing ? (
                    <div className="fx-teams">
                      {draft.teams.map((team, index) => (
                        <div className="fx-team" key={index}>
                          <input className="fx-input fx-name-input" value={team.name} onChange={(event) => updateDraftTeam(index, "name", event.target.value)} aria-label={`Team ${index + 1} name`} />
                          {showScore && <input className="fx-input" value={team.score} onChange={(event) => updateDraftTeam(index, "score", event.target.value)} aria-label={`Team ${index + 1} score`} />}
                        </div>
                      ))}
                    </div>
                  ) : showScore ? (
                    <div className="fx-teams">
                      {match.teams.map((team, index) => (
                        <div className="fx-team" key={index}>
                          <span>{team.name}</span>
                          <strong>{team.score}</strong>
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
                    ? <input className="fx-input fx-note-input" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} aria-label={showScore ? "Match note" : "Kickoff time"} />
                    : <p className="fx-note"><span className="fx-note-icon">{isLive ? <span className="live-dot" /> : isCompleted ? <Check size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}</span><span className="fx-note-text">{match.note}</span></p>}
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
