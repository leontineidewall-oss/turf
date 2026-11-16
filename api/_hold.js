// every wallet holding a coin, read straight from the chain (wallets only: pools and program accounts are off the curve)
const { rpc, pairs } = require("./_lib");
const { b58enc, onCurve } = require("./_sol");
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", T22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const memo = new Map();
async function holders(mint, skipList = []) {
  const hit = memo.get(mint); if (hit && Date.now() - hit.at < 60000) return hit.v;
  const info = await rpc("getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }]);
  const v = info && info.value; if (!v) throw new Error("mint not found");
  const prog = v.owner, dec = Number((((v.data || {}).parsed || {}).info || {}).decimals);
  if (prog !== TOKEN && prog !== T22) throw new Error("not a token mint");
  if (!(dec >= 0 && dec <= 12)) throw new Error("no decimals");
  const filters = [{ memcmp: { offset: 0, bytes: mint } }]; if (prog === TOKEN) filters.unshift({ dataSize: 165 });
  const [accs, ps] = await Promise.all([
    rpc("getProgramAccounts", [prog, { encoding: "base64", commitment: "confirmed", filters, dataSlice: { offset: 32, length: 40 } }], 40000),
    pairs(mint).catch(() => []),
  ]);
  const skip = new Set([...skipList, ...ps.map(p => p.pairAddress)]), by = new Map();
  for (const a of accs || []) {
    const raw = Buffer.from(((a.account || {}).data || [])[0] || "", "base64"); if (raw.length < 40) continue;
    const amt = Number(raw.readBigUInt64LE(32)) / 10 ** dec; if (!(amt > 0)) continue;
    const ob = raw.subarray(0, 32), owner = b58enc(ob);
    if (skip.has(owner) || !onCurve(ob)) continue;
    by.set(owner, (by.get(owner) || 0) + amt);
  }
  const out = [...by.entries()].map(([w, amt]) => ({ w, amt })).sort((a, b) => b.amt - a.amt);
  memo.set(mint, { at: Date.now(), v: out }); if (memo.size > 6) memo.delete(memo.keys().next().value);
  return out;
}
// split a pot (SOL) by weight. drops dust and keeps the top `max` wallets
function split(members, pot, max = 180, dust = 0.001) {
  let list = members.slice(0, max);
  for (let k = 0; k < 50 && list.length; k++) {
    const tot = list.reduce((s, m) => s + m.amt, 0);
    const next = list.filter(m => pot * m.amt / tot >= dust);
    if (next.length === list.length) break;
    list = next;
  }
  const tot = list.reduce((s, m) => s + m.amt, 0);
  return list.map(m => ({ w: m.w, amt: m.amt, lamports: tot > 0 ? Math.floor(pot * 1e9 * m.amt / tot) : 0 })).filter(x => x.lamports > 0);
}
module.exports = { holders, split, TOKEN, T22, reset: () => memo.clear() };
