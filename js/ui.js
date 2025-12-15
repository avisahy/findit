function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function createItemCard(item) {
  const template = document.getElementById("item-card-template");
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".item-card");

  const imgEl = card.querySelector(".item-image");
  const titleEl = card.querySelector(".item-title");
  const descEl = card.querySelector(".item-description");
  const metaEl = card.querySelector(".item-meta");

  if (item.imageDataUrl) {
    imgEl.src = item.imageDataUrl;
    imgEl.alt = item.title || "";
    imgEl.style.display = "block";
  } else {
    imgEl.style.display = "none";
  }

  titleEl.textContent = item.title || "";
  descEl.textContent = item.description || "";

  const metaParts = [];
  if (item.category) metaParts.push(item.category);
  if (item.tags && item.tags.length) metaParts.push(`#${item.tags.join(" #")}`);
  metaEl.textContent = metaParts.join(" · ");

  card.dataset.id = item.id;

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

function fillFormForEdit(item) {
  document.getElementById("item-id").value = item.id || "";
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
  const emptyEl = document.getElementById("empty-message");
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
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  filtered.forEach(item => {
    listEl.appendChild(createItemCard(item));
  });
}
