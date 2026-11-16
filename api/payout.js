// who gets the pot: wallets holding at least TURF_MIN $TURF and at least GANG_MIN_USD of last week's winning coin, split by $TURF bag
const { cfg, rpc, send, q, B58 } = require("./_lib");
const { winner } = require("./_winner");
const { holders, split } = require("./_hold");
const RESERVE = 0.02, PER_TX = 18;
module.exports = async (req, res) => {
  const c = cfg(); if (!c.mint || !c.pot) return send(res, 200, { live: false }, 30);
  try {
    const win = await winner(); const wk = { sunday: win.sunday, winner: win.winner };
    const bal = await rpc("getBalance", [c.pot, { commitment: "confirmed" }]);
    const sol = ((bal && typeof bal.value === "number") ? bal.value : 0) / 1e9;
    if (!win.winner) return send(res, 200, { live: true, t: Date.now(), ...wk, pot: c.pot, balance: sol, reserve: RESERVE, perTx: PER_TX, count: 0, eligible: 0, list: [], note: "no winner found for that sunday" }, 0);
    const skip = [c.pot, ...c.exclude];
    const [turf, gang] = await Promise.all([holders(c.mint, skip), win.winner.mint === c.mint ? Promise.resolve(null) : holders(win.winner.mint, skip)]);
    const price = win.winner.price || 0, gmap = new Map((gang || turf).map(h => [h.w, h.amt]));
    const usdOf = w => (gmap.get(w) || 0) * price;
    const elig = turf.filter(h => h.amt >= c.min && usdOf(h.w) >= c.gangMin);
    let pot = Math.max(0, sol - RESERVE), list = split(elig, pot);
    pot = Math.max(0, pot - Math.ceil(list.length / PER_TX) * 0.00001); list = split(elig, pot);
    const out = { live: true, t: Date.now(), ...wk, pot: c.pot, balance: sol, reserve: RESERVE, payable: pot, perTx: PER_TX, min: c.min, gangMin: c.gangMin, eligible: elig.length, count: list.length, list };
    const w = q(req, "wallet");
    if (B58.test(w)) { const t = (turf.find(h => h.w === w) || {}).amt || 0, gu = usdOf(w), cut = list.find(x => x.w === w); out.me = { w, turf: t, gang: gmap.get(w) || 0, gangUsd: gu, eligible: t >= c.min && gu >= c.gangMin, lamports: cut ? cut.lamports : 0 }; }
    send(res, 200, out, B58.test(w) ? 20 : /fresh=/.test(req.url || "") ? 0 : 120);
  } catch (e) { send(res, 502, { live: true, error: "payout unavailable right now" }); }
};
