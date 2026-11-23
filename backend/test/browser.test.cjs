const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const { chromium, expect } = require('@playwright/test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const createApp = require('../src/app');
const User = require('../src/models/User');

let database, server, browser, directory, origin;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fitfind-browser-'));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  await User.init();
  const config = {
    production: false, proxyHops: 0, secret: 'browser-test-secret-with-32-characters',
    origin: '', externalProducts: false
  };
  const store = MongoStore.create({ client: mongoose.connection.getClient() });
  // Production deploys the static frontend and API as separate Vercel projects.
  // Compose them at one origin here to exercise the same-origin session flow.
  const app = express();
  app.use(express.static(path.join(__dirname, '../../frontend')));
  app.use(createApp(config, store));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  config.origin = origin;
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) });
  await fs.mkdir(path.join(__dirname, '../test-results'), { recursive: true });
}, { timeout: 120000 });

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test('browser: accounts, MongoDB CRUD, preferences, catalog, and logout', { timeout: 90000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/login/login.html');
  await page.selectOption('#mode', 'register');
  await page.fill('#name', 'Browser Tester');
  await page.fill('#email', 'browser@example.com');
  await page.fill('#password', 'Browser-password-123');
  await page.click('#login-button');
  await expect(page.locator('#continue-link')).toBeVisible();
  await page.click('#continue-link');
  await expect(page.locator('#profile-name')).toHaveText('Browser Tester');
  await page.fill('#edit-name', 'Updated Tester');
  await page.locator('#profile-form button').click();
  await expect(page.locator('#profile-name')).toHaveText('Updated Tester');
  await page.fill('#style', 'Casual');
  await page.fill('#stores', 'Myntra, Amazon');
  await page.locator('#preferences-form button').click();
  await expect(page.locator('#preferences-message')).toHaveText('Preferences saved.');
  await page.reload();
  await expect(page.locator('#style')).toHaveValue('Casual');
  await expect(page.locator('#stores')).toHaveValue('Myntra, Amazon');

  await page.goto(origin + '/my-looks/my-looks.html');
  await expect(page.locator('#empty-message')).toBeVisible();
  await page.fill('#item-title', '<b>My outfit</b>');
  await page.fill('#item-notes', 'Weekend look');
  await page.click('#save-item');
  await expect(page.locator('#saved-list h3')).toHaveText('<b>My outfit</b>');
  assert.equal(await page.locator('#saved-list h3 b').count(), 0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.fill('#item-title', 'Updated look');
  await page.click('#save-item');
  await expect(page.locator('#saved-list h3')).toHaveText('Updated look');
  await page.reload();
  await expect(page.locator('#saved-list h3')).toHaveText('Updated look');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('#empty-message')).toBeVisible();

  await page.goto(origin + '/results/results.html');
  await expect(page.locator('#catalog .shop-row')).toHaveCount(3);
  await page.getByRole('button', { name: 'Favorite', exact: true }).first().click();
  await expect(page.locator('#catalog-message')).toHaveText('Saved to Favorites.');
  await page.screenshot({ path: path.join(__dirname, '../test-results/catalog-desktop.png'), fullPage: true });
  await page.goto(origin + '/favorites/favorites.html');
  await expect(page.locator('#saved-list h3')).toHaveText('Classic relaxed-fit tee');
  await page.goto(origin + '/logout/logout.html');
  await page.click('#logout-button');
  await expect(page.locator('#logout-title')).toHaveText('You are logged out');
  await page.goto(origin + '/favorites/favorites.html');
  await expect(page.locator('#items-message')).toHaveText('Please log in to continue.');
  await expect(page.locator('#item-form')).toBeHidden();

  await page.goto(origin + '/login/login.html');
  await page.fill('#email', 'browser@example.com');
  await page.fill('#password', 'Browser-password-123');
  await page.click('#login-button');
  await expect(page.locator('#continue-link')).toBeVisible();
  assert.deepEqual(errors, []);
  await page.close();
});

test('browser: mobile pages fit the viewport and external errors are actionable', { timeout: 60000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const route of ['/index/index.html', '/login/login.html', '/profile/profile.html', '/my-looks/my-looks.html', '/favorites/favorites.html', '/upload/upload.html', '/about/about.html', '/features/features.html', '/how-it-works/how-it-works.html', '/logout/logout.html', '/results/results.html']) {
    await page.goto(origin + route);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Horizontal overflow: ' + route);
  }
  await expect(page.locator('#catalog .shop-row')).toHaveCount(3);
  await page.screenshot({ path: path.join(__dirname, '../test-results/catalog-mobile.png'), fullPage: true });
  await page.selectOption('#catalog-source', 'external');
  await expect(page.locator('#catalog-message')).toContainText('disabled');
  await page.selectOption('#catalog-source', 'local');
  await expect(page.locator('#catalog .shop-row')).toHaveCount(3);
  await page.close();
});
