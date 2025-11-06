const fs = require('fs');

// Read the file
let content = fs.readFileSync('translations.ts', 'utf8');

// Remove the extra }; at the end
content = content.trim();
if (content.endsWith('};')) {
  content = content.slice(0, -2);
  content = content.trim();
  content += '\n};';
}

// Write the file back
fs.writeFileSync('translations.ts', content);
console.log('Fixed translations.ts file');