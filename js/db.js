// findit/js/db.js
const DB_NAME = 'findit-db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';
const STORE_META = 'meta';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(fn(store))
      .then(resolve)
      .catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export const DB = {
  async addItem(item) {
    return withStore(STORE_ITEMS, 'readwrite', (s) => s.add(item));
  },
  async updateItem(item) {
    return withStore(STORE_ITEMS, 'readwrite', (s) => s.put(item));
  },
  async deleteItem(id) {
    return withStore(STORE_ITEMS, 'readwrite', (s) => s.delete(id));
  },
  async getItem(id) {
    return withStore(STORE_ITEMS, 'readonly', (s) => s.get(id));
  },
  async getAllItems() {
    return withStore(STORE_ITEMS, 'readonly', (s) =>
      new Promise((resolve, reject) => {
        const req = s.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
    );
  },
  async clearAll() {
    await withStore(STORE_ITEMS, 'readwrite', (s) => s.clear());
    await withStore(STORE_META, 'readwrite', (s) => s.clear());
  },
  async setMeta(key, value) {
    return withStore(STORE_META, 'readwrite', (s) => s.put({ key, value }));
  },
  async getMeta(key) {
    return withStore(STORE_META, 'readonly', (s) => s.get(key)).then((r) => (r ? r.value : null));
  }
};
