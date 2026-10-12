// Print-sized views of the existing analysis model. Messages and guards are
// read from the .omni project; split pages never invent another interaction.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {omniModule, runtimeModule} from '../../../tools/runtime.mjs';
const {decodeProject} = await omniModule('src/persistence/project.ts');
const {lifelineLabel} = await omniModule('src/notations/uml/presentation.ts');
const {default: sharp} = await runtimeModule('sharp');
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Схемы/ПР3_Модель_анализа.omni');
const output = process.env.PPOIS_MODEL_OUTPUT ?? path.dirname(source);
await fs.mkdir(output, {recursive:true});
const document = await decodeProject(await fs.readFile(source, 'utf8'));
const elements = document.model.elements;
const index = new Map(elements.map((e:any) => [e.id,e]));
const esc = (value:any) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const metrics = new Map<string,number>();
async function measure(value:string, size:number) {
  const key = size + ':' + value;
  if (!metrics.has(key)) {
    const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="100"><text x="2" y="70" font-family="Arial" font-size="${size}" fill="black">${esc(value)}</text></svg>`;
    const {info} = await sharp(Buffer.from(xml)).trim().png().toBuffer({resolveWithObject:true});
    metrics.set(key,info.width);
  }
  return metrics.get(key)!;
}
async function wrap(value:string, width:number, size:number) {
  const lines:string[]=[];
  let current='';
  for (const word of value.split(/\s+/)) {
    const candidate = current ? current+' '+word : word;
    if (current && await measure(candidate,size)>width) { lines.push(current); current=word; }
    else current=candidate;
  }
  if (current) lines.push(current);
  for(const line of lines) if(await measure(line,size)>width) throw new Error(`Unbreakable label exceeds width: ${line}`);
  return lines;
}
function text(x:number,y:number,lines:string[],size=24,anchor='middle') {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="#111">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?size+4:0}">${esc(line)}</tspan>`).join('')}</text>`;
}
const definitions = '<defs><marker id="call" viewBox="0 0 12 10" markerWidth="10" markerHeight="9" refX="11" refY="5" orient="auto"><path d="M0 0 L11 5 L0 10 Z" fill="#111"/></marker><marker id="reply" viewBox="0 0 12 10" markerWidth="11" markerHeight="10" refX="11" refY="5" orient="auto"><path d="M1 0 L11 5 L1 10" fill="none" stroke="#111" stroke-width="1.4"/></marker></defs>';
function svg(width:number,height:number,body:string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${definitions}<rect width="100%" height="100%" fill="white"/><g font-family="Arial">${body}</g></svg>`;
}
async function save(name:string,width:number,height:number,body:string) {
  const xml=svg(width,height,body);
  await fs.writeFile(path.join(output,name+'.svg'),xml+'\n');
  await sharp(Buffer.from(xml)).resize({width:3600}).png().toFile(path.join(output,name+'.png'));
  return {width,height,body};
}
function endpoint(message:any, side:'send'|'receive') {
  const occurrence:any=index.get(message.properties[side]);
  if(occurrence?.kind!=='occurrence') throw new Error(`Unsupported endpoint of ${message.id}`);
  return occurrence.properties.lifeline;
}
const emitted:any[]=[];
// Small, explicit use-case and analysis-class routes are shared with the
// editable sheets; they are printed without an auto-router's joined-looking
// actor trunk lines.
function line(route:string,arrow=false,dashed=false) {
  return `<path d="${route}" fill="none" stroke="white" stroke-width="8"/><path d="${route}" fill="none" stroke="#111" stroke-width="2.2" ${dashed?'stroke-dasharray="10 6"':''} ${arrow?'marker-end="url(#reply)"':''}/>`;
}
async function useCases() {
  let body=`<rect x="320" y="10" width="1150" height="1450" fill="white" stroke="#111" stroke-width="2"/>`;
  body+=text(895,52,['ИС формирования и актуализации карточек ООО «Юкомс»'],29);
  const routeSpecs:any[]=[
    ['manager_UC01','M170 140 H275 V165 H420'],['manager_UC05','M170 1170 H275 V1165 H420'],
    ['manager_UC06','M1630 345 H1490 V200 H1360'],
    ['specialist_UC02','M170 600 H290 V415 H420'],
    ['specialist_UC03','M135 620 H250 V665 H420'],['specialist_UC04','M135 635 H270 V915 H420'],
    ['suppliers_UC06','M1630 140 H1510 V165 H1380'],
    ['designer_UC07','M1630 590 H1510 V415 H1380'],
    ['designer_UC09','M1665 615 H1535 V915 H1380'],
    ['admin_UC10','M1630 1180 H1510 V1165 H1380'],
    ['ozon_UC05','M170 1370 H280 V1200 H441'],
    ['UC02_UC03','M610 490 V590',true,725,555],
    ['UC04_UC03','M610 840 V740',true,725,805],
    ['UC05_UC08','M800 1165 H900 V665 H1000',true,940,1000],
  ];
  for(const [id,route,included,lx,ly] of routeSpecs) {
    if(!index.has(id)) throw Error('Missing use-case link '+id);
    body+=line(route,Boolean(included),Boolean(included));
    if(included) body+=text(lx,ly,['«include»'],27);
  }
  for(let i=1;i<=10;i++) {
    const id='UC'+String(i).padStart(2,'0'), e:any=index.get(id);
    const x=i<=5?420:1000,y=90+((i-1)%5)*250;
    const lines=await wrap(e.label,310,28);
    body+=`<ellipse cx="${x+190}" cy="${y+75}" rx="190" ry="75" fill="white" stroke="#111" stroke-width="2"/>`;
    body+=text(x+190,y+75-(lines.length-1)*16+9,lines,28);
  }
  for(const [id,x,y] of [['manager',135,90],['manager',135,1120],['manager',1665,295],
    ['specialist',135,550],['suppliers',1665,90],['designer',1665,540],
    ['admin',1665,1130],['ozon',135,1320]] as any[]) {
    body+=`<circle cx="${x}" cy="${y+10}" r="14" fill="white" stroke="#111" stroke-width="2"/><path d="M${x} ${y+24} V${y+90} M${x-35} ${y+50} H${x+35} M${x} ${y+90} L${x-32} ${y+124} M${x} ${y+90} L${x+32} ${y+124}" stroke="#111" stroke-width="2" fill="none"/>`;
    body+=text(x,y+163,await wrap(index.get(id).label,260,29),29);
  }
  body+=text(895,1538,['Сплошная линия — участие актора; пунктирная стрелка — включаемый вариант.'],26);
  await save('ПР3_01_Варианты_использования',1800,1580,body);
}
async function analysisClasses() {
  const sheets=[['classes_range','ПР3_02_Классы_анализа_1'],['classes_publish','ПР3_02_Классы_анализа_2']];
  for(const [sheet,name] of sheets) {
    const views:any[]=elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram===sheet);
    const classes=views.map(v=>index.get(v.properties.element)).filter(e=>e?.kind==='class');
    const rects=new Map(classes.map(e=>[e.id,document.layout.nodes[`v_${sheet}_${e.id}`]]));
    let body='';
    for(const v of views) {
      const e:any=index.get(v.properties.element);if(e?.kind!=='association') continue;
      const ends:any[]=elements.filter((q:any)=>q.kind==='end'&&q.properties.owner===e.id)
        .sort((a:any,b:any)=>Number(a.properties.order)-Number(b.properties.order));
      const a:any=rects.get(ends[0].properties.classifier),b:any=rects.get(ends[1].properties.classifier);
      let route:string;
      if(e.id==='slot_offer') route='M260 1180 V1240 H1340 V1180';
      else if(e.id==='dep_ModelRangeController_Offer'||e.id==='dep_PubController_Publication')
        route='M1000 270 H1050 V605 H1340 V760';
      else if(a.y===b.y) route=a.x<b.x?`M${a.x+a.width} ${a.y+210} H${b.x}`:`M${a.x} ${a.y+210} H${b.x+b.width}`;
      else route=`M${a.x+200} ${a.y+a.height} V${b.y}`;
      body+=line(route,ends[1].properties.navigation==='navigable');
      // The four entity links show the multiplicities that were already
      // specified in the semantic model; control links indicate navigation.
      if(!e.id.startsWith('dep_')) {
        const format=(end:any)=>end.properties.lower===end.properties.upper?end.properties.lower:end.properties.lower+'..'+end.properties.upper;
        if(e.id==='slot_offer') body+=text(300,1223,[format(ends[0])],27)+text(1300,1223,[format(ends[1])],27);
        else body+=text(a.x<b.x?a.x+a.width+40:a.x-45,a.y+190,[format(ends[0])],27)+
          text(a.x<b.x?b.x-45:b.x+b.width+40,b.y+190,[format(ends[1])],27);
      }
    }
    for(const e of classes) {
      const r:any=rects.get(e.id),size=29;
      const labels=await wrap(e.label,r.width-32,size);
      body+=`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="white" stroke="#111" stroke-width="2"/>`;
      body+=text(r.x+r.width/2,r.y+35,[`«${e.properties.role}»`],27);
      body+=text(r.x+r.width/2,r.y+76,labels,size);
      const divider=r.y+76+labels.length*33;
      body+=`<path d="M${r.x} ${divider} h${r.width}" stroke="#111"/>`;
      let y=divider+37;
      for(const attribute of elements.filter((q:any)=>q.kind==='attribute'&&q.properties.owner===e.id)) {
        const lines=await wrap('- '+attribute.label,r.width-28,27);
        body+=text(r.x+14,y,lines,27,'start');y+=lines.length*31+5;
      }
      body+=`<path d="M${r.x} ${y-14} h${r.width}" stroke="#111"/>`;
      y+=19;
      for(const operation of elements.filter((q:any)=>q.kind==='operation'&&q.properties.owner===e.id)) {
        const lines=await wrap('+ '+operation.label+'()',r.width-28,27);
        body+=text(r.x+14,y,lines,27,'start');y+=lines.length*31+9;
      }
      if(y>r.y+r.height+8) throw Error('Class content exceeds its box: '+e.id);
    }
    body+=text(800,1322,['Сплошная связь — ассоциация; открытый наконечник — направление навигации.'],26);
    await save(name,1600,1360,body);
  }
}
await useCases();
await analysisClasses();
async function sequence(interaction:string, split:number, filename:string) {
  const lanes:any[]=elements.filter((e:any)=>e.kind==='lifeline'&&e.properties.owner===interaction);
  const messages:any[]=elements.filter((e:any)=>e.kind==='message'&&e.properties.owner===interaction)
    .sort((a:any,b:any)=>Number(a.properties.sequence)-Number(b.properties.sequence));
  const laneIndex=new Map(lanes.map((e:any,i:number)=>[e.id,i]));
  const box=230, step=265, margin=50, width=margin*2+box+step*(lanes.length-1), size=24;
  const headers=await Promise.all(lanes.map((e:any)=>wrap(lifelineLabel(document.model,e),box-22,size)));
  const headerHeight=Math.max(...headers.map(lines=>lines.length*(size+4)+20));
  const parts=[];
  for(const [part,selected] of [messages.slice(0,split),messages.slice(split)].entries()) {
    let y=headerHeight+92;
    const rows:any[]=[]; let operand=''; let frameTop=0; const guards:any[]=[];
    for(const message of selected) {
      const owner:any=index.get((index.get(message.properties.send) as any).properties.owner);
      if(owner?.kind==='operand'&&operand!==owner.id) {
        operand=owner.id;
        if(!frameTop) { frameTop=y-25; y+=28; }
        else { guards.push({separator:y-16}); y+=14; }
        guards.push({y,lines:await wrap('['+owner.properties.guard+']',width-170,size)});
        y+=42;
      }
      const a=laneIndex.get(endpoint(message,'send'))!, b=laneIndex.get(endpoint(message,'receive'))!;
      const self=a===b;
      const available=self ? Math.min(360,width-(margin+box/2+a*step+55)-30) : Math.abs(a-b)*step-28;
      const label=message.properties.sequence+': '+message.label;
      const lines=await wrap(label,available,size);
      const rowHeight=Math.max(58,lines.length*(size+4)+16)+(self?38:0);
      rows.push({message,a,b,self,lines,labelY:y,arrowY:y+lines.length*(size+4)-12});
      y+=rowHeight;
    }
    const height=y+35;
    let body=text(width/2,30,[`${interaction==='model_range'?'UC02':'UC05'} · сообщения ${selected[0].properties.sequence}–${selected.at(-1).properties.sequence}${part?' · продолжение':''}`],23);
    for(let i=0;i<lanes.length;i++) {
      const x=margin+i*step;
      body+=`<rect x="${x}" y="50" width="${box}" height="${headerHeight}" fill="white" stroke="#111" stroke-width="1.7"/>`;
      body+=text(x+box/2,50+(headerHeight-headers[i].length*(size+4))/2+size,headers[i],size);
      body+=`<path d="M${x+box/2} ${50+headerHeight} V${height-18}" stroke="#777" stroke-width="1.4" stroke-dasharray="8 6" fill="none"/>`;
    }
    if(frameTop) {
      body+=`<rect x="18" y="${frameTop}" width="${width-36}" height="${height-frameTop-18}" fill="none" stroke="#111" stroke-width="1.7"/><path d="M18 ${frameTop+32} H70 L85 ${frameTop+17} V${frameTop}" stroke="#111" fill="none"/>`;
      body+=text(48,frameTop+25,['alt'],21);
    }
    for(const guard of guards) {
      if(guard.separator) body+=`<path d="M18 ${guard.separator} H${width-18}" stroke="#777" stroke-dasharray="8 5" fill="none"/>`;
      else body+=`<rect x="98" y="${guard.y-25}" width="${width-130}" height="33" fill="white"/>`+text(110,guard.y,guard.lines,size,'start');
    }
    for(const row of rows) {
      const x1=margin+box/2+row.a*step, x2=margin+box/2+row.b*step;
      const route=row.self?`M${x1} ${row.arrowY} H${x1+42} V${row.arrowY+32} H${x1}`:`M${x1} ${row.arrowY} H${x2}`;
      const reply=row.message.properties.sort==='reply';
      const open=reply||row.message.properties.sort.startsWith('asynch');
      body+=`<path d="${route}" stroke="#111" stroke-width="1.8" ${reply?'stroke-dasharray="8 5"':''} fill="none" marker-end="url(#${open?'reply':'call'})"/>`;
      const labelX=row.self?x1+55:(x1+x2)/2;
      // Opaque label backgrounds prevent lifelines from crossing letters.
      const maskWidth=Math.max(...await Promise.all(row.lines.map((line:string)=>measure(line,size))))+12;
      body+=`<rect x="${row.self?labelX-6:labelX-maskWidth/2}" y="${row.labelY-size}" width="${maskWidth}" height="${row.lines.length*(size+4)}" fill="white"/>`;
      body+=text(labelX,row.labelY,row.lines,size,row.self?'start':'middle');
      emitted.push({view:filename,part:part+1,id:row.message.id,sequence:Number(row.message.properties.sequence),from:endpoint(row.message,'send'),to:endpoint(row.message,'receive'),sort:row.message.properties.sort});
    }
    parts.push(await save(filename+`_${part+1}`,width,height,body));
  }
  const fullHeight=parts[0].height+parts[1].height+30;
  await save(filename,width,fullHeight,parts[0].body+`<g transform="translate(0 ${parts[0].height+30})">${parts[1].body}</g>`);
  if(new Set(emitted.filter(e=>e.view===filename).map(e=>e.id)).size!==messages.length) throw new Error('A split sequence lost messages');
}
await sequence('model_range',7,'ПР3_03_Последовательность_UC02');
await sequence('pub',5,'ПР3_04_Последовательность_UC05');
async function communication() {
  const {interactionFingerprint} = await omniModule('src/notations/uml/model.ts');
  const scenario:any=index.get('ready_card');
  if(scenario.properties.fingerprint!==interactionFingerprint(document.model,'pub')) throw new Error('Communication scenario is stale');
  const messages:any[]=elements.filter((e:any)=>e.kind==='step'&&e.properties.owner===scenario.id)
    .sort((a:any,b:any)=>Number(a.properties.order)-Number(b.properties.order)).map((step:any)=>index.get(step.properties.message));
  const selected = new Map(messages.map((e:any)=>[Number(e.properties.sequence),e]));
  const boxes:any[]=[
    ['pub_lane0',40,500,240,95], ['pub_lane1',405,500,250,95],
    ['pub_lane2',825,500,290,95], ['pub_lane3',825,70,290,95],
    ['pub_lane4',1320,500,260,95], ['pub_lane5',1320,850,260,95],
    ['pub_lane6',825,850,290,95],
  ];
  // Parallel routes distinguish a synchronous call from its dashed reply.
  // Several numbered calls can share one communication channel.
  const channels:any[]=[
    {route:'M280 524 H405',labels:[[1,343,397,330]],from:'pub_lane0',to:'pub_lane1'},
    {route:'M405 563 H280',labels:[[14,343,650,330]],from:'pub_lane1',to:'pub_lane0'},
    {route:'M655 524 H825',labels:[[2,740,397,330]],from:'pub_lane1',to:'pub_lane2'},
    {route:'M825 563 H655',labels:[[13,740,650,330]],from:'pub_lane2',to:'pub_lane1'},
    {route:'M940 500 V165',labels:[[3,715,250,350]],from:'pub_lane2',to:'pub_lane3'},
    {route:'M910 500 V165',labels:[[12,715,350,350]],from:'pub_lane2',to:'pub_lane3'},
    {route:'M1000 165 V500',labels:[[4,1210,220,360]],from:'pub_lane3',to:'pub_lane2'},
    {route:'M1115 509 H1210 V325 H1040 V500',labels:[[5,1430,305,350]],from:'pub_lane2',to:'pub_lane2'},
    {route:'M970 595 V850',labels:[[6,745,742,350]],from:'pub_lane2',to:'pub_lane6'},
    {route:'M1010 595 V850',labels:[[11,745,812,350]],from:'pub_lane2',to:'pub_lane6'},
    {route:'M1115 530 H1320',labels:[[7,1460,452,350]],from:'pub_lane2',to:'pub_lane4'},
    {route:'M1320 568 H1115',labels:[[10,1218,650,350]],from:'pub_lane4',to:'pub_lane2'},
    {route:'M1428 595 V850',labels:[[8,1230,742,315]],from:'pub_lane4',to:'pub_lane5'},
    {route:'M1480 850 V595',labels:[[9,1640,742,300]],from:'pub_lane5',to:'pub_lane4'},
  ];
  let body=''; const seen=new Set<string>(); const captions:string[]=[];
  for(const channel of channels) {
    const first:any=selected.get(channel.labels[0][0]);
    if(!first) throw new Error('Missing scenario message');
    const reply=first.properties.sort==='reply';
    const open=reply||first.properties.sort.startsWith('asynch');
    body+=`<path d="${channel.route}" fill="none" stroke="white" stroke-width="7"/><path d="${channel.route}" fill="none" stroke="#111" stroke-width="1.9" ${reply?'stroke-dasharray="8 5"':''} marker-end="url(#${open?'reply':'call'})"/>`;
    for(const [number,x,y,width] of channel.labels) {
      const message:any=selected.get(number);
      if(!message || endpoint(message,'send')!==channel.from || endpoint(message,'receive')!==channel.to || (message.properties.sort==='reply')!==reply) throw new Error('Communication channel changed');
      const lines=await wrap(number+': '+message.label,width,26);
      const mask=Math.max(...await Promise.all(lines.map(line=>measure(line,26))))+12;
      captions.push(`<rect x="${x-mask/2}" y="${y-26}" width="${mask}" height="${lines.length*30}" fill="white"/>`+text(x,y,lines,26));
      seen.add(message.id);
      emitted.push({view:'ПР3_05_Кооперация_UC05',id:message.id,sequence:number,from:channel.from,to:channel.to,sort:message.properties.sort,scenario:scenario.id});
    }
  }
  for(const [id,x,y,width,height] of boxes) {
    const lane:any=index.get(id); const lines=await wrap(lifelineLabel(document.model,lane),width-20,26);
    body+=`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#111" stroke-width="1.8"/>`;
    const baseline=y+(height-lines.length*30)/2+26;
    body+=text(x+width/2,baseline,lines,26);
    for(const [lineNumber,line] of lines.entries()) {
      const length=await measure(line,26);
      body+=`<path d="M${x+(width-length)/2} ${baseline+lineNumber*30+4} h${length}" stroke="#111" stroke-width="1" fill="none"/>`;
    }
  }
  body+=captions.join('');
  body+=text(900,978,['Сценарий «Готовая карточка» · номера сообщений соответствуют рисунку 4'],24);
  if(seen.size!==messages.length) throw new Error('Communication view lost a message');
  await save('ПР3_05_Кооперация_UC05',1800,1000,body);
}
await communication();
await fs.writeFile(path.join(output,'ПР3_Сообщения.json'),JSON.stringify(emitted,null,2)+'\n');
console.log(JSON.stringify({source,output,sequenceMessages:29,communicationMessages:emitted.length-29,diagrams:6,printViews:8,sequenceParts:4}));
