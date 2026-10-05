// Editable native geometry and print SVG share exactly the same ICOM routes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR,omniModule} from './runtime.mjs';
import {placeLabels,render} from '../../../tools/idef0_print.mts';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {arrowAnchor,arrowPoints}=await omniModule('src/notations/idef0/arrows.ts');
const {patchUnified}=await omniModule('src/language/unified.ts');
const {validateIdef0Complete}=await omniModule('src/notations/idef0/model.ts');
const out=path.join(MODEL_DIR,'report_figures');await fs.mkdir(path.join(out,'SVG'),{recursive:true});
const audits=[];
function layout(doc:any,toBe:boolean){
 const l=doc.layout;l.textStyles={};
 l.frames.context={x:0,y:0,width:2100,height:950};
 l.frames.decomposition={x:0,y:0,width:2100,height:1150};
 l.positions.root={x:750,y:360};l.sizes.root={width:600,height:200};l.textStyles.root={fontSize:30,wrap:true};
 const count=toBe?6:5;
 for(let i=0;i<count;i++){
  const id=`A${i+1}`;l.positions[id]=toBe?{x:95+i*326,y:440}:{x:170+i*360,y:230+i*120};
  l.sizes[id]={width:280,height:200};l.textStyles[id]={fontSize:24,wrap:true};
 }
 const route=(id:string,middle:any[],label:any,width=320,size=24)=>{
  const a=arrowAnchor(doc,id,'from'),b=arrowAnchor(doc,id,'to');
  l.arrows[id]={...l.arrows[id],bends:[{x:a.point.x+a.normal.x*24,y:a.point.y+a.normal.y*24},...middle,{x:b.point.x+b.normal.x*24,y:b.point.y+b.normal.y*24}],label};
  l.textStyles[id]={fontSize:size,width,wrap:true};
 };
 const ctx=doc.model.edges.filter((e:any)=>e.id.startsWith('c_'));
 for(const role of ['input','control','output','mechanism']){
  const group=ctx.filter((e:any)=>e.properties.role===role);
  for(const [i,e] of group.entries()){
   const out=role==='output',offset=(i+1)/(group.length+1);l.arrows[e.id]={...(out?{fromOffset:offset}:{toOffset:offset})};
   const fn=arrowAnchor(doc,e.id,out?'from':'to').point,id=out?e.target:e.source;
   if(role==='input'){
    const y=335+i*75;l.positions[id]={x:0,y};route(e.id,[{x:700,y},{x:700,y:fn.y}],{x:345,y:y-20},640,26);
   }else if(role==='output'){
    const y=290+i*95,x=1400+i*30;l.positions[id]={x:2100,y};route(e.id,[{x,y:fn.y},{x,y}],{x:1750,y:y-20},630,26);
   }else{
    const x=190+i*860,y=role==='control'?0:950,c=role==='control'?230+i*24:735-i*22;
    l.positions[id]={x,y};route(e.id,[{x,y:c},{x:fn.x,y:c}],{x,y:role==='control'?180:900},340,24);
   }
  }
 }
 for(const [i,e] of doc.model.edges.filter((e:any)=>e.id.startsWith('d_')&&!e.properties.branchOf).entries()){
  const role=e.properties.role,out=role==='output',id=out?e.target:e.source;
  // Reassign distinct ports in model order; branches share a genuine junction.
  const peers=doc.model.edges.filter((p:any)=>!p.id.startsWith('c_')&&(out?p.source===e.source:p.target===e.target)&&p.properties.role===role);
  l.arrows[e.id]={...(out?{fromOffset:(peers.indexOf(e)+1)/(peers.length+1)}:{toOffset:(peers.indexOf(e)+1)/(peers.length+1)})};
  const fn=arrowAnchor(doc,e.id,out?'from':'to').point;
  if(role==='control'||role==='mechanism'){
   l.positions[id]={x:fn.x,y:role==='control'?0:1150};route(e.id,[],{x:fn.x,y:role==='control'?150:1100},toBe?310:360);
  }else if(role==='input'){
   const y=toBe?({d_change:350,d_sources:720,d_media:790,d_response:855}[e.id]??fn.y):({d_task:270,d_market:410,d_bom:470,d_ozon:560}[e.id]??fn.y);
   l.positions[id]={x:0,y};const x=toBe?Math.max(30,fn.x-35):fn.x-40;
   route(e.id,y===fn.y?[]:[{x,y},{x,y:fn.y}],{x:toBe?250:Math.max(90,Math.min(340,fn.x/2)),y:y-18},toBe?470:Math.max(170,Math.min(620,fn.x-35)),22);
  }else{
   const index=ctx.filter((p:any)=>p.properties.role==='output').findIndex((p:any)=>p.id.replace(/^c_/,'d_')===e.id);
   const y=toBe?[280,730,830,930][index]:[fn.y,970,1040][index],x=fn.x+30+index*18;
   l.positions[id]={x:2100,y};route(e.id,y===fn.y?[]:[{x,y:fn.y},{x,y}],{x:toBe?1780:1650,y:y-22},toBe?560:650,24);
  }
 }
 // Boundary fan-outs: never draw independent lines as a shared fork.
 for(const e of doc.model.edges.filter((e:any)=>e.properties.branchOf)){
  const parent=doc.model.edges.find((p:any)=>p.id===e.properties.branchOf),points=arrowPoints(doc,parent.id),role=e.properties.role;
  const junctionY=role==='input'?410:role==='control'?190:1050;
  let length=0,at=0,found=false;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y);
   if(!found&&a.x===b.x&&junctionY>=Math.min(a.y,b.y)&&junctionY<=Math.max(a.y,b.y)){at=length+Math.abs(a.y-junctionY);found=true;}
   length+=d;
  }
  if(!found)throw Error(`No vertical branch corridor: ${e.id}`);
  l.arrows[e.id]={toOffset:.7,branchOffset:at/length};
  const a=arrowAnchor(doc,e.id,'from').point,b=arrowAnchor(doc,e.id,'to').point;
  route(e.id,role==='input'?[{x:a.x,y:b.y}]:[{x:b.x,y:a.y}],{x:b.x,y:a.y-10});
 }
 for(let i=0;i<count-1;i++){
  const id=`step${i+1}${i+2}`,e=doc.model.edges.find((e:any)=>e.id===id);
  // Stable D-codes connect concise graphic labels to full document tables.
  const words=toBe?['Снимок','Версия','Расчёты','Пакет','Попытка']:['Данные','Состав','Расчёты','Карточка'];
  e.label=`D${i+1}: ${words[i]}`;l.arrows[id]={fromOffset:.5,toOffset:.5};
  const a=arrowAnchor(doc,id,'from').point,b=arrowAnchor(doc,id,'to').point,x=(a.x+b.x)/2;
  route(id,a.y===b.y?[]:[{x,y:a.y},{x,y:b.y}],{x,y:toBe?415:a.y-20},toBe?130:120,20);
 }
 const e=doc.model.edges.find((e:any)=>e.id==='correction');
 l.arrows[e.id]={fromOffset:.15,toOffset:.85};const a=arrowAnchor(doc,e.id,'from').point,b=arrowAnchor(doc,e.id,'to').point;
 route(e.id,[{x:a.x+35,y:a.y},{x:a.x+35,y:115},{x:b.x,y:115}],{x:1120,y:110},650,24);
 return doc;
}
for(const [file,toBe,prefix] of [['ИМ_ПР4_IDEF0_AS-IS.omni',false,'ПР4_AS_IS'],['ИМ_ПР5_IDEF0_TO-BE.omni',true,'ПР5_TO_BE']] as const){
 const filePath=path.join(MODEL_DIR,file);let doc=structuredClone(layout(await decodeProject(await fs.readFile(filePath,'utf8')),toBe));
 await placeLabels(doc);doc=structuredClone(doc);doc.source=patchUnified(doc.source,doc.model);doc.draft=doc.source;
 const diagnostics=validateIdef0Complete(doc.model);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
 await fs.writeFile(filePath,await encodeProject(doc));
 for(const sheet of ['context','decomposition'])audits.push(await render(doc,sheet,path.join(out,'SVG',`${prefix}_${sheet}.svg`),path.join(out,`${prefix}_${sheet}.png`),MODEL_DIR));
}
await fs.writeFile(path.join(out,'ПРОВЕРКА_IDEF0.json'),JSON.stringify(audits,null,2)+'\n');
console.log(audits.map(a=>({sheet:a.sheetId,functions:a.functions,arrows:a.arrows,png:a.png})));
