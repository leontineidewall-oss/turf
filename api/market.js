// $TURF price and market cap from DexScreener
const { cfg, pairs, send } = require("./_lib");
const n = v => (typeof v === "number" && isFinite(v) ? v : v != null && v !== "" && isFinite(+v) ? +v : null);
module.exports = async (req, res) => {
  const { mint } = cfg();
  if (!mint) return send(res, 200, { live: false }, 60);
  try {
    const ps = await pairs(mint);
    if (!ps.length) return send(res, 200, { live: true, t: Date.now(), pair: null }, 20);
    const p = ps[0];
    send(res, 200, { live: true, t: Date.now(), pair: {
      addr: p.pairAddress, dex: p.dexId || null, url: typeof p.url === "string" && /^https:\/\/dexscreener\.com\//.test(p.url) ? p.url : null,
      price: n(p.priceUsd), mcap: n(p.marketCap != null ? p.marketCap : p.fdv), vol: n((p.volume || {}).h24), liq: n((p.liquidity || {}).usd), chg: n((p.priceChange || {}).h24),
    } }, 20);
  } catch (e) { send(res, 502, { live: true, error: "market unavailable" }); }
};
