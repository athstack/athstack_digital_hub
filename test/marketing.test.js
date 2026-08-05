const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { boot, shutdown, TestClient, upsertUser, deleteUser, queryScalar } = require('./helpers/httpClient');

const MO = { email: 'marketing.routes.test@athstack.com', password: 'Marketing#Routes2026' };

let server, base, client;

before(async () => {
  ({ server, base } = await boot());
  await upsertUser({ ...MO, role: 'marketing_officer' });
  client = new TestClient(base);
  const { json } = await client.login(MO.email, MO.password);
  assert.ok(json && json.success, 'marketing officer test login failed');
});

after(async () => {
  try { await deleteUser(MO.email); } catch (e) { /* best-effort cleanup */ }
  await shutdown(server);
});

describe('Marketing Officer: dashboard', () => {
  test('dashboard renders for a marketing officer', async () => {
    const res = await client.get('/marketing', { Accept: 'text/html' });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.match(html, /Marketing Dashboard/);
    assert.ok(html.includes('/marketing/campaigns'), 'dashboard links to the campaigns module');
  });
});

describe('Marketing Officer: all marketing pages render', () => {
  const renderable = [
    '/marketing/campaigns', '/marketing/campaigns/new',
    '/marketing/promotions', '/marketing/promotions/new',
    '/marketing/banners', '/marketing/banners/new',
    '/marketing/coupons', '/marketing/coupons/new',
    '/marketing/featured-products',
    '/marketing/blog', '/marketing/blog/new',
    '/marketing/testimonials',
    '/marketing/announcements',
    '/marketing/reviews',
    '/marketing/feedback',
    '/marketing/newsletters',
    '/marketing/analytics', '/marketing/analytics/products', '/marketing/analytics/campaigns',
    '/marketing/reports',
    '/marketing/profile',
    '/marketing/settings'
  ];

  test('every marketing page returns 200 with no render errors', async () => {
    for (const pathname of renderable) {
      const res = await client.get(pathname, { Accept: 'text/html' });
      assert.strictEqual(res.status, 200, `${pathname} renders (got ${res.status})`);
    }
  });

  test('detail pages for missing records return a graceful JSON 404', async () => {
    for (const modulePath of ['campaigns', 'promotions', 'banners', 'coupons', 'blog', 'testimonials', 'announcements', 'featured-products', 'reviews', 'feedback']) {
      const res = await client.get(`/marketing/${modulePath}/999999`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 404, `${modulePath}/999999 -> 404`);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    }
  });

  test('edit forms for missing records redirect back to their list', async () => {
    for (const modulePath of ['campaigns', 'promotions', 'banners', 'coupons', 'blog']) {
      const res = await client.get(`/marketing/${modulePath}/999999/edit`, { Accept: 'text/html' });
      assert.strictEqual(res.status, 302, `${modulePath}/999999/edit -> 302`);
      assert.ok(res.headers.get('location').includes(`/marketing/${modulePath}`), 'redirects to the module list');
    }
  });

  test('fragment endpoints return the table partial without the page layout', async () => {
    for (const pathname of ['/marketing/featured-products', '/marketing/reviews', '/marketing/feedback', '/marketing/newsletters']) {
      const res = await client.get(`${pathname}?fragment=1`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200, `${pathname} fragment -> 200`);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(typeof json.html === 'string' && json.html.length > 0, 'fragment returns html');
    }
  });

  test('detail JSON endpoints return real records', async () => {
    const product = await queryScalar('SELECT id FROM products LIMIT 1');
    const review = await queryScalar('SELECT id FROM reviews LIMIT 1');
    const feedback = await queryScalar('SELECT id FROM contact_messages LIMIT 1');

    const checks = [
      [`/marketing/featured-products/${product.id}`, (j) => j.product && j.product.id === product.id],
      [`/marketing/reviews/${review.id}`, (j) => j.review && j.review.id === review.id],
      [`/marketing/feedback/${feedback.id}`, (j) => j.message && j.message.id === feedback.id]
    ];
    for (const [pathname, validate] of checks) {
      const res = await client.get(pathname, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200, `${pathname} -> 200`);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(validate(json), `${pathname} returns the expected payload shape`);
    }
  });
});
