// PPOIS7: the executed PostgreSQL catalog is the source of the editable ER model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {omniModule,runtimeModule} from '../../../tools/runtime.mjs';
import {escape,wrap} from '../../../tools/diagram_text.mts';
const {erdEngine}=await omniModule('src/notations/erd/document.ts');
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {routeHitsBox}=await omniModule('src/notations/structured/geometry.ts');
const {routeAroundFunctions,parallelFlowPenalty}=await omniModule('src/notations/idef0/route.ts');
const {default:sharp}=await runtimeModule('sharp');
const subject=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.env.PPOIS_MODEL_OUTPUT??path.join(subject,'Схемы');
const evidence=JSON.parse(await fs.readFile(path.join(subject,'База_данных/Результаты_проверки.json'),'utf8'));
for(const [name,hash] of Object.entries(evidence.source_sha256)){
  const actual=createHash('sha256').update(await fs.readFile(path.join(subject,'База_данных',name))).digest('hex');
  if(actual!==hash)throw Error('Stale PostgreSQL catalog: '+name);
}
if(!evidence.tests.every((t:any)=>t.passed))throw Error('Database checks must pass');
const labels:Record<string,string>={component_group:'Группа компонентов',component:'Компонент',supplier:'Поставщик',offer:'Предложение',
  configuration:'Конфигурация',bom_version:'Версия состава',bom_slot:'Позиция состава',card:'Карточка',card_revision:'Ревизия карточки',
  image:'Изображение',revision_image:'Изображение ревизии',publication_attempt:'Попытка публикации'};
const groups=[
  ['catalog','Каталог и предложения',['component_group','component','supplier','offer']],
  ['bom','Конфигурация и состав',['configuration','bom_version','bom_slot','component_group','component','offer']],
  ['cards','Карточка и расчёт',['card','card_revision','bom_version']],
  ['publication','Изображения и публикация',['card_revision','image','revision_image','publication_attempt']],
] as const;
const model:any={id:'ppois_database',label:'ПР7 информационная модель ИС подготовки карточек',elements:[]};
const add=(kind:string,id:string,label='',properties:Record<string,string>={})=>{model.elements.push({kind,id,label,properties});return id;};
const columnId=(table:string,column:string)=>table+'__'+column;
const cols=(table:string)=>evidence.columns.filter((c:any)=>c.table_name===table);
for(const table of Object.keys(evidence.counts)){
  add('entity',table,labels[table],{schema:'ppois',sqlName:table});
  for(const c of cols(table)){
    const p:Record<string,string>={owner:table,sqlName:c.column_name,sqlType:c.udt_name==='int4'?'integer':c.udt_name==='bool'?'boolean':c.udt_name,
      nullable:c.is_nullable==='YES'?'true':'false',order:String(c.ordinal_position-1)};
    if(['varchar','char','bpchar'].includes(p.sqlType)){
      if(p.sqlType==='bpchar')p.sqlType='char';
      if(c.character_maximum_length!==null)p.length=String(c.character_maximum_length);
    }
    if(p.sqlType==='numeric'){p.precision=String(c.numeric_precision);p.scale=String(c.numeric_scale);}
    if(c.column_default!==null)p.default=c.column_default;
    add('attribute',columnId(table,c.column_name),c.column_name,p);
  }
}
const keys=evidence.key_catalog.filter((k:any)=>['p','u'].includes(k.contype));
for(const k of keys){
  add('key',k.conname,k.contype==='p'?'Первичный ключ':'Уникальный ключ',{owner:k.table_name,
    kind:k.contype==='p'?'primary':'unique',sqlName:k.conname});
  k.columns.forEach((c:string,i:number)=>add('keyPart',k.conname+'__'+i,'',{owner:k.conname,attribute:columnId(k.table_name,c),order:String(i)}));
}
const relations:any[]=[];
const relationLabels:Record<string,string>={
  bom_slot_configuration_id_version_no_fkey:'Имеет позицию',bom_slot_group_id_fkey:'Задаёт группу',
  bom_slot_offer_id_fkey:'Выбирает предложение',bom_slot_requested_component_id_fkey:'Требует компонент',
  bom_version_configuration_id_fkey:'Имеет версию',card_revision_card_id_fkey:'Имеет ревизию',
  card_revision_configuration_id_version_no_fkey:'Использует состав',component_group_id_fkey:'Классифицирует',
  offer_component_id_fkey:'Предлагается',offer_supplier_id_fkey:'Поставляет',
  publication_attempt_card_id_revision_no_fkey:'Имеет попытку',
  revision_image_card_id_revision_no_fkey:'Включает изображение',revision_image_image_id_fkey:'Используется',
};
for(const k of evidence.key_catalog.filter((k:any)=>k.contype==='f')){
  const target=keys.find((key:any)=>key.table_name===k.parent_table&&JSON.stringify(key.columns)===JSON.stringify(k.parent_columns));
  if(!target)throw Error('FK target key missing: '+k.conname);
  const primary=keys.find((key:any)=>key.table_name===k.table_name&&key.contype==='p');
  const mandatory=k.columns.every((c:string)=>cols(k.table_name).find((x:any)=>x.column_name===c).is_nullable==='NO');
  const identifying=k.columns.every((c:string)=>primary.columns.includes(c));
  const relation='relation__'+k.conname;
  add('relation',relation,relationLabels[k.conname],{from:k.parent_table,to:k.table_name,fromMin:mandatory?'1':'0',fromMax:'1',
    toMin:'0',toMax:'many',identifying:String(identifying)});
  add('foreignKey',k.conname,'',{owner:k.table_name,targetKey:target.conname,relation,sqlName:k.conname,onDelete:'noAction',onUpdate:'noAction'});
  k.columns.forEach((c:string,i:number)=>add('fkPart',k.conname+'__'+i,'',{owner:k.conname,
    attribute:columnId(k.table_name,c),target:columnId(k.parent_table,k.parent_columns[i]),order:String(i)}));
  relations.push({...k,id:relation,mandatory,identifying});
}
for(const c of evidence.constraints.filter((c:any)=>c.contype==='c'))
  add('check',c.conname,'',{owner:c.table_name,sqlName:c.conname,expression:c.definition.slice(6,-1)});
const primaryColumns=(table:string)=>keys.find((k:any)=>k.table_name===table&&k.contype==='p').columns;
const compact=(group:string,table:string)=>
  group==='bom'&&['component_group','component','offer'].includes(table)||
  group==='cards'&&table==='bom_version'||group==='publication'&&table==='card_revision';
const flags=(table:string,column:string)=>[
  primaryColumns(table).includes(column)?'PK':'',
  keys.some((k:any)=>k.table_name===table&&k.contype==='u'&&k.columns.includes(column))?'UQ':'',
  relations.some((r:any)=>r.table_name===table&&r.columns.includes(column))?'FK':'',
].filter(Boolean).join(' ');
const rects:Record<string,any>={},routes:Record<string,any>={},sheets:any[]=[];
// Conceptual views reuse the exact entities and attributes of the SQL-backed model.
// FK columns are represented by named relationships, not duplicated as conceptual attributes.
const conceptualSheets:any[]=[],conceptualCoverage=new Set<string>();
for(const entity of model.elements.filter((e:any)=>e.kind==='entity'))
  entity.properties.weak=String(relations.some(r=>r.table_name===entity.id&&r.identifying));
for(const attribute of model.elements.filter((e:any)=>e.kind==='attribute'))
  add('attributeLink','attribute_link__'+attribute.id,'',{from:attribute.properties.owner,to:attribute.id});
for(const table of Object.keys(evidence.counts)){
  const parents=relations.filter(r=>r.table_name===table);
  const own=cols(table).filter((c:any)=>!parents.some(r=>r.columns.includes(c.column_name)));
  for(let first=0;first<own.length;first+=8){
    const part=Math.floor(first/8)+1,total=Math.ceil(own.length/8),sheet='conceptual_'+table+'_'+part;
    add('diagram',sheet,labels[table]+(total>1?` · атрибуты ${part}/${total}`:''),{type:'conceptual'});
    const focus='v_'+sheet+'_'+table;
    add('view',focus,'',{diagram:sheet,element:table});
    rects[focus]={x:350,y:440,width:300,height:100};
    const entityViews=[focus],edgeViews:string[]=[],attributeViews:string[]=[];
    parents.forEach((r,i)=>{
      const owner='v_'+sheet+'_'+r.parent_table,x=20+i*250;
      add('view',owner,'',{diagram:sheet,element:r.parent_table});
      rects[owner]={x,y:30,width:210,height:80};entityViews.push(owner);
      const edge='v_'+sheet+'_'+r.id,start={x:x+105,y:110},end={x:390+i*70,y:440};
      const points=[start,{x:start.x,y:240+i*20},{x:end.x,y:240+i*20},end];
      add('view',edge,'',{diagram:sheet,element:r.id,from:owner,to:focus});
      routes[edge]={bends:points.slice(1,-1),from:{side:'bottom',offset:0.5},
        to:{side:'top',offset:(end.x-350)/300},label:{x:start.x,y:170}};
      edgeViews.push(edge);
    });
    const attributes=own.slice(first,first+8),leftCount=Math.ceil(attributes.length/2);
    attributes.forEach((c:any,i:number)=>{
      const left=i<leftCount,row=left?i:i-leftCount,count=left?leftCount:attributes.length-leftCount;
      const attribute=columnId(table,c.column_name),view='v_'+sheet+'_'+attribute;
      add('view',view,'',{diagram:sheet,element:attribute});
      rects[view]={x:left?0:770,y:310+row*95,width:240,height:80};
      const edge='v_'+sheet+'__attribute_'+attribute;
      add('view',edge,'',{diagram:sheet,element:'attribute_link__'+attribute,from:focus,to:view});
      routes[edge]={bends:[],from:{side:left?'left':'right',offset:(row+1)/(count+1)},
        to:{side:left?'right':'left',offset:0.5}};
      attributeViews.push(view);conceptualCoverage.add(attribute);
    });
    conceptualSheets.push({sheet,file:'ПР7_Чен_'+table+'_'+part+'.png',entity:table,part,total,
      attributes:attributes.map((c:any)=>columnId(table,c.column_name)),
      relationships:parents.map(r=>r.conname),entityViews,attributeViews,edgeViews});
  }
}
function separateRoute(start:any,end:any,from:string,to:string,boxes:any[],lanes:any[][]){
  const vectors:Record<string,any>={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
  const extend=(p:any,side:string)=>({x:p.x+vectors[side].x*42,y:p.y+vectors[side].y*42});
  const a=extend(start,from),b=extend(end,to);
  const frame={x:0,y:0,width:2190,height:Math.max(...boxes.map(n=>n.y+n.height))+140};
  const route=routeAroundFunctions(a,b,boxes,frame,12,lanes,true);
  if(!route)throw Error('No unobstructed ER route');
  const points=[start,...route,end];
  if(points.slice(1).some((p:any,i:number)=>parallelFlowPenalty(points[i],p,lanes)>0))
    throw Error('ER links overlap or run too close in parallel');
  return points;
}
for(const physical of [false,true])for(const [group,title,tables] of groups){
  const sheet=(physical?'physical_':'logical_')+group;
  add('diagram',sheet,title,{type:physical?'physical':'logical'});
  const nodes:any[]=[];
  for(const [i,table] of tables.entries()){
    const isCompact=compact(group,table),visible=cols(table).filter((c:any)=>!isCompact||primaryColumns(table).includes(c.column_name));
    const rows:any[]=[];
    for(const c of visible){
      let detail='';
      if(physical){detail=c.udt_name==='int4'?'integer':c.udt_name==='bpchar'?'char':c.udt_name;
        if(['varchar','char'].includes(detail))detail+='('+c.character_maximum_length+')';
        if(detail==='numeric')detail+='('+c.numeric_precision+','+c.numeric_scale+')';
        detail+=c.is_nullable==='NO'?' NN':' NULL';}
      const text=[flags(table,c.column_name),c.column_name,detail].filter(Boolean).join(' · ');
      const lines=await wrap(text,885,32),height=lines.length*40+8;
      rows.push({id:columnId(table,c.column_name),lines,height});
    }
    const header=await wrap(labels[table]+'\n'+table+(isCompact?' · только ключ':' '),885,35,true);
    const headerH=header.length*42+16,height=headerH+rows.reduce((n:number,r:any)=>n+r.height,0);
    nodes.push({table,id:'v_'+sheet+'_'+table,x:70+(i%2)*1130,y:65,width:920,height,headerH,header,rows,isCompact});
  }
  let y=65;
  for(let i=0;i<nodes.length;i+=2){
    for(const n of nodes.slice(i,i+2))n.y=y;
    y+=Math.max(...nodes.slice(i,i+2).map(n=>n.height))+160;
  }
  for(const n of nodes){
    add('view',n.id,'',{diagram:sheet,element:n.table});
    rects[n.id]={x:n.x,y:n.y,width:n.width,height:n.height,
      ...(n.isCompact?{hiddenRows:cols(n.table).filter((c:any)=>!primaryColumns(n.table).includes(c.column_name)).map((c:any)=>columnId(n.table,c.column_name))}:{})};
  }
  const printRelations:any[]=[],ports=new Map<string,number>();
  const port=(n:any,side:string)=>{
    const key=n.id+':'+side,index=ports.get(key)??0;ports.set(key,index+1);
    return side==='left'||side==='right'?{x:n.x+(side==='right'?n.width:0),y:n.y+45+index*58}:
      {x:n.x+120+index*115,y:n.y+(side==='bottom'?n.height:0)};
  };
  for(const r of relations){
    const a=nodes.find(n=>n.table===r.parent_table),b=nodes.find(n=>n.table===r.table_name);
    if(!a||!b)continue;
    const leftRight=a.y===b.y,from=leftRight?(a.x<b.x?'right':'left'):(a.y<b.y?'bottom':'top');
    const to=leftRight?(a.x<b.x?'left':'right'):(a.y<b.y?'top':'bottom');
    const start=port(a,from),end=port(b,to),points=separateRoute(start,end,from,to,nodes,printRelations.map(e=>e.points));
    if(routeHitsBox(points,nodes))throw Error('ER path intersects an entity: '+r.conname);
    const element=physical?r.conname:r.id,viewId='v_'+sheet+'_'+element;
    // Physical semantic orientation is child -> parent; logical orientation is parent -> child.
    add('view',viewId,'',{diagram:sheet,element,from:physical?b.id:a.id,to:physical?a.id:b.id});
    const nativePoints=physical?[...points].reverse():points;
    routes[viewId]={bends:nativePoints.slice(1,-1),from:{side:physical?to:from,offset:(physical?end.y-b.y:start.y-a.y)/(physical?b.height:a.height)},
      to:{side:physical?from:to,offset:(physical?start.y-a.y:end.y-b.y)/(physical?a.height:b.height)}};
    // Horizontal offsets above use y; vertical anchors require x.
    if(['top','bottom'].includes(routes[viewId].from.side))routes[viewId].from.offset=(physical?end.x-b.x:start.x-a.x)/(physical?b.width:a.width);
    if(['top','bottom'].includes(routes[viewId].to.side))routes[viewId].to.offset=(physical?start.x-a.x:end.x-b.x)/(physical?a.width:b.width);
    printRelations.push({r,points,start,end,from,to});
  }
  const cross=relations.filter(r=>nodes.some(n=>n.table===r.parent_table)!==nodes.some(n=>n.table===r.table_name));
  const bottom=Math.max(y-120,...printRelations.flatMap(e=>e.points.map((p:any)=>p.y)));
  sheets.push({sheet,physical,group,nodes,relations:printRelations,cross,bottom});
}
let document=erdEngine.create(model);
document=erdEngine.decode({...document,layout:{...document.layout,nodes:rects,edges:routes}});
const serialized=await encodeProject(document);await decodeProject(serialized);
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'ПР7_Модель_данных.omni'),serialized);
const txt=(text:string,x:number,y:number,size=32,bold=false)=>`<text x="${x}" y="${y}" font-family="Arial" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(text)}</text>`;
function crow(p:any,side:string,min:string,max:string){
  const dx=side==='right'?1:side==='left'?-1:0,dy=side==='bottom'?1:side==='top'?-1:0;
  const at=(distance:number,perp=0)=>({x:p.x+dx*distance-dy*perp,y:p.y+dy*distance+dx*perp});
  const segment=(a:any,b:any)=>`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#111" stroke-width="2.5"/>`;
  let body='';
  if(max==='many'){body+=segment(at(20),at(0,13))+segment(at(20),at(0,-13));}
  else body+=segment(at(12,-13),at(12,13));
  if(min==='0'){const c=at(31);body+=`<circle cx="${c.x}" cy="${c.y}" r="7" fill="white" stroke="#111" stroke-width="2.5"/>`;}
  else body+=segment(at(30,-13),at(30,13));
  return body;
}
const coverage=new Set<string>(),audit:any[]=[];
for(const s of sheets){
  let body='';
  for(const e of s.relations){
    const d=e.points.map((p:any,i:number)=>`${i?'L':'M'}${p.x} ${p.y}`).join('');
    body+=`<path d="${d}" fill="none" stroke="white" stroke-width="9"/><path d="${d}" fill="none" stroke="#111" stroke-width="2.5" ${e.r.identifying?'':'stroke-dasharray="12 8"'}/>`;
  }
  for(const n of s.nodes){
    body+=`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="white" stroke="#111" stroke-width="2.5"/>`;
    n.header.forEach((line:string,i:number)=>body+=txt(line,n.x+16,n.y+41+i*42,35,true));
    let y=n.y+n.headerH;
    for(const row of n.rows){
      body+=`<path d="M${n.x} ${y}h${n.width}" stroke="#aaa" stroke-width="1"/>`;
      row.lines.forEach((line:string,i:number)=>body+=txt(line,n.x+16,y+34+i*40));y+=row.height;
      if(!s.physical)coverage.add(row.id);
    }
  }
  for(const e of s.relations)body+=crow(e.start,e.from,e.r.mandatory?'1':'0','1')+crow(e.end,e.to,'0','many');
  let y=s.bottom+55;
  for(const r of s.cross){
    const line=`Связь с другим листом: ${r.parent_table} ${r.mandatory?'1':'0..1'} — 0..N ${r.table_name}.`;
    for(const l of await wrap(line,2080,28)){body+=txt(l,70,y,28);y+=35;}
  }
  body+=txt('PK — первичный ключ; FK — внешний ключ; UQ — уникальность; NN — NOT NULL.',70,y+12,28);
  body+=txt('Сплошная связь — идентифицирующая; пунктирная — неидентифицирующая.',70,y+49,28);y+=75;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2190" height="${y+30}"><rect width="2190" height="${y+30}" fill="white"/>${body}</svg>`;
  const file='ПР7_'+(s.physical?'Физическая_':'Логическая_')+s.group;
  await fs.writeFile(path.join(output,file+'.svg'),svg);
  await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(output,file+'.png'));
  audit.push({sheet:s.sheet,file:file+'.png',entities:s.nodes.map((n:any)=>n.table),
    repeatedKeysOnly:s.nodes.filter((n:any)=>n.isCompact).map((n:any)=>n.table),
    internalRelations:s.relations.map((r:any)=>r.r.conname),crossReferences:s.cross.map((r:any)=>r.conname),
    parallelOverlaps:0,entityIntersections:0});
}
const expected=evidence.columns.map((c:any)=>columnId(c.table_name,c.column_name));
if(expected.some((id:string)=>!coverage.has(id)))throw Error('An attribute was lost from logical print views');
const diagnostics=erdEngine.inspect(document.source).diagnostics;
if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const conceptualExpected=evidence.columns.filter((c:any)=>!relations.some(r=>r.table_name===c.table_name&&r.columns.includes(c.column_name)))
  .map((c:any)=>columnId(c.table_name,c.column_name));
if(conceptualExpected.some((id:string)=>!conceptualCoverage.has(id)))throw Error('Conceptual attribute coverage is incomplete');
if(relations.some(r=>!conceptualSheets.some(s=>s.relationships.includes(r.conname))))throw Error('Conceptual relationship coverage is incomplete');
const exportDirectory=process.env.PPOIS_CHEN_EXPORT_OUTPUT??path.resolve(subject,'../../.cache/ppois5-10/chen-native-export');
await fs.writeFile(path.join(output,'ПР7_Экспорт_Чена.json'),JSON.stringify({output:exportDirectory,
  options:{format:'png',background:'white',targetWidth:4200,title:false,legend:false,monochrome:true,font:'Arial',margin:20},
  jobs:conceptualSheets.map(s=>({file:path.join(output,'ПР7_Модель_данных.omni'),diagramId:s.sheet,title:s.file.slice(0,-4)}))},null,2)+'\n');
await fs.writeFile(path.join(output,'ПР7_Проверка_модели.json'),JSON.stringify({database:evidence.database,entities:12,
  attributes:expected.length,foreignKeys:relations.length,diagnostics,source_sha256:evidence.source_sha256,
  logicalAttributeCoverage:[...coverage].sort(),conceptualAttributeCoverage:[...conceptualCoverage].sort(),
  weakEntities:model.elements.filter((e:any)=>e.kind==='entity'&&e.properties.weak==='true').map((e:any)=>e.id),
  conceptualSheets,sheets:audit},null,2)+'\n');
console.log(JSON.stringify({entities:12,attributes:expected.length,foreignKeys:relations.length,
  sheets:sheets.length+conceptualSheets.length,conceptualSheets:conceptualSheets.length,diagnostics:diagnostics.length}));
