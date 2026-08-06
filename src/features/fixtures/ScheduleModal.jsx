import { useState } from "react";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { titleCase } from "../../lib/format.js";
import AddScheduleModal from "./AddScheduleModal.jsx";

// DEMO — see demoData.js. Add/edit/delete (scorekeeper/admin only, same gate
// as the fixture cards) are local React state via the handlers passed in
// from App; there is no backend to persist to yet. Sport and day/status are
// not editable on an existing row — moving a match to another day belongs to
// delete-and-re-add, kept out of scope here.
export default function ScheduleModal({ schedule, canEdit, onUpdateMatch, onAddMatch, onDeleteMatch, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const startEdit = (match) => {
    setConfirmDeleteId(null);
    setEditingId(match.id);
    setDraft({ time: match.time, stage: match.stage, teams: match.teams, venue: match.venue, result: match.result || "" });
  };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveEdit = (match) => {
    const patch = { time: draft.time, stage: draft.stage, teams: draft.teams, venue: draft.venue };
    if (match.status === "completed") patch.result = draft.result;
    onUpdateMatch(match.id, patch);
    setEditingId(null);
    setDraft(null);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel fx-schedule-panel" role="dialog" aria-modal="true" aria-label="Sangram tournament schedule">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close schedule"><X size={20} /></button>
        <p className="eyebrow">Sangram · example data</p>
        <div className="fx-schedule-title-row">
          <h2>Full schedule</h2>
          {canEdit && <button type="button" className="text-button" onClick={() => setAddOpen(true)}><Plus size={15} aria-hidden="true" />Add</button>}
        </div>
        <p className="modal-copy">Every fixture across the tournament, day by day.</p>
        <div className="fx-schedule-days">
          {schedule.map((group) => (
            <div className="fx-schedule-day" key={group.day}>
              <h3>{group.day}</h3>
              <div className="fx-schedule-list">
                {group.matches.map((match) => {
                  const isEditing = editingId === match.id;
                  const isConfirmingDelete = confirmDeleteId === match.id;
                  return (
                    <div className={`fx-schedule-row${canEdit ? " fx-schedule-row-editable" : ""}`} key={match.id}>
                      <span className="fx-schedule-time">
                        {isEditing
                          ? <input className="fx-schedule-time-input" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} aria-label="Time" />
                          : match.time}
                      </span>
                      <div className="fx-schedule-main">
                        {isConfirmingDelete ? (
                          <p className="fx-schedule-confirm-text">Delete this fixture from the schedule?</p>
                        ) : isEditing ? (
                          <>
                            <input className="fx-schedule-field-input" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))} aria-label="Stage" placeholder="Stage" />
                            <input className="fx-schedule-field-input" value={draft.teams} onChange={(event) => setDraft((current) => ({ ...current, teams: event.target.value }))} aria-label="Teams" placeholder="Team A vs Team B" />
                            <input className="fx-schedule-field-input" value={draft.venue} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} aria-label="Venue" placeholder="Venue" />
                            {match.status === "completed" && (
                              <input className="fx-schedule-field-input" value={draft.result} onChange={(event) => setDraft((current) => ({ ...current, result: event.target.value }))} aria-label="Result" placeholder="Result" />
                            )}
                          </>
                        ) : (
                          <>
                            <p className="fx-schedule-sport">{titleCase(match.sport)} · {match.stage}</p>
                            <p className="fx-schedule-teams">{match.teams}</p>
                            <p className="fx-schedule-venue"><MapPin size={12} aria-hidden="true" /><span>{match.venue}</span></p>
                            {match.result && <p className="fx-schedule-result">{match.result}</p>}
                          </>
                        )}
                      </div>
                      <span className={`status ${match.status === "live" ? "status-live" : match.status === "completed" ? "status-completed" : "status-upcoming"}`}>
                        {match.status === "live" ? "Live" : match.status === "completed" ? "Full time" : "Upcoming"}
                      </span>
                      {canEdit && (
                        <div className="fx-schedule-actions">
                          {isConfirmingDelete ? (
                            <>
                              <button type="button" className="icon-button fx-schedule-btn" onClick={() => setConfirmDeleteId(null)} aria-label="Keep fixture"><X size={13} aria-hidden="true" /></button>
                              <button type="button" className="icon-button fx-schedule-btn fx-schedule-btn-danger" onClick={() => { onDeleteMatch(match.id); setConfirmDeleteId(null); }} aria-label="Confirm delete"><Trash2 size={13} aria-hidden="true" /></button>
                            </>
                          ) : isEditing ? (
                            <>
                              <button type="button" className="icon-button fx-schedule-btn" onClick={cancelEdit} aria-label="Cancel edit"><X size={13} aria-hidden="true" /></button>
                              <button type="button" className="icon-button fx-schedule-btn" onClick={() => saveEdit(match)} aria-label="Save fixture"><Check size={13} aria-hidden="true" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="icon-button fx-schedule-btn" onClick={() => startEdit(match)} aria-label="Edit fixture"><Pencil size={13} aria-hidden="true" /></button>
                              <button type="button" className="icon-button fx-schedule-btn fx-schedule-btn-danger" onClick={() => setConfirmDeleteId(match.id)} aria-label="Delete fixture"><Trash2 size={13} aria-hidden="true" /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {addOpen && <AddScheduleModal days={schedule.map((group) => group.day)} onAdd={onAddMatch} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
