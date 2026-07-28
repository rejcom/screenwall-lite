"use strict";
const { getSession } = require("../_lib/auth");
const { rtdb } = require("../_lib/firebase");

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Nepřihlášen." });
    return;
  }
  try {
    const user = await rtdb("GET", "/users/" + session.uid);
    if (!user) {
      res.status(401).json({ error: "Účet už neexistuje." });
      return;
    }
    res.status(200).json({ uid: session.uid, username: user.username });
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
