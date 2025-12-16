function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function openImageModal(src, alt) {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  img.src = src;
  img.alt = alt || "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeImageModal() {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  img.src = "";
  img.alt = "";
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function bindImageModalEvents() {
  const modal = document.getElementById("image-modal");
  const backdrop = modal.querySelector(".image-modal-backdrop");
  const closeBtn = document.getElementById("image-modal-close");

  backdrop.addEventListener("click", closeImageModal);
  closeBtn.addEventListener("click", closeImageModal);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeImageModal();
  });

  const preview = document.getElementById("preview-img");
  if (preview) {
    preview.addEventListener("click", () => {
      if (!preview.src) return;
      openImageModal(preview.src, "preview");
    });
  }
}

function createItemCard(item) {
  const template = document.getElementById("item-card-template");
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".item-card");

  const imgEl = card.querySelector(".item-image");
  const titleEl = card.querySelector(".item-title");
  const descEl = card.querySelector(".item-description");
  const categoryBadge = card.querySelector(".item-category-badge");
  const tagsRow = card.querySelector(".item-tags-row");

  if (item.imageDataUrl) {
    imgEl.src = item.imageDataUrl;
    imgEl.alt = item.title || "";
    imgEl.style.display = "block";

    imgEl.addEventListener("click", () => {
      openImageModal(item.imageDataUrl, item.title);
    });
  } else {
    imgEl.style.display = "none";
  }

  titleEl.textContent = item.title || "";
  descEl.textContent = item.description || "";

  if (item.category) {
    categoryBadge.textContent = item.category;
    categoryBadge.style.display = "inline-block";
  } else {
    categoryBadge.style.display = "none";
  }

  tagsRow.innerHTML = "";
  if (item.tags && item.tags.length) {
    item.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "item-tag-pill";
      span.textContent = `#${tag}`;
      tagsRow.appendChild(span);
    });
  }

  card.dataset.id = item.id;

  // Translate buttons for current language
  translateDynamicCardButtons(card);

  card.querySelector('[data-action="edit"]').addEventListener("click", () => {
    fillFormForEdit(item);
    switchTab("add");
  });

  card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    if (window.confirm(t("confirm_delete_item"))) {
      await dbDeleteItem(item.id);
      refreshItems();
    }
  });

  return card;
}

function clearForm() {
  document.getElementById("item-id").value = "";
  document.getElementById("item-index").value = "";
  document.getElementById("item-title").value = "";
  document.getElementById("item-description").value = "";
  document.getElementById("item-category").value = "";
  document.getElementById("item-tags").value = "";
  document.getElementById("item-image").value = "";
  const preview = document.getElementById("preview-img");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
}

function fillFormForEdit(item, index = null) {
  document.getElementById("item-id").value = item.id || "";
  document.getElementById("item-index").value = index !== null ? index : "";
  document.getElementById("item-title").value = item.title || "";
  document.getElementById("item-description").value = item.description || "";
  document.getElementById("item-category").value = item.category || "";
  document.getElementById("item-tags").value = (item.tags || []).join(", ");
  document.getElementById("item-image").value = "";

  const preview = document.getElementById("preview-img");
  if (preview && item.imageDataUrl) {
    preview.src = item.imageDataUrl;
    preview.style.display = "block";
  } else if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
}

async function refreshItems() {
  const listEl = document.getElementById("items-list");
  const emptyState = document.getElementById("empty-state");
  const searchValue = (document.getElementById("search-input").value || "").toLowerCase();

  const items = await dbGetAllItems();
  listEl.innerHTML = "";

  const filtered = items.filter(item => {
    const text = [
      item.title,
      item.description,
      item.category,
      ...(item.tags || [])
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(searchValue);
  });

  if (!filtered.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  filtered.forEach((item, idx) => {
    listEl.appendChild(createItemCard(item));
  });
}

/* Navigation through items when editing */
async function navigateEdit(direction) {
  const items = await dbGetAllItems();
  if (!items.length) return;

  const currentIndexRaw = document.getElementById("item-index").value;
  let currentIndex = currentIndexRaw === "" ? -1 : Number(currentIndexRaw);

  if (currentIndex === -1) {
    // If editing not started, start from first/last depending on direction
    currentIndex = direction === "next" ? 0 : items.length - 1;
  } else {
    currentIndex =
      direction === "next"
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
  }

  const item = items[currentIndex];
  fillFormForEdit(item, currentIndex);
  switchTab("add");
}
