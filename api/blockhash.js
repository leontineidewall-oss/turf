const { rpc, send } = require("./_lib");
module.exports = async (req, res) => {
  try { const r = await rpc("getLatestBlockhash", [{ commitment: "confirmed" }]); send(res, 200, { blockhash: r.value.blockhash, height: r.value.lastValidBlockHeight }, 0); }
  catch (e) { send(res, 502, { error: "solana unavailable" }); }
};
