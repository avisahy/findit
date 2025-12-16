const I18N_STORAGE_KEY = "findit-language";

let currentLang = "en";
const translations = {};

async function loadLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    applyLanguage();
    return;
  }
  try {
    const res = await fetch(`lang/${lang}.json`);
    const data = await res.json();
    translations[lang] = data;
    currentLang = lang;
    applyLanguage();
  } catch (err) {
    console.error("Failed to load language", lang, err);
  }
}

function t(key, fallback) {
  const dict = translations[currentLang] || {};
  return dict[key] || fallback || key;
}

function applyLanguage() {
  const dict = translations[currentLang] || {};

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.setAttribute("placeholder", dict[key]);
  });

  const html = document.documentElement;
  if (currentLang === "he") {
    html.setAttribute("lang", "he");
    html.setAttribute("dir", "rtl");
  } else {
    html.setAttribute("lang", "en");
    html.setAttribute("dir", "ltr");
  }

  localStorage.setItem(I18N_STORAGE_KEY, currentLang);
}

function translateDynamicCardButtons(cardEl) {
  // Ensure Edit/Delete buttons follow current language after card creation
  const editEl = cardEl.querySelector('[data-action="edit"] [data-i18n="btn_edit"]');
  const delEl = cardEl.querySelector('[data-action="delete"] [data-i18n="btn_delete"]');
  if (editEl) editEl.textContent = t("btn_edit", editEl.textContent);
  if (delEl) delEl.textContent = t("btn_delete", delEl.textContent);
}

function initLanguage() {
  const saved = localStorage.getItem(I18N_STORAGE_KEY);
  const lang = saved || "en";
  const select = document.getElementById("language-select");
  if (select) select.value = lang;
  loadLanguage(lang);
}
