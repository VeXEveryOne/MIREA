// Current submission diagrams. SVG is the editable source; PNG is its exact raster export.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runtimeModule} from '../../../tools/runtime.mjs';
const {default:sharp}=await runtimeModule('sharp');
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.PPOIS_MODEL_OUTPUT??path.join(base,'Схемы');
const model=JSON.parse(await fs.readFile(path.join(base,'Исходники/submission_model.json'),'utf8'));
await fs.mkdir(out,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function lines(s,max=32){
  if(Array.isArray(s))return s.flatMap(x=>lines(x,max));
  const result=[];let line='';
  for(const word of String(s).split(/\s+/)){
    if(line&&(line+' '+word).length>max){result.push(line);line='';}
    if(word.length>max){if(line){result.push(line);line='';}for(let i=0;i<word.length;i+=max)result.push(word.slice(i,i+max));}
    else line+=(line?' ':'')+word;
  }
  if(line)result.push(line);return result;
}
class Scene{
  constructor(w,h){this.w=w;this.h=h;this.body=[];this.labels=[];}
  rect(x,y,w,h,rx=0,fill='white',stroke='#151515'){this.body.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);}
  text(x,y,s,size=27,anchor='middle',bold=false,max=45){const rows=lines(s,max);this.labels.push({x,y,rows,size});this.body.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" ${bold?'font-weight="bold"':''}>${rows.map((v,i)=>`<tspan x="${x}" dy="${i?size*1.22:0}">${esc(v)}</tspan>`).join('')}</text>`);return rows.length*size*1.22;}
  path(points,{arrow=false,dash=false,label='',at,composition=false}={}){const d=Array.isArray(points)?'M'+points.map(p=>p.join(',')).join(' L'):points;this.body.push(`<path d="${d}" fill="none" stroke="white" stroke-width="9"/><path d="${d}" fill="none" stroke="#151515" stroke-width="2.3" ${dash?'stroke-dasharray="9 6"':''} ${arrow?'marker-end="url(#arrow)"':''} ${composition?'marker-start="url(#diamond)"':''}/>`);if(label){const p=at??points[Math.floor(points.length/2)],ls=lines(label,55),w=Math.max(...ls.map(x=>x.length))*12+20;this.rect(p[0]-w/2,p[1]-34,w,ls.length*29,0,'white','white');this.text(p[0],p[1]-10,label,23,'middle',false,55);}}
  dot(x,y,final=false){if(final)this.body.push(`<circle cx="${x}" cy="${y}" r="18" fill="white" stroke="#111" stroke-width="2"/>`);this.body.push(`<circle cx="${x}" cy="${y}" r="${final?11:12}" fill="#111"/>`);}
  actor(x,y,label){this.body.push(`<circle cx="${x}" cy="${y-32}" r="16" fill="white" stroke="#111" stroke-width="2"/><path d="M${x} ${y-16} V${y+40} M${x-35} ${y+5} H${x+35} M${x} ${y+40} l-30 38 M${x} ${y+40} l30 38" fill="none" stroke="#111" stroke-width="2"/>`);this.text(x,y+115,label,25,'middle',true,19);}
  bce(x,y,label,kind){this.body.push(`<circle cx="${x}" cy="${y}" r="39" fill="white" stroke="#111" stroke-width="2.4"/>`);if(kind==='boundary')this.path([[x-65,y-45],[x-65,y+45]],{}),this.path([[x-65,y],[x-39,y]],{});if(kind==='entity')this.path([[x-45,y+44],[x+45,y+44]],{});if(kind==='control')this.body.push(`<path d="M${x+5} ${y-39} l-15 -13 M${x+5} ${y-39} l-17 7" fill="none" stroke="#111" stroke-width="2.4"/>`);this.text(x,y+85,label,27,'middle',false,23);}
  async save(name){
    const xml=`<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}"><defs><marker id="arrow" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto"><path d="M1 1 L10 5 L1 9" fill="none" stroke="#111" stroke-width="1.5"/></marker><marker id="diamond" markerWidth="20" markerHeight="12" refX="1" refY="6" orient="auto"><path d="M1 6 L9 1 L17 6 L9 11 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif" fill="#111">${this.body.join('')}</g></svg>`;
    await fs.writeFile(path.join(out,name+'.svg'),xml+'\n');
    const png=await sharp(Buffer.from(xml)).resize({width:Math.max(this.w*2,3000)}).png().toBuffer();
    await fs.writeFile(path.join(out,name+'.png'),png);
    emitted.push({name,width:this.w,height:this.h,labels:this.labels.length,sha256:createHash('sha256').update(await fs.readFile(path.join(out,name+'.png'))).digest('hex')});
  }
}
const emitted=[];
// Analysis is a BCE/robustness view, deliberately distinct from typed design classes.
{
 const s=new Scene(1580,880);s.actor(110,350,'Разработчик');s.bce(410,350,'Форма состава','boundary');s.bce(760,350,'Управление составом','control');s.path([[145,355],[344,355]]);s.path([[450,350],[720,350]]);
 const names=model.analysis[0].entities;names.forEach((name,i)=>{const y=90+i*150;s.path([[800,350],[920+i*26,350],[920+i*26,y],[1191,y]]);s.bce(1230,y,name,'entity');});
 s.text(790,850,'Граничный класс — интерфейс; управляющий — сценарий; сущность — предметные данные',24,'middle',false,100);await s.save('ПР3_Анализ_состава');
}
{
 const s=new Scene(2180,1090);model.analysis[1].rows.forEach(([actor,boundary,control,entity],i)=>{const y=110+i*250;s.actor(120,y,actor);s.path([[155,y+5],[355,y+5]]);s.bce(420,y,boundary,'boundary');s.path([[460,y],[790,y]]);s.bce(830,y,control,'control');s.path([[870,y],[1250,y]]);s.bce(1290,y,entity,'entity');});
 s.path([[870,860],[970,860],[970,780],[1660,780],[1660,821]]);s.bce(1660,860,'Шлюз площадки','boundary');s.path([[1699,860],[1955,860]]);s.actor(1990,860,'Ozon');
 s.path([[1329,110],[1520,110],[1520,610],[1329,610]],{label:'имеет ревизии',at:[1490,360]});await s.save('ПР3_Анализ_карточки');
}
{
 const s=new Scene(2070,1140);s.rect(260,25,1480,1090);s.text(1000,65,'ИС подготовки карточек ООО «Юкомс»',28,'middle',true);let uc=0;
 model.roles.forEach((r,i)=>{const y=195+i*230;s.actor(120,y,r.name);r.tasks.forEach((t,j)=>{uc++;const x=445+j*355;s.path([[155,y+5],[225,y+5],[225,y-110],[x,y-110],[x,y-70]]);s.body.push(`<ellipse cx="${x}" cy="${y}" rx="145" ry="70" fill="white" stroke="#111" stroke-width="2"/>`);s.text(x,y-15,`UC${String(uc).padStart(2,'0')} — ${t}`,23,'middle',false,21);});});s.actor(1900,195,'Ozon');s.path([[1655,195],[1865,195]]);await s.save('ПР3_Варианты_ролей');
}
for(const seq of model.sequences){
 const s=new Scene(1600,960);const xs=[150,570,990,1410];seq.participants.forEach((p,i)=>{s.rect(xs[i]-140,20,280,100);s.text(xs[i],55,p,25,'middle',false,22);s.path([[xs[i],120],[xs[i],915]],{dash:true});});
 seq.messages.forEach(([a,b,label,reply],i)=>{const y=190+i*78;if(a===b)s.path([[xs[a],y],[xs[a]+130,y],[xs[a]+130,y+38],[xs[a],y+38]],{arrow:true,label:(i+1)+'. '+label,at:[xs[a]+90,y-3]});else s.path([[xs[a],y],[xs[b],y]],{arrow:true,dash:reply,label:(i+1)+'. '+label,at:[(xs[a]+xs[b])/2,y-3]});});await s.save('ПР3_Последовательность_'+seq.id);
}
{
 const s=new Scene(1630,970);const seq=model.sequences[1],pts=[[200,160],[1250,160],[1250,740],[200,740]];pts.forEach(([x,y],i)=>{s.rect(x-170,y-65,340,130);s.text(x,y-12,seq.participants[i],27,'middle',false,23);});
 s.path([[370,140],[1080,140]],{arrow:true,label:'1. Выбрать ревизию',at:[725,115]});s.path([[1080,190],[370,190]],{arrow:true,dash:true,label:'9. Показать результат',at:[725,255]});
 s.path([[1190,225],[1190,675]],{arrow:true,label:'2. Запросить проверку',at:[1100,440]});s.path([[1310,675],[1310,225]],{arrow:true,dash:true,label:'8. Результат',at:[1410,530]});
 s.path([[1080,720],[370,720]],{arrow:true,label:'3. Получить данные; 6. Установить READY',at:[725,680]});s.path([[370,770],[1080,770]],{arrow:true,dash:true,label:'4, 7. Данные и состояние',at:[725,850]});
 s.path([[1420,705],[1530,705],[1530,795],[1420,795]],{arrow:true,label:'5. Проверка',at:[1470,895]});await s.save('ПР3_Кооперация_утверждения');
}
function classBox(s,c,x,y,w,h){s.rect(x,y,w,h);s.text(x+w/2,y+32,c.id,26,'middle',true,36);s.text(x+w/2,y+62,c.name,22,'middle',false,40);s.path([[x,y+83],[x+w,y+83]]);let yy=y+115;for(const a of c.attributes)yy+=s.text(x+15,yy,a,23,'start',false,Math.floor((w-30)/12))+5;s.path([[x,yy-8],[x+w,yy-8]]);yy+=20;for(const a of c.operations)yy+=s.text(x+15,yy,a,23,'start',false,Math.floor((w-30)/12))+5;if(yy>y+h+3)throw Error('Class box too short: '+c.id);}
const classGroups=[
 ['Состав',model.classes.filter(c=>['Configuration','ModelRangeVersion','ModelRangeSlot'].includes(c.id)),[[25,100,490,420],[620,100,520,570],[1245,100,540,620]],1840,920],
 ['Каталог',['ComponentGroup','Component','Supplier','Offer'].map(id=>model.classes.find(c=>c.id===id)),[[25,70,560,330],[760,70,560,500],[25,650,560,330],[760,650,560,400]],1380,1100],
 ['Карточки',model.classes.filter(c=>c.group==='card'),[[25,70,490,300],[620,70,620,690],[1345,70,540,370],[1345,600,540,350],[25,490,490,280]],1940,1030],
 ['Сервисы',model.classes.filter(c=>c.group==='service'),[[25,70,660,350],[860,70,660,400],[25,600,660,370],[860,600,660,370]],1580,1030]
];
for(const [name,cs,positions,w,h] of classGroups){const s=new Scene(w,h),boxes={},multiplicities=[];cs.forEach((c,i)=>{if(!positions[i])throw Error('No class slot '+c.id);const [x,y,cw,ch]=positions[i];boxes[c.id]={x,y,w:cw,h:ch};});let route=0;
 for(const [from,to,a,b,kind] of model.class_relations){const p=boxes[from],q=boxes[to];if(!p||!q)continue;route++;let pts;if(p.x<q.x)pts=[[p.x+p.w,p.y+100],[q.x-45,p.y+100],[q.x-45,q.y+100],[q.x,q.y+100]];else if(p.x>q.x)pts=[[p.x,p.y+140],[q.x+q.w+45,p.y+140],[q.x+q.w+45,q.y+140],[q.x+q.w,q.y+140]];else pts=[[p.x+p.w/2,p.y+p.h],[p.x+p.w/2,q.y]];
 if(name==='Карточки'){
   if(from==='Card'&&to==='CardRevision')pts=[[515,170],[620,170]];
   if(from==='CardRevision'&&to==='RevisionImage')pts=[[620,640],[515,640]];
   if(from==='CardRevision'&&to==='PublicationAttempt')pts=[[1240,700],[1345,700]];
   if(from==='RevisionImage'&&to==='Image')pts=[[270,770],[270,995],[1915,995],[1915,370],[1885,370]];
 }
 s.path(pts,{arrow:kind==='dependency',dash:kind==='dependency',composition:kind==='composition'});
 const p0=pts[0],p1=pts[1],qn=pts.at(-1),qp=pts.at(-2);
 if(a)multiplicities.push([p0[0]+(p0[0]===p1[0]?30:Math.sign(p1[0]-p0[0])*27),p0[1]+(p0[0]===p1[0]?25:-15),a]);
 if(b)multiplicities.push([qn[0]+(qn[0]===qp[0]?30:-Math.sign(qn[0]-qp[0])*32),qn[1]+(qn[0]===qp[0]?-20:-15),b]);}
 cs.forEach((c,i)=>classBox(s,c,...positions[i]));multiplicities.forEach(v=>s.text(...v,24));
 if(name==='Состав')for(const [i,ref] of ['ComponentGroup','Component','Offer'].entries()){
   const y=595+i*77;s.rect(40,y,490,58);s.text(285,y+37,'«catalog» '+ref,25,'middle',true,35);
   s.path([[1320+i*155,720],[1320+i*155,845+i*20],[565+i*10,845+i*20],[565+i*10,y+29],[530,y+29]]);
   s.text(1320+i*155,750,'0..*',23);s.text(550,y+16,'0..1',23);
 }
 if(name==='Карточки'){s.rect(25,405,490,60);s.text(270,444,'«range» ModelRangeVersion',25,'middle',true,40);s.path([[515,435],[620,435]]);s.text(535,420,'1',23);s.text(590,420,'0..*',23);}
 await s.save('ПР4_Классы_'+name);}
{
 const s=new Scene(1740,1110);const laneX=[230,650,1070,1490];model.roles.forEach((r,i)=>{s.rect(20+i*420,15,420,1050);s.rect(20+i*420,15,420,90,0,'#f3f3f3');s.text(laneX[i],52,r.name,28,'middle',true,22);});
 const action=(role,y,label)=>{const x=laneX[model.roles.findIndex(r=>r.id===role)];s.rect(x-165,y-30,330,75,16);s.text(x,y,label,25,'middle',false,23);return[x,y];};
 s.dot(230,135);s.path([[230,148],[230,180]],{arrow:true});action('manager',210,'Зарегистрировать задание');s.path([[230,255],[230,285],[1070,285],[1070,310]],{arrow:true});action('developer',340,'Подобрать и проверить состав');
 s.path([[1070,385],[1070,420]]);s.rect(220,420,1280,10,0,'#111');s.path([[230,430],[230,470]],{arrow:true});s.path([[1490,430],[1490,470]],{arrow:true});action('manager',500,'Рассчитать цену и массу');action('designer',500,'Подготовить изображения');s.path([[230,545],[230,590]]);s.path([[1490,545],[1490,590]]);s.rect(220,590,1280,10,0,'#111');s.path([[230,600],[230,640]],{arrow:true});action('manager',670,'Собрать ревизию карточки');s.path([[395,670],[650,670],[650,750]],{arrow:true});action('director',780,'Проверить и утвердить');s.path([[650,825],[650,850]],{arrow:true});s.body.push('<path d="M650 850 L700 890 L650 930 L600 890 Z" fill="white" stroke="#111" stroke-width="2"/>');s.path([[600,890],[435,890],[435,710],[395,710]],{arrow:true,label:'[есть замечания]',at:[440,865]});s.path([[650,930],[650,960],[395,960]],{arrow:true,label:'[готова]',at:[530,950]});action('manager',960,'Передать на публикацию');s.path([[230,1005],[230,1030]],{arrow:true});s.dot(230,1050,true);await s.save('ПР4_Деятельность_роли');
}
{
 const s=new Scene(1690,1110);const positions=[[45,110],[925,110],[925,660],[45,660]];model.states.forEach((st,i)=>{const[x,y]=positions[i];s.rect(x,y,710,290,20);s.text(x+355,y+42,st.label+(st.database?' / '+st.database:''),30,'middle',true,45);s.path([[x,y+65],[x+710,y+65]]);st.actions.forEach((a,j)=>s.text(x+22,y+110+j*52,a,26,'start',false,49));});
 s.dot(75,45);s.path([[75,58],[75,110]],{arrow:true});s.path([[400,110],[400,65],[1280,65],[1280,110]],{arrow:true,label:'запросить утверждение',at:[840,50]});s.path([[925,345],[835,345],[835,485],[410,485],[410,400]],{arrow:true,label:'[есть ошибки] / показать замечания',at:[540,475]});s.path([[1280,400],[1280,660]],{arrow:true,label:'[проверки пройдены] / утвердить',at:[1270,535]});s.path([[925,790],[755,790]],{arrow:true,label:['изменён','состав'],at:[840,805]});s.text(850,1040,'Объект — ревизия карточки. Новая ревизия начинает собственный цикл с DRAFT.',25,'middle',false,110);await s.save('ПР4_Состояния_ревизии');
}
// Dialog models show user tasks and navigation, with no internal HTTP traffic.
const dialogResults={manager:['Код и содержание → черновик','Состав и параметры → цена и масса','Проверенная версия → новая ревизия','Готовая ревизия → отправка и результат'],director:['Фильтр → сводка карточек','Карточка → состав и цена','Проверка → READY или замечания'],developer:['Фильтр → каталог предложений','Позиции → состав конфигурации','Проверка → ошибки или успех','Версия → сохранение или конфликт'],designer:['Карточка → задание и контент','Выбор → просмотр изображения','Номер → сохранённый порядок','Ревизия → просмотр карточки']};
for(const r of model.roles){
 const h=350+r.tasks.length*185,s=new Scene(1320,h);s.rect(410,20,500,85,16);s.text(660,55,'Вход — '+r.name,29,'middle',true,30);s.path([[660,105],[660,160]],{arrow:true});s.rect(410,160,500,75,16);s.text(660,207,'Меню роли',29,'middle',true);s.path([[410,200],[30,200],[30,340+(r.tasks.length-1)*185]]);
 r.tasks.forEach((task,i)=>{const y=285+i*185;s.path([[30,y+55],[60,y+55]],{arrow:true});s.rect(60,y,510,115,14);s.text(315,y+42,task,29,'middle',false,29);s.path([[570,y+55],[750,y+55]],{arrow:true});s.rect(750,y,510,115,14);s.text(1005,y+38,dialogResults[r.id][i],27,'middle',false,31);s.path([[1260,y+55],[1290,y+55],[1290,200],[910,200]],{arrow:true});});
 s.text(660,h-53,'Ошибки ввода возвращают к той же задаче; отмена — в меню.',26,'middle',false,80);s.text(660,h-18,'Выход завершает сеанс.',26);await s.save('ПР10_Диалог_'+r.id);
}
{
 const s=new Scene(1780,1130);
 const box=(x,y,w,h,label,max=29)=>{s.rect(x,y,w,h,12);s.text(x+w/2,y+38,label,29,'middle',true,max);};
 box(670,20,440,90,'Функции ИС');box(60,190,1190,90,'Основные функции');box(1310,190,410,90,'Служебные функции');
 s.path([[890,110],[890,150],[655,150],[655,190]]);s.path([[890,150],[1515,150],[1515,190]]);
 s.path([[655,280],[655,310],[30,310],[30,930]]);
 model.roles.forEach((r,i)=>{const y=340+i*180;s.path([[30,y+50],[60,y+50]]);box(60,y,400,100,r.name,18);s.rect(510,y,740,150);s.text(535,y+36,r.tasks.join('; '),26,'start',false,47);s.path([[460,y+50],[510,y+50]]);});
 s.rect(1310,340,410,420);s.text(1335,390,['Вход и выход','Проверка прав','Проверка ввода','Сообщения об ошибках','Справка','Диагностика'],28,'start',false,26);s.path([[1515,280],[1515,340]]);await s.save('ПР10_Дерево_функций');}
{
 const s=new Scene(1540,820);const boxes=[[30,70,420,210,'Представления четырёх ролей'],[560,70,420,210,'Сценарии клиента'],[1090,70,420,210,'Сервер приложения'],[1090,490,420,210,'PostgreSQL'],[560,490,420,210,'Файлы изображений'],[30,490,420,210,'Шлюз внешней площадки']];boxes.forEach(([x,y,w,h,l])=>{s.rect(x,y,w,h);s.text(x+w/2,y+65,l,30,'middle',true,26);});s.path([[450,175],[560,175]],{arrow:true});s.path([[980,175],[1090,175]],{arrow:true});s.path([[1300,280],[1300,490]],{arrow:true,label:'запросы и транзакции',at:[1300,400]});s.path([[1170,280],[1170,375],[770,375],[770,490]],{arrow:true});s.path([[1090,230],[1040,230],[1040,430],[240,430],[240,490]],{arrow:true});s.text(770,775,'Связи отражают обмен данными между модулями системы.',25);await s.save('ПР10_Структурная_схема');}
// Component view matches the current design classes. The requested deployment figure is retained.
{
 const s=new Scene(1780,1030),nodes={client:[690,25,420,160],service:[690,300,420,180],domain:[30,300,430,220],catalog:[30,690,430,220],content:[690,690,430,220],gateway:[1310,300,430,220],data:[1310,690,430,220]};
 for(const [from,to,pts] of [['client','service',[[900,185],[900,300]]],['service','domain',[[690,390],[460,390]]],['domain','catalog',[[245,520],[245,690]]],['service','content',[[900,480],[900,690]]],['service','gateway',[[1110,390],[1310,390]]],['catalog','data',[[245,910],[245,970],[1525,970],[1525,910]]],['content','data',[[1120,800],[1310,800]]]])s.path(pts,{arrow:true,dash:true});
 const titles={client:['Клиент','Формы четырёх ролей'],service:['Прикладной сервис','ModelRangeService, CardService'],domain:['Состав и расчёты','Configuration, ModelRangeVersion,','ModelRangeSlot, CalculationService'],catalog:['Каталог и предложения','ComponentGroup, Component,','Supplier, Offer'],content:['Карточки и контент','Card, CardRevision, Image,','RevisionImage, PublicationAttempt'],gateway:['Шлюз площадки','MarketplaceGateway'],data:['Доступ к данным','Репозитории, SQL, транзакции']};
 for(const [id,[x,y,w,h]]of Object.entries(nodes)){s.rect(x,y,w,h);s.rect(x+w-45,y+13,27,38);s.rect(x+w-51,y+18,12,9);s.rect(x+w-51,y+36,12,9);s.text(x+w/2,y+58,titles[id][0],28,'middle',true,27);s.text(x+20,y+110,titles[id].slice(1),23,'start',false,34);}await s.save('ПР5_Компоненты');
}
// A single complete sheet for each relational level, sourced from the actual SQL catalog.
const db=JSON.parse(await fs.readFile(path.join(base,'База_данных/Результаты_проверки.json'),'utf8'));
const columns=t=>db.columns.filter(c=>c.table_name===t).sort((a,b)=>a.ordinal_position-b.ordinal_position);
const keys=db.key_catalog, fks=keys.filter(k=>k.contype==='f');
const colSets=[['component_group','component','supplier','offer','image','publication_attempt'],['configuration','model_range_version','model_range_slot','card','card_revision','revision_image']];
const type=c=>c.udt_name==='varchar'?`varchar(${c.character_maximum_length})`:c.udt_name==='bpchar'?`char(${c.character_maximum_length})`:c.udt_name==='numeric'?`numeric(${c.numeric_precision},${c.numeric_scale})`:({int4:'integer',bool:'boolean',timestamptz:'timestamptz'}[c.udt_name]??c.udt_name);
const erPositions={};
for(let side=0;side<2;side++){let y=45;for(const table of colSets[side]){const h=55+columns(table).length*29;erPositions[table]={x:side?705:55,y,w:side?535:510,h,side};y+=h+38;}}
for(const physical of [false,true]){
 const h=Math.max(...Object.values(erPositions).map(p=>p.y+p.h))+90,s=new Scene(1320,h);
 // All links lie in the central gutter or outside table boxes.
 fks.forEach((fk,i)=>{const p=erPositions[fk.parent_table],q=erPositions[fk.table_name],same=p.side===q.side;
   const ps=same?(p.side?1:-1):(p.side?-1:1),qs=same?ps:-ps;
   const px=p.x+(ps>0?p.w:0),qx=q.x+(qs>0?q.w:0),py=p.y+70, qy=q.y+70+columns(fk.table_name).findIndex(c=>c.column_name===fk.columns[0])*29;
   const bus=same?(p.side?1290-i%3*4:10+i%3*4):610+i*4;
   s.path([[px,py],[bus,py],[bus,qy],[qx,qy]]);
   s.path([[px+ps*13,py-9],[px+ps*13,py+9]]);
   if(fk.columns.some(name=>columns(fk.table_name).find(c=>c.column_name===name).is_nullable==='YES'))s.body.push(`<circle cx="${px+ps*28}" cy="${py}" r="7" fill="white" stroke="#111" stroke-width="2"/>`);
   s.path([[qx+qs*18,qy],[qx,qy-9]]);s.path([[qx+qs*18,qy],[qx,qy+9]]);
   s.body.push(`<circle cx="${qx+qs*31}" cy="${qy}" r="7" fill="white" stroke="#111" stroke-width="2"/>`);
 });
 for(const [t,p] of Object.entries(erPositions)){
   s.rect(p.x,p.y,p.w,p.h);s.text(p.x+p.w/2,p.y+32,t,25,'middle',true,43);s.path([[p.x,p.y+48],[p.x+p.w,p.y+48]]);
   columns(t).forEach((c,i)=>{const tags=[];if(keys.some(k=>k.table_name===t&&k.contype==='p'&&k.columns.includes(c.column_name)))tags.push('PK');if(fks.some(k=>k.table_name===t&&k.columns.includes(c.column_name)))tags.push('FK');
     const content=(tags.length?tags.join('/')+' ':'')+c.column_name+(physical?' : '+type(c)+(c.is_nullable==='NO'?' NN':''):'');
     s.text(p.x+12,p.y+74+i*29,content,23,'start',false,48);
   });
 }
 s.text(640,h-28,physical?'NN — NOT NULL; PK — первичный ключ; FK — внешний ключ':'Crow’s Foot: 1 — один; 0..N — ноль или много; PK и FK — участие в ключах',23,'middle',false,105);
 await s.save(physical?'ПР7_Физическая_полная':'ПР7_Логическая_полная');
}
// Hierarchical Gantt: each phase is followed by its mandatory tasks and performers.
const planFile=path.join(base,'Планирование/План_разработки.json'),plan=JSON.parse(await fs.readFile(planFile,'utf8'));
const subtasks=[
 [['Обследовать процесс',2],['Согласовать требования',3]], [['Построить модели',2],['Спроектировать архитектуру',3]],
 [['Разработать схему БД',3],['Подготовить миграции и данные',3]], [['Реализовать подбор',4],['Реализовать расчёт',4]],
 [['Спроектировать формы ролей',3],['Реализовать ввод и результат',4]], [['Соединить клиент и сервис',2],['Проверить сквозной сценарий',2]],
 [['Проверить функции и ошибки',3],['Устранить дефекты',3]], [['Провести пилот',1],['Подготовить передачу',2]]
];
const calendar=[];for(let d=new Date('2026-10-05T00:00:00Z');calendar.length<100;d=new Date(+d+86400000))if(![0,6].includes(d.getUTCDay())&&d.toISOString().slice(0,10)!=='2026-11-04')calendar.push(d.toISOString().slice(0,10));
let rows=[];for(let i=0;i<plan.tasks.length;i++){const phase=plan.tasks[i];rows.push({...phase,phase:true,code:String(phase.id)});let day=phase.start_day;phase.subtasks=subtasks[i].map(([name,duration],j)=>{const item={name,duration,code:phase.id+'.'+(j+1),start_day:day,end_day:day+duration-1,performers:Object.keys(phase.effort)};day+=duration;rows.push(item);return item;});if(day!==phase.end_day+1)throw Error('Phase/task duration mismatch');}
await fs.writeFile(planFile,JSON.stringify(plan,null,2)+'\n');
{
 const s=new Scene(2240,1230),x0=1020,scale=22,rowH=43;
 s.text(25,38,'Этап / задача',27,'start',true);s.text(660,38,'Исполнитель',27,'start',true);
 const start=Date.parse(plan.start+'T00:00:00Z');const dx=iso=>(Date.parse(iso+'T00:00:00Z')-start)/86400000*scale;
 for(let d=0;d<54;d++){const date=new Date(start+d*86400000);if(date.getUTCDay()===1){s.path([[x0+d*scale,70],[x0+d*scale,1140]]);s.text(x0+d*scale,54,date.toISOString().slice(8,10)+'.'+date.toISOString().slice(5,7),23);}}
 rows.forEach((t,i)=>{const y=100+i*rowH;const who=(t.performers??Object.keys(t.effort)).map(n=>({'Backend-разработчик':'Backend','Frontend-разработчик':'Frontend','Руководитель проекта':'РП','Администратор БД':'Адм. БД','Инженер эксплуатации':'Эксплуатация'}[n]??n)).join(', ');
   s.text(t.phase?25:55,y+3,t.code+' '+t.name,29,'start',t.phase,45);s.text(660,y+3,who.replaceAll('Тестировщик','Тест.'),26,'start',false,29);
   if(t.phase)s.rect(x0+dx(t.start_date),y-14,dx(t.end_date)-dx(t.start_date)+scale,8,0,'#222');
   else for(let day=t.start_day;day<=t.end_day;day++)s.rect(x0+dx(calendar[day]),y-19,scale-2,23,0,'#406b88','#406b88');
 });s.text(1120,1180,'Чёрная полоса — этап; синие полосы — задачи. РП — руководитель проекта; Адм. БД — администратор БД.',23,'middle',false,133);await s.save('ПР6_Гант_этапы_задачи');
}
// Role-specific mockups: visible role, different menus, fields and actions.
const example=model.card_example;
function frame(role,title,height=1000){const s=new Scene(1500,height);s.rect(0,0,1500,height,0,'#f7f8fa');s.rect(0,0,245,height,0,'#e9eef3');s.text(25,50,'ЮКОМС',31,'start',true);s.text(25,95,'Карточки товаров',22,'start');const r=model.roles.find(r=>r.id===role);r.tasks.forEach((t,i)=>s.text(25,180+i*110,t,25,'start',false,16));s.rect(245,0,1255,112,0,'white');s.text(280,52,title,30,'start',true,43);s.text(1460,42,r.name,25,'end',true,32);s.text(1460,82,'Албахтин И.В.',22,'end');return s;}
function field(s,x,y,label,value,w=530){s.text(x,y,label,23,'start',false,45);const max=Math.floor((w-28)/14),ls=lines(value,max);const h=Math.max(60,ls.length*32+24);s.rect(x,y+15,w,h,6);s.text(x+14,y+52,ls,26,'start',false,max);return h+67;}
function btn(s,x,y,label,w=340){s.rect(x,y,w,60,7,'#e1ebf2');s.text(x+w/2,y+38,label,25,'middle',true,30);}
function uiTable(s,x,y,headers,data,widths){let xx=x;headers.forEach((h,i)=>{s.rect(xx,y,widths[i],55,0,'#e7edf2');s.text(xx+12,y+36,h,24,'start',true,30);xx+=widths[i];});data.forEach((row,r)=>{let xx=x;row.forEach((v,i)=>{s.rect(xx,y+55+r*61,widths[i],61);s.text(xx+12,y+93+r*61,String(v),24,'start',false,Math.floor(widths[i]/13));xx+=widths[i];});});}
const parts=[['CPU-7600','Ryzen 5 7600','1','16 000'],['MB-B650','B650 / AM5','1','12 000'],['RAM-16','DDR5 16 ГБ','2','4 000'],['SSD-1TB','SSD M.2 1 ТБ','1','5 000'],['CASE-ATX','Корпус ATX','1','4 500'],['PSU-650','БП 650 Вт','1','5 500']];
{
 const s=frame('developer','Каталог и предложения');field(s,290,170,'Группа компонентов','Все группы');field(s,890,170,'Поставщик','SUP-A',530);uiTable(s,290,330,['SKU','Наименование','Остаток','Цена, руб.'],parts.map(r=>[r[0],r[1],'10',r[3]]),[270,430,160,260]);btn(s,290,800,'Выбрать компонент');await s.save('ПР8_Роль_developer_каталог');
}
{
 const s=frame('developer','Состав компьютерной конфигурации');field(s,290,170,'Конфигурация','AM5-OFFICE / версия 1');field(s,890,170,'Состояние','Проверена',530);uiTable(s,290,330,['SKU','Компонент','Кол-во','Предложение'],parts.map(r=>[...r.slice(0,3),'SUP-A']),[270,430,160,260]);btn(s,290,800,'Проверить состав');btn(s,840,800,'Сохранить новую версию',440);s.text(290,930,'Совместимость: AM5 / DDR5. Питание: 650 Вт ≥ 159,9 Вт.',26,'start',false,80);await s.save('ПР8_Роль_developer_состав');
}
{
 const s=frame('manager','Новая ревизия карточки',1200);field(s,290,165,'Код продавца',example.seller_code);field(s,890,165,'Конфигурация',example.configuration);field(s,290,300,'Заголовок',example.title,1130);field(s,290,480,'Описание',example.description,1130);field(s,290,740,'Наценка / комиссия','20 % / 15 %');field(s,890,740,'Сборка / упаковка / логистика','2 000 / 500 / 700 руб.');btn(s,290,945,'Рассчитать');btn(s,840,945,'Сохранить ревизию');s.text(290,1090,'Ревизия 1 · Черновик',27,'start',true);await s.save('ПР8_Роль_manager_карточка');
}
{
 const s=frame('manager','Результат расчёта');uiTable(s,290,180,['Показатель','Значение'],[['Компоненты','51 000,00 руб.'],['Себестоимость','53 500,00 руб.'],['Цена до округления','76 352,94 руб.'],['Цена карточки',example.price_rub+' руб.'],['Масса с упаковкой',example.mass_kg+' кг'],['Совместимость','Проверки пройдены']],[610,510]);btn(s,290,690,'Открыть карточку');btn(s,840,690,'Сохранить ревизию');await s.save('ПР8_Роль_manager_расчёт');
}
{
 const s=frame('designer','Изображения карточки');field(s,290,170,'Карточка / ревизия',example.seller_code+' / 1');field(s,890,170,'Состояние','Черновик');uiTable(s,290,335,['Файл','Размер','Порядок'],[[example.image,'1600 × 1600 px','1']],[610,310,200]);s.rect(290,490,350,280,8);s.rect(405,520,120,215,4,'#3d4b59');s.rect(423,545,84,135,4,'#ced7df');s.text(870,535,'Предварительный просмотр',26,'middle',true,28);field(s,720,610,'Порядок изображения','1',430);btn(s,290,830,'Выбрать изображение');btn(s,840,830,'Сохранить порядок');await s.save('ПР8_Роль_designer_изображения');
}
{
 const s=frame('director','Согласование карточки');field(s,290,170,'Карточка / ревизия',example.seller_code+' / 1');field(s,890,170,'Состояние','На согласовании');uiTable(s,290,335,['Показатель','Результат проверки'],[['Состав','Проверен, версия 1'],['Цена / себестоимость','76 400 / 53 500 руб.'],['Заголовок и описание','Заполнены'],['Изображения','1 изображение, порядок задан'],['Итог','Готова к утверждению']],[610,510]);btn(s,290,760,'Утвердить ревизию');btn(s,840,760,'Вернуть с замечаниями',440);await s.save('ПР8_Роль_director_согласование');
}
{
 const s=frame('manager','Результаты публикации');field(s,290,175,'Карточка',example.seller_code);uiTable(s,290,345,['Ревизия','Попытка','Состояние','Результат'],[['1','1','ACCEPTED','Задача принята']],[180,180,300,460]);s.text(290,560,'Внешняя задача: DEMO-TASK-001',27,'start');s.text(290,625,'Подтверждение публикации ещё не получено.',27,'start',false,65);btn(s,290,760,'Обновить представление');await s.save('ПР8_Роль_manager_публикации');
}
{
 const s=frame('manager','Предварительный просмотр карточки',1370);s.rect(290,160,365,480,8);s.rect(390,200,165,370,5,'#3d4b59');s.rect(415,240,115,250,5,'#ced7df');s.text(472,610,'Юкомс AM5',26,'middle',true);s.text(715,190,example.title,29,'start',true,43);s.text(715,335,example.price_rub+' руб.',40,'start',true);s.text(715,405,'Масса с упаковкой: '+example.mass_kg+' кг',26,'start');s.text(715,470,'Артикул: '+example.seller_code,26,'start');s.text(715,535,'Класс: '+example.classification,26,'start');s.text(715,600,'Готова к публикации',26,'start',true);uiTable(s,290,690,['Характеристика','Значение'],[['Назначение / корпус',example.purpose+' / '+example.case],['Процессор / платформа',example.cpu+' / '+example.platform],['Оперативная память',example.ram],['Накопитель',example.ssd],['Графика / питание',example.gpu+' / '+example.psu]],[480,650]);s.text(290,1100,example.description,25,'start',false,87);btn(s,290,1270,'Передать на публикацию',430);await s.save('ПР8_Карточка_заполненная');
}
await fs.writeFile(path.join(out,'Проверка_схем_к_сдаче.json'),JSON.stringify({revision:model.revision,source:'Исходники/submission_model.json',relational:{entities:Object.keys(db.counts).length,attributes:db.columns.length,relationships:fks.length,positions:erPositions},emitted},null,2)+'\n');
console.log(JSON.stringify({figures:emitted.length,files:emitted.map(x=>x.name)}));
