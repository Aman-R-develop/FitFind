const express = require('express');
const requireAuth = require('../middleware/auth');
const Preferences = require('../models/Preferences');
const validate = require('../utils/validation');

function preferencesRoutes() {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', async (req, res) => {
    const preferences = await Preferences.findOne({ owner: req.session.userId }).lean();
    res.json({ preferences: preferences ? { style: preferences.style, stores: preferences.stores } : { style: '', stores: [] } });
  });
  router.put('/', async (req, res) => {
    validate.bodyFields(req.body, ['style', 'stores']);
    const style = validate.text(req.body.style, 'Style', 0, 100);
    if (!Array.isArray(req.body.stores) || req.body.stores.length > 10) validate.fail('Stores must be an array of up to 10 names.');
    const stores = req.body.stores.map(store => validate.text(store, 'Store name', 1, 60));
    const preferences = await Preferences.findOneAndUpdate(
      { owner: req.session.userId },
      { $set: { style, stores }, $setOnInsert: { owner: req.session.userId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ preferences: { style: preferences.style, stores: preferences.stores } });
  });
  return router;
}

module.exports = preferencesRoutes;
