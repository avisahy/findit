import { i18nT } from './i18n.js';

let touchStartX = 0;
let touchEndX = 0;
let activeView = 'catalog';

function showPanel(id) {
  document.querySelectorAll('main > section, .panel').forEach((s) => {
    if (s.id === id) {
      s.hidden = false;
    } else {
      s.hidden = true;
    }
  });
  activeView = id;
}

export function uiInitNavigation() {
  // Hash-based navigation
  function navigate() {
    const hash = location.hash.replace('#', '') || 'catalog';
    if (hash === 'add') showPanel('editor');
    else if (hash === 'settings') showPanel('settings');
    else if (hash === 'about') showPanel('about');
    else showPanel('catalog');
    updateAriaForView();
  }
  window.addEventListener('hashchange', navigate);
  navigate();

  // Keyboard arrows (left/right switch sections)
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const order = ['catalog', 'editor', 'settings', 'about'];
      const idx = order.indexOf(activeView);
      const next = e.key === 'ArrowRight' ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
      location.hash = `#${order[next]}`;
    }
  });

  // Swipe gestures
  const view = document.getElementById('view');
  view.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  view.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) > 50) {
      const order = ['catalog', 'editor', 'settings', 'about'];
      const idx = order.indexOf(activeView);
      const next = delta < 0 ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
      location.hash = `#${order[next]}`;
    }
  });
}

function updateAriaForView() {
  document.querySelectorAll('main > section').forEach((s) => {
    s.setAttribute('aria-hidden', s.hidden ? 'true' : 'false');
  });
}

// Dark mode toggle
export function uiInitDarkMode() {
  const key = 'findit-theme';
  const saved = localStorage.getItem(key) || 'dark';
  setTheme(saved);

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(key, theme);
    const btn = document.getElementById('darkToggle');
    const icon = document.getElementById('darkIcon');
    const pressed = theme === 'dark';
    btn?.setAttribute('aria-pressed', String(pressed));
    if (icon) icon.textContent = pressed ? '🌙' : '🌞';
  }

  document.getElementById('darkToggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('settingsDarkToggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// Catalog render helpers
export function renderCatalog(items, onEdit, onDelete, onView) {
  const grid = document.getElementById('catalogGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (!items || items.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const frag = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', item.title);

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = item.title || '';
    img.src = item.image || '';
    img.addEventListener('click', () => onView(item));
    card.appendChild(img);

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.textContent = item.title;
    body.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = item.description || '';
    body.appendChild(desc);

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'link-btn';
    editBtn.textContent = i18nT('edit');
    editBtn.addEventListener('click', () => onEdit(item));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'danger-btn';
    delBtn.textContent = i18nT('delete');
    delBtn.addEventListener('click', () => onDelete(item.id));
    actions.appendChild(delBtn);

    body.appendChild(actions);
    card.appendChild(body);
    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

// Image viewer with pinch and double-tap zoom
export function viewerInit() {
  const overlay = document.getElementById('viewerOverlay');
  const inner = document.getElementById('viewerInner');
  const img = document.getElementById('viewerImg');
  const close = document.getElementById('viewerClose');

  let scale = 1;
  let lastTap = 0;

  close.addEventListener('click', () => {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    img.src = '';
    scale = 1;
    inner.style.transform = 'scale(1)';
  });

  inner.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const [t1, t2] = e.touches;
      inner.dataset.initialDist = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
    }
  });

  inner.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
      const initial = Number(inner.dataset.initialDist || dist);
      const factor = dist / initial;
      scale = Math.min(4, Math.max(1, scale * factor));
      inner.style.transform = `scale(${scale})`;
      e.preventDefault();
    }
  }, { passive: false });

  inner.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      scale = scale >= 2 ? 1 : 2;
      inner.style.transform = `scale(${scale})`;
    }
    lastTap = now;
  });

  return {
    open(src, alt = '') {
      img.src = src;
      img.alt = alt;
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      inner.style.transform = 'scale(1)';
      scale = 1;
    }
  };
}
