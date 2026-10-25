// One complete Russian logical model per figure, with every native relation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR,EXPORT_DIR,ROOT,omniModule,runtimeModule} from './runtime.mjs';
import {font,escape,wrap} from './print_text.mts';
import {route,attach,auditRoutes} from './route_print.mts';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {erdTable}=await omniModule('src/notations/erd/presentation.ts');
const {default:sharp}=await runtimeModule('sharp');
const file=path.join(MODEL_DIR,'РОП_ERD.omni'),d=await decodeProject(await fs.readFile(file,'utf8'));
const idx=new Map(d.model.elements.map((e:any)=>[e.id,e]));
const registry=JSON.parse(await fs.readFile(path.join(MODEL_DIR,'Реестр_рисунков.json'),'utf8'));
const rows=[
 ['role','user_role','app_user','audit_event','notification','image_template'],
 ['characteristic','component_value','component','component_group','supplier','image_asset'],
 ['compatibility_rule','validation_result','model_line_version','model_line_slot','supplier_product','card_image'],
 ['replacement_rule','change_request','model_line','slot_selection','supplier_offer','card_version'],
 ['replacement_batch','replacement_item','calculation_rule','card','publication'],
];
const entities=rows.flat(),semantic=d.model.elements.filter((e:any)=>e.kind==='entity').map((e:any)=>e.id);
if(semantic.length!==entities.length||semantic.some((id:string)=>!entities.includes(id)))throw Error('Entity coverage mismatch');
const prepared=new Map();
for(const id of entities){
 const t=erdTable(d,idx.get(id),false),header=await wrap(t.title,535,32,true),data=[];
 for(const r of t.rows){const flags=r.flags.replaceAll('PK','ПК').replaceAll('FK','ВК').replaceAll('UQ','УК');const lines=await wrap([flags,r.name].filter(Boolean).join(' · '),535,28);data.push({...r,lines,height:Math.max(38,lines.length*32+6)});}
 prepared.set(id,{header,rows:data,headerH:header.length*38+22,height:header.length*38+22+data.reduce((n,r)=>n+r.height,0)});
}
const nodes:any[]=[];let y=85;
for(const row of rows){for(const [column,id] of row.entries())nodes.push({id,elementId:id,x:80+column*850,y,width:570,...prepared.get(id)});y+=Math.max(...row.map(id=>prepared.get(id).height))+245;}

const text=(v:string,x:number,y:number,size=28,bold=false)=>`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(v)}</text>`;
let body='';const routes:any[]=[];
const relations=d.model.elements.filter((e:any)=>e.kind==='relation');
const plans=relations.map((r:any)=>{
 const a=nodes.find(n=>n.id===r.properties.from),b=nodes.find(n=>n.id===r.properties.to),dx=b.x-a.x,dy=b.y-a.y;
 const sideA=dx===0?(dy>0?'bottom':'top'):(dx>0?'right':'left'),sideB=dx===0?(dy>0?'top':'bottom'):(dx>0?'left':'right');
 return {r,a,b,sideA,sideB};
});
const incident=new Map<string,any[]>();
for(const p of plans)for(const [node,other,side,end] of [[p.a,p.b,p.sideA,'from'],[p.b,p.a,p.sideB,'to']]){const key=node.id+':'+side,list=incident.get(key)??[];list.push({p,node,other,side,end});incident.set(key,list);}
// Reserve enough boundary length for distinct cardinality symbols and port tracks.
for(const list of incident.values())if(['left','right'].includes(list[0].side))list[0].node.height=Math.max(list[0].node.height,list[0].node.headerH+52+42*(list.length+1));
y=85;for(const row of rows){for(const id of row)nodes.find(n=>n.id===id).y=y;y+=Math.max(...row.map(id=>nodes.find(n=>n.id===id).height))+245;}
const W=nodes[5].x+570+80,H=y-90;
for(const list of incident.values()){
 list.sort((a,b)=>a.other.y-b.other.y||a.other.x-b.other.x||a.p.r.id.localeCompare(b.p.r.id));
 for(const [i,item] of list.entries()){
  const {node,side}=item,vertical=side==='left'||side==='right';
  const offset=vertical?(node.headerH+26+(node.height-node.headerH-52)*(i+1)/(list.length+1))/node.height:(45+(node.width-90)*(i+1)/(list.length+1))/node.width;
  item.p[item.end]={point:attach(node,side,offset),offset};
 }
}
const ordered=[...plans].sort((a,b)=>Math.abs(a.a.x-a.b.x)+Math.abs(a.a.y-a.b.y)-Math.abs(b.a.x-b.b.x)-Math.abs(b.a.y-b.b.y));
for(const p of ordered){
 const {r,a,b,from,to,sideA,sideB}=p;
 let points;
 try{const channels=plans.filter(q=>q!==p).flatMap(q=>[q.from.point,q.to.point]).map(pt=>({x:Math.min(pt.x,pt.x+pt.nx*96)-6,y:Math.min(pt.y,pt.y+pt.ny*96)-6,width:Math.abs(pt.nx*96)+12,height:Math.abs(pt.ny*96)+12}));
 points=route(from.point,to.point,[...nodes,...channels],routes.map(r=>r.points),{gap:20,pad:8,escape:48,crossCost:160});}
 catch(error){throw Error(`${r.id}: ${error}`);}
 routes.push({...p,points,id:r.id});
 const linePath=points.map((p:any,j:number)=>`${j?'L':'M'}${p.x} ${p.y}`).join('');
 body+=`<path d="${linePath}" fill="none" stroke="white" stroke-width="10"/><path d="${linePath}" fill="none" stroke="#111" stroke-width="2.5"/>`;
}
const routing=auditRoutes('ERD',routes,nodes);
for(const n of nodes){body+=`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="white" stroke="#111" stroke-width="2.5"/>`;n.header.forEach((l:string,i:number)=>body+=text(l,n.x+17,n.y+42+i*38,32,true));let yy=n.y+n.headerH;for(const r of n.rows){body+=`<path d="M${n.x} ${yy}h${n.width}" stroke="#aaa"/>`;r.lines.forEach((l:string,i:number)=>body+=text(l,n.x+17,yy+30+i*32));yy+=r.height;}}
const cardinal=(p:any,side:string,min:string,max:string)=>{const angle={right:0,bottom:90,left:180,top:270}[side];return `<g transform="translate(${p.x} ${p.y}) rotate(${angle})" fill="none" stroke="#111" stroke-width="2.5">`+(max==='many'?'<path d="M0 -10L18 0L0 10M0 0H18"/>':'<path d="M9 -10V10"/>')+(min==='0'?'<circle cx="30" cy="0" r="7" fill="white"/>':'<path d="M28 -10V10"/>')+'</g>';};
for(const r of routes){const p=r.r.properties;body+=cardinal(r.from.point,r.sideA,p.fromMin,p.fromMax)+cardinal(r.to.point,r.sideB,p.toMin,p.toMax);}
const ext=routes.flatMap(r=>r.points),minX=Math.min(0,...ext.map(p=>p.x))-30,minY=Math.min(0,...ext.map(p=>p.y))-30;
const fullW=Math.max(W,...ext.map(p=>p.x))-minX+30,fullH=Math.max(H,...ext.map(p=>p.y))-minY+30;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" viewBox="${minX} ${minY} ${fullW} ${fullH}"><rect x="${minX}" y="${minY}" width="${fullW}" height="${fullH}" fill="white"/>${body}</svg>`;
const audit=[];
for(const sheet of d.model.elements.filter((e:any)=>e.kind==='diagram')){
 for(const n of nodes)d.layout.nodes[sheet.id+'.'+n.id+'.view']={x:n.x,y:n.y,width:n.width,height:n.height};
 for(const r of routes)d.layout.edges[sheet.id+'.'+r.r.id+'.view']={from:{side:r.sideA,offset:r.from.offset},to:{side:r.sideB,offset:r.to.offset},bends:r.points.slice(1,-1)};
 const f=registry.figures.find((f:any)=>f.diagramId===sheet.id);if(!f)throw Error(sheet.id);
 const name=(await fs.readdir(EXPORT_DIR)).find(n=>n.startsWith(String(f.figure).padStart(2,'0')+'_')&&n.endsWith('.png')&&!n.includes('_часть'))!;
 await fs.writeFile(path.join(ROOT,'Экспорт','SVG',name.replace('.png','.svg')),svg);await sharp(Buffer.from(svg)).resize({width:7000}).png().toFile(path.join(EXPORT_DIR,name));
 audit.push({sheet:sheet.id,file:name,entities:nodes.length,attributes:nodes.reduce((s,n)=>s+n.rows.length,0),relations:routes.length,parts:1,language:'ru',routing});
}
await fs.writeFile(file,await encodeProject(d));
await fs.writeFile(path.join(MODEL_DIR,'ПРОВЕРКА_ER_печать.json'),JSON.stringify(audit,null,2)+'\n');console.log(audit);
