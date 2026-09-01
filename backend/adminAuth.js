import crypto from 'crypto';

// Sessions live in memory only, so they reset on a server restart (fine for
// a single-owner admin tool) - a Map of token -> expiry is enough, no
// database or extra auth dependency needed for this.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const sessions = new Map();

function purgeExpired() {
  const now = Date.now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt < now) sessions.delete(token);
  }
}

// Constant-time comparison so a login attempt can't be timed to guess the
// password one character at a time.
export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = Buffer.from(String(password ?? ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSession() {
  purgeExpired();
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

export function destroySession(token) {
  sessions.delete(token);
}

export function requireAdmin(req, res, next) {
  purgeExpired();
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
