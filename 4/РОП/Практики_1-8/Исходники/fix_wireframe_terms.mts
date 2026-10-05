// Controlled text corrections: preserve the six screens, actions and layout.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR, omniModule} from './runtime.mjs';
const {textModel}=await omniModule('src/notations/structured/document.ts');
const {generateUnified}=await omniModule('src/language/unified.ts');
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const file=path.join(MODEL_DIR,'РОП_Каркасы.omni');
const project=await decodeProject(await fs.readFile(file,'utf8'));
const geometry=JSON.stringify(project.layout);
function correct(value:any):any {
 if(typeof value==='string')return value
  .replaceAll('18 модельный ряд','18 модельных рядов')
  .replaceAll('18 Модельный ряд','18 модельных рядов')
  .replaceAll('16 модельный ряд','16 модельным рядам')
  .replaceAll('16 Модельный ряд','16 модельным рядам');
 if(Array.isArray(value))return value.map(correct);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,correct(item)]));
 return value;
}
project.model=correct(project.model);
const button=project.model.elements.find((element:any)=>element.id==='D05_wireframe_04.b0');
if(!button)throw new Error('Missing mass replacement button');
button.label='Применить к 16 модельным рядам';
project.source=project.draft=generateUnified(textModel(project.notation,project.model));
const checked=await decodeProject(await encodeProject(project));
if(JSON.stringify(checked.layout)!==geometry)throw new Error('Geometry changed');
await fs.writeFile(file,(await encodeProject(checked))+'\n');
console.log('Wireframe terms corrected; geometry and action targets preserved.');
