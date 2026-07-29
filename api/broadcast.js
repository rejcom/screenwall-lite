"use strict";
const { getSession } = require("./_lib/auth");
const { rtdb } = require("./_lib/firebase");

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
  const path = "/users/" + session.uid + "/walls/" + encodeURIComponent(wall) + "/broadcast";

  try {
    if (req.method === "PATCH") {
      const body = parseBody(req);
      if (!body.frame) {
        res.status(400).json({ error: "Chybí frame." });
        return;
      }
      await rtdb("PUT", path, { frame: body.frame, updatedAt: Date.now() });
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method === "DELETE") {
      await rtdb("DELETE", path);
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method === "GET") {
      const data = await rtdb("GET", path);
      res.status(200).json(data || {});
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
