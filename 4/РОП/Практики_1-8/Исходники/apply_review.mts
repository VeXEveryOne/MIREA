// Correct native models; print builders consume these same semantics.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR,ROOT,omniModule} from './runtime.mjs';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {patchUnified}=await omniModule('src/language/unified.ts');
const {textModel}=await omniModule('src/notations/structured/document.ts');
const {bpmnTextModel}=await omniModule('src/notations/bpmn/text.ts');
const labels=JSON.parse(await fs.readFile(new URL('./logical_labels.json',import.meta.url),'utf8'));
const read=async(file:string)=>decodeProject(await fs.readFile(path.join(MODEL_DIR,file),'utf8'));
async function save(file:string,d:any){
 if(d.model.elements){
  const views=d.model.elements.filter((e:any)=>e.kind==='view'),old=d.layout;
  const edgeViews=views.filter((v:any)=>v.properties.from||v.properties.to||old.edges[v.id]);
  const edgeIds=new Set(edgeViews.map((v:any)=>v.id));
  d.layout.nodes=Object.fromEntries(views.filter((v:any)=>d.notation==='UML'||!edgeIds.has(v.id)).map((v:any)=>[v.id,old.nodes[v.id]??{x:50,y:50,width:500,height:300}]));
  d.layout.edges=Object.fromEntries(edgeViews.map((v:any)=>[v.id,old.edges[v.id]??{}]));
  if(old.diagrams)d.layout.diagrams=Object.fromEntries(d.model.elements.filter((e:any)=>e.kind==='diagram').map((e:any)=>[e.id,old.diagrams[e.id]??{}]));
 }
 d.source=patchUnified(d.source,d.notation==='BPMN'?bpmnTextModel(d):d.notation==='IDEF0'?d.model:textModel(d.notation,d.model));d.draft=d.source;
 await fs.writeFile(path.join(MODEL_DIR,file),await encodeProject(d));
}
// Only consecutive IDEF0 functions exchange results; the BPMN retains rework.
for(const file of ['ПР1_IDEF0_AS_IS.omni','ПР2_IDEF0_TO_BE.omni']){
 const d=await read(file),toBe=file.includes('ПР2');
 const names=toBe?['version','content']:['table','values'];
 const removed=new Set(d.model.edges.filter((e:any)=>e.id.startsWith('feedback_')||names.some(n=>e.id===`c_${n}`||e.id===`d_${n}`)).map((e:any)=>e.id));
 const boundaries=new Set(names.flatMap(n=>[`ctx_${n}`,`dec_${n}`]));
 d.model.edges=d.model.edges.filter((e:any)=>!removed.has(e.id));
 d.model.nodes=d.model.nodes.filter((n:any)=>!boundaries.has(n.id));
 for(const id of removed){delete d.layout.arrows[id];delete d.layout.textStyles?.[id];}
 for(const id of boundaries){delete d.layout.positions[id];delete d.layout.sizes[id];}
 if(toBe){for(const n of d.model.nodes)if(['context','root','decomposition'].includes(n.id))n.label='Формировать и актуализировать карточки компьютерных систем в информационной системе';}
 await save(file,d);
}
// Insert an explicit XOR merge before every activity with several incoming flows.
for(const file of ['ПР1_BPMN_AS_IS.omni','ПР2_BPMN_TO_BE.omni']){
 const d=await read(file),objects=d.model.objects,layout=d.layout.objects,all={...objects,...layout};
 if(objects['id:Merge_Prepare']||Object.keys(objects).some(k=>k.startsWith('id:Merge_')))continue;
 let serial=Math.max(0,...Object.keys(all).filter(k=>k.startsWith('object:')).map(k=>Number(k.slice(7))))+1;
 const props=(ref:any)=>all[typeof ref==='string'?ref:ref.ref].properties;
 const add=(type:string,p:any,semantic=false)=>{const key=p.id?'id:'+p.id:'object:'+serial++;const obj={type,properties:p};all[key]=obj;(semantic?objects:layout)[key]=obj;return {ref:key};};
 for(const o of Object.values(layout) as any[])if(o.type==='dc:Bounds'){o.properties.x*=1.65;}
 for(const o of Object.values(layout) as any[])if(o.type==='dc:Point')o.properties.x*=1.65;
 for(const o of Object.values(layout) as any[])if(o.type==='bpmndi:BPMNShape'){
  const e=objects[o.properties.bpmnElement.ref],b=props(o.properties.bounds);
  if(['bpmn:Lane','bpmn:Participant'].includes(e.type))b.width*=1.65;
 }
 const flows=Object.values(objects).filter((o:any)=>o.type==='bpmn:SequenceFlow') as any[];
 for(const [key,node] of Object.entries(objects) as any[]){
  if(!node.type.endsWith('Task')&&node.type!=='bpmn:SubProcess')continue;
  const incoming=flows.filter(f=>f.properties.targetRef.ref===key);if(incoming.length<2)continue;
  const id='Merge_'+node.properties.id,ref=add('bpmn:ExclusiveGateway',{id,name:'',gatewayDirection:'Converging'},true);
  const owner=Object.values(objects).find((o:any)=>o.properties.flowElements?.some((r:any)=>r.ref===key)) as any;
  owner.properties.flowElements.push(ref);
  for(const f of incoming)f.properties.targetRef=ref;
  const flowId=id+'_out',flowRef=add('bpmn:SequenceFlow',{id:flowId,name:'',sourceRef:ref,targetRef:{ref:key}},true);owner.properties.flowElements.push(flowRef);
  for(const plane of Object.values(layout).filter((o:any)=>o.type==='bpmndi:BPMNPlane') as any[]){
   const shape=plane.properties.planeElement.map((r:any)=>all[r.ref]).find((o:any)=>o.type==='bpmndi:BPMNShape'&&o.properties.bpmnElement.ref===key);if(!shape)continue;
   const b=props(shape.properties.bounds),g={x:b.x-86,y:b.y+b.height/2-25,width:50,height:50};
   plane.properties.planeElement.push(add('bpmndi:BPMNShape',{id:id+'_'+plane.properties.id+'_di',bpmnElement:ref,bounds:add('dc:Bounds',g)}));
   for(const edgeRef of plane.properties.planeElement){const edge=all[edgeRef.ref];if(edge.type!=='bpmndi:BPMNEdge')continue;
    if(incoming.some(f=>f.properties.id===objects[edge.properties.bpmnElement.ref]?.properties.id)){
     const p=props(edge.properties.waypoint.at(-1));p.x=g.x;p.y=g.y+25;
    }
   }
   plane.properties.planeElement.push(add('bpmndi:BPMNEdge',{id:flowId+'_'+plane.properties.id+'_di',bpmnElement:flowRef,waypoint:[add('dc:Point',{x:g.x+50,y:g.y+25}),add('dc:Point',{x:b.x,y:g.y+25})]}));
  }
 }
 // Expanded subprocess sheets get their own process pool around the role lanes.
 const collaboration=objects['id:Collaboration'];
 for(const plane of Object.values(layout).filter((o:any)=>o.type==='bpmndi:BPMNPlane') as any[]){
  const children=plane.properties.planeElement.map((r:any)=>all[r.ref]);
  const lanes=children.filter((o:any)=>o.type==='bpmndi:BPMNShape'&&objects[o.properties.bpmnElement.ref]?.type==='bpmn:Lane');
  if(!lanes.length)continue;
  const bounds=lanes.map((o:any)=>props(o.properties.bounds)),x=Math.min(...bounds.map((b:any)=>b.x))-70,y=Math.min(...bounds.map((b:any)=>b.y)),right=Math.max(...bounds.map((b:any)=>b.x+b.width)),bottom=Math.max(...bounds.map((b:any)=>b.y+b.height));
  // This is an alternate view of the same organisation pool, not a new participant.
  plane.properties.planeElement.unshift(add('bpmndi:BPMNShape',{id:'Pool_'+plane.properties.id,bpmnElement:{ref:'id:Ucoms'},isHorizontal:true,bounds:add('dc:Bounds',{x,y,width:right-x,height:bottom-y})}));
 }
 // Rebuild incoming/outgoing on flow nodes after retargeting.
 const currentFlows=Object.entries(objects).filter(([,o]:any)=>o.type==='bpmn:SequenceFlow') as any[];
 for(const [key,o] of Object.entries(objects) as any[])if(o.type.includes('Gateway')||o.type.endsWith('Task')||o.type.endsWith('Event')||o.type==='bpmn:SubProcess'){
  o.properties.incoming=currentFlows.filter(([,f]:any)=>f.properties.targetRef.ref===key).map(([ref]:any)=>({ref}));
  o.properties.outgoing=currentFlows.filter(([,f]:any)=>f.properties.sourceRef.ref===key).map(([ref]:any)=>({ref}));
 }
 await save(file,d);
}
const erd=await read('РОП_ERD.omni');
if(!erd.model.elements.some((e:any)=>e.id==='validation_rules'))erd.model.elements.push({id:'validation_rules',kind:'relation',label:'Использованные редакции правил',properties:{from:'validation_result',to:'compatibility_rule',fromMin:'0',fromMax:'many',toMin:'1',toMax:'many'}});
for(const e of erd.model.elements){
 if(e.kind==='attribute'){const n=e.properties.sqlName;if(!labels[n])throw Error('Missing Russian label '+n);e.label=e.properties.owner==='card'&&n==='offer_id'?'Код предложения на площадке':labels[n];}
 if(e.kind==='entity')e.label=e.label[0].toUpperCase()+e.label.slice(1);
}
erd.model.elements=erd.model.elements.filter((e:any)=>!['diagram','view'].includes(e.kind));
erd.layout.nodes={};erd.layout.edges={};erd.layout.diagrams={};
for(const [id,label] of [['D03_logical_1','Логическая модель данных'],['D20_physical_1','Логическая модель данных и целостность']]){
 erd.model.elements.push({id,kind:'diagram',label,properties:{type:'logical'}});
 for(const e of erd.model.elements.filter((e:any)=>['entity','relation'].includes(e.kind))){
  const v=id+'.'+e.id+'.view',p:any={diagram:id,element:e.id};
  if(e.kind==='relation'){p.from=id+'.'+e.properties.from+'.view';p.to=id+'.'+e.properties.to+'.view';erd.layout.edges[v]={};}
  erd.model.elements.push({id:v,kind:'view',label:'',properties:p});
 }
}
await save('РОП_ERD.omni',erd);
const scheme=await read('РОП_Общие_схемы.omni');
const notes=new Set(scheme.model.elements.filter((e:any)=>e.kind==='note'&&['D10_infrastructure.note','D24_access.note'].includes(e.id)).map((e:any)=>e.id));
const deleted=new Set(scheme.model.elements.filter((e:any)=>notes.has(e.id)||notes.has(e.properties.element)).map((e:any)=>e.id));
scheme.model.elements=scheme.model.elements.filter((e:any)=>!deleted.has(e.id));for(const id of deleted){delete scheme.layout.nodes[id];delete scheme.layout.edges[id];}
await save('РОП_Общие_схемы.omni',scheme);
const algorithms=await read('РОП_Алгоритмы.omni');
for(const e of algorithms.model.elements){if(['diagram','algorithm'].includes(e.kind))e.label=e.label.replace(/^Алгоритм /,'Схема алгоритма ');}
algorithms.model.elements.find((e:any)=>e.id==='D07_algorithm_price.b').label='Версия состава; цены pᵢ; количества qᵢ; массы wcase, wᵢ, wpack; сборка A; упаковка U; наценка m; шаг s';
algorithms.model.elements.find((e:any)=>e.id==='D07_algorithm_price.d').label='C = Σ qᵢpᵢ + A + U\nМасса с упаковкой:\nW = wcase + Σ qᵢwᵢ + wpack';
algorithms.model.elements.find((e:any)=>e.id==='D07_algorithm_price.c').label='Состав полный,\nцены актуальны,\nмассы > 0?';
algorithms.model.elements.find((e:any)=>e.id==='D07_algorithm_price.d').label='Ccomp = цена корпуса + Σ qᵢpᵢ\nC = Ccomp + A + U\nМасса с упаковкой:\nW = wcase + Σ qᵢwᵢ + wpack';
// Put variable names alongside their meanings, rather than bare identifiers.
const input=algorithms.layout.nodes['D07_algorithm_price.b_view'];
if(input.width!==650){input.width=650;input.x-=100;input.height=145;for(const [id,n] of Object.entries(algorithms.layout.nodes) as any[])if(id.startsWith('D07_algorithm_price.')&&id!=='D07_algorithm_price.a_view'&&id!=='D07_algorithm_price.b_view')n.y+=65;}
await save('РОП_Алгоритмы.omni',algorithms);
const uml=await read('РОП_UML_Структура.omni');
const oldEdges=uml.model.elements.filter((e:any)=>e.id.startsWith('D02_component.')&&e.kind==='dependency');
const oldIds=new Set(oldEdges.map((e:any)=>e.id));
uml.model.elements=uml.model.elements.filter((e:any)=>!oldIds.has(e.id)&&!oldIds.has(e.properties.element));
const system='D02_component.system';
if(!uml.model.elements.some((e:any)=>e.id===system)){
 uml.model.elements.push({id:system,kind:'component',label:'Информационная система карточек и внешние сервисы',properties:{}});
 uml.model.elements.push({id:system+'.view',kind:'view',label:'',properties:{diagram:'D02_component',element:system}});
 const components=uml.model.elements.filter((e:any)=>e.kind==='component'&&e.id.startsWith('D02_component.')&&e.id!==system);
 for(const c of components){
  const part=c.id+'.part';uml.model.elements.push({id:part,kind:'part',label:c.label,properties:{owner:system,classifier:c.id,lower:'1',upper:'1'}});
  const view=uml.model.elements.find((e:any)=>e.kind==='view'&&e.properties.element===c.id);view.properties.element=part;view.properties.parent=system+'.view';
 }
 for(const [i,edge] of oldEdges.entries()){
  const iid=edge.id+'.interface',from=edge.properties.from,to=edge.properties.to;
  uml.model.elements.push({id:iid,kind:'interface',label:edge.label,properties:{}});
  const portIds=[from+'.port'+i,to+'.port'+i],viewIds=portIds.map(p=>p+'.view');
  for(const [j,owner] of [from,to].entries()){
   const parent=uml.model.elements.find((e:any)=>e.kind==='view'&&e.properties.element===owner+'.part');
   uml.model.elements.push({id:portIds[j],kind:'port',label:'',properties:{owner,classifier:iid,conjugated:j===0?'true':'false'}});
   uml.model.elements.push({id:portIds[j]+'.use',kind:'interfaceUse',label:'',properties:{owner:portIds[j],interface:iid,direction:j===0?'required':'provided'}});
   uml.model.elements.push({id:viewIds[j],kind:'view',label:'',properties:{diagram:'D02_component',element:portIds[j],parent:parent.id}});
  }
  uml.model.elements.push({id:edge.id,kind:'componentConnector',label:edge.label,properties:{owner:system,kind:'assembly'}});
  for(const [j,owner] of [from,to].entries())uml.model.elements.push({id:edge.id+'.end'+j,kind:'componentEnd',label:'',properties:{owner:edge.id,part:owner+'.part',port:portIds[j],order:String(j)}});
  uml.model.elements.push({id:edge.id+'.view',kind:'view',label:'',properties:{diagram:'D02_component',element:edge.id,from:viewIds[0],to:viewIds[1]}});
 }
}
await save('РОП_UML_Структура.omni',uml);
console.log('Native review changes applied.');
