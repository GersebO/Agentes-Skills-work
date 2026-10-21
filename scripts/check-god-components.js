const fs = require('fs');
const { execSync } = require('child_process');

const godFiles = [
  'app-sgsi/src/components/functional/doc-flow/configuration/doc-flow-configure-page.tsx',
  'app-sgsi/src/components/functional/doc-flow/create/create-document-form.tsx',
  'app-sgsi/src/components/functional/doc-flow/current-documents/current-documents.tsx',
  'app-sgsi/src/components/functional/doc-flow/edition/DocumentContentSection.tsx',
  'app-sgsi/src/components/functional/doc-flow/my-documents/document-preview.tsx',
  'app-sgsi/src/components/functional/doc-flow/my-documents/my-documents.tsx',
  'app-sgsi/src/components/functional/governance/persons/person-details.tsx',
  'app-sgsi/src/components/functional/governance/persons/person.tsx',
  'app-sgsi/src/components/functional/governance/positions/position-detail.tsx',
  'app-sgsi/src/components/functional/risk-management/risk-matrix/group-risk-matrix.tsx',
  'app-sgsi/src/components/functional/risk-management/risk-treatment/group-risk-treatment-plan.tsx',
  'app-sgsi/src/components/functional/soa-controls/applicability-statement/soa-applicability-statement.tsx'
];

console.log('=== GOD COMPONENTS IN GIT STATUS ===');
for (const f of godFiles) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n').length;
  let status = 'UNTOUCHED';
  try {
    const diff = execSync(`git status -s "${f}"`, { encoding: 'utf8' }).trim();
    if (diff) status = diff;
  } catch (e) {}
  console.log(`${f}: ${lines} lines [Status: ${status}]`);
}
