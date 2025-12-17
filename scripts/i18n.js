// i18n.js – lightweight localization engine for FindIt

(function () {
  const I18N_STORAGE_KEY = 'findit-lang';
  const FALLBACK_LANG = 'en';
  const SUPPORTED_LANGS = ['en', 'he'];

  let currentLang = localStorage.getItem(I18N_STORAGE_KEY) || FALLBACK_LANG;
  if (!SUPPORTED_LANGS.includes(currentLang)) {
    currentLang = FALLBACK_LANG;
  }

  let dictionaries = {};
  let isLoaded = false;

  async function loadLanguage(lang) {
    if (dictionaries[lang]) {
      currentLang = lang;
      applyDirection(lang);
      translatePage();
      return;
    }
    try {
      const response = await fetch(`i18n/${lang}.json`, { cache: 'no-cache' });
      const json = await response.json();
      dictionaries[lang] = json;
      currentLang = lang;
      localStorage.setItem(I18N_STORAGE_KEY, lang);
      applyDirection(lang);
      translatePage();
    } catch (err) {
      console.error('Failed to load language', lang, err);
      if (lang !== FALLBACK_LANG) {
        loadLanguage(FALLBACK_LANG);
      }
    }
  }

  function applyDirection(lang) {
    const dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }

  function t(key) {
    const dict = dictionaries[currentLang] || {};
    const fb = dictionaries[FALLBACK_LANG] || {};
    return dict[key] || fb[key] || key;
  }

  function translatePage() {
    isLoaded = true;
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = t(key);
      if (value) el.textContent = value;
    });

    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = t(key);
      if (value) el.setAttribute('placeholder', value);
    });
  }

  function initLanguageSelector() {
    const select = document.getElementById('language-select');
    if (select) {
      select.value = currentLang;
      select.addEventListener('change', () => {
        const lang = select.value;
        if (SUPPORTED_LANGS.includes(lang)) {
          loadLanguage(lang);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadLanguage(currentLang).then(() => {
      initLanguageSelector();
    });
  });

  window.FindItI18n = {
    t,
    get currentLang() {
      return currentLang;
    },
    isLoaded: () => isLoaded,
    setLanguage: loadLanguage
  };
}());
