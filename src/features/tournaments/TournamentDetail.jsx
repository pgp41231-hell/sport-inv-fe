import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, ImagePlus, MapPin, Pencil, Trash2, Trophy, X } from "lucide-react";
import { formatDay } from "../../lib/format.js";

// DEMO — see demoData.js. This is the page reached by clicking a card in
// TournamentGallery — a real App-level route (App.jsx's selectedTournamentId
// state), not another local panel swap, specifically so the breadcrumb can
// show "Fixtures & events / Tournaments / <name>". Admin-only edit/delete,
// same gate as the rest of this module. "Photos" is real images from
// `tournament.photos`, shown only for tournaments that have them — the
// gradient-and-icon "Moments" placeholder strip that used to sit below it
// (one fake tile per entry in `tournament.sports`) was removed once real
// photos existed; `sports` itself is untouched and still editable below, it
// just has no on-page display of its own right now.
//
// Adding a photo (admin-only) reads the chosen file(s) as data URLs via
// FileReader and appends them to `tournament.photos` through the same
// `onUpdate` the text-field edit form already uses — no new prop, no
// backend: it's exactly as "demo" as everything else here (in-memory only,
// gone on refresh), it just happens to work because a data: URL is a
// complete, self-contained image, not a reference to a file on disk.
// Removing one is a direct click, no confirm step — unlike deleting the
// whole tournament, losing one photo from a set is low-stakes and trivial
// to re-add, so the extra friction isn't worth it here.
export default function TournamentDetail({ tournament, canEdit, onUpdate, onDelete, onBack, photosAreReal, onAddPhoto, onRemovePhoto }) {
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

  const addPhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; // lets the same file be picked again later
    if (!files.length) return;
    if (photosAreReal) {
      // Raw File objects, not read here — the parent decides how a photo
      // actually gets stored (compressed upload to Supabase Storage, or a
      // data: URL fallback when Storage isn't configured — see App.jsx).
      // One real gallery row per file; onAddPhoto's caller reloads the real
      // photo list afterward, same reload-after-mutation pattern as
      // everywhere else real data is edited in this app.
      for (const file of files) await onAddPhoto(tournament.id, file);
      return;
    }
    const readAsDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const dataUrls = await Promise.all(files.map(readAsDataUrl));
    const added = dataUrls.map((url, index) => ({ id: `local-${Date.now()}-${index}`, url }));
    onUpdate(tournament.id, { photos: [...(tournament.photos || []), ...added] });
  };
  const removePhoto = (photoId) => {
    if (photosAreReal) { onRemovePhoto(photoId); return; }
    onUpdate(tournament.id, { photos: tournament.photos.filter((photo) => photo.id !== photoId) });
  };

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

      {(tournament.photos?.length > 0 || canEdit) && (
        <>
          <div className="tm-photos-head">
            <p className="tm-detail-subhead">Photos</p>
            {canEdit && (
              <label className="text-button tm-photo-add">
                <ImagePlus size={15} aria-hidden="true" />Add photo
                <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
              </label>
            )}
          </div>
          {tournament.photos?.length > 0 ? (
            <div className="tm-photo-grid">
              {tournament.photos.map((photo, index) => (
                <div className="tm-photo-item" key={photo.id}>
                  <img
                    className="tm-photo"
                    src={photo.url}
                    alt={`${tournament.name} — photo ${index + 1}`}
                    loading="lazy"
                  />
                  {canEdit && (
                    <button type="button" className="icon-button tm-photo-remove" onClick={() => removePhoto(photo.id)} aria-label={`Remove photo ${index + 1}`}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No photos yet — add the first one.</p>
          )}
        </>
      )}
    </section>
  );
}
