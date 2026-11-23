const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const validate = require('../utils/validation');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

async function startSession(req, userId) {
  // Regeneration prevents a pre-login session from being reused after login.
  await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = String(userId);
  await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
}

function authRoutes(config) {
  const router = express.Router();
  const dummyHash = bcrypt.hashSync('not-a-real-account-password', 12);

  router.post('/register', async (req, res) => {
    validate.bodyFields(req.body, ['name', 'email', 'password']);
    const name = validate.text(req.body.name, 'Name', 2, 60);
    const email = validate.email(req.body.email);
    const password = validate.password(req.body.password);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    await startSession(req, user.id);
    res.status(201).json({ user: publicUser(user) });
  });

  router.post('/login', async (req, res) => {
    validate.bodyFields(req.body, ['email', 'password']);
    const email = validate.email(req.body.email);
    const password = validate.password(req.body.password);
    const user = await User.findOne({ email }).select('+passwordHash');
    const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
    if (!user || !matches) validate.fail('Email or password is incorrect.', 401);
    await startSession(req, user.id);
    res.json({ user: publicUser(user) });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (!user) validate.fail('Please log in again.', 401);
    res.json({ user: publicUser(user) });
  });

  router.patch('/me', requireAuth, async (req, res) => {
    validate.bodyFields(req.body, ['name']);
    const name = validate.text(req.body.name, 'Name', 2, 60);
    const user = await User.findByIdAndUpdate(req.session.userId, { $set: { name } }, { new: true, runValidators: true });
    if (!user) validate.fail('Please log in again.', 401);
    res.json({ user: publicUser(user) });
  });

  router.post('/logout', async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie('fitfind.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: config.production });
    res.status(204).end();
  });
  return router;
}

module.exports = authRoutes;
