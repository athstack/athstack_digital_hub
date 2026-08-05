const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { boot, shutdown, TestClient, upsertUser, deleteUser } = require('./helpers/httpClient');

const MO = { email: 'marketing.auth.test@athstack.com', password: 'Marketing#Auth2026' };
const CUSTOMER = { email: 'customer.auth.test@athstack.com', password: 'Customer#Auth2026' };

let server, base;

before(async () => {
  ({ server, base } = await boot());
  await upsertUser({ ...MO, role: 'marketing_officer', firstName: 'Marketing', lastName: 'Auth' });
  await upsertUser({ ...CUSTOMER, role: 'customer', firstName: 'Customer', lastName: 'Auth' });
});

after(async () => {
  try { await deleteUser(MO.email); } catch (e) { /* best-effort cleanup */ }
  try { await deleteUser(CUSTOMER.email); } catch (e) { /* best-effort cleanup */ }
  await shutdown(server);
});

describe('Marketing Officer: authentication', () => {
  test('guest can load the login page with a CSRF token', async () => {
    const client = new TestClient(base);
    const res = await client.get('/auth/login', { Accept: 'text/html' });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('csrf_token'), 'login form exposes a csrf_token field');
  });

  test('login without a CSRF token is rejected', async () => {
    const client = new TestClient(base);
    await client.getCsrf('/auth/login');
    const res = await client.request('POST', '/auth/login', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ email: MO.email, password: MO.password }).toString()
    });
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });

  test('login with a wrong password is rejected', async () => {
    const client = new TestClient(base);
    await client.getCsrf('/auth/login');
    const { res, json } = await client.login(MO.email, 'DefinitelyWrong');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(json.success, false);
  });

  test('marketing officer can log in and is routed to /marketing', async () => {
    const client = new TestClient(base);
    const { res, json } = await client.login(MO.email, MO.password);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.redirect, '/marketing');
    const dash = await client.get('/marketing', { Accept: 'text/html' });
    assert.strictEqual(dash.status, 200);
  });

  test('marketing officer session is terminated by logout', async () => {
    const client = new TestClient(base);
    await client.login(MO.email, MO.password);
    await client.getCsrf('/marketing');
    const out = await client.post('/auth/logout', {}, { Accept: 'application/json' });
    assert.ok([302, 303].includes(out.status), 'logout returns a redirect');
    const afterLogout = await client.get('/marketing', { Accept: 'text/html' });
    assert.strictEqual(afterLogout.status, 302);
    assert.ok(afterLogout.headers.get('location').includes('/auth/login'), 'redirects to login after logout');
  });
});

describe('Marketing Officer: RBAC', () => {
  test('marketing officer is blocked from admin, technician and customer areas', async () => {
    const client = new TestClient(base);
    await client.login(MO.email, MO.password);
    for (const pathname of ['/admin', '/technician', '/dashboard']) {
      const res = await client.get(pathname, { Accept: 'text/html' });
      assert.strictEqual(res.status, 302, `${pathname} redirects non-privileged roles`);
      assert.strictEqual(res.headers.get('location'), '/', `${pathname} redirects home`);
    }
  });

  test('guest is redirected to login before reaching /marketing', async () => {
    const client = new TestClient(base);
    const res = await client.get('/marketing', { Accept: 'text/html' });
    assert.strictEqual(res.status, 302);
    assert.ok(res.headers.get('location').includes('/auth/login'));
  });

  test('customer is blocked from /marketing', async () => {
    const client = new TestClient(base);
    await client.login(CUSTOMER.email, CUSTOMER.password);
    const res = await client.get('/marketing', { Accept: 'text/html' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/');
  });

  test('marketing officer can reach permission-gated marketing routes', async () => {
    const client = new TestClient(base);
    await client.login(MO.email, MO.password);
    for (const pathname of ['/marketing', '/marketing/campaigns', '/marketing/analytics', '/marketing/settings']) {
      const res = await client.get(pathname, { Accept: 'text/html' });
      assert.strictEqual(res.status, 200, `${pathname} is accessible to marketing_officer`);
    }
  });
});
