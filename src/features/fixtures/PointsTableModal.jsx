import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { POINTS_SPORTS } from "./demoData.js";

const sumScores = (scores) => POINTS_SPORTS.reduce((total, sport) => total + (Number(scores[sport.key]) || 0), 0);

// DEMO — see POINTS_TABLE_DEMO / POINTS_SPORTS in demoData.js. Editing
// (scorekeeper/admin only, same gate as fixtures/schedule) is local React
// state via onUpdateSection, passed in from App; there is no backend to
// persist to yet. The section list and sport columns are fixed — this edits
// scores in existing cells, not the table's shape. Total is always derived
// by summing a row's scores; it's never stored or editable directly, so it
// can never drift out of sync with the numbers that make it up.
export default function PointsTableModal({ points, canEdit, onUpdateSection, onClose }) {
  const [editingSection, setEditingSection] = useState(null);
  const [draft, setDraft] = useState(null);

  const startEdit = (row) => {
    setEditingSection(row.section);
    setDraft({ ...row.scores });
  };
  const cancelEdit = () => { setEditingSection(null); setDraft(null); };
  const saveEdit = (section) => { onUpdateSection(section, draft); setEditingSection(null); setDraft(null); };
  const updateDraftScore = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  // Ranked by each row's *saved* total, not whatever's mid-edit in draft —
  // otherwise a row being edited would jump position on every keystroke.
  const ranked = [...points]
    .map((row) => ({ ...row, total: sumScores(row.scores) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel fx-points-panel" role="dialog" aria-modal="true" aria-label="Sangram points table">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close points table"><X size={20} /></button>
        <p className="eyebrow">Sangram · example data</p>
        <h2>Points table</h2>
        <p className="modal-copy">Section standings across every sport. Total is the sum of the row.</p>
        <div className="fx-points-wrap">
          <table className="fx-points-table">
            <thead>
              <tr>
                <th className="fx-points-rank-head">#</th>
                <th className="fx-points-section-head">Section</th>
                {POINTS_SPORTS.map((sport) => <th key={sport.key}>{sport.label}</th>)}
                <th>Total</th>
                {canEdit && <th className="fx-points-actions-head"><span className="fx-sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => {
                const isEditing = editingSection === row.section;
                return (
                  <tr key={row.section} className={isEditing ? "fx-points-row-editing" : ""}>
                    <td className="fx-points-rank">{index + 1}</td>
                    <td className="fx-points-section">{row.section}</td>
                    {POINTS_SPORTS.map((sport) => (
                      <td key={sport.key}>
                        {isEditing
                          ? <input
                              className="fx-points-input"
                              type="number"
                              min="0"
                              value={draft[sport.key]}
                              onChange={(event) => updateDraftScore(sport.key, event.target.value)}
                              aria-label={`${row.section} · ${sport.label} score`}
                            />
                          : row.scores[sport.key]}
                      </td>
                    ))}
                    <td className="fx-points-total">
                      {isEditing ? sumScores(draft) : row.total}
                    </td>
                    {canEdit && (
                      <td className="fx-points-actions">
                        {isEditing ? (
                          <>
                            <button type="button" className="icon-button fx-schedule-btn" onClick={cancelEdit} aria-label={`Cancel editing ${row.section}`}><X size={13} aria-hidden="true" /></button>
                            <button type="button" className="icon-button fx-schedule-btn" onClick={() => saveEdit(row.section)} aria-label={`Save ${row.section}`}><Check size={13} aria-hidden="true" /></button>
                          </>
                        ) : (
                          <button type="button" className="icon-button fx-schedule-btn" onClick={() => startEdit(row)} aria-label={`Edit ${row.section}`}><Pencil size={13} aria-hidden="true" /></button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
