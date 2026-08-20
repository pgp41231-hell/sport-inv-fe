// Maps backend `tournaments` and `gallery` content records (see spot-inv-be's
// /public/tournaments and /public/gallery) onto the shapes TournamentsPanel /
// TournamentGallery / TournamentDetail already render — the same shapes
// PAST_TOURNAMENTS_DEMO / UPCOMING_TOURNAMENTS_DEMO use, so a real tournament
// and a demo one are indistinguishable to those components.
//
// `sports` (which sports a tournament covered) has no backend column — it
// only ever fed the gradient "Moments" placeholder, which was removed once
// real photos existed (see TournamentDetail.jsx). Real tournaments come
// through with `sports: []`; the field stays in the shape only because the
// edit form still has a "Sports" input.

// A tournament is "past" once the backend marks it completed; anything else
// (draft, published, or currently live) reads as "upcoming" — there's no
// third box in the UI for "happening right now", so live tournaments show
// there until they're marked completed.
export function splitTournaments(records) {
  const upcoming = [];
  const past = [];
  for (const record of records) {
    (record.status === "completed" ? past : upcoming).push(tournamentFromContent(record));
  }
  return { upcoming, past };
}

// Upcoming tournaments (TournamentsPanel's own list) read the one-line
// subtitle as `note`; past ones (TournamentGallery/TournamentDetail) read
// the same idea as `blurb`. Both are the same backend column (`blurb`) —
// this just hands back both keys so whichever box a tournament lands in,
// its rendering code finds the field name it actually reads.
export function tournamentFromContent(record) {
  return {
    id: record.id,
    name: record.name,
    blurb: record.blurb || record.description || "",
    note: record.blurb || record.description || "",
    date: record.startsOn || record.endsOn || record.createdAt,
    venue: record.venue || "",
    description: record.description || "",
    sports: [],
    status: record.status,
  };
}

// The reverse direction, for create/update — only sends fields the backend
// actually has a column for. `status` is deliberately a separate argument,
// not part of `draft`: it's only ever set on create (AddUpcomingModal always
// means "published", AddPastModal always means "completed" — the two forms
// are how a tournament ends up in one box or the other), never touched by
// an edit, so an edit can never accidentally move a tournament to the other
// box as a side effect of changing its blurb.
export function tournamentToContent(draft, status) {
  return {
    name: draft.name,
    blurb: draft.blurb || draft.note || null,
    description: draft.description || null,
    venue: draft.venue || null,
    // The backend's startsOn column is a plain date (YYYY-MM-DD) and its
    // schema validates it as one, but a value read back from a GET (see
    // tournamentFromContent above) comes across as a full ISO timestamp
    // ("2026-11-08T00:00:00.000Z") — round-tripping that straight back on
    // an edit fails validation. Truncating to the date portion here handles
    // both that case and a fresh "YYYY-MM-DD" from AddUpcomingModal/
    // AddPastModal's <input type="date">, which is already just 10
    // characters and passes through unchanged.
    startsOn: draft.date ? String(draft.date).slice(0, 10) : null,
    ...(status ? { status } : {}),
  };
}

export function photoFromGalleryItem(record) {
  return { id: record.id, url: record.mediaUrl };
}
