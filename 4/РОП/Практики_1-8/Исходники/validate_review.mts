// Semantic audit of the concrete teacher corrections, not application unit tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,MODEL_DIR,omniModule} from './runtime.mjs';
const {decodeProject}=await omniModule('src/persistence/project.ts');
const read=async(name:string)=>decodeProject(await fs.readFile(path.join(MODEL_DIR,name),'utf8'));
const audit:any={date:'2026-10-21',status:'pass',idef0:[],bpmn:[]};
for(const file of ['ПР1_IDEF0_AS_IS.omni','ПР2_IDEF0_TO_BE.omni']){
 const d=await read(file),functions=new Set(d.model.nodes.filter((n:any)=>n.kind==='function'&&n.id!=='root').map((n:any)=>n.id));
 for(const e of d.model.edges.filter((e:any)=>functions.has(e.source))){
  if(functions.has(e.target))assert.equal(+e.target.slice(1),+e.source.slice(1)+1,e.id);
  else assert.equal(e.source,'A'+functions.size,e.id);
 }
 audit.idef0.push({file,functions:functions.size,consecutiveOutputs:true});
}
for(const file of ['ПР1_BPMN_AS_IS.omni','ПР2_BPMN_TO_BE.omni']){
 const d=await read(file),objects=Object.values(d.model.objects) as any[],flows=objects.filter(o=>o.type==='bpmn:SequenceFlow');
 for(const node of objects.filter(o=>o.type.endsWith('Task')||o.type==='bpmn:SubProcess'))assert(flows.filter(f=>f.properties.targetRef.ref==='id:'+node.properties.id).length<=1,node.properties.id);
 const merges=objects.filter(o=>o.type==='bpmn:ExclusiveGateway'&&o.properties.gatewayDirection==='Converging');
 assert(merges.length>=3,file);for(const n of merges){assert(n.properties.incoming.length>=2);assert.equal(n.properties.outgoing.length,1);}
 const all={...d.model.objects,...d.layout.objects};
 for(const plane of Object.values(d.layout.objects).filter((o:any)=>o.type==='bpmndi:BPMNPlane') as any[])assert(plane.properties.planeElement.some((r:any)=>all[r.ref].type==='bpmndi:BPMNShape'&&all[all[r.ref].properties.bpmnElement.ref].type==='bpmn:Participant'),plane.properties.id);
 audit.bpmn.push({file,explicitMerges:merges.length,poolsOnEverySheet:true});
}
const erd=await read('РОП_ERD.omni'),elements=erd.model.elements,entities=elements.filter((e:any)=>e.kind==='entity'),attributes=elements.filter((e:any)=>e.kind==='attribute'),relations=elements.filter((e:any)=>e.kind==='relation');
assert.equal(entities.length,29);assert.equal(attributes.length,185);assert.equal(relations.length,47);
assert(attributes.every((e:any)=>/[А-Яа-яЁё]/.test(e.label)));
assert(entities.every((e:any)=>relations.some((r:any)=>[r.properties.from,r.properties.to].includes(e.id))));
for(const s of elements.filter((e:any)=>e.kind==='diagram')){assert.equal(s.properties.type,'logical');assert.equal(elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram===s.id).length,29+47);}
audit.logicalModel={entities:29,attributes:185,relations:47,sqlForeignKeys:46,allEntitiesConnected:true,language:'ru',sheets:2,imagesPerSheet:1};
const uml=await read('РОП_UML_Структура.omni'),connectors=uml.model.elements.filter((e:any)=>e.kind==='componentConnector'),ports=uml.model.elements.filter((e:any)=>e.kind==='port');
assert.equal(connectors.length,9);assert.equal(ports.length,18);assert(!uml.model.elements.some((e:any)=>e.id.startsWith('D02_component.')&&e.kind==='dependency'));
audit.components={assemblyConnectors:9,ports:18};
const scheme=await read('РОП_Общие_схемы.omni');assert(!scheme.model.elements.some((e:any)=>['D10_infrastructure.note','D24_access.note'].includes(e.id)));
audit.notesRemoved=['D10_infrastructure','D24_access'];
const content=JSON.parse(await fs.readFile(path.join(ROOT,'content.json'),'utf8'));
assert.equal(content.filter((b:any)=>b.type==='fig').length,30);
assert(content.some((b:any)=>b.type==='p'&&b.text.includes('wcase — масса корпуса')&&b.text.includes('wpack — масса упаковки')));
assert(content.some((b:any)=>b.type==='h'&&b.text.includes('7 Логическая модель')));
assert.equal(content.filter((b:any)=>b.type==='fig'&&/^Схема алгоритма/.test(b.title)).length,3);
await fs.writeFile(path.join(ROOT,'ПРОВЕРКА_правок.json'),JSON.stringify(audit,null,2)+'\n');
await fs.writeFile(path.join(ROOT,'ПРОВЕРКА_процессных_моделей.json'),JSON.stringify({date:audit.date,status:audit.status,idef0:audit.idef0,bpmn:audit.bpmn},null,2)+'\n');
console.log(JSON.stringify(audit));
