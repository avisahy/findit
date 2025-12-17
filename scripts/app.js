// app.js – main behavior per page

(function () {
  const THEME_STORAGE_KEY = 'findit-theme';

  function applyTheme(theme) {
    const darkLink = document.getElementById('dark-theme-link');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = theme === 'dark' || (theme === 'auto' && prefersDark);

    if (darkLink) darkLink.disabled = !useDark;
    if (useDark) {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
  }

  function initThemeControls() {
    const select = document.getElementById('theme-select');
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
    applyTheme(storedTheme);

    if (select) {
      select.value = storedTheme;
      select.addEventListener('change', () => {
        const value = select.value;
        localStorage.setItem(THEME_STORAGE_KEY, value);
        applyTheme(value);
      });
    } else {
      applyTheme(storedTheme);
    }
  }

  function initCatalogPage() {
    const searchInput = document.getElementById('search-input');
    const tagFilter = document.getElementById('tag-filter');

    let searchTimeout = null;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchTimeout) window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          window.FindItUI.renderCatalog();
        }, 80);
      });
    }

    if (tagFilter) {
      tagFilter.addEventListener('change', () => {
        window.FindItUI.renderCatalog();
      });
    }

    const importJsonButton = document.getElementById('import-json-button');
    const exportJsonButton = document.getElementById('export-json-button');
    const importCsvButton = document.getElementById('import-csv-button');
    const exportCsvButton = document.getElementById('export-csv-button');
    const fileInput = document.getElementById('file-input');

    if (importJsonButton && fileInput) {
      importJsonButton.addEventListener('click', () => {
        fileInput.accept = '.json,application/json';
        fileInput.dataset.importType = 'json';
        fileInput.click();
      });
    }

    if (importCsvButton && fileInput) {
      importCsvButton.addEventListener('click', () => {
        fileInput.accept = '.csv,text/csv';
        fileInput.dataset.importType = 'csv';
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || !fileInput.files[0]) return;
        const file = fileInput.files[0];
        const type = fileInput.dataset.importType || 'json';
        const text = await file.text();
        try {
          let items = [];
          if (type === 'json') {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) items = parsed;
          } else {
            items = parseCsv(text);
          }
          if (items.length) {
            await window.FindItDb.importItems(items);
            await window.FindItUI.renderCatalog();
          }
        } catch (err) {
          console.error('Import failed', err);
          alert('Import failed. Please check your file format.');
        } finally {
          fileInput.value = '';
        }
      });
    }

    if (exportJsonButton) {
      exportJsonButton.addEventListener('click', async () => {
        const items = await window.FindItDb.getAllItems();
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        downloadBlob(blob, 'findit-catalog.json');
      });
    }

    if (exportCsvButton) {
      exportCsvButton.addEventListener('click', async () => {
        const items = await window.FindItDb.getAllItems();
        const csv = toCsv(items);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, 'findit-catalog.csv');
      });
    }

    window.FindItApp.refreshCatalog = () => {
      window.FindItUI.renderCatalog();
    };
    window.FindItUI.renderCatalog();
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = lines[i].split(',');
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ? cells[idx].trim() : '';
      });
      if (obj.tags && typeof obj.tags === 'string') {
        obj.tags = obj.tags.split(';').map(t => t.trim()).filter(Boolean);
      }
      result.push(obj);
    }
    return result;
  }

  function toCsv(items) {
    const headers = ['id', 'title', 'description', 'image', 'tags', 'createdAt', 'updatedAt'];
    const lines = [];
    lines.push(headers.join(','));
    items.forEach(item => {
      const row = headers.map(h => {
        let value = item[h];
        if (Array.isArray(value)) {
          value = value.join(';');
        }
        if (typeof value === 'string') {
          const escaped = value.replace(/"/g, '""');
          if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
            return `"${escaped}"`;
          }
          return escaped;
        }
        return value != null ? String(value) : '';
      });
      lines.push(row.join(','));
    });
    return lines.join('\n');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function initItemPage() {
    const form = document.getElementById('item-form');
    const titleEl = document.getElementById('item-title');
    const descEl = document.getElementById('item-description');
    const tagsEl = document.getElementById('item-tags');
    const idEl = document.getElementById('item-id');
    const imageInput = document.getElementById('item-image-input');
    const clearImageButton = document.getElementById('clear-image-button');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const cancelButton = document.getElementById('cancel-item-button');
    const deleteButton = document.getElementById('delete-item-button');

    let existingItem = null;
    let imageData = null;

    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');

    if (id) {
      existingItem = await window.FindItDb.getItem(id);
      if (existingItem) {
        idEl.value = existingItem.id;
        titleEl.value = existingItem.title || '';
        descEl.value = existingItem.description || '';
        tagsEl.value = (existingItem.tags || []).join(', ');
        if (existingItem.image) {
          imageData = existingItem.image;
          previewImg.src = imageData;
          previewContainer.hidden = false;
        }
        deleteButton.hidden = false;
      }
    }

    if (imageInput) {
      imageInput.addEventListener('change', async () => {
        if (!imageInput.files || !imageInput.files[0]) return;
        const file = imageInput.files[0];
        if (!file.type.startsWith('image/')) return;
        try {
          imageData = await readImageFile(file);
          previewImg.src = imageData;
          previewContainer.hidden = false;
        } catch (err) {
          console.error('Failed to read image', err);
          alert('Could not read image.');
        }
      });
    }

    if (clearImageButton) {
      clearImageButton.addEventListener('click', () => {
        imageData = null;
        if (previewContainer) previewContainer.hidden = true;
        if (previewImg) previewImg.src = '';
        if (imageInput) imageInput.value = '';
      });
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', (event) => {
        event.preventDefault();
        window.history.length > 1 ? window.history.back() : window.location.assign('index.html');
      });
    }

    if (deleteButton) {
      deleteButton.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!existingItem) return;
        const confirmText = window.FindItI18n
          ? window.FindItI18n.t('item.confirmDelete')
          : 'Delete this item permanently?';
        if (!window.confirm(confirmText)) return;
        await window.FindItDb.deleteItem(existingItem.id);
        window.location.assign('index.html');
      });
    }

    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!titleEl.value.trim()) {
          titleEl.focus();
          titleEl.setAttribute('aria-invalid', 'true');
          return;
        }
        const tagsText = tagsEl.value || '';
        const tags = tagsText
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        const data = {
          id: idEl.value || undefined,
          title: titleEl.value.trim(),
          description: descEl.value.trim(),
          tags,
          image: imageData
        };

        const saved = await window.FindItDb.saveItem(data);
        idEl.value = saved.id;
        window.location.assign('index.html');
      });
    }
  }

  function initSettingsPage() {
    const clearButton = document.getElementById('clear-data-button');
    if (clearButton) {
      clearButton.addEventListener('click', async () => {
        const message = window.FindItI18n
          ? window.FindItI18n.t('settings.confirmClear')
          : 'Clear all data from this device?';
        if (!window.confirm(message)) return;
        await window.FindItDb.clearAll();
        alert(window.FindItI18n ? window.FindItI18n.t('settings.cleared') : 'All data cleared.');
      });
    }
  }

  function initMenuButton() {
    const button = document.getElementById('menu-button');
    if (!button) return;
    button.addEventListener('click', () => {
      const nav = document.querySelector('.header-nav');
      if (!nav) return;
      const visible = nav.style.display === 'flex';
      nav.style.display = visible ? 'none' : 'flex';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initThemeControls();
    initMenuButton();

    const page = document.body.getAttribute('data-page');
    if (page === 'index') {
      initCatalogPage();
    } else if (page === 'item') {
      initItemPage();
    } else if (page === 'settings') {
      initSettingsPage();
    }

    window.FindItApp = window.FindItApp || {};
  });
}());
