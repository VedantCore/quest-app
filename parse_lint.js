
const fs = require('fs');

try {
  const content = fs.readFileSync('lint_report.txt', 'utf16le');
  const lines = content.split('\n');
  let currentFile = '';
  
  lines.forEach(line => {
    line = line.trim();
    if (line.length === 0) return;
    
    // Simple heuristic: if line starts with C:\ or /, it's a file
    if (line.includes('\\') || line.includes('/')) {
      if (!line.includes('eslint')) { // avoid command echo
         currentFile = line;
      }
    }
    
    if (line.includes('error')) {
      console.log(`FILE: ${currentFile}`);
      console.log(`ISSUE: ${line}`);
      console.log('---');
    }
  });
} catch (e) {
  console.error(e);
}
