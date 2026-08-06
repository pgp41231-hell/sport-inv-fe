import { Mail, Phone } from "lucide-react";

// DEMO — see demoData.js for why this is example data, not live. Read-only:
// every other section on the Fixtures & events page ended up with
// add/edit/delete for scorekeeper/admin, but that wasn't asked for here, so
// this stays a plain directory for now. Adding it later would follow the
// same edit/confirm-delete pattern as TournamentsPanel.
export default function CommitteePanel({ committee }) {
  if (!committee.length) {
    return (
      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Sports Committee</p><h2>Need help?</h2></div></div>
        <p className="muted-copy">Committee contacts will appear here once published.</p>
      </section>
    );
  }
  return (
    <section className="panel cm-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sports Committee</p>
          <h2>Need help?</h2>
          <p className="muted-copy">The team running athletics across the IIM Lucknow campus.</p>
        </div>
      </div>
      <div className="cm-grid">
        {committee.map((member) => (
          <article className="cm-card" key={member.id}>
            <div className="cm-card-top">
              <span className="cm-avatar">{member.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
              <div className="cm-card-head">
                <strong>{member.name}</strong>
                <small>{member.title}</small>
              </div>
            </div>
            <span className="tag cm-tag">{member.tag}</span>
            <a className="cm-contact" href={`mailto:${member.email}`}><Mail size={14} aria-hidden="true" />{member.email}</a>
            <a className="cm-contact" href={`tel:${member.phone.replace(/\s+/g, "")}`}><Phone size={14} aria-hidden="true" />{member.phone}</a>
          </article>
        ))}
      </div>
    </section>
  );
}
