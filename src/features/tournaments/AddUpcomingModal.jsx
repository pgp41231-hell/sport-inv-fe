import { useState } from "react";
import { Plus, X } from "lucide-react";

// DEMO — appends a row to TournamentsPanel's in-memory upcoming list via
// onAdd. Local only; there is no backend endpoint to POST this to yet.
export default function AddUpcomingModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", date: "", note: "" });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onAdd({ id: `up-custom-${Date.now()}`, name: form.name, date: form.date, note: form.note });
    onClose();
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Add upcoming tournament">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">Tournaments · example data</p>
        <h2>Add upcoming tournament</h2>
        <p className="modal-copy">Adds a row to the Upcoming list. Local only — not saved to a server.</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field field-full">Name<input required name="name" value={form.name} onChange={update} placeholder="e.g. Sangram" /></label>
          <label className="field">Date<input required type="date" name="date" value={form.date} onChange={update} /></label>
          <label className="field">Note<input name="note" value={form.note} onChange={update} placeholder="e.g. Flagship inter-section tournament" /></label>
          <button className="button button-primary field-full"><Plus size={17} aria-hidden="true" />Add tournament</button>
        </form>
      </div>
    </div>
  );
}
