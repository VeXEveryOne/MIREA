// Legible print views: semantic elements and UML routes come from native models.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,MODEL_DIR,EXPORT_DIR,omniModule,runtimeModule} from './runtime.mjs';
import {escape,font,wrap,measure,intersects} from './print_text.mts';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {textModel}=await omniModule('src/notations/structured/document.ts');
const {patchUnified}=await omniModule('src/language/unified.ts');
const {buildUmlScene}=await omniModule('src/notations/uml/projection.ts');
const {default:sharp}=await runtimeModule('sharp');
const svgDir=path.join(ROOT,'Экспорт','SVG');await fs.mkdir(svgDir,{recursive:true});
const registry=JSON.parse(await fs.readFile(path.join(MODEL_DIR,'Реестр_38_рисунков.json'),'utf8'));
const audits:any[]=[];
const isContainer=(node:any,nodes:any[])=>nodes.some(c=>c.parent===node.id||c.owner===node.elementId);
async function save(id:string,nodes:any[],edges:any[],renderNode:(n:any)=>Promise<string>){
 const figures=registry.figures.filter((f:any)=>f.diagramId===id);if(figures.length!==1)throw Error(`Unknown figure ${id}`);
 const labels:any[]=[],obstacles=nodes.flatMap(n=>{
  const children=isContainer(n,nodes);
  return children?[{...n,height:n.headerHeight??130}]:[n];
 });
 for(const e of edges){
  if(!e.label)continue;
  const lines=await wrap(e.label,260,22),w=Math.max(...await Promise.all(lines.map((l:string)=>measure(l,22))))+12,h=lines.length*25.3+8;
  const original=e.labelBox??{x:e.points[0].x,y:e.points[0].y,width:0,height:0},cx=original.x+original.width/2,cy=original.y+original.height/2;
  let best:any=null,score=Infinity;
  for(let dx=-180;dx<=180;dx+=10)for(let dy=-180;dy<=180;dy+=10){
   const b={x:cx+dx-w/2,y:cy+dy-h/2,width:w,height:h};
   if(obstacles.some(o=>intersects(b,o,6)))continue;
   const cost=Math.hypot(dx,dy);if(cost<score){best=b;score=cost;}
  }
  if(!best)throw Error(`Label has no space: ${id}:${e.id}`);
  obstacles.push(best);labels.push({...best,lines});
 }
 const extents=[...nodes,...labels,...edges.flatMap(e=>e.points.map((p:any)=>({...p,width:0,height:0})))];
 const minX=Math.min(...extents.map(r=>r.x))-30,minY=Math.min(...extents.map(r=>r.y))-30;
 const W=Math.max(...extents.map(r=>r.x+r.width))-minX+45,H=Math.max(...extents.map(r=>r.y+r.height))-minY+30;
 const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${minX} ${minY} ${W} ${H}"><defs><marker id="open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#111"/></marker></defs><rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="white"/>`];
 // Containers first, then lines, then leaf nodes. This preserves nesting while
 // keeping lines behind the shapes to which they are actually connected.
 for(const n of nodes.filter(n=>isContainer(n,nodes)))out.push(await renderNode(n));
 for(const e of edges){const d=e.points.map((p:any,i:number)=>`${i?'L':'M'}${p.x} ${p.y}`).join('');out.push(`<path d="${d}" fill="none" stroke="white" stroke-width="7"/><path d="${d}" fill="none" stroke="#111" stroke-width="2" ${e.dashed?'stroke-dasharray="9 6"':''} ${e.arrow?'marker-end="url(#open)"':''}/>`);}
 for(const n of nodes.filter(n=>!isContainer(n,nodes)))out.push(await renderNode(n));
 for(const l of labels){out.push(`<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="white"/>`);l.lines.forEach((v:string,i:number)=>out.push(`<text x="${l.x+l.width/2}" y="${l.y+25+i*25.3}" text-anchor="middle" font-family="${font}" font-size="22">${escape(v)}</text>`));}
 out.push('</svg>');const svg=out.join(''),prefix=String(figures[0].figure).padStart(2,'0')+'_';
 const matches=(await fs.readdir(EXPORT_DIR)).filter(f=>f.startsWith(prefix)&&f.endsWith('.png'));if(matches.length!==1)throw Error(prefix);
 await fs.writeFile(path.join(svgDir,matches[0].replace('.png','.svg')),svg);
 await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(EXPORT_DIR,matches[0]));
 audits.push({id,nodes:nodes.length,edges:edges.length,labels:labels.length,png:path.join('Экспорт','PNG',matches[0])});
}
const centered=(lines:string[],x:number,y:number,size=24,bold=false)=>lines.map((l,i)=>`<text x="${x}" y="${y+(i-(lines.length-1)/2)*size*1.15+size*.33}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(l)}</text>`).join('');
const tree=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'РОП_Дерево_функций.omni'),'utf8'));
const index=new Map(tree.model.elements.map((e:any)=>[e.id,e]));
const nodes=tree.model.elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram==='D01_function_tree').map((v:any)=>({id:v.id,elementId:v.properties.element,...tree.layout.nodes[v.id],element:index.get(v.properties.element)}));
const edges=nodes.filter((n:any)=>n.element.properties.parent).map((n:any)=>{
 const p=nodes.find((p:any)=>p.elementId===n.element.properties.parent),a={x:p.x+p.width/2,y:p.y+p.height},b={x:n.x+n.width/2,y:n.y};
 const points=p.element.properties.parent?[a,{x:a.x,y:a.y+35},{x:p.x-14,y:a.y+35},{x:p.x-14,y:n.y+n.height/2},{x:n.x,y:n.y+n.height/2}]:[a,{x:a.x,y:155},{x:b.x,y:155},b];
 return {id:n.id,points,label:'',arrow:false};
});
await save('D01_function_tree',nodes,edges,async n=>{
 const lines=await wrap(n.element.label.replace(/\s+/g,' '),n.width-20,24,true);if(lines.length*27.6>n.height-10)throw Error(`Tree text overflow ${n.id}`);
 return `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="white" stroke="#111" stroke-width="2"/>`+centered(lines,n.x+n.width/2,n.y+n.height/2,24,true);
});
const uml=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'РОП_UML_Структура.omni'),'utf8'));
for(const id of ['D02_component','D21_deployment']){
 const scene=buildUmlScene(uml,id),nodes=scene.nodes.map((n:any)=>({id:n.id,elementId:n.data.element.id,owner:n.data.element.properties.owner,parent:uml.model.elements.find((v:any)=>v.id===n.id)?.properties.parent,...n.position,width:n.width,height:n.height,kind:n.kind,label:n.label,headerHeight:130}));
 const edges=scene.edges.map((e:any)=>({id:e.id,points:e.data.geometry.points,label:e.data.geometry.label.lines.join(' '),labelBox:e.data.geometry.label,dashed:e.kind!=='communicationPath',arrow:e.kind!=='communicationPath'}));
 await save(id,nodes,edges,async n=>{
  const {x,y,width:w,height:h}=n,container=isContainer(n,nodes),lines=await wrap(n.label,w-24,24);
  let svg='';const cube=['node','device','executionEnvironment'].includes(n.kind);
  svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="2"/>`;
  if(cube)svg+=`<path d="M${x} ${y}l14-12h${w}v${h}l-14 12M${x+w} ${y}l14-12" fill="none" stroke="#111" stroke-width="2"/>`;
  if(n.kind==='component')svg+=`<rect x="${x+w-28}" y="${y+9}" width="18" height="22" fill="white" stroke="#111"/><path d="M${x+w-32} ${y+12}h9v5h-9ZM${x+w-32} ${y+22}h9v5h-9Z" fill="white" stroke="#111"/>`;
  if(n.kind==='artifact')svg+=`<path d="M${x+w-27} ${y+7}h12l7 7v13h-19ZM${x+w-15} ${y+7}v7h7" fill="white" stroke="#111"/>`;
  const stereo=['device','executionEnvironment','artifact'].includes(n.kind)?`«${n.kind}»`:'';
  const needed=lines.length*27.6+(stereo?24:0);
  if(!container&&needed>h-12)throw Error(`UML text overflow ${n.id}`);
  const top=container?y+20:y+(h-needed)/2;
  if(stereo)svg+=centered([stereo],x+w/2,top+9,20);
  svg+=centered(lines,x+w/2,top+(stereo?24:0)+(lines.length-1)*13.8+9,24);
  return svg;
 });
}
const schemePath=path.join(MODEL_DIR,'РОП_Общие_схемы.omni');
const scheme=await decodeProject(await fs.readFile(schemePath,'utf8'));
const schemeIndex=new Map(scheme.model.elements.map((e:any)=>[e.id,e]));
schemeIndex.get('bomPrefix').properties.literal='MR';
schemeIndex.get('bomSeparator').properties.meaning='Разделитель префикса и порядкового номера';
scheme.source=patchUnified(scheme.source,textModel(scheme.notation,scheme.model));scheme.draft=scheme.source;
await fs.writeFile(schemePath,await encodeProject(scheme));
const schemeNodes=(id:string)=>scheme.model.elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram===id&&scheme.layout.nodes[e.id]).map((v:any)=>({id:v.id,elementId:v.properties.element,...scheme.layout.nodes[v.id],element:schemeIndex.get(v.properties.element)}));
const infrastructure=schemeNodes('D10_infrastructure');
const anchor=(b:any,a:any)=>a.side==='left'?{x:b.x,y:b.y+b.height*a.offset}:a.side==='right'?{x:b.x+b.width,y:b.y+b.height*a.offset}:a.side==='top'?{x:b.x+b.width*a.offset,y:b.y}:{x:b.x+b.width*a.offset,y:b.y+b.height};
const links=scheme.model.elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram==='D10_infrastructure'&&scheme.layout.edges[e.id]).map((v:any)=>{
 const edge=schemeIndex.get(v.properties.element),geo=scheme.layout.edges[v.id],from=infrastructure.find((n:any)=>n.elementId===edge.properties.from),to=infrastructure.find((n:any)=>n.elementId===edge.properties.to);
 const points=[anchor(from,geo.from),...geo.bends??[],anchor(to,geo.to)];
 const runs=points.slice(1).map((p:any,i:number)=>({a:points[i],b:p})).sort((a:any,b:any)=>Math.hypot(b.a.x-b.b.x,b.a.y-b.b.y)-Math.hypot(a.a.x-a.b.x,a.a.y-a.b.y));
 const run=runs[0];return {id:v.id,points,label:edge.label,arrow:edge.properties.kind==='directed',labelBox:{x:(run.a.x+run.b.x)/2,y:(run.a.y+run.b.y)/2-25,width:0,height:0}};
});
await save('D10_infrastructure',infrastructure,links,async n=>{
 const {x,y,width:w,height:h}=n,e=n.element,label=e.kind==='note'?e.properties.text:e.label,lines=await wrap(label,w-26,24);
 if(lines.length*27.6>h-16)throw Error(`Infrastructure text overflow ${n.id}`);
 let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="2"/>`;
 if(e.properties.shape==='cylinder')s=`<path d="M${x} ${y+13}a${w/2} 13 0 0 1 ${w} 0v${h-26}a${w/2} 13 0 0 1 -${w} 0Z" fill="white" stroke="#111" stroke-width="2"/><ellipse cx="${x+w/2}" cy="${y+13}" rx="${w/2}" ry="13" fill="white" stroke="#111" stroke-width="2"/>`;
 return s+centered(lines,x+w/2,y+h/2,24);
});
const coding=schemeNodes('D04_coding');
await save('D04_coding',coding,[],async n=>{
 const {x,y,width:w,height:h}=n,e=n.element;
 if(e.kind==='note')return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="2"/>`+centered(await wrap(e.properties.text,w-24,24),x+w/2,y+h/2,24);
 const parts=scheme.model.elements.filter((p:any)=>p.kind==='segment'&&p.properties.owner===e.id).sort((a:any,b:any)=>Number(a.properties.order)-Number(b.properties.order));
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="2"/>`+centered([e.label],x+w/2,y+32,28,true)+parts.map((p:any,i:number)=>{
  const px=x+i*w/parts.length,pw=w/parts.length,cx=px+pw/2;
  return `<path d="M${px} ${y+60}V${y+h-85}" stroke="#111"/>`+centered([p.properties.literal??p.properties.example],cx,y+105,36,true)+centered([p.label],cx,y+160,24);
 }).join('')+centered(['MR-000153 · версия хранится отдельно (version_no)'],x+w/2,y+h-35,26);
});
await fs.writeFile(path.join(ROOT,'ПРОВЕРКА_печатных_структур.json'),JSON.stringify(audits,null,2)+'\n');
console.log(JSON.stringify(audits,null,2));
