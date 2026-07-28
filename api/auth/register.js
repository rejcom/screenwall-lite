"use strict";
const crypto = require("crypto");
const { rtdb } = require("../_lib/firebase");
const { hashPassword, setSessionCookie } = require("../_lib/auth");

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

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    res.status(400).json({ error: "Uživatelské jméno: 3–32 znaků, jen malá písmena, čísla, tečka, pomlčka, podtržítko." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Heslo musí mít alespoň 8 znaků." });
    return;
  }

  try {
    const existing = await rtdb("GET", "/usernames/" + encodeURIComponent(username));
    if (existing) {
      res.status(409).json({ error: "Toto uživatelské jméno už existuje." });
      return;
    }
    const uid = "u-" + crypto.randomBytes(9).toString("hex");
    const { salt, hash } = hashPassword(password);
    await rtdb("PUT", "/users/" + uid, {
      username,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: Date.now()
    });
    await rtdb("PUT", "/usernames/" + encodeURIComponent(username), uid);
    setSessionCookie(res, uid);
    res.status(200).json({ ok: true, uid, username });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
