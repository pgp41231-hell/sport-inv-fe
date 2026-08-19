import { useState } from "react";
import { Plus, X } from "lucide-react";

// DEMO — appends a card to FixturesPanel's in-memory state via onAdd. Local
// only; there is no backend endpoint to POST this to yet.
export default function AddFixtureModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ sport: "", stage: "", venue: "", status: "upcoming", team1: "", team2: "", score1: "", score2: "", note: "" });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    // Live and completed fixtures both carry a final/running score per team;
    // upcoming ones don't have one yet.
    const showScore = form.status === "live" || form.status === "completed";
    onAdd({
      id: `demo-custom-${Date.now()}`,
      sport: form.sport,
      tournament: "Sangram",
      stage: form.stage,
      venue: form.venue,
      status: form.status,
      teams: showScore
        ? [{ name: form.team1, score: form.score1 || "0" }, { name: form.team2, score: form.score2 || "0" }]
        : [{ name: form.team1 }, { name: form.team2 }],
      note: form.note,
    });
    onClose();
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Add fixture">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">Sangram · example data</p>
        <h2>Add fixture</h2>
        <p className="modal-copy">Adds a card to the Fixtures strip. Local only — not saved to a server.</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">Sport<input required name="sport" value={form.sport} onChange={update} placeholder="e.g. Chess" /></label>
          <label className="field">Status
            <select name="status" value={form.status} onChange={update}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="field field-full">Stage<input required name="stage" value={form.stage} onChange={update} placeholder="e.g. Group A · League match" /></label>
          <label className="field field-full">Venue<input required name="venue" value={form.venue} onChange={update} placeholder="e.g. Indoor Court 3" /></label>
          <label className="field">Team 1<input required name="team1" value={form.team1} onChange={update} placeholder="Team name" /></label>
          <label className="field">Team 2<input required name="team2" value={form.team2} onChange={update} placeholder="Team name" /></label>
          {(form.status === "live" || form.status === "completed") && (
            <>
              <label className="field">Team 1 score<input name="score1" value={form.score1} onChange={update} placeholder={form.status === "live" ? "e.g. 21 · 18" : "e.g. 21 · 19"} /></label>
              <label className="field">Team 2 score<input name="score2" value={form.score2} onChange={update} placeholder={form.status === "live" ? "e.g. 15 · 21" : "e.g. 15 · 21"} /></label>
            </>
          )}
          <label className="field field-full">{form.status === "upcoming" ? "Kickoff time" : form.status === "live" ? "Note" : "Result"}<input required name="note" value={form.note} onChange={update} placeholder={form.status === "upcoming" ? "e.g. Tomorrow · 5:00 PM" : form.status === "live" ? "e.g. 2nd set, 14-11" : "e.g. Section A won by 26 runs"} /></label>
          <button className="button button-primary field-full"><Plus size={17} aria-hidden="true" />Add fixture</button>
        </form>
      </div>
    </div>
  );
}
