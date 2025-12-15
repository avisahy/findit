const DB_NAME = "findit-db";
const DB_VERSION = 1;
const STORE_ITEMS = "items";

let dbInstance = null;

function openDb() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, {
          keyPath: "id",
          autoIncrement: true
        });
        store.createIndex("title", "title", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

async function dbAddItem(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbUpdateItem(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbDeleteItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAllItems() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function dbClearAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Export / import helpers
async function dbExportData() {
  const items = await dbGetAllItems();
  return { items };
}

async function dbImportData(data) {
  if (!data || !Array.isArray(data.items)) {
    throw new Error("Invalid data");
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);

    // Clear then add
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      data.items.forEach(item => {
        // Remove any auto IDs to avoid conflicts
        if (!item.id) {
          delete item.id;
        }
        store.add(item);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

