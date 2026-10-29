// Keep the editable model and printed views on the same UML semantics.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {omniModule} from '../../../tools/runtime.mjs';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {textModel,layoutUml}=await omniModule('src/notations/uml/document.ts');
const {generateUnified}=await omniModule('src/language/unified.ts');
const {interactionFingerprint}=await omniModule('src/notations/uml/model.ts');
const {validateUml}=await omniModule('src/notations/uml/validation.ts');
const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../Схемы/ПР3_Модель_анализа.omni');
const document=await decodeProject(await fs.readFile(file,'utf8'));
const elements=document.model.elements;
const index=new Map(elements.map((e:any)=>[e.id,e]));
index.get('ModelRangeController').label='Контроллер модельного ряда';
index.get('Slot').label='Позиция модельного ряда';
for(const id of ['pub_m11','pub_m12']) {
  const message=index.get(id); message.properties.sort='asynchCall';
  delete message.properties.replyTo;
}
// Analysis shows enduring communication links between boundary/control/entity
// objects. Dependency arrows are appropriate for implementation services, but
// do not describe those object links or their navigability.
for(const e of [...elements].filter((e:any)=>e.kind==='dependency')) {
  const {from,to}=e.properties;
  e.kind='association'; e.properties={};
  e.label='';
  for(const [side,classifier,order] of [['a',from,'0'],['b',to,'1']]) {
    if(!index.has(e.id+'_'+side)) elements.push({id:e.id+'_'+side,kind:'end',label:'',
      properties:{owner:e.id,classifier,lower:'1',upper:'1',order,...(side==='b'?{navigation:'navigable'}:{})}});
  }
}
// A conceptual relation is not a lifecycle-ownership claim.
for(const e of elements.filter((e:any)=>e.kind==='end')) delete e.properties.aggregation;
const rangeClasses=['ModelRangeForm','ModelRangeController','Rule','Slot','Version','Offer'];
const publicationClasses=['FormCard','PubController','Adapter','Version','Card','Publication'];
const classSheets=[['classes_range','Классы анализа: модельный ряд',rangeClasses],
  ['classes_publish','Классы анализа: публикация',publicationClasses]] as const;
// Delete the old dense view only; all classifiers and interactions remain.
document.model.elements=elements.filter((e:any)=>!['classes','classes_range','classes_publish'].includes(e.id) &&
  !(e.kind==='view' && ['classes','classes_range','classes_publish'].includes(e.properties.diagram)));
for(const [sheet,label,ids] of classSheets) {
  document.model.elements.push({id:sheet,kind:'diagram',label,properties:{type:'class'}});
  for(const [i,id] of ids.entries()) {
    const viewId=`v_${sheet}_${id}`;
    document.model.elements.push({id:viewId,kind:'view',label:'',properties:{diagram:sheet,element:id}});
    document.layout.nodes[viewId]={x:60+(i%3)*540,y:60+Math.floor(i/3)*700,width:400,height:420};
  }
  for(const relation of elements.filter((e:any)=>e.kind==='association')) {
    const ends=elements.filter((e:any)=>e.kind==='end'&&e.properties.owner===relation.id)
      .sort((a:any,b:any)=>Number(a.properties.order)-Number(b.properties.order));
    if(ends.length!==2||!ends.every((e:any)=>ids.includes(e.properties.classifier))) continue;
    document.model.elements.push({id:`v_${sheet}_${relation.id}`,kind:'view',label:'',
      properties:{diagram:sheet,element:relation.id,from:`v_${sheet}_${ends[0].properties.classifier}`,
        to:`v_${sheet}_${ends[1].properties.classifier}`}});
  }
}
for(const [sheet,id] of [['classes_range','dep_ModelRangeController_Offer'],
  ['classes_publish','dep_PubController_Publication']])
  document.layout.edges[`v_${sheet}_${id}`]={bends:[{x:1050,y:270},{x:1050,y:605},{x:1340,y:605}]};
document.layout.edges.v_classes_range_slot_offer={bends:[{x:260,y:1240},{x:1340,y:1240}]};
// An actor can have several presentations: each association stays close to
// the use case instead of sharing a long, apparently joined vertical line.
// Ozon participates through its publication view; remove the old unlinked copy.
document.model.elements=document.model.elements.filter((e:any)=>e.id!=='v_use_ozon');
delete document.layout.nodes.v_use_ozon;
const positions:any={system:[320,10,1150,1550],manager:[40,80,190,150],specialist:[40,550,190,150],
  suppliers:[1570,80,190,150],designer:[1570,570,190,150],admin:[1570,1120,190,150]};
for(let i=1;i<=10;i++) positions['UC'+String(i).padStart(2,'0')]=[i<=5?420:1000,90+((i-1)%5)*250,380,150];
for(const [id,[x,y,width,height]] of Object.entries(positions) as any)
  document.layout.nodes['v_use_'+id]={x,y,width,height};
for(const [actor,suffix,rect] of [['manager','publish',[40,1110,190,150]],['manager','supply',[1570,315,190,150]],
  ['ozon','publish',[40,1370,190,150]]]) {
  const id=`v_use_${actor}_${suffix}`;
  if(!document.model.elements.some((e:any)=>e.id===id))
    document.model.elements.push({id,kind:'view',label:'',properties:{diagram:'use',element:actor}});
  const [x,y,width,height]=rect as number[]; document.layout.nodes[id]={x,y,width,height};
}
for(const [relation,from,to,bends] of [
  ['manager_UC01','v_use_manager','v_use_UC01',[]],
  ['manager_UC05','v_use_manager_publish','v_use_UC05',[]],
  ['manager_UC06','v_use_manager_supply','v_use_UC06',[{x:1510,y:385},{x:1510,y:200}]],
  ['specialist_UC02','v_use_specialist','v_use_UC02',[{x:290,y:620},{x:290,y:415}]],
  ['specialist_UC03','v_use_specialist','v_use_UC03',[]],
  ['specialist_UC04','v_use_specialist','v_use_UC04',[{x:270,y:650},{x:270,y:915}]],
  ['ozon_UC05','v_use_ozon_publish','v_use_UC05',[{x:280,y:1450},{x:280,y:1200}]],
  ['suppliers_UC06','v_use_suppliers','v_use_UC06',[]],
  ['designer_UC07','v_use_designer','v_use_UC07',[{x:1510,y:620},{x:1510,y:415}]],
  ['designer_UC09','v_use_designer','v_use_UC09',[{x:1535,y:700},{x:1535,y:915}]],
  ['admin_UC10','v_use_admin','v_use_UC10',[]],
  ['UC02_UC03','v_use_UC02','v_use_UC03',[]],
  ['UC04_UC03','v_use_UC04','v_use_UC03',[]],
  ['UC05_UC08','v_use_UC05','v_use_UC08',[{x:900,y:1165},{x:900,y:665}]],
] as any[]) {
  const v=document.model.elements.find((e:any)=>e.id==='v_use_'+relation);
  v.properties.from=from;v.properties.to=to;
  document.layout.edges[v.id]={bends};
}
for(const id of ['v_use_UC02_UC03','v_use_UC04_UC03'])
  document.layout.edges[id].label={x:725,y:id.endsWith('UC02_UC03')?555:805};
document.layout.edges.v_use_UC05_UC08.label={x:940,y:940};
for(const e of elements.filter((e:any)=>e.kind==='scenario'))
  e.properties.fingerprint=interactionFingerprint(document.model,e.properties.owner);
const diagnostics=validateUml(document.model);
if(diagnostics.some((e:any)=>e.blocksCommit)) throw Error(JSON.stringify(diagnostics));
document.source=generateUnified(textModel(document.model)); document.draft=document.source;
document.layout=layoutUml(document.model,document.layout);
await fs.writeFile(file,await encodeProject(document)+'\n');
console.log(JSON.stringify({associations:elements.filter((e:any)=>e.kind==='association').length,
  asynchronous:['pub_m11','pub_m12'],diagnostics}));
