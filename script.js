// Simple SPA-style navigation

const views = {
  home: document.getElementById("view-home"),
  edit: document.getElementById("view-edit"),
  details: document.getElementById("view-details"),
  settings: document.getElementById("view-settings"),
  about: document.getElementById("view-about"),
};

let currentView = "home";
let items = [];
let selectedItemId = null;
let pendingDeleteId = null;

const STORAGE_KEY_ITEMS = "findit_items";
const STORAGE_KEY_THEME = "findit_theme";

/* ---------- DOM references ---------- */

const itemsGrid = document.getElementById("itemsGrid");
const emptyState = document.getElementById("emptyState");

const fabAdd = document.getElementById("fabAdd");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const itemForm = document.getElementById("itemForm");
const itemIdInput = document.getElementById("itemId");
const itemNameInput = document.getElementById("itemName");
const itemCategoryInput = document.getElementById("itemCategory");
const itemLocationInput = document.getElementById("itemLocation");
const itemNotesInput = document.getElementById("itemNotes");
const editViewTitle = document.getElementById("editViewTitle");

const imageCameraInput = document.getElementById("itemImageCamera");
const imageFileInput = document.getElementById("itemImageFile");
const imagePreviewWrapper = document.getElementById("imagePreviewWrapper");
const imagePreview = document.getElementById("imagePreview");
const clearImageBtn = document.getElementById("clearImageBtn");

let currentImageDataUrl = null;

// Details
const detailsImageWrapper = document.getElementById("detailsImageWrapper");
const detailsImage = document.getElementById("detailsImage");
const detailsName = document.getElementById("detailsName");
const detailsCategory = document.getElementById("detailsCategory");
const detailsLocation = document.getElementById("detailsLocation");
const detailsNotes = document.getElementById("detailsNotes");
const editItemBtn = document.getElementById("editItemBtn");
const deleteItemBtn = document.getElementById("deleteItemBtn");

// Navigation buttons
const backFromEdit = document.getElementById("backFromEdit");
const backFromDetails = document.getElementById("backFromDetails");
const backFromSettings = document.getElementById("backFromSettings");
const backFromAbout = document.getElementById("backFromAbout");

const settingsBtn = document.getElementById("settingsBtn");
const aboutBtn = document.getElementById("aboutBtn");

const homeBtn = document.getElementById("homeBtn");

homeBtn.addEventListener("click", () => {
  showView("home");
});

// Settings
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const themeToggleSwitch = document.getElementById("themeToggleSwitch");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

// Category datalist
const categoryListDatalist = document.getElementById("categoryList");

// Delete modal
const deleteModal = document.getElementById("deleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

/* ---------- Initialization ---------- */

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadItems();
  renderItems();
  updateCategoryOptions();
  registerServiceWorker();
});

/* ---------- Theme ---------- */

function setTheme(mode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    themeIcon.textContent = "light_mode";
    themeToggleSwitch.checked = true;
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    themeIcon.textContent = "dark_mode";
    themeToggleSwitch.checked = false;
  }
  localStorage.setItem(STORAGE_KEY_THEME, mode);
}

function loadTheme() {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  if (stored === "dark" || stored === "light") {
    setTheme(stored);
  } else {
    // Simple preference detection
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

/* ---------- Items: storage ---------- */

function loadItems() {
  try {
    const json = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (!json) {
      items = [];
      return;
    }
    items = JSON.parse(json);
  } catch (e) {
    console.error("Failed to load items", e);
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

/* ---------- Items: CRUD ---------- */

function createItem(data) {
  const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  const item = {
    id,
    name: data.name.trim(),
    category: data.category.trim(),
    location: data.location.trim(),
    notes: data.notes.trim(),
    image: data.image || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  items.unshift(item);
  saveItems();
  return item;
}

function updateItem(id, updates) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = {
    ...items[idx],
    ...updates,
    name: updates.name?.trim() ?? items[idx].name,
    category: updates.category?.trim() ?? items[idx].category,
    location: updates.location?.trim() ?? items[idx].location,
    notes: updates.notes?.trim() ?? items[idx].notes,
    updatedAt: Date.now(),
  };
  saveItems();
}

function deleteItem(id) {
  items = items.filter((i) => i.id !== id);
  saveItems();
}

/* ---------- Rendering ---------- */

function renderItems() {
  const query = searchInput.value.toLowerCase().trim();
  const cat = categoryFilter.value;

  let filtered = items;
  if (query) {
    filtered = filtered.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    });
  }

  if (cat) {
    filtered = filtered.filter((item) => item.category === cat);
  }

  itemsGrid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  for (const item of filtered) {
    const card = document.createElement("article");
    card.className = "item-card";
    card.addEventListener("click", () => openDetailsView(item.id));

    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "item-thumb-wrapper";

    if (item.image) {
      const img = document.createElement("img");
      img.className = "item-thumb";
      img.src = item.image;
      thumbWrapper.appendChild(img);
    } else {
      const icon = document.createElement("span");
      icon.className = "material-icons-outlined item-no-thumb";
      icon.textContent = "inventory_2";
      thumbWrapper.appendChild(icon);
    }

    const body = document.createElement("div");
    body.className = "item-card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "item-title-row";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = item.name || "(No name)";

    titleRow.appendChild(title);

    if (item.category) {
      const catChip = document.createElement("div");
      catChip.className = "item-category";
      catChip.textContent = item.category;
      titleRow.appendChild(catChip);
    }

    const loc = document.createElement("div");
    loc.className = "item-location";
    loc.textContent = item.location || "";

    const notes = document.createElement("div");
    notes.className = "item-notes";
    notes.textContent = item.notes || "";

    body.appendChild(titleRow);
    if (item.location) body.appendChild(loc);
    if (item.notes) body.appendChild(notes);

    card.appendChild(thumbWrapper);
    card.appendChild(body);

    itemsGrid.appendChild(card);
  }
}

function updateCategoryOptions() {
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter((c) => c && c.trim()))
  ).sort((a, b) => a.localeCompare(b));

  categoryFilter.innerHTML = "<option value=''>All categories</option>";
  categoryListDatalist.innerHTML = "";

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat; // <- important for visibility
    categoryFilter.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = cat;
    categoryListDatalist.appendChild(opt2);
  });
}

/* ---------- Navigation helpers ---------- */

function showView(name) {
  Object.values(views).forEach((v) => v.classList.remove("active"));
  views[name].classList.add("active");
  currentView = name;
}

/* ---------- Edit/Add view ---------- */

function openAddView() {
  itemForm.reset();
  itemIdInput.value = "";
  currentImageDataUrl = null;
  imagePreviewWrapper.classList.add("hidden");
  imagePreview.src = "";
  clearImageBtn.classList.add("hidden"); // ✅ hide Remove button
  editViewTitle.textContent = "Add item";
  showView("edit");
}

function openEditView(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  itemIdInput.value = item.id;
  itemNameInput.value = item.name;
  itemCategoryInput.value = item.category;
  itemLocationInput.value = item.location;
  itemNotesInput.value = item.notes;
  currentImageDataUrl = item.image || null;

  if (item.image) {
    imagePreviewWrapper.classList.remove("hidden");
    imagePreview.src = item.image;
    clearImageBtn.classList.remove("hidden"); // ✅ show Remove button
  } else {
    imagePreviewWrapper.classList.add("hidden");
    imagePreview.src = "";
    clearImageBtn.classList.add("hidden"); // ✅ hide Remove button
  }

  editViewTitle.textContent = "Edit item";
  showView("edit");
}

/* ---------- Details view ---------- */

function openDetailsView(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  selectedItemId = item.id;

  detailsName.textContent = item.name || "(No name)";
  if (item.category) {
    detailsCategory.textContent = item.category;
    detailsCategory.style.display = "inline-block";
  } else {
    detailsCategory.style.display = "none";
  }
  if (item.location) {
    detailsLocation.textContent = "Location: " + item.location;
    detailsLocation.style.display = "block";
  } else {
    detailsLocation.style.display = "none";
  }
  if (item.notes) {
    detailsNotes.textContent = item.notes;
    detailsNotes.style.display = "block";
  } else {
    detailsNotes.style.display = "none";
  }

  if (item.image) {
    detailsImageWrapper.classList.remove("hidden");
    detailsImage.src = item.image;
  } else {
    detailsImageWrapper.classList.add("hidden");
    detailsImage.src = "";
  }

  showView("details");

  // ✅ Show arrows when entering details, start auto-hide timer
  showArrows();

  showTooltipOnce();  // ✅ tooltip appears only first time
}

/* ---------- Image handling (compression) ---------- */

function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 900;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const quality = 0.8; // JPEG compression
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      currentImageDataUrl = dataUrl;
      imagePreviewWrapper.classList.remove("hidden");
      imagePreview.src = dataUrl;
      clearImageBtn.classList.remove("hidden"); // ✅ show Remove button
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Import / Export ---------- */

function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `findit-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      if (!json || !Array.isArray(json.items)) {
        alert("Invalid backup file.");
        return;
      }
      items = json.items;
      saveItems();
      updateCategoryOptions();
      renderItems();
      alert("Data imported successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to import data.");
    }
  };
  reader.readAsText(file);
}

/* ---------- Service worker ---------- */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.error("SW registration failed", err));
  }
}

/* ---------- Event listeners ---------- */

// FAB add
fabAdd.addEventListener("click", () => openAddView());

// Search/filter
searchInput.addEventListener("input", () => renderItems());
categoryFilter.addEventListener("change", () => renderItems());

// Theme toggle
themeToggleBtn.addEventListener("click", () => {
  const isDark = document.documentElement.classList.contains("dark");
  setTheme(isDark ? "light" : "dark");
});
themeToggleSwitch.addEventListener("change", (e) => {
  setTheme(e.target.checked ? "dark" : "light");
});

// Settings & About navigation
settingsBtn.addEventListener("click", () => showView("settings"));
aboutBtn.addEventListener("click", () => showView("about"));
backFromSettings.addEventListener("click", () => showView("home"));
backFromAbout.addEventListener("click", () => showView("home"));

// Back buttons
backFromEdit.addEventListener("click", () => showView("home"));
backFromDetails.addEventListener("click", () => showView("home"));

// Form submit
itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = itemIdInput.value || null;
  const name = itemNameInput.value.trim();
  if (!name) {
    alert("Name is required.");
    return;
  }

  const data = {
    name,
    category: itemCategoryInput.value,
    location: itemLocationInput.value,
    notes: itemNotesInput.value,
    image: currentImageDataUrl,
  };

  if (id) {
    updateItem(id, data);
  } else {
    const item = createItem(data);
    selectedItemId = item.id;
  }

  updateCategoryOptions();
  renderItems();
  showView("home");
});

// Image inputs
imageCameraInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  handleImageFile(file);
  e.target.value = "";
});
imageFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  handleImageFile(file);
  e.target.value = "";
});
clearImageBtn.addEventListener("click", () => {
  currentImageDataUrl = null;
  imagePreviewWrapper.classList.add("hidden");
  imagePreview.src = "";
  clearImageBtn.classList.add("hidden"); // ✅ hide Remove button again
});

// Detail view edit/delete
editItemBtn.addEventListener("click", () => {
  if (!selectedItemId) return;
  openEditView(selectedItemId);
});

deleteItemBtn.addEventListener("click", () => {
  if (!selectedItemId) return;
  pendingDeleteId = selectedItemId;
  deleteModal.classList.remove("hidden");
});

cancelDeleteBtn.addEventListener("click", () => {
  pendingDeleteId = null;
  deleteModal.classList.add("hidden");
});

confirmDeleteBtn.addEventListener("click", () => {
  if (!pendingDeleteId) return;
  deleteItem(pendingDeleteId);
  pendingDeleteId = null;
  deleteModal.classList.add("hidden");
  renderItems();
  showView("home");
});

// Export / Import
exportBtn.addEventListener("click", exportData);
importInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    importData(file);
  }
  e.target.value = "";
});

/* ---------- Swipe navigation in details view ---------- */

let currentItemIndex = null;

// Update openDetailsView to also set currentItemIndex
const originalOpenDetailsView = openDetailsView;
openDetailsView = function(id) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  currentItemIndex = idx;
  originalOpenDetailsView(id);
};

function showNextItem() {
  if (currentItemIndex < items.length - 1) {
    openDetailsView(items[currentItemIndex + 1].id);
  }
}

function showPreviousItem() {
  if (currentItemIndex > 0) {
    openDetailsView(items[currentItemIndex - 1].id);
  }
}

const detailsView = views.details;
let startX = 0;

detailsView.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

detailsView.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].clientX;
  const diffX = endX - startX;

  if (Math.abs(diffX) > 50) { // threshold in pixels
    if (diffX > 0) {
      showPreviousItem(); // swipe right
    } else {
      showNextItem();     // swipe left
    }
  }
});

// Optional: desktop arrow key support
document.addEventListener("keydown", (e) => {
  if (currentView === "details") {
    if (e.key === "ArrowRight") showNextItem();
    if (e.key === "ArrowLeft") showPreviousItem();
  }
});

// On-screen navigation buttons
const prevItemBtn = document.getElementById("prevItemBtn");
const nextItemBtn = document.getElementById("nextItemBtn");

prevItemBtn.addEventListener("click", showPreviousItem);
nextItemBtn.addEventListener("click", showNextItem);

// Auto-hide arrows after 5 seconds
let hideTimeout;

function showArrows() {
  prevItemBtn.classList.remove("hide");
  nextItemBtn.classList.remove("hide");

  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    prevItemBtn.classList.add("hide");
    nextItemBtn.classList.add("hide");
  }, 5000); // 5 seconds
}

// Also show arrows when user taps/swipes inside details view
views.details.addEventListener("touchstart", showArrows);
views.details.addEventListener("click", showArrows);

const detailsTooltip = document.getElementById("detailsTooltip");

  function showTooltipOnce() {
    // Only run if tooltip element exists
    if (!detailsTooltip) return;

    // Check localStorage
    if (localStorage.getItem("tooltipShown") === "true") return;

    // Mark as shown permanently
    localStorage.setItem("tooltipShown", "true");

    detailsTooltip.classList.remove("hidden");
    detailsTooltip.classList.add("show");

    // Hide after 5 seconds
    setTimeout(() => {
      detailsTooltip.classList.remove("show");
      setTimeout(() => {
        detailsTooltip.classList.add("hidden");
      }, 400); // wait for fade-out
    }, 5000);
  };


const installAppRow = document.getElementById("installAppRow");
const installAppBtn = document.getElementById("installAppBtn");
let deferredPrompt;

// Hide row by default
installAppRow.style.display = "none";

// Listen for install prompt (desktop/Android)
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installAppRow.style.display = "flex"; // show row when installable
});

// Handle click
installAppBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

// iOS fallback
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  installAppRow.style.display = "flex"; // always show row on iOS
  installAppBtn.addEventListener("click", () => {
    alert("On iOS: Tap the Share button, then 'Add to Home Screen'.");
  });
}

const deleteAllBtn = document.getElementById("deleteAllBtn");

deleteAllBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to delete all app data? This will reset everything and cannot be undo.")) {
    try {
      // Clear localStorage
      localStorage.clear();

      // Clear IndexedDB
      const databases = await indexedDB.databases();
      databases.forEach(db => {
        indexedDB.deleteDatabase(db.name);
      });

      // Clear Cache API
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      alert("All app data has been deleted. The app will reload.");
      location.reload(); // reload to start fresh
    } catch (err) {
      console.error("Failed to clear data", err);
      alert("Error clearing app data.");
    }
  }
});
