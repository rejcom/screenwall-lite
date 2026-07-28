"use strict";
const { getSession, sign } = require("./_lib/auth");

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
  // Long-lived on purpose: same link can be reused to pair several phones over time.
  const token = sign({
    uid: session.uid,
    wall: wall,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3650
  });
  res.status(200).json({ token });
};
