// last week's winner: the gang with the most volume on the last closed sunday (UTC), from daily candles
const { gt, pool } = require("./_lib");
const { lists, lastSunday, label } = require("./_board");
const memo = new Map();
async function winner(now = Date.now()) {
  const sun = lastSunday(now), hit = memo.get(sun);
  if (hit && Date.now() - hit.at < 1800000) return hit.v;
  const cands = (await lists()).slice(0, 10); let errs = 0;
  const rows = label((await pool(cands, 2, async g => {
    try {
      const j = await gt("/networks/solana/pools/" + g.pool + "/ohlcv/day?limit=10&currency=usd");
      const c = (((j.data || {}).attributes || {}).ohlcv_list || []).find(x => Number(x[0]) === sun);
      return c ? { mint: g.mint, sym: g.sym, name: g.name, pool: g.pool, dex: g.dex, price: g.price, vol: Number(c[5]) || 0 } : null;
    } catch (e) { errs++; return null; }
  })).filter(Boolean)).sort((a, b) => b.vol - a.vol);
  // never crown a winner from partial data: if any pool failed to load, say so and try again later
  if (errs) throw new Error("candles unavailable");
  const v = { sunday: new Date(sun * 1000).toISOString().slice(0, 10), ts: sun, checked: cands.length, found: rows.length, winner: rows[0] && rows[0].vol > 0 ? rows[0] : null, top: rows.slice(0, 5) };
  if (rows.length) memo.set(sun, { at: Date.now(), v });
  return v;
}
module.exports = { winner, reset: () => memo.clear() };
