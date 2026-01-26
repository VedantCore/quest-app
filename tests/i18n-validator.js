#!/usr/bin/env node
/**
 * i18n Validation Script
 *
 * This script validates internationalization (i18n) across all locale files and code usage.
 *
 * Run: node tests/i18n-validator.js
 *
 * Checks performed:
 * 1. Missing keys - Keys in one locale but not in others
 * 2. Unused keys - Keys defined in locale files but not used in code
 * 3. Undefined keys - Keys used in code but not defined in any locale file
 * 4. Wrong language values - Values in wrong language (e.g., Indonesian text in en.json)
 * 5. Parameter mismatches - Different parameters in same key across locales
 * 6. Empty values - Keys with empty string values
 * 7. Duplicate keys - Same key defined multiple times (JSON will only keep last)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const SRC_DIRS = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components'),
  path.join(__dirname, '..', 'context'),
];
const SUPPORTED_LOCALES = ['en', 'id', 'ja', 'zh'];

// Language detection patterns (common words in each language)
// Use more distinctive words to avoid false positives
const LANGUAGE_PATTERNS = {
  // More distinctive English words - exclude short words used in multiple languages
  en: /\b(the|and|or|was|were|have|has|been|will|would|could|should|must|shall|this|that|these|those|they|error|success|failed|loading|save|update|cancel|submit|confirm|settings|dashboard|profile|logout|login|sign|welcome|please|enter|your|select|choose|remove|manage)\b/gi,
  // Indonesian: use more distinctive words, avoid words like "total", "edit" that appear in English
  id: /\b(adalah|yang|untuk|dengan|tidak|sudah|akan|jika|maka|bisa|dapat|harus|perlu|tetapi|namun|karena|sebagai|dalam|pada|seperti|agar|supaya|sangat|lebih|kurang|semua|setiap|telah|belum|gagal|berhasil|pengguna|tugas|perusahaan|hapus|ubah|lihat|simpan|pilih|masuk|keluar|tambah|kirim|setujui|tolak|manajer|langkah|deskripsi|pencapaian|peserta|diperoleh)\b/gi,
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g,
  zh: /[\u4E00-\u9FFF]/g,
};

// Results storage
const results = {
  missingKeys: {},
  unusedKeys: [],
  undefinedKeys: [],
  wrongLanguage: [],
  parameterMismatches: [],
  emptyValues: [],
  duplicateKeys: [],
  totalKeys: {},
  summary: {},
};

// Helper: Flatten nested object to dot notation
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      Object.assign(result, flattenObject(obj[key], fullKey));
    } else {
      result[fullKey] = obj[key];
    }
  }
  return result;
}

// Helper: Extract parameters from translation string
function extractParams(str) {
  if (typeof str !== 'string') return [];
  const params = [];
  // Match {param} and {{param}} patterns
  const matches = str.matchAll(/\{?\{(\w+)\}\}?/g);
  for (const match of matches) {
    params.push(match[1]);
  }
  return params.sort();
}

// Helper: Detect language of text
function detectLanguage(text) {
  if (typeof text !== 'string' || text.length < 3) return null;

  // Check for Japanese/Chinese characters first (most distinctive)
  if (LANGUAGE_PATTERNS.ja.test(text)) {
    // Reset regex
    LANGUAGE_PATTERNS.ja.lastIndex = 0;
    const jaMatches = text.match(LANGUAGE_PATTERNS.ja);
    // If more than 30% of characters are Japanese/Chinese, it's likely Asian
    if (jaMatches && jaMatches.length > text.length * 0.3) {
      // Distinguish between Japanese and Chinese
      // Japanese typically has hiragana/katakana mixed with kanji
      const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
      return hasKana ? 'ja' : 'zh';
    }
  }

  // Reset regex
  LANGUAGE_PATTERNS.zh.lastIndex = 0;

  // Check Indonesian (has distinctive words)
  const idMatches = text.match(LANGUAGE_PATTERNS.id);
  if (idMatches && idMatches.length >= 2) {
    return 'id';
  }

  // Default to English for Latin text
  const enMatches = text.match(LANGUAGE_PATTERNS.en);
  if (enMatches && enMatches.length >= 1) {
    return 'en';
  }

  return null;
}

// Helper: Check for actual duplicate keys at the same nesting level
function checkDuplicateKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const duplicates = [];
  const lines = content.split('\n');

  // Track path stack for nested objects
  const pathStack = [];
  const keysByPath = {};
  let braceDepth = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Track brace depth changes
    for (const char of line) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (pathStack.length > 0 && braceDepth < pathStack.length) {
          pathStack.pop();
        }
      }
    }

    // Match key definitions
    const keyMatch = line.match(/^\s*"([^"]+)"\s*:\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();

      // Create full path for this key
      const currentPath = [...pathStack, key].join('.');

      // Check if this exact path already exists
      if (keysByPath[currentPath]) {
        duplicates.push({
          key: currentPath,
          firstOccurrence: keysByPath[currentPath],
          secondOccurrence: lineNum + 1,
        });
      } else {
        keysByPath[currentPath] = lineNum + 1;
      }

      // If value starts with {, it's a nested object - add to path stack
      if (value.startsWith('{') && !value.includes('}')) {
        pathStack.push(key);
      }
    }
  }

  return duplicates;
}

// Helper: Extract t() function calls from code
function extractUsedKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();

  // Match t('key'), t("key"), t(`key`)
  const patterns = [
    /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      // Skip dynamic keys that end with a dot (they're concatenated with variables)
      if (!key.endsWith('.')) {
        keys.add(key);
      }
    }
  }

  return keys;
}

// Helper: Recursively get all files with extensions
function getAllFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const files = [];

  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', '.next', '.git', 'tests'].includes(item)) {
        files.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some((ext) => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main validation function
function validateI18n() {
  console.log('🌍 i18n Validation Script\n');
  console.log('='.repeat(60));

  // Load all locale files
  const locales = {};
  const flatLocales = {};

  for (const locale of SUPPORTED_LOCALES) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Locale file not found: ${filePath}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      locales[locale] = JSON.parse(content);
      flatLocales[locale] = flattenObject(locales[locale]);
      results.totalKeys[locale] = Object.keys(flatLocales[locale]).length;

      // Check for duplicate keys in raw JSON
      const duplicates = checkDuplicateKeys(filePath);
      if (duplicates.length > 0) {
        results.duplicateKeys.push({
          locale,
          duplicates,
        });
      }
    } catch (error) {
      console.error(`❌ Error parsing ${locale}.json: ${error.message}`);
    }
  }

  console.log('\n📊 Locale File Statistics:');
  for (const locale of SUPPORTED_LOCALES) {
    if (results.totalKeys[locale]) {
      console.log(`   ${locale}.json: ${results.totalKeys[locale]} keys`);
    }
  }

  // 1. Check for missing keys across locales
  console.log('\n🔍 Checking for missing keys across locales...');
  const allKeys = new Set();
  for (const locale of SUPPORTED_LOCALES) {
    if (flatLocales[locale]) {
      Object.keys(flatLocales[locale]).forEach((key) => allKeys.add(key));
    }
  }

  for (const key of allKeys) {
    const missingIn = [];
    for (const locale of SUPPORTED_LOCALES) {
      if (flatLocales[locale] && !(key in flatLocales[locale])) {
        missingIn.push(locale);
      }
    }
    if (missingIn.length > 0) {
      results.missingKeys[key] = missingIn;
    }
  }

  // 2. Check for empty values
  console.log('🔍 Checking for empty values...');
  for (const locale of SUPPORTED_LOCALES) {
    if (flatLocales[locale]) {
      for (const [key, value] of Object.entries(flatLocales[locale])) {
        if (value === '' || value === null || value === undefined) {
          results.emptyValues.push({ locale, key });
        }
      }
    }
  }

  // 3. Check for wrong language values
  console.log('🔍 Checking for wrong language values...');
  for (const locale of SUPPORTED_LOCALES) {
    if (flatLocales[locale]) {
      for (const [key, value] of Object.entries(flatLocales[locale])) {
        if (typeof value === 'string' && value.length > 5) {
          const detectedLang = detectLanguage(value);
          // Skip if can't detect or if it matches expected locale
          if (detectedLang && detectedLang !== locale) {
            // Exception: English file can have some non-translated keys
            // But Indonesian in English file is definitely wrong
            if (locale === 'en' && detectedLang === 'id') {
              results.wrongLanguage.push({
                locale,
                key,
                value:
                  value.substring(0, 50) + (value.length > 50 ? '...' : ''),
                detectedLang,
              });
            } else if (locale === 'id' && detectedLang === 'en') {
              // Indonesian file shouldn't have English text
              results.wrongLanguage.push({
                locale,
                key,
                value:
                  value.substring(0, 50) + (value.length > 50 ? '...' : ''),
                detectedLang,
              });
            }
          }
        }
      }
    }
  }

  // 4. Check for parameter mismatches
  console.log('🔍 Checking for parameter mismatches...');
  for (const key of allKeys) {
    const paramsByLocale = {};
    for (const locale of SUPPORTED_LOCALES) {
      if (flatLocales[locale] && key in flatLocales[locale]) {
        paramsByLocale[locale] = extractParams(flatLocales[locale][key]);
      }
    }

    const paramArrays = Object.values(paramsByLocale);
    if (paramArrays.length > 1) {
      const first = JSON.stringify(paramArrays[0]);
      for (let i = 1; i < paramArrays.length; i++) {
        if (JSON.stringify(paramArrays[i]) !== first) {
          results.parameterMismatches.push({
            key,
            params: paramsByLocale,
          });
          break;
        }
      }
    }
  }

  // 5. Collect all used translation keys from code
  console.log('🔍 Scanning code for translation key usage...');
  const usedKeys = new Set();

  for (const dir of SRC_DIRS) {
    const files = getAllFiles(dir);
    for (const file of files) {
      const keys = extractUsedKeys(file);
      keys.forEach((key) => usedKeys.add(key));
    }
  }

  console.log(`   Found ${usedKeys.size} unique translation keys used in code`);

  // 6. Check for undefined keys (used but not defined)
  console.log('🔍 Checking for undefined keys...');
  const enKeys = flatLocales['en'] ? Object.keys(flatLocales['en']) : [];

  for (const key of usedKeys) {
    if (!enKeys.includes(key)) {
      results.undefinedKeys.push(key);
    }
  }

  // 7. Check for unused keys (defined but not used)
  console.log('🔍 Checking for unused keys...');
  for (const key of allKeys) {
    if (!usedKeys.has(key)) {
      results.unusedKeys.push(key);
    }
  }

  // Generate summary
  results.summary = {
    totalKeysAcrossLocales: allKeys.size,
    keysUsedInCode: usedKeys.size,
    missingKeysCount: Object.keys(results.missingKeys).length,
    unusedKeysCount: results.unusedKeys.length,
    undefinedKeysCount: results.undefinedKeys.length,
    wrongLanguageCount: results.wrongLanguage.length,
    parameterMismatchCount: results.parameterMismatches.length,
    emptyValuesCount: results.emptyValues.length,
    duplicateKeysCount: results.duplicateKeys.reduce(
      (acc, d) => acc + d.duplicates.length,
      0,
    ),
  };

  // Print results
  printResults();

  // Return exit code
  const hasErrors =
    results.undefinedKeys.length > 0 ||
    results.wrongLanguage.length > 0 ||
    results.duplicateKeys.length > 0;

  return hasErrors ? 1 : 0;
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 VALIDATION RESULTS');
  console.log('='.repeat(60));

  // Summary
  console.log('\n📊 Summary:');
  console.log(
    `   Total unique keys: ${results.summary.totalKeysAcrossLocales}`,
  );
  console.log(`   Keys used in code: ${results.summary.keysUsedInCode}`);

  // Critical Issues
  if (results.undefinedKeys.length > 0) {
    console.log(
      `\n❌ CRITICAL: ${results.undefinedKeys.length} Undefined Keys (used in code but not in locale files):`,
    );
    results.undefinedKeys.slice(0, 20).forEach((key) => {
      console.log(`   - ${key}`);
    });
    if (results.undefinedKeys.length > 20) {
      console.log(`   ... and ${results.undefinedKeys.length - 20} more`);
    }
  }

  if (results.wrongLanguage.length > 0) {
    console.log(
      `\n⚠️  WARNING: ${results.wrongLanguage.length} Wrong Language Values:`,
    );
    results.wrongLanguage.slice(0, 15).forEach((item) => {
      console.log(
        `   - [${item.locale}] ${item.key}: "${item.value}" (detected: ${item.detectedLang})`,
      );
    });
    if (results.wrongLanguage.length > 15) {
      console.log(`   ... and ${results.wrongLanguage.length - 15} more`);
    }
  }

  if (results.duplicateKeys.length > 0) {
    console.log(`\n⚠️  WARNING: Duplicate Keys Found:`);
    results.duplicateKeys.forEach((item) => {
      console.log(`   [${item.locale}.json]:`);
      item.duplicates.forEach((dup) => {
        console.log(
          `      - "${dup.key}" at lines ${dup.firstOccurrence} and ${dup.secondOccurrence}`,
        );
      });
    });
  }

  if (Object.keys(results.missingKeys).length > 0) {
    console.log(
      `\n⚠️  WARNING: ${Object.keys(results.missingKeys).length} Keys Missing in Some Locales:`,
    );
    const entries = Object.entries(results.missingKeys).slice(0, 15);
    entries.forEach(([key, locales]) => {
      console.log(`   - ${key} (missing in: ${locales.join(', ')})`);
    });
    if (Object.keys(results.missingKeys).length > 15) {
      console.log(
        `   ... and ${Object.keys(results.missingKeys).length - 15} more`,
      );
    }
  }

  if (results.parameterMismatches.length > 0) {
    console.log(
      `\n⚠️  WARNING: ${results.parameterMismatches.length} Parameter Mismatches:`,
    );
    results.parameterMismatches.slice(0, 10).forEach((item) => {
      console.log(`   - ${item.key}:`);
      Object.entries(item.params).forEach(([locale, params]) => {
        console.log(`      ${locale}: {${params.join(', ')}}`);
      });
    });
    if (results.parameterMismatches.length > 10) {
      console.log(`   ... and ${results.parameterMismatches.length - 10} more`);
    }
  }

  if (results.emptyValues.length > 0) {
    console.log(`\n⚠️  WARNING: ${results.emptyValues.length} Empty Values:`);
    results.emptyValues.slice(0, 10).forEach((item) => {
      console.log(`   - [${item.locale}] ${item.key}`);
    });
    if (results.emptyValues.length > 10) {
      console.log(`   ... and ${results.emptyValues.length - 10} more`);
    }
  }

  // Info: Unused keys (not critical, might be used dynamically)
  if (results.unusedKeys.length > 0) {
    console.log(
      `\nℹ️  INFO: ${results.unusedKeys.length} Potentially Unused Keys:`,
    );
    console.log(
      '   (These may be used dynamically or reserved for future use)',
    );
    // Don't list all - there are likely many CSS property names, etc.
    console.log(`   Run with --verbose to see full list`);
  }

  // Final status
  console.log('\n' + '='.repeat(60));
  const hasErrors =
    results.undefinedKeys.length > 0 || results.wrongLanguage.length > 0;
  const hasWarnings =
    Object.keys(results.missingKeys).length > 0 ||
    results.parameterMismatches.length > 0 ||
    results.duplicateKeys.length > 0;

  if (hasErrors) {
    console.log('❌ VALIDATION FAILED - Critical issues found');
  } else if (hasWarnings) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS');
  } else {
    console.log('✅ VALIDATION PASSED - All checks OK');
  }
  console.log('='.repeat(60));

  // Save detailed report
  const reportPath = path.join(__dirname, 'i18n-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run validation
const exitCode = validateI18n();
process.exit(exitCode);
