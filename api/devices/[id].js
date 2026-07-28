"use strict";
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
  const id = req.query.id;
  const wall = String(req.query.wall || "domov");
  const path = "/users/" + session.uid + "/walls/" + encodeURIComponent(wall) + "/devices/" + id;

  try {
    if (req.method === "PATCH") {
      const body = parseBody(req);
      await rtdb("PATCH", path, body);
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method === "DELETE") {
      await rtdb("DELETE", path);
      await rtdb("DELETE", "/devices_index/" + id).catch(function () {});
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
