const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { readConfig } = require('./config');
const createApp = require('./app');
const User = require('./models/User');
const { Look, Favorite } = require('./models/SavedItem');

mongoose.set('bufferCommands', false);

async function start() {
  const config = readConfig();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  // Ensure the unique email index exists before accepting registrations.
  await Promise.all([User.createIndexes(), Look.createIndexes(), Favorite.createIndexes()]);
  const store = MongoStore.create({ client: mongoose.connection.getClient(), collectionName: 'sessions' });
  store.on('error', () => console.error('Session store error. Check MongoDB connectivity.'));
  const app = createApp(config, store, { isReady: () => mongoose.connection.readyState === 1 });
  const server = app.listen(config.port, () => console.log(`FitFind is running at ${config.origin}`));
  server.on('error', async error => {
    console.error(`Server could not listen (${error.code || error.name}).`);
    await mongoose.disconnect();
    process.exitCode = 1;
  });

  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    console.log('Closing FitFind...');
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      try {
        await mongoose.disconnect();
        clearTimeout(timeout);
      } catch {
        process.exitCode = 1;
      }
    });
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch(async error => {
  // Configuration errors are useful; connection errors may contain credentials.
  console.error(error.name === 'Error' ? error.message : 'Startup failed. Check MongoDB connectivity and backend/.env.');
  await mongoose.disconnect();
  process.exitCode = 1;
});
