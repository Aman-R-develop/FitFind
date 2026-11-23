const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT || 3000);
  const proxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  const secret = env.SESSION_SECRET || '';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) throw new Error('TRUST_PROXY_HOPS must be between 0 and 5.');
  if (secret.length < 32 || secret.startsWith('replace-')) throw new Error('Set a random SESSION_SECRET of at least 32 characters in backend/.env.');
  if (!env.MONGODB_URI || !/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URI)) throw new Error('Set a valid MONGODB_URI in backend/.env.');
  const origin = new URL(env.APP_ORIGIN || `http://localhost:${port}`);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('APP_ORIGIN must be an HTTP(S) origin without a path.');
  if (production && origin.protocol !== 'https:') throw new Error('Production APP_ORIGIN must use HTTPS.');
  if (env.ENABLE_EXTERNAL_PRODUCTS && !['true', 'false'].includes(env.ENABLE_EXTERNAL_PRODUCTS)) throw new Error('ENABLE_EXTERNAL_PRODUCTS must be true or false.');
  return {
    production, port, proxyHops, secret, origin: origin.origin,
    mongoUri: env.MONGODB_URI,
    dataDir: path.resolve(__dirname, '..', env.JSON_DATA_DIR || './data/preferences'),
    externalProducts: env.ENABLE_EXTERNAL_PRODUCTS === 'true'
  };
}

module.exports = { readConfig };
