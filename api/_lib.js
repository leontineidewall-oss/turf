const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const env = k => (process.env[k] || "").trim();
const num = (v, d, lo, hi) => { const n = Number(v); return isFinite(n) && n >= lo && n <= hi ? n : d; };
const cfg = () => {
  const mint = env("TURF_MINT"), pot = env("POT_WALLET");
  return {
    mint: B58.test(mint) ? mint : null,
    pot: B58.test(pot) ? pot : null,
    min: num(env("TURF_MIN") || 100000, 100000, 1, 1e12),
    gangMin: num(env("GANG_MIN_USD") || 10, 10, 0, 1e9),
    exclude: env("EXCLUDE").split(/[\s,]+/).filter(x => B58.test(x)),
  };
};
const rpcUrl = () => env("RPC_URL") || "https://api.mainnet-beta.solana.com";
async function get(url, opt = {}, ms = 9000) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", ...opt, signal: ac.signal, headers: { "user-agent": "turf-site/1.0", accept: "application/json", ...(opt.headers || {}) } });
    if (!r.ok) { const e = new Error("upstream " + r.status); e.status = r.status; throw e; }
    return await r.json();
  } finally { clearTimeout(t); }
}
async function rpc(method, params, ms = 12000) {
  for (let i = 0; i < 3; i++) {
    try {
      const j = await get(rpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }, ms);
      if (j.error) throw new Error("rpc " + (j.error.code || ""));
      return j.result;
    } catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 250 * (i + 1))); }
  }
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const GT = () => env("GT_BASE") || "https://api.geckoterminal.com/api/v2";
async function gt(path, ms = 9000) {
  for (let i = 0; i < 2; i++) {
    try { return await get(GT() + path, {}, ms); }
    catch (e) { if (i === 1 || (e.status && e.status !== 429 && e.status < 500)) throw e; await new Promise(r => setTimeout(r, 900)); }
  }
}
// DexScreener pairs for a mint, biggest first
async function pairs(mint) {
  const j = await get((env("DEX_BASE") || "https://api.dexscreener.com") + "/token-pairs/v1/solana/" + mint);
  const ps = (Array.isArray(j) ? j : []).filter(p => p && p.baseToken && p.baseToken.address === mint && B58.test(p.pairAddress || ""));
  ps.sort((a, b) => ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0) || ((b.volume || {}).h24 || 0) - ((a.volume || {}).h24 || 0));
  return ps;
}
function send(res, code, body, age = 15) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", code === 200 && age > 0 ? "public, s-maxage=" + age + ", stale-while-revalidate=" + age * 3 : "no-store");
  res.end(JSON.stringify(body));
}
const q = (req, k) => { try { return new URL(req.url, "http://x").searchParams.get(k) || ""; } catch (e) { return ""; } };
module.exports = { B58, env, cfg, rpc, get, gt, pool, pairs, send, q };
