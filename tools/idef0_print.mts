// Shared native-model IDEF0 print rendering; course-specific layout lives in its source.
import fs from 'node:fs/promises';
import path from 'node:path';
import {omniModule,runtimeModule} from './runtime.mjs';
import {escape,font,measure,wrap,intersects} from './diagram_text.mts';
const {arrowPoints}=await omniModule('src/notations/idef0/arrows.ts');
const {sheetModel,icomCode}=await omniModule('src/notations/idef0/structure.ts');
const {default:sharp}=await runtimeModule('sharp');
function displayLabel(doc:any,e:any){
 const boundary=doc.model.nodes.find((n:any)=>n.kind==='boundary'&&(n.id===e.source||n.id===e.target));
 if(!boundary)return e.label;
 const child=boundary.id.startsWith('ctx_')?doc.model.nodes.find((n:any)=>n.id===boundary.id.replace('ctx_','dec_')):boundary;
 const code=child&&icomCode(doc.model,child);
 return code?`${code}: ${e.label}`:e.label;
}
function distanceToRoute(x:number,y:number,points:any[]){
 let best=Infinity;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
  const t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;
  best=Math.min(best,Math.hypot(x-a.x-t*dx,y-a.y-t*dy));
 }return best;
}
export async function placeLabels(doc:any){
 // Native label anchors are mutable separately from the flows. Reject all
 // box/label collisions instead of masking block titles with enlarged labels.
 for(const sheetId of ['context','decomposition']){
  const local=sheetModel(doc.model,sheetId),frame=doc.layout.frames[sheetId];
  const obstacles=local.nodes.filter((n:any)=>n.kind==='function').map((n:any)=>({...doc.layout.positions[n.id],...doc.layout.sizes[n.id],id:n.id}));
  const edges=local.edges.filter((e:any)=>!e.properties.branchOf);
  const labels=[];
  for(const e of edges){
   const style=doc.layout.textStyles[e.id],lines=await wrap(displayLabel(doc,e),style.width-12,style.fontSize);
   const actualWidth=Math.max(...await Promise.all(lines.map((l:string)=>measure(l,style.fontSize))))+12;
   labels.push({e,width:actualWidth,height:lines.length*style.fontSize*1.15+8});
  }
  // Keep the regular boundary groups first; movable internal flows fill the gaps.
  labels.sort((a:any,b:any)=>Number(a.e.id.startsWith('feedback_')||a.e.id.startsWith('step'))-Number(b.e.id.startsWith('feedback_')||b.e.id.startsWith('step')));
  for(const label of labels){
   const {e,width,height}=label,original=doc.layout.arrows[e.id].label,points=arrowPoints(doc,e.id);
   let best:any=null,bestScore=Infinity;
   const candidates=[original];
   for(let dx=-360;dx<=360;dx+=20)for(let dy=-340;dy<=340;dy+=20)candidates.push({x:original.x+dx,y:original.y+dy});
   for(const p of candidates){
    const box={x:p.x-width/2,y:p.y-height,width,height};
    if(box.x<5||box.x+width>frame.width-5||box.y<12||box.y+height>frame.height-8||obstacles.some((o:any)=>intersects(box,o)))continue;
    const routeDistance=distanceToRoute(p.x,p.y-height/2,points);
    const score=Math.hypot(p.x-original.x,p.y-original.y)+routeDistance*2;
    if(score<bestScore){bestScore=score;best={box,point:p};}
   }
   if(!best)throw Error(`No non-overlapping label position for ${sheetId}:${e.id}`);
   doc.layout.arrows[e.id].label=best.point;obstacles.push({...best.box,id:e.id});
  }
 }
}
export async function render(doc:any,sheetId:string,svgPath:string,pngPath:string,root=process.cwd()){
 const local=sheetModel(doc.model,sheetId),frame=doc.layout.frames[sheetId],W=frame.width,H=frame.height+100;
 const sheet=local.nodes.find((n:any)=>n.kind==='diagram');
 const chunks=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M0 0L8 3.5L0 7Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/><g transform="translate(0 60)">`];
 const labels:any[]=[];
 const boxes:any[]=[];
 for(const e of local.edges){
  const points=arrowPoints(doc,e.id),d=points.map((p:any,i:number)=>`${i?'L':'M'}${p.x} ${p.y}`).join('');
  chunks.push(`<path d="${d}" fill="none" stroke="white" stroke-width="7"/><path d="${d}" fill="none" stroke="#111" stroke-width="2.2" marker-end="url(#arrow)"/>`);
  if(e.properties.branchOf){const p=points[0];chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#111"/>`);continue;}
  const style=doc.layout.textStyles[e.id],point=doc.layout.arrows[e.id].label;
  const lines=await wrap(displayLabel(doc,e),style.width-12,style.fontSize),lh=style.fontSize*1.15,h=lines.length*lh+8;
  const actualWidth=Math.max(...await Promise.all(lines.map((l:string)=>measure(l,style.fontSize))))+12;
  labels.push({id:e.id,point,width:actualWidth,height:h,lines,lh,size:style.fontSize});
 }
 for(const n of local.nodes.filter((n:any)=>n.kind==='function')){
  const p=doc.layout.positions[n.id],s=doc.layout.sizes[n.id],size=doc.layout.textStyles[n.id].fontSize;
  const lines=await wrap(n.label,s.width-24,size,true),lh=size*1.15;
  if(lines.length*lh>s.height-25)throw Error(`Function title does not fit: ${n.id}`);
  boxes.push({...p,...s,id:n.id});
  chunks.push(`<rect x="${p.x}" y="${p.y}" width="${s.width}" height="${s.height}" fill="white" stroke="#111" stroke-width="2"/>`);
  const top=p.y+(s.height-lines.length*lh)/2+size-9;
  lines.forEach((l:string,i:number)=>chunks.push(`<text x="${p.x+s.width/2}" y="${top+i*lh}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="bold">${escape(l)}</text>`));
  chunks.push(`<text x="${p.x+s.width-10}" y="${p.y+s.height-9}" text-anchor="end" font-family="${font}" font-size="18">${n.id==='root'?'A0':n.id}</text>`);
 }
 for(const l of labels){
  const x=l.point.x-l.width/2,y=l.point.y-l.height;
  chunks.push(`<rect x="${x}" y="${y}" width="${l.width}" height="${l.height}" fill="white"/>`);
  l.lines.forEach((line:string,i:number)=>chunks.push(`<text x="${l.point.x}" y="${y+4+l.size+i*l.lh}" text-anchor="middle" font-family="${font}" font-size="${l.size}">${escape(line)}</text>`));
 }
 for(const n of local.nodes.filter((n:any)=>n.kind==='boundary')){
  const p=doc.layout.positions[n.id],code=icomCode(doc.model,n);
  if(code)chunks.push(`<text x="${p.x+(n.properties.side==='right'?-5:5)}" y="${p.y+(n.properties.side==='bottom'?-8:20)}" text-anchor="${n.properties.side==='right'?'end':'start'}" font-family="${font}" font-size="17" font-weight="bold">${code}</text>`);
 }
 chunks.push(`</g><rect x="1" y="1" width="${W-2}" height="${H-2}" fill="none" stroke="#111" stroke-width="1.5"/><text x="16" y="32" font-family="${font}" font-size="24" font-weight="bold">${escape(sheet.properties.node)} — ${escape(doc.model.label)}</text><text x="16" y="${H-10}" font-family="${font}" font-size="18">Албахтин И.В. · IDEF0 · ${escape(sheet.properties.viewpoint)}</text></svg>`);
 const svg=chunks.join('');await fs.writeFile(svgPath,svg);await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(pngPath);
 return {sheetId,functions:boxes.length,arrows:local.edges.length,fontSizeMin:20,svg:path.relative(root,svgPath),png:path.relative(root,pngPath),labels:labels.map(l=>({id:l.id,lines:l.lines.length,size:l.size}))};
}
