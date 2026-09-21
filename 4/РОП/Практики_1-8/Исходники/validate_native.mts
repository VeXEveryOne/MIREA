import fs from 'node:fs/promises';
import {decodeProject} from 'file:///D:/OmniNotation/src/persistence/project.ts';
import {validateIdef0Complete} from 'file:///D:/OmniNotation/src/notations/idef0/model.ts';
import {validateBpmnData} from 'file:///D:/OmniNotation/src/notations/bpmn/validation.ts';
const root='D:/GitHub/MIREA/4/РОП/Практики_1-8';
const directory=root+'/Модели_OmniNotation';
const results=[];
for(const file of await fs.readdir(directory)){
 if(!/\.(nsidef0|nsbpmn)$/.test(file))continue;
 const doc=await decodeProject(await fs.readFile(directory+'/'+file,'utf8'));
 const diagnostics=doc.notation==='IDEF0'?validateIdef0Complete(doc.model):validateBpmnData(doc);
 results.push({file,notation:doc.notation,diagnostics});
}
await fs.writeFile(root+'/ПРОВЕРКА_OmniNotation.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
if(results.some(r=>r.diagnostics.length))process.exitCode=1;
