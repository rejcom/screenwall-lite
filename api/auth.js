"use strict";
const crypto = require("crypto");
const { rtdb } = require("./_lib/firebase");
const {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  usernameKey
} = require("./_lib/auth");

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch (e) {
    return {};
  }
}

async function doRegister(req, res) {
  const body = parseBody(req);
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (username.length < 3 || username.length > 64 || /\s/.test(username)) {
    res.status(400).json({ error: "Uživatelské jméno: 3–64 znaků, bez mezer (e-mail je v pořádku)." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Heslo musí mít alespoň 8 znaků." });
    return;
  }

  const key = usernameKey(username);
  const existing = await rtdb("GET", "/usernames/" + key);
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
  await rtdb("PUT", "/usernames/" + key, uid);
  setSessionCookie(res, uid);
  res.status(200).json({ ok: true, uid, username });
}

async function doLogin(req, res) {
  const body = parseBody(req);
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  const uid = await rtdb("GET", "/usernames/" + usernameKey(username));
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
}

async function doLogout(req, res) {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}

async function doMe(req, res) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Nepřihlášen." });
    return;
  }
  const user = await rtdb("GET", "/users/" + session.uid);
  if (!user) {
    res.status(401).json({ error: "Účet už neexistuje." });
    return;
  }
  res.status(200).json({ uid: session.uid, username: user.username });
}

module.exports = async (req, res) => {
  const action = String(req.query.action || "");
  try {
    if (action === "register" && req.method === "POST") return await doRegister(req, res);
    if (action === "login" && req.method === "POST") return await doLogin(req, res);
    if (action === "logout" && req.method === "POST") return await doLogout(req, res);
    if (action === "me" && req.method === "GET") return await doMe(req, res);
    res.status(400).json({ error: "Neznámá akce." });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
