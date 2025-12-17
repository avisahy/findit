// ui.js – rendering and UI helpers for FindIt

(function () {
  const TAG_FILTER_ID = 'tag-filter';
  const SEARCH_INPUT_ID = 'search-input';

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function extractTags(items) {
    const set = new Set();
    items.forEach(item => {
      (item.tags || []).forEach(tag => {
        if (tag && typeof tag === 'string') set.add(tag);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function renderTagsFilter(items) {
    const select = document.getElementById(TAG_FILTER_ID);
    if (!select) return;
    const prev = select.value || '';

    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = window.FindItI18n
      ? window.FindItI18n.t('catalog.allTags')
      : 'All tags';
    select.appendChild(allOption);

    const tags = extractTags(items);
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      select.appendChild(option);
    });

    if (prev && tags.includes(prev)) {
      select.value = prev;
    }
  }

  function buildCard(item) {
    const card = document.createElement('article');
    card.className = 'catalog-card';
    card.setAttribute('role', 'listitem');

    const header = document.createElement('div');
    header.className = 'catalog-card-header';

    const title = document.createElement('h3');
    title.className = 'catalog-card-title';
    title.textContent = item.title || '';
    header.appendChild(title);

    const dates = document.createElement('div');
    dates.className = 'catalog-card-dates';
    const created = formatDate(item.createdAt);
    const updated = formatDate(item.updatedAt);
    dates.textContent = created && updated
      ? `${created} · ${updated}`
      : created || updated || '';
    header.appendChild(dates);

    card.appendChild(header);

    if (item.description) {
      const desc = document.createElement('p');
      desc.className = 'catalog-card-description';
      desc.textContent = item.description;
      card.appendChild(desc);
    }

    if (item.image) {
      const wrap = document.createElement('div');
      wrap.className = 'catalog-card-image-wrapper';
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.title || '';
      img.loading = 'lazy';
      wrap.appendChild(img);
      card.appendChild(wrap);
    }

    if (item.tags && item.tags.length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'catalog-card-tags';
      item.tags.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.textContent = tag;
        tagsContainer.appendChild(pill);
      });
      card.appendChild(tagsContainer);
    }

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-button';
    editButton.textContent = window.FindItI18n
      ? window.FindItI18n.t('catalog.edit')
      : 'Edit';
    editButton.addEventListener('click', () => {
      window.location.href = `item.html?id=${encodeURIComponent(item.id)}`;
    });
    actions.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-button';
    deleteButton.textContent = window.FindItI18n
      ? window.FindItI18n.t('catalog.delete')
      : 'Delete';
    deleteButton.addEventListener('click', async () => {
      const confirmText = window.FindItI18n
        ? window.FindItI18n.t('catalog.confirmDelete')
        : 'Delete this item?';
      if (!window.confirm(confirmText)) return;
      await window.FindItDb.deleteItem(item.id);
      window.FindItApp.refreshCatalog();
    });
    actions.appendChild(deleteButton);

    card.appendChild(actions);

    return card;
  }

  function matchesFilters(item, searchText, tagFilter) {
    const text = searchText.trim().toLowerCase();
    const matchesText = !text ||
      (item.title && item.title.toLowerCase().includes(text)) ||
      (item.description && item.description.toLowerCase().includes(text)) ||
      (item.tags || []).some(t => t.toLowerCase().includes(text));
    const matchesTag = !tagFilter ||
      (item.tags || []).includes(tagFilter);
    return matchesText && matchesTag;
  }

  async function renderCatalog() {
    const container = document.getElementById('catalog-grid');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;

    container.setAttribute('aria-busy', 'true');

    const items = await window.FindItDb.getAllItems();
    const searchEl = document.getElementById(SEARCH_INPUT_ID);
    const tagEl = document.getElementById(TAG_FILTER_ID);
    const searchText = searchEl ? searchEl.value : '';
    const tagFilter = tagEl ? tagEl.value : '';

    const filtered = items
      .filter(item => matchesFilters(item, searchText, tagFilter))
      .sort((a, b) => {
        const da = a.updatedAt || a.createdAt || '';
        const db = b.updatedAt || b.createdAt || '';
        return db.localeCompare(da);
      });

    container.innerHTML = '';
    if (!filtered.length) {
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;
      const fragment = document.createDocumentFragment();
      filtered.forEach(item => {
        fragment.appendChild(buildCard(item));
      });
      container.appendChild(fragment);
    }

    renderTagsFilter(items);
    container.setAttribute('aria-busy', 'false');
  }

  window.FindItUI = {
    renderCatalog
  };
}());
