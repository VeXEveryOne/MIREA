// Read-only print projection of native flowchart and UML activity semantics.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,MODEL_DIR,EXPORT_DIR,omniModule,runtimeModule} from './runtime.mjs';
import {escape,font,wrap,measure,intersects} from './print_text.mts';
const {decodeProject}=await omniModule('src/persistence/project.ts');
const {structuredRoute,routeHitsBox}=await omniModule('src/notations/structured/geometry.ts');
const {default:sharp}=await runtimeModule('sharp');
const registry=JSON.parse(await fs.readFile(path.join(MODEL_DIR,'Реестр_38_рисунков.json'),'utf8'));
const audits:any[]=[];
const center=(n:any)=>({x:n.x+n.width/2,y:n.y+n.height/2});
const anchor=(n:any,a:any)=>a.side==='left'?{x:n.x,y:n.y+n.height*a.offset}:a.side==='right'?{x:n.x+n.width,y:n.y+n.height*a.offset}:a.side==='top'?{x:n.x+n.width*a.offset,y:n.y}:{x:n.x+n.width*a.offset,y:n.y+n.height};
for(const file of ['РОП_Алгоритмы.omni','РОП_UML_Структура.omni']){
 const doc=await decodeProject(await fs.readFile(path.join(MODEL_DIR,file),'utf8'));
 const index=new Map(doc.model.elements.map((e:any)=>[e.id,e]));
 for(const sheet of doc.model.elements.filter((e:any)=>e.kind==='diagram'&&(file.includes('Алгоритмы')||e.id==='D06_activity'))){
  const views=doc.model.elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram===sheet.id);
  const nodes=views.filter((v:any)=>doc.layout.nodes[v.id]&&!['flow','controlFlow'].includes(index.get(v.properties.element)?.kind)).map((v:any)=>({id:v.id,element:index.get(v.properties.element),...doc.layout.nodes[v.id]}));
  // Widen only print boxes around their original centres and reserve measured
  // line height; native document geometry and semantic content remain untouched.
  for(const n of nodes){
   if(['initial','activityFinal','decision','merge','start','end'].includes(n.element.kind))continue;
   const width=Math.max(n.width,n.width>=390?480:n.width>=340?400:n.width);
   n.x-=(width-n.width)/2;n.width=width;
   const lines=await wrap(n.element.label,width-36,28);n.height=Math.max(n.height,lines.length*32.2+16);
  }
  const edges=views.filter((v:any)=>['flow','controlFlow'].includes(index.get(v.properties.element)?.kind));
  let body='';const labels:any[]=[],printPoints:any[]=[];
  for(const [i,v] of edges.entries()){
   const e=index.get(v.properties.element),a=nodes.find(n=>n.id===v.properties.from),b=nodes.find(n=>n.id===v.properties.to);
   if(!a||!b)throw Error('Missing endpoint '+v.id);
   const g=doc.layout.edges[v.id]??{};
   const horizontal=!(a.y+a.height<=b.y||b.y+b.height<=a.y);
   const backwards=b.y<a.y;
   const from=(backwards?g.from:undefined)??{side:horizontal?(a.x<b.x?'right':'left'):backwards?'top':'bottom',offset:.5};
   const to=(backwards?g.to:undefined)??{side:horizontal?(a.x<b.x?'left':'right'):backwards?(a.x<b.x?'left':'right'):'top',offset:.5};
   const start=anchor(a,from),end=anchor(b,to),manual=[start,...g.bends??[],end];
   const orthogonal=manual.slice(1).every((p:any,j:number)=>p.x===manual[j].x||p.y===manual[j].y);
   // Short forward links must not use the router's fixed escape distance: it
   // overshoots narrow gaps beside merge nodes and creates a loop around a box.
   const midX=(start.x+end.x)/2,midY=(start.y+end.y)/2;
   const simple=start.x===end.x||start.y===end.y?[start,end]:horizontal?
    [start,{x:midX,y:start.y},{x:midX,y:end.y},end]:
    [start,{x:start.x,y:midY},{x:end.x,y:midY},end];
   const points=!backwards&&!routeHitsBox(simple,nodes)?simple:
    backwards&&orthogonal&&!routeHitsBox(manual,nodes)?manual:
    structuredRoute(start,end,from.side,to.side,nodes,i);
   if(routeHitsBox(points,nodes))throw Error('Route intersects node '+v.id+' '+JSON.stringify({points,boxes:nodes.filter(n=>routeHitsBox(points,[n])).map(n=>({id:n.id,x:n.x,y:n.y,width:n.width,height:n.height}))}));
   printPoints.push(...points);
   const d=points.map((p:any,j:number)=>`${j?'L':'M'}${p.x} ${p.y}`).join('');
   body+=`<path d="${d}" fill="none" stroke="white" stroke-width="7"/><path d="${d}" fill="none" stroke="#111" stroke-width="2" marker-end="url(#arrow)"/>`;
   let label=e.label;
   if(e.kind==='controlFlow'&&e.properties.guard)label=e.properties.guard==='else'?'[Нет]':'[Да]'; // Condition is written in the decision node.
   if(label){
    const runs=points.slice(1).map((p:any,j:number)=>({a:points[j],b:p})).sort((r:any,s:any)=>Math.hypot(s.a.x-s.b.x,s.a.y-s.b.y)-Math.hypot(r.a.x-r.b.x,r.a.y-r.b.y));
    const r=runs[0],cx=(r.a.x+r.b.x)/2,cy=(r.a.y+r.b.y)/2,w=await measure(label,26)+12,h=36;
    const candidates:any[]=[];
    for(let dx=-180;dx<=180;dx+=10)for(let dy=-100;dy<=100;dy+=10)candidates.push({x:cx+dx-w/2,y:cy+dy-h/2,cost:Math.hypot(dx,dy)});
    candidates.sort((a,b)=>a.cost-b.cost);
    const box=candidates.find(p=>p.x>=0&&p.y>=0&&![...nodes,...labels].some(n=>intersects({...p,width:w,height:h},n,3)));
    if(!box)throw Error('Label has no space '+v.id);
    labels.push({...box,width:w,height:h,label});
   }
  }
  for(const n of nodes){
   const {x,y,width:w,height:h}=n,k=n.element.kind,c=center(n);
   if(['initial','activityFinal'].includes(k)){
    body+=`<circle cx="${c.x}" cy="${c.y}" r="${w/2}" fill="${k==='initial'?'#111':'white'}" stroke="#111" stroke-width="2"/>`+(k==='activityFinal'?`<circle cx="${c.x}" cy="${c.y}" r="${w/2-6}" fill="#111"/>`:'');continue;
   }
   let shape:string;
   if(['decision','merge'].includes(k))shape=`<path d="M${c.x} ${y}L${x+w} ${c.y}L${c.x} ${y+h}L${x} ${c.y}Z"`;
   else if(['input','output'].includes(k))shape=`<path d="M${x+20} ${y}H${x+w}L${x+w-20} ${y+h}H${x}Z"`;
   else shape=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${['start','end','action'].includes(k)?Math.min(h/2,24):0}"`;
   body+=shape+' fill="white" stroke="#111" stroke-width="2"/>';
   const lines=await wrap(n.element.label,w*(['decision','merge'].includes(k)?.68:1)-36,28);
   if(lines.length*32.2>h-12)throw Error('Text overflow '+n.id);
   lines.forEach((l:string,j:number)=>body+=`<text x="${c.x}" y="${c.y+(j-(lines.length-1)/2)*32.2+9}" text-anchor="middle" font-family="${font}" font-size="28">${escape(l)}</text>`);
  }
  for(const l of labels)body+=`<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="white"/><text x="${l.x+6}" y="${l.y+27}" font-family="${font}" font-size="26">${escape(l.label)}</text>`;
  // Include explicit return-loop bends in the canvas, not just node bounds.
  const extents=[...nodes,...labels,...printPoints.map(p=>({...p,width:0,height:0}))];
  const minX=Math.min(0,...extents.map(n=>n.x))-20,minY=Math.min(0,...extents.map(n=>n.y))-20;
  const W=Math.max(...extents.map(n=>n.x+n.width))-minX+40,H=Math.max(...extents.map(n=>n.y+n.height))-minY+40;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${minX} ${minY} ${W} ${H}"><defs><marker id="arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#111"/></marker></defs><rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="white"/>${body}</svg>`;
  const f=registry.figures.find((f:any)=>f.diagramId===sheet.id),name=(await fs.readdir(EXPORT_DIR)).find(n=>n.startsWith(String(f.figure).padStart(2,'0')+'_')&&n.endsWith('.png')&&!n.includes('_часть'))!;
  await fs.writeFile(path.join(ROOT,'Экспорт','SVG',name.replace('.png','.svg')),svg);
  await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(EXPORT_DIR,name));
  audits.push({sheet:sheet.id,file:name,nodes:nodes.length,edges:edges.length});
 }
}
await fs.writeFile(path.join(MODEL_DIR,'ПРОВЕРКА_алгоритмов_печать.json'),JSON.stringify(audits,null,2)+'\n');
console.log(JSON.stringify(audits));
