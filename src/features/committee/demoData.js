// DEMO DATA — GET /public/committee is the real endpoint (App.jsx used to
// fetch it), but it only ever returns {id, name, title} and is currently
// empty on the live backend — no tag, email, or phone to render the richer
// card the Sports Committee section now uses. This stands in for it; swap
// for the real fetch (and ask the backend to add those three fields) once
// there's data.
export const COMMITTEE_DEMO = [
  { id: "cm-1", name: "Aditya Raghavan", title: "Sports Secretary", tag: "General", email: "sports.sec@iiml.ac.in", phone: "+91 98200 11223" },
  { id: "cm-2", name: "Nikita Sharma", title: "Joint Secretary — Infrastructure", tag: "General", email: "infra.sports@iiml.ac.in", phone: "+91 98200 11224" },
  { id: "cm-3", name: "Rohan Deshmukh", title: "Captain — Cricket", tag: "Cricket", email: "cricket@iiml.ac.in", phone: "+91 98200 11225" },
  { id: "cm-4", name: "Meera Iyer", title: "Captain — Badminton", tag: "Badminton", email: "badminton@iiml.ac.in", phone: "+91 98200 11226" },
  { id: "cm-5", name: "Karan Malhotra", title: "Captain — Football", tag: "Football", email: "football@iiml.ac.in", phone: "+91 98200 11227" },
  { id: "cm-6", name: "Ananya Bose", title: "Coordinator — Events & Media", tag: "General", email: "sportsmedia@iiml.ac.in", phone: "+91 98200 11228" },
];
