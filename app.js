/* FindIt Catalog PWA - Vanilla JS */

const state = {
  items: [],
  dark: false,
  draggingId: null,
  pendingQueue: []
};

const els = {
  form: document.getElementById('itemForm'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  category: document.getElementById('category'),
  imageInput: document.getElementById('imageInput'),
  grid: document.getElementById('itemsGrid'),
  empty: document.getElementById('emptyState'),
  darkToggle: document.getElementById('darkToggle'),
  notifyBtn: document.getElementById('notifyBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  installBtn: document.getElementById('installBtn'),
  template: document.getElementById('itemCardTemplate')
};

const STORAGE_KEY = 'itemCatalog.v1';
const THEME_KEY = 'itemCatalog.theme';
const QUEUE_KEY = 'itemCatalog.queue';

/* ---------- Storage ---------- */
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); }
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { state.items = JSON.parse(raw) || []; } catch {} }
  const themeRaw = localStorage.getItem(THEME_KEY);
  if (themeRaw) state.dark = themeRaw === 'dark';
  const qRaw = localStorage.getItem(QUEUE_KEY);
  if (qRaw) { try { state.pendingQueue = JSON.parse(qRaw) || []; } catch {} }
}
function saveQueue() { localStorage.setItem(QUEUE_KEY, JSON.stringify(state.pendingQueue)); }

/* ---------- Theme ---------- */
function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  els.darkToggle.setAttribute('aria-pressed', String(dark));
  els.darkToggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

/* ---------- Image compression ---------- */
async function compressImageToDataUrl(file, maxW = 800, maxH = 800, quality = 0.7) {
  if (!file) return '';
  const img = document.createElement('img');
  const reader = new FileReader();
  const loadFile = new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
  reader.readAsDataURL(file);
  const dataUrl = await loadFile;
  img.src = dataUrl;
  await new Promise((res) => img.onload = res);

  let { width, height } = img;
  const ratio = Math.min(maxW / width, maxH / height, 1);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/* ---------- Render items ---------- */
function render() {
  const { items } = state;
  els.grid.innerHTML = '';
  els.grid.setAttribute('aria-busy', 'true');

  if (items.length === 0) {
    els.empty.hidden = false;
    els.grid.setAttribute('aria-busy', 'false');
    return;
  }
  els.empty.hidden = true;

  items.forEach(item => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.thumb');
    const t = node.querySelector('.card-title');
    const d = node.querySelector('.card-desc');
    const c = node.querySelector('.card-cat');
    const del = node.querySelector('.delete-btn');

    img.src = item.thumbDataUrl || '';
    img.alt = item.title ? `Image of ${item.title}` : 'Item image';
    t.textContent = item.title;
    d.textContent = item.description || '';
    c.textContent = item.category || '';
    node.dataset.id = item.id;

    // Drag and drop
    node.addEventListener('dragstart', (e) => {
      state.draggingId = item.id;
      node.setAttribute('aria-grabbed', 'true');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
    });
    node.addEventListener('dragend', () => {
      state.draggingId = null;
      node.setAttribute('aria-grabbed', 'false');
    });
    node.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    node.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      const toId = item.id;
      reorderItems(fromId, toId);
    });

    del.addEventListener('click', () => {
      state.items = state.items.filter(i => i.id !== item.id);
      save();
      render();
    });

    els.grid.appendChild(node);
  });

  els.grid.setAttribute('aria-busy', 'false');
}

/* ---------- Reorder ---------- */
function reorderItems(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const list = state.items.slice();
  const fromIdx = list.findIndex(i => i.id === fromId);
  const toIdx = list.findIndex(i => i.id === toId);
  if (fromIdx === -1 || toIdx === -1) return;
  const [moved] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, moved);
  state.items = list;
  save();
  render();
}

/* ---------- Export ---------- */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state.items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'items.json');
}
function exportCSV() {
  const headers = ['id', 'title', 'description', 'category', 'thumbDataUrl'];
  const rows = state.items.map(i => headers.map(h => `"${String(i[h] ?? '').replaceAll('"', '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'items.csv');
}
function triggerDownload(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ---------- Import ---------- */
els.importBtn.addEventListener('click', () => els.importFile.click());
els.importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = file.name.endsWith('.csv') ? parseCSV(text) : JSON.parse(text);
    state.items = data;
    save();
    render();
  } catch {
    alert('Invalid file format');
  }
});
function parseCSV(text) {
  const [headerLine, ...lines] = text.trim().split('\n');
  const headers = headerLine.split(',');
  return lines.map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

/* ---------- Notifications ---------- */
async function requestNotifications() {
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('Catalog reminders enabled', {
        body: 'We will remind you to update your catalog.',
        icon: 'icons/icon-192.png'
      });
      scheduleReminder();
    }
  } catch (e) { console.warn('Notifications error', e); }
}
function scheduleReminder() {
  setTimeout(() => {
    if (document.visibilityState === 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Time to update your catalog', {
        body: 'Add a new item or review existing ones.',
        icon: 'icons/icon-192.png'
      });
    }
  }, 1000 * 60 * 30); // 30 minutes
}

/* ---------- Connectivity ---------- */
function onOnline() {
  if (state.pendingQueue.length) {
    state.items = [...state.items, ...state.pendingQueue];
    state.pendingQueue = [];
    save(); saveQueue();
    render();
  }
}
function onOffline() {}

/* ---------- Form handling ---------- */
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.title.value.trim();
  const description = els.description.value.trim();
  const category = els.category.value.trim();

  if (!title || !category) {
    alert('Please provide title and category.');
    return;
  }

  let thumbDataUrl = '';
  const file = els.imageInput.files?.[0];
  try {
    thumbDataUrl = await compressImageToDataUrl(file, 800, 800, 0.7);
  } catch {
    thumbDataUrl = '';
  }

  const item = {
    id: crypto.randomUUID(),
    title,
    description,
    category,
    thumbDataUrl
  };

  if (!navigator.onLine) {
    state.pendingQueue.push(item);
    saveQueue();
  } else {
    state.items.push(item);
    save();
  }

  els.form.reset();
  render();
});

/* ---------- Theme toggle ---------- */
els.darkToggle.addEventListener('click', () => {
  state.dark = !state.dark;
  setTheme(state.dark);
});

/* ---------- Notifications ---------- */
els.notifyBtn.addEventListener('click', requestNotifications);

/* ---------- Export buttons ---------- */
els.exportJsonBtn.addEventListener('click', exportJSON);
els.exportCsvBtn.addEventListener('click', exportCSV);

/* ---------- Install prompt ---------- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
els.installBtn.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => deferredPrompt = null);
  } else {
    alert('Install prompt not available. Use browser menu.');
  }
});

/* ---------- Connectivity listeners ---------- */
window.addEventListener('online', onOnline);
window.addEventListener('offline', onOffline);

/* ---------- Tabs navigation ---------- */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ---------- Init ---------- */
function init() {
  load();
  setTheme(state.dark);
  render();
  if ('Notification' in window && Notification.permission === 'granted') scheduleReminder();
}
init();
