"use strict";
const { rtdb } = require("../_lib/firebase");
const { verifyPassword, setSessionCookie } = require("../_lib/auth");

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = parseBody(req);
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  try {
    const uid = await rtdb("GET", "/usernames/" + encodeURIComponent(username));
    if (!uid) {
      res.status(401).json({ error: "Neplatné jméno nebo heslo." });
      return;
    }
    const user = await rtdb("GET", "/users/" + uid);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: "Neplatné jméno nebo heslo." });
      return;
    }
    setSessionCookie(res, uid);
    res.status(200).json({ ok: true, uid, username: user.username });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
