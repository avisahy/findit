// findit/js/i18n.js
export const I18n = (() => {
  let dict = {};
  let current = 'en';

  async function load(lang) {
    const res = await fetch(`lang/${lang}.json`);
    dict = await res.json();
    current = lang;
    applyToDocument();
  }

  function t(key, fallback = '') {
    return dict[key] ?? fallback ?? key;
  }

  function applyToDocument() {
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, el.textContent);
    });
  }

  function applyPlaceholder(el, key) {
    if (!el) return;
    el.setAttribute('placeholder', t(key, el.getAttribute('placeholder')));
  }

  return { load, t, applyToDocument, applyPlaceholder, get current() { return current; } };
})();
