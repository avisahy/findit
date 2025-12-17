
const THEME_STORAGE_KEY = "findit-theme";
let deferredPrompt = null;

function updateThemeIcon() {
  const btnTheme = document.getElementById("btn-theme");
  const isDark = document.documentElement.classList.contains("dark");
  if (btnTheme) {
    btnTheme.textContent = isDark ? "☀️" : "🌙";
    btnTheme.setAttribute("title", isDark ? "Light mode" : "Dark mode");
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  const btnTheme = document.getElementById("btn-theme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const isDark = document.documentElement.classList.contains("dark");
      applyTheme(isDark ? "light" : "dark");
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
  updateThemeIcon();
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

  const btnHome = document.getElementById("btn-home");
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      switchTab("catalog");
    });
  }
}

function initLanguageSelector() {
  const select = document.getElementById("language-select");
  if (!select) return;
  select.addEventListener("change", async () => {
    await loadLanguage(select.value);
    // Re-translate all existing cards after language change
    document.querySelectorAll(".item-card").forEach(card => {
      translateDynamicCardButtons(card);
    });
  });
}

function initForm() {
  const form = document.getElementById("item-form");
  const resetBtn = document.getElementById("btn-reset-form");
  const cancelBtn = document.getElementById("btn-cancel");
  const fileInput = document.getElementById("item-image");
  const previewImg = document.getElementById("preview-img");

  if (fileInput && previewImg) {
    fileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) {
        previewImg.src = "";
        previewImg.style.display = "none";
        return;
      }
      const url = URL.createObjectURL(file);
      previewImg.src = url;
      previewImg.style.display = "block";
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = form.querySelector("#item-id").value || null;
    const title = form.querySelector("#item-title").value.trim();
    const description = form.querySelector("#item-description").value.trim();
    const category = form.querySelector("#item-category").value.trim();
    const tagsRaw = form.querySelector("#item-tags").value.trim();
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

    const item = { title, description, category, tags, imageDataUrl };

    if (id) {
      item.id = Number(id);
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
  cancelBtn.addEventListener("click", () => {
    clearForm();
    switchTab("catalog");
  });

  // Left/right navigation while editing
  document.getElementById("btn-prev").addEventListener("click", () => navigateEdit("prev"));
  document.getElementById("btn-next").addEventListener("click", () => navigateEdit("next"));
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
  const installBtn = document.getElementById("btn-install");
  const iosBtn = document.getElementById("btn-ios-instructions");
  const iosPanel = document.getElementById("ios-instructions");

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

  // Install prompts
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
  });

  installBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      console.log("Install choice:", choice);
    } else {
      alert("On iOS: use 'Add to Home Screen' from Safari. On Desktop/Android: ensure you see the install icon.");
    }
  });

  iosBtn.addEventListener("click", () => {
    iosPanel.style.display = iosPanel.style.display === "none" ? "block" : "none";
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
    navigator.serviceWorker
      .register("service-worker.js")
      .catch(err => console.error("Service worker registration failed", err));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initTabs();
  initLanguage();
  initLanguageSelector();
  initForm();
  initSearch();
  initDataActions();
  initRipple();
  bindImageModalEvents();
  await refreshItems();
  registerServiceWorker();
});
