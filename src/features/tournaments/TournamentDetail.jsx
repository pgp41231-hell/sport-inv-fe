import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, MapPin, Pencil, Trash2, Trophy, X } from "lucide-react";
import { formatDay, titleCase } from "../../lib/format.js";

// DEMO — see demoData.js. This is the page reached by clicking a card in
// TournamentGallery — a real App-level route (App.jsx's selectedTournamentId
// state), not another local panel swap, specifically so the breadcrumb can
// show "Fixtures & events / Tournaments / <name>". Admin-only edit/delete,
// same gate as the rest of this module. The "Moments" strip reuses the exact
// gradient-and-icon cover treatment from the gallery card and the Upcoming/
// Past boxes — same visual language, just smaller — rather than inventing a
// fourth way to fake a photo.
export default function TournamentDetail({ tournament, canEdit, onUpdate, onDelete, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEdit = () => {
    setConfirmDelete(false);
    setIsEditing(true);
    setDraft({
      name: tournament.name,
      blurb: tournament.blurb,
      date: tournament.date,
      venue: tournament.venue || "",
      description: tournament.description || "",
      sports: (tournament.sports || []).join(", "),
    });
  };
  const cancelEdit = () => { setIsEditing(false); setDraft(null); };
  const saveEdit = () => {
    onUpdate(tournament.id, {
      name: draft.name,
      blurb: draft.blurb,
      date: draft.date,
      venue: draft.venue,
      description: draft.description,
      sports: draft.sports.split(",").map((sport) => sport.trim()).filter(Boolean),
    });
    setIsEditing(false);
    setDraft(null);
  };
  const confirmedDelete = () => { onDelete(tournament.id); onBack(); };

  return (
    <section className="panel tm-panel">
      <div className="section-heading">
        <div>
          <button type="button" className="tm-back-link" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" />Back to gallery</button>
          <p className="eyebrow">Past tournaments</p>
          <h2>{tournament.name}</h2>
        </div>
        {canEdit && !isEditing && !confirmDelete && (
          <div className="tm-detail-actions">
            <button type="button" className="button button-ghost" onClick={startEdit}><Pencil size={15} aria-hidden="true" />Edit</button>
            <button type="button" className="button button-danger-soft" onClick={() => setConfirmDelete(true)}><Trash2 size={15} aria-hidden="true" />Delete</button>
          </div>
        )}
      </div>

      <div className="tm-detail-cover tm-cover-1"><Trophy size={40} aria-hidden="true" /></div>

      {confirmDelete ? (
        <div className="tm-confirm">
          <span>Delete {tournament.name} from the gallery? This can't be undone.</span>
          <div className="tm-confirm-actions">
            <button type="button" className="button button-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button type="button" className="button button-danger-soft" onClick={confirmedDelete}>Yes, delete</button>
          </div>
        </div>
      ) : isEditing ? (
        <form className="form-grid tm-detail-form" onSubmit={(event) => { event.preventDefault(); saveEdit(); }}>
          <label className="field field-full">Name<input required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="field field-full">Blurb (shown on the gallery card)<input required value={draft.blurb} onChange={(event) => setDraft((current) => ({ ...current, blurb: event.target.value }))} /></label>
          <label className="field">Date<input required type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label>
          <label className="field">Venue<input value={draft.venue} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} /></label>
          <label className="field field-full">Sports (comma separated)<input value={draft.sports} onChange={(event) => setDraft((current) => ({ ...current, sports: event.target.value }))} /></label>
          <label className="field field-full">Description<textarea rows="3" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="modal-actions field-full">
            <button type="button" className="button button-ghost" onClick={cancelEdit}>Cancel</button>
            <button type="submit" className="button button-primary"><Check size={16} aria-hidden="true" />Save</button>
          </div>
        </form>
      ) : (
        <>
          <p className="tm-detail-meta">
            <span className="tm-detail-meta-item"><CalendarDays size={14} aria-hidden="true" />{formatDay(tournament.date)}</span>
            {tournament.venue && <span className="tm-detail-meta-item"><MapPin size={14} aria-hidden="true" />{tournament.venue}</span>}
          </p>
          {tournament.description && <p className="tm-detail-description">{tournament.description}</p>}
        </>
      )}

      {tournament.sports?.length > 0 && (
        <>
          <p className="tm-detail-subhead">Moments</p>
          <div className="tm-moments-grid">
            {tournament.sports.map((sport, index) => (
              <div className={`tm-moment tm-cover-${(index % 4) + 1}`} key={sport}>
                <Trophy size={20} aria-hidden="true" />
                <span>{titleCase(sport)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
