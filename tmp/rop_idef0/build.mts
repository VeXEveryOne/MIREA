import fs from 'node:fs/promises';
import { idef0DocumentFromSource } from 'file:///D:/OmniNotation/src/notations/idef0/document.ts';
import { validateIdef0Complete } from 'file:///D:/OmniNotation/src/notations/idef0/model.ts';
import { encodeProject } from 'file:///D:/OmniNotation/src/persistence/project.ts';
import { arrowAnchor } from 'file:///D:/OmniNotation/src/notations/idef0/arrows.ts';
const out='D:/GitHub/MIREA/4/РОП/IDEF0';
await fs.mkdir(out,{recursive:true});
const title='Формировать и актуализировать карточки компьютерных систем';
const lines=[`idef0 rop_cards "Карточки компьютерных систем ООО Юкомс AS IS"`];
const put=(s:string)=>lines.push(s);
const q=(s:string)=>JSON.stringify(s);
const sheet=(id:string,node:string,parent='')=>put(`diagram ${id} ${q(title)} ${parent?`in=${parent} `:''}node=${node} purpose="Описать текущую подготовку карточек и выявить ручные операции" viewpoint="Менеджер маркетплейсов" author="Албахтин И.В." date="13.09.2026" project="РОП Практика 1 — ООО Юкомс" status=draft context=${node==='A-0'?'TOP':'A-0'} pageNumber=${node==='A-0'?'1':'2'}`);
sheet('context','A-0'); put(`function root ${q(title)} in=context number=0`);
type Spec={id:string,label:string,role:string,side:string,target:string};
const specs:Spec[]=[
 {id:'request',label:'Запрос на создание или изменение карточки',role:'input',side:'left',target:'A1'},
 {id:'data',label:'Ассортимент, характеристики и предложения поставщиков',role:'input',side:'left',target:'A2'},
 {id:'regulation',label:'Порядок создания и актуализации карточек',role:'control',side:'top',target:'A1'},
 {id:'selection',label:'Правила выбора и замены комплектующих',role:'control',side:'top',target:'A2'},
 {id:'compatibility',label:'Правила совместимости',role:'control',side:'top',target:'A3'},
 {id:'calculation',label:'Правила цены, веса и изображений',role:'control',side:'top',target:'A4'},
 {id:'ozon_rules',label:'Требования Ozon к карточке',role:'control',side:'top',target:'A5'},
 {id:'bom',label:'Согласованная BOM',role:'output',side:'right',target:'A3'},
 {id:'values',label:'Цена, вес и изображения',role:'output',side:'right',target:'A4'},
 {id:'card',label:'Опубликованная или обновлённая карточка',role:'output',side:'right',target:'A5'},
 {id:'error',label:'Сведения об ошибке публикации',role:'output',side:'right',target:'A5'},
 {id:'manager',label:'Менеджер маркетплейсов',role:'mechanism',side:'bottom',target:'A1'},
 {id:'supply',label:'Менеджер, склад и поставщики',role:'mechanism',side:'bottom',target:'A2'},
 {id:'engineer',label:'Технический специалист',role:'mechanism',side:'bottom',target:'A3'},
 {id:'design',label:'Менеджер и дизайнер',role:'mechanism',side:'bottom',target:'A4'},
 {id:'publisher',label:'Менеджер и кабинет Ozon Seller',role:'mechanism',side:'bottom',target:'A5'},
];
function boundary(s:Spec,prefix:string,sh:string,parent=false){
 put(`boundary ${prefix}${s.id} ${q(s.label)} in=${sh} side=${s.side} direction=${s.role==='output'?'out':'in'}${parent?` parentArrow=c_${s.id} parentEnd=${s.role==='output'?'from':'to'}`:''}`);
 const fn=parent?s.target:'root';
 put(`arrow ${parent?'d_':'c_'}${s.id} ${q(s.label)} from=${s.role==='output'?fn:prefix+s.id} to=${s.role==='output'?prefix+s.id:fn} role=${s.role}`);
}
specs.forEach(s=>boundary(s,'ctx_','context'));
sheet('decomposition','A0','root');
['Инициировать создание или изменение карточки','Сформировать BOM и сопоставить товары поставщиков','Проверить совместимость комплектующих','Рассчитать цену и вес, подготовить изображения','Заполнить, проверить и опубликовать карточку в Ozon'].forEach((s,i)=>put(`function A${i+1} ${q(s)} in=decomposition number=${i+1}`));
specs.forEach(s=>boundary(s,'dec_','decomposition',true));
['Запрос и выбранный корпус','Проект конфигурации','Согласованная BOM','Данные карточки'].forEach((s,i)=>put(`arrow step${i+1}${i+2} ${q(s)} from=A${i+1} to=A${i+2} role=input`));
put('arrow correction "Замечания по совместимости" from=A3 to=A2 role=control');
const doc=idef0DocumentFromSource(lines.join('\n')+'\n');
const pos=doc.layout.positions;
doc.layout.frames={context:{x:0,y:0,width:1200,height:720},decomposition:{x:0,y:0,width:1800,height:920}};
pos.root={x:490,y:280};
for(let i=1;i<=5;i++)pos[`A${i}`]={x:170+(i-1)*280,y:150+(i-1)*120};
for(const side of ['left','top','right','bottom']){
 const group=specs.filter(s=>s.side===side);
 group.forEach((s,i)=>{
  pos['ctx_'+s.id]=side==='left'?{x:0,y:300+i*90}:side==='right'?{x:1200,y:230+i*105}:{x:150+i*225,y:side==='top'?0:720};
  const p=pos[s.target];
  pos['dec_'+s.id]=side==='left'?{x:0,y:s.id==='request'?210:310}:side==='right'?{x:1800,y:({bom:440,values:560,card:675,error:720} as any)[s.id]}:{x:p.x+110,y:side==='top'?0:920};
 });
}
// Distribute ports and store every route/label in the editable v4 container.
for(const e of doc.model.edges) doc.layout.arrows[e.id]={fromOffset:.5,toOffset:.5};
for(const [id,offset] of [['c_bom',.2],['c_values',.4],['c_card',.6],['c_error',.8]] as const)doc.layout.arrows[id].fromOffset=offset;
for(const [role,ids] of [['control',specs.filter(s=>s.role==='control')],['mechanism',specs.filter(s=>s.role==='mechanism')],['input',specs.filter(s=>s.role==='input')]] as const)ids.forEach((s,i)=>doc.layout.arrows['c_'+s.id].toOffset=(i+1)/(ids.length+1));
doc.layout.arrows.d_data.toOffset=.35; doc.layout.arrows.step12.toOffset=.7;
doc.layout.arrows.correction.toOffset=.8;
for(const s of specs.filter(s=>s.role==='control' && s.target!=='A1')){
 doc.layout.arrows['d_'+s.id].toOffset=.1;
 pos['dec_'+s.id].x=pos[s.target].x+22;
}
doc.layout.arrows.d_bom.fromOffset=.35;doc.layout.arrows.step34.fromOffset=.7;doc.layout.arrows.correction.fromOffset=.15;
doc.layout.arrows.d_values.fromOffset=.35;doc.layout.arrows.step45.fromOffset=.7;
doc.layout.arrows.d_card.fromOffset=.375;doc.layout.arrows.d_error.fromOffset=.75;
function route(id:string,mid:{x:number,y:number}[],label:{x:number,y:number}){
 const a=arrowAnchor(doc,id,'from'),b=arrowAnchor(doc,id,'to');
 doc.layout.arrows[id].bends=[{x:a.point.x+a.normal.x*28,y:a.point.y+a.normal.y*28},...mid,{x:b.point.x+b.normal.x*28,y:b.point.y+b.normal.y*28}];
 doc.layout.arrows[id].label=label;
}
for(const s of specs){
 const id='c_'+s.id,a=arrowAnchor(doc,id,'from'),b=arrowAnchor(doc,id,'to');
 if(s.role==='control'){
  const k=specs.filter(s=>s.role==='control').indexOf(s), y=[190,150,110,150,190][k];
  route(id,[{x:a.point.x,y},{x:b.point.x,y}],{x:a.point.x,y:65});
 }
 else if(s.role==='mechanism'){
  const k=specs.filter(s=>s.role==='mechanism').indexOf(s), y=[490,540,590,540,490][k];
  route(id,[{x:a.point.x,y},{x:b.point.x,y}],{x:a.point.x,y:655});
 }
 else if(s.role==='input')route(id,[{x:370,y:a.point.y},{x:370,y:b.point.y}],{x:220,y:a.point.y-30});
 else {
  const x=({bom:780,values:820,card:900,error:860} as any)[s.id];
  route(id,[{x,y:a.point.y},{x,y:b.point.y}],{x:1030,y:b.point.y+6});
 }
 const did='d_'+s.id,da=arrowAnchor(doc,did,'from'),db=arrowAnchor(doc,did,'to');
 if(s.role==='control'||s.role==='mechanism')doc.layout.arrows[did].label={x:pos[s.target].x+110,y:s.role==='control'?85:835};
 else if(s.role==='input')doc.layout.arrows[did].label={x:s.id==='request'?115:165,y:s.id==='request'?145:360};
 else doc.layout.arrows[did].label={x:1655,y:db.point.y-12};
}
for(let i=1;i<5;i++){
 const id=`step${i}${i+1}`,a=arrowAnchor(doc,id,'from'),b=arrowAnchor(doc,id,'to');
 const x=(a.point.x+b.point.x)/2;
 route(id,[{x,y:a.point.y},{x,y:b.point.y}],{x:pos[`A${i+1}`].x+145,y:pos[`A${i+1}`].y-12});
}
route('correction',[{x:980,y:408},{x:980,y:220},{x:626,y:220}],{x:875,y:205});
doc.layout.arrows.d_error.label={x:1655,y:780};
const diagnostics=validateIdef0Complete(doc.model);
console.log(JSON.stringify(diagnostics,null,2));
if(diagnostics.some(d=>d.severity==='error'))throw Error('Model not ready');
await fs.writeFile(out+'/РОП_Практика_1_AS_IS.nsidef0',await encodeProject(doc));
await fs.writeFile(out+'/РОП_Практика_1_AS_IS.txt',doc.source);
await fs.writeFile('D:/GitHub/MIREA/tmp/rop_idef0/validation.json',JSON.stringify(diagnostics,null,2));
console.log(out);


