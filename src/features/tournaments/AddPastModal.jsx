import { useState } from "react";
import { Plus, X } from "lucide-react";

// DEMO — appends a card to TournamentGallery's in-memory list via onAdd.
// Local only; there is no backend endpoint to POST this to yet.
export default function AddPastModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", blurb: "", date: "", venue: "", description: "", sports: "" });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onAdd({
      id: `past-custom-${Date.now()}`,
      name: form.name,
      blurb: form.blurb,
      date: form.date,
      venue: form.venue,
      description: form.description,
      sports: form.sports.split(",").map((sport) => sport.trim()).filter(Boolean),
    });
    onClose();
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Add past tournament">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">Tournaments · example data</p>
        <h2>Add past tournament</h2>
        <p className="modal-copy">Adds a card to the gallery, with its own detail page. Local only — not saved to a server.</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field field-full">Name<input required name="name" value={form.name} onChange={update} placeholder="e.g. Sangram 2025" /></label>
          <label className="field field-full">Blurb (shown on the gallery card)<input required name="blurb" value={form.blurb} onChange={update} placeholder="e.g. Last-over drama under the lights" /></label>
          <label className="field">Date<input required type="date" name="date" value={form.date} onChange={update} /></label>
          <label className="field">Venue<input name="venue" value={form.venue} onChange={update} placeholder="e.g. Sports Complex" /></label>
          <label className="field field-full">Sports (comma separated)<input name="sports" value={form.sports} onChange={update} placeholder="e.g. cricket, football, badminton" /></label>
          <label className="field field-full">Description<textarea name="description" value={form.description} onChange={update} rows="3" placeholder="A paragraph for the detail page" /></label>
          <button className="button button-primary field-full"><Plus size={17} aria-hidden="true" />Add tournament</button>
        </form>
      </div>
    </div>
  );
}
