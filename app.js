/* Item Catalog PWA - Vanilla JS */

const state = {
  items: [], // {id, title, description, category, thumbDataUrl}
  filterText: '',
  filterCategory: '',
  dark: false,
  draggingId: null,
  pendingQueue: [] // for simple "sync when online" demo
};

const els = {
  form: document.getElementById('itemForm'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  category: document.getElementById('category'),
  imageInput: document.getElementById('imageInput'),
  grid: document.getElementById('itemsGrid'),
  empty: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  darkToggle: document.getElementById('darkToggle'),
  notifyBtn: document.getElementById('notifyBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  template: document.getElementById('itemCardTemplate')
};

// Storage helpers (localStorage for simplicity)
const STORAGE_KEY = 'itemCatalog.v1';
const THEME_KEY = 'itemCatalog.theme';
const QUEUE_KEY = 'itemCatalog.queue';

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state.items = JSON.parse(raw) || []; } catch {}
  }
  const themeRaw = localStorage.getItem(THEME_KEY);
  if (themeRaw) state.dark = themeRaw === 'dark';
  const qRaw = localStorage.getItem(QUEUE_KEY);
  if (qRaw) { try { state.pendingQueue = JSON.parse(qRaw) || []; } catch {} }
}
function saveQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(state.pendingQueue));
}

function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  els.darkToggle.setAttribute('aria-pressed', String(dark));
  els.darkToggle.textContent = dark ? 'Light' : 'Dark';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

/* Canvas thumbnail compression */
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

/* Render items */
function render() {
  const { items, filterText, filterCategory } = state;
  let filtered = items.filter(i => {
    const textMatch =
      !filterText ||
      i.title.toLowerCase().includes(filterText) ||
      i.description.toLowerCase().includes(filterText);
    const catMatch = !filterCategory || i.category === filterCategory;
    return textMatch && catMatch;
  });

  els.grid.innerHTML = '';
  els.grid.setAttribute('aria-busy', 'true');

  if (filtered.length === 0) {
    els.empty.hidden = false;
    els.grid.setAttribute('aria-busy', 'false');
    return;
  }
  els.empty.hidden = true;

  filtered.forEach(item => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.thumb');
    const t = node.querySelector('.card-title');
    const d = node.querySelector('.card-desc');
    const c = node.querySelector('.card-cat');
    const del = node.querySelector('.delete-btn');
    const handle = node.querySelector('.move-handle');

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

    // Keyboard reorder: use Enter with focus on handle to move above
    handle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const idx = state.items.findIndex(i => i.id === item.id);
        if (idx > 0) {
          const fromId = item.id;
          const toId = state.items[idx - 1].id;
          reorderItems(fromId, toId);
        }
      }
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

/* Reorder logic: move dragged item before target */
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

/* Export */
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

/* Notifications */
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
  } catch (e) {
    console.warn('Notifications error', e);
  }
}
function scheduleReminder() {
  // Simple in-session reminder (not background push). For true Push, use Push API and server.
  setTimeout(() => {
    if (document.visibilityState === 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Time to update your catalog', {
        body: 'Add a new item or review existing ones.',
        icon: 'icons/icon-192.png'
      });
    }
  }, 1000 * 60 * 30); // 30 minutes
}

/* Connectivity + "sync when online" */
function onOnline() {
  // Demo: flush pendingQueue (e.g., unsent items). Here we just move them into items if any.
  if (state.pendingQueue.length) {
    state.items = [...state.items, ...state.pendingQueue];
    state.pendingQueue = [];
    save(); saveQueue();
    render();
  }
}
function onOffline() {
  // No-op: app works offline via service worker cache
}

/* Form handling */
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.title.value.trim();
  const description = els.description.value.trim();
  const category = els.category.value;

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
    title, description, category,
    thumbDataUrl
  };

  if (!navigator.onLine) {
    // queue while offline
    state.pendingQueue.push(item);
    saveQueue();
  } else {
    state.items.push(item);
    save();
  }

  els.form.reset();
  render();
});

/* Filters */
els.searchInput.addEventListener('input', () => {
  state.filterText = els.searchInput.value.trim().toLowerCase();
  render();
});
els.categoryFilter.addEventListener('change', () => {
  state.filterCategory = els.categoryFilter.value;
  render();
});

/* Theme toggle */
els.darkToggle.addEventListener('click', () => {
  state.dark = !state.dark;
  setTheme(state.dark);
});

/* Notifications */
els.notifyBtn.addEventListener('click', requestNotifications);

/* Export buttons */
els.exportJsonBtn.addEventListener('click', exportJSON);
els.exportCsvBtn.addEventListener('click', exportCSV);

/* Keyboard navigation enhancements */
els.grid.addEventListener('keydown', (e) => {
  const cards = Array.from(els.grid.querySelectorAll('.card'));
  const idx = cards.indexOf(document.activeElement);
  if (idx === -1) return;
  if (e.key === 'ArrowRight') cards[Math.min(idx + 1, cards.length - 1)].focus();
  if (e.key === 'ArrowLeft') cards[Math.max(idx - 1, 0)].focus();
  if (e.key === 'Delete') {
    const id = document.activeElement.dataset.id;
    state.items = state.items.filter(i => i.id !== id);
    save(); render();
  }
});

/* Init */
function init() {
  load();
  setTheme(state.dark);
  state.filterText = '';
  state.filterCategory = '';
  render();

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Periodic reminder each session
  if ('Notification' in window && Notification.permission === 'granted') scheduleReminder();
}

init();
