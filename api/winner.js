const { send } = require("./_lib");
const { winner } = require("./_winner");
module.exports = async (req, res) => {
  try { send(res, 200, await winner(), 900); } catch (e) { send(res, 502, { error: "winner unavailable right now" }); }
};
