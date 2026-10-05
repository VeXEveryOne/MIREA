// Print ER views are bounded continuations of the same native semantic model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR,EXPORT_DIR,ROOT,omniModule,runtimeModule} from './runtime.mjs';
import {font,escape,wrap} from './print_text.mts';
const {decodeProject}=await omniModule('src/persistence/project.ts');
const {erdTable}=await omniModule('src/notations/erd/presentation.ts');
const {foreignKeyGuarantees}=await omniModule('src/notations/erd/cardinality.ts');
const {structuredRoute,routeHitsBox}=await omniModule('src/notations/structured/geometry.ts');
const {default:sharp}=await runtimeModule('sharp');
const d=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'РОП_ERD.omni'),'utf8'));
const idx=new Map(d.model.elements.map((e:any)=>[e.id,e]));
const registry=JSON.parse(await fs.readFile(path.join(MODEL_DIR,'Реестр_38_рисунков.json'),'utf8'));
const svgDir=path.join(ROOT,'Экспорт','SVG');await fs.mkdir(svgDir,{recursive:true});
const audit:any[]=[];
const txt=(v:string,x:number,y:number,size=32,bold=false)=>`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(v)}</text>`;
for(const sheet of d.model.elements.filter((e:any)=>e.kind==='diagram')){
 const physical=sheet.properties.type==='physical';
 const views=d.model.elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram===sheet.id);
 const entityViews=views.filter((v:any)=>idx.get(v.properties.element)?.kind==='entity');
 const relationViews=views.filter((v:any)=>['relation','foreignKey'].includes(idx.get(v.properties.element)?.kind));
 const relation=(v:any)=>{
  const e=idx.get(v.properties.element);if(e.kind==='relation')return e;
  const g=foreignKeyGuarantees(d.model,e);
  return {id:e.id,properties:{from:g.child,to:g.parent,fromMin:g.parentToChild.min,fromMax:g.parentToChild.max,toMin:g.childToParent.min,toMax:g.childToParent.max}};
 };
 const f=registry.figures.find((f:any)=>f.diagramId===sheet.id);if(!f)throw Error(sheet.id);
 const basename=(await fs.readdir(EXPORT_DIR)).find(name=>name.startsWith(String(f.figure).padStart(2,'0')+'_')&&name.endsWith('.png')&&!name.includes('_часть'))!;
 const parts=Math.ceil(entityViews.length/4);const covered=new Set<string>();
 for(let part=0;part<parts;part++){
  const selected=entityViews.slice(part*4,part*4+4),nodes:any[]=[];
  for(const [i,v] of selected.entries()){
   const table=erdTable(d,idx.get(v.properties.element),physical),rows:any[]=[];
   for(const r of table.rows){
    const detail=physical?r.detail.replace(' NOT NULL',' NN').replace(/ NULL$/,''):'';
    const label=[r.flags,r.name,detail].filter(Boolean).join(' · ');
    const lines=await wrap(label,865,32),height=Math.max(44,lines.length*37+8);
    rows.push({...r,lines,height});covered.add(r.id);
   }
   const displayTitle=physical?table.title:table.title[0].toUpperCase()+table.title.slice(1);
   const title=physical?displayTitle:`${displayTitle}\n${idx.get(v.properties.element).properties.sqlName}`;
   const header=await wrap(title,865,36,true),headerH=header.length*42+16;
   nodes.push({id:v.id,elementId:v.properties.element,x:80+(i%2)*1080,y:90,width:900,height:headerH+rows.reduce((s,r)=>s+r.height,0),rows,header,headerH});
  }
  const topH=Math.max(...nodes.slice(0,2).map(n=>n.height));for(const [i,n] of nodes.entries())if(i>=2)n.y=90+topH+170;
  let body='';const routes:any[]=[];const portCounts=new Map<string,number>();
  const port=(n:any,side:string)=>{
   const key=n.id+':'+side,j=portCounts.get(key)??0;portCounts.set(key,j+1);
   return side==='left'||side==='right'?{x:n.x+(side==='right'?n.width:0),y:n.y+48+j*60}:{x:n.x+n.width/2+j*100,y:n.y+(side==='bottom'?n.height:0)};
  };
  for(const [ri,v] of relationViews.entries()){
   const rel=relation(v),a=nodes.find(n=>n.elementId===rel.properties.from),b=nodes.find(n=>n.elementId===rel.properties.to);
   if(!a||!b)continue;
   const sideA=a.x<b.x?'right':a.x>b.x?'left':'bottom',sideB=a.x<b.x?'left':a.x>b.x?'right':'top';
   const start=port(a,sideA),end=port(b,sideB),points=structuredRoute(start,end,sideA,sideB,nodes,ri);
   if(routeHitsBox(points,nodes))throw Error(`ER route crosses entity: ${v.id}`);
   routes.push({points,a,b,rel,start,end,sideA,sideB});
   const p=points.map((p:any,i:number)=>`${i?'L':'M'}${p.x} ${p.y}`).join('');
   body+=`<path d="${p}" fill="none" stroke="white" stroke-width="7"/><path d="${p}" fill="none" stroke="#111" stroke-width="2"/>`;
  }
  for(const n of nodes){
   body+=`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="white" stroke="#111" stroke-width="2"/>`;
   n.header.forEach((l:string,i:number)=>body+=txt(l,n.x+16,n.y+39+i*42,36,true));
   let y=n.y+n.headerH;
   for(const r of n.rows){body+=`<path d="M${n.x} ${y}h${n.width}" stroke="#aaa"/>`;r.lines.forEach((l:string,i:number)=>body+=txt(l,n.x+16,y+34+i*37));y+=r.height;}
  }
  for(const r of routes){
   const cardinal=(p:any,side:string,value:string)=>{
    const w=value.length*17+10,x=side==='left'?p.x-w-7:p.x+7,y=side==='bottom'?p.y+38:p.y-12;
    return `<rect x="${x}" y="${y-26}" width="${w}" height="33" fill="white"/>`+txt(value,x+3,y,28);
   };
   body+=cardinal(r.start,r.sideA,`${r.rel.properties.fromMin}..${r.rel.properties.fromMax==='many'?'N':r.rel.properties.fromMax}`)+cardinal(r.end,r.sideB,`${r.rel.properties.toMin}..${r.rel.properties.toMax==='many'?'N':r.rel.properties.toMax}`);
  }
  const bottom=Math.max(...nodes.map(n=>n.y+n.height))+60;
  // Relations crossing continuation boundaries are stated explicitly, not lost.
  const cross=relationViews.filter((v:any)=>{const r=relation(v);return nodes.some(n=>n.elementId===r.properties.from)!==nodes.some(n=>n.elementId===r.properties.to);});
  let y=bottom;for(const v of cross){const r=relation(v),other=entityViews.findIndex((v:any)=>v.properties.element===(nodes.some(n=>n.elementId===r.properties.from)?r.properties.to:r.properties.from));
   const label=`${r.properties.from} (${r.properties.fromMin}..${r.properties.fromMax==='many'?'N':r.properties.fromMax}) — ${r.properties.to} (${r.properties.toMin}..${r.properties.toMax==='many'?'N':r.properties.toMax}); продолжение ${Math.floor(other/4)+1}`;
   for(const l of await wrap(label,2000,28)){body+=txt(l,80,y,28);y+=34;}
  }
  if(physical){body+=txt('NN — NOT NULL; PK — первичный ключ; FK — внешний ключ; UQ — уникальность.',80,y+10,28);y+=44;}
  const H=y+30,W=2160,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>${body}</svg>`;
  const name=part===0?basename:basename.replace('.png',`_часть${part+1}.png`);
  await fs.writeFile(path.join(svgDir,name.replace('.png','.svg')),svg);await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(EXPORT_DIR,name));
  audit.push({sheet:sheet.id,part:part+1,file:name,entities:nodes.map(n=>n.elementId),internalRelations:routes.length,crossReferences:cross.map((v:any)=>v.id)});
 }
 const expected=entityViews.flatMap((v:any)=>erdTable(d,idx.get(v.properties.element),physical).rows.map((r:any)=>r.id));
 if(expected.some((id:string)=>!covered.has(id)))throw Error(`Lost rows: ${sheet.id}`);
}
await fs.writeFile(path.join(MODEL_DIR,'ПРОВЕРКА_ER_печать.json'),JSON.stringify(audit,null,2)+'\n');
console.log(`${audit.length} print continuations; every native row retained`);
