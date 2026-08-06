import { useState } from "react";
import { Plus, X } from "lucide-react";

// DEMO — appends an entry to ScheduleModal's in-memory state via onAdd.
// Local only; there is no backend endpoint to POST this to yet.
export default function AddScheduleModal({ days, onAdd, onClose }) {
  const [form, setForm] = useState({ day: days[0] || "Today", time: "", sport: "", stage: "", teams: "", venue: "", status: "upcoming", result: "" });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onAdd(form.day, {
      id: `sch-custom-${Date.now()}`,
      time: form.time,
      sport: form.sport,
      stage: form.stage,
      teams: form.teams,
      venue: form.venue,
      status: form.status,
      ...(form.status === "completed" ? { result: form.result } : {}),
    });
    onClose();
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Add to schedule">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">Sangram · example data</p>
        <h2>Add to schedule</h2>
        <p className="modal-copy">Adds a row to the day you pick below. Local only — not saved to a server.</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">Day
            <select name="day" value={form.day} onChange={update}>
              {days.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label className="field">Time<input required name="time" value={form.time} onChange={update} placeholder="e.g. 05:00 PM" /></label>
          <label className="field">Sport<input required name="sport" value={form.sport} onChange={update} placeholder="e.g. Chess" /></label>
          <label className="field">Status
            <select name="status" value={form.status} onChange={update}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="field field-full">Stage<input required name="stage" value={form.stage} onChange={update} placeholder="e.g. Quarterfinal" /></label>
          <label className="field field-full">Teams<input required name="teams" value={form.teams} onChange={update} placeholder="Team A vs Team B" /></label>
          <label className="field field-full">Venue<input required name="venue" value={form.venue} onChange={update} placeholder="Venue" /></label>
          {form.status === "completed" && (
            <label className="field field-full">Result<input name="result" value={form.result} onChange={update} placeholder="e.g. Team A won 3-1" /></label>
          )}
          <button className="button button-primary field-full"><Plus size={17} aria-hidden="true" />Add to schedule</button>
        </form>
      </div>
    </div>
  );
}
