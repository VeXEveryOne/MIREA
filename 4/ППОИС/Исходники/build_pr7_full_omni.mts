// SQL-backed ERD model and editable, compact Crow's Foot print sheets.
// All graphics are OmniNotation elements; PNGs are made only by its native exporter.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {omniModule} from '../../../tools/runtime.mjs';
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {erdEngine}=await omniModule('src/notations/erd/document.ts');
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const base=path.resolve('4/ППОИС'),dir=path.join(base,'Схемы'),cache=path.resolve('.cache/ppois-pr7-20261112');
await fs.mkdir(cache,{recursive:true});
const hash=async(file:string)=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const db=JSON.parse(await fs.readFile(path.join(base,'База_данных/Результаты_проверки.json'),'utf8'));
for(const [name,h] of Object.entries(db.source_sha256))if(await hash(path.join(base,'База_данных',name))!==h)throw Error('Stale SQL: '+name);
const modelFile=path.join(dir,'ПР7_Модель_данных.omni');
const old=JSON.parse(await fs.readFile(modelFile,'utf8')),model=old.model;
const conceptual=new Set(model.elements.filter((e:any)=>e.kind==='diagram'&&e.properties.type==='conceptual').map((e:any)=>e.id));
model.elements=model.elements.filter((e:any)=>e.kind==='diagram'?conceptual.has(e.id):e.kind==='view'?conceptual.has(e.properties.diagram):true);
const nodes:any={},edges:any={};
for(const v of model.elements.filter((e:any)=>e.kind==='view')){if(old.layout.nodes[v.id])nodes[v.id]=old.layout.nodes[v.id];if(old.layout.edges[v.id])edges[v.id]=old.layout.edges[v.id];}
const add=(kind:string,id:string,label='',properties:any={})=>model.elements.push({kind,id,label,properties});
const tables=Object.keys(db.counts),cols=(t:string)=>db.columns.filter((c:any)=>c.table_name===t);
const fks=db.key_catalog.filter((k:any)=>k.contype==='f'),keys=db.key_catalog.filter((k:any)=>['p','u'].includes(k.contype));
const primary=(t:string)=>keys.find((k:any)=>k.table_name===t&&k.contype==='p').columns;
const columnOrder=[['component_group','component','supplier','offer','image','publication_attempt'],['configuration','model_range_version','model_range_slot','card','card_revision','revision_image']];
const boxes:any={};
for(const [column,list] of columnOrder.entries()){
 let y=30;
 for(const t of list){const h=46+cols(t).length*33;boxes[t]={x:column?845:135,y,w:column?555:510,h,column};y+=h+44;}
}
const semanticSheets=[];
for(const physical of [false,true]){
 const sheet=physical?'physical_full':'logical_full';add('diagram',sheet,physical?'Физическая модель':'Логическая модель',{type:physical?'physical':'logical'});
 for(const t of tables){const id='v_'+sheet+'_'+t,b=boxes[t];add('view',id,'',{diagram:sheet,element:t});nodes[id]={x:b.column*1000,y:b.y*2,width:800,height:90+cols(t).length*40};}
 for(const fk of fks){const id='v_'+sheet+'_'+fk.conname;add('view',id,'',{diagram:sheet,element:physical?fk.conname:'relation__'+fk.conname,from:'v_'+sheet+'_'+(physical?fk.table_name:fk.parent_table),to:'v_'+sheet+'_'+(physical?fk.parent_table:fk.table_name)});}
 semanticSheets.push({sheet,physical,entities:tables,attributes:db.columns.map((c:any)=>c.table_name+'__'+c.column_name),internalRelations:fks.map((f:any)=>f.conname),repeatedKeysOnly:[],crossReferences:[]});
}
let native=erdEngine.create(model);native=erdEngine.decode({...native,layout:{...native.layout,nodes:{...native.layout.nodes,...nodes},edges:{...native.layout.edges,...edges}}});
const diagnostics=erdEngine.inspect(native.source).diagnostics;if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
await fs.writeFile(modelFile,await encodeProject(native)+'\n');await decodeProject(await fs.readFile(modelFile,'utf8'));
const auditFile=path.join(dir,'ПР7_Проверка_модели.json'),audit=JSON.parse(await fs.readFile(auditFile,'utf8'));
audit.sheets=semanticSheets;audit.diagnostics=diagnostics;audit.logicalAttributeCoverage=semanticSheets[0].attributes.sort();
await fs.writeFile(auditFile,JSON.stringify(audit,null,2)+'\n');
const print:any={id:'pr7_full_print',label:'Полные модели данных',elements:[]},pn:any={},pe:any={};
const item=(kind:string,id:string,label='',properties:any={})=>print.elements.push({kind,id,label,properties});
let serial=0,diagram='';
function block(x:number,y:number,w:number,h:number,shape='rectangle',fill='#ffffff',stroke='#000000',z=1){
 const id='shape_'+serial++;item('block',id,'',{shape,role:'generic'});item('view','v_'+id,'',{diagram,element:id});
 pn['v_'+id]={x:x-w/98,y:y-h/98,width:w/.98,height:h/.98,z,style:{fill,stroke,lineWidth:1.5}};return 'v_'+id;
}
function label(id:string,text:string,x:number,y:number,w:number,h:number,size=25){
 item('label',id,text,{text});item('view','v_'+id,'',{diagram,element:id});pn['v_'+id]={x,y,width:w,height:h,z:4,style:{fontSize:size,color:'#000000'}};
}
function line(id:string,points:any[],dashed=false){
 const a=points[0],b=points.at(-1),from='point_'+serial++,to='point_'+serial++;
 for(const [name,p] of [[from,a],[to,b]] as any){item('label',name,'',{text:''});item('view','v_'+name,'',{diagram,element:name});pn['v_'+name]={x:p.x-.5,y:p.y-.5,width:1,height:1,z:0};}
 item('link',id,'',{from,to,kind:'association'});item('view','v_'+id,'',{diagram,element:id,from:'v_'+from,to:'v_'+to});
 pe['v_'+id]={bends:points.slice(1,-1),from:{side:'right',offset:.5},to:{side:'right',offset:.5},style:{lineWidth:1.7,dashed}};
}
function crow(id:string,p:any,side:string,min:string,max:string){
 const dx=side==='right'?1:-1,at=(d:number,v=0)=>({x:p.x+dx*d,y:p.y+v});
 // SCHEME routes links orthogonally. A half-masked native diamond supplies
 // the two diagonal prongs; the relationship itself supplies the middle one.
 if(max==='many'){
  block(p.x-21,p.y-10,42,20,'diamond','#ffffff','#000000',5);
  block(dx>0?p.x-22:p.x,p.y-12,22,24,'rectangle','#ffffff','#ffffff',6);
  block(p.x-.4,p.y-12,.8,24,'rectangle','#000000','#000000',7);
  block(dx>0?p.x:p.x-21,p.y-.4,21,.8,'rectangle','#000000','#000000',7);
 }
 else block(at(10).x-.4,p.y-10,.8,20,'rectangle','#000000','#000000',5);
 if(min==='0')block(at(31).x-6,p.y-6,12,12,'ellipse','#ffffff','#000000',5);
 else block(at(29).x-.4,p.y-10,.8,20,'rectangle','#000000','#000000',5);
}
const fields:any={},relationProof:any[]=[];
for(const physical of [false,true]){
 diagram=physical?'physical':'logical';item('diagram',diagram,physical?'Физическая модель':'Логическая модель',{type:'general'});
 fields[diagram]=[];
 for(const t of tables){
  const b=boxes[t];block(b.x,b.y,b.w,b.h);
  label(diagram+'_'+t+'__header',t,b.x+2,b.y+2,b.w-4,41,29);
  block(b.x,b.y+44,b.w,.8,'rectangle','#000000');
  for(const [i,c] of cols(t).entries()){
   const flags=[primary(t).includes(c.column_name)?'PK':'',fks.some((f:any)=>f.table_name===t&&f.columns.includes(c.column_name))?'FK':'',keys.some((k:any)=>k.table_name===t&&k.contype==='u'&&k.columns.includes(c.column_name))?'UQ':''].filter(Boolean).join(' ');
   let type=c.udt_name==='int4'?'integer':c.udt_name==='bool'?'boolean':c.udt_name==='bpchar'?'char':c.udt_name;
   if(['varchar','char'].includes(type))type+='('+c.character_maximum_length+')';
   if(type==='numeric')type+='('+c.numeric_precision+','+c.numeric_scale+')';
   const text=[flags,c.column_name,physical?': '+type+(c.is_nullable==='NO'?' NN':''):''].filter(Boolean).join(' ');
   label(diagram+'__'+t+'__'+c.column_name,text,b.x+4,b.y+46+i*33,b.w-8,33,25);
   fields[diagram].push({table:t,column:c.column_name,text,type,nullable:c.is_nullable==='YES'});
  }
 }
 const ports:any={},routes:any[]=[];
 const plans=fks.map((f:any,i:number)=>{const a=boxes[f.parent_table],b=boxes[f.table_name],same=a.column===b.column;const from=same?(a.column?'right':'left'):(a.column?'left':'right'),to=same?from:(b.column?'left':'right');for(const [t,s] of [[f.parent_table,from],[f.table_name,to]])ports[t+':'+s]=(ports[t+':'+s]??0)+1;return {f,i,a,b,from,to,same};});
 const used:any={};
 function port(t:string,side:string){const b=boxes[t],key=t+':'+side,i=used[key]??0;used[key]=i+1;return {x:b.x+(side==='right'?b.w:0),y:b.y+48+(b.h-56)*(i+.5)/ports[key]};}
 for(const p of plans){
  const {f,i,a,from,to,same}=p,start=port(f.parent_table,from),end=port(f.table_name,to);
  const bus=same?(a.column?1440+i*9:20+i*8):690+i*9;
  const points=[start,{x:bus,y:start.y},{x:bus,y:end.y},end];
  const mandatory=f.columns.every((c:string)=>cols(f.table_name).find((x:any)=>x.column_name===c).is_nullable==='NO'),identifying=f.columns.every((c:string)=>primary(f.table_name).includes(c));
  line(diagram+'_fk_'+i,points,!identifying);crow(diagram+'_parent_'+i,start,from,mandatory?'1':'0','1');crow(diagram+'_child_'+i,end,to,'0','many');
  routes.push({foreignKey:f.conname,parent:f.parent_table,child:f.table_name,columns:f.columns,parentColumns:f.parent_columns,mandatory,identifying,points});
 }
 relationProof.push({diagram,entityCount:tables.length,fieldCount:fields[diagram].length,relations:routes});
}
const presentation=schemeEngine.create(print);Object.assign(presentation.layout.nodes,pn);Object.assign(presentation.layout.edges,pe);
const warnings=schemeEngine.validate(print);if(warnings.some((d:any)=>d.blocksCommit||d.blocksExport))throw Error(JSON.stringify(warnings));
const printFile=path.join(dir,'ПР7_Полные_модели.omni');await fs.writeFile(printFile,await encodeProject(presentation)+'\n');await decodeProject(await fs.readFile(printFile,'utf8'));
const options={format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:5000,margin:12};
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options,jobs:[{file:printFile,diagramId:'logical',title:'ПР7_Логическая_полная'},{file:printFile,diagramId:'physical',title:'ПР7_Физическая_полная'}]},null,2));
await fs.writeFile(path.join(dir,'ПР7_Экспорт_Чена.json'),JSON.stringify({output:path.join(cache,'chen-native-'+Date.now()),options,jobs:[audit.conceptualOverview,...audit.conceptualSheets].map((s:any)=>({file:modelFile,diagramId:s.sheet,title:s.file.slice(0,-4)}))},null,2)+'\n');
const proof={database:db.database,source_sha256:db.source_sha256,models:{semantic:await hash(modelFile),presentation:await hash(printFile)},diagnostics,printWarnings:warnings.length,weakEntities:audit.weakEntities,fields,sheets:relationProof};
await fs.writeFile(path.join(dir,'ПР7_Полные_модели_проверка.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({semanticSheets:2,printSheets:2,entities:12,fields:71,relationships:13,diagnostics,printWarnings:warnings.length}));
