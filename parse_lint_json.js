
const fs = require('fs');

try {
  const content = fs.readFileSync('lint_report.json', 'utf16le').trim();
  const results = JSON.parse(content);
  
  const filesWithErrors = results.filter(r => r.errorCount > 0 && !r.filePath.includes('parse_lint') && !r.filePath.includes('audit_') && !r.filePath.includes('validate_'));
  
  if (filesWithErrors.length === 0) {
    console.log('No files with errors found (only warnings).');
  } else {
    filesWithErrors.forEach(f => {
      console.log(`FILE: ${f.filePath}`);
      f.messages.forEach(m => {
        if (m.severity === 2) { // 2 is error
          console.log(`  [${m.line}:${m.column}] ${m.message} (${m.ruleId})`);
        }
      });
      console.log('---');
    });
  }
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
}
