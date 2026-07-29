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
  const id = req.query.id;
  const wallBase = "/users/" + session.uid + "/walls/" + encodeURIComponent(wall);

  try {
    if (!id) {
      if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }
      const data = await rtdb("GET", wallBase + "/devices");
      res.status(200).json(data || {});
      return;
    }

    const path = wallBase + "/devices/" + id;
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
