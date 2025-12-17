// app.js

// Progressive enhancement guard: only run if browser supports features we need
const supports = {
  fetch: 'fetch' in window,
  sw: 'serviceWorker' in navigator,
  storage: 'localStorage' in window,
  intersectionObserver: 'IntersectionObserver' in window,
};

const els = {
  grid: document.getElementById('grid'),
  search: document.getElementById('search'),
  category: document.getElementById('category'),
  favoritesOnly: document.getElementById('favoritesOnly'),
  resetFilters: document.getElementById('resetFilters'),
  status: document.getElementById('status'),
  year: document.getElementById('year'),
  installBtn: document.getElementById('installBtn'),
};

const STATE = {
  items: [],
  categories: new Set(),
  favorites: new Set(JSON.parse(localStorage.getItem('favorites') || '[]')),
  installPromptEvent: null,
};

document.addEventListener('DOMContentLoaded', () => {
  els.year.textContent = new Date().getFullYear();

  // Register service worker
  if (supports.sw) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // PWA install prompt handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    STATE.installPromptEvent = e;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener('click', async () => {
    if (!STATE.installPromptEvent) return;
    const outcome = await STATE.installPromptEvent.prompt();
    // outcome.outcome can be 'accepted' or 'dismissed'
    STATE.installPromptEvent = null;
    els.installBtn.hidden = true;
  });

  // Load data
  loadItems().then(() => {
    renderCategories();
    renderGrid();
    bindEvents();
    announce(`Loaded ${STATE.items.length} items`);
  });
});

async function loadItems() {
  try {
    // Dynamic data from JSON
    const res = await fetch('./items.json', { cache: 'no-store' });
    const json = await res.json();
    STATE.items = Array.isArray(json) ? json : (json.items || []);
    // Collect categories
    STATE.items.forEach((it) => {
      if (it.category) STATE.categories.add(it.category);
    });
  } catch (err) {
    console.error(err);
    announce('Failed to load items. Showing empty catalog.');
    STATE.items = [];
  }
}

function bindEvents() {
  els.search.addEventListener('input', debounce(renderGrid, 200));
  els.category.addEventListener('change', renderGrid);
  els.favoritesOnly.addEventListener('change', renderGrid);
  els.resetFilters.addEventListener('click', () => {
    els.search.value = '';
    els.category.value = '';
    els.favoritesOnly.checked = false;
    renderGrid();
  });
}

function renderCategories() {
  const current = els.category.value;
  els.category.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'All categories';
  els.category.appendChild(allOpt);

  Array.from(STATE.categories).sort().forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    els.category.appendChild(opt);
  });

  if (current && STATE.categories.has(current)) {
    els.category.value = current;
  }
}

function renderGrid() {
  const term = els.search.value.trim().toLowerCase();
  const category = els.category.value;
  const favOnly = els.favoritesOnly.checked;

  const filtered = STATE.items.filter((it) => {
    const matchesTerm =
      !term ||
      (it.title && it.title.toLowerCase().includes(term)) ||
      (it.description && it.description.toLowerCase().includes(term)) ||
      (it.tags && it.tags.some((t) => String(t).toLowerCase().includes(term)));
    const matchesCat = !category || it.category === category;
    const isFav = STATE.favorites.has(it.id);
    const matchesFav = !favOnly || isFav;
    return matchesTerm && matchesCat && matchesFav;
  });

  // Clear grid
  els.grid.innerHTML = '';

  if (filtered.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No items match your filters.';
    p.setAttribute('role', 'note');
    p.style.color = '#9ca3af';
    els.grid.appendChild(p);
    announce('No results.');
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach((it) => fragment.appendChild(createCard(it)));

  els.grid.appendChild(fragment);
}

function createCard(it) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '-1');
  card.setAttribute('aria-label', `Item ${it.title}`);

  // Media
  const media = document.createElement('div');
  media.className = 'card-media';

  const picture = document.createElement('picture');

  // Source sets for responsive images (webp preferred)
  const srcWebp = document.createElement('source');
  srcWebp.type = 'image/webp';
  srcWebp.srcset = `${it.imageWebp || it.image}?w=400 400w, ${it.imageWebp || it.image}?w=800 800w, ${it.imageWebp || it.image}?w=1200 1200w`;
  srcWebp.sizes = '(max-width: 520px) 100vw, (max-width: 800px) 50vw, 25vw';

  const srcJpg = document.createElement('source');
  srcJpg.type = 'image/jpeg';
  srcJpg.srcset = `${it.image}?w=400 400w, ${it.image}?w=800 800w, ${it.image}?w=1200 1200w`;
  srcJpg.sizes = srcWebp.sizes;

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = it.image;
  img.alt = it.imageAlt || `${it.title} image`;

  picture.append(srcWebp, srcJpg, img);
  media.appendChild(picture);

  if (it.category) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = it.category;
    badge.setAttribute('aria-label', `Category ${it.category}`);
    media.appendChild(badge);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = it.title;

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = it.description || '';

  const price = document.createElement('div');
  price.className = 'card-price';
  price.textContent = formatPrice(it.price);

  body.append(title, desc, price);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const favBtn = document.createElement('button');
  favBtn.className = 'favorite-btn';
  favBtn.type = 'button';
  favBtn.setAttribute('aria-label', `Mark ${it.title} as favorite`);
  favBtn.setAttribute('aria-pressed', STATE.favorites.has(it.id) ? 'true' : 'false');
  favBtn.innerHTML = `<span class="favorite-icon" aria-hidden="true"></span><span>Favorite</span>`;

  favBtn.addEventListener('click', () => toggleFavorite(it.id, favBtn));

  actions.appendChild(favBtn);

  card.append(media, body, actions);

  return card;
}

function toggleFavorite(id, btn) {
  if (STATE.favorites.has(id)) {
    STATE.favorites.delete(id);
    btn.setAttribute('aria-pressed', 'false');
    announce('Removed from favorites');
  } else {
    STATE.favorites.add(id);
    btn.setAttribute('aria-pressed', 'true');
    announce('Added to favorites');
  }
  localStorage.setItem('favorites', JSON.stringify(Array.from(STATE.favorites)));

  // If "favorites only" is active, re-render to remove non-favorites
  if (els.favoritesOnly.checked) renderGrid();
}

function formatPrice(value) {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
  } catch {
    return `$${Number(value).toFixed(2)}`;
  }
}

function announce(text) {
  els.status.textContent = text;
}

// Debounce utility
function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
