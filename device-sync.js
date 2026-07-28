"use strict";
const { verifyPassword } = require("./_lib/auth");
const { rtdb } = require("./_lib/firebase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const deviceId = req.query.id;
  const deviceToken = req.query.token;
  if (!deviceId || !deviceToken) {
    res.status(400).json({ error: "Chybí id nebo token." });
    return;
  }

  try {
    const idx = await rtdb("GET", "/devices_index/" + deviceId);
    if (!idx) {
      res.status(404).json({ removed: true });
      return;
    }
    const path = "/users/" + idx.uid + "/walls/" + encodeURIComponent(idx.wall) + "/devices/" + deviceId;
    const dev = await rtdb("GET", path);
    if (!dev) {
      res.status(404).json({ removed: true });
      return;
    }
    if (!verifyPassword(deviceToken, dev.deviceTokenSalt, dev.deviceTokenHash)) {
      res.status(403).json({ error: "Neplatný token zařízení." });
      return;
    }
    await rtdb("PATCH", path, { lastSeen: Date.now() }).catch(function () {});
    res.status(200).json({ name: dev.name, widget: dev.widget || null });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
