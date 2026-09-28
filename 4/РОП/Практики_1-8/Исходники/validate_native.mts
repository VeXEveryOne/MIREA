import fs from 'node:fs/promises';
import {decodeProject} from 'file:///D:/OmniNotation/src/persistence/project.ts';
import {validateIdef0Complete} from 'file:///D:/OmniNotation/src/notations/idef0/model.ts';
import {validateBpmnData} from 'file:///D:/OmniNotation/src/notations/bpmn/validation.ts';
const root='D:/GitHub/MIREA/4/РОП/Практики_1-8';
const results=[];
for(const [kind,directory,pattern] of [
 ['canonical',root+'/Модели_OmniNotation_v2',/^ПР[12]_(?:IDEF0|BPMN)_(?:AS_IS|TO_BE)\.omni$/],
 ['compatible',root+'/Модели_OmniNotation',/\.(?:nsidef0|nsbpmn)$/],
] as const){
 for(const file of await fs.readdir(directory)){
  if(!pattern.test(file))continue;
  const doc=await decodeProject(await fs.readFile(directory+'/'+file,'utf8'));
  const diagnostics=doc.notation==='IDEF0'?validateIdef0Complete(doc.model):validateBpmnData(doc);
  results.push({kind,file,notation:doc.notation,diagnostics});
 }
}
if(results.filter(r=>r.kind==='canonical').length!==4)throw new Error('Ожидались четыре канонических .omni');
await fs.writeFile(root+'/ПРОВЕРКА_OmniNotation.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
if(results.some(r=>r.diagnostics.length))process.exitCode=1;
