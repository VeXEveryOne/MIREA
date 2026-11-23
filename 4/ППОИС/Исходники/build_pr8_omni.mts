// Editable screen mockups (SCHEME) and GOST flowcharts (FLOWCHART).
// Images are exported by OmniNotation, never by a separate SVG renderer.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {omniModule} from '../../../tools/runtime.mjs';
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const {flowchartEngine}=await omniModule('src/notations/flowchart/document.ts');
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const base=path.resolve('4/ППОИС'),dir=path.join(base,'Схемы'),cache=path.resolve('.cache/ppois-pr8-20261112');
await fs.mkdir(cache,{recursive:true});
const data=JSON.parse(await fs.readFile(path.join(base,'Исходники/submission_model.json'),'utf8')),example=data.card_example;
const m:any={id:'pr8_screens',label:'Экранные формы по ролям',elements:[]},nodes:any={},forms:any[]=[];
const add=(kind:string,id:string,label='',properties:any={})=>m.elements.push({kind,id,label,properties});
let sheet='',serial=0;
function box(x:number,y:number,w:number,h:number,fill='#ffffff',stroke='#000000'){
 const id='box_'+serial++;add('block',id,'',{shape:'rectangle',role:'generic'});add('view','v_'+id,'',{diagram:sheet,element:id});nodes['v_'+id]={x:x-w/98,y:y-h/98,width:w/.98,height:h/.98,z:1,style:{fill,stroke,lineWidth:1.1}};
}
function text(label:string,x:number,y:number,w:number,h:number,size=28){const id='text_'+serial++;add('label',id,label,{text:label});add('view','v_'+id,'',{diagram:sheet,element:id});nodes['v_'+id]={x,y,width:w,height:h,z:4,style:{fontSize:size,color:'#000000'}};}
function field(label:string,value:string,x:number,y:number,w=580,h=60){text(label,x,y,w,36,26);box(x,y+38,w,h);text(value,x+12,y+40,w-24,h-4,28);}
function button(label:string,x:number,y:number,w=360){box(x,y,w,64);text(label,x+8,y+3,w-16,58,28);}
function table(headers:string[],rows:string[][],x:number,y:number,widths:number[],rowH=61){
 for(const [ri,row] of [headers,...rows].entries()){let xx=x;for(const [ci,v] of row.entries()){box(xx,y+ri*rowH,widths[ci],rowH);text(String(v),xx+7,y+ri*rowH+3,widths[ci]-14,rowH-6,ri?27:28);xx+=widths[ci];}}
}
function frame(id:string,role:string,title:string,tables:string[],actions:string[],height=1000){
 sheet=id;add('diagram',id,title,{type:'general'});forms.push({id,role,title,tables,actions,file:'',width:1600,height});
 box(0,0,1600,height);box(0,0,315,height);box(315,0,1285,110);
 text('ЮКОМС',20,20,275,45,34);text('Карточки товаров',20,70,275,40,26);
 text(title,350,20,720,65,32);text(role,1085,15,480,40,28);text('Албахтин И.В.',1085,60,480,36,26);
 const menu=data.roles.find((r:any)=>r.name===role).tasks;
 menu.forEach((s:string,i:number)=>text(s,20,145+i*150,275,130,28));
 text('Выход',20,height-80,275,55,28);
}
const parts=[['CPU-7600','Процессор AM5','1','16 000'],['MB-B650','Плата B650 DDR5','1','12 000'],['RAM-16','DDR5 16 ГБ','2','4 000'],['SSD-1TB','SSD M.2 1 ТБ','1','5 000'],['CASE-ATX','Корпус ATX','1','4 500'],['PSU-650','БП 650 Вт','1','5 500']];
frame('catalog','Разработчик','Каталог и предложения',['component_group','component','supplier','offer'],['Выбрать компонент']);
field('Группа компонентов','Все группы',350,140);field('Поставщик','SUP-A',970,140);
table(['SKU','Компонент','Остаток','Цена, руб.'],parts.map(r=>[r[0],r[1],'10',r[3]]),350,290,[270,480,170,280]);button('Выбрать компонент',350,800,430);
frame('composition','Разработчик','Состав конфигурации',['configuration','model_range_version','model_range_slot'],['Проверить состав','Сохранить новую версию']);
field('Конфигурация / версия',example.configuration,350,140);field('Состояние','Проверена',970,140);
table(['SKU','Компонент','Кол-во','Поставщик'],parts.map(r=>[...r.slice(0,3),'SUP-A']),350,290,[270,480,170,280]);
button('Проверить состав',350,790,430);button('Сохранить новую версию',840,790,650);text('AM5 / DDR5 · Питание: 650 Вт ≥ 159,9 Вт',350,890,1200,55,28);
frame('revision','Менеджер','Новая ревизия карточки',['card','card_revision'],['Рассчитать','Сохранить ревизию']);
field('Код продавца',example.seller_code,350,130);field('Конфигурация / версия',example.configuration,970,130);
field('Заголовок',example.title,350,255,1200,100);field('Описание',example.description,350,420,1200,145);
field('Наценка / комиссия','20 % / 15 %',350,635);field('Сборка / упаковка / логистика','2 000 / 500 / 700 руб.',970,635);
text('Шаг цены: 100 руб. · Масса упаковки: 0,800 кг · Ревизия 1: Черновик',350,755,1200,50,26);
button('Рассчитать',350,850,430);button('Сохранить ревизию',840,850,650);
frame('calculation','Менеджер','Результат расчёта',['model_range_slot','offer','component','card_revision'],['Открыть карточку','Сохранить ревизию']);
field('Карточка / ревизия',example.seller_code+' / 1',350,130,1200);
table(['Показатель','Значение'],[['Компоненты','51 000,00 руб.'],['Себестоимость','53 500,00 руб.'],['Цена до округления','76 352,94 руб.'],['Цена карточки',example.price_rub+' руб.'],['Масса с упаковкой',example.mass_kg+' кг'],['Совместимость','Проверки пройдены']],350,280,[650,550]);
button('Открыть карточку',350,800,430);button('Сохранить ревизию',840,800,650);
frame('images','Дизайнер','Изображения карточки',['image','revision_image'],['Выбрать изображение','Сохранить порядок']);
field('Карточка / ревизия',example.seller_code+' / 1',350,140);field('Состояние','Черновик',970,140);
table(['Файл','Размер','Порядок'],[[example.image,'1600 × 1600 px','1']],350,300,[650,350,200]);
box(350,475,390,285);box(480,500,130,235);box(500,530,90,145);text('Предварительный просмотр',800,480,680,50,28);field('Порядок изображения','1',850,570,580);
button('Выбрать изображение',350,850,430);button('Сохранить порядок',840,850,650);
frame('approval','Генеральный директор','Согласование карточки',['card','card_revision','model_range_version','revision_image'],['Утвердить ревизию','Вернуть на доработку']);
field('Карточка / ревизия',example.seller_code+' / 1',350,140);field('Состояние ревизии','Черновик (DRAFT)',970,140);
table(['Показатель','Результат проверки'],[['Состав','Проверен, версия 1'],['Цена / себестоимость','76 400 / 53 500 руб.'],['Заголовок и описание','Заполнены'],['Изображения','1 изображение, порядок задан'],['Готовность','Готова к утверждению']],350,290,[650,550]);
button('Утвердить ревизию',350,790,430);button('Вернуть на доработку',840,790,650);
frame('publication','Менеджер','Результаты публикации',['publication_attempt'],['Обновить результат']);
field('Карточка / ревизия',example.seller_code+' / 1',350,140);field('Готовность ревизии','Готова (READY)',970,140);
table(['Ревизия','Попытка','Состояние','Результат'],[['1','1','ACCEPTED','Задача принята']],350,300,[200,200,330,470]);
text('Внешняя задача: DEMO-TASK-001',350,510,1200,60,30);text('Публикация ожидает подтверждения',350,590,1200,60,30);button('Обновить результат',350,790,500);
sheet='card';add('diagram',sheet,'Заполненная карточка',{type:'general'});forms.push({id:sheet,role:'Менеджер',title:'Заполненная карточка',tables:['card','card_revision','model_range_slot','component','image','revision_image','offer'],actions:['Передать на публикацию'],width:1100,height:1500});
box(0,0,1100,1500);box(0,0,1100,100);text('ЮКОМС · Карточка товара',20,15,700,65,33);text('Менеджер',790,15,280,65,28);
text(example.title,30,120,1040,115,33);box(40,260,340,390);box(145,290,130,280);box(165,320,90,180);
text(example.price_rub+' руб.',420,270,630,75,40);text('Масса с упаковкой: '+example.mass_kg+' кг',420,355,630,65,29);
text('Артикул: '+example.seller_code,420,430,630,65,29);text('Версия состава 1 · Ревизия 1',420,505,630,65,29);text('Готова к публикации',420,580,630,65,30);
table(['Характеристика','Значение'],[['Назначение / корпус',example.purpose+' / '+example.case],['Процессор / платформа',example.cpu+' / '+example.platform],['Материнская плата',example.board],['Оперативная память',example.ram],['Накопитель',example.ssd],['Графика / питание',example.gpu+' / '+example.psu]],40,690,[410,610],65);
text(example.description,40,1165,1020,170,27);button('Передать на публикацию',280,1390,580);
const screens=schemeEngine.create(m);Object.assign(screens.layout.nodes,nodes);const screenWarnings=schemeEngine.validate(m);
if(screenWarnings.some((d:any)=>d.blocksCommit||d.blocksExport))throw Error(JSON.stringify(screenWarnings));
const screenFile=path.join(dir,'ПР8_Экранные_формы.omni');await fs.writeFile(screenFile,await encodeProject(screens)+'\n');await decodeProject(await fs.readFile(screenFile,'utf8'));
const fm:any={id:'pr8_algorithms',label:'Алгоритмы обработки',elements:[]},fn:any={},fe:any={};
const fa=(kind:string,id:string,label='',properties:any={})=>fm.elements.push({kind,id,label,properties});
function flowSheet(id:string,title:string){fa('algorithm',id+'_algorithm',title);fa('diagram',id,title,{type:'algorithm',algorithm:id+'_algorithm'});}
function node(id:string,kind:string,label:string,x:number,y:number,w=410,h=80){fa(kind,sheet+'_'+id,label,{owner:sheet+'_algorithm',...(kind==='decision'?{mode:'binary',expression:label}:{})});fa('view','v_'+sheet+'_'+id,'',{diagram:sheet,element:sheet+'_'+id});fn['v_'+sheet+'_'+id]={x,y,width:w,height:h,style:{fontSize:26,color:'#000000'}};}
function edge(a:string,b:string,guard='',from='bottom',to='top',bends:any[]=[]){const id=sheet+'_edge_'+serial++;fa('flow',id,guard,{from:sheet+'_'+a,to:sheet+'_'+b});fa('view','v_'+id,'',{diagram:sheet,element:id,from:'v_'+sheet+'_'+a,to:'v_'+sheet+'_'+b});fe['v_'+id]={from:{side:from,offset:.5},to:{side:to,offset:.5},bends};}
sheet='selection';flowSheet(sheet,'Подбор предложений');
node('start','start','Начало',160,10,230,60);node('input','input','Позиции, компоненты,\nпредложения и момент t',70,110);
node('valid','decision','n ≥ 1, qᵢ — целые\nи qᵢ > 0?',55,245,440,135);node('init','operation','i = 1; список пуст',70,435);
node('loop','decision','i ≤ n?',55,575,440,110);node('filter','operation','Предложения позиции i:\nостаток ≥ qᵢ; возраст ≤ 24 ч;\nдата наблюдения ≤ t',70,740,410,115);
node('found','decision','Есть допустимое\nпредложение?',55,910,440,135);node('pick','operation','Выбрать минимум по цене,\nкоду поставщика, ID',70,1100,410,95);
node('next','operation','Добавить предложение;\ni = i + 1',70,1250,410,90);
node('error','output','Ошибка входных данных /\nнет допустимого\nпредложения',650,900,380,115);node('fail','end','Конец',720,1080,230,60);
node('result','output','Выбранные предложения\nдля всех позиций',650,1230,380,100);node('end','end','Конец',720,1410,230,60);
edge('start','input');edge('input','valid');edge('valid','init','Да');edge('valid','error','Нет','right','top',[{x:585,y:312.5},{x:585,y:860},{x:840,y:860}]);edge('init','loop');edge('loop','filter','Да');edge('loop','result','Нет','right','right',[{x:1090,y:630},{x:1090,y:1280}]);edge('filter','found');edge('found','pick','Да');edge('found','error','Нет','right','left');edge('pick','next');edge('next','loop','','bottom','left',[{x:275,y:1400},{x:12,y:1400},{x:12,y:630}]);edge('error','fail');edge('result','end');
sheet='calculation';flowSheet(sheet,'Проверка и расчёт');
node('start','start','Начало',160,10,230,60);node('input','input','Выбранный состав,\nпараметры цены и массы',70,110);
node('valid','decision','Параметры допустимы,\nсостав совместим?',55,245,440,135);node('cost','operation','Cкомп = ∑ qᵢ · pᵢ\nC = Cкомп + A + B',70,435,410,100);
node('price','operation','P₀ = (C · (1 + m) + L)\n/ (1 − c)',70,590,410,100);node('round','operation','P = d · ceil(P₀ / d)',70,745,410,90);
node('mass','operation','W = ∑ qᵢ · wᵢ + b',70,890,410,80);node('output','output','Себестоимость,\nитоговая цена и масса',70,1025,410,95);node('end','end','Конец',160,1180,230,60);
node('error','output','Ошибки параметров\nили совместимости',650,270,380,100);node('fail','end','Конец',720,435,230,60);
for(const [a,b] of [['start','input'],['input','valid'],['cost','price'],['price','round'],['round','mass'],['mass','output'],['output','end'],['error','fail']])edge(a,b);
edge('valid','cost','Да');edge('valid','error','Нет','right','left');
const flow=flowchartEngine.create(fm);Object.assign(flow.layout.nodes,fn);Object.assign(flow.layout.edges,fe);const diagnostics=flowchartEngine.validate(fm);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const flowFile=path.join(dir,'ПР8_Алгоритмы.omni');await fs.writeFile(flowFile,await encodeProject(flow)+'\n');await decodeProject(await fs.readFile(flowFile,'utf8'));
const jobs=forms.map((f:any,i:number)=>{const title='ПР8_'+f.id;f.file=String(i+1).padStart(2,'0')+'_'+title+'.png';return {file:screenFile,diagramId:f.id,title};});
jobs.push({file:flowFile,diagramId:'selection',title:'ПР8_Подбор'},{file:flowFile,diagramId:'calculation',title:'ПР8_Расчёт'});
const hash=async(file:string)=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options:{format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:5000,margin:14},jobs},null,2)+'\n');
await fs.writeFile(path.join(dir,'ПР8_Проверка_моделей.json'),JSON.stringify({models:{screens:await hash(screenFile),algorithms:await hash(flowFile)},source_sha256:await hash(path.join(base,'Исходники/submission_model.json')),diagnostics,screenWarnings:screenWarnings.length,forms,algorithms:[{id:'selection',file:'09_ПР8_Подбор.png'},{id:'calculation',file:'10_ПР8_Расчёт.png'}]},null,2)+'\n');
console.log(JSON.stringify({forms:forms.length,algorithms:2,diagnostics,screenWarnings:screenWarnings.length}));
