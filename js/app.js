const THEME_STORAGE_KEY = "findit-theme";
let deferredPrompt = null;

function updateThemeIcon() {
  const btnTheme = document.getElementById("btn-theme");
  const isDark = document.documentElement.classList.contains("dark");
  if (btnTheme) {
    btnTheme.textContent = isDark ? "☀️" : "🌙";
    btnTheme.setAttribute("title", isDark ? t("theme_light") : t("theme_dark"));
  }
}

function applyTheme(theme) {
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateThemeIcon();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
  document.getElementById("btn-theme").addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initTabs() {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  document.getElementById("btn-home").addEventListener("click", () => switchTab("catalog"));
}

function initLanguageSelector() {
  const select = document.getElementById("language-select");
  select.addEventListener("change", async () => {
    await loadLanguage(select.value);
    document.querySelectorAll(".item-card").forEach(card => translateDynamicCardButtons(card));
  });
}

function initForm() {
  const form = document.getElementById("item-form");
  const fileInput = document.getElementById("item-image");
  const previewImg = document.getElementById("preview-img");
  const removeBtn = document.getElementById("btn-remove-picture");

  fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) {
      previewImg.src = "";
      previewImg.style.display = "none";
      removeBtn.style.display = "none";
      return;
    }
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.style.display = "block";
    removeBtn.style.display = "inline-block";
  });

  removeBtn.addEventListener("click", () => {
    previewImg.src = "";
    previewImg.style.display = "none";
    fileInput.value = "";
    removeBtn.style.display = "none";
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = form.querySelector("#item-id").value || null;
    const name = form.querySelector("#item-name").value.trim();
    const description = form.querySelector("#item-description").value.trim();
    const category = form.querySelector("#item-category").value.trim();
    const location = form.querySelector("#item-location").value.trim();
    const file = fileInput.files[0];

    let imageDataUrl = null;
    if (file) imageDataUrl = await readFileAsDataUrl(file);

    const item = { name, description, category, location, imageDataUrl };

    if (id) {
      item.id = Number(id);
      await dbUpdateItem(item);
    } else {
      await dbAddItem(item);
    }

    clearForm();
    switchTab("catalog");
    refreshItems();
  });

  document.getElementById("btn-reset-form").addEventListener("click", () => clearForm());
  document.getElementById("btn-cancel").addEventListener("click", () => {
    clearForm();
    switchTab("catalog");
  });
  document.getElementById("btn-prev").addEventListener("click", () => navigateEdit("prev"));
  document.getElementById("btn-next").addEventListener("click", () => navigateEdit("next"));
}

function initSearch() {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => refreshItems());
}

function initDataActions() {
  const exportBtn = document.getElementById("btn-export");
  const importInput = document.getElementById("import-file");
  const deleteAllBtn = document.getElementById("btn-delete-all");

  exportBtn.addEventListener("click", async () => {
    const data = await dbExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("export_filename", "findit-data.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await dbImportData(data);
      alert(t("import_success", "Data imported successfully."));
      refreshItems();
    } catch {
      alert(t("import_invalid", "Invalid import file."));
    } finally {
      importInput.value = "";
    }
  });

  deleteAllBtn.addEventListener("click", async () => {
    if (!window.confirm(t("confirm_delete_all"))) return;
    await dbClearAll();
    localStorage.clear();
    location.reload();
  });
}

function initRipple() {
  document.addEventListener("click", e => {
    const target = e.target.closest("button.icon-button, button.btn");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--x", `${x}px`);
    target.style.setProperty("--y", `${y}px`);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  initLanguage();
  initLanguageSelector();
  initForm();
  initSearch();
  initDataActions();
  initRipple();
  bindImageModalEvents();
  refreshItems();
  registerServiceWorker();
});
