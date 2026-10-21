const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walk(full));
    else if (/\.(tsx|ts|jsx|js)$/.test(file)) results.push(full);
  }
  return results;
}

const compFiles = walk('app-sgsi/src/components');
const matches = [];

for (const f of compFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/from\s+['"].*\/services\/.*['"]/.test(line)) {
      matches.push({ file: f, line: idx + 1, importStatement: line.trim() });
    }
  });
}

console.log(JSON.stringify(matches, null, 2));
