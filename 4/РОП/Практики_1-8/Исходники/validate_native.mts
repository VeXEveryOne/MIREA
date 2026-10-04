import fs from 'node:fs/promises';
import { ROOT as root, MODEL_DIR, omniModule } from './runtime.mjs';
const {decodeProject} = await omniModule('src/persistence/project.ts');
const {validateIdef0Complete} = await omniModule('src/notations/idef0/model.ts');
const {validateBpmnData} = await omniModule('src/notations/bpmn/validation.ts');
const results=[];
for(const [kind,directory,pattern] of [
 ['canonical',MODEL_DIR,/\.omni$/],
] as const){
 for(const file of await fs.readdir(directory)){
  if(!pattern.test(file))continue;
  const modelKind=/^ПР[12]_(?:IDEF0|BPMN)_(?:AS_IS|TO_BE)\.omni$/.test(file)?kind:'auxiliary';
  try {
   const doc=await decodeProject(await fs.readFile(directory+'/'+file,'utf8'));
   const diagnostics=doc.notation==='IDEF0'?validateIdef0Complete(doc.model):doc.notation==='BPMN'?validateBpmnData(doc):[];
   results.push({kind:modelKind,file,notation:doc.notation,diagnostics});
  } catch(error) {
   results.push({kind:modelKind,file,notation:'unknown',diagnostics:[{code:'DECODE_ERROR',message:String(error)}]});
  }
 }
}
if(results.filter(r=>r.kind==='canonical').length!==4)throw new Error('Ожидались четыре канонических .omni');
if(results.length!==12)throw new Error('Ожидались двенадцать актуальных проектов .omni');
await fs.writeFile(root+'/ПРОВЕРКА_OmniNotation.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
if(results.some(r=>r.diagnostics.length))process.exitCode=1;
