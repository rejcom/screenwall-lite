// Server-side only. Talks to Firebase Realtime Database using a Google service
// account (OAuth2 JWT bearer flow), so the database URL and credentials never
// reach the browser. Requires these Vercel environment variables:
//   FB_DB_URL        e.g. https://your-project-default-rtdb.europe-west1.firebasedatabase.app
//   FB_CLIENT_EMAIL  "client_email" field from the service account JSON
//   FB_PRIVATE_KEY   "private_key" field from the service account JSON
"use strict";
const crypto = require("crypto");

let cachedToken = null;
let cachedTokenExp = 0;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExp - 60) return cachedToken;

  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = (process.env.FB_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Chybí FB_CLIENT_EMAIL nebo FB_PRIVATE_KEY v nastavení prostředí.");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claim));
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const sigPart = signature.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = unsigned + "." + sigPart;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + encodeURIComponent(jwt)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("Přihlášení ke Google/Firebase selhalo: " + JSON.stringify(data));

  cachedToken = data.access_token;
  cachedTokenExp = now + (data.expires_in || 3600);
  return cachedToken;
}

async function rtdb(method, path, body) {
  const token = await getAccessToken();
  const base = (process.env.FB_DB_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("Chybí FB_DB_URL v nastavení prostředí.");
  const resp = await fetch(base + path + ".json", {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error("RTDB " + method + " " + path + " -> HTTP " + resp.status + " " + text);
  }
  return resp.json();
}

module.exports = { rtdb };
