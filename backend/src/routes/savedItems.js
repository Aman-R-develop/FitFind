const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../utils/validation');

// Reuse the same CRUD operations for looks and favorites.
function savedItemRoutes(Model) {
  const router = express.Router();
  router.use(requireAuth);
  router.param('id', (req, res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ error: 'Invalid item ID.' });
    next();
  });

  router.get('/', async (req, res) => {
    const { page, limit } = validate.pagination(req.query);
    const filter = { owner: req.session.userId };
    const [items, total] = await Promise.all([
      Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
      Model.countDocuments(filter)
    ]);
    res.json({ items, page, limit, total });
  });

  router.post('/', async (req, res) => {
    const fields = validate.savedItem(req.body);
    const item = await Model.create({ ...fields, owner: req.session.userId });
    res.status(201).json({ item });
  });

  router.get('/:id', async (req, res) => {
    const item = await Model.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!item) validate.fail('Item not found.', 404);
    res.json({ item });
  });

  router.patch('/:id', async (req, res) => {
    const fields = validate.savedItem(req.body, true);
    const item = await Model.findOneAndUpdate(
      { _id: req.params.id, owner: req.session.userId },
      { $set: fields }, { new: true, runValidators: true }
    );
    if (!item) validate.fail('Item not found.', 404);
    res.json({ item });
  });

  router.delete('/:id', async (req, res) => {
    const item = await Model.findOneAndDelete({ _id: req.params.id, owner: req.session.userId });
    if (!item) validate.fail('Item not found.', 404);
    res.status(204).end();
  });
  return router;
}

module.exports = savedItemRoutes;
