const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
require(path.join(ROOT, 'node_modules', 'dotenv')).config({ path: path.join(ROOT, '.env') });
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'test-session-secret';

const bcrypt = require('bcryptjs');
const db = require(path.join(ROOT, 'config', 'db.js'));

const { pool } = db;

/**
 * Boot the Express app on an ephemeral port and wait for migrations/DB readiness.
 * Returns { server, base } where base is the fully-qualified URL prefix.
 */
async function boot() {
  const app = require(path.join(ROOT, 'app.js'));
  await db.whenReady;
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

/** Close the HTTP server and the shared DB pool. */
async function shutdown(server) {
  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    });
  }
  await pool.end().catch(() => {});
}

/** Pull the CSRF token out of an HTML form field. */
function extractCsrf(html) {
  const m = String(html).match(/name="csrf_token" value="([^"]+)"/);
  return m ? m[1] : null;
}

/**
 * Cookie-jarring HTTP client that transparently manages the session cookie and
 * CSRF token, mirroring how the browser behaves against the running app.
 */
class TestClient {
  constructor(base) {
    this.base = base;
    this.jar = new Map();
    this.csrfToken = null;
  }

  cookieHeader() {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  store(res) {
    const sc = res.headers.get('set-cookie');
    if (!sc) return;
    for (const part of sc.split(',')) {
      const [pair] = part.trim().split(';');
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1).trim();
      if (val === '' || /Expires=Thu, 01 Jan 1970/i.test(part)) this.jar.delete(name);
      else this.jar.set(name, val);
    }
  }

  async request(method, pathname, opts = {}) {
    const headers = { Connection: 'close', ...(opts.headers || {}) };
    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(this.base + pathname, { method, headers, body: opts.body, redirect: 'manual' });
    this.store(res);
    return res;
  }

  get(pathname, headers = {}) {
    return this.request('GET', pathname, { headers });
  }

  post(pathname, form = {}, headers = {}) {
    const body = new URLSearchParams(form);
    if (form.csrf_token === undefined && this.csrfToken) body.set('csrf_token', this.csrfToken);
    return this.request('POST', pathname, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: body.toString()
    });
  }

  async getCsrf(pathname = '/auth/login') {
    const res = await this.get(pathname, { Accept: 'text/html' });
    const token = extractCsrf(await res.text());
    if (token) this.csrfToken = token;
    return token;
  }

  /**
   * Full login flow: load the login form (session + CSRF), POST credentials and
   * re-capture the CSRF token (the session is regenerated on login). Resolves to
   * { res, json }. On success this.csrfToken is refreshed from an authenticated page.
   */
  async login(email, password) {
    await this.getCsrf('/auth/login');
    const res = await this.post('/auth/login', { csrf_token: this.csrfToken, email, password }, { Accept: 'application/json' });
    const json = await res.json().catch(() => null);
    if (json && json.success) await this.getCsrf('/marketing');
    return { res, json };
  }
}

/** Create a user with a known password (deletes any previous user with the email). */
async function upsertUser({ email, password, role, firstName = 'Test', lastName = 'User' }) {
  await pool.execute('DELETE FROM users WHERE email = ?', [email]);
  const hashed = await bcrypt.hash(password, 10);
  const [r] = await pool.execute(
    "INSERT INTO users (first_name, last_name, email, password, role, status) VALUES (?, ?, ?, ?, ?, 'active')",
    [firstName, lastName, email, hashed, role]
  );
  return r.insertId;
}

/** Remove a user by email (test cleanup). */
async function deleteUser(email) {
  await pool.execute('DELETE FROM users WHERE email = ?', [email]);
}

/** Read a scalar via the app's pool. */
async function queryScalar(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows.length ? rows[0] : null;
}

module.exports = {
  ROOT,
  pool,
  boot,
  shutdown,
  extractCsrf,
  TestClient,
  upsertUser,
  deleteUser,
  queryScalar
};
