const { cfg, send } = require("./_lib");
module.exports = (req, res) => { const c = cfg(); send(res, 200, { mint: c.mint, pot: c.pot, min: c.min, gangMin: c.gangMin }, 60); };
