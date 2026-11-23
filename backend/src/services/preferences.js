const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function preferencesStore(directory) {
  const pendingWrites = new Map();
  function filePath(userId) {
    // IDs come from the server session, never from a browser-supplied path.
    if (!/^[a-f\d]{24}$/i.test(userId)) throw new Error('Invalid preference owner.');
    return path.join(directory, `${userId}.json`);
  }

  async function read(userId) {
    try {
      const value = JSON.parse(await fs.readFile(filePath(userId), 'utf8'));
      if (!value || typeof value.style !== 'string' || !Array.isArray(value.stores) || !value.stores.every(store => typeof store === 'string')) throw new Error('Invalid stored preferences.');
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return { style: '', stores: [] };
      throw error; // Never hide corrupt files by silently replacing them.
    }
  }

  async function writeFile(userId, preferences) {
    await fs.mkdir(directory, { recursive: true });
    const destination = filePath(userId);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(preferences, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      // Atomic replacement avoids partially written JSON.
      await fs.rename(temporary, destination);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return preferences;
  }

  async function write(userId, preferences) {
    // Serialize this user's writes. Windows cannot always replace the same file
    // concurrently. Different users still save independently.
    const previous = pendingWrites.get(userId) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => writeFile(userId, preferences));
    pendingWrites.set(userId, current);
    try {
      return await current;
    } finally {
      if (pendingWrites.get(userId) === current) pendingWrites.delete(userId);
    }
  }

  return { read, write };
}

module.exports = preferencesStore;
