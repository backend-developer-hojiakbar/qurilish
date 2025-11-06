const fs = require('fs');

// Read the file
let content = fs.readFileSync('translations.ts', 'utf8');

// Split into lines
let lines = content.split('\n');

// Remove the last line if it's just the extra closing brace
if (lines[lines.length - 1].trim() === '};') {
  lines.pop();
  console.log('Removed extra closing brace');
}

// Join the lines back
content = lines.join('\n');

// Write the file back
fs.writeFileSync('translations.ts', content);
console.log('File fixed successfully');