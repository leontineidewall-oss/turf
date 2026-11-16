// the gangs: the busiest pump.fun coins (pump.fun curve + PumpSwap pools) by 24h volume, from GeckoTerminal
const { gt, pool, cfg } = require("./_lib");
const DEXES = ["pumpswap", "pump-fun"], BLOCKS = 144, GANGS = 12;
const n = v => { const x = Number(v); return isFinite(x) ? x : null; };
let memo = null;
async function lists() {
  if (memo && Date.now() - memo.at < 45000) return memo.v;
  const pages = await Promise.all(DEXES.map(d => gt("/networks/solana/dexes/" + d + "/pools?sort=h24_volume_usd_desc&page=1&include=base_token").catch(e => ({ error: e }))));
  if (pages.every(p => p.error)) { if (memo) return memo.v; throw new Error("geckoterminal unavailable"); }
  const by = new Map(), skip = new Set(cfg().exclude);
  pages.forEach((pg, k) => {
    if (pg.error) return;
    const inc = new Map((pg.included || []).map(t => [t.id, t.attributes || {}]));
    for (const p of pg.data || []) {
      const a = p.attributes || {}, R = p.relationships || {}, bid = ((R.base_token || {}).data || {}).id || "", mint = bid.replace(/^solana_/, "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) || skip.has(mint)) continue;
      const t = inc.get(bid) || {}, v = a.volume_usd || {}, tx = (a.transactions || {}).h1 || {}, pc = a.price_change_percentage || {};
      const g = { mint, pool: a.address, dex: DEXES[k], sym: String(t.symbol || (a.name || "?").split(" / ")[0]).slice(0, 16), name: String(t.name || "").slice(0, 40),
        v24: n(v.h24) || 0, v1: n(v.h1) || 0, b1: n(tx.buys) || 0, s1: n(tx.sells) || 0, price: n(a.base_token_price_usd), fdv: n(a.fdv_usd), chg24: n(pc.h24), chg1: n(pc.h1) };
      if (!(g.v24 > 0)) continue;
      const old = by.get(mint); if (!old || old.v24 < g.v24) by.set(mint, g);
    }
  });
  const v = [...by.values()].sort((a, b) => b.v24 - a.v24);
  memo = { at: Date.now(), v }; return v;
}
// split the blocks: every gang on the map keeps at least one, the rest by share of 24h volume (largest remainder)
function blocks(gangs, total = BLOCKS) {
  const sum = gangs.reduce((s, g) => s + g.v24, 0), free = total - gangs.length;
  if (!(sum > 0) || free < 0) return gangs.map(() => 0);
  const raw = gangs.map(g => free * g.v24 / sum), out = raw.map(Math.floor);
  let left = free - out.reduce((s, x) => s + x, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out.map(x => x + 1);
}
// the week closes sunday 23:59:59 UTC
function closes(now = Date.now()) { const d = new Date(now), day = d.getUTCDay(), base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); return base + ((7 - day) % 7) * 86400000 + 86400000 - 1000; }
// the last sunday that has fully closed (UTC midnight, seconds)
function lastSunday(now = Date.now()) { const d = new Date(now), day = d.getUTCDay(), base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); return (base - (day === 0 ? 7 : day) * 86400000) / 1000; }
// copycat coins share tickers: add the mint's last 4 when a ticker repeats
function label(list) { const c = {}; list.forEach(g => { const s = String(g.sym).toUpperCase(); c[s] = (c[s] || 0) + 1; }); return list.map(g => c[String(g.sym).toUpperCase()] > 1 ? { ...g, sym: g.sym + "·" + g.mint.slice(-4) } : g); }
module.exports = { label, lists, blocks, closes, lastSunday, BLOCKS, GANGS, DEXES, reset: () => { memo = null; } };
