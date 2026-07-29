"use strict";
const crypto = require("crypto");
const { verify, sign, hashPassword, getSession } = require("./_lib/auth");
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
  // Admin generates a pairing link for their wall.
  if (req.method === "GET") {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: "Nepřihlášen." });
      return;
    }
    const wall = String(req.query.wall || "domov");
    // Long-lived on purpose: same link can be reused to pair several phones over time.
    const token = sign({
      uid: session.uid,
      wall: wall,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3650
    });
    res.status(200).json({ token });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = parseBody(req);
  const claim = verify(body.token);
  if (!claim || !claim.uid || !claim.wall) {
    res.status(401).json({ error: "Neplatný nebo prošlý párovací odkaz." });
    return;
  }

  const deviceId = "d-" + crypto.randomBytes(6).toString("hex");
  const deviceSecret = crypto.randomBytes(20).toString("hex");
  const { salt, hash } = hashPassword(deviceSecret);
  const wallBase = "/users/" + claim.uid + "/walls/" + encodeURIComponent(claim.wall);
  const path = wallBase + "/devices/" + deviceId;

  try {
    const settings = await rtdb("GET", wallBase + "/settings").catch(function () { return null; });
    const groupId = settings && settings.defaultGroupId ? settings.defaultGroupId : null;

    await rtdb("PUT", path, {
      name: "Displej " + deviceId.slice(-4),
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      resolution: String(body.resolution || ""),
      ua: String(body.ua || "").slice(0, 140),
      widget: null,
      groupId: groupId,
      deviceTokenSalt: salt,
      deviceTokenHash: hash
    });
    await rtdb("PUT", "/devices_index/" + deviceId, { uid: claim.uid, wall: claim.wall });
    res.status(200).json({ deviceId, deviceToken: deviceSecret, wall: claim.wall });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
