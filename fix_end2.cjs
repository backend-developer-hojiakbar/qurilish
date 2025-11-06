const fs = require('fs');

// Read the file
let content = fs.readFileSync('translations.ts', 'utf8');

// Split into lines
let lines = content.split('\n');

// Remove empty lines at the end
while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
  lines.pop();
}

// Check the last line - it should be the closing brace
if (lines[lines.length - 1].trim() === '};') {
  // This is correct, do nothing
  console.log('File ending is correct');
} else if (lines[lines.length - 1].trim() === '}') {
  // Add the semicolon
  lines[lines.length - 1] = lines[lines.length - 1].trim() + ';';
  console.log('Added semicolon to closing brace');
} else {
  // Add the closing brace and semicolon
  lines.push('};');
  console.log('Added closing brace and semicolon');
}

// Ensure there's exactly one newline at the end
lines.push('');

// Join the lines back
content = lines.join('\n');

// Write the file back
fs.writeFileSync('translations.ts', content);
console.log('File fixed successfully');