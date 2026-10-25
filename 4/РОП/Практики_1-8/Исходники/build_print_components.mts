import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,MODEL_DIR,EXPORT_DIR,omniModule,runtimeModule} from './runtime.mjs';
import {font,escape,wrap,measure,intersects} from './print_text.mts';
import {auditRoutes,hits,segments} from './route_print.mts';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {patchUnified}=await omniModule('src/language/unified.ts');
const {textModel}=await omniModule('src/notations/structured/document.ts');
const {default:sharp}=await runtimeModule('sharp');
const file=path.join(MODEL_DIR,'РОП_UML_Структура.omni'),d=await decodeProject(await fs.readFile(file,'utf8'));
const els=d.model.elements,idx=new Map(els.map((e:any)=>[e.id,e]));
const short=(id:string)=>'D02_component.'+id;
const placements:any={ui:[110,120],auth:[680,120],db:[1250,120],model_line:[110,490],sup:[680,490],ext:[1250,490],content:[110,860],pub:[680,860],oz:[1250,860],media:[110,1230]};
const boxes=Object.entries(placements).map(([id,p]:any)=>({id:short(id),x:p[0],y:p[1],width:370,height:165}));
const views=els.filter((e:any)=>e.kind==='view'&&e.properties.diagram==='D02_component');
const container=short('system'),containerView=views.find((v:any)=>v.properties.element===container);
idx.get(container).label='Среда взаимодействия компонентов';d.layout.nodes[containerView.id]={x:30,y:30,width:1670,height:1440};
for(const n of boxes){const view=views.find((v:any)=>v.properties.element===n.id+'.part');d.layout.nodes[view.id]={x:n.x,y:n.y,width:n.width,height:n.height};}
const plans:any[]=[];
const connectors=els.filter((e:any)=>e.kind==='componentConnector'&&e.properties.owner===container),counts=new Map<string,number>(),routes:any[]=[];
for(const [i,e] of connectors.entries()){
 const ends=els.filter((c:any)=>c.kind==='componentEnd'&&c.properties.owner===e.id).sort((a:any,b:any)=>+a.properties.order-+b.properties.order);
 const boxesAt=ends.map((end:any)=>boxes.find(b=>b.id===idx.get(end.properties.port).properties.owner)),a=boxesAt[0],b=boxesAt[1];
 const sideA=a.x===b.x?(a.y<b.y?'bottom':'top'):(a.x<b.x?'right':'left'),sideB=a.x===b.x?(a.y<b.y?'top':'bottom'):(a.x<b.x?'left':'right');
 const attach=(box:any,side:string,portId:string)=>{const k=box.id+side,j=counts.get(k)??0;counts.set(k,j+1);const off=side==='left'||side==='right'?Math.min(.8,.3+j*.25):.5;const p=side==='left'||side==='right'?{x:box.x+(side==='right'?box.width:0),y:box.y+box.height*off}:{x:box.x+box.width*off,y:box.y+(side==='bottom'?box.height:0)};const v=views.find((v:any)=>v.properties.element===portId);d.layout.nodes[v.id]={x:p.x-10,y:p.y-10,width:20,height:20};return {p,off,v};};
 const from=attach(a,sideA,ends[0].properties.port),to=attach(b,sideB,ends[1].properties.port);
 plans.push({id:e.id,e,from,to,sideA,sideB});
}
for(const p of [...plans].sort((a,b)=>Math.hypot(a.from.p.x-a.to.p.x,a.from.p.y-a.to.p.y)-Math.hypot(b.from.p.x-b.to.p.x,b.from.p.y-b.to.p.y))){
 // Independent role and repository connectors use visibly separated risers.
 const a=p.from.p,b=p.to.p;
 const points=p.e.id.endsWith('edge2')?[a,{x:540,y:a.y},{x:540,y:b.y},b]:
  p.e.id.endsWith('edge3')?[a,{x:585,y:a.y},{x:585,y:350},{x:1190,y:350},{x:1190,y:b.y},b]:
  p.e.id.endsWith('edge4')?[a,{x:615,y:a.y},{x:615,y:b.y},b]:[a,b];

 const view=views.find(v=>v.properties.element===p.e.id);d.layout.edges[view.id]={bends:points.slice(1,-1)};
 routes.push({...p,points});
}

const text=(lines:string[],x:number,y:number,size=26)=>lines.map((l,i)=>`<text x="${x}" y="${y+i*size*1.18}" text-anchor="middle" font-family="${font}" font-size="${size}">${escape(l)}</text>`).join('');
let body='<rect x="30" y="30" width="1670" height="1440" fill="white" stroke="#111" stroke-width="2"/>'+text(['Среда взаимодействия компонентов'],865,70,28);
const labelBoxes:any[]=[];
for(const r of routes){const p=r.points.map((p:any,i:number)=>`${i?'L':'M'}${p.x} ${p.y}`).join('');body+=`<path d="${p}" stroke="white" stroke-width="8" fill="none"/><path d="${p}" stroke="#111" stroke-width="2.5" fill="none"/>`;
 const runs=r.points.slice(1).map((b:any,i:number)=>({a:r.points[i],b})).sort((a:any,b:any)=>Math.hypot(b.a.x-b.b.x,b.a.y-b.b.y)-Math.hypot(a.a.x-a.b.x,a.a.y-a.b.y)),s=runs[0],cx=(s.a.x+s.b.x)/2,cy=(s.a.y+s.b.y)/2,vertical=s.a.x===s.b.x;
 // Joined provided circle and required socket identify an assembly connector.
 body+=`<g transform="translate(${cx} ${cy}) rotate(${vertical?90:0})"><circle cx="0" cy="0" r="9" fill="white" stroke="#111" stroke-width="2"/><path d="M-4 -14A14 14 0 0 0 -4 14" fill="none" stroke="#111" stroke-width="2"/></g>`;
 const lines=await wrap(r.e.label,245,23),w=Math.max(...await Promise.all(lines.map(l=>measure(l,23))))+14,h=lines.length*28+10;
 const candidates:any[]=[];
 for(const s of segments(r.points))for(const t of [.5,.3,.7])for(const side of [-1,1]){
  const horizontal=s.a.y===s.b.y,cx=s.a.x+(s.b.x-s.a.x)*t,cy=s.a.y+(s.b.y-s.a.y)*t;
  for(let shift=0;shift<=80;shift+=20){const b={x:cx-w/2+(horizontal?0:side*(w/2+22+shift)),y:cy-h/2+(horizontal?side*(h/2+24+shift):0),width:w,height:h};
   if(b.x<45||b.y<90||b.x+w>1690||b.y+h>1450)continue;
   if([...boxes,...labelBoxes].some(n=>intersects(b,n,8)))continue;
   if(routes.some(r=>segments(r.points).some(s=>hits(s.a,s.b,b,8))))continue;
   candidates.push({...b,cost:shift+Math.abs(t-.5)*100});
  }
 }
 candidates.sort((a,b)=>a.cost-b.cost);const label=candidates[0];if(!label)throw Error('Component label has no space '+r.e.id);
 labelBoxes.push({...label,lines});
 const view=views.find(v=>v.properties.element===r.e.id);d.layout.edges[view.id].label={x:label.x+w/2,y:label.y+h};

}
for(const b of boxes){const lines=await wrap(idx.get(b.id).label,330,28);body+=`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="white" stroke="#111" stroke-width="2.5"/><rect x="${b.x+b.width-38}" y="${b.y+14}" width="23" height="30" fill="white" stroke="#111"/><path d="M${b.x+b.width-44} ${b.y+19}h12v7h-12ZM${b.x+b.width-44} ${b.y+33}h12v7h-12Z" fill="white" stroke="#111"/>`+text(lines,b.x+b.width/2,b.y+b.height/2-(lines.length-1)*16+10,28);}
for(const r of routes)for(const p of [r.from.p,r.to.p])body+=`<rect x="${p.x-10}" y="${p.y-10}" width="20" height="20" fill="white" stroke="#111" stroke-width="2.5"/>`;
for(const l of labelBoxes)body+=`<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="white"/>`+text(l.lines,l.x+l.width/2,l.y+26,23);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1740" height="1510"><rect width="1740" height="1510" fill="white"/>${body}</svg>`;
const name=(await fs.readdir(EXPORT_DIR)).find(n=>n.startsWith('12_')&&n.endsWith('.png'))!;
await fs.writeFile(path.join(ROOT,'Экспорт','SVG',name.replace('.png','.svg')),svg);await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(EXPORT_DIR,name));
d.source=patchUnified(d.source,textModel(d.notation,d.model));d.draft=d.source;
await fs.writeFile(file,await encodeProject(d));
console.log(auditRoutes('D02_component',routes,boxes));
console.log('Component ports:',connectors.length,'assembly connections,',connectors.length*2,'ports');
