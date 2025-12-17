// findit/js/ui.js
import { I18n } from './i18n.js';

export const UI = (() => {
  const els = {
    tabs: document.querySelectorAll('.tab'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    grid: document.getElementById('catalogGrid'),
    empty: document.getElementById('emptyState'),
    search: document.getElementById('searchInput'),
    modal: document.getElementById('imageModal'),
    modalImg: document.getElementById('modalImage'),
    closeModal: document.getElementById('closeModal'),
    year: document.getElementById('year'),
    themeToggle: document.getElementById('themeToggle'),
    settingsTheme: document.getElementById('settingsTheme'),
    langSelect: document.getElementById('langSelect'),
    settingsLang: document.getElementById('settingsLang'),
    installBtn: document.getElementById('installBtn')
  };

  let beforeInstallPrompt = null;

  function initTabs() {
    els.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        els.tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
        els.tabs.forEach((t) => t.classList.toggle('active', t.id === tabId));
      });
    });
  }

  function renderGrid(items) {
    const q = (els.search.value || '').toLowerCase();
    const filtered = items.filter((it) => (it.title || '').toLowerCase().includes(q));
    els.grid.innerHTML = '';
    if (filtered.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;
    filtered.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card catalog-item';
      card.innerHTML = `
        <img class="thumb" src="${item.image || ''}" alt="${item.title || ''}" />
        <div class="title">${item.title || ''}</div>
        <div class="desc">${item.description || ''}</div>
        <div class="row">
          <div class="muted">#${item.id ?? ''}</div>
          <div class="actions">
            <button class="btn" data-action="edit">Edit</button>
            <button class="btn danger" data-action="delete">Delete</button>
          </div>
        </div>
      `;
      const img = card.querySelector('.thumb');
      img.addEventListener('click', () => openImage(item.image));
      card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        const ev = new CustomEvent('ui:edit', { detail: item });
        window.dispatchEvent(ev);
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        const ev = new CustomEvent('ui:delete', { detail: item.id });
        window.dispatchEvent(ev);
      });
      els.grid.appendChild(card);
    });
  }

  function openImage(src) {
    if (!src) return;
    els.modalImg.src = src;
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function closeImage() {
    els.modal.setAttribute('aria-hidden', 'true');
    els.modalImg.src = '';
  }

  function initModal() {
    els.closeModal.addEventListener('click', closeImage);
    els.modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) closeImage();
    });
  }

  // Swipe + arrows navigation between catalog items
  function initNavigation() {
    let startX = null;
    els.grid.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].clientX;
    });
    els.grid.addEventListener('touchend', (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        const ev = new CustomEvent(dx > 0 ? 'ui:swipeRight' : 'ui:swipeLeft');
        window.dispatchEvent(ev);
      }
      startX = null;
    });
    els.grid.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') window.dispatchEvent(new CustomEvent('ui:swipeRight'));
      if (e.key === 'ArrowLeft') window.dispatchEvent(new CustomEvent('ui:swipeLeft'));
    });
  }

  function setYear() {
    els.year.textContent = new Date().getFullYear();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme(onToggle) {
    els.themeToggle.addEventListener('click', () => onToggle());
    els.settingsTheme.addEventListener('click', () => onToggle());
  }

  function initLang(onChange) {
    const set = (val) => {
      els.langSelect.value = val;
      els.settingsLang.value = val;
    };
    els.langSelect.addEventListener('change', (e) => onChange(e.target.value));
    els.settingsLang.addEventListener('change', (e) => onChange(e.target.value));
    return { set };
  }

  function initSearch(onSearch) {
    els.search.addEventListener('input', () => onSearch(els.search.value));
  }

  function initInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      beforeInstallPrompt = e;
      els.installBtn.style.display = 'inline-flex';
    });
    els.installBtn.addEventListener('click', async () => {
      if (!beforeInstallPrompt) return;
      beforeInstallPrompt.prompt();
      const choice = await beforeInstallPrompt.userChoice;
      beforeInstallPrompt = null;
      if (choice.outcome !== 'accepted') {
        // do nothing
      }
    });
    window.addEventListener('appinstalled', () => {
      els.installBtn.style.display = 'none';
    });
  }

  function updateTexts() {
    I18n.applyToDocument();
    // Update placeholder
    I18n.applyPlaceholder(els.search, 'search_placeholder');
  }

  return {
    initTabs,
    renderGrid,
    initModal,
    initNavigation,
    setYear,
    applyTheme,
    initTheme,
    initLang,
    initSearch,
    initInstall,
    updateTexts
  };
})();
