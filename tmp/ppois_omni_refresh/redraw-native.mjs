// One-off production of the requested PR3 illustrations. No application or browser.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {decodeUml} from 'file:///D:/OmniNotation/src/notations/uml/document.ts';
import {encodeProject} from 'file:///D:/OmniNotation/src/persistence/project.ts';
import {buildUmlScene} from 'file:///D:/OmniNotation/src/notations/uml/projection.ts';
import {routeUmlEdges,umlSceneBounds,routePath} from 'file:///D:/OmniNotation/src/notations/uml/geometry.ts';
import {children,property,umlIndex} from 'file:///D:/OmniNotation/src/notations/uml/model.ts';
import {feature,textLines,textWidth} from 'file:///D:/OmniNotation/src/notations/uml/presentation.ts';
import {umlMessageAppearance} from 'file:///D:/OmniNotation/src/notations/uml/profile.ts';

const base='D:/GitHub/MIREA/tmp/ppois_omni_refresh';
const destination='D:/GitHub/MIREA/4/ППОИС/Схемы';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/VeX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const glyphs=JSON.parse(await fs.readFile(base+'/glyphs.json','utf8'));
const raw=await fs.readFile(destination+'/ПР3_Модель_анализа.omni','utf8');
try {await fs.writeFile(base+'/before-small-arrows.omni',raw,{flag:'wx'});} catch(error) {if(error.code!=='EEXIST')throw error;}
const doc=decodeUml(JSON.parse(raw));
// Keep the authored semantics, source and draft. Only the communication layout changes.
for(const view of doc.model.elements.filter(e=>e.kind==='view'&&e.properties.diagram==='comm')) {
  delete doc.layout.edges[view.id];
}
for(const [n,x,y] of [[0,0,0],[1,0,450],[2,650,450],[3,650,0],[4,1300,450],[5,1450,1000],[6,300,1000]]) {
  doc.layout.nodes['v_comm_pub_lane'+n]={x,y,width:250,height:100};
}
doc.layout.edges.v_comm_pub_channel_2_2={bends:[{x:1020,y:532},{x:1020,y:730},{x:850,y:730}]};
await fs.writeFile(base+'/redrawn.omni',await encodeProject(doc));

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=n=>Number(n.toFixed(3));
const ink='#243244',stroke='#475569';
const line=(a,b,extra='')=>`<path d="M${num(a.x)} ${num(a.y)}L${num(b.x)} ${num(b.y)}" fill="none" stroke="${stroke}" stroke-width="1.5" ${extra}/>`;
const rect=(r,extra='')=>`<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(r.width)}" height="${num(r.height)}" fill="white" stroke="${stroke}" stroke-width="1.5" ${extra}/>`;
function textLine(value,x,y,size=13,style='regular',anchor='start') {
  const font=glyphs[style], scale=size/font.units;
  const glyphList=[...value].map(c=>font.glyphs[c]??font.glyphs['?']);
  const width=glyphList.reduce((sum,g)=>sum+g.advance*scale,0);
  let cursor=anchor==='middle'?x-width/2:anchor==='end'?x-width:x;
  let body='';
  for(const g of glyphList){
    if(g.path)body+=`<path d="${g.path}" transform="translate(${num(cursor)} ${num(y)}) scale(${scale} ${-scale})"/>`;
    cursor+=g.advance*scale;
  }
  return `<g fill="${ink}" stroke="none" aria-label="${esc(value)}">${body}</g>`;
}
function textBlock(value,r,{size=13,style='regular',align='middle',leading=18,vertical='middle',pad=7}={}) {
  const lines=Array.isArray(value)?value:textLines(value,Math.max(8,r.width-pad*2),size);
  const top=vertical==='middle'?r.y+(r.height-lines.length*leading)/2:r.y+pad;
  const x=align==='middle'?r.x+r.width/2:align==='end'?r.x+r.width-pad:r.x+pad;
  return lines.map((s,i)=>textLine(s,x,top+i*leading+size, size,style,align)).join('');
}
function stick(cx,y,small=false){
  const w=small?44:80,h=small?42:80;
  return `<g transform="translate(${num(cx-w/2)} ${num(y)}) scale(${w/90} ${h/88})" stroke="${stroke}" stroke-width="2" fill="white"><circle cx="45" cy="13" r="11"/><path d="M45 24V55M17 35H73M45 55L20 83M45 55L70 83" fill="none"/></g>`;
}
function nodeSvg(n){
  const e=n.data.element,r={...n.position,width:n.width,height:n.height};
  const sequence=n.data.diagramKind==='sequence',label=n.data.label;
  let body='';
  if(n.data.shape==='interactionFrame'||['fragment','interactionUse'].includes(e.kind)){
    body=rect(r,'fill-opacity="0"');
    const tab=Math.min(r.width-10,textWidth(label,12)+24),height=26;
    body+=`<path d="M${r.x} ${r.y}h${tab}v${height-8}l-8 8H${r.x}Z" fill="white" stroke="${stroke}"/>`;
    body+=textLine(label,r.x+10,r.y+17,12,'bold');
    for(const [i,operand] of n.data.operands.entries()){
      const y=r.y+operand.y;
      if(i)body+=line({x:r.x,y},{x:r.x+r.width,y},'stroke-dasharray="5 4"');
      body+=textBlock(operand.label,{x:r.x+2,y:y+2,width:r.width-4,height:30},{size:11,align:'start',vertical:'top',leading:16});
    }
  }else if(e.kind==='system'){
    body=rect(r,'fill-opacity="0"')+textLine(label,r.x+12,r.y+22,13,'bold');
  }else if(e.kind==='actor'){
    const lines=textLines(label,r.width-12,13), y=r.y+Math.max(0,(r.height-85-lines.length*18)/2);
    body=stick(r.x+r.width/2,y)+textBlock(lines,{x:r.x,y:y+85,width:r.width,height:lines.length*18});
  }else if(e.kind==='usecase'){
    body=`<ellipse cx="${r.x+r.width/2}" cy="${r.y+r.height/2}" rx="${r.width/2}" ry="${r.height/2}" fill="white" stroke="${stroke}" stroke-width="1.5"/>`;
    body+=textBlock(label,{x:r.x+r.width*.15,y:r.y,width:r.width*.7,height:r.height},{style:'bold'});
  }else if(e.kind==='lifeline'){
    const head={...r,height:sequence?n.data.headHeight:r.height};
    const actor=umlIndex(doc.model).get(e.properties.classifier)?.kind==='actor';
    if(sequence)body+=line({x:r.x+r.width/2,y:r.y+head.height},{x:r.x+r.width/2,y:r.y+r.height},'stroke-dasharray="6 5"');
    body+=rect(head);
    if(actor){body+=stick(r.x+30,r.y+(head.height-42)/2,true);body+=textBlock(label,{x:r.x+60,y:r.y,width:r.width-68,height:head.height});}
    else body+=textBlock(label,head);
    for(const event of n.data.events.filter(e=>e.destroy))body+=textLine('×',r.x+r.width/2,r.y+event.y+8,26,'regular','middle');
  }else if(e.kind==='class'){
    const members=children(doc.model,e.id),view=umlIndex(doc.model).get(n.data.viewId);
    const compartments=view?.properties.compartments||'all';
    body=rect(r);
    const nameLines=textLines(label,r.width-14,13);
    let y=r.y+7;
    if(e.properties.role){body+=textLine('«'+e.properties.role+'»',r.x+r.width/2,y+11,11,'regular','middle');y+=16;}
    body+=textBlock(nameLines,{x:r.x,y,width:r.width,height:nameLines.length*18},{style:e.properties.abstract==='true'?'italic':'bold'});
    y=Math.max(r.y+38,y+nameLines.length*18+7);
    if(compartments!=='name')for(const [kinds,hidden] of [[['attribute','literal'],'operations'],[['operation'],'attributes']]){
      if(compartments===hidden)continue;
      body+=line({x:r.x,y},{x:r.x+r.width,y});y+=5;
      const group=members.filter(m=>kinds.includes(m.kind));
      if(!group.length)y+=16;
      for(const member of group){
        const lines=textLines(member.kind==='literal'?member.label:feature(doc.model,member),r.width-20,12);
        body+=textBlock(lines,{x:r.x+2,y,width:r.width-4,height:lines.length*18},{size:12,align:'start',style:member.properties.abstract==='true'?'italic':'regular',pad:7});
        y+=lines.length*18;
      }
      y+=5;
    }
  }else throw new Error('The requested illustrations contain an unsupported figure: '+e.kind);
  return `<g id="${esc(n.id)}"><title>${esc(label)}</title>${body}</g>`;
}
function marker(kind,small=false){
  const id=kind+(small?'-small':'');
  const shape=kind==='filled'?`<path d="M2 2L14 8L2 14Z" fill="${stroke}"/>`:
    kind==='triangle'?`<path d="M1 1L14 8L1 15Z" fill="white" stroke="${stroke}"/>`:
    ['diamond','composite'].includes(kind)?`<path d="M0 8L7 2L14 8L7 14Z" fill="${kind==='composite'?stroke:'white'}" stroke="${stroke}"/>`:
    kind==='cross'?`<path d="M6 3L14 13M6 13L14 3" stroke="${stroke}"/>`:
    `<path d="M2 2L14 8L2 14" fill="none" stroke="${stroke}"/>`;
  return `<marker id="${id}" markerWidth="${small?11:16}" markerHeight="${small?11:16}" refX="14" refY="8" viewBox="0 0 16 16" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${shape}</marker>`;
}
function edgeSvg(edge){
  const d=edge.data,e=d.element,g=d.geometry;
  let from='',to='',dashed=false;
  if(['generalization','realization'].includes(e.kind)){to='triangle';dashed=e.kind==='realization';}
  if(['dependency','include','extend','ordering'].includes(e.kind)){to='open';dashed=true;}
  if(e.kind==='message'){const a=umlMessageAppearance[property(e,'sort')];to=a.head;dashed=a.dashed;}
  const nav=end=>!end?'':property(end,'navigation')==='navigable'||end.properties.ownedBy?'open':property(end,'navigation')==='nonNavigable'?'cross':'';
  const agg=end=>!end?'':property(end,'aggregation')==='composite'?'composite':property(end,'aggregation')==='shared'?'diamond':'';
  if(d.fromEnd||d.toEnd){from=agg(d.toEnd)||nav(d.fromEnd);to=agg(d.fromEnd)||nav(d.toEnd);}
  const small=d.diagramKind==='communication'&&e.kind==='message';
  let body=`<path d="${routePath(g.points)}" fill="none" stroke="${stroke}" stroke-width="1.5" ${from?`marker-start="url(#${from})"`:''} ${to?`marker-end="url(#${to}${small?'-small':''})"`:''} ${dashed?`stroke-dasharray="${small?'5 3':'7 4'}"`:''}/>`;
  if(g.attachment)body+=`<path d="${routePath(g.attachment)}" fill="none" stroke="${stroke}" stroke-dasharray="5 4"/>`;
  return `<g id="${esc(edge.id)}"><title>${esc(edge.label)}</title>${body}</g>`;
}
function edgeText(edge){
  const g=edge.data.geometry;
  let body='';
  for(const box of [...g.ends,...g.qualifiers]){
    if(g.qualifiers.includes(box))body+=rect(box);
    else body+=`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="white"/>`;
    body+=box.lines.map((s,i)=>textLine(s,box.x+6,box.y+15+i*16,11)).join('');
  }
  const b=g.label;
  if(b.lines.some(Boolean)){
    body+=`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="2" fill="white"/>`;
    body+=b.lines.map((s,i)=>textLine(s,b.x+b.width/2,b.y+15+i*16,12,'regular','middle')).join('');
  }
  return body;
}
function operandLabels(n){
  return n.data.operands.map(operand=>{
    const lines=textLines(operand.label,n.width-22,11);
    const r={x:n.position.x+4,y:n.position.y+operand.y+3,width:Math.min(n.width-8,Math.max(...lines.map(s=>textWidth(s,11)))+16),height:lines.length*16+9};
    return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="white"/>`+textBlock(lines,{x:n.position.x+2,y:n.position.y+operand.y+2,width:n.width-4,height:30},{size:11,align:'start',vertical:'top',leading:16});
  }).join('');
}

const sheets=[['use','ПР3_01_Варианты_использования'],['classes','ПР3_02_Классы_анализа'],['bom_seq','ПР3_03_Последовательность_UC02'],['pub_seq','ПР3_04_Последовательность_UC05'],['comm','ПР3_05_Кооперация_UC05']];
const report=[];
for(const [id,name] of sheets){
  const scene=buildUmlScene(doc,id);
  if(id.endsWith('_seq')){
    for(const edge of scene.edges)if(edge.kind==='message')edge.data.label=edge.data.element.properties.sequence+'. '+edge.data.label;
    scene.edges=routeUmlEdges(scene.nodes,scene.edges);
  }
  const bounds=umlSceneBounds(scene.nodes,scene.edges), W=Math.ceil(bounds.width),H=Math.ceil(bounds.height);
  const frames=scene.nodes.filter(n=>['system','fragment','interactionUse'].includes(n.kind)||n.data.shape==='interactionFrame');
  const figures=scene.nodes.filter(n=>!frames.includes(n));
  const defs=['filled','open','triangle','diamond','composite','cross'].flatMap(k=>[marker(k),marker(k,true)]).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${bounds.x} ${bounds.y} ${W} ${H}" role="img"><title>${esc(doc.model.elements.find(e=>e.id===id).label)}</title><desc>UML 2.5.1. Геометрия OmniNotation от 24.09.2026; модель ПР3_Модель_анализа.omni. Текст преобразован в векторные контуры Segoe UI.</desc><defs>${defs}</defs><rect x="${bounds.x}" y="${bounds.y}" width="${W}" height="${H}" fill="white"/>${frames.map(nodeSvg).join('')}${figures.map(nodeSvg).join('')}${scene.edges.map(edgeSvg).join('')}${frames.map(operandLabels).join('')}${scene.edges.map(edgeText).join('')}</svg>`;
  await fs.writeFile(base+'/redrawn-'+id+'.svg',svg);
  const png=await sharp(Buffer.from(svg),{density:144,limitInputPixels:false}).png().toFile(base+'/redrawn-'+id+'.png');
  // Compact geometry accompanies production output for later layout revisions.
  await fs.writeFile(base+'/redrawn-'+id+'.layout.json',JSON.stringify({bounds,nodes:scene.nodes.map(n=>({id:n.id,kind:n.kind,label:n.data.label,...n.position,width:n.width,height:n.height})),edges:scene.edges.map(e=>({id:e.id,kind:e.kind,label:e.data.label,geometry:e.data.geometry})),notices:scene.notices},null,2));
  report.push({id,name,width:png.width,height:png.height,nodes:scene.nodes.length,edges:scene.edges.length,notices:scene.notices});
}
await fs.writeFile(base+'/redrawn-manifest.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
