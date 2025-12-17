// Simple IndexedDB wrapper with localStorage fallback

const DB_NAME = 'findit-db';
const DB_VERSION = 1;
const STORE_NAME = 'items';

let useLocalStorage = false;
let idb;

function openDB() {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      useLocalStorage = true;
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => {
      idb = req.result;
      resolve(idb);
    };
    req.onerror = () => {
      useLocalStorage = true;
      resolve(null);
    };
  });
}

function lsGetAll() {
  const raw = localStorage.getItem('findit-items');
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function lsSetAll(items) {
  localStorage.setItem('findit-items', JSON.stringify(items));
}

export async function dbInit() {
  await openDB();
}

export async function dbGetAll() {
  if (useLocalStorage) return lsGetAll();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(item) {
  const record = { ...item, id: item.id || crypto.randomUUID(), createdAt: item.createdAt || Date.now() };
  if (useLocalStorage) {
    const items = lsGetAll();
    const idx = items.findIndex((x) => x.id === record.id);
    if (idx >= 0) items[idx] = record; else items.unshift(record);
    lsSetAll(items);
    return record;
  }
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(id) {
  if (useLocalStorage) {
    const items = lsGetAll().filter((x) => x.id !== id);
    lsSetAll(items);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearAll() {
  if (useLocalStorage) {
    localStorage.removeItem('findit-items');
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
