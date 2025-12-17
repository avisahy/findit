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
}

function closeImageModal() {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  img.src = "";
  img.alt = "";
  modal.classList.remove("open");
}

function bindImageModalEvents() {
  const modal = document.getElementById("image-modal");
  const backdrop = modal.querySelector(".image-modal-backdrop");
  const closeBtn = document.getElementById("image-modal-close");
  backdrop.addEventListener("click", closeImageModal);
  closeBtn.addEventListener("click", closeImageModal);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeImageModal(); });
}

function createItemCard(item) {
  const template = document.getElementById("item-card-template");
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".item-card");

  card.querySelector(".item-name").textContent = item.name || "";
  const categoryBadge = card.querySelector(".item-category-badge");
  categoryBadge.textContent = item.category || "";
  categoryBadge.style.display = item.category ? "inline-block" : "none";
  card.querySelector(".item-description").textContent = item.description || "";
  card.querySelector(".item-location-row").textContent = item.location ? `📍 ${item.location}` : "";

  const imgEl = card.querySelector(".item-image");
  if (item.imageDataUrl) {
    imgEl.src = item.imageDataUrl;
    imgEl.alt = item.name || "";
    imgEl.style.display = "block";
    imgEl.addEventListener("click", () => openImageModal(item.imageDataUrl, item.name));
  } else {
    imgEl.style.display = "none";
  }

  translateDynamicCardButtons(card);

  card.querySelector('[data-action="edit"]').addEventListener("click", () => {
    fillFormForEdit(item);
    switchTab("add");
    showSlideTooltipOnce();
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
  document.getElementById("item-name").value = "";
  document.getElementById("item-description").value = "";
  document.getElementById("item-category").value = "";
  document.getElementById("item-location").value = "";
  document.getElementById("item-image").value = "";
  const preview = document.getElementById("preview-img");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
  document.getElementById("btn-remove-picture").style.display = "none";
}

function fillFormForEdit(item, index = null) {
  document.getElementById("item-id").value = item.id || "";
  document.getElementById("item-index").value = index !== null ? index : "";
  document.getElementById("item-name").value = item.name || "";
  document.getElementById("item-description").value = item.description || "";
  document.getElementById("item-category").value = item.category || "";
  document.getElementById("item-location").value = item.location || "";
  document.getElementById("item-image").value = "";

  const preview = document.getElementById("preview-img");
  if (preview && item.imageDataUrl) {
    preview.src = item.imageDataUrl;
    preview.style.display = "block";
    document.getElementById("btn-remove-picture").style.display = "inline-block";
  } else {
    preview.src = "";
    preview.style.display = "none";
    document.getElementById("btn-remove-picture").style.display = "none";
  }
}

async function refreshItems() {
  const listEl = document.getElementById("items-list");
  const emptyState = document.getElementById("empty-state");
  const searchValue = (document.getElementById("search-input").value || "").toLowerCase();

  const items = await dbGetAllItems();
  listEl.innerHTML = "";

  const filtered = items.filter(item => {
    const text = [item.name, item.description, item.category, item.location].join(" ").toLowerCase();
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

async function navigateEdit(direction) {
  const items = await dbGetAllItems();
  if (!items.length) return;

  const currentIndexRaw = document.getElementById("item-index").value;
  let currentIndex = currentIndexRaw === "" ? -1 : Number(currentIndexRaw);

  if (currentIndex === -1) {
    currentIndex = direction === "next" ? 0 : items.length - 1;
  } else {
    currentIndex = direction === "next"
      ? (currentIndex + 1) % items.length
      : (currentIndex - 1 + items.length) % items.length;
  }

  const item = items[currentIndex];
  fillFormForEdit(item, currentIndex);
  switchTab("add");
}

function showSlideTooltipOnce() {
  if (localStorage.getItem("slideTooltipShown")) return;
  const tooltip = document.getElementById("slide-tooltip");
  tooltip.style.display = "block";
  setTimeout(() => {
    tooltip.style.display = "none";
    localStorage.setItem("slideTooltipShown", "true");
  }, 5000);
}
