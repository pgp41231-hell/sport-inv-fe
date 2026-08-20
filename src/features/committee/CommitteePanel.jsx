import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Phone } from "lucide-react";

// Collapsed view shows two rows at the grid's default 3-column width (see
// .cm-grid in committee.css) — a fixed count, not a column/row computation,
// since it's simpler and the point is just "not the whole roster up front".
const COLLAPSED_COUNT = 6;

// DEMO — see demoData.js for why this is example data, not live. Read-only:
// every other section on the Fixtures & events page ended up with
// add/edit/delete for scorekeeper/admin, but that wasn't asked for here, so
// this stays a plain directory for now. Adding it later would follow the
// same edit/confirm-delete pattern as TournamentsPanel.
export default function CommitteePanel({ committee }) {
  const [expanded, setExpanded] = useState(false);
  if (!committee.length) {
    return (
      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Sports Committee</p><h2>Need help?</h2></div></div>
        <p className="muted-copy">Committee contacts will appear here once published.</p>
        <p className="cm-support"><Mail size={13} aria-hidden="true" />Facing an issue? Contact <a href="mailto:sports@iiml.ac.in">sports@iiml.ac.in</a></p>
      </section>
    );
  }
  const hasMore = committee.length > COLLAPSED_COUNT;
  const visible = expanded ? committee : committee.slice(0, COLLAPSED_COUNT);
  return (
    <section className="panel cm-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sports Committee</p>
          <h2>Need help?</h2>
          <p className="muted-copy">The team running athletics across the IIM Lucknow campus.</p>
          <p className="cm-support"><Mail size={13} aria-hidden="true" />Facing an issue? Contact <a href="mailto:sports@iiml.ac.in">sports@iiml.ac.in</a></p>
        </div>
      </div>
      <div className="cm-grid">
        {visible.map((member) => (
          <article className="cm-card" key={member.id}>
            <div className="cm-card-top">
              <span className="cm-avatar">{member.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
              <div className="cm-card-head">
                <strong>{member.name}</strong>
                <small>{member.title}</small>
              </div>
            </div>
            <div className="cm-tags">
              {member.tags.map((tag) => <span className="tag cm-tag" key={tag}>{tag}</span>)}
            </div>
            <a className="cm-contact" href={`mailto:${member.email}`}><Mail size={14} aria-hidden="true" />{member.email}</a>
            <a className="cm-contact" href={`tel:${member.phone.replace(/\s+/g, "")}`}><Phone size={14} aria-hidden="true" />{member.phone}</a>
          </article>
        ))}
      </div>
      {hasMore && (
        <button type="button" className="text-button cm-toggle" onClick={() => setExpanded((current) => !current)}>
          {expanded
            ? <>Show less<ChevronUp size={15} aria-hidden="true" /></>
            : <>Show all {committee.length} members<ChevronDown size={15} aria-hidden="true" /></>}
        </button>
      )}
    </section>
  );
}
