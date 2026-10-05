// Balanced PPOIS IDEF0 source: shared boundary dictionary, explicit branches.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeModule} from '../../../tools/runtime.mjs';
const {default:sharp}=await runtimeModule('sharp');
const output=process.env.PPOIS_MODEL_OUTPUT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../Схемы');
await fs.mkdir(output,{recursive:true});

const L={
 request:['Запрос на создание или','изменение карточки'],
 catalog:['Ассортимент, характеристики','и предложения поставщиков'],
 order:['Порядок создания','и актуализации'],
 bomRules:['Правила BOM: выбор,','сопоставление, замена и версии'],
 compatibility:['Правила','совместимости'],
 contentRules:['Правила цены, массы','и подготовки контента'],
 marketplace:['Требования Ozon','к карточке'],
 manager:['Менеджер','маркетплейсов'],
 bomMechanism:['Технический специалист;','PC4Games / ITPartner; ИС'],
 technician:['Технический','специалист'],
 designer:['Дизайнер;','проектируемая ИС'],
 exchange:['Менеджер;','API Ozon и ИС'],
 checked:['Согласованная BOM'],
 content:['Цена, масса и контент'],
 published:['Подтверждённая','публикация карточки'],
 outcome:['Состояние попытки','и замечания'],
 selected:['Запрос и','выбранный корпус'],
 version:['Версия BOM','на проверку'],
 feedback:['Замечания','по совместимости'],
};
const rootBoundary={I:['request','catalog'],C:['order','bomRules','compatibility','contentRules','marketplace'],M:['manager','bomMechanism','technician','designer','exchange'],O:['checked','content','published','outcome']};
const a2Boundary={I:['selected','catalog'],C:['order','bomRules','feedback'],M:['bomMechanism'],O:['version']};
const a0Nodes=[
 ['A1',['Инициировать','создание или','изменение карточки']],
 ['A2',['Сформировать BOM','и сопоставить','товары поставщиков']],
 ['A3',['Проверить','совместимость']],
 ['A4',['Рассчитать цену, массу','и подготовить','контент']],
 ['A5',['Проверить и','опубликовать','карточку в Ozon']],
].map(([id,label],i)=>({id,label,x:135+285*i,y:180+122*i,w:220,h:85}));
const a2Nodes=[
 ['A21',['Выбрать корпус','и характеристики']],
 ['A22',['Заполнить','слоты BOM']],
 ['A23',['Сопоставить','компоненты и товары']],
 ['A24',['Выбрать актуальные','предложения']],
 ['A25',['Сохранить','версию BOM']],
].map(([id,label],i)=>({id,label,x:135+285*i,y:180+122*i,w:220,h:85}));
const edge=(id,label,points,x,y,lines=L[label] ?? [label])=>({id,label,points,x,y,lines});
const context={node:'A-0',title:'Формировать и актуализировать карточки компьютерных систем',width:1800,height:1000,boundary:rootBoundary,nodes:[{id:'A0',label:['Формировать и','актуализировать карточки','компьютерных систем'],x:695,y:405,w:365,h:190}],edges:[]};
rootBoundary.I.forEach((label,i)=>context.edges.push(edge(`I${i+1}`,label,[[5,450+i*95],[695,450+i*95]],320,417+i*95)));
rootBoundary.C.forEach((label,i)=>{const x=180+i*355,port=730+i*72,y=245+i*26;context.edges.push(edge(`C${i+1}`,label,[[x,65],[x,y],[port,y],[port,405]],x,102));});
rootBoundary.M.forEach((label,i)=>{const x=180+i*355,port=730+i*72,y=800-i*24;context.edges.push(edge(`M${i+1}`,label,[[x,945],[x,y],[port,y],[port,595]],x,866));});
rootBoundary.O.forEach((label,i)=>{const y=432+i*45,end=360+i*133,x=1120+i*30;context.edges.push(edge(`O${i+1}`,label,[[1060,y],[x,y],[x,end],[1795,end]],1480,end-39));});

const a0={node:'A0',title:context.title,width:1800,height:1000,boundary:rootBoundary,nodes:a0Nodes,edges:[]};
a0Nodes.forEach((n,i)=>{
 a0.edges.push(edge(`C${i+1}`,rootBoundary.C[i],[[n.x+195,65],[n.x+195,n.y]],n.x+105,96));
 const mechanismX=n.x+(i===0?205:110);
 a0.edges.push(edge(`M${i+1}`,rootBoundary.M[i],[[mechanismX,945],[mechanismX,n.y+n.h]],i===0?310:mechanismX,870));
 if(i<4){const next=a0Nodes[i+1],labels=['selected','version','checked','Данные ревизии'];a0.edges.push(edge(`F${i+1}`,labels[i],[[n.x+n.w,n.y+43],[n.x+n.w+25,n.y+43],[n.x+n.w+25,next.y+43],[next.x,next.y+43]],n.x+n.w+43,n.y+80));}
});
a0.edges.push(edge('C1_branch','order',[[330,155],[635,155],[635,302]],null,null,[]));
a0.edges.push(edge('I1','request',[[5,223],[135,223]],70,153,['Запрос на','карточку']));
a0.edges.push({...edge('I2','catalog',[[5,320],[420,320]],20,274,['Ассортимент и предложения','поставщиков']),anchor:'start'});
a0.edges.push(edge('A2_C3','feedback',[[925,440],[975,440],[975,247],[590,247],[590,302]],790,199,['Замечания по','совместимости']));
a0.edges.push(edge('O1','checked',[[925,485],[1000,485],[1000,475],[1795,475]],1580,454));
a0.edges.push(edge('O2','content',[[1210,575],[1265,575],[1265,580],[1795,580]],1580,561));
a0.edges.push(edge('O3','published',[[1495,699],[1795,699]],1640,655));
a0.edges.push(edge('O4','outcome',[[1495,734],[1795,734]],1640,771));
a0.junctions=[[330,155]];

const a2={node:'A2',title:'Сформировать BOM и сопоставить товары поставщиков',width:1800,height:1000,boundary:a2Boundary,nodes:a2Nodes,edges:[],junctions:[]};
a2.edges.push(edge('C1','order',[[315,65],[315,180]],270,96));
a2.edges.push(edge('C2','bomRules',[[615,65],[615,155],[1470,155],[1470,668]],980,98));
for(const [i,x] of [[1,615],[2,900],[3,1185]]){
 a2.edges.push(edge(`C2_${i}`,'bomRules',[[x,155],[x,a2Nodes[i].y]],null,null,[]));
 a2.junctions.push([x,155]);
}
a2.edges.push(edge('C3','feedback',[[1700,65],[1700,205],[580,205],[580,302]],1660,96));
a2.edges.push(edge('I1','selected',[[5,223],[135,223]],70,151,['Запрос и','выбранный','корпус']));
a2.edges.push({...edge('I2','catalog',[[5,320],[420,320]],60,273,['Ассортимент и предложения','поставщиков']),anchor:'start'});
a2.edges.push(edge('I2_corpus','catalog',[[35,320],[35,247],[135,247]],null,null,[]));
a2.edges.push(edge('I2_matching','catalog',[[35,320],[35,406],[680,406],[680,446],[705,446]],null,null,[]));
a2.edges.push(edge('I2_offer','catalog',[[35,406],[35,540],[970,540],[970,570],[990,570]],null,null,[]));
a2.junctions.push([35,320],[35,406]);
const internal=[['Основа BOM'],['Состав BOM'],['Сопоставленные','товары'],['Выбранные','предложения']];
a2Nodes.forEach((n,i)=>{
 if(i<4){const next=a2Nodes[i+1];a2.edges.push(edge(`F${i+1}`,internal[i].join(' '),[[n.x+n.w,n.y+43],[n.x+n.w+25,n.y+43],[n.x+n.w+25,next.y+43],[next.x,next.y+43]],n.x+n.w+43,n.y+80,internal[i]));}
});
a2.edges.push(edge('M1','bomMechanism',[[815,945],[815,845],[340,845],[340,265]],850,910,['Технический специалист · PC4Games / ITPartner · ИС']));
for(const n of a2Nodes.slice(1)){
 const x=n.x+100;a2.edges.push(edge(`M1_${n.id}`,'bomMechanism',[[x,845],[x,n.y+n.h]],null,null,[]));
 if(x>815)a2.edges.push(edge(`M1_bus_${n.id}`,'bomMechanism',[[815,845],[x,845]],null,null,[]));
 a2.junctions.push([x,845]);
}
a2.junctions.push([815,845]);
a2.edges.push(edge('O1','version',[[1495,710],[1795,710]],1630,661));

function side(n,p){
 if(p[1]>=n.y&&p[1]<=n.y+n.h){if(p[0]===n.x)return'I';if(p[0]===n.x+n.w)return'O';}
 if(p[0]>=n.x&&p[0]<=n.x+n.w){if(p[1]===n.y)return'C';if(p[1]===n.y+n.h)return'M';}
 return null;
}
function boundaryFromRoutes(sheet){
 const result={I:[],C:[],M:[],O:[]};
 for(const e of sheet.edges){const p=e.points[0],q=e.points.at(-1);
  const role=p[0]===5?'I':p[1]===65?'C':p[1]===sheet.height-55?'M':q[0]===sheet.width-5?'O':null;
  if(role)result[role].push(e.label);
 }
 return result;
}
function assertInterface(left,right,name){
 for(const role of ['I','C','M','O']){
  const a=[...new Set(left[role])].sort(),b=[...new Set(right[role])].sort();
  if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${name} ${role}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
 }
}
const parentA2={I:[],C:[],M:[],O:[]},parent=a0Nodes.find(n=>n.id==='A2');
for(const e of a0.edges){
 const incoming=side(parent,e.points.at(-1)),outgoing=side(parent,e.points[0]);
 if(incoming&&incoming!=='O')parentA2[incoming].push(e.label);
 if(outgoing==='O')parentA2.O.push(e.label);
}
for(const sheet of [context,a0,a2]){
 assertInterface(boundaryFromRoutes(sheet),sheet.boundary,sheet.node);
 for(const n of sheet.nodes)for(const role of ['C','M']){
  if(!sheet.edges.some(e=>side(n,e.points.at(-1))===role))throw new Error(`${n.id}: missing ${role}`);
 }
}
assertInterface(boundaryFromRoutes(context),boundaryFromRoutes(a0),'A-0→A0');
assertInterface(parentA2,boundaryFromRoutes(a2),'A0/A2→A2');

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const measured=new Map();
for(const line of new Set([context,a0,a2].flatMap(s=>s.edges.flatMap(e=>e.lines)))){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="80"><rect width="100%" height="100%" fill="white"/><text x="20" y="40" font-family="Times New Roman" font-size="21">${esc(line)}</text></svg>`;
 const {info}=await sharp(Buffer.from(svg)).trim().png().toBuffer({resolveWithObject:true});
 measured.set(line,info.width);
}
function render(sheet){
 const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.width}" height="${sheet.height}" viewBox="0 0 ${sheet.width} ${sheet.height}">`,`<rect width="100%" height="100%" fill="white"/>`,`<rect x="5" y="5" width="1790" height="${sheet.height-10}" fill="white" stroke="#202020" stroke-width="2"/>`];
 const text=(x,y,lines,size=22,bold=false,anchor='middle',step=25)=>lines.forEach((line,i)=>svg.push(`<text x="${x}" y="${y+i*step}" font-family="Times New Roman" font-size="${size}" font-weight="${bold?'bold':'normal'}" text-anchor="${anchor}">${esc(line)}</text>`));
 svg.push(`<path d="M5 64 H1795 M5 ${sheet.height-55} H1795" stroke="#202020" stroke-width="2"/>`);
 text(670,32,['ППОИС · Практическая работа № 2 · ООО «Юкомс»'],21,true);
 text(1620,32,['Албахтин И.В. · 2026'],20);
 text(90,sheet.height-20,[`Узел ${sheet.node}`],21,true);text(980,sheet.height-20,[sheet.title],21);
 for(const e of sheet.edges){
  const colour=e.id.startsWith('C')||e.label==='feedback'?'#80500a':e.id.startsWith('M')?'#586777':'#244963';
  const points=e.points.map(p=>p.join(',')).join(' ');
  svg.push(`<polyline points="${points}" fill="none" stroke="white" stroke-width="6"/><polyline points="${points}" fill="none" stroke="${colour}" stroke-width="2.2"/>`);
  const p=e.points.at(-1),q=e.points.at(-2),dx=p[0]-q[0],dy=p[1]-q[1],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
  // Only actual function/output destinations have an arrowhead; bus extensions do not.
  const bus=e.id.startsWith('M1_bus');
  if(!bus)svg.push(`<polygon points="${p[0]},${p[1]} ${p[0]-10*ux+4*uy},${p[1]-10*uy-4*ux} ${p[0]-10*ux-4*uy},${p[1]-10*uy+4*ux}" fill="${colour}"/>`);
 }
 for(const n of sheet.nodes){
  svg.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="#eff5fa" stroke="#244963" stroke-width="2.4"/>`);
  text(n.x+n.w/2,n.y+n.h/2-((n.label.length-1)*22)/2+2,n.label,20,true,'middle',22);
  text(n.x+n.w-20,n.y+n.h-7,[n.id.slice(sheet.node==='A2'?2:1)],14,true);
 }
 for(const e of sheet.edges){
  if(e.x===null||!e.lines.length)continue;
  const max=Math.max(...e.lines.map(s=>measured.get(s))),anchor=e.anchor??(e.id.startsWith('F')?'start':'middle');
  svg.push(`<rect x="${anchor==='start'?e.x-5:e.x-max/2-5}" y="${e.y-21}" width="${max+10}" height="${e.lines.length*25}" fill="white"/>`);
  text(e.x,e.y,e.lines,21,false,anchor);
 }
 for(const p of sheet.junctions??[]){
  const colour=p[1]===845?'#586777':p[1]===155?'#80500a':'#244963';
  svg.push(`<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${colour}"/>`);
 }
 for(const e of sheet.edges.filter(e=>/^[ICMO]\d$/.test(e.id))){
  const p=e.id.startsWith('O')?e.points.at(-1):e.points[0];
  text(e.id.startsWith('I')?18:e.id.startsWith('O')?1780:p[0]+14,e.id.startsWith('C')?81:e.id.startsWith('M')?sheet.height-63:p[1]-8,[e.id],13,true);
 }
 svg.push('</svg>');return svg.join('\n');
}
for(const sheet of [context,a0,a2]){
 const name=`ПР2_IDEF0_${sheet.node}`;const svg=render(sheet);
 await fs.writeFile(path.join(output,name+'.svg'),svg,'utf8');
 await sharp(Buffer.from(svg)).resize({width:3600}).png().toFile(path.join(output,name+'.png'));
}
await fs.writeFile(path.join(output,'ПР2_IDEF0_Интерфейсы.json'),JSON.stringify({labels:L,sheets:[context,a0,a2],parentA2},null,2),'utf8');
console.log(JSON.stringify({output,balanced:['A-0→A0','A0/A2→A2'],sheets:3}));
