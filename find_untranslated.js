const fs = require('fs');

const en = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
const locales = ['id', 'ja', 'zh'];

const commonWords = new Set([
  'Email',
  'Google',
  'Quest',
  'ID',
  'URL',
  'SMS',
  'CVV',
  'ZIP Code',
  'LTR',
  'RTL',
  'OK',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]);

function findUntranslated(objEn, objLoc, path = '') {
  let results = [];
  for (const key in objEn) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof objEn[key] === 'object' && objEn[key] !== null) {
      if (objLoc[key]) {
        results = results.concat(
          findUntranslated(objEn[key], objLoc[key], currentPath)
        );
      }
    } else {
      if (
        objLoc[key] === objEn[key] &&
        !commonWords.has(objEn[key]) &&
        isNaN(objEn[key])
      ) {
        results.push({ path: currentPath, value: objEn[key] });
      }
    }
  }
  return results;
}

locales.forEach((lang) => {
  const loc = JSON.parse(fs.readFileSync(`./locales/${lang}.json`, 'utf8'));
  const untranslated = findUntranslated(en, loc);
  console.log(`--- ${lang} ---`);
  untranslated.forEach((item) => console.log(`${item.path}: ${item.value}`));
});
