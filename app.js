/* FindIt Catalog PWA - Simplified Card Version */

/* ---------- STATE ---------- */
const state = {
  items: [],
  dark: false,
  pendingQueue: [],
  search: ""
};

/* ---------- ELEMENTS ---------- */
const els = {
  form: document.getElementById('itemForm'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  category: document.getElementById('category'),
  imageInput: document.getElementById('imageInput'),

  grid: document.getElementById('itemsGrid'),
  empty: document.getElementById('emptyState'),

  searchInput: document.getElementById('searchInput'),

  darkToggle: document.getElementById('darkToggle'),
  notifyBtn: document.getElementById('notifyBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  installBtn: document.getElementById('installBtn'),

  template: document.getElementById('itemCardTemplate'),

  tooltip: document.getElementById('tooltip'),

  imageOverlay: document.getElementById('imageOverlay'),
  overlayImage: document.getElementById('overlayImage')
};

const STORAGE_KEY = 'itemCatalog.v1';
const THEME_KEY = 'itemCatalog.theme';
const QUEUE_KEY = 'itemCatalog.queue';

/* ---------- STORAGE ---------- */
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
  if (qRaw) {
    try { state.pendingQueue = JSON.parse(qRaw) || []; } catch {}
  }
}
function saveQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(state.pendingQueue));
}

/* ---------- THEME ---------- */
function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  els.darkToggle.setAttribute('aria-pressed', String(dark));
  els.darkToggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

/* ---------- IMAGE COMPRESSION ---------- */
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
  await new Promise(res => img.onload = res);
  let { width, height } = img;
  const ratio = Math.min(maxW / width, maxH / height, 1);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/* ---------- RENDER ---------- */
function render() {
  const search = state.search.toLowerCase();
  const filtered = state.items.filter(item =>
    item.title.toLowerCase().includes(search) ||
    item.description.toLowerCase().includes(search) ||
    item.category.toLowerCase().includes(search)
  );

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
    const edit = node.querySelector('.edit-btn');

    img.src = item.thumbDataUrl || '';
    img.alt = item.thumbDataUrl ? item.title : "";

    t.textContent = item.title;
    d.textContent = item.description;
    c.textContent = item.category;

    /* FULLSCREEN OVERLAY PREVIEW */
    img.addEventListener('click', () => {
      if (!item.thumbDataUrl) return;
      els.overlayImage.src = item.thumbDataUrl;
      els.overlayImage.alt = item.title;
      els.imageOverlay.style.top = `${window.scrollY}px`;
      els.imageOverlay.hidden = false;
    });

    /* DELETE */
    del.addEventListener('click', () => {
      state.items = state.items.filter(i => i.id !== item.id);
      save();
      render();
    });

    /* EDIT DETAILS */
    edit.addEventListener('click', () => enterEditMode(node, item));

    els.grid.appendChild(node);
  });

  els.grid.setAttribute('aria-busy', 'false');
}

/* ---------- CLOSE OVERLAY ---------- */
els.imageOverlay.addEventListener('click', () => {
  els.imageOverlay.hidden = true;
});

/* ---------- SEARCH ---------- */
els.searchInput.addEventListener('input', () => {
  state.search = els.searchInput.value;
  render();
});

/* ---------- INLINE EDIT MODE ---------- */
function enterEditMode(card, item) {
  const details = card.querySelector('.card-details');
  const actions = card.querySelector('.card-actions');
  const thumb = card.querySelector('.thumb');
  const originalImage = item.thumbDataUrl;

  details.hidden = false;
  details.innerHTML = `
    <input class="inline-input" id="edit-title" value="${item.title}">
    <textarea class="inline-textarea" id="edit-desc">${item.description}</textarea>
    <input class="inline-input" id="edit-cat" value="${item.category}">
    <button class="btn small" id="changeImageBtn">Change Image</button>
    <button class="btn small" id="removeImageBtn">Remove Image</button>
  `;

  actions.innerHTML = `
    <button class="btn small primary" id="saveEditBtn">Save</button>
    <button class="btn small" id="cancelEditBtn">Cancel</button>
    <button class="btn small delete-btn">Delete</button>
  `;

  details.querySelector('#changeImageBtn').addEventListener('click', async () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.onchange = async () => {
      const file = picker.files[0];
      if (file) {
        const newDataUrl = await compressImageToDataUrl(file);
        item.thumbDataUrl = newDataUrl;
        thumb.src = newDataUrl;
      }
    };
    picker.click();
  });

  details.querySelector('#removeImageBtn').addEventListener('click', () => {
    item.thumbDataUrl = "";
    thumb.src = "";
  });

  actions.querySelector('#saveEditBtn').addEventListener('click', () => {
    item.title = details.querySelector('#edit-title').value.trim();
    item.description = details.querySelector('#edit-desc').value.trim();
    item.category = details.querySelector('#edit-cat').value.trim();
    save();
    render();
  });

  actions.querySelector('#cancelEditBtn').addEventListener('click', () => {
    item.thumbDataUrl = originalImage;
    render();
  });

  actions.querySelector('.delete-btn').addEventListener('click', () => {
    state.items = state.items.filter(i => i.id !== item.id);
    save();
    render();
  });
}

/* ---------- ADD ITEM FORM ---------- */
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.title.value.trim();
  const description = els.description.value.trim();
  const category = els.category.value.trim();
  const file = els.imageInput.files?.[0];
  if (!title || !category) {
    alert("Please provide title and category.");
    return;
  }
  let thumbDataUrl = "";
  if (file) thumbDataUrl = await compressImageToDataUrl(file);
  const item = { id: crypto.randomUUID(), title, description, category, thumbDataUrl };
  if (!navigator.onLine) {
    state.pendingQueue.push(item);
    saveQueue();
  } else {
    state.items.push(item);
    save();
  }
    els.form.reset();
  render();

  // Show tooltip after adding item
  els.tooltip.hidden = false;
  els.tooltip.classList.add('show');
  setTimeout(() => {
    els.tooltip.classList.remove('show');
    els.tooltip.hidden = true;
  }, 5000);
});

/* ---------- EXPORT ---------- */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state.items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, "items.json");
}

function exportCSV() {
  const headers = ["id", "title", "description", "category", "thumbDataUrl"];
  const rows = state.items.map(i =>
    headers.map(h => `"${String(i[h] ?? "").replaceAll('"', '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, "items.csv");
}

function triggerDownload(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

els.exportJsonBtn.addEventListener("click", exportJSON);
els.exportCsvBtn.addEventListener("click", exportCSV);

/* ---------- IMPORT ---------- */
els.importBtn.addEventListener("click", () => els.importFile.click());

els.importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    let data;
    if (file.name.endsWith(".csv")) {
      data = parseCSV(text);
    } else {
      data = JSON.parse(text);
    }
    state.items = data;
    save();
    render();
  } catch {
    alert("Invalid file format.");
  }
});

function parseCSV(text) {
  const [headerLine, ...lines] = text.trim().split("\n");
  const headers = headerLine.split(",");
  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });
}

/* ---------- NOTIFICATIONS ---------- */
async function requestNotifications() {
  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("Catalog reminders enabled", {
        body: "We will remind you to update your catalog.",
        icon: "icons/icon-192.png"
      });
      scheduleReminder();
    }
  } catch (e) {
    console.warn("Notification error", e);
  }
}

function scheduleReminder() {
  setTimeout(() => {
    if (document.visibilityState === "visible" &&
        "Notification" in window &&
        Notification.permission === "granted") {
      new Notification("Time to update your catalog", {
        body: "Add a new item or review existing ones.",
        icon: "icons/icon-192.png"
      });
    }
  }, 1000 * 60 * 30); // 30 minutes
}

els.notifyBtn.addEventListener("click", requestNotifications);

/* ---------- INSTALL PROMPT ---------- */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
els.installBtn.addEventListener("click", () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => (deferredPrompt = null));
  } else {
    alert("Install prompt not available. Use your browser menu.");
  }
});

/* ---------- CONNECTIVITY ---------- */
window.addEventListener("online", () => {
  if (state.pendingQueue.length) {
    state.items.push(...state.pendingQueue);
    state.pendingQueue = [];
    save();
    saveQueue();
    render();
  }
});

/* ---------- TABS ---------- */
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

/* ---------- THEME TOGGLE ---------- */
els.darkToggle.addEventListener("click", () => {
  state.dark = !state.dark;
  setTheme(state.dark);
});

/* ---------- INIT ---------- */
function init() {
  load();
  setTheme(state.dark);
  render();
  if ("Notification" in window && Notification.permission === "granted") {
    scheduleReminder();
  }
}
init();
