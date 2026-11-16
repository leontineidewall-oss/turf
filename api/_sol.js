// base58 + ed25519 on-curve check (wallets are on the curve; pools, curves and vaults are not)
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58enc(bytes) {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let s = ""; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b === 0) s = "1" + s; else break; }
  return s;
}
function b58dec(str) {
  let n = 0n; for (const c of str) { const i = A.indexOf(c); if (i < 0) throw new Error("bad base58"); n = n * 58n + BigInt(i); }
  const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of str) { if (c === "1") out.unshift(0); else break; }
  return Uint8Array.from(out);
}
const P = 2n ** 255n - 19n;
const D = (-121665n * modInv(121666n)) % P;
function mod(a) { const r = a % P; return r < 0n ? r + P : r; }
function pow(b, e) { let r = 1n; b = mod(b); while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; }
function modInv(a) { return pow(a, P - 2n); }
function onCurve(bytes) {
  if (!bytes || bytes.length !== 32) return false;
  let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(i === 31 ? bytes[i] & 0x7f : bytes[i]);
  if (y >= P) return false;
  const y2 = y * y % P, u = mod(y2 - 1n), v = mod(D * y2 + 1n);
  if (v === 0n) return false;
  const x2 = u * modInv(v) % P;
  if (x2 === 0n) return (bytes[31] & 0x80) === 0;
  return pow(x2, (P - 1n) / 2n) === 1n;
}
module.exports = { b58enc, b58dec, onCurve };
