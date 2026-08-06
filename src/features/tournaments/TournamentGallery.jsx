import { useState } from "react";
import { ArrowLeft, Plus, Trophy } from "lucide-react";
import AddPastModal from "./AddPastModal.jsx";

// DEMO — see demoData.js. Cards are purely a browsing surface — click one to
// open its own detail page (TournamentDetail), which is where all
// editing/deleting for an existing tournament lives now. "Add" is the one
// action that stays here, since a brand-new tournament doesn't have a detail
// page to attach the action to until it exists.
export default function TournamentGallery({ past, canEdit, onAddPast, onOpenTournament, onBack }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="panel tm-panel">
      <div className="section-heading">
        <div>
          <button type="button" className="tm-back-link" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" />Back to tournaments</button>
          <p className="eyebrow">Past tournaments</p>
          <h2>Photo Gallery</h2>
        </div>
        {canEdit && <button type="button" className="text-button" onClick={() => setAddOpen(true)}><Plus size={15} aria-hidden="true" />Add tournament</button>}
      </div>
      <p className="modal-copy">Moments from the field, court, and track.</p>
      {past.length ? (
        <div className="tm-gallery-grid">
          {past.map((item, index) => (
            <button type="button" className="tm-gallery-card" key={item.id} onClick={() => onOpenTournament(item.id)}>
              <div className={`tm-gallery-cover tm-cover-${(index % 4) + 1}`}>
                <Trophy size={26} aria-hidden="true" />
              </div>
              <div className="tm-gallery-body">
                <h3>{item.name}</h3>
                <p>{item.blurb}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-copy">No past tournaments in the gallery yet.</p>
      )}
      {addOpen && <AddPastModal onAdd={onAddPast} onClose={() => setAddOpen(false)} />}
    </section>
  );
}
