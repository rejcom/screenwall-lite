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

    var widget = dev.widget || null;
    if (dev.groupId) {
      const groupPath = "/users/" + idx.uid + "/walls/" + encodeURIComponent(idx.wall) + "/groups/" + dev.groupId;
      const group = await rtdb("GET", groupPath).catch(function () { return null; });
      widget = group ? (group.widget || null) : null;
    }
    if (widget && widget.type === "screenshare") {
      // Don't embed the (large) frame in every per-device poll — the display
      // fetches it itself from the cacheable /api/broadcast-frame endpoint,
      // which is what lets many displays share one origin fetch.
      widget = { type: "screenshare", config: { uid: idx.uid, wall: idx.wall } };
    }
    res.status(200).json({ name: dev.name, widget: widget, groupId: dev.groupId || null });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
