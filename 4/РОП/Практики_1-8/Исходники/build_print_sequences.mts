// Paginated print views of native interactions, preserving every message,
// endpoint, sort, enclosing fragment and operand guard.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,MODEL_DIR,EXPORT_DIR,omniModule,runtimeModule} from './runtime.mjs';
import {escape,font,wrap,measure} from './print_text.mts';
const {decodeProject}=await omniModule('src/persistence/project.ts');
const {default:sharp}=await runtimeModule('sharp');
const doc=await decodeProject(await fs.readFile(path.join(MODEL_DIR,'РОП_UML_Последовательности.omni'),'utf8'));
const els=doc.model.elements,index=new Map(els.map((e:any)=>[e.id,e]));
const registry=JSON.parse(await fs.readFile(path.join(MODEL_DIR,'Реестр_38_рисунков.json'),'utf8'));
const out=path.join(EXPORT_DIR,'sequence_parts');await fs.mkdir(out,{recursive:true});
const audits:any[]=[];
function text(x:number,y:number,lines:string[],size=26,anchor='middle'){
 return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" text-anchor="${anchor}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size+5:0}">${escape(s)}</tspan>`).join('')}</text>`;
}
function endpoint(m:any,side:string){const o=index.get(m.properties[side]);if(o?.kind!=='occurrence')throw Error('Invalid occurrence');return o.properties.lifeline;}
function context(m:any){let owner=index.get(index.get(m.properties.send).properties.owner),chain:any[]=[];
 while(owner?.kind==='operand'){const fragment=index.get(owner.properties.owner);chain.unshift({fragment,operand:owner});owner=index.get(fragment.properties.owner);}return chain;
}
const defs='<defs><marker id="call" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#111"/></marker><marker id="open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#111"/></marker></defs>';
for(const sheet of els.filter((e:any)=>e.kind==='diagram')){
 const owner=sheet.properties.interaction,lanes=els.filter((e:any)=>e.kind==='lifeline'&&e.properties.owner===owner);
 const messages=els.filter((e:any)=>e.kind==='message'&&e.properties.owner===owner).sort((a:any,b:any)=>+a.properties.sequence-+b.properties.sequence);
 const box=245,step=290,margin=80,W=margin*2+box+(lanes.length-1)*step;
 const laneIndex=new Map(lanes.map((e:any,i:number)=>[e.id,i]));
 const headers=await Promise.all(lanes.map((e:any)=>wrap(e.label,box-20,26)));
 const HH=Math.max(...headers.map(l=>l.length*31+20)),startY=HH+105;
 const prepared:any[]=[];
 for(const m of messages){
  const a=laneIndex.get(endpoint(m,'send'))!,b=laneIndex.get(endpoint(m,'receive'))!,self=a===b;
  const available=self?Math.max(220,W-(margin+box/2+a*step+55)-24):Math.abs(a-b)*step-26;
  const lines=await wrap(`${m.properties.sequence}. ${m.label}`,available,26);
  const chain=context(m),guards=await Promise.all(chain.map(c=>wrap(`${c.fragment.properties.operator} · ${c.fragment.label} [${c.operand.properties.guard}]`,W-120-chain.length*24,24)));
  prepared.push({m,a,b,self,lines,chain,guards});
 }
 // Split at message boundaries. A continuing fragment is reopened with its
 // complete native guard on every page, never with cropped labels or arrows.
 const groups:any[][]=[];let group:any[]=[],height=startY,last='';
 for(const row of prepared){const key=row.chain.map((c:any)=>c.operand.id).join('/');const rowHeight=row.lines.length*31+30+(row.self?35:0),guardHeight=row.guards.reduce((n:number,l:string[])=>n+l.length*29+12,0);let extra=(key!==last?guardHeight:0)+rowHeight;
  if(group.length&&height+extra>960){groups.push(group);group=[];height=startY;last='';}
  extra=(key!==last?guardHeight:0)+rowHeight;
  group.push(row);height+=extra;last=key;
 }if(group.length)groups.push(group);
 const parts:any[]=[];const emitted:any[]=[];
 for(const [pi,rows] of groups.entries()){
  let y=startY,lastKey='',body='',frames:any[]=[],active:any[]=[],previous:any[]=[];
  for(const row of rows){const key=row.chain.map((c:any)=>c.operand.id).join('/');
   if(key!==lastKey){
    let common=0;
    while(common<previous.length&&common<row.chain.length&&previous[common].operand.id===row.chain[common].operand.id)common++;
    const newOperand=common<previous.length&&common<row.chain.length&&previous[common].fragment.id===row.chain[common].fragment.id;
    const retain=common+(newOperand?1:0);
    for(const f of active.slice(retain))f.bottom=y-12;
    active=active.slice(0,retain);
    if(newOperand)body+=`<path d="M${24+common*22} ${y-25}H${W-24-common*22}" stroke="#111" stroke-width="1.4" stroke-dasharray="8 5"/>`;
    for(let ci=common;ci<row.chain.length;ci++){
     if(ci>=retain){const f={depth:ci,top:y-25,bottom:0};frames.push(f);active.push(f);}
     const lines=row.guards[ci];body+=`<rect x="${40+ci*22}" y="${y-26}" width="${W-80-ci*44}" height="${lines.length*29+8}" fill="white"/>`+text(50+ci*22,y,lines,24,'start');y+=lines.length*29+12;
    }lastKey=key;previous=row.chain;
   }
   const x1=margin+box/2+row.a*step,x2=margin+box/2+row.b*step,ay=y+row.lines.length*31-12;
   const d=row.self?`M${x1} ${ay}H${x1+42}V${ay+32}H${x1}`:`M${x1} ${ay}H${x2}`;
   const reply=row.m.properties.sort==='reply',open=reply||row.m.properties.sort==='asynchCall';
   const cx=row.self?x1+55:(x1+x2)/2,mw=Math.max(...await Promise.all(row.lines.map((l:string)=>measure(l,26))))+12;
   body+=`<rect x="${row.self?cx-6:cx-mw/2}" y="${y-26}" width="${mw}" height="${row.lines.length*31}" fill="white"/>`+text(cx,y,row.lines,26,row.self?'start':'middle');
   body+=`<path d="${d}" fill="none" stroke="#111" stroke-width="1.8" ${reply?'stroke-dasharray="8 5"':''} marker-end="url(#${open?'open':'call'})"/>`;
   y+=row.lines.length*31+30+(row.self?35:0);
   emitted.push({id:row.m.id,sequence:+row.m.properties.sequence,from:endpoint(row.m,'send'),to:endpoint(row.m,'receive'),sort:row.m.properties.sort,context:row.chain.map((c:any)=>({fragment:c.fragment.id,operator:c.fragment.properties.operator,operand:c.operand.id,guard:c.operand.properties.guard}))});
  }
  for(const f of active)f.bottom=y-10;
  const H=y+25;let background='';
  for(let i=0;i<lanes.length;i++){const x=margin+i*step;
   background+=`<rect x="${x}" y="40" width="${box}" height="${HH}" fill="white" stroke="#111" stroke-width="1.7"/>`+text(x+box/2,40+(HH-headers[i].length*31)/2+26,headers[i]);
   background+=`<path d="M${x+box/2} ${40+HH}V${H-15}" fill="none" stroke="#888" stroke-width="1.2" stroke-dasharray="8 6"/>`;
  }
  for(const f of frames)background+=`<rect x="${24+f.depth*22}" y="${f.top}" width="${W-48-f.depth*44}" height="${f.bottom-f.top}" fill="none" stroke="#111" stroke-width="1.4"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}<rect width="100%" height="100%" fill="white"/>${background}${body}</svg>`;
  const item=registry.figures.find((f:any)=>f.diagramId===sheet.id),name=path.basename(item.export.png.file).replace('.png',`_часть_${pi+1}`);
  await fs.writeFile(path.join(ROOT,'Экспорт','SVG',name+'.svg'),svg);
  await sharp(Buffer.from(svg)).resize({width:4200}).png().toFile(path.join(out,name+'.png'));
  parts.push({file:'Экспорт/PNG/sequence_parts/'+name+'.png',first:+rows[0].m.properties.sequence,last:+rows.at(-1).m.properties.sequence});
 }
 if(new Set(emitted.map(e=>e.id)).size!==messages.length)throw Error('Lost sequence messages');
 audits.push({sheet:sheet.id,messages:emitted,parts});
}
await fs.writeFile(path.join(MODEL_DIR,'ПРОВЕРКА_последовательностей_печать.json'),JSON.stringify(audits,null,2)+'\n');
console.log(JSON.stringify(audits.map(a=>({sheet:a.sheet,messages:a.messages.length,parts:a.parts.length}))));
