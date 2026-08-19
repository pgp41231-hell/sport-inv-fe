import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, ChevronDown, ChevronRight, LoaderCircle, PackageOpen, Printer, QrCode, Search, Users, Wrench, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../api.js";
import { publicPhotoUrl } from "../../media.js";
import "./inventory-overview.css";

const states = [
  ["IN_INVENTORY", "In inventory", "inInventoryQuantity"], ["CASUAL_POOL", "Casual pool", "casualPoolQuantity"],
  ["HELD_BY_TEAM", "With teams", "withTeamsQuantity"], ["ISSUED_TO_STUDENT", "With students", "withStudentsQuantity"],
  ["DAMAGED", "Damaged", "damagedQuantity"], ["MISSING", "Missing", "missingQuantity"],
];
const storeStates = ["IN_INVENTORY", "CASUAL_POOL"];
const labelFor = (state) => states.find(([value]) => value === state)?.[1] || state;
const valueFor = (item, state) => Number(item[states.find(([value]) => value === state)?.[2]] || 0);
function InventoryPhoto({ item }) {
  const [showLabels, setShowLabels] = useState(false);
  const thumbnail = publicPhotoUrl(item.photoPath)
    ? <img className="inventory-thumb" src={publicPhotoUrl(item.photoPath)} alt="" />
    : <span className="inventory-thumb placeholder"><Boxes /></span>;
  if (item.tracking !== "ASSET") return thumbnail;
  return <><button type="button" className="asset-label-trigger" title="View printable asset labels" onClick={() => setShowLabels(true)}>{thumbnail}<QrCode size={15} /></button>{showLabels && <div className="modal-backdrop asset-label-backdrop" onClick={(event) => event.stopPropagation()}><section className="panel asset-label-sheet"><button className="modal-close no-print" onClick={() => setShowLabels(false)}><X /></button><div className="asset-label-heading"><span><p className="eyebrow">Physical asset labels</p><h3>{item.name}</h3></span><button className="button button-primary no-print" onClick={() => window.print()}><Printer size={16} />Print labels</button></div><div className="asset-label-grid">{(item.assets || []).map((asset) => <article key={asset.id}><QRCodeSVG value={`asset:${asset.assetTag}`} size={126} level="M" /><strong>{asset.assetTag}</strong><small>{item.name}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</small></article>)}</div></section></div>}</>;
}

const photo = (item) => <InventoryPhoto item={item} />;

function SplitBar({ item }) {
  const total = Math.max(1, Number(item.totalOwned));
  return <div className="split-bar" aria-label="Inventory state split">{states.map(([state,,field]) => Number(item[field]) > 0 && <span key={state} className={`split-${state.toLowerCase()}`} style={{ width: `${Number(item[field]) / total * 100}%` }} title={`${labelFor(state)}: ${item[field]}`} />)}</div>;
}

export default function InventoryOverview({ user, notify }) {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState({ summary: {}, sports: [], items: [] });
  const [filters, setFilters] = useState({ sportId: "", tracking: "", state: "", q: "" });
  const [expanded, setExpanded] = useState(new Set());
  const [showEmpty, setShowEmpty] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const [drilldown, setDrilldown] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamSearch, setTeamSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [api.equipmentInventoryOverview(user, filters)];
      if (user.role === "admin") requests.push(api.equipmentTeams(user), api.adminUsers(user));
      const [result, teamResult, userResult] = await Promise.all(requests);
      setInventory(result.data || { summary: {}, sports: [], items: [] });
      setTeams(teamResult?.data || []); setUsers((userResult?.data || []).filter((item) => item.role !== "inventory_kiosk"));
    } catch (error) { notify(error.message, "error"); } finally { setLoading(false); }
  }, [user, filters, notify]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => (inventory.sports || []).map((sport) => ({ sport, items: (inventory.items || []).filter((item) => item.sportId === sport.id) })).filter((group) => showEmpty || group.items.length).sort((a,b) => a.sport.name.localeCompare(b.sport.name)), [inventory, showEmpty]);
  const toggle = (id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const openTransfer = (item) => {
    const fromState = states.find(([state]) => valueFor(item,state) > 0)?.[0] || "IN_INVENTORY";
    setTransfer({ item, fromState, toState: fromState === "IN_INVENTORY" ? "CASUAL_POOL" : "IN_INVENTORY", quantity: 1, assetIds: [], teamId: "", studentId: "", reason: "" });
  };
  const submitTransfer = async (event) => {
    event.preventDefault();
    const manual = !storeStates.includes(transfer.fromState) || !storeStates.includes(transfer.toState);
    try {
      await api.transferEquipmentState(user, transfer.item.id, { fromState: transfer.fromState, toState: transfer.toState, quantity: Number(transfer.quantity), assetIds: transfer.assetIds, teamId: transfer.teamId || null, studentId: transfer.studentId || null, reason: manual ? transfer.reason : (transfer.reason || null) });
      notify(manual ? "Manual custody correction recorded" : "Allocation updated"); setTransfer(null); await load();
    } catch (error) { notify(error.message, "error"); }
  };
  const summary = inventory.summary || {};
  const summaryCards = [["Total owned",summary.totalOwned,Boxes],["In inventory",summary.inInventory,PackageOpen],["Casual pool",summary.casualPool,Boxes],["With teams",summary.withTeams,Users],["With students",summary.withStudents,Users],["Damaged / missing",summary.damagedOrMissing,Wrench]];
  return <section className="inventory-overview"><div className="section-heading"><div><p className="eyebrow">Live allocation and custody</p><h2>Inventory by sport</h2><p className="muted-copy">The split below is the source of truth for where every unit is now.</p></div></div><div className="inventory-summary">{summaryCards.map(([label,value,Icon]) => <article className="panel" key={label}><Icon /><span><strong>{Number(value || 0)}</strong><small>{label}</small></span></article>)}</div><div className="inventory-filters panel"><label className="search-box"><Search /><input aria-label="Search equipment" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search equipment" /></label><label className="field">Sport<select value={filters.sportId} onChange={(event) => setFilters((current) => ({ ...current, sportId: event.target.value }))}><option value="">All sports</option>{inventory.sports?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Tracking<select value={filters.tracking} onChange={(event) => setFilters((current) => ({ ...current, tracking: event.target.value }))}><option value="">All tracking</option><option value="BULK">Bulk quantity</option><option value="ASSET">Individually tracked</option></select></label><label className="field">State<select value={filters.state} onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}><option value="">All states</option>{states.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="empty-sport-toggle"><input type="checkbox" checked={showEmpty} onChange={(event) => setShowEmpty(event.target.checked)} />Show empty sports</label></div>{loading ? <div className="center-loader"><LoaderCircle className="spin" /></div> : <div className="sport-inventory-groups">{groups.map(({ sport,items }) => { const open = expanded.has(sport.id); const totals = states.map(([state]) => items.reduce((sum,item) => sum + valueFor(item,state),0)); return <section className="panel sport-inventory" key={sport.id}><button className="sport-inventory-header" onClick={() => toggle(sport.id)}>{open ? <ChevronDown /> : <ChevronRight />}<strong>{sport.name}</strong><span className="sport-state-totals">{totals.map((value,index) => <small key={states[index][0]} title={states[index][1]}>{states[index][1]} <b>{value}</b></small>)}</span></button>{open && <div className="sport-equipment-table"><div className="equipment-state-head"><span>Equipment</span>{states.map(([,label]) => <span key={label}>{label}</span>)}<span>Action</span></div>{items.length ? items.map((item) => <article className="equipment-state-row" key={item.id}><div className="equipment-identity">{photo(item)}<span><strong>{item.name}</strong><small>{item.tracking === "ASSET" ? "Individually tracked" : "Bulk quantity"}</small><SplitBar item={item} /></span></div>{states.map(([state,,field]) => <button key={state} className={(state === "HELD_BY_TEAM" || state === "ISSUED_TO_STUDENT") && Number(item[field]) ? "state-number drillable" : "state-number"} disabled={!((state === "HELD_BY_TEAM" || state === "ISSUED_TO_STUDENT") && Number(item[field]))} onClick={() => setDrilldown({ item, state })}>{Number(item[field] || 0)}</button>)}<span>{user.role === "admin" && <button className="button button-secondary" onClick={() => openTransfer(item)}>Transfer</button>}</span></article>) : <p className="muted-copy empty-sport">No equipment for this sport.</p>}</div>}</section>; })}</div>}{transfer && <TransferPanel transfer={transfer} setTransfer={setTransfer} teams={teams} users={users} teamSearch={teamSearch} setTeamSearch={setTeamSearch} onSubmit={submitTransfer} />}{drilldown && <div className="modal-backdrop"><section className="panel transfer-panel"><button className="modal-close" onClick={() => setDrilldown(null)}><X /></button><p className="eyebrow">Custody drill-down</p><h3>{drilldown.item.name} · {labelFor(drilldown.state)}</h3><div className="holder-list">{(drilldown.item.holders || []).filter((holder) => holder.state === drilldown.state).map((holder) => <article key={holder.custodyId}><strong>{holder.teamName || holder.studentName || holder.studentEmail}</strong><span>{holder.quantity} unit{holder.quantity === 1 ? "" : "s"}</span><small>Since {new Date(holder.since).toLocaleString("en-IN")} · Request {holder.requestId || "manual override"}</small></article>)}</div></section></div>}</section>;
}

function TransferPanel({ transfer, setTransfer, teams, users, teamSearch, setTeamSearch, onSubmit }) {
  const manual = !storeStates.includes(transfer.fromState) || !storeStates.includes(transfer.toState);
  return <div className="modal-backdrop"><form className="panel transfer-panel" onSubmit={onSubmit}><button type="button" className="modal-close" onClick={() => setTransfer(null)}><X /></button><p className="eyebrow">{transfer.item.name}</p><h3>Transfer equipment</h3><div className="form-grid"><label className="field">From<select value={transfer.fromState} onChange={(event) => setTransfer((current) => ({ ...current, fromState: event.target.value, assetIds: [] }))}>{states.filter(([state]) => valueFor(transfer.item,state) > 0).map(([value,label]) => <option key={value} value={value}>{label} ({valueFor(transfer.item,value)})</option>)}</select></label><label className="field">Destination<select value={transfer.toState} onChange={(event) => setTransfer((current) => ({ ...current, toState: event.target.value }))}>{states.filter(([value]) => value !== transfer.fromState).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>{transfer.item.tracking === "BULK" ? <label className="field">Quantity<input type="number" min="1" max={valueFor(transfer.item,transfer.fromState)} value={transfer.quantity} onChange={(event) => setTransfer((current) => ({ ...current, quantity: event.target.value }))} /></label> : <fieldset className="asset-picker field-full"><legend>Tracked units</legend>{transfer.item.assets.filter((asset) => asset.state === transfer.fromState).map((asset) => <label key={asset.id}><input type="checkbox" checked={transfer.assetIds.includes(asset.id)} onChange={(event) => setTransfer((current) => ({ ...current, assetIds: event.target.checked ? [...current.assetIds,asset.id] : current.assetIds.filter((id) => id !== asset.id), quantity: event.target.checked ? current.assetIds.length + 1 : current.assetIds.length - 1 }))} />{asset.assetTag} · {asset.condition}</label>)}</fieldset>}{transfer.toState === "HELD_BY_TEAM" && <label className="field field-full">Team<input value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Search teams, including cross-sport" /><select required value={transfer.teamId} onChange={(event) => setTransfer((current) => ({ ...current, teamId: event.target.value }))}><option value="">Choose team</option><optgroup label="This sport">{teams.filter((team) => team.sportId === transfer.item.sportId && team.name.toLowerCase().includes(teamSearch.toLowerCase())).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</optgroup><optgroup label="Other sports">{teams.filter((team) => team.sportId !== transfer.item.sportId && team.name.toLowerCase().includes(teamSearch.toLowerCase())).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</optgroup></select></label>}{transfer.toState === "ISSUED_TO_STUDENT" && <label className="field field-full">Student<select required value={transfer.studentId} onChange={(event) => setTransfer((current) => ({ ...current, studentId: event.target.value }))}><option value="">Choose student</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name || person.email} · {person.email}</option>)}</select></label>}<label className="field field-full">Reason {manual ? "(required manual override)" : "(optional)"}<textarea required={manual} value={transfer.reason} onChange={(event) => setTransfer((current) => ({ ...current, reason: event.target.value }))} /></label></div><div className="transfer-preview"><strong>Resulting split</strong>{states.map(([state,label]) => { const delta = state === transfer.fromState ? -Number(transfer.quantity) : state === transfer.toState ? Number(transfer.quantity) : 0; return <span key={state}>{label}: <b>{valueFor(transfer.item,state) + delta}</b></span>; })}</div><button className="button button-primary" disabled={!Number(transfer.quantity)}>Confirm transfer</button></form></div>;
}
