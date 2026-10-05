// PPOIS5: one native UML model; print figures use the same entities and routes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {omniModule,runtimeModule} from '../../../tools/runtime.mjs';
import {escape,wrap} from '../../../tools/diagram_text.mts';
const {textModel,decodeUml,layoutUml,inspectUml}=await omniModule('src/notations/uml/document.ts');
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {validateUml}=await omniModule('src/notations/uml/validation.ts');
const {umlDocumentSchema}=await omniModule('src/notations/uml/model.ts');
const {default:sharp}=await runtimeModule('sharp');
const {generateUnified}=await omniModule('src/language/unified.ts');
const subject=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.PPOIS_MODEL_OUTPUT??path.join(subject,'Схемы');
await fs.mkdir(out,{recursive:true});
const previous=await decodeProject(await fs.readFile(path.join(subject,'Схемы/ПР4_Модель_проектирования.omni'),'utf8'));
const model={id:'ppois_implementation',label:'Модель реализации ИС подготовки карточек ООО Юкомс',elements:[] as any[]};
const rects:Record<string,any>={},routes:Record<string,any>={};
const add=(kind:string,id:string,label='',properties:Record<string,string>={})=>{
  model.elements.push({kind,id,label,properties});return id;
};
function view(sheet:string,id:string,box:number[],parent?:string){
  const [x,y,width,height]=box, vid='v_'+sheet+'_'+id;
  add('view',vid,'',{diagram:sheet,element:id,...(parent?{parent:'v_'+sheet+'_'+parent}:{})});
  rects[vid]={x,y,width,height};return vid;
}
function edge(sheet:string,kind:string,id:string,label:string,from:string,to:string,points:number[][],extra={}){
  add(kind,id,label,{...(kind==='deployment'?{location:from,artifact:to}:{from,to}),...extra});
  const vid='v_'+sheet+'_'+id;
  add('view',vid,'',{diagram:sheet,element:id,from:'v_'+sheet+'_'+from,to:'v_'+sheet+'_'+to});
  routes[vid]={bends:points.slice(1,-1).map(([x,y])=>({x,y}))};
  printedEdges.push({sheet,id,kind,label,points});
}
const printedEdges:any[]=[];
const allocations:Record<string,string[]>={
  web:['BomForm','CardForm'],
  api:['BomControl','Readiness','PublicationControl'],
  domain:['Configuration','BomVersion','BomSlot','Compatibility','Calculation'],
  catalog:['ComponentGroup','Component','Offer'],
  content:['Card','CardRevision','Image','PublicationAttempt'],
  gateway:['MarketplaceGateway'],
  storage:[],
};
const labels:Record<string,string>={web:'Веб клиент',api:'Прикладной сервис',domain:'Состав и расчёты',
  catalog:'Каталог и предложения',content:'Карточки и контент',gateway:'Шлюз публикации',storage:'Доступ к данным'};
const details:Record<string,string>={web:'Формы BOM и карточки',api:'Сценарии и права доступа',domain:'Проверка и вычисления',
  catalog:'Комплектующие и цены',content:'Версии и изображения',gateway:'Запрос и внешний результат',storage:'PostgreSQL и транзакции'};
const classIds=previous.model.elements.filter((e:any)=>e.kind==='class').map((e:any)=>e.id).sort();
const assigned=Object.values(allocations).flat().sort();
if(JSON.stringify(classIds)!==JSON.stringify(assigned)||new Set(assigned).size!==18)throw Error('PPOIS4 classes must be allocated once');
for(const e of previous.model.elements.filter((e:any)=>e.kind==='class'))
  add('class',e.id,e.label,{role:e.properties.role});
for(const [id,classes] of Object.entries(allocations)){
  add('component',id,labels[id],{description:details[id]});
  classes.forEach(c=>add('componentRealization','impl_'+c,'',{owner:id,classifier:c}));
}
add('diagram','components','Компоненты целевой системы',{type:'component'});
const boxes:Record<string,number[]>={web:[40,240,420,270],api:[610,240,420,270],domain:[1180,240,420,270],
  catalog:[1750,240,420,270],content:[610,650,420,270],gateway:[1180,650,420,270],storage:[1750,650,420,270]};
for(const [id,box] of Object.entries(boxes))view('components',id,box);
add('interface','ICards','API карточек',{description:'Создание версии, проверка и подготовка карточки'});
view('components','ICards',[485,20,600,130]);
edge('components','usage','web_uses_api','«use»','web','ICards',[[250,240],[250,85],[485,85]]);
edge('components','realization','api_provides','Реализация','api','ICards',[[820,240],[820,150]]);
edge('components','dependency','api_domain','Расчёт','api','domain',[[1030,375],[1180,375]]);
edge('components','dependency','domain_catalog','Подбор','domain','catalog',[[1600,375],[1750,375]]);
edge('components','dependency','api_content','Ревизия','api','content',[[820,510],[820,650]]);
edge('components','dependency','api_gateway','Публикация','api','gateway',[[1030,450],[1100,450],[1100,785],[1180,785]]);
edge('components','dependency','catalog_store','Данные','catalog','storage',[[1960,510],[1960,650]]);
edge('components','dependency','content_store','Снимки','content','storage',[[820,920],[820,1000],[1960,1000],[1960,920]]);

// Target deployment: artifacts are placed inside named execution environments.
add('diagram','deployment','Целевое развёртывание',{type:'deployment'});
const devices=[
  ['workstation','Рабочие места','4 учётные записи; до 4 сеансов',[30,100,500,530]],
  ['app_server','Сервер приложения','4 vCPU; 8 ГБ; SSD 80 ГБ',[720,100,660,530]],
  ['db_server','Сервер базы данных','4 vCPU; 8 ГБ; SSD 100 ГБ',[1570,100,610,530]],
  ['marketplace','Внешняя площадка','Ozon; интеграция планируется',[720,810,660,310]],
  ['backup','Резервное хранилище','Отдельный узел; 200 ГБ',[1570,810,610,340]],
] as const;
const envs=[['browser','Браузер','workstation',[75,280,410,300]],
  ['python_env','Python и сервер HTTP','app_server',[775,280,550,300]],
  ['pg_env','PostgreSQL 18','db_server',[1625,280,500,300]]] as const;
const arts=[['client_files','client.html и JS','browser',[110,420,340,120]],
  ['server_files','app.py и domain.py','python_env',[840,420,420,120]],
  ['sql_schema','schema.sql','pg_env',[1680,420,390,120]],
  ['backup_file','Дамп БД и изображения','backup',[1625,985,500,140]]] as const;
for(const [id,label,hardware,box] of devices){add('device',id,label,{hardware});view('deployment',id,[...box]);}
for(const [id,label,owner,box] of envs){add('executionEnvironment',id,label,{owner});view('deployment',id,[...box],owner);}
for(const [id,label,owner,box] of arts){add('artifact',id,label,{fileName:label});view('deployment',id,[...box],owner);
  add('deployment','deploy_'+id,'',{location:owner,artifact:id});}
edge('deployment','communicationPath','work_app','HTTPS / 443','workstation','app_server',[[530,205],[720,205]],{protocol:'HTTPS',port:'443'});
edge('deployment','communicationPath','app_db','PostgreSQL / 5432','app_server','db_server',[[1380,205],[1570,205]],{protocol:'PostgreSQL TLS',port:'5432'});
edge('deployment','communicationPath','app_market','HTTPS / 443','app_server','marketplace',[[1050,630],[1050,810]],{protocol:'HTTPS',port:'443'});
edge('deployment','communicationPath','db_backup','SSH / 22','db_server','backup',[[1875,630],[1875,810]],{protocol:'SSH',port:'22'});

add('diagram','local_demo','Фактически запускаемый учебный срез',{type:'deployment'});
add('device','local','Локальный учебный компьютер',{hardware:'Windows; PostgreSQL слушает только 127.0.0.1'});
view('local_demo','local',[40,80,1870,600]);
for(const [id,label,box] of [['demo_env','Python',[110,250,690,360]],['local_pg','PostgreSQL 18.6',[1130,250,690,360]]] as const){
  add('executionEnvironment',id,label,{owner:'local'});view('local_demo',id,[...box],'local');
}
add('artifact','console_demo','demo.py domain.py repository.py',{fileName:'demo.py'});
view('local_demo','console_demo',[150,415,610,135],'demo_env');
add('artifact','course_db','Учебная БД ppois',{fileName:'schema.sql'});
view('local_demo','course_db',[1170,415,610,135],'local_pg');
add('deployment','deploy_demo','',{location:'demo_env',artifact:'console_demo'});
add('deployment','deploy_course_db','',{location:'local_pg',artifact:'course_db'});
edge('local_demo','communicationPath','local_sql','127.0.0.1 / 55432','demo_env','local_pg',[[800,345],[1130,345]],{protocol:'PostgreSQL loopback',port:'55432'});
const structure=umlDocumentSchema.shape.model.safeParse(model);
if(!structure.success){console.error(JSON.stringify(structure.error.issues));process.exit(1);}
const diagnostics=validateUml(model);
if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const source=generateUnified(textModel(model));
const parsed=inspectUml(source);
if(!parsed.model||parsed.diagnostics.length)throw Error(JSON.stringify(parsed.diagnostics));
const layout=layoutUml(model);Object.assign(layout.nodes,rects);Object.assign(layout.edges,routes);
const document=decodeUml({formatVersion:2,notation:'UML',profile:'NS-UML-2.5.1-2',model,source,draft:source,layout});
await fs.writeFile(path.join(out,'ПР5_Модель_реализации.omni'),await encodeProject(document)+'\n');

// Native elements and view coordinates remain the source of print figures.
const index=new Map(model.elements.map(e=>[e.id,e]));
async function textBlock(value:string,x:number,y:number,width:number,size=34,bold=false){
  const lines=await wrap(value,width,size,bold);
  return lines.map((line,i)=>`<text x="${x}" y="${y+i*size*1.2}" text-anchor="middle" font-family="Arial" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(line)}</text>`).join('');
}
const figureNames:Record<string,string>={components:'ПР5_Компоненты',deployment:'ПР5_Развёртывание',local_demo:'ПР5_Прототип'};
for(const [sheet,name] of Object.entries(figureNames)){
  const w=sheet==='local_demo'?1960:2240,h=sheet==='components'?1070:sheet==='local_demo'?740:1180;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="open" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="14" markerHeight="14" orient="auto"><path d="M1 1 L13 7 L1 13" fill="none" stroke="#222" stroke-width="1.4"/></marker><marker id="triangle" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="14" markerHeight="14" orient="auto"><path d="M1 1 L13 7 L1 13 Z" fill="white" stroke="#222" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="white"/>`;
  const nodes=model.elements.filter(e=>e.kind==='view'&&e.properties.diagram===sheet&&!e.properties.from);
  for(const view of nodes){
    const e=index.get(view.properties.element)!,box=rects[view.id],{x,y,width,height}=box;
    const kind=e.kind==='executionEnvironment'?'executionEnvironment':e.kind;
    if(['device','executionEnvironment'].includes(kind)){
      svg+=`<path d="M${x} ${y} l20 -16 h${width} v${height} l-20 16 M${x+width} ${y} l20 -16 M${x} ${y} h${width} v${height} h-${width} Z" fill="white" stroke="#222" stroke-width="2.6"/>`;
      svg+=await textBlock('«'+kind+'»',x+width/2,y+45,width-32,30);
      svg+=await textBlock(e.label,x+width/2,y+90,width-30,36,true);
      if(e.properties.hardware)svg+=await textBlock(e.properties.hardware,x+width/2,y+145,width-25,30);
    }else{
      svg+=`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#222" stroke-width="2.6"/>`;
      svg+=await textBlock('«'+kind+'»',x+width/2,y+45,width-55,30);
      svg+=await textBlock(e.label,x+width/2,y+90,width-35,36,true);
      if(kind==='component'){
        svg+=`<rect x="${x+width-45}" y="${y+20}" width="28" height="35" fill="white" stroke="#222" stroke-width="2"/><path d="M${x+width-50} ${y+28} h16 v8 h-16 Z M${x+width-50} ${y+42} h16 v8 h-16 Z" fill="white" stroke="#222" stroke-width="2"/>`;
        svg+=await textBlock(details[e.id],x+width/2,y+190,width-30,32);
      }
    }
  }
  for(const e of printedEdges.filter(e=>e.sheet===sheet)){
    const points=e.points.map(([x,y]:number[])=>`${x},${y}`).join(' '),p=e.points;
    svg+=`<polyline points="${points}" fill="none" stroke="#222" stroke-width="2.8" ${e.kind==='communicationPath'?'':`stroke-dasharray="12 7" marker-end="url(#${e.kind==='realization'?'triangle':'open'})"`}/>`;
    // Clear corridor labels, not text laid over a wire.
    const labelPositions:Record<string,number[]>={web_uses_api:[310,160],api_provides:[995,195],api_domain:[1105,340],
      domain_catalog:[1675,340],api_content:[935,590],api_gateway:[1280,590],catalog_store:[2075,590],
      content_store:[1390,975],work_app:[625,155],app_db:[1475,155],app_market:[1220,734],db_backup:[2050,734],local_sql:[965,320]};
    const [lx,ly]=labelPositions[e.id]??[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2-20];
    const topChannel=['work_app','app_db'].includes(e.id);
    svg+=await textBlock(topChannel?e.label.replace(' / ','\n'):e.label,lx,ly,topChannel?165:e.kind==='communicationPath'?380:230,topChannel?27:30);
  }
  svg+='</svg>';
  await fs.writeFile(path.join(out,name+'.svg'),svg);
  await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(out,name+'.png'));
}
const cache=path.resolve(subject,'../../.cache/ppois5-10');
await fs.writeFile(path.join(cache,'implementation-model.json'),JSON.stringify({allocations,class_count:18,
  component_count:7,diagnostics,figures:Object.values(figureNames),
  target:'Planned deployment; not an installed production system',prototype:'Executed bounded console slice only'},null,2)+'\n');
console.log('PPOIS5: 18 allocated classes, 7 components, 3 sheets, no diagnostics');
