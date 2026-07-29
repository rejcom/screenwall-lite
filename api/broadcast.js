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
  try {
    // Public, cacheable path used by displays: /api/broadcast?uid=...&wall=...
    // Deliberately unauthenticated (only returns a frame the owner already
    // chose to broadcast) and cacheable at the edge — this is what lets many
    // displays watch the same screen-share without each one hitting Firebase.
    if (req.method === "GET" && req.query.uid) {
      const uid = String(req.query.uid);
      const wall = String(req.query.wall || "domov");
      const data = await rtdb("GET", "/users/" + uid + "/walls/" + encodeURIComponent(wall) + "/broadcast");
      res.setHeader("Cache-Control", "public, s-maxage=1, stale-while-revalidate=3");
      res.status(200).json(data || {});
      return;
    }

    // Everything else is the admin managing their own wall's broadcast.
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: "Nepřihlášen." });
      return;
    }
    const wall = String(req.query.wall || "domov");
    const path = "/users/" + session.uid + "/walls/" + encodeURIComponent(wall) + "/broadcast";

    if (req.method === "GET") {
      const data = await rtdb("GET", path);
      res.status(200).json(data || {});
      return;
    }
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
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
