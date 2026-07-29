"use strict";
const crypto = require("crypto");
const { getSession } = require("../_lib/auth");
const { rtdb } = require("../_lib/firebase");

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Nepřihlášen." });
    return;
  }
  const wall = String(req.query.wall || "domov");
  const base = "/users/" + session.uid + "/walls/" + encodeURIComponent(wall) + "/groups";

  try {
    if (req.method === "GET") {
      const data = await rtdb("GET", base);
      res.status(200).json(data || {});
      return;
    }
    if (req.method === "POST") {
      const body = parseBody(req);
      const name = String(body.name || "").trim();
      if (!name) {
        res.status(400).json({ error: "Chybí název skupiny." });
        return;
      }
      const groupId = "g-" + crypto.randomBytes(6).toString("hex");
      const group = { name: name, widget: null, createdAt: Date.now() };
      await rtdb("PUT", base + "/" + groupId, group);
      res.status(200).json({ groupId: groupId, name: name });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
