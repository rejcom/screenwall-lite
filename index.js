"use strict";
const { getSession } = require("../_lib/auth");
const { rtdb } = require("../_lib/firebase");

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Nepřihlášen." });
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const wall = String(req.query.wall || "domov");
  const path = "/users/" + session.uid + "/walls/" + encodeURIComponent(wall) + "/devices";
  try {
    const data = await rtdb("GET", path);
    res.status(200).json(data || {});
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
