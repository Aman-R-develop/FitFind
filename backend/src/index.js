const express = require('express');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { readConfig } = require('./config');
const createApp = require('./create-app');
const User = require('./models/User');
const { Look, Favorite } = require('./models/SavedItem');
const Preferences = require('./models/Preferences');

mongoose.set('bufferCommands', false);
const config = readConfig();
let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
      autoIndex: false
    }).then(async () => {
      await Promise.all([User.createIndexes(), Look.createIndexes(), Favorite.createIndexes(), Preferences.createIndexes()]);
    }).catch(error => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
}

// connect-mongo stores login sessions in MongoDB, so serverless instances share them.
const sessionStore = MongoStore.create({ mongoUrl: config.mongoUri, collectionName: 'sessions' });
sessionStore.on('error', () => console.error('Session store error. Check MongoDB connectivity.'));

const app = express();
createApp(config, sessionStore, {
  ensureDatabase: connectDatabase,
  isReady: () => mongoose.connection.readyState === 1
}, app);

module.exports = app;
