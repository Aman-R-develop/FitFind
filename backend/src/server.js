// Local development entry point. Vercel uses src/index.js directly as a function.
const app = require('./index');
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`FitFind API is running on port ${server.address().port}.`));

function shutdown() {
  server.close(() => process.exit(0));
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
