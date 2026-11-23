const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Preferences = require('../src/models/Preferences');
const { Look, Favorite } = require('../src/models/SavedItem');
const { readConfig } = require('../src/config');

let database, directory, app, store, alice, bob, aliceId;
const password = 'Testing-password-123';
const config = {
  production: false, proxyHops: 0, secret: 'test-only-secret-with-at-least-32-characters',
  origin: 'http://localhost:3000', externalProducts: false
};
function write(agent, method, url, body = {}) {
  return agent[method](url).set('X-FitFind-Request', '1').set('Content-Type', 'application/json').send(body);
}

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fitfind-test-'));
  config.dataDir = directory;
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  await Promise.all([User.init(), Look.init(), Favorite.init(), Preferences.init()]);
  store = MongoStore.create({ client: mongoose.connection.getClient() });
  app = createApp(config, store, { authLimit: 100 });
  alice = request.agent(app);
  bob = request.agent(app);
  const registration = await write(alice, 'post', '/api/auth/register', { name: 'Alice', email: 'ALICE@example.com', password }).expect(201);
  aliceId = registration.body.user.id;
  assert.match(registration.headers['set-cookie'][0], /HttpOnly/);
  assert.match(registration.headers['set-cookie'][0], /SameSite=Lax/);
  assert.equal(registration.body.user.passwordHash, undefined);
  await write(bob, 'post', '/api/auth/register', { name: 'Bob', email: 'bob@example.com', password }).expect(201);
}, { timeout: 120000 });

after(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
  // directory is an OS-created test fixture, never application data.
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test('registration hashes passwords and normalizes unique email addresses', async () => {
  const user = await User.findById(aliceId).select('+passwordHash');
  assert.equal(user.email, 'alice@example.com');
  assert.notEqual(user.passwordHash, password);
  assert.match(user.passwordHash, /^\$2[ab]\$12\$/);
  await write(request(app), 'post', '/api/auth/register', { name: 'Duplicate', email: 'Alice@example.com', password }).expect(409);
  await write(request(app), 'post', '/api/auth/register', { name: 'Invalid', email: { $ne: null }, password }).expect(400);
  await write(request(app), 'post', '/api/auth/register', { name: 'Invalid', email: 'x@example.com', password: 'short' }).expect(400);
});

test('sessions survive another Express app instance and logout revokes the cookie', async () => {
  const login = await write(request(app), 'post', '/api/auth/login', { email: 'alice@example.com', password }).expect(200);
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  const restartedApp = createApp(config, store);
  const me = await request(restartedApp).get('/api/auth/me').set('Cookie', cookie).expect(200);
  assert.equal(me.body.user.name, 'Alice');
  await write(request(restartedApp), 'post', '/api/auth/logout').set('Cookie', cookie).expect(204);
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
});

test('incorrect passwords and anonymous protected requests are rejected', async () => {
  await write(request(app), 'post', '/api/auth/login', { email: 'alice@example.com', password: 'wrong-password-123' }).expect(401);
  await write(request(app), 'post', '/api/auth/login', { email: 'missing@example.com', password }).expect(401);
  for (const url of ['/api/auth/me', '/api/looks', '/api/favorites', '/api/preferences']) await request(app).get(url).expect(401);
});

test('profile updates only allow the display name', async () => {
  const result = await write(alice, 'patch', '/api/auth/me', { name: 'Alice Updated' }).expect(200);
  assert.equal(result.body.user.name, 'Alice Updated');
  await write(alice, 'patch', '/api/auth/me', { email: 'someone@example.com' }).expect(400);
});

for (const collection of ['looks', 'favorites']) {
  test(`${collection}: full CRUD, pagination, validation, and ownership isolation`, async () => {
    const base = '/api/' + collection;
    const created = await write(alice, 'post', base, { title: 'Weekend outfit', notes: 'Blue jeans', imageUrl: 'https://example.com/image.jpg' }).expect(201);
    const id = created.body.item._id;
    assert.equal(created.body.item.owner, aliceId);
    const list = await alice.get(base + '?page=1&limit=1').expect(200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0]._id, id);
    await alice.get(base + '/' + id).expect(200);
    const updated = await write(alice, 'patch', base + '/' + id, { title: 'Updated outfit' }).expect(200);
    assert.equal(updated.body.item.title, 'Updated outfit');
    assert.equal(updated.body.item.notes, 'Blue jeans');
    assert.equal((await bob.get(base).expect(200)).body.total, 0);
    await bob.get(base + '/' + id).expect(404);
    await write(bob, 'patch', base + '/' + id, { title: 'Stolen' }).expect(404);
    await write(bob, 'delete', base + '/' + id).expect(404);
    await write(alice, 'patch', base + '/' + id, { owner: '000000000000000000000000' }).expect(400);
    await write(alice, 'patch', base + '/' + id, {}).expect(400);
    await write(alice, 'post', base, { title: 'Bad URL', imageUrl: 'javascript:alert(1)' }).expect(400);
    await write(alice, 'post', base, { title: { $gt: '' } }).expect(400);
    await alice.get(base + '/bad-id').expect(400);
    await alice.get(base + '?limit=1000').expect(400);
    await alice.delete(base + '/' + id).set('X-FitFind-Request', '1').set('Content-Type', 'application/json').expect(204);
    await alice.get(base + '/' + id).expect(404);
  });
}

test('MongoDB preferences persist per user and support complete replacement', async () => {
  const preferences = { style: 'Casual', stores: ['Myntra', 'Amazon'] };
  await write(alice, 'put', '/api/preferences', preferences).expect(200);
  assert.deepEqual((await alice.get('/api/preferences').expect(200)).body.preferences, preferences);
  const saved = await Preferences.findOne({ owner: aliceId }).lean();
  assert.deepEqual({ style: saved.style, stores: saved.stores }, preferences);
  assert.deepEqual((await bob.get('/api/preferences').expect(200)).body.preferences, { style: '', stores: [] });
  await write(alice, 'put', '/api/preferences', { style: 'Minimal', stores: [] }).expect(200);
  assert.equal((await alice.get('/api/preferences')).body.preferences.style, 'Minimal');
  await write(alice, 'put', '/api/preferences', { style: 'Casual', stores: 'Amazon' }).expect(400);
  await write(alice, 'put', '/api/preferences', { style: 'Casual', stores: [], owner: '../other' }).expect(400);
});

test('preferences are stored separately for each MongoDB user', async () => {
  await write(alice, 'put', '/api/preferences', { style: 'Minimal', stores: ['Myntra'] }).expect(200);
  await write(bob, 'put', '/api/preferences', { style: 'Streetwear', stores: ['Amazon'] }).expect(200);
  assert.equal((await alice.get('/api/preferences').expect(200)).body.preferences.style, 'Minimal');
  assert.equal((await bob.get('/api/preferences').expect(200)).body.preferences.style, 'Streetwear');
  assert.equal(await Preferences.countDocuments(), 2);
});

test('write requests enforce origin/header, JSON type, parse errors, and body limit', async () => {
  await alice.post('/api/looks').send({ title: 'Unsafe' }).expect(403);
  await write(alice, 'post', '/api/looks', { title: 'Unsafe' }).set('Origin', 'https://evil.example').expect(403);
  await write(alice, 'post', '/api/looks', { title: 'Unsafe' }).set('Sec-Fetch-Site', 'cross-site').expect(403);
  await alice.post('/api/looks').set('X-FitFind-Request', '1').type('form').send({ title: 'Unsafe' }).expect(415);
  await alice.post('/api/looks').set('X-FitFind-Request', '1').type('json').send('{bad').expect(400);
  await write(alice, 'post', '/api/looks', { title: 'Large', notes: 'x'.repeat(40000) }).expect(413);
});

test('API returns security headers and does not serve frontend or private files', async () => {
  const root = await request(app).get('/').expect(200);
  assert.equal(root.body.name, 'FitFind API');
  assert.match(root.headers['content-security-policy'], /script-src 'self'/);
  assert.equal(root.headers['x-content-type-options'], 'nosniff');
  assert.equal(root.headers['x-powered-by'], undefined);
  for (const url of ['/index/index.html', '/backend/.env', '/.env', '/data/logins.json', '/backend/data/products.json', '/src/server.js', '/src/dev-server.js']) await request(app).get(url).expect(404);
  await request(app).get('/api/missing').expect(404).expect('Content-Type', /json/);
  await request(app).get('/api/health').expect(200);
  await request(createApp(config, store, { isReady: () => false })).get('/api/health').expect(503);
});

test('local catalog is available without a third party; external catalog is opt-in', async () => {
  const response = await request(app).get('/api/products').expect(200);
  assert.ok(response.body.products.length > 0);
  assert.equal(response.body.sample, true);
  await request(app).get('/api/products?source=unknown').expect(400);
  await request(app).get('/api/products?source=external').expect(503);
});

test('external catalog normalizes sample data and caches requests', async () => {
  let calls = 0;
  const externalApp = createApp({ ...config, externalProducts: true }, store, {
    fetchProducts: async (url, options) => {
      calls++;
      assert.equal(new URL(url).hostname, 'dummyjson.com');
      assert.ok(options.signal);
      return { ok: true, json: async () => ({ products: [{ id: 1, title: 'Dress', price: 25, thumbnail: 'https://example.com/dress.png' }] }) };
    }
  });
  const response = await request(externalApp).get('/api/products?source=external').expect(200);
  assert.equal(response.body.products[0].currency, 'USD');
  assert.equal(response.body.products[0].sample, true);
  await request(externalApp).get('/api/products?source=external').expect(200);
  assert.equal(calls, 1);
});

test('upstream failures and unsafe response URLs produce a controlled 502', async () => {
  for (const fetchProducts of [
    async () => { throw new Error('private upstream detail'); },
    async () => ({ ok: true, json: async () => ({ products: [{ id: 1, title: 'Dress', price: 25, thumbnail: 'javascript:alert(1)' }] }) })
  ]) {
    const externalApp = createApp({ ...config, externalProducts: true }, store, { fetchProducts });
    const response = await request(externalApp).get('/api/products?source=external').expect(502);
    assert.doesNotMatch(response.body.error, /private upstream detail|javascript/);
  }
});

test('login attempts are rate limited', async () => {
  const limited = request(createApp(config, store, { authLimit: 2 }));
  for (let i = 0; i < 2; i++) await write(limited, 'post', '/api/auth/login', { email: 'missing@example.com', password }).expect(401);
  await write(limited, 'post', '/api/auth/login', { email: 'missing@example.com', password }).expect(429);
});

test('production configuration rejects placeholders and HTTP origins', () => {
  const env = { SESSION_SECRET: config.secret, MONGODB_URI: 'mongodb://localhost/fitfind', NODE_ENV: 'production', APP_ORIGIN: 'https://fitfind.example' };
  assert.equal(readConfig(env).production, true);
  assert.throws(() => readConfig({ ...env, SESSION_SECRET: 'replace-with-a-random-secret-at-least-32-characters' }));
  assert.throws(() => readConfig({ ...env, APP_ORIGIN: 'http://fitfind.example' }));
  assert.throws(() => readConfig({ ...env, PORT: '-1' }));
  assert.throws(() => readConfig({ ...env, TRUST_PROXY_HOPS: '-1' }));
});
