const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'locales');
const cache = {};

function loadLocale(code) {
  if (cache[code]) return cache[code];
  const filePath = path.join(LOCALES_DIR, `${code}.json`);
  if (!fs.existsSync(filePath)) return loadLocale('en');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cache[code] = data;
  return data;
}

/**
 * t(lang, key, vars) - translate a key for a given language code.
 * Falls back to English, then to the raw key if nothing is found.
 * vars: optional object for {placeholder} substitution, e.g. t('en','hello_name',{name:'John'})
 */
function t(lang, key, vars = {}) {
  const dict = loadLocale(lang || 'en');
  let str = dict[key] || loadLocale('en')[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

// To add a new bot language: drop a new <code>.json file (copy en.json and
// translate the values) into src/i18n/locales/, then add the language to
// SUPPORTED_LANGUAGES in src/config.js. No other code changes needed.
module.exports = { t };
