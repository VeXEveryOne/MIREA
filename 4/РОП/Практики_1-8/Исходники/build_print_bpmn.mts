// Print projection of native BPMN DI geometry, not a separate process model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,MODEL_DIR,EXPORT_DIR,runtimeModule,omniModule} from './runtime.mjs';
import {escape,font,wrap,measure,intersects} from './print_text.mts';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {validateBpmnData}=await omniModule('src/notations/bpmn/validation.ts');
const {default:sharp}=await runtimeModule('sharp');
const svgDir=path.join(ROOT,'Экспорт','SVG');await fs.mkdir(svgDir,{recursive:true});
const audit:any[]=[];
function port(point:any,b:any){
 const sides=[{side:'left',distance:Math.abs(point.x-b.x)},{side:'right',distance:Math.abs(point.x-b.x-b.width)},{side:'top',distance:Math.abs(point.y-b.y)},{side:'bottom',distance:Math.abs(point.y-b.y-b.height)}];
 sides.sort((a,b)=>a.distance-b.distance);return {side:sides[0].side,offset:sides[0].side==='left'||sides[0].side==='right'?(point.y-b.y)/b.height:(point.x-b.x)/b.width};
}
function attach(b:any,p:any){
 if(p.side==='left')return {x:b.x,y:b.y+b.height*p.offset,nx:-1,ny:0};
 if(p.side==='right')return {x:b.x+b.width,y:b.y+b.height*p.offset,nx:1,ny:0};
 if(p.side==='top')return {x:b.x+b.width*p.offset,y:b.y,nx:0,ny:-1};
 return {x:b.x+b.width*p.offset,y:b.y+b.height,nx:0,ny:1};
}
function segmentHits(a:any,b:any,r:any){
 const inset=.01;
 if(Math.abs(a.x-b.x)<inset)return a.x>r.x+inset&&a.x<r.x+r.width-inset&&Math.max(a.y,b.y)>r.y+inset&&Math.min(a.y,b.y)<r.y+r.height-inset;
 if(Math.abs(a.y-b.y)<inset)return a.y>r.y+inset&&a.y<r.y+r.height-inset&&Math.max(a.x,b.x)>r.x+inset&&Math.min(a.x,b.x)<r.x+r.width-inset;
 throw Error('Expected orthogonal BPMN segment');
}
function orthogonal(a:any,b:any,boxes:any[]){
 const pad=12,escape=26,start={x:a.x+a.nx*escape,y:a.y+a.ny*escape},end={x:b.x+b.nx*escape,y:b.y+b.ny*escape};
 const obstacles=boxes.map(r=>({x:r.x-pad,y:r.y-pad,width:r.width+pad*2,height:r.height+pad*2}));
 const xs=[...new Set([start.x,end.x,...obstacles.flatMap(r=>[r.x-1,r.x+r.width+1])])].sort((a,b)=>a-b);
 const ys=[...new Set([start.y,end.y,...obstacles.flatMap(r=>[r.y-1,r.y+r.height+1])])].sort((a,b)=>a-b);
 const key=(x:number,y:number,dir:number)=>`${x},${y},${dir}`,sx=xs.indexOf(start.x),sy=ys.indexOf(start.y),ex=xs.indexOf(end.x),ey=ys.indexOf(end.y);
 const queue:any[]=[{x:sx,y:sy,dir:a.nx?0:1,cost:0}],scores=new Map<string,number>(),previous=new Map<string,string>();
 scores.set(key(sx,sy,a.nx?0:1),0);let terminal:string|undefined;
 while(queue.length){
  queue.sort((a,b)=>b.cost-a.cost);const cur=queue.pop(),ck=key(cur.x,cur.y,cur.dir);
  if(cur.cost!==scores.get(ck))continue;
  if(cur.x===ex&&cur.y===ey){terminal=ck;break;}
  for(const [dx,dy,dir] of [[1,0,0],[-1,0,0],[0,1,1],[0,-1,1]]){
   const x=cur.x+dx,y=cur.y+dy;if(x<0||x>=xs.length||y<0||y>=ys.length)continue;
   const p={x:xs[cur.x],y:ys[cur.y]},q={x:xs[x],y:ys[y]};
   if(obstacles.some(r=>segmentHits(p,q,r)))continue;
   const nk=key(x,y,dir),cost=cur.cost+Math.hypot(q.x-p.x,q.y-p.y)+(dir===cur.dir?0:35);
   if(cost<(scores.get(nk)??Infinity)){scores.set(nk,cost);previous.set(nk,ck);queue.push({x,y,dir,cost});}
  }
 }
 if(!terminal)throw Error('No obstacle-free BPMN route');
 const points:any[]=[];
 for(let k:string|undefined=terminal;k;k=previous.get(k)){const [x,y]=k.split(',').map(Number);points.unshift({x:xs[x],y:ys[y]});}
 points.unshift({x:a.x,y:a.y});points.push({x:b.x,y:b.y});
 return points.filter((p,i)=>i===0||i===points.length-1||!((points[i-1].x===p.x&&p.x===points[i+1].x)||(points[i-1].y===p.y&&p.y===points[i+1].y)));
}
for(const [file,planes] of [
 ['ПР1_BPMN_AS_IS.omni',[['Plane_Main',3],['Plane_Preparation',4]]],
 ['ПР2_BPMN_TO_BE.omni',[['Plane_Main',8],['Plane_Preparation',9],['Plane_Publication',10]]],
] as const){
 const filePath=path.join(MODEL_DIR,file),doc=await decodeProject(await fs.readFile(filePath,'utf8'));
 const all={...doc.model.objects,...doc.layout.objects},props=(ref:any)=>all[typeof ref==='string'?ref:ref.ref].properties;
 let serial=Math.max(...Object.keys(all).filter(k=>k.startsWith('object:')).map(k=>Number(k.slice(7))))+1;
 const add=(type:string,properties:any)=>{
  const ref='object:'+serial++,object={type,properties};all[ref]=object;doc.layout.objects[ref]=object;return {ref};
 };
 for(const [planeId,number] of planes){
  const elements=props('id:'+planeId).planeElement.map((r:any)=>all[r.ref]);
  const shapes=elements.filter((o:any)=>o.type==='bpmndi:BPMNShape').map((o:any)=>({di:o.properties,b:props(o.properties.bounds),model:all[o.properties.bpmnElement.ref]}));
  const edges=elements.filter((o:any)=>o.type==='bpmndi:BPMNEdge').map((o:any)=>({di:o.properties,points:o.properties.waypoint.map(props),model:all[o.properties.bpmnElement.ref]}));
  const old=new Map(shapes.map((s:any)=>[s.model.properties.id,{...s.b}]));
  for(const s of shapes){
   if(s.model.type.endsWith('Task')||s.model.type==='bpmn:SubProcess'){
    const lines=await wrap((s.model.properties.name??'').replace(/\s+/g,' '),s.b.width-24,22);
    const height=Math.max(s.b.height,Math.ceil(lines.length*25.3+40));s.b.y-=(height-s.b.height)/2;s.b.height=height;
   }
   if(s.model.type.endsWith('Event'))for(const parent of shapes.filter((p:any)=>p.model.type==='bpmn:Lane'||p.model.properties.processRef)){
    if(s.b.y>=parent.b.y&&s.b.y+s.b.height<=parent.b.y+parent.b.height&&s.b.x<parent.b.x+82)s.b.x=parent.b.x+82;
   }
  }
  // The editable lane membership must agree with the displayed assignment.
  // Lane membership is retained in native JSON (it is outside the DSL subset).
  const lanes=shapes.filter((s:any)=>s.model.type==='bpmn:Lane');
  for(const lane of lanes)lane.model.properties.flowNodeRef=[];
  for(const node of shapes.filter((s:any)=>!['bpmn:Lane','bpmn:Participant'].includes(s.model.type))){
   const containing=lanes.filter((l:any)=>node.b.x>=l.b.x+62&&node.b.y>=l.b.y&&node.b.x+node.b.width<=l.b.x+l.b.width&&node.b.y+node.b.height<=l.b.y+l.b.height);
   if(lanes.length&&containing.length!==1)throw Error(`Ambiguous lane: ${file}:${node.model.properties.id}`);
   if(containing.length)containing[0].model.properties.flowNodeRef.push(node.di.bpmnElement);
  }
  for(const e of edges){
   const source=shapes.find((s:any)=>s.model.properties.id===e.model.properties.sourceRef.ref.slice(3)),target=shapes.find((s:any)=>s.model.properties.id===e.model.properties.targetRef.ref.slice(3));
   if(!source||!target)throw Error('Flow endpoint missing in DI');
   const a=attach(source.b,port(e.points[0],old.get(source.model.properties.id))),b=attach(target.b,port(e.points.at(-1),old.get(target.model.properties.id)));
   const candidate=e.points.map((p:any)=>({...p})),first=candidate[0],last=candidate.at(-1);
   if(candidate.length>2){if(candidate[1].x===first.x)candidate[1].x=a.x;else candidate[1].y=a.y;if(candidate.at(-2).x===last.x)candidate.at(-2).x=b.x;else candidate.at(-2).y=b.y;}
   candidate[0]={x:a.x,y:a.y};candidate[candidate.length-1]={x:b.x,y:b.y};
   const blockers=shapes.filter((s:any)=>!['bpmn:Lane','bpmn:Participant'].includes(s.model.type)&&s!==source&&s!==target).map((s:any)=>s.b);
   const diagonal=candidate.some((p:any,i:number)=>i&&Math.abs(p.x-candidate[i-1].x)>.01&&Math.abs(p.y-candidate[i-1].y)>.01);
   const collision=diagonal||candidate.some((p:any,i:number)=>i&&blockers.some((r:any)=>segmentHits(candidate[i-1],p,r)));
   e.points=collision?orthogonal(a,b,shapes.filter((s:any)=>!['bpmn:Lane','bpmn:Participant'].includes(s.model.type)).map((s:any)=>s.b)):candidate;
   e.di.waypoint=e.points.map((p:any,i:number)=>{
    const ref=e.di.waypoint[i];if(ref){Object.assign(props(ref),p);return ref;}return add('dc:Point',p);
   });
  }
  const labels:any[]=[],obstacles:any[]=shapes.flatMap((s:any)=>{
   if(!['bpmn:Lane','bpmn:Participant'].includes(s.model.type))return [s.b];
   return s.model.type==='bpmn:Lane'||s.model.properties.processRef?[
    {...s.b,width:62},{...s.b,height:2},{...s.b,y:s.b.y+s.b.height-2,height:2},
    {...s.b,x:s.b.x+s.b.width-2,width:2},
   ]:[s.b];
  });
  const text=(lines:string[],cx:number,cy:number,size=22,bold=false)=>lines.map((line,i)=>`<text x="${cx}" y="${cy-(lines.length-1)*size*1.15/2+i*size*1.15+size*.33}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="${bold?'bold':'normal'}">${escape(line)}</text>`).join('');
  const label=(item:any)=>{
   if(!item.model.properties.name)return;
   if(!item.di.label){
    if(!item.points)return; // Task names are inside the task, not DI labels.
    const pairs=item.points.slice(1).map((p:any,i:number)=>({a:item.points[i],b:p}));
    pairs.sort((a:any,b:any)=>Math.hypot(b.a.x-b.b.x,b.a.y-b.b.y)-Math.hypot(a.a.x-a.b.x,a.a.y-a.b.y));
    const p=pairs[0],cx=(p.a.x+p.b.x)/2,cy=(p.a.y+p.b.y)/2;
    item.di.label=add('bpmndi:BPMNLabel',{bounds:add('dc:Bounds',{x:cx-110,y:cy-50,width:220,height:36})});
   }
   const b=props(props(item.di.label).bounds);labels.push({item,b,value:item.model.properties.name});
  };
  shapes.forEach(label);edges.forEach(label);
  // Expanded text must not cover task names or other labels. Keep the nearest
  // available anchor to the original DI label rather than arbitrary page slots.
  for(const l of labels){
   const width=l.item.model.type==='bpmn:MessageFlow'?320:220,lines=await wrap(l.value,width,22);
   const actual=Math.max(...await Promise.all(lines.map((v:string)=>measure(v,22))))+12,h=lines.length*25.3+8;
   const shape=l.item.b;
   const parent=shape?shapes.filter((s:any)=>['bpmn:Lane','bpmn:Participant'].includes(s.model.type)&&shape.x>=s.b.x&&shape.y>=s.b.y&&shape.x+shape.width<=s.b.x+s.b.width&&shape.y+shape.height<=s.b.y+s.b.height).sort((a:any,b:any)=>a.b.width*a.b.height-b.b.width*b.b.height)[0]:undefined;
   const segments=l.item.points?.slice(1).map((p:any,i:number)=>({a:l.item.points[i],b:p})).sort((a:any,b:any)=>Math.hypot(b.a.x-b.b.x,b.a.y-b.b.y)-Math.hypot(a.a.x-a.b.x,a.a.y-a.b.y));
   const segment=segments?.[0];
   const cx=shape?shape.x+shape.width/2:(segment.a.x+segment.b.x)/2+(segment.a.x===segment.b.x?actual/2+14:0);
   const cy=shape?(l.item.model.type.includes('Gateway')?shape.y-h/2-16:shape.y+shape.height+h/2+14):(segment.a.y+segment.b.y)/2-(segment.a.y===segment.b.y?h/2+12:0);
   let chosen:any=null,score=Infinity;
   for(let dx=-200;dx<=200;dx+=10)for(let dy=-200;dy<=200;dy+=10){
    const b={x:cx+dx-actual/2,y:cy+dy-h/2,width:actual,height:h};
    if(parent&&(b.x<parent.b.x+70||b.y<parent.b.y+7||b.x+b.width>parent.b.x+parent.b.width-7||b.y+b.height>parent.b.y+parent.b.height-7))continue;
    if(obstacles.some(o=>intersects(b,o,5)))continue;
    const candidate=Math.hypot(dx,dy);
    if(candidate<score){chosen=b;score=candidate;}
   }
   if(!chosen)throw Error(`No label space: ${file}:${planeId}:${l.item.model.properties.id}`);
   l.box=chosen;l.lines=lines;obstacles.push(chosen);
   // Keep the print label's editable anchor in the native DI as well.
   Object.assign(l.b,chosen);
  }
  const extents=[...shapes.map((s:any)=>s.b),...labels.map(l=>l.box),...edges.flatMap((e:any)=>e.points.map((p:any)=>({...p,width:0,height:0})))];
  const minX=Math.min(...extents.map(b=>b.x))-25,minY=Math.min(...extents.map(b=>b.y))-25;
  const maxX=Math.max(...extents.map(b=>b.x+b.width))+25,maxY=Math.max(...extents.map(b=>b.y+b.height))+25;
  const W=maxX-minX,H=maxY-minY;
  const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${minX} ${minY} ${W} ${H}"><defs><marker id="sequence" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M0 0L8 3.5L0 7Z" fill="#111"/></marker><marker id="message" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0L9 4L0 8Z" fill="white" stroke="#111"/></marker></defs><rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="white"/>`];
  for(const s of shapes.filter((s:any)=>['bpmn:Lane','bpmn:Participant'].includes(s.model.type))){
   const {x,y,width,height}=s.b;
   out.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#111" stroke-width="2"/>`);
   const expanded=s.model.type==='bpmn:Lane'||!!s.model.properties.processRef;
   if(expanded){const lines=await wrap(s.model.properties.name,height-24,22);out.push(`<path d="M${x+62} ${y}V${y+height}" stroke="#111"/><g transform="translate(${x+31} ${y+height/2}) rotate(-90)">${text(lines,0,0,22)}</g>`);}
   else out.push(text([s.model.properties.name],x+width/2,y+height/2,24));
  }
  for(const e of edges){
   const d=e.points.map((p:any,i:number)=>`${i?'L':'M'}${p.x} ${p.y}`).join(''),message=e.model.type==='bpmn:MessageFlow';
   out.push(`<path d="${d}" fill="none" stroke="white" stroke-width="7"/><path d="${d}" fill="none" stroke="#111" stroke-width="2" ${message?'stroke-dasharray="9 6"':''} marker-end="url(#${message?'message':'sequence'})"/>`);
   if(message){const p=e.points[0];out.push(`<circle cx="${p.x}" cy="${p.y}" r="4" fill="white" stroke="#111"/>`);}
  }
  for(const s of shapes.filter((s:any)=>!['bpmn:Lane','bpmn:Participant'].includes(s.model.type))){
   const {x,y,width:w,height:h}=s.b,cx=x+w/2,cy=y+h/2,type=s.model.type;
   if(type.includes('Gateway')){
    out.push(`<path d="M${cx} ${y}L${x+w} ${cy}L${cx} ${y+h}L${x} ${cy}Z" fill="white" stroke="#111" stroke-width="2"/><path d="M${cx-10} ${cy-10}L${cx+10} ${cy+10}M${cx+10} ${cy-10}L${cx-10} ${cy+10}" stroke="#111" stroke-width="3"/>`);
   }else if(type.endsWith('Event')){
    out.push(`<circle cx="${cx}" cy="${cy}" r="${w/2}" fill="white" stroke="#111" stroke-width="${type==='bpmn:EndEvent'?4:2}"/>`);
    if(type==='bpmn:IntermediateCatchEvent')out.push(`<circle cx="${cx}" cy="${cy}" r="${w/2-4}" fill="none" stroke="#111" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${w/2-10}" fill="none" stroke="#111"/><path d="M${cx} ${cy-12}V${cy}L${cx+10} ${cy+5}" fill="none" stroke="#111"/>`);
   }else{
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="white" stroke="#111" stroke-width="2"/>`);
    const lines=await wrap((s.model.properties.name??'').replace(/\s+/g,' '),w-24,22);
    if(lines.length*25.3>h-8)throw Error(`Task text does not fit: ${file}:${s.model.properties.id}`);
    out.push(text(lines,cx,cy+(type==='bpmn:SubProcess'?0:9),22));
    if(type==='bpmn:SubProcess')out.push(`<rect x="${cx-8}" y="${y+h-19}" width="16" height="16" fill="white" stroke="#111"/><path d="M${cx-5} ${y+h-11}H${cx+5}M${cx} ${y+h-16}V${y+h-6}" stroke="#111"/>`);
    // Small standard task markers retain the model's task type.
    if(type==='bpmn:ManualTask')out.push(`<path d="M${x+7} ${y+20}v-9h3v-4h3v4h8v9Z" fill="white" stroke="#111"/>`);
    if(type==='bpmn:UserTask')out.push(`<circle cx="${x+15}" cy="${y+10}" r="4" fill="white" stroke="#111"/><path d="M${x+8} ${y+21}q0-9 7-9q7 0 7 9Z" fill="white" stroke="#111"/>`);
    if(type==='bpmn:BusinessRuleTask')out.push(`<rect x="${x+7}" y="${y+7}" width="16" height="13" fill="white" stroke="#111"/><path d="M${x+7} ${y+12}h16M${x+12} ${y+7}v13" stroke="#111"/>`);
    if(type==='bpmn:ServiceTask'){
     const cx=x+15,cy=y+15,points=Array.from({length:32},(_,i)=>{const angle=i*Math.PI/16,r=[9,9,6.8,6.8][i%4];return `${cx+r*Math.cos(angle)},${cy+r*Math.sin(angle)}`;});
     out.push(`<polygon points="${points.join(' ')}" fill="white" stroke="#111"/><circle cx="${cx}" cy="${cy}" r="3" fill="white" stroke="#111"/>`);
    }
   }
  }
  for(const l of labels){const b=l.box;out.push(`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="white"/>`+text(l.lines,b.x+b.width/2,b.y+b.height/2,22));}
  out.push('</svg>');
  const prefix=String(number).padStart(2,'0')+'_',matches=(await fs.readdir(EXPORT_DIR)).filter(f=>f.startsWith(prefix)&&f.endsWith('.png'));
  if(matches.length!==1)throw Error(`Expected one export for ${prefix}`);
  const png=path.join(EXPORT_DIR,matches[0]),svg=path.join(svgDir,matches[0].replace('.png','.svg'));
  await fs.writeFile(svg,out.join(''));await sharp(Buffer.from(out.join(''))).resize({width:4200}).png().toFile(png);
  audit.push({file,planeId,shapes:shapes.length,flows:edges.length,fontSizeMin:22,labels:labels.length,png:path.relative(ROOT,png)});
 }
 // Replacing an editable route leaves its old DI points unowned. Remove only
 // records unreachable from Definitions; the native format rejects orphans.
 const reached=new Set<string>();
 const visit=(ref:string)=>{if(reached.has(ref))return;reached.add(ref);for(const value of Object.values(all[ref].properties))walk(value);};
 const walk=(value:any)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object'&&value.ref)visit(value.ref);};
 visit(doc.model.root);
 for(const ref of Object.keys(doc.layout.objects))if(!reached.has(ref))delete doc.layout.objects[ref];
 const errors=validateBpmnData(doc).filter((d:any)=>d.severity==='error');if(errors.length)throw Error(JSON.stringify(errors));
 await fs.writeFile(filePath,await encodeProject(doc));
}
await fs.writeFile(path.join(ROOT,'ПРОВЕРКА_печатных_BPMN.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
