# turf

every coin is a gang. volume takes the blocks.

A live city map of pump.fun. The 12 busiest pump.fun coins (bonding curve and PumpSwap) by rolling 24h volume hold 144 blocks, split by volume share and recounted every minute. The week closes Sunday 23:59:59 UTC: the gang with the most volume on Sunday (UTC) wins, and the pot ($TURF creator fees) pays wallets that hold $TURF and the winning coin, split by $TURF bag.

Live at https://turfsol.vercel.app · pot room at /pot

## Environment (Vercel → Settings → Environment Variables)

| name | what | default |
| --- | --- | --- |
| `TURF_MINT` | the $TURF mint address | — (site shows "—" until set) |
| `POT_WALLET` | wallet that receives the creator fees and signs payouts | — |
| `RPC_URL` | Solana RPC that allows `getProgramAccounts` (Helius or similar) | public RPC |
| `TURF_MIN` | $TURF needed to qualify | 100000 |
| `GANG_MIN_USD` | dollars of the winning coin needed to qualify | 10 |
| `EXCLUDE` | wallets to skip (comma separated) | — |

The map works without any env: it only reads public pool data.

## Rules

- 144 blocks, 12 gangs, every gang keeps at least one block, the rest by 24h volume share (largest remainder).
- Data: GeckoTerminal pools for the `pumpswap` and `pump-fun` dexes, one pool per coin (its busiest). Tickers that repeat get the mint's last 4.
- Winner: most volume on the last closed Sunday (UTC daily candle) among the 10 busiest pools. If any candle fails to load, no winner is shown.
- Payout: wallets with ≥ `TURF_MIN` $TURF and ≥ `GANG_MIN_USD` of the winner, split by $TURF bag, top 180, cuts under ◎0.001 dropped, ◎0.02 kept for fees. Once per week (opens Monday 00:00 UTC). Signed in the pot wallet from /pot, batches of 18. No keys on the server.

## Dev

`python3 build.py` inlines `src/style.css` and `src/app.js` into `index.html` and `pot.html`. Tests: `node test/api.js`, `node test/site.js` (Playwright, mock server).
