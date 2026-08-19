// DEMO DATA — GET /public/committee is the real endpoint (App.jsx used to
// fetch it), but it only ever returns {id, name, title} and is currently
// empty on the live backend — no tags, email, or phone to render the richer
// card the Sports Committee section now uses. This stands in for it; swap
// for the real fetch (and ask the backend to add those fields) once there's
// data.
//
// `tags` is a list, not a single string — a member can be tagged with every
// sport they're involved in (e.g. ["Cricket", "Badminton"]), not just one.
// CommitteePanel renders one pill per tag. Real per-person sport tags aren't
// known yet — the ones below are placeholders, randomly assigned from
// FIXTURES_DEMO's sport list purely to preview multiple pills per card; swap
// in the real ones once you have them, e.g. tags: ["Cricket", "Table Tennis"].
export const COMMITTEE_DEMO = [
  { id: "cm-1", name: "Nirav Mithari", title: "Secretary", tags: ["Cricket", "Football"], email: "pgp41433@iiml.ac.in", phone: "+91 82753 60699" },
  { id: "cm-2", name: "Abhinav Choudhary", title: "Member", tags: ["Badminton"], email: "abm22001@iiml.ac.in", phone: "+91 70422 93772" },
  { id: "cm-3", name: "Aditya Tidke", title: "Member", tags: ["Basketball", "Volleyball"], email: "pgp41120@iiml.ac.in", phone: "+91 91197 47736" },
  { id: "cm-4", name: "Alisha Lakra", title: "Member", tags: ["Table Tennis"], email: "pgp40297@iiml.ac.in", phone: "+91 91234 93245" },
  { id: "cm-5", name: "Kevin Fernandes", title: "Member", tags: ["Football", "Cricket"], email: "pgp41133@iiml.ac.in", phone: "+91 97696 43745" },
  { id: "cm-6", name: "Manan Dhoke", title: "Member", tags: ["Volleyball"], email: "pgp41488@iiml.ac.in", phone: "+91 70665 01050" },
  { id: "cm-7", name: "Mebansan Makri", title: "Member", tags: ["Basketball"], email: "pgp41491@iiml.ac.in", phone: "+91 82579 56729" },
  { id: "cm-8", name: "P Vyshnav Shenoy", title: "Member", tags: ["Badminton", "Table Tennis"], email: "pgp41269@iiml.ac.in", phone: "+91 96339 10540" },
  { id: "cm-9", name: "Piyush Borse", title: "Member", tags: ["Cricket"], email: "pgp41471@iiml.ac.in", phone: "+91 91461 13529" },
  { id: "cm-10", name: "Ragul R", title: "Member", tags: ["Football", "Basketball"], email: "pgp41214@iiml.ac.in", phone: "+91 93611 42749" },
  { id: "cm-11", name: "Ritu Baskey", title: "Member", tags: ["Table Tennis", "Volleyball"], email: "pgp41216@iiml.ac.in", phone: "+91 89450 98731" },
  { id: "cm-12", name: "Sarthak Tomar", title: "Member", tags: ["Badminton", "Cricket"], email: "pgp41440@iiml.ac.in", phone: "+91 70891 56440" },
];
