const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const savedItemRoutes = require('./routes/savedItems');
const preferencesRoutes = require('./routes/preferences');
const productRoutes = require('./routes/products');
const { Look, Favorite } = require('./models/SavedItem');

function createApp(config, sessionStore, options = {}) {
  if (!sessionStore) throw new Error('A persistent session store is required.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.proxyHops);
  app.use(helmet({
    strictTransportSecurity: config.production ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'https:', 'blob:'],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.production ? [] : null
      }
    }
  }));

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  if (options.ensureDatabase) {
    app.use('/api', async (req, res, next) => {
      try { await options.ensureDatabase(); next(); }
      catch (error) { next(error); }
    });
  }
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, limit: options.apiLimit || 300,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  }));
  app.get('/api/health', (req, res) => {
    const ready = options.isReady ? options.isReady() : true;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
  });

  // Browser writes require our custom header and an exact allowed origin.
  // We deliberately do not enable cross-origin CORS. Postman can send this header.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('X-FitFind-Request') !== '1' ||
        (req.get('Origin') && req.get('Origin') !== config.origin) ||
        req.get('Sec-Fetch-Site') === 'cross-site') {
      return res.status(403).json({ error: 'Request origin or X-FitFind-Request header is invalid.' });
    }
    // req.is() returns null for empty DELETE bodies, even with a valid header.
    const contentType = (req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') return res.status(415).json({ error: 'Use Content-Type: application/json.' });
    next();
  });
  app.use('/api', express.json({ limit: '32kb' }));
  // Public routes such as the health check and API root must not wait for
  // Mongo-backed session loading. Attach sessions only to account data routes.
  app.use(['/api/auth', '/api/looks', '/api/favorites', '/api/preferences'], session({
    name: 'fitfind.sid', secret: config.secret, store: sessionStore,
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.production, maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: options.authLimit || 10,
    standardHeaders: 'draft-8', legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Too many account attempts. Please try again in 15 minutes.' }
  });
  app.use(['/api/auth/register', '/api/auth/login'], authLimiter);
  app.use('/api/auth', authRoutes(config));
  app.use('/api/looks', savedItemRoutes(Look));
  app.use('/api/favorites', savedItemRoutes(Favorite));
  app.use('/api/preferences', preferencesRoutes());
  app.use('/api/products', productRoutes(config, options.fetchProducts));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

  // The frontend is a separate Vercel static project. This deployment serves APIs only.
  app.get('/', (req, res) => res.json({ name: 'FitFind API', health: '/api/health' }));
  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON request body.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large (maximum 32 KB).' });
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Invalid data.' });
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    // Only application-created upstream errors have a safe message to show.
    if (error.status === 502 || error.status === 503) return res.status(error.status).json({ error: error.message });
    if (status === 500) console.error('Request failed:', error.name); // Do not log credentials or submitted bodies.
    res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
  });
  return app;
}

module.exports = createApp;
