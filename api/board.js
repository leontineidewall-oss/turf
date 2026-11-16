// the live map: top 12 gangs, their blocks and the week clock
const { send } = require("./_lib");
const { lists, blocks, closes, label, BLOCKS, GANGS } = require("./_board");
module.exports = async (req, res) => {
  try {
    const all = label((await lists()).slice(0, GANGS + 1)), top = all.slice(0, GANGS), b = blocks(top), sum = top.reduce((s, g) => s + g.v24, 0);
    send(res, 200, { t: Date.now(), blocks: BLOCKS, closes: closes(), total: sum, next: all[GANGS] ? { sym: all[GANGS].sym, mint: all[GANGS].mint, v24: all[GANGS].v24 } : null,
      gangs: top.map((g, i) => ({ ...g, rank: i + 1, blocks: b[i], share: sum > 0 ? g.v24 / sum : 0 })) }, 60);
  } catch (e) { send(res, 502, { error: "map unavailable right now" }); }
};
