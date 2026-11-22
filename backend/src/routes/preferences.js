const express = require('express');
const requireAuth = require('../middleware/auth');
const preferencesStore = require('../services/preferences');
const validate = require('../utils/validation');

function preferencesRoutes(directory) {
  const router = express.Router();
  const store = preferencesStore(directory);
  router.use(requireAuth);
  router.get('/', async (req, res) => {
    res.json({ preferences: await store.read(req.session.userId) });
  });
  router.put('/', async (req, res) => {
    validate.bodyFields(req.body, ['style', 'stores']);
    const style = validate.text(req.body.style, 'Style', 0, 100);
    if (!Array.isArray(req.body.stores) || req.body.stores.length > 10) validate.fail('Stores must be an array of up to 10 names.');
    const stores = req.body.stores.map(store => validate.text(store, 'Store name', 1, 60));
    const preferences = await store.write(req.session.userId, { style, stores });
    res.json({ preferences });
  });
  return router;
}

module.exports = preferencesRoutes;
