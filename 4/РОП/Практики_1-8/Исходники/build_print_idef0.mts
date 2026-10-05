// Compact, editable IDEF0 layouts and print exports from the same native model.
// No second semantic model: every box, port and route is read from the .omni file.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR,EXPORT_DIR,ROOT,omniModule} from './runtime.mjs';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {arrowAnchor}=await omniModule('src/notations/idef0/arrows.ts');
const {validateIdef0Complete}=await omniModule('src/notations/idef0/model.ts');
const {patchUnified}=await omniModule('src/language/unified.ts');
import {placeLabels,render} from '../../../../tools/idef0_print.mts';
function branch(doc:any,id:string,parentId:string,target:string,role:string){
 if(!doc.model.edges.some((e:any)=>e.id===id)){
  const parent=doc.model.edges.find((e:any)=>e.id===parentId);
  doc.model.edges.push({id,kind:'arrow',source:parent.source,target,label:parent.label,properties:{role,branchOf:parentId}});
 }
 doc.layout.arrows[id]={toOffset:.5};
}
function compact(doc:any,toBe:boolean){
 // The context is unchanged semantically; only the previously oversized sheet
 // and its independent ICOM corridors are replaced.
 const layout=doc.layout;layout.textStyles={};
 if(toBe)for(const item of [...doc.model.nodes,...doc.model.edges]){
  if(['ctx_request','dec_request','c_request','d_request'].includes(item.id))item.label='Запрос на создание или изменение карточки';
 }
 layout.frames.context={x:0,y:0,width:2100,height:1150};
 layout.frames.decomposition={x:0,y:0,width:2100,height:1150};
 layout.positions.root={x:750,y:420};layout.sizes.root={width:600,height:220};
 layout.textStyles.root={fontSize:30,wrap:true};
 const count=toBe?5:6;
 for(let i=0;i<count;i++){
  const id=`A${i+1}`;
  layout.positions[id]=toBe?{x:95+i*395,y:470}:{x:190+i*320,y:190+i*120};
  layout.sizes[id]={width:toBe?300:230,height:220};
  layout.textStyles[id]={fontSize:24,wrap:true};
 }
 if(!toBe)branch(doc,'d_desktop_A2','d_desktop','A2','mechanism');
 else branch(doc,'d_rules_A4','d_rules','A4','control');
 if(toBe){
  // Separate independent outputs: no accidental visual fork from equal offsets.
  for(const [id,offset] of [['d_version',.28],['step34',.65],['feedback_correction',.14],['d_content',.28],['step45',.65]] as const)layout.arrows[id].fromOffset=offset;
 }
 const roles=['input','control','output','mechanism'];
 const contextEdges=doc.model.edges.filter((e:any)=>e.id.startsWith('c_'));
 const peer=(role:string)=>contextEdges.filter((e:any)=>e.properties.role===role);
 const route=(id:string,middle:any[],label:any,width=280,size=24)=>{
  const a=arrowAnchor(doc,id,'from'),b=arrowAnchor(doc,id,'to');
  layout.arrows[id]={...layout.arrows[id],bends:[{x:a.point.x+a.normal.x*28,y:a.point.y+a.normal.y*28},...middle,{x:b.point.x+b.normal.x*28,y:b.point.y+b.normal.y*28}],label};
  layout.textStyles[id]={fontSize:size,width,wrap:true};
 };
 for(const role of roles){
  const edges=peer(role);
  for(const [i,e] of edges.entries()){
   const offset=(i+1)/(edges.length+1),out=role==='output';
   layout.arrows[e.id]={...(out?{fromOffset:offset}:{toOffset:offset})};
   const boundary=out?e.target:e.source;
   const fn=arrowAnchor(doc,e.id,out?'from':'to').point;
   if(role==='input'){
    const y=465+i*95;layout.positions[boundary]={x:0,y};
    route(e.id,[{x:710,y},{x:710,y:fn.y}],{x:355,y:y-22},610,26);
   }else if(role==='output'){
    const y=365+i*145,x=1400+i*32;layout.positions[boundary]={x:2100,y};
    route(e.id,[{x,y:fn.y},{x,y}],{x:1740,y:y-20},610,26);
   }else{
    const x=185+i*(1730/(edges.length-1)),y=role==='control'?0:1150;
    layout.positions[boundary]={x,y};
    const corridor=role==='control'?275+i*22:865-i*24;
    route(e.id,[{x,y:corridor},{x:fn.x,y:corridor}],{x,y:role==='control'?220:1080},305,24);
   }
  }
 }
 // Preserve all parentArrow references and hence the A-0 / A0 interface balance.
 for(const role of roles){
  for(const [i,c] of peer(role).entries()){
   const id=c.id.replace(/^c_/,'d_'),e=doc.model.edges.find((e:any)=>e.id===id),out=role==='output';
   // Retain intentional separate ports for feedback and parallel interfaces.
   const original=layout.arrows[id]??{};
   layout.arrows[id]={...original,bends:undefined};
   const fn=arrowAnchor(doc,id,out?'from':'to').point,boundary=out?e.target:e.source;
   if(role==='control'||role==='mechanism'){
    layout.positions[boundary]={x:fn.x,y:role==='control'?0:1150};
    const labelX=toBe&&id==='d_approval'?1290:fn.x-(toBe?0:35);
    route(id,[],{x:labelX,y:role==='control'?(toBe&&id==='d_ozon'?400:165):1095},toBe?340:285,24);
   }else if(role==='input'){
    let y=fn.y;
    if(toBe&&id==='d_catalog')y=355;
    if(toBe&&id==='d_offers')y=725;
    layout.positions[boundary]={x:0,y};
    const mx=toBe?450:fn.x-30;
    route(id,fn.y===y?[]:[{x:mx,y},{x:mx,y:fn.y}],{x:toBe?230:(id==='d_request'?95:240),y:y-24},id==='d_request'?(toBe?400:190):400,id==='d_request'?20:24);
   }else{
    let y=fn.y,x=fn.x+36;
    if(toBe){y=[285,385,730,850][i];x=fn.x+36;}
    else if(id==='d_card'){y=675;x=2050;}
    else if(id==='d_waste'){y=1000;x=2075;}
    layout.positions[boundary]={x:2100,y};
    route(id,y===fn.y?[]:[{x,y:fn.y},{x,y}],{x:toBe?1810:(id==='d_table'?1390:id==='d_values'?1710:1790),y:y-20},toBe?475:500,24);
   }
  }
 }
 const short=toBe?['Черновик','Состав','Снимок','Карточка']:['Файлы','Черновой состав','Состав после проверки','Цены и остатки','Данные карточки'];
 for(let i=0;i<count-1;i++){
  const id=`step${i+1}${i+2}`,a=arrowAnchor(doc,id,'from').point,b=arrowAnchor(doc,id,'to').point,mx=(a.x+b.x)/2;
  const label=toBe?{x:mx,y:445}:{x:mx,y:a.y-20};
  // Concise names retain the same objects; full results are in the function table.
  doc.model.edges.find((e:any)=>e.id===id).label=short[i];
  route(id,a.y===b.y?[]:[{x:mx,y:a.y},{x:mx,y:b.y}],label,toBe?190:115,20);
 }
 const feedback=doc.model.edges.filter((e:any)=>e.id.startsWith('feedback_'));
 for(const [i,e] of feedback.entries()){
  const a=arrowAnchor(doc,e.id,'from').point,b=arrowAnchor(doc,e.id,'to').point;
  const y=toBe?260:[260,235,210,690][i],x=a.x+40;
  const lx=toBe?920:[880,1190,1510,1730][i];
  route(e.id,[{x,y:a.y},{x,y},{x:b.x,y}],{x:lx,y:y-15},toBe?365:310,24);
 }
 const bid=toBe?'d_rules_A4':'d_desktop_A2',parent=toBe?'d_rules':'d_desktop';
 const p=arrowAnchor(doc,parent,'from').point,q=arrowAnchor(doc,parent,'to').point;
 const junctionY=toBe?185:1025;
 layout.arrows[bid].branchOffset=Math.abs(p.y-junctionY)/Math.abs(p.y-q.y);
 const target=arrowAnchor(doc,bid,'to').point;
 route(bid,[{x:p.x,y:junctionY},{x:target.x,y:junctionY}],{x:target.x,y:junctionY-12},280,22);
 return doc;
}
const audit:any[]=[];await fs.mkdir(EXPORT_DIR,{recursive:true});
const svgDir=path.join(ROOT,'Экспорт','SVG');await fs.mkdir(svgDir,{recursive:true});
for(const [file,toBe,numbers] of [['ПР1_IDEF0_AS_IS.omni',false,[1,2]],['ПР2_IDEF0_TO_BE.omni',true,[6,7]]] as const){
 const filePath=path.join(MODEL_DIR,file);let doc=structuredClone(compact(await decodeProject(await fs.readFile(filePath,'utf8')),toBe));
 await placeLabels(doc);doc=structuredClone(doc);
 doc.source=patchUnified(doc.source,doc.model);doc.draft=doc.source;
 const diagnostics=validateIdef0Complete(doc.model);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
 // Encoding validates persisted appearance/layout properties, not only semantics.
 await fs.writeFile(filePath,await encodeProject(doc));
 for(const [index,sheet] of ['context','decomposition'].entries()){
  const prefix=String(numbers[index]).padStart(2,'0')+'_';const matches=(await fs.readdir(EXPORT_DIR)).filter(f=>f.startsWith(prefix)&&f.endsWith('.png'));
  if(matches.length!==1)throw Error(`Expected one existing export: ${prefix}`);
  const png=path.join(EXPORT_DIR,matches[0]),svg=path.join(svgDir,matches[0].replace('.png','.svg'));
  audit.push(await render(doc,sheet,svg,png,ROOT));
 }
}
await fs.writeFile(path.join(ROOT,'ПРОВЕРКА_печатных_IDEF0.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit.map(({sheetId,functions,arrows,png})=>({sheetId,functions,arrows,png})),null,2));
