// findit/js/app.js
import { DB } from './db.js';
import { I18n } from './i18n.js';
import { UI } from './ui.js';

let state = {
  items: [],
  theme: 'dark',
  lang: 'en',
  cursor: 0 // for swipe navigation
};

const els = {
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),
  itemForm: document.getElementById('itemForm'),
  itemId: document.getElementById('itemId'),
  itemTitle: document.getElementById('itemTitle'),
  itemDesc: document.getElementById('itemDesc'),
  itemImage: document.getElementById('itemImage'),
  itemCamera: document.getElementById('itemCamera'),
  imagePreview: document.getElementById('imagePreview'),
  cancelEdit: document.getElementById('cancelEdit'),
  settingsExport: document.getElementById('settingsExport'),
  settingsImport: document.getElementById('settingsImport'),
  settingsReset: document.getElementById('settingsReset')
};

async function init() {
  // Load meta (theme/lang)
  state.theme = (await DB.getMeta('theme')) || 'dark';
  state.lang = (await DB.getMeta('lang')) || 'en';

  UI.applyTheme(state.theme);
  const langControl = UI.initLang(async (val) => {
    state.lang = val;
    await DB.setMeta('lang', val);
    await I18n.load(val);
    UI.updateTexts();
  });

  await I18n.load(state.lang);
  langControl.set(state.lang);

  UI.initTabs();
  UI.initModal();
  UI.initNavigation();
  UI.setYear();
  UI.initInstall();

  UI.initTheme(async () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    UI.applyTheme(state.theme);
    await DB.setMeta('theme', state.theme);
  });

  UI.initSearch(() => UI.renderGrid(state.items));

  await reloadItems();
  bindEvents();
}

async function reloadItems() {
  state.items = await DB.getAllItems();
  state.items.sort((a, b) => (b.id || 0) - (a.id || 0));
  UI.renderGrid(state.items);
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function setPreview(src) {
  els.imagePreview.innerHTML = src ? `<img src="${src}" alt="preview" class="thumb" />` : '';
}

function clearForm() {
  els.itemId.value = '';
  els.itemTitle.value = '';
  els.itemDesc.value = '';
  els.itemImage.value = '';
  els.itemCamera.value = '';
  setPreview('');
}

function bindEvents() {
  // Image inputs
  els.itemImage.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await dataUrlFromFile(file);
    setPreview(url);
    els.itemImage.dataset.url = url;
  });
  els.itemCamera.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await dataUrlFromFile(file);
    setPreview(url);
    els.itemCamera.dataset.url = url;
  });

  // Save item
  els.itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = els.itemId.value ? Number(els.itemId.value) : undefined;
    const image = els.itemCamera.dataset.url || els.itemImage.dataset.url || null;
    const item = {
      id,
      title: els.itemTitle.value.trim(),
      description: els.itemDesc.value.trim(),
      image
    };
    if (!item.title) return;

    if (id) {
      await DB.updateItem(item);
    } else {
      delete item.id;
      const newId = await DB.addItem(item);
      item.id = newId;
    }

    clearForm();
    await reloadItems();
    // Switch back to catalog
    document.querySelector('[data-tab="catalog"]').click();
  });

  // Cancel edit
  els.cancelEdit.addEventListener('click', () => clearForm());

  // Export
  const exportHandler = async () => {
    const items = await DB.getAllItems();
    const blob = new Blob([JSON.stringify({ items }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `findit-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  els.exportBtn.addEventListener('click', exportHandler);
  els.settingsExport.addEventListener('click', exportHandler);

  // Import
  const importHandler = async (file) => {
    const text = await file.text();
    const json = JSON.parse(text);
    const items = Array.isArray(json.items) ? json.items : [];
    for (const it of items) {
      // Strip id to avoid clashes; let DB assign
      const { title, description, image } = it;
      await DB.addItem({ title, description, image });
    }
    await reloadItems();
  };
  els.importInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await importHandler(file);
    e.target.value = '';
  });
  els.settingsImport.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await importHandler(file);
    e.target.value = '';
  });

  // Reset
  const resetHandler = async () => {
    const ok = confirm('Delete all data? This cannot be undone.');
    if (!ok) return;
    await DB.clearAll();
    await reloadItems();
    clearForm();
    // Reset meta defaults
    state.theme = 'dark';
    state.lang = 'en';
    await DB.setMeta('theme', state.theme);
    await DB.setMeta('lang', state.lang);
    UI.applyTheme(state.theme);
    await I18n.load(state.lang);
    UI.updateTexts();
  };
  els.resetBtn.addEventListener('click', resetHandler);
  els.settingsReset.addEventListener('click', resetHandler);

  // Edit/delete from UI custom events
  window.addEventListener('ui:edit', (ev) => {
    const it = ev.detail;
    document.querySelector('[data-tab="addEdit"]').click();
    els.itemId.value = it.id;
    els.itemTitle.value = it.title || '';
    els.itemDesc.value = it.description || '';
    setPreview(it.image || '');
    els.itemImage.dataset.url = it.image || '';
    els.itemCamera.dataset.url = '';
  });
  window.addEventListener('ui:delete', async (ev) => {
    const id = ev.detail;
    await DB.deleteItem(id);
    await reloadItems();
  });

  // Swipe navigation: move cursor and open image
  window.addEventListener('ui:swipeRight', () => navigate(-1));
  window.addEventListener('ui:swipeLeft', () => navigate(+1));
}

function navigate(delta) {
  if (state.items.length === 0) return;
  state.cursor = (state.cursor + delta + state.items.length) % state.items.length;
  const item = state.items[state.cursor];
  // open preview
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('modalImage');
  img.src = item.image || '';
  modal.setAttribute('aria-hidden', 'false');
}

window.addEventListener('DOMContentLoaded', init);
