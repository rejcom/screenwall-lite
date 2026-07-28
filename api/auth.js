// Shared helpers: password hashing (scrypt) and signed tokens (HMAC), used for
// both the admin login session cookie and the display-pairing links.
// Requires the Vercel environment variable APP_SECRET (any long random string).
"use strict";
const crypto = require("crypto");

function hashPassword(password, existingSalt) {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(check, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payloadObj) {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Chybí APP_SECRET v nastavení prostředí.");
  const payload = b64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac("sha256", secret).update(payload).digest();
  return payload + "." + b64url(sig);
}

function verify(token) {
  try {
    const secret = process.env.APP_SECRET;
    if (!secret || !token) return null;
    const parts = String(token).split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = b64url(crypto.createHmac("sha256", secret).update(payload).digest());
    if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return null;
    }
    const obj = JSON.parse(fromB64url(payload).toString("utf8"));
    if (obj.exp && Date.now() / 1000 > obj.exp) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const header = (req.headers && req.headers.cookie) || "";
  const out = {};
  header.split(";").forEach(function (part) {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function getSession(req) {
  const cookies = parseCookies(req);
  return verify(cookies["sw_session"]);
}

function setSessionCookie(res, uid) {
  const maxAge = 60 * 60 * 24 * 30;
  const token = sign({ uid, exp: Math.floor(Date.now() / 1000) + maxAge });
  res.setHeader(
    "Set-Cookie",
    "sw_session=" + token + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + maxAge
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "sw_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
}

module.exports = {
  hashPassword,
  verifyPassword,
  sign,
  verify,
  getSession,
  setSessionCookie,
  clearSessionCookie
};
