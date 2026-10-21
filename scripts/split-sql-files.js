#!/usr/bin/env node

/**
 * Script to split monolithic SQL files into individual table and function files,
 * separated by database schema.
 *
 * Source files:
 *  - tablas_sgsi.sql -> api-sgsi/sql/database/sgsi/tables/<tableName>.sql
 *  - tabla_corvus.sql -> api-sgsi/sql/database/corvus/tables/<tableName>.sql
 *  - funciones_sgsi.sql -> api-sgsi/sql/database/sgsi/functions/<functionName>.sql
 *  - funciones_corvus.sql -> api-sgsi/sql/database/corvus/functions/<functionName>.sql
 *
 * Destination structure:
 *  api-sgsi/sql/database/
 *  ├── corvus/
 *  │   ├── tables/
 *  │   └── functions/
 *  └── sgsi/
 *      ├── tables/
 *      └── functions/
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'api-sgsi', 'sql', 'database');

function resolveExistingFiles(candidates) {
  const resolved = [];
  const seen = new Set();
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const real = fs.realpathSync(filePath).toLowerCase();
      if (!seen.has(real)) {
        seen.add(real);
        resolved.push(filePath);
      }
    }
  }
  return resolved;
}

const TABLE_CANDIDATES = [
  path.join(ROOT_DIR, 'tabla_sgsi.sql'),
  path.join(ROOT_DIR, 'tablas_sgsi.sql'),
  path.join(ROOT_DIR, 'tabla_corvus.sql'),
  path.join(ROOT_DIR, 'tablas_corvus.sql')
];

const FUNCTION_CANDIDATES = [
  path.join(ROOT_DIR, 'funciones_Sgsi.sql'),
  path.join(ROOT_DIR, 'funciones_sgsi.sql'),
  path.join(ROOT_DIR, 'funciones_corvus.sql')
];

const TABLE_FILES = resolveExistingFiles(TABLE_CANDIDATES);
const FUNCTION_FILES = resolveExistingFiles(FUNCTION_CANDIDATES);

// Ensure target directory exists for a given schema and type
function ensureSchemaDirs(schema) {
  const schemaDir = path.join(TARGET_DIR, schema);
  const tablesDir = path.join(schemaDir, 'tables');
  const functionsDir = path.join(schemaDir, 'functions');

  if (!fs.existsSync(tablesDir)) fs.mkdirSync(tablesDir, { recursive: true });
  if (!fs.existsSync(functionsDir)) fs.mkdirSync(functionsDir, { recursive: true });

  return { schemaDir, tablesDir, functionsDir };
}

/**
 * Clean up legacy flat directories if they exist
 */
function cleanLegacyFlatDirs() {
  const flatTables = path.join(TARGET_DIR, 'tables');
  const flatFunctions = path.join(TARGET_DIR, 'functions');
  if (fs.existsSync(flatTables)) {
    fs.rmSync(flatTables, { recursive: true, force: true });
  }
  if (fs.existsSync(flatFunctions)) {
    fs.rmSync(flatFunctions, { recursive: true, force: true });
  }
}

/**
 * Parse a tables dump file into definitions and foreign keys.
 */
function parseTableDump(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File not found: ${filePath}`);
    return { definitions: new Map(), foreignKeys: new Map() };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const definitions = new Map(); // key: schema.tableName -> { schema, table, sql }
  const foreignKeys = new Map(); // key: schema.tableName -> { schema, table, sql }

  let currentSection = null;

  function flushCurrent() {
    if (!currentSection) return;
    const block = currentSection.lines.join('\n').trim();
    if (block) {
      if (currentSection.type === 'definition') {
        definitions.set(currentSection.key, {
          schema: currentSection.schema,
          table: currentSection.table,
          sql: block
        });
      } else if (currentSection.type === 'foreign_keys') {
        foreignKeys.set(currentSection.key, {
          schema: currentSection.schema,
          table: currentSection.table,
          sql: block
        });
      }
    }
  }

  const defRegex = /^--\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s+definition\s*$/i;
  const fkRegex = /^--\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s+foreign keys\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const defMatch = line.match(defRegex);
    const fkMatch = line.match(fkRegex);

    if (defMatch) {
      flushCurrent();
      const schema = defMatch[1];
      const table = defMatch[2];
      currentSection = {
        type: 'definition',
        key: `${schema}.${table}`,
        schema,
        table,
        lines: [line]
      };
    } else if (fkMatch) {
      flushCurrent();
      const schema = fkMatch[1];
      const table = fkMatch[2];
      currentSection = {
        type: 'foreign_keys',
        key: `${schema}.${table}`,
        schema,
        table,
        lines: [line]
      };
    } else {
      if (currentSection) {
        currentSection.lines.push(line);
      }
    }
  }

  flushCurrent();

  return { definitions, foreignKeys };
}

/**
 * Process all table dump files and write individual table SQL files per schema.
 */
function processTables(files = TABLE_FILES) {
  console.log('=== Processing Tables by Schema ===');
  const allDefinitions = new Map();
  const allForeignKeys = new Map();

  for (const file of files) {
    const { definitions, foreignKeys } = parseTableDump(file);
    console.log(`Parsed ${path.basename(file)}: ${definitions.size} tables, ${foreignKeys.size} foreign key sections`);

    for (const [key, val] of definitions) {
      allDefinitions.set(key, val);
    }
    for (const [key, val] of foreignKeys) {
      allForeignKeys.set(key, val);
    }
  }

  const countsBySchema = {};

  for (const [key, def] of allDefinitions) {
    const fk = allForeignKeys.get(key);
    let fullSql = def.sql;

    if (fk && fk.sql) {
      fullSql += '\n\n\n' + fk.sql;
    }
    fullSql += '\n';

    const { tablesDir } = ensureSchemaDirs(def.schema);
    const filename = `${def.table}.sql`;
    const destPath = path.join(tablesDir, filename);

    fs.writeFileSync(destPath, fullSql, 'utf8');
    countsBySchema[def.schema] = (countsBySchema[def.schema] || 0) + 1;
  }

  for (const [schema, count] of Object.entries(countsBySchema)) {
    console.log(`-> Wrote ${count} tables in api-sgsi/sql/database/${schema}/tables`);
  }
  console.log();
}

/**
 * Parse a functions dump file into individual functions.
 */
function parseFunctionDump(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const functions = [];

  let currentFunc = null;

  const dropRegex = /^--\s*DROP\s+FUNCTION\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\(/i;
  const createRegex = /^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\(/i;

  function flushFunc() {
    if (!currentFunc) return;
    const body = currentFunc.lines.join('\n').trim();
    if (body) {
      functions.push({
        schema: currentFunc.schema,
        name: currentFunc.name,
        sql: body + '\n'
      });
    }
    currentFunc = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dropMatch = line.match(dropRegex);
    const createMatch = line.match(createRegex);

    if (dropMatch) {
      if (currentFunc) {
        if (currentFunc.hasCreate) {
          flushFunc();
          currentFunc = {
            schema: dropMatch[1],
            name: dropMatch[2],
            hasCreate: false,
            lines: [line]
          };
          continue;
        } else {
          currentFunc.lines.push(line);
          continue;
        }
      } else {
        currentFunc = {
          schema: dropMatch[1],
          name: dropMatch[2],
          hasCreate: false,
          lines: [line]
        };
        continue;
      }
    } else if (createMatch) {
      if (currentFunc) {
        if (currentFunc.hasCreate) {
          flushFunc();
          currentFunc = {
            schema: createMatch[1],
            name: createMatch[2],
            hasCreate: true,
            lines: [line]
          };
          continue;
        } else {
          currentFunc.hasCreate = true;
          currentFunc.schema = createMatch[1];
          currentFunc.name = createMatch[2];
          currentFunc.lines.push(line);
          continue;
        }
      } else {
        currentFunc = {
          schema: createMatch[1],
          name: createMatch[2],
          hasCreate: true,
          lines: [line]
        };
        continue;
      }
    }

    if (currentFunc) {
      currentFunc.lines.push(line);
    }
  }

  flushFunc();

  return functions;
}

/**
 * Process all function dump files and write individual function SQL files per schema.
 */
function processFunctions(files = FUNCTION_FILES) {
  console.log('=== Processing Functions by Schema ===');
  const allFunctions = [];

  for (const file of files) {
    const funcs = parseFunctionDump(file);
    console.log(`Parsed ${path.basename(file)}: ${funcs.length} functions`);
    allFunctions.push(...funcs);
  }

  // Group by schema and function name: schema -> funcName -> [functions]
  const schemaMap = new Map(); // schema -> Map(funcName -> [funcs])
  for (const fn of allFunctions) {
    if (!schemaMap.has(fn.schema)) {
      schemaMap.set(fn.schema, new Map());
    }
    const funcMap = schemaMap.get(fn.schema);
    if (!funcMap.has(fn.name)) {
      funcMap.set(fn.name, []);
    }
    funcMap.get(fn.name).push(fn);
  }

  for (const [schema, funcMap] of schemaMap) {
    const { functionsDir } = ensureSchemaDirs(schema);
    let written = 0;

    for (const [funcName, list] of funcMap) {
      let finalSql = '';
      if (list.length === 1) {
        finalSql = list[0].sql;
      } else {
        // Multiple overloads for same function in same schema: combine into one file
        finalSql = list.map(f => f.sql.trim()).join('\n\n') + '\n';
      }

      const destPath = path.join(functionsDir, `${funcName}.sql`);
      fs.writeFileSync(destPath, finalSql, 'utf8');
      written++;
    }

    console.log(`-> Wrote ${written} functions in api-sgsi/sql/database/${schema}/functions`);
  }
  console.log();
}

function run() {
  const args = process.argv.slice(2);
  console.log(`Starting SQL definitions splitter (Schema-separated)...`);
  console.log(`Target: ${TARGET_DIR}\n`);

  if (args.length > 0) {
    const arg = args[0];
    const lowerArg = arg.toLowerCase();
    if (lowerArg.includes('funciones') || arg === '--funciones-sgsi' || arg === '--only-functions') {
      console.log('Filtering execution to functions only...\n');
      processFunctions(FUNCTION_FILES);
      console.log('Done successfully!');
      return;
    }
    if (lowerArg.includes('tabla') || arg === '--tablas-sgsi' || arg === '--only-tables') {
      console.log('Filtering execution to tables only...\n');
      processTables(TABLE_FILES);
      console.log('Done successfully!');
      return;
    }

    const resolved = path.isAbsolute(arg) ? arg : path.join(ROOT_DIR, arg);
    if (fs.existsSync(resolved)) {
      console.log(`Processing single file: ${path.basename(resolved)}\n`);
      if (path.basename(resolved).toLowerCase().startsWith('tabla')) {
        processTables([resolved]);
      } else {
        processFunctions([resolved]);
      }
      console.log('Done successfully!');
      return;
    }
  }

  cleanLegacyFlatDirs();
  processTables();
  processFunctions();
  console.log('Done successfully!');
}

if (require.main === module) {
  run();
}

module.exports = {
  run,
  processTables,
  processFunctions,
  parseTableDump,
  parseFunctionDump
};
