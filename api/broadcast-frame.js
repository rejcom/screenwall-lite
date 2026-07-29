"use strict";
// Deliberately public/unauthenticated (only returns a frame the owner already
// chose to broadcast) and cacheable at the edge — this is what lets many
// displays watch the same screen-share without each one hitting Firebase.
const { rtdb } = require("./_lib/firebase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const uid = String(req.query.uid || "");
  const wall = String(req.query.wall || "");
  if (!uid || !wall) {
    res.status(400).json({ error: "Chybí uid nebo wall." });
    return;
  }
  try {
    const data = await rtdb("GET", "/users/" + uid + "/walls/" + encodeURIComponent(wall) + "/broadcast");
    // Vercel's edge cache collapses concurrent identical requests within this
    // window into a single origin hit — so 5 or 500 viewers cost the same.
    res.setHeader("Cache-Control", "public, s-maxage=1, stale-while-revalidate=3");
    res.status(200).json(data || {});
  } catch (e) {
    res.status(500).json({ error: "Chyba serveru: " + e.message });
  }
};
