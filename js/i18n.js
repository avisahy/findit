// Basic i18n loader with dir switching for Hebrew

const LANG_KEY = 'findit-lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'en';
let messages = {};

async function loadLang(lang) {
  const res = await fetch(`./lang/${lang}.json`);
  messages = await res.json();
  currentLang = lang;
  localStorage.setItem(LANG_KEY, currentLang);
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  applyTranslations();
}

function t(key) {
  return messages[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.setAttribute('placeholder', text);
    } else {
      el.textContent = text;
    }
  });
}

export async function i18nInit() {
  await loadLang(currentLang);
  const langSelect = document.getElementById('langSelect');
  const settingsSelect = document.getElementById('settingsLangSelect');
  if (langSelect) langSelect.value = currentLang;
  if (settingsSelect) settingsSelect.value = currentLang;

  langSelect?.addEventListener('change', (e) => loadLang(e.target.value));
  settingsSelect?.addEventListener('change', (e) => loadLang(e.target.value));
}

export function i18nT(key) {
  return t(key);
}
