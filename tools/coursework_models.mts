// Read-only current-model checks. Reports belong in .cache, never beside deliverables.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {omniModule} from './runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {decodeProject} = await omniModule('src/persistence/project.ts');
const {validateIdef0Complete} = await omniModule('src/notations/idef0/model.ts');
const {validateBpmnData} = await omniModule('src/notations/bpmn/validation.ts');
const {exportSheets} = await omniModule('src/export/model.ts');
const {buildUmlScene} = await omniModule('src/notations/uml/projection.ts');
const output = path.join(root, '.cache/coursework_audit/models');
await fs.mkdir(output, {recursive: true});
const results = [];
const probeJobs = [];
for (const [subject, relative] of [
  ['ROP', '4/РОП/Практики_1-8/Модели'],
  ['IM', '4/ИМ/OmniNotation'],
  ['PPOIS', '4/ППОИС/Схемы'],
]) {
  const directory = path.join(root, relative);
  for (const name of (await fs.readdir(directory)).filter(name => name.endsWith('.omni')).sort()) {
    const file = path.join(directory, name);
    const raw = await fs.readFile(file, 'utf8');
    const result: any = {subject, file: path.relative(root, file), sha256: crypto.createHash('sha256').update(raw).digest('hex')};
    try {
      const document = await decodeProject(raw);
      result.notation = document.notation;
      result.diagnostics = document.notation === 'IDEF0' ? validateIdef0Complete(document.model)
        : document.notation === 'BPMN' ? validateBpmnData(document) : [];
      result.sheets = exportSheets(document);
      if (document.notation === 'UML') {
        result.scenes = result.sheets.map(sheet => {
          const scene = buildUmlScene(document, sheet.id);
          return {id: sheet.id, nodes: scene.nodes.length, edges: scene.edges.length};
        });
      }
      if (subject === 'PPOIS' && name.startsWith('ПР4_')) {
        for (const sheet of result.sheets.filter(sheet => ['analysis', 'main'].includes(sheet.id))) {
          probeJobs.push({file, diagramId: sheet.id, title: `${name.replace('.omni', '')}_${sheet.id}`});
        }
      }
    } catch (error) {
      result.diagnostics = [{code: 'DECODE_OR_PROJECTION_ERROR', message: String(error)}];
    }
    results.push(result);
  }
}
await fs.writeFile(path.join(output, 'validation.json'), JSON.stringify(results, null, 2) + '\n');
await fs.writeFile(path.join(output, 'probe_export.json'), JSON.stringify({
  output: path.join(output, 'probe'),
  options: {format: 'png', background: 'white', monochrome: true, title: false, legend: false, targetWidth: 2600, font: 'Arial'},
  jobs: probeJobs,
}, null, 2) + '\n');
console.log(JSON.stringify(results.map(({subject, file, notation, diagnostics, sheets}) => ({subject, file, notation, diagnostics, sheets})), null, 2));
if (results.some(result => result.diagnostics.length)) process.exitCode = 1;
