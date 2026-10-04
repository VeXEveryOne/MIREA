// Rebuild accepted DSL from the stored semantic model, preserving all layout data.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR, omniModule} from './runtime.mjs';
const {textModel} = await omniModule('src/notations/structured/document.ts');
const {generateUnified} = await omniModule('src/language/unified.ts');
const {decodeProject, encodeProject} = await omniModule('src/persistence/project.ts');

const names=process.argv.slice(2);
if(!names.length)throw new Error('Укажите имена структурированных моделей из каталога Модели');
const prepared=[];
for(const name of names){
 if(path.basename(name)!==name || !name.endsWith('.omni'))throw new Error('Ожидалось имя файла .omni');
 const file=path.join(MODEL_DIR,name);
 const stored=JSON.parse(await fs.readFile(file,'utf8'));
 const geometry=JSON.stringify(stored.layout),semantics=JSON.stringify(stored.model);
 const source=generateUnified(textModel(stored.notation,stored.model));
 const candidate=await decodeProject(JSON.stringify({...stored,source,draft:source}));
 if(JSON.stringify(candidate.layout)!==geometry || JSON.stringify(candidate.model)!==semantics){
  throw new Error(`Нормализация изменила модель или геометрию: ${name}`);
 }
 prepared.push({file,encoded:await encodeProject(candidate)});
}
for(const item of prepared)await fs.writeFile(item.file,item.encoded+'\n','utf8');
console.log(JSON.stringify({normalized:names,modelAndLayoutPreserved:true}));
