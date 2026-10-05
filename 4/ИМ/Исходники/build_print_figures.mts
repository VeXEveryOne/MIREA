// Print projections use native semantics. Only sequence time spacing is compressed;
// no elapsed time is asserted by the interaction diagram.
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODEL_DIR,omniModule} from './runtime.mjs';
import {runtimeModule} from '../../../tools/runtime.mjs';
import {font,escape,wrap,measure,intersects} from '../../../tools/diagram_text.mts';
const {decodeProject,encodeProject}=await omniModule('src/persistence/project.ts');
const {buildUmlScene}=await omniModule('src/notations/uml/projection.ts');
const {calculateSchedule}=await omniModule('src/notations/gantt/schedule.ts');
const {default:sharp}=await runtimeModule('sharp');
const out=path.join(MODEL_DIR,'report_figures');await fs.mkdir(path.join(out,'SVG'),{recursive:true});
const audits:any[]=[];
const center=(r:any)=>({x:r.x+r.width/2,y:r.y+r.height/2});
const text=(lines:string[],x:number,y:number,size=26,bold=false,underline=false)=>lines.map((v,i)=>`<text x="${x}" y="${y+(i-(lines.length-1)/2)*size*1.15+size*.33}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="${bold?'bold':'normal'}" ${underline?'text-decoration="underline"':''}>${escape(v)}</text>`).join('');
const box=async(r:any,label:string,size=26,bold=false)=>{
 const lines=await wrap(label,r.width-26,size,bold);if(lines.length*size*1.15>r.height-10)throw Error(`Text overflow: ${label}`);
 return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="white" stroke="#111" stroke-width="2"/>`+text(lines,center(r).x,center(r).y,size,bold);
};
const line=(points:any[],dashed=false,arrow=false,solid=false)=>`<path d="${points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('')}" fill="none" stroke="white" stroke-width="7"/><path d="${points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('')}" fill="none" stroke="#111" stroke-width="2" ${dashed?'stroke-dasharray="9 6"':''} ${arrow?`marker-end="url(#${solid?'solid':'open'})"`:''}/>`;
async function save(name:string,W:number,H:number,body:string,info:any){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="open" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L9 5L0 10" fill="none" stroke="#111"/></marker><marker id="solid" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L9 5L0 10Z" fill="#111"/></marker></defs><rect width="${W}" height="${H}" fill="white"/>${body}</svg>`;
 await fs.writeFile(path.join(out,'SVG',name+'.svg'),svg);
 await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(out,name+'.png'));
 audits.push({name,...info});
}
// Exact organisation from the original PPOIS1 figure, not the older drawio tree.
const org=[
 ['company','ООО «Юкомс»',[760,30,350,85],null],['director','Генеральный директор',[1280,30,350,85],'company'],
 ['commerce','Отдел электронной коммерции',[25,245,350,125],'company'],['production','Производственный участок',[440,245,350,125],'company'],
 ['support','Отдел клиентской поддержки и сервисного обслуживания',[855,245,350,125],'company'],['it','Отдел ИТ-поддержки и технического сопровождения',[1270,245,350,125],'company'],['logistics','Отдел логистики',[1685,245,350,125],'company'],
 ['manager','Менеджер маркетплейсов',[25,445,350,100],'commerce'],['designer','Дизайнер',[25,645,350,100],'manager'],
 ['head','Руководитель производственного участка',[440,445,350,100],'production'],['platform','Сборщик платформ',[440,645,350,100],'head'],['pc','Сборщик ПК',[440,835,350,100],'platform'],
 ['stock','Складской отдел',[25,835,350,100],'head'],['specialist','Специалист поддержки',[855,445,350,100],'support'],
 ['lead','Ведущий разработчик',[1270,445,350,100],'it'],['developer','Разработчик',[1270,645,350,100],'lead'],['driver','Водитель',[1685,445,350,100],'logistics'],
].map(([id,label,r,parent]:any)=>({id,label,x:r[0],y:r[1],width:r[2],height:['support','it','head'].includes(id)?145:r[3],parent}));
let s='';for(const n of org.filter(n=>n.parent)){
 const p=org.find(p=>p.id===n.parent)!;
 let points:any[];
 if(n.id==='director')points=[{x:p.x+p.width,y:center(p).y},{x:n.x,y:center(n).y}];
 else if(n.id==='stock')points=[{x:p.x,y:center(p).y},{x:405,y:center(p).y},{x:405,y:795},{x:center(n).x,y:795},{x:center(n).x,y:n.y}];
 else points=[{x:center(p).x,y:p.y+p.height},{x:center(p).x,y:p.id==='company'?185:p.y+p.height+45},{x:center(n).x,y:p.id==='company'?185:p.y+p.height+45},{x:center(n).x,y:n.y}];
 s+=line(points,false,true).replace(/<path d="[^"]*" fill="none" stroke="white" stroke-width="7"\/>/g,'');
}for(const n of org)s+=await box(n,n.label,28,n.id==='company');
await save('ПР1_Оргструктура',2060,970,s,{nodes:org.length,source:'PPOIS1 original organisation'});
const uml=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'ИМ_ПР8-10_UML.omni'),'utf8'));
const architecture=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'ИМ_ПР9-10_Архитектура.omni'),'utf8'));
// Common projection for bounded UML diagrams. Labels are remeasured for print.
for(const [doc,id,name] of [[uml,'use_data','ПР8_Прецеденты_данные'],[uml,'use_publish','ПР8_Прецеденты_публикация'],[uml,'components','ПР10_Компоненты'],[architecture,'deployment','ПР10_Развёртывание'],[architecture,'activity','ПР9_Деятельность']] as any){
 const scene=buildUmlScene(doc,id);if(scene.hidden||scene.notices?.length)throw Error(`Incomplete scene ${id}`);
 const nodes=scene.nodes.map((n:any)=>({id:n.id,...n.position,width:n.width,height:n.height,kind:n.data.element.kind,label:n.label,element:n.data.element,parent:doc.model.elements.find((e:any)=>e.id===n.id)?.properties.parent}));
 const container=(n:any)=>nodes.some((c:any)=>c.parent===n.id);
 const maxX=Math.max(...nodes.map((n:any)=>n.x+n.width))+40,maxY=Math.max(...nodes.map((n:any)=>n.y+n.height))+40;
 s='';
 const renderNode=async(n:any)=>{
  const {x,y,width:w,height:h}=n,c=center(n),isContainer=container(n);
  if(n.kind==='actor'){
   const old=await wrap(n.label,w-12,13),top=y+Math.max(0,(h-85-old.length*18)/2);
   return `<circle cx="${c.x}" cy="${top+15}" r="13" fill="white" stroke="#111" stroke-width="2"/><path d="M${c.x} ${top+28}v29M${c.x-25} ${top+38}h50M${c.x} ${top+57}l-22 23M${c.x} ${top+57}l22 23" stroke="#111" fill="none" stroke-width="2"/>`+text(await wrap(n.label,w+20,24),c.x,top+108,24);
  }
  if(n.kind==='initial'||n.kind==='activityFinal')return `<circle cx="${c.x}" cy="${c.y}" r="${w/2}" fill="${n.kind==='initial'?'#111':'white'}" stroke="#111" stroke-width="2"/>`+(n.kind==='activityFinal'?`<circle cx="${c.x}" cy="${c.y}" r="${w/2-5}" fill="#111"/>`:'');
  if(['decision','merge'].includes(n.kind))return `<path d="M${c.x} ${y}L${x+w} ${c.y}L${c.x} ${y+h}L${x} ${c.y}Z" fill="white" stroke="#111" stroke-width="2"/>`+text(n.label?[n.label]:[],c.x,c.y,24);
  if(n.kind==='partition')return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="2"/><path d="M${x} ${y+65}h${w}" stroke="#111"/>`+text(await wrap(n.label,w-18,26),c.x,y+33,26,true);
  const label=n.kind==='usecase'?`${n.element.id.toUpperCase().replace('UC','UC-')}\n${n.label}`:n.label;
  const size=n.kind==='usecase'?24:26;
  const lines=await wrap(label,w-(n.kind==='usecase'?64:30),size);let r='';
  if(n.kind==='usecase')r=`<ellipse cx="${c.x}" cy="${c.y}" rx="${w/2}" ry="${h/2}" fill="white" stroke="#111" stroke-width="2"/>`;
  else r=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${n.kind==='action'?14:0}" fill="white" stroke="#111" stroke-width="2"/>`;
  if(['node','device','executionEnvironment'].includes(n.kind))r+=`<path d="M${x} ${y}l12-10h${w}v${h}l-12 10M${x+w} ${y}l12-10" fill="none" stroke="#111" stroke-width="2"/>`;
  if(n.kind==='artifact')r+=`<path d="M${x+w-27} ${y+8}h12l7 7v13h-19ZM${x+w-15} ${y+8}v7h7" fill="white" stroke="#111"/>`;
  if(n.kind==='component')r+=`<rect x="${x+w-28}" y="${y+9}" width="18" height="22" fill="white" stroke="#111"/><path d="M${x+w-32} ${y+12}h9v5h-9ZM${x+w-32} ${y+22}h9v5h-9Z" fill="white" stroke="#111"/>`;
  const stereo=['device','executionEnvironment','artifact'].includes(n.kind)?`«${n.kind}»`:'';
  const needed=lines.length*size*1.15+(stereo?25:0);
  if(!isContainer&&needed>h-10)throw Error(`UML overflow ${id}/${n.id}`);
  const cy=isContainer?y+(stereo?32:0)+25+(lines.length-1)*14.95:c.y+(stereo?12.5:0);
  if(stereo)r+=text([stereo],c.x,isContainer?y+20:c.y-needed/2+10,20);
  return r+text(lines,c.x,cy,size,isContainer);
 };
 for(const n of nodes.filter(container))s+=await renderNode(n);
 const obstacles=nodes.map((n:any)=>container(n)?{...n,height:100}:n),labels:any[]=[];
 for(const e of scene.edges){
  const g=e.data.geometry;if(!g)throw Error('No geometry');
  s+=line(g.points,['dependency','include','manifestation'].includes(e.kind),!['participation','communicationPath'].includes(e.kind),e.kind==='controlFlow');
  const label=g.label.lines.join(' ');if(!label)continue;
  const lines=await wrap(label,260,24),w=Math.max(...await Promise.all(lines.map((v:string)=>measure(v,24))))+12,h=lines.length*27.6+8;
  const cx=g.label.x+g.label.width/2,cy=g.label.y+g.label.height/2;
  let best:any=null,cost=Infinity;
  for(let dx=-240;dx<=240;dx+=10)for(let dy=-240;dy<=240;dy+=10){const b={x:cx+dx-w/2,y:cy+dy-h/2,width:w,height:h};if(b.x<0||b.y<0||b.x+w>maxX||b.y+h>maxY||obstacles.some((o:any)=>intersects(b,o,3)))continue;const score=Math.hypot(dx,dy);if(score<cost){cost=score;best=b;}}
  if(!best)throw Error(`No label space ${id}/${e.id}`);labels.push({...best,lines});obstacles.push(best);
 }
 for(const n of nodes.filter((n:any)=>!container(n)))s+=await renderNode(n);
 for(const l of labels)s+=`<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="white"/>`+text(l.lines,l.x+l.width/2,l.y+l.height/2,24);
 await save(name,maxX,maxY,s,{sheet:id,nodes:nodes.length,edges:scene.edges.length});
}
// Sequence: retain all 12 native messages and their order, show instance labels.
const index=new Map(uml.model.elements.map((e:any)=>[e.id,e]));
const lifelines=uml.model.elements.filter((e:any)=>e.kind==='lifeline');
const xs=new Map(lifelines.map((l:any,i:number)=>[l.id,100+i*350]));
s='';for(const l of lifelines){const x=xs.get(l.id)!;const classifier=index.get(l.properties.classifier);const label=`${l.label}: ${classifier.label}`;
 s+=await box({x:x-100,y:20,width:200,height:100},label,24);s+=`<path d="M${x} 120V790" stroke="#111" stroke-width="2" stroke-dasharray="9 6"/>`;
 // UML object instance names are underlined in the print view.
 s+=`<path d="M${x-86} 111h172" stroke="#111"/>`;
}
const messages=uml.model.elements.filter((e:any)=>e.kind==='message').sort((a:any,b:any)=>+a.properties.sequence-+b.properties.sequence);
for(const [i,m] of messages.entries()){
 const a=index.get(m.properties.send),b=index.get(m.properties.receive),x1=xs.get(a.properties.lifeline)!,x2=xs.get(b.properties.lifeline)!,y=175+i*50+(i>=8?25:0);
 const label=`${m.properties.sequence}. ${m.label}`;const lines=await wrap(label,Math.abs(x2-x1)-20,22);
 if(lines.length>1)throw Error(`Sequence caption must fit a row: ${label}`);
 s+=line([{x:x1,y},{x:x2,y}],m.properties.sort==='reply',true,m.properties.sort!=='reply');
 s+=`<rect x="${Math.min(x1,x2)+10}" y="${y-31}" width="${Math.abs(x2-x1)-20}" height="27" fill="white"/>`+text(lines,(x1+x2)/2,y-17,22);
}
await save('ПР9_Последовательность',1620,825,s,{messages:messages.map((m:any)=>({id:m.id,order:+m.properties.sequence,sort:m.properties.sort}))});
// FURPS+ in two bounded print parts; all 27 native codes remain visible.
const furps=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'ИМ_ПР6_FURPS.omni'),'utf8'));
const requirements=furps.model.elements.filter((e:any)=>e.properties.kind==='requirement');
for(const functional of [true,false]){
 const categories=furps.model.elements.filter((e:any)=>e.properties.kind==='category'&&((e.properties.category==='F')===functional));
 const W=functional?1800:1850,H=functional?1030:1030;s=await box({x:550,y:20,width:700,height:80},functional?'FURPS+ · функциональность':'FURPS+ · качества и ограничения',28,true);
 for(const [i,c] of categories.entries()){
  const req=requirements.filter((e:any)=>e.properties.parent===c.id).sort((a:any,b:any)=>+a.properties.order-+b.properties.order);
  const categoryBox=functional?{x:20,y:170,width:1760,height:80}:{x:15+i*370,y:170,width:350,height:115};
  s+=line([{x:900,y:100},{x:900,y:130},{x:center(categoryBox).x,y:130},{x:center(categoryBox).x,y:170}]).replace(/<path d="[^"]*" fill="none" stroke="white" stroke-width="7"\/>/g,'');
  s+=await box(categoryBox,c.label.split(' · ')[0],26,true);
  for(const [j,r] of req.entries()){
   const x=functional?20+(j%4)*445:15+i*370,y=functional?350+Math.floor(j/4)*220:365+j*215,width=functional?405:350,height=185;
   const column=functional?j%4:0;const busX=functional?10+column*445:x-8;
   s+=line([{x:center(categoryBox).x,y:categoryBox.y+categoryBox.height},{x:center(categoryBox).x,y:310},{x:busX,y:310},{x:busX,y:y+height/2},{x,y:y+height/2}]).replace(/<path d="[^"]*" fill="none" stroke="white" stroke-width="7"\/>/g,'');
   const summary=r.label.replace(/^(?:Удобство|Надёжность|Производительность|Сопровождаемость|Ограничение интерфейса|Ограничение реализации|Ограничение проекта):\s*/,'');
   s+=await box({x,y,width,height},r.properties.code+'\n'+summary,functional?25:24);
  }
 }
 await save(functional?'ПР6_FURPS_Функции':'ПР6_FURPS_Качества',W,H,s,{codes:requirements.filter((e:any)=>(e.properties.code.startsWith('F-'))===functional).map((e:any)=>e.properties.code)});
}
// Calendar graph, not a screenshot of a dense editor table.
const plan=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'ИМ_ПР11_Гант.omni'),'utf8'));
const schedule=calculateSchedule(plan.model);if(!schedule.complete||schedule.violations.length)throw Error(JSON.stringify(schedule.violations));
const tasks=plan.model.elements.filter((e:any)=>e.kind==='task'&&e.properties.kind!=='summary');
const taskRows=new Map(tasks.map((t:any,i:number)=>[t.id,120+i*64]));const graphX=650,dayW=20;
s='';for(let w=0;w<=12;w++){const x=graphX+w*100;s+=`<path d="M${x} 70V${100+tasks.length*64}" stroke="#bbb"/>`;if(w<12)s+=text(['Н'+(w+1)],x+50,40,26,true);}
let bars='';for(const t of tasks){const a=schedule.tasks.get(t.id)!,y=taskRows.get(t.id)!,x=graphX+a.start!*dayW;
 bars+=text(await wrap((t.properties.wbsCode??'')+' '+t.label,610,24),320,y+16,24);
 if(a.kind==='milestone')bars+=`<path d="M${x} ${y-2}l15 18l-15 18l-15-18Z" fill="#111"/>`;
 else bars+=`<rect x="${x}" y="${y}" width="${a.duration!*dayW}" height="30" fill="${a.critical?'#555':'white'}" stroke="#111" stroke-width="${a.critical?3:2}"/>`;
}
for(const e of plan.model.elements.filter((e:any)=>e.kind==='dependency')){
 const a=schedule.tasks.get(e.properties.from)!,b=schedule.tasks.get(e.properties.to)!,ys=taskRows.get(e.properties.from)!+30,yt=taskRows.get(e.properties.to)!;
 const x1=graphX+(e.properties.type==='SS'?a.start!:a.finish!)*dayW,x2=graphX+b.start!*dayW;
 const elbow=Math.min(x1,x2)-13;
 s+=line([{x:x1,y:ys},{x:x1,y:ys+10},{x:elbow,y:ys+10},{x:elbow,y:yt-10},{x:x2,y:yt-10},{x:x2,y:yt}],false,true);
 if(e.properties.type==='SS')s+=`<rect x="${elbow-130}" y="${(ys+yt)/2-18}" width="123" height="26" fill="white"/>`+text([`SS +${e.properties.lag} дн.`],elbow-68,(ys+yt)/2-5,22);
}
s+=bars+text(['Тёмная полоса — критическая работа. Связи без подписи — FS.'],940,145+tasks.length*64,24);
await save('ПР11_Гант',1900,180+tasks.length*64,s,{horizon:schedule.horizon,tasks:tasks.map((t:any)=>({id:t.id,...schedule.tasks.get(t.id)}))});
await fs.writeFile(path.join(MODEL_DIR,'ПРОВЕРКА_печатных_рисунков.json'),JSON.stringify(audits,null,2)+'\n');
console.log(JSON.stringify(audits.map(a=>({name:a.name,nodes:a.nodes,edges:a.edges,codes:a.codes,messages:a.messages?.length,horizon:a.horizon})),null,2));
