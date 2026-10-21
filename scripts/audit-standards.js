/**
 * Script de auditoría de estándares según rulesproyect.md
 * Ejecuta validaciones automáticas sobre backend (api-sgsi) y frontend (app-sgsi).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getChangedFiles() {
  const statusOutput = execSync('git status -s', { encoding: 'utf8' });
  const lines = statusOutput.split('\n').filter(Boolean);
  const files = [];

  for (const l of lines) {
    const match = l.match(/^([MADRCU?!]{1,2})\s+(.*)$/);
    if (!match) continue;
    let filePath = match[2].trim();
    if (filePath.includes(' -> ')) filePath = filePath.split(' -> ')[1].trim();
    files.push(filePath);
  }
  return files;
}

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walkDir(full));
    else results.push(full);
  }
  return results;
}

function runAudit() {
  const changed = getChangedFiles();
  const allFiles = [];
  for (const f of changed) {
    if (!fs.existsSync(f)) continue;
    if (fs.statSync(f).isDirectory()) allFiles.push(...walkDir(f));
    else allFiles.push(f);
  }

  const apiFiles = allFiles.filter(f => f.startsWith('api-sgsi/src/'));
  const appFiles = allFiles.filter(f => f.startsWith('app-sgsi/src/'));

  console.log(`Auditoría de Estándares - rulesproyect.md`);
  console.log(`Archivos analizados: api-sgsi/src (${apiFiles.length}), app-sgsi/src (${appFiles.length})\n`);

  // 1. Motores de Validación
  console.log('=== 1. Motores de Validación ===');
  const apiZod = apiFiles.filter(f => /from ['"]zod['"]/.test(fs.readFileSync(f, 'utf8')));
  console.log(`- Backend con Zod (debe ser 0, usa Joi): ${apiZod.length}`, apiZod);
  const appNonZod = appFiles.filter(f => /from ['"](yup|joi)['"]/.test(fs.readFileSync(f, 'utf8')));
  console.log(`- Frontend con no-Zod (debe ser 0, usa Zod): ${appNonZod.length}`, appNonZod);

  // 2. Nomenclatura
  console.log('\n=== 2. Nomenclatura ===');
  const nonPascalComponents = appFiles.filter(f => {
    if (!f.includes('/components/')) return false;
    const base = path.basename(f);
    if (base === 'index.tsx' || base === 'page.tsx') return false;
    return !/^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/.test(base);
  });
  console.log(`- Componentes no PascalCase: ${nonPascalComponents.length}`);

  // 3. Colores Hex Harcodeados
  console.log('\n=== 3. Tokens de Diseño (Hex Harcodeados) ===');
  const hexColors = [];
  appFiles.forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    const matches = c.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (matches && !f.includes('.d.ts')) hexColors.push({ file: f, count: matches.length });
  });
  console.log(`- Archivos con Hex harcodeados: ${hexColors.length}`);

  // 4. God Components (>800 líneas)
  console.log('\n=== 4. God Components (>800 líneas) ===');
  const god = appFiles.filter(f => {
    if (!f.includes('/components/functional/')) return false;
    return fs.readFileSync(f, 'utf8').split('\n').length > 800;
  });
  console.log(`- Componentes funcionales > 800 líneas: ${god.length}`);
}

runAudit();
