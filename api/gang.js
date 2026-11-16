// look up any coin: its busiest pool and 24h volume (GeckoTerminal)
const { gt, pairs, send, q, B58 } = require("./_lib");
const { DEXES } = require("./_board");
const n = v => { const x = Number(v); return isFinite(x) ? x : null; };
module.exports = async (req, res) => {
  const mint = q(req, "mint"); if (!B58.test(mint)) return send(res, 400, { error: "that is not a solana address" });
  try {
    const j = await gt("/networks/solana/tokens/" + mint + "/pools?page=1&sort=h24_volume_usd_desc&include=base_token");
    const ps = (j.data || []).filter(p => ((((p.relationships || {}).base_token || {}).data || {}).id || "") === "solana_" + mint);
    if (!ps.length) return send(res, 200, { mint, found: false }, 60);
    ps.sort((a, b) => (n((b.attributes.volume_usd || {}).h24) || 0) - (n((a.attributes.volume_usd || {}).h24) || 0));
    const p = ps[0], a = p.attributes, t = ((j.included || []).find(x => x.id === "solana_" + mint) || {}).attributes || {}, dex = (((p.relationships || {}).dex || {}).data || {}).id || "";
    send(res, 200, { mint, found: true, sym: String(t.symbol || a.name.split(" / ")[0]).slice(0, 16), name: String(t.name || "").slice(0, 40), pool: a.address, dex, pump: DEXES.includes(dex),
      v24: n((a.volume_usd || {}).h24) || 0, v1: n((a.volume_usd || {}).h1) || 0, price: n(a.base_token_price_usd), fdv: n(a.fdv_usd), src: "geckoterminal" }, 60);
  } catch (e) {
    // fallback: DexScreener
    try {
      const ps = await pairs(mint); if (!ps.length) return send(res, 200, { mint, found: false }, 60);
      ps.sort((a, b) => ((b.volume || {}).h24 || 0) - ((a.volume || {}).h24 || 0)); const p = ps[0], dex = p.dexId === "pumpfun" ? "pump-fun" : p.dexId || "";
      send(res, 200, { mint, found: true, sym: String((p.baseToken || {}).symbol || "?").slice(0, 16), name: String((p.baseToken || {}).name || "").slice(0, 40), pool: p.pairAddress, dex, pump: DEXES.includes(dex),
        v24: n((p.volume || {}).h24) || 0, v1: n((p.volume || {}).h1) || 0, price: n(p.priceUsd), fdv: n(p.fdv), src: "dexscreener" }, 60);
    } catch (e2) { send(res, 502, { error: "lookup unavailable right now" }); }
  }
};
