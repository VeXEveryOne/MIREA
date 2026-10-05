import { readFile, writeFile } from "node:fs/promises";
import path from 'node:path';
import {MODEL_DIR, OMNI_ROOT, omniModule} from './runtime.mjs';
const {decodeProject, encodeProject} = await omniModule('src/persistence/project.ts');
const {textModel}=await omniModule('src/notations/uml/document.ts');
const {generateUnified}=await omniModule('src/language/unified.ts');

async function prepare(input: string, output: string) {
  let raw = await readFile(input, "utf8");
  raw = raw
    .replaceAll("BomVersion", "ModelRangeVersion")
    .replaceAll("BomItem", "ModelRangeItem")
    .replaceAll("BOM", "модельный ряд");
  const document = await decodeProject(raw);
  if (document.notation==='UML') {
    const items=document.model.elements;
    // A timeout retains the same attempt and schedules another status query.
    // A merge (not a multi-input action) combines the first query with polling.
    items.find((e:any)=>e.id==='flow9').properties.to='pollMerge';
    items.find((e:any)=>e.id==='flow13').properties.to='waitInterval';
    items.find((e:any)=>e.id==='v_activity_flow9').properties.to='v_activity_pollMerge';
    items.find((e:any)=>e.id==='v_activity_flow13').properties.to='v_activity_waitInterval';
    items.find((e:any)=>e.id==='waiting').label='Сохранить ожидание той же операции';
    const add=(id:string,kind:string,label:string,properties:any)=>items.push({id,kind,label,properties});
    add('pollMerge','merge','',{owner:'publish'});
    add('waitInterval','action','Дождаться срока следующего опроса',{owner:'publish',kind:'opaque'});
    for(const id of ['pollMerge','waitInterval']){
      add(`responsibility_${id}`,'partitionMember','',{owner:'systemLane',element:id});
      add(`v_activity_${id}`,'view','',{diagram:'activity',element:id,parent:'v_activity_systemLane'});
    }
    for(const [id,from,to] of [['flow15','pollMerge','receive'],['flow16','waitInterval','pollMerge']]){
      add(id,'controlFlow','',{owner:'publish',from,to});
      add(`v_activity_${id}`,'view','',{diagram:'activity',element:id,from:`v_activity_${from}`,to:`v_activity_${to}`});
      document.layout.nodes[`v_activity_${id}`]={x:0,y:0,width:210,height:140};
    }
    items.find((e:any)=>e.id==='ready').label='Готова?';
    items.find((e:any)=>e.id==='answer').label='Итог?';
    items.find((e:any)=>e.id==='flow11').properties.guard='итог получен';
    items.find((e:any)=>e.id==='process').label='Принять пакет в обработку';
    const rects:any={
      managerLane:[0,0,330,1830],systemLane:[330,0,640,1830],ozonLane:[970,0,330,1830],
      start:[149,90,32,32],selectCard:[35,175,260,110],check:[410,330,270,110],
      ready:[495,515,100,80],fix:[35,500,260,110],fixDone:[149,680,32,32],
      saveAttempt:[410,680,270,110],send:[410,855,270,110],process:[1000,855,265,110],
      pollMerge:[520,1040,50,50],receive:[410,1170,270,110],answer:[495,1350,100,80],
      result:[410,1530,270,110],done:[529,1740,32,32],
      waiting:[710,1470,240,120],waitInterval:[710,1660,240,120],
    };
    for(const [id,r] of Object.entries(rects) as any)document.layout.nodes[`v_activity_${id}`]={x:r[0],y:r[1],width:r[2],height:r[3]};
    document.layout.edges.v_activity_flow16={bends:[{x:960,y:1720},{x:960,y:1065}]};
    document.layout.edges.v_activity_flow12={bends:[{x:830,y:1390}]};
    // Deployment shows artefacts inside their actual execution nodes. Logical
    // component identities stay in the model and are specified in table 10.2.
    const hidden=new Set(['web','services','repository','manifest_frontend','manifest_appBuild','manifest_dbSchema','manifest_backups'].map(id=>`v_deployment_${id}`));
    document.model.elements=items.filter((e:any)=>!hidden.has(e.id));
    for(const id of hidden){delete document.layout.nodes[id];delete document.layout.edges[id];}
    const deployRects:any={workstation:[20,50,350,320],frontend:[65,205,260,150],server:[500,40,700,730],application:[540,200,620,250],appBuild:[585,310,445,130],postgres:[540,500,360,260],dbSchema:[565,610,310,140],backupStore:[20,500,350,260],backups:[65,635,260,110],externalOzon:[1380,70,350,240]};
    for(const [id,r] of Object.entries(deployRects) as any)document.layout.nodes[`v_deployment_${id}`]={x:r[0],y:r[1],width:r[2],height:r[3]};
    document.source=generateUnified(textModel(document.model));document.draft=document.source;
  }
  const fixes=[['версии модельный ряд','версии модельного ряда'],['версию модельный ряд','версию модельного ряда'],['прежняя модельный ряд','прежний модельный ряд'],['зависимые модельный ряд','зависимые модельные ряды'],['версия модельный ряд','версия модельного ряда'],['одной модельный ряд','одного модельного ряда'],['структуру модельный ряд','структуру модельного ряда'],['по версии модельный ряд','по версии модельного ряда'],['1 000 модельный ряд','1 000 модельных рядов'],['с модельный ряд','с модельным рядом'],['согласование модельный ряд','согласование модельного ряда']];
  for(const e of document.model.elements)for(const [a,b] of fixes){e.label=e.label.replaceAll(a,b);for(const k of Object.keys(e.properties))e.properties[k]=e.properties[k].replaceAll(a,b);}
  if(document.notation!=='UML'){
    const {textModel:structuredText}=await omniModule('src/notations/structured/document.ts');
    document.source=generateUnified(structuredText(document.notation,document.model));document.draft=document.source;
  }
  await writeFile(output, `${await encodeProject(document)}\n`, "utf8");
  console.log(output);
}

await prepare(
  path.join(OMNI_ROOT, 'examples/im/im-architecture.omni'),
  path.join(MODEL_DIR, 'ИМ_ПР9-10_Архитектура.omni'),
);
await prepare(
  path.join(MODEL_DIR, 'ИМ_ПР11_Гант.omni'),
  path.join(MODEL_DIR, 'ИМ_ПР11_Гант.omni'),
);
await prepare(
  path.join(OMNI_ROOT, 'examples/im/im-furps.omni'),
  path.join(MODEL_DIR, 'ИМ_ПР6_FURPS.omni'),
);
