const express = require('express');
const products = require('../../data/products.json');
const { fail, httpsUrl } = require('../utils/validation');

function productRoutes(config, fetchProducts = fetch) {
  const router = express.Router();
  let cached = null;
  let expires = 0;
  let pending = null;

  async function loadExternal() {
    try {
      // A fixed upstream prevents callers from making our server fetch arbitrary URLs.
      const response = await fetchProducts('https://dummyjson.com/products/category/womens-dresses?limit=12', {
        signal: AbortSignal.timeout(5000), redirect: 'error'
      });
      if (!response.ok) throw new Error('Upstream request failed.');
      const body = await response.json();
      if (!Array.isArray(body.products) || body.products.length > 50) throw new Error('Unexpected catalog.');
      cached = body.products.map(product => {
        if (!Number.isInteger(product.id) || typeof product.title !== 'string' || product.title.length > 200 || !Number.isFinite(product.price) || product.price < 0) throw new Error('Unexpected product.');
        return {
          id: `external-${product.id}`, title: product.title, price: product.price,
          currency: 'USD', imageUrl: httpsUrl(product.thumbnail, 'Catalog image'),
          productUrl: '', store: 'DummyJSON', sample: true
        };
      });
      expires = Date.now() + 5 * 60 * 1000;
      return cached;
    } catch {
      fail('The external catalog is unavailable. Try the sample catalog or retry later.', 502);
    }
  }

  router.get('/', async (req, res) => {
    const source = req.query.source || 'local';
    if (!['local', 'external'].includes(source)) fail('Source must be local or external.');
    if (source === 'local') return res.json({ source, sample: true, products });
    if (!config.externalProducts) fail('The external sample catalog is disabled. Use the sample catalog.', 503);
    if (!cached || expires <= Date.now()) {
      // Share an in-flight request so concurrent visitors do not flood the provider.
      if (!pending) pending = loadExternal().finally(() => { pending = null; });
      await pending;
    }
    res.json({ source, sample: true, products: cached });
  });
  return router;
}

module.exports = productRoutes;
