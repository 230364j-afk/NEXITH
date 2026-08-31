// Vercel Serverless Function — lightweight cross-device room directory for THE NEXIS FAITH.
// Deploy path: /api/rooms.js  ->  callable at https://<your-domain>/api/rooms
//
// Storage note: this uses a plain in-memory Map. Vercel reuses a warm serverless
// instance across consecutive requests for light/casual traffic, so this works fine
// for a small number of concurrent rooms (a handful of friends playing). It is NOT
// guaranteed-consistent at real scale (Vercel may run multiple instances, each with
// its own memory) — if you outgrow this, swap the Map for Vercel KV (Redis) and keep
// the same GET/POST/DELETE shape below.

const TTL_MS = 8000;
const rooms = globalThis.__nexisRooms || (globalThis.__nexisRooms = new Map());

function prune() {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (now - r.ts > TTL_MS) rooms.delete(id);
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  prune();

  if (req.method === 'GET') {
    res.status(200).json(Array.from(rooms.values()));
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const roomId = body.roomId;
    if (!roomId || typeof roomId !== 'string' || roomId.length > 12) {
      res.status(400).json({ error: 'valid roomId required' });
      return;
    }
    rooms.set(roomId, {
      roomId,
      hostName: String(body.hostName || '방장').slice(0, 20),
      count: Number(body.count) || 1,
      max: Number(body.max) || 6,
      locked: !!body.locked,
      virtual: !!body.virtual,
      ts: Date.now()
    });
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const body = req.body || {};
    if (body.roomId) rooms.delete(body.roomId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
