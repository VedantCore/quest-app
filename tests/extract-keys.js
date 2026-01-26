import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dir, extensions = ['.js', '.jsx']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  fs.readdirSync(dir).forEach((item) => {
    const fullPath = path.join(dir, item);
    if (
      fs.statSync(fullPath).isDirectory() &&
      !['node_modules', '.next', '.git', 'tests'].includes(item)
    ) {
      files = files.concat(getAllFiles(fullPath, extensions));
    } else if (extensions.some((ext) => item.endsWith(ext))) {
      files.push(fullPath);
    }
  });
  return files;
}

// Extract all t() function calls
const usedKeys = new Set();
const dirs = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components'),
  path.join(__dirname, '..', 'context'),
];

dirs.forEach((dir) => {
  getAllFiles(dir).forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    // Match t('key'), t("key"), t(`key`)
    const regex = /\bt\s*\(\s*(['"`])([^'"`]+)\1/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      usedKeys.add(match[2]);
    }
  });
});

const sortedKeys = [...usedKeys].sort();
console.log('Found', sortedKeys.length, 'unique translation keys in code:\n');
sortedKeys.forEach((k) => console.log(k));
