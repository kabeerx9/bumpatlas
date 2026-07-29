/**
 * In-memory AsyncStorage shim used when the native module is missing
 * (stale dev client / Expo Go mismatch). Lets the JS bundle boot for UI testing.
 */
const store = new Map();

const AsyncStorage = {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(String(key), String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
  async getAllKeys() {
    return Array.from(store.keys());
  },
  async multiGet(keys) {
    return keys.map((key) => [key, store.has(key) ? store.get(key) : null]);
  },
  async multiSet(pairs) {
    for (const [key, value] of pairs) {
      store.set(String(key), String(value));
    }
  },
  async multiRemove(keys) {
    for (const key of keys) store.delete(key);
  },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
