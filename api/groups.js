"use strict";
const crypto = require("crypto");
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
  const groupsBase = wallBase + "/groups";

  try {
    if (!id) {
      if (req.method === "GET") {
        const data = await rtdb("GET", groupsBase);
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
        await rtdb("PUT", groupsBase + "/" + groupId, { name, widget: null, createdAt: Date.now() });
        res.status(200).json({ groupId, name });
        return;
      }
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const path = groupsBase + "/" + id;
    if (req.method === "PATCH") {
      const body = parseBody(req);
      await rtdb("PATCH", path, body);
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method === "DELETE") {
      await rtdb("DELETE", path);
      const devices = await rtdb("GET", wallBase + "/devices");
      if (devices) {
        const ids = Object.keys(devices).filter(function (did) {
          return devices[did].groupId === id;
        });
        for (const did of ids) {
          await rtdb("PATCH", wallBase + "/devices/" + did, { groupId: null });
        }
      }
      const settings = await rtdb("GET", wallBase + "/settings");
      if (settings && settings.defaultGroupId === id) {
        await rtdb("PATCH", wallBase + "/settings", { defaultGroupId: null });
      }
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
