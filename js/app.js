import { dbInit, dbGetAll, dbPut, dbDelete, dbClearAll } from './db.js';
import { i18nInit, i18nT } from './i18n.js';
import { uiInitNavigation, uiInitDarkMode, renderCatalog, viewerInit } from './ui.js';

let items = [];
const viewer = viewerInit();

async function refresh() {
  items = await dbGetAll();
  renderCatalog(items, handleEdit, handleDelete, handleView);
  document.getElementById('emptyState').hidden = items.length > 0;
}

function handleView(item) {
  if (!item.image) return;
  viewer.open(item.image, item.title || '');
}

function handleEdit(item) {
  location.hash = '#editor';
  document.getElementById('editorTitle').textContent = i18nT('editItem');
  document.getElementById('itemId').value = item.id;
  document.getElementById('itemTitle').value = item.title || '';
  document.getElementById('itemDesc').value = item.description || '';
  setPreview(item.image);
}

async function handleDelete(id) {
  if (!confirm(i18nT('confirmDelete'))) return;
  await dbDelete(id);
  refresh();
}

function setPreview(dataUrl) {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';
  if (!dataUrl) return;
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'preview';
  img.loading = 'lazy';
  img.addEventListener('click', () => viewer.open(dataUrl, 'preview'));
  preview.appendChild(img);
}

// Image input handling
function initImageInputs() {
  const fileInput = document.getElementById('itemImage');
  const cameraBtn = document.getElementById('cameraBtn');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setPreview(dataUrl);
    fileInput.dataset.dataUrl = dataUrl;
  });

  cameraBtn.addEventListener('click', async () => {
    // Use input capture for broad support
    const a = document.createElement('input');
    a.type = 'file';
    a.accept = 'image/*';
    a.capture = 'environment';
    a.addEventListener('change', async () => {
      const file = a.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataURL(file);
      setPreview(dataUrl);
      document.getElementById('itemImage').dataset.dataUrl = dataUrl;
    });
    a.click();
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// Form submit
function initEditorForm() {
  const form = document.getElementById('itemForm');
  const cancel = document.getElementById('cancelEdit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('itemId').value || undefined;
    const title = document.getElementById('itemTitle').value.trim();
    const description = document.getElementById('itemDesc').value.trim();
    const image = document.getElementById('itemImage').dataset.dataUrl || undefined;

    if (!title) {
      alert(i18nT('titleRequired'));
      return;
    }

    await dbPut({ id, title, description, image });
    // Reset form
    form.reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemImage').dataset.dataUrl = '';
    document.getElementById('imagePreview').innerHTML = '';

    location.hash = '#catalog';
    refresh();
  });

  cancel.addEventListener('click', () => {
    form.reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemImage').dataset.dataUrl = '';
    document.getElementById('imagePreview').innerHTML = '';
    location.hash = '#catalog';
  });
}

// Export / Import
function initImportExport() {
  const exportJson = document.getElementById('exportJson');
  const exportCsv = document.getElementById('exportCsv');
  const importFile = document.getElementById('importFile');

  exportJson.addEventListener('click', async () => {
    const data = await dbGetAll();
    const blob = new Blob([JSON.stringify({ version: 1, items: data }, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'findit-export.json');
  });

  exportCsv.addEventListener('click', async () => {
    const data = await dbGetAll();
    const header = ['id', 'title', 'description', 'image', 'createdAt'];
    const lines = [header.join(',')];
    data.forEach((i) => {
      const row = header.map((k) => csvEscape(String(i[k] ?? '')));
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, 'findit-export.csv');
  });

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      if (file.name.endsWith('.json')) {
        const json = JSON.parse(text);
        if (!json || !Array.isArray(json.items)) throw new Error('Invalid schema');
        for (const item of json.items) {
          validateItem(item);
          await dbPut(item);
        }
      } else if (file.name.endsWith('.csv')) {
        const itemsFromCsv = parseCsv(text);
        for (const item of itemsFromCsv) {
          validateItem(item);
          await dbPut(item);
        }
      } else {
        throw new Error('Unsupported file type');
      }
      alert(i18nT('importSuccess'));
      refresh();
    } catch (err) {
      console.error(err);
      alert(i18nT('importError'));
    } finally {
      e.target.value = '';
    }
  });
}

function validateItem(item) {
  // Minimal schema validation
  if (typeof item.title !== 'string' || item.title.trim() === '') {
    throw new Error('Invalid title');
  }
  item.description = typeof item.description === 'string' ? item.description : '';
  item.image = typeof item.image === 'string' ? item.image : '';
  item.id = item.id || crypto.randomUUID();
  item.createdAt = Number(item.createdAt || Date.now());
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',');
  const items = lines.map((line) => {
    const cols = splitCsvLine(line);
    const obj = {};
    header.forEach((h, idx) => obj[h] = cols[idx] ?? '');
    obj.createdAt = Number(obj.createdAt || Date.now());
    return obj;
  });
  return items;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.replace(/\r/g, ''));
}

function csvEscape(s) {
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reset
function initReset() {
  document.getElementById('resetApp').addEventListener('click', async () => {
    if (!confirm(i18nT('confirmReset'))) return;
    await dbClearAll();
    localStorage.clear();
    location.reload();
  });
}

function initMeta() {
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('versionInfo').textContent = 'Version 1.0.0';
}

(async function boot() {
  uiInitDarkMode();
  await i18nInit();
  uiInitNavigation();
  initEditorForm();
  initImageInputs();
  initImportExport();
  initReset();
  initMeta();
  await dbInit();
  await refresh();
})();
