import badmintonPhoto from "./assets/catalog/badminton.jpg";
import basketballPhoto from "./assets/catalog/basketball.jpg";
import chessPhoto from "./assets/catalog/chess.jpg";
import cricketPhoto from "./assets/catalog/cricket.jpg";
import footballFieldPhoto from "./assets/catalog/football-field.jpg";
import goalNetPhoto from "./assets/catalog/goal-net.jpg";
import tableTennisPhoto from "./assets/catalog/table-tennis.jpg";
import tennisPhoto from "./assets/catalog/tennis.jpg";
import volleyballCourtPhoto from "./assets/catalog/volleyball-court.jpg";
import { publicPhotoUrl } from "./media.js";

const includesAny = (value, terms) => terms.some((term) => value.includes(term));

export function catalogPhotoUrl(item, type = "equipment") {
  const uploadedPhoto = publicPhotoUrl(item?.photoPath);
  if (uploadedPhoto) return uploadedPhoto;

  const descriptor = `${item?.name || ""} ${item?.sportName || ""}`.toLowerCase();

  if (type === "venue") {
    if (descriptor.includes("volleyball")) return volleyballCourtPhoto;
    if (includesAny(descriptor, ["football", "soccer", "field", "ground"])) return footballFieldPhoto;
    return null;
  }

  if (includesAny(descriptor, ["badminton", "shuttlecock", "shuttle"])) return badmintonPhoto;
  if (includesAny(descriptor, ["table tennis", "ping pong"])) return tableTennisPhoto;
  if (descriptor.includes("basketball")) return basketballPhoto;
  if (descriptor.includes("volleyball")) return volleyballCourtPhoto;
  if (descriptor.includes("tennis")) return tennisPhoto;
  if (descriptor.includes("chess")) return chessPhoto;
  if (includesAny(descriptor, ["cricket", "batting", "wicket keeping", "wicket-keeping"])) return cricketPhoto;
  if (includesAny(descriptor, ["goal net", "football net"])) return goalNetPhoto;
  if (includesAny(descriptor, ["football", "soccer", "training cone", "training bib"])) return footballFieldPhoto;
  return null;
}
