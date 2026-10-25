// Re-export native screens with current report captions; preserve export IDs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,MODEL_DIR,EXPORT_DIR,BUILD_DIR} from './runtime.mjs';
import {OMNI_ROOT} from '../../../../tools/runtime.mjs';
const registry=JSON.parse(await fs.readFile(path.join(MODEL_DIR,'Реестр_рисунков.json'),'utf8'));
const figures=registry.figures.filter(f=>f.file.endsWith('РОП_Каркасы.omni'));
const output=path.join(BUILD_DIR,'wireframe_export');await fs.mkdir(output,{recursive:true});
const manifest=path.join(BUILD_DIR,'wireframe_export.json');
await fs.writeFile(manifest,JSON.stringify({output,options:{format:'png',scale:1.5},jobs:figures.map(f=>({file:path.join(ROOT,f.file),diagramId:f.diagramId,title:f.title}))},null,2));
execFileSync(process.execPath,[path.join(OMNI_ROOT,'scripts/export.mjs'),manifest],{cwd:OMNI_ROOT,windowsHide:true,stdio:'pipe'});
const files=(await fs.readdir(output)).filter(n=>/^\d{2}_.*\.png$/.test(n)).sort();
if(files.length!==figures.length)throw Error('Expected six native screen exports');
for(const [i,f] of figures.entries()){
 const name=(await fs.readdir(EXPORT_DIR)).find(n=>n.startsWith(String(f.figure).padStart(2,'0')+'_')&&n.endsWith('.png'));
 if(!name)throw Error('Missing export '+f.figure);
 await fs.copyFile(path.join(output,files[i]),path.join(EXPORT_DIR,name));
}
console.log('Six native wireframes exported with sequential report captions.');
