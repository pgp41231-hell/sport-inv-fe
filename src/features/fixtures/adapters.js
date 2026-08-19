// Maps backend `matches` and `standings` content records (see spot-inv-be's
// /public/matches and /public/standings) onto the shapes FixturesPanel /
// PointsTableModal already render — the same shapes FIXTURES_DEMO /
// POINTS_TABLE_DEMO use, so real and demo data are indistinguishable to
// those components.

// Backend status has a fourth value (cancelled) the card strip has no
// design for; cancelled matches are dropped rather than shown as anything.
const STATUS_MAP = { scheduled: "upcoming", live: "live", completed: "completed" };

// homeScore/awayScore are a free-form JSON object on the backend (any shape
// a scorekeeper's client wants), because "21 * 18 * 11" for badminton and
// "142/6" for cricket don't share a structure. This frontend always writes
// (and reads) a single `text` key, e.g. { text: "21 * 18 * 11" } -- treat
// anything else found there (an older/other client's shape) as blank rather
// than guessing at its structure.
const scoreText = (score) => (score && typeof score === "object" && typeof score.text === "string") ? score.text : "";

export function matchToFixture(record, tournamentName) {
  const status = STATUS_MAP[record.status];
  if (!status) return null; // cancelled, or a status this frontend doesn't know
  const showScore = status === "live" || status === "completed";
  return {
    id: record.id,
    sport: record.sport,
    tournament: tournamentName || "",
    stage: record.stage || "",
    venue: record.venue || "",
    status,
    teams: showScore
      ? [{ name: record.homeTeam, score: scoreText(record.homeScore) }, { name: record.awayTeam, score: scoreText(record.awayScore) }]
      : [{ name: record.homeTeam }, { name: record.awayTeam }],
    note: record.notes || "",
  };
}

const FIXTURE_STATUS_TO_BACKEND = { upcoming: "scheduled", live: "live", completed: "completed" };

// The reverse direction, for create/update.
export function fixtureToMatch(fixture, tournamentId) {
  const showScore = fixture.status === "live" || fixture.status === "completed";
  return {
    tournamentId: tournamentId || null,
    sport: fixture.sport,
    stage: fixture.stage || null,
    venue: fixture.venue || null,
    status: FIXTURE_STATUS_TO_BACKEND[fixture.status] || "scheduled",
    homeTeam: fixture.teams[0]?.name || "",
    awayTeam: fixture.teams[1]?.name || "",
    homeScore: showScore ? { text: fixture.teams[0]?.score || "" } : {},
    awayScore: showScore ? { text: fixture.teams[1]?.score || "" } : {},
    notes: fixture.note || null,
    startsAt: fixture.startsAt || new Date().toISOString(),
  };
}

// --- Standings (points table) ------------------------------------------------
//
// The backend stores one row per (tournament, section, sport) -- "long"
// format, arbitrary sports. PointsTableModal wants one row per section with
// a `scores` object keyed by POINTS_SPORTS' fixed keys -- "wide" format.
// normalizeSport() is the bridge: it turns both a backend sport string
// ("table tennis") and a POINTS_SPORTS key ("tableTennis") into the same
// comparable form, so real data lines up with the fixed column set without
// requiring the backend to know PointsTableModal's key spelling.
const normalizeSport = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "");

// Returns { rows, index } -- `rows` is what PointsTableModal renders;
// `index` maps "section|sportKey" -> the backend standings row id, which
// updatePointsSection needs to know whether to PATCH an existing row or
// POST a new one when a cell that had no prior value gets one.
export function standingsToPointsRows(records, pointsSports) {
  const bySection = new Map();
  const index = new Map();
  for (const record of records) {
    const sportKey = pointsSports.find((sport) => normalizeSport(sport.key) === normalizeSport(record.sport))?.key;
    if (!sportKey) continue; // a sport this table doesn't have a column for
    if (!bySection.has(record.section)) bySection.set(record.section, { section: record.section, scores: {} });
    bySection.get(record.section).scores[sportKey] = record.points;
    index.set(`${record.section}|${sportKey}`, record.id);
  }
  return { rows: [...bySection.values()], index };
}
