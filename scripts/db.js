// db.js – IndexedDB wrapper for FindIt catalog

(function () {
  const DB_NAME = 'findit-db';
  const DB_VERSION = 1;
  const STORE_ITEMS = 'items';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_ITEMS)) {
          const store = db.createObjectStore(STORE_ITEMS, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  async function getAllItems() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readonly');
      const store = tx.objectStore(STORE_ITEMS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function getItem(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readonly');
      const store = tx.objectStore(STORE_ITEMS);
      const request = store.get(Number(id));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveItem(item) {
    const db = await openDb();
    const now = new Date().toISOString();

    const toSave = {
      id: item.id ? Number(item.id) : undefined,
      title: item.title || '',
      description: item.description || '',
      image: item.image || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      createdAt: item.createdAt || now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.put(toSave);
      req.onsuccess = () => resolve({ ...toSave, id: req.result });
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteItem(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.delete(Number(id));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function clearAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function importItems(items) {
    const db = await openDb();
    const now = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      let imported = 0;
      items.forEach((raw) => {
        const record = {
          id: raw.id ? Number(raw.id) : undefined,
          title: raw.title || '',
          description: raw.description || '',
          image: raw.image || null,
          tags: Array.isArray(raw.tags)
            ? raw.tags
            : (typeof raw.tags === 'string' && raw.tags.trim())
              ? raw.tags.split(',').map(t => t.trim()).filter(Boolean)
              : [],
          createdAt: raw.createdAt || now,
          updatedAt: raw.updatedAt || now
        };
        store.put(record);
        imported += 1;
      });
      tx.oncomplete = () => resolve(imported);
      tx.onerror = () => reject(tx.error);
    });
  }

  window.FindItDb = {
    getAllItems,
    getItem,
    saveItem,
    deleteItem,
    clearAll,
    importItems
  };
}());
