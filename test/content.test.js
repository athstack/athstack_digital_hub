const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { boot, shutdown, TestClient, pool, upsertUser, deleteUser, queryScalar } = require('./helpers/httpClient');

const MO = { email: 'marketing.crud.test@athstack.com', password: 'Marketing#Crud2026' };
const CUSTOMER = { email: 'customer.crud.test@athstack.com', password: 'Customer#Crud2026' };

const COUPON_CODE = 'SMOKE2026';
const CAMPAIGN_TITLE = 'Smoke Test Campaign 2026';
const SUBSCRIBER_EMAIL = 'smoke.subscriber@example.com';
const NEWSLETTER_SUBJECT = 'Smoke Newsletter 2026';

describe('Marketing Officer: content management CRUD', () => {
  let server, base, client, productId;

  before(async () => {
    ({ server, base } = await boot());
    await upsertUser({ ...MO, role: 'marketing_officer', firstName: 'Marketing', lastName: 'Crud' });
    await upsertUser({ ...CUSTOMER, role: 'customer', firstName: 'Customer', lastName: 'Crud' });
    client = new TestClient(base);
    const { json } = await client.login(MO.email, MO.password);
    assert.ok(json && json.success, 'marketing officer test login failed');

    const product = await queryScalar('SELECT id FROM products LIMIT 1');
    assert.ok(product, 'a product is required for featured-product tests');
    productId = product.id;
  });

  after(async () => {
    try { await deleteUser(MO.email); } catch (e) { /* best-effort cleanup */ }
    try { await deleteUser(CUSTOMER.email); } catch (e) { /* best-effort cleanup */ }
    await shutdown(server);
  });

  describe('Coupons', () => {
    let couponId;

    before(async () => {
      await pool.execute('DELETE FROM coupons WHERE code = ?', [COUPON_CODE]);
    });

    after(async () => {
      await pool.execute('DELETE FROM coupons WHERE code = ?', [COUPON_CODE]);
    });

    test('rejects a coupon missing its value', async () => {
      const res = await client.post('/marketing/coupons', { code: COUPON_CODE }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 422);
      assert.strictEqual((await res.json()).success, false);
    });

    test('creates a coupon and returns its id', async () => {
      const res = await client.post('/marketing/coupons', {
        code: COUPON_CODE, name: 'Smoke Test Coupon', type: 'percentage', value: '15', min_order: '5000', max_uses: '100'
      }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.id, 'returns the new coupon id');
      couponId = json.id;
    });

    test('rejects a duplicate coupon code', async () => {
      const res = await client.post('/marketing/coupons', { code: COUPON_CODE, type: 'percentage', value: '10' }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 422);
      assert.strictEqual((await res.json()).success, false);
    });

    test('returns coupon details as JSON', async () => {
      const res = await client.get(`/marketing/coupons/${couponId}`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.coupon.code, COUPON_CODE);
      assert.strictEqual(json.coupon.type, 'percentage');
    });

    test('toggles coupon status active <-> inactive', async () => {
      const first = await client.post(`/marketing/coupons/${couponId}/status`, {}, { Accept: 'application/json' });
      assert.strictEqual(first.status, 200);
      assert.strictEqual((await first.json()).status, 'inactive');
      const second = await client.post(`/marketing/coupons/${couponId}/status`, {}, { Accept: 'application/json' });
      assert.strictEqual(second.status, 200);
      assert.strictEqual((await second.json()).status, 'active');
    });

    test('lists the created coupon', async () => {
      const res = await client.get('/marketing/coupons', { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.coupons.some((c) => c.code === COUPON_CODE), 'coupon appears in the list');
    });
  });

  describe('Campaigns', () => {
    let campaignId;

    before(async () => {
      await pool.execute('DELETE FROM marketing_campaigns WHERE title = ?', [CAMPAIGN_TITLE]);
    });

    after(async () => {
      await pool.execute('DELETE FROM marketing_campaigns WHERE id = ?', [campaignId || 0]);
    });

    test('rejects a campaign missing its title', async () => {
      const res = await client.post('/marketing/campaigns', { description: 'no title here' }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 422);
      assert.strictEqual((await res.json()).success, false);
    });

    test('creates a campaign and returns its id', async () => {
      const res = await client.post('/marketing/campaigns', {
        title: CAMPAIGN_TITLE, description: 'Smoke test campaign', goal: 'Signups', budget: '5000'
      }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.id, 'returns the new campaign id');
      campaignId = json.id;
    });

    test('returns campaign details as JSON', async () => {
      const res = await client.get(`/marketing/campaigns/${campaignId}`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.campaign.title, CAMPAIGN_TITLE);
    });

    test('updates the campaign and reflects the new status', async () => {
      const res = await client.post(`/marketing/campaigns/${campaignId}`, {
        title: CAMPAIGN_TITLE, description: 'Smoke test campaign (updated)', status: 'active'
      }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual((await res.json()).success, true);

      const detail = await client.get(`/marketing/campaigns/${campaignId}`, { Accept: 'application/json' });
      const json = await detail.json();
      assert.strictEqual(json.campaign.status, 'active');
    });
  });

  describe('Featured products', () => {
    let originalFeatured, originalPromoted;

    before(async () => {
      const p = await queryScalar('SELECT featured, is_promoted FROM products WHERE id = ?', [productId]);
      originalFeatured = !!p.featured;
      originalPromoted = !!p.is_promoted;
    });

    after(async () => {
      await pool.execute('UPDATE products SET featured = ?, is_promoted = ? WHERE id = ?', [originalFeatured ? 1 : 0, originalPromoted ? 1 : 0, productId]);
    });

    test('returns product details as JSON', async () => {
      const res = await client.get(`/marketing/featured-products/${productId}`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(typeof json.product.featured, 'boolean');
      assert.strictEqual(typeof json.product.is_promoted, 'boolean');
    });

    test('toggles a product featured and restores it', async () => {
      const first = await client.post(`/marketing/products/${productId}/featured`, {}, { Accept: 'application/json' });
      assert.strictEqual(first.status, 200);
      assert.strictEqual(Boolean((await first.json()).featured), !originalFeatured);
      const second = await client.post(`/marketing/products/${productId}/featured`, {}, { Accept: 'application/json' });
      assert.strictEqual(second.status, 200);
      assert.strictEqual(Boolean((await second.json()).featured), originalFeatured);
    });

    test('toggles a product promoted and restores it', async () => {
      const first = await client.post(`/marketing/products/${productId}/promoted`, {}, { Accept: 'application/json' });
      assert.strictEqual(first.status, 200);
      assert.strictEqual(Boolean((await first.json()).is_promoted), !originalPromoted);
      const second = await client.post(`/marketing/products/${productId}/promoted`, {}, { Accept: 'application/json' });
      assert.strictEqual(second.status, 200);
      assert.strictEqual(Boolean((await second.json()).is_promoted), originalPromoted);
    });
  });

  describe('Reviews', () => {
    let reviewId;

    before(async () => {
      const cust = await queryScalar("SELECT id FROM users WHERE email = ?", [CUSTOMER.email]);
      const [r] = await pool.execute(
        "INSERT INTO reviews (user_id, product_id, rating, comment, title, type, status, is_hidden, is_verified, helpful_count, reported_count) VALUES (?, ?, 5, 'Permanent smoke-test review', 'Smoke Review', 'product', 'approved', 0, 0, 0, 0)",
        [cust.id, productId]
      );
      reviewId = r.insertId;
    });

    after(async () => {
      await pool.execute('DELETE FROM reviews WHERE id = ?', [reviewId || 0]);
    });

    test('lists reviews including the fixture', async () => {
      const res = await client.get('/marketing/reviews', { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.reviews.some((r) => r.id === reviewId), 'fixture review appears in the list');
    });

    test('returns review details as JSON', async () => {
      const res = await client.get(`/marketing/reviews/${reviewId}`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.review.id, reviewId);
      assert.strictEqual(typeof json.review.is_hidden, 'boolean');
    });

    test('replies to a review and persists the reply', async () => {
      const res = await client.post(`/marketing/reviews/${reviewId}/reply`, { reply: 'Thanks for your feedback!' }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual((await res.json()).success, true);
      const row = await queryScalar('SELECT seller_reply FROM reviews WHERE id = ?', [reviewId]);
      assert.strictEqual(row.seller_reply, 'Thanks for your feedback!');
    });

    test('toggles review visibility hidden <-> visible', async () => {
      const first = await client.post(`/marketing/reviews/${reviewId}/hide`, {}, { Accept: 'application/json' });
      assert.strictEqual(first.status, 200);
      assert.strictEqual(Boolean((await first.json()).is_hidden), true);
      const second = await client.post(`/marketing/reviews/${reviewId}/hide`, {}, { Accept: 'application/json' });
      assert.strictEqual(second.status, 200);
      assert.strictEqual(Boolean((await second.json()).is_hidden), false);
    });
  });

  describe('Feedback', () => {
    let feedbackId;

    before(async () => {
      const [r] = await pool.execute(
        "INSERT INTO contact_messages (name, email, subject, message, status, is_read_by_customer) VALUES ('Smoke Tester', 'smoke.feedback@example.com', 'Smoke Feedback Subject', 'Permanent smoke-test feedback message', 'unread', 0)"
      );
      feedbackId = r.insertId;
    });

    after(async () => {
      await pool.execute('DELETE FROM contact_messages WHERE id = ?', [feedbackId || 0]);
    });

    test('lists feedback including the fixture', async () => {
      const res = await client.get('/marketing/feedback', { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.messages.some((m) => m.id === feedbackId), 'fixture message appears in the list');
    });

    test('returns feedback details as JSON', async () => {
      const res = await client.get(`/marketing/feedback/${feedbackId}`, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.message.id, feedbackId);
      assert.strictEqual(json.message.subject, 'Smoke Feedback Subject');
    });
  });

  describe('Newsletters', () => {
    before(async () => {
      await pool.execute('DELETE FROM newsletter_subscribers WHERE email = ?', [SUBSCRIBER_EMAIL]);
      await pool.execute('DELETE FROM newsletter_sends WHERE subject = ?', [NEWSLETTER_SUBJECT]);
    });

    after(async () => {
      await pool.execute('DELETE FROM newsletter_subscribers WHERE email = ?', [SUBSCRIBER_EMAIL]);
      await pool.execute('DELETE FROM newsletter_sends WHERE subject = ?', [NEWSLETTER_SUBJECT]);
    });

    test('rejects an invalid subscriber email', async () => {
      const res = await client.post('/marketing/newsletters/subscribers', { email: 'not-an-email' }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 422);
      assert.strictEqual((await res.json()).success, false);
    });

    test('adds a subscriber and lists them', async () => {
      const res = await client.post('/marketing/newsletters/subscribers', { email: SUBSCRIBER_EMAIL }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual((await res.json()).success, true);

      const list = await client.get('/marketing/newsletters', { Accept: 'application/json' });
      const json = await list.json();
      assert.strictEqual(list.status, 200);
      assert.ok(json.subscribers.some((s) => s.email === SUBSCRIBER_EMAIL), 'subscriber appears in the list');
    });

    test('toggles subscriber status subscribed <-> unsubscribed', async () => {
      const sub = await queryScalar('SELECT id, status FROM newsletter_subscribers WHERE email = ?', [SUBSCRIBER_EMAIL]);
      const first = await client.post(`/marketing/newsletters/subscribers/${sub.id}/status`, {}, { Accept: 'application/json' });
      assert.strictEqual(first.status, 200);
      assert.notStrictEqual((await first.json()).status, sub.status);
      const second = await client.post(`/marketing/newsletters/subscribers/${sub.id}/status`, {}, { Accept: 'application/json' });
      assert.strictEqual(second.status, 200);
      assert.strictEqual((await second.json()).status, sub.status);
    });

    test('deletes a subscriber and 404s on a second delete', async () => {
      const sub = await queryScalar('SELECT id FROM newsletter_subscribers WHERE email = ?', [SUBSCRIBER_EMAIL]);
      const del = await client.post(`/marketing/newsletters/subscribers/${sub.id}/delete`, {}, { Accept: 'application/json' });
      assert.strictEqual(del.status, 200);
      assert.strictEqual((await del.json()).success, true);

      const again = await client.post(`/marketing/newsletters/subscribers/${sub.id}/delete`, {}, { Accept: 'application/json' });
      assert.strictEqual(again.status, 404);
    });

    test('rejects a newsletter without a subject', async () => {
      const res = await client.post('/marketing/newsletters/send', { body: 'no subject' }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 422);
      assert.strictEqual((await res.json()).success, false);
    });

    test('sends a newsletter and records the send', async () => {
      const res = await client.post('/marketing/newsletters/send', { subject: NEWSLETTER_SUBJECT, body: 'Smoke test body' }, { Accept: 'application/json' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.id, 'returns the send id');
      const row = await queryScalar('SELECT id FROM newsletter_sends WHERE id = ?', [json.id]);
      assert.strictEqual(row.id, json.id);
    });
  });
});
