const THEME_STORAGE_KEY = "findit-theme";

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  const btnTheme = document.getElementById("btn-theme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
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
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });
}

function initLanguageSelector() {
  const select = document.getElementById("language-select");
  if (!select) return;
  select.addEventListener("change", () => {
    loadLanguage(select.value);
  });
}

function initForm() {
  const form = document.getElementById("item-form");
  const resetBtn = document.getElementById("btn-reset-form");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = form.querySelector("#item-id").value || null;
    const title = form.querySelector("#item-title").value.trim();
    const description = form.querySelector("#item-description").value.trim();
    const category = form.querySelector("#item-category").value.trim();
    const tagsRaw = form.querySelector("#item-tags").value.trim();
    const fileInput = form.querySelector("#item-image");
    const file = fileInput.files[0];

    let imageDataUrl = null;

    if (file) {
      try {
        imageDataUrl = await readFileAsDataUrl(file);
      } catch (err) {
        console.error("Failed to read image file", err);
      }
    }

    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map(t => t.trim())
          .filter(Boolean)
      : [];

    const item = {
      title,
      description,
      category,
      tags,
      imageDataUrl
    };

    if (id) {
      item.id = Number(id);
      // Preserve existing image if no new file
      if (!file) {
        const all = await dbGetAllItems();
        const existing = all.find(x => x.id === item.id);
        if (existing && existing.imageDataUrl) {
          item.imageDataUrl = existing.imageDataUrl;
        }
      }
      await dbUpdateItem(item);
    } else {
      await dbAddItem(item);
    }

    clearForm();
    switchTab("catalog");
    refreshItems();
  });

  resetBtn.addEventListener("click", () => clearForm());
}

function initSearch() {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    refreshItems();
  });
}

function initDataActions() {
  const exportBtn = document.getElementById("btn-export");
  const importInput = document.getElementById("import-file");
  const deleteAllBtn = document.getElementById("btn-delete-all");

  exportBtn.addEventListener("click", async () => {
    try {
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
    } catch (err) {
      console.error("Export failed", err);
    }
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
    } catch (err) {
      console.error("Import failed", err);
      alert(t("import_invalid", "Invalid import file."));
    } finally {
      importInput.value = "";
    }
  });

  deleteAllBtn.addEventListener("click", async () => {
    if (!window.confirm(t("confirm_delete_all"))) return;
    await dbClearAll();
    refreshItems();
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch(err => console.error("Service worker registration failed", err));
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
  refreshItems();
  registerServiceWorker();
});

document.getElementById("fab-add").addEventListener("click", () => {
  switchTab("add");
});

document.addEventListener("click", e => {
  if (e.target.tagName === "BUTTON") {
    const rect = e.target.getBoundingClientRect();
    e.target.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.target.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }
});

document.getElementById("item-image").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const preview = document.getElementById("preview-img");
  preview.src = url;
  preview.style.display = "block";
});

