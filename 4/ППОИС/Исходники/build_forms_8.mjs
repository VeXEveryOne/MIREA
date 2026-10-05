// Schema-bound editable SVG mockups and GOST 19.701 algorithm sources.
// A mockup is never represented as a working browser/client screenshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runtimeModule} from '../../../tools/runtime.mjs';
const {default:sharp}=await runtimeModule('sharp');
const subject=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(subject,'../..');
const out=process.env.PPOIS_MODEL_OUTPUT ?? path.join(subject,'Схемы');
const db=JSON.parse(await fs.readFile(path.join(subject,'База_данных/Результаты_проверки.json'),'utf8'));
const math=JSON.parse(await fs.readFile(path.join(root,'.cache/ppois5-10/mathematics-verification.json'),'utf8'));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
if(!math.passed || math.database!==db.database || math.database_evidence_sha256!==hash(await fs.readFile(path.join(subject,'База_данных/Результаты_проверки.json')))) throw Error('Current executed mathematics proof required');
for(const [file,expected] of Object.entries(math.source_sha256)) {
  const base=file==='verify_mathematics.py'?'Исходники':'Прототип';
  if(hash(await fs.readFile(path.join(subject,base,file)))!==expected)throw Error('Stale mathematics source '+file);
}
await fs.mkdir(out,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function wrap(value,max=32){
  const words=String(value).split(/\s+/).flatMap(word=>word.length>max?word.match(new RegExp(`.{1,${max}}`,'g')):[word]);const lines=[];let line='';
  for(const word of words){if(line && (line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
  if(line)lines.push(line);return lines;
}
function txt(x,y,value,size=24,anchor='start',fill='#17212c'){
  const lines=Array.isArray(value)?value:[value];
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?size*1.22:0}">${esc(line)}</tspan>`).join('')}</text>`;
}
const rect=(x,y,w,h,fill='white',stroke='#7c8794',rx=5)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
function value(v){
  if(v===null)return 'NULL';
  if(typeof v==='boolean')return v?'true':'false';
  const id=String(v).match(/^00000000-0000-0000-0000-(\d{12})$/);
  if(id)return 'U'+String(Number(id[1])).padStart(3,'0');
  if(/^2026-\d\d-\d\d /.test(String(v)))return String(v).replace(' +00:00',' UTC').replace('+00:00',' UTC');
  return String(v);
}
const names={
 id:'Идентификатор',code:'Код',name:'Наименование',role_code:'Роль компонента',group_id:'Группа',
 sku:'SKU',mass_kg:'Масса, кг',socket:'Сокет',memory_type:'Тип памяти',power_w:'Мощность, Вт',
 component_id:'Компонент',supplier_id:'Поставщик',unit_price_rub:'Цена единицы, ₽',stock:'Остаток, шт.',
 observed_at:'Момент наблюдения',configuration_id:'Конфигурация',version_no:'Версия состава',state:'Состояние',
 created_at:'Создано',card_id:'Карточка',revision_no:'Ревизия',seller_code:'Код продавца',title:'Заголовок карточки',
 description:'Описание',assembly_rub:'Сборка, ₽',packaging_rub:'Упаковка, ₽',logistics_rub:'Логистика, ₽',
 markup_rate:'Наценка, доля',commission_rate:'Комиссия, доля',round_step_rub:'Шаг округления, ₽',
 packaging_mass_kg:'Упаковка, кг',calculated_at:'Рассчитано',uri:'URI изображения',sha256:'SHA-256',
 width_px:'Ширина, px',height_px:'Высота, px',image_id:'Изображение',ordinal:'Порядок',
 attempt_no:'Номер попытки',external_task_id:'Внешний ID задачи',error_code:'Код ошибки',
 confirmed_not_accepted:'Непринятие подтверждено',next_check_at:'Следующая сверка'};
const forms=[];
function fields(table,row,selected){
  return (selected??db.columns.filter(c=>c.table_name===table).sort((a,b)=>a.ordinal_position-b.ordinal_position).map(c=>c.column_name))
    .map(name=>({table,column:name,label:names[name]??name,value:value(row[name])}));
}
const fixture=table=>db.fixtures[table][0];
forms.push({id:'F1',title:'Группы и комплектующие',role:'Администратор справочников — проектная роль',note:'Инженер читает каталог. Добавление администратором требует отдельной настройки прав.',
 fields:[...fields('component_group',fixture('component_group')),...fields('component',fixture('component'))],buttons:['Новый компонент','Закрыть']});
forms.push({id:'F2',title:'Поставщики и наблюдения предложений',role:'Администратор справочников — проектная роль',note:'Новое наблюдение не перезаписывает цену, связанную с прежней ревизией.',
 fields:[...fields('supplier',fixture('supplier')),...fields('offer',fixture('offer'))],buttons:['Новое наблюдение','Показать историю']});
const version=db.fixtures.bom_version.find(r=>r.version_no===2);
forms.push({id:'F3',title:'Редактор черновой версии состава',role:'Инженер',note:'Версия 2 — DRAFT; версия 1, использованная ревизиями, не редактируется.',
 fields:[...fields('configuration',fixture('configuration')),...fields('bom_version',version)],
 table:{headers:['Строка','Группа','Точный компонент','Предложение','Кол-во'],widths:[90,250,260,230,130],
 rows:db.fixtures.bom_slot.filter(r=>r.version_no===2).map(r=>[r.line_no,value(r.group_id),value(r.requested_component_id),value(r.offer_id),r.quantity])},buttons:['Проверить и рассчитать','Сохранить черновик']});
const revision=fixture('card_revision');
forms.push({id:'F4',title:'Содержание ревизии карточки',role:'Менеджер',note:'Ревизия 1 — READY: содержание только для чтения. Исправление создаёт новую ревизию.',
 fields:[...fields('card',fixture('card')),...fields('card_revision',revision,['card_id','revision_no','configuration_id','version_no','state','title','description'])],buttons:['Новая ревизия','Параметры расчёта']});
forms.push({id:'F5',title:'Экономические параметры ревизии',role:'Менеджер',note:'Параметры сохранённой ревизии неизменяемы. Доли 0,20 и 0,15 не проценты 20 и 15.',
 fields:fields('card_revision',revision,['assembly_rub','packaging_rub','logistics_rub','markup_rate','commission_rate','round_step_rub','packaging_mass_kg','calculated_at']),buttons:['Новая ревизия','Открыть расчёт']});
forms.push({id:'F6',title:'Изображения и порядок в ревизии',role:'Менеджер',note:'Показаны метаданные тестовой БД. URI и условный хеш не доказывают наличие файла.',
 fields:[...fields('image',fixture('image')),...fields('revision_image',fixture('revision_image'))],buttons:['Добавить изображение','Изменить порядок']});
forms.push({id:'F7',title:'Результат подбора и расчёта',role:'Менеджер / инженер',note:'Проверка на 05.10.2026 10:00 +03:00. Расчёт сам по себе не утверждает карточку.',fields:[],
 table:{headers:['Строка','SKU','Кол-во','Цена, ₽','Сумма, ₽','Масса, кг'],widths:[90,260,110,200,220,180],
 rows:math.selected.map(r=>[r.line_no,r.sku,r.quantity,r.price_rub,r.line_cost_rub,r.line_mass_kg])},
 totals:[['Комплектующие, ₽',math.control.component_cost_rub],['Себестоимость, ₽',math.control.cost_rub],['Цена, ₽',math.control.price_rub],
         ['Масса с упаковкой, кг',math.control.mass_kg],['Совместимость','Ошибок нет'],['Минимум БП, Вт','159.9']],buttons:['Открыть состав','Создать ревизию']});
forms.push({id:'F8',title:'Результат попытки публикации',role:'Менеджер — чтение; worker — результат',note:'ACCEPTED означает принятую задачу, не опубликованную карточку. Требуется сверка.',
 fields:fields('publication_attempt',fixture('publication_attempt')),buttons:['Проверить результат','Повторить отправку — запрещено']});
// The repeated owner FK is already represented by configuration.id in the
// form header; keep it in the schema map without a duplicate visible control.
forms.find(f=>f.id==='F3').fields.find(f=>f.table==='bom_version'&&f.column==='configuration_id').visible=false;
function screen(form){
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="950" viewBox="0 0 1500 950"><rect width="1500" height="950" fill="white"/><g font-family="Arial">`;
  svg+=rect(0,0,1500,78,'#f1f4f7','#d7dee5',0)+txt(30,49,'Юкомс',32)+txt(255,49,form.title,30)+txt(1466,47,form.id+' · МАКЕТ',22,'end');
  svg+=rect(0,78,225,872,'#f8fafb','#d7dee5',0);
  ['Комплектующие','Предложения','Конфигурации','Карточки','Изображения','Расчёты','Публикации'].forEach((label,i)=>svg+=txt(25,146+i*64,label,23));
  svg+=txt(260,126,form.role,22)+txt(260,165,'Проектная форма без серверной записи',20,'start','#5d6670');
  let y=205;
  const visibleFields=form.fields.filter(f=>f.visible!==false);
  visibleFields.forEach((f,i)=>{
    const x=260+(i%3)*402;const fy=y+Math.floor(i/3)*139;
    svg+=txt(x,fy,f.label,22)+txt(x,fy+27,f.table+'.'+f.column,17,'start','#5d6670');
    const lines=wrap(f.value,f.column==='sha256'?32:31);
    svg+=rect(x,fy+38,380,70,'white','#a7b1bc',4)+txt(x+12,fy+64,lines,20);
  });
  y+=Math.ceil(visibleFields.length/3)*139;
  if(form.table){
    y+=10;const {headers,rows,widths}=form.table;const total=widths.reduce((a,b)=>a+b,0);const grid=widths.map(w=>w/total*1184);let x=260;
    headers.forEach((header,i)=>{svg+=rect(x,y,grid[i],45,'#f1f4f7','#a7b1bc',0)+txt(x+9,y+30,header,21);x+=grid[i];});
    rows.forEach((row,ri)=>{let rx=260;row.forEach((cell,ci)=>{svg+=rect(rx,y+45+ri*44,grid[ci],44,'white','#bfc7d0',0)+txt(rx+9,y+75+ri*44,cell,21);rx+=grid[ci];});});
    y+=45+rows.length*44+28;
  }
  if(form.totals){form.totals.forEach(([label,v],i)=>{const x=260+(i%3)*402;const fy=y+Math.floor(i/3)*90;svg+=txt(x,fy,label,22)+txt(x,fy+38,v,29);});}
  const noteLines=wrap(form.note,102);svg+=txt(260,837,noteLines,21,'start','#495461');
  let bx=260;form.buttons.forEach((button,i)=>{const width=Math.max(210,button.length*13+35);const disabled=form.id==='F8'&&i===1;svg+=rect(bx,883,width,46,disabled?'#f3f3f3':'white',disabled?'#b7b7b7':'#455a70',5)+txt(bx+16,914,button,22,'start',disabled?'#7b7b7b':'#22364b');bx+=width+18;});
  return svg+'</g></svg>';
}
const mapping=db.columns.map(c=>{
  let form= forms.find(f=>f.fields.some(v=>v.table===c.table_name && v.column===c.column_name));
  if(c.table_name==='bom_slot')form=forms.find(f=>f.id==='F3');
  if(!form)throw Error('Unmapped physical field '+c.table_name+'.'+c.column_name);
  const generated=['id','configuration_id','card_id','created_at','calculated_at','attempt_no','external_task_id','error_code','confirmed_not_accepted','next_check_at'];
  const server=generated.includes(c.column_name)||['version_no','revision_no','state'].includes(c.column_name)||c.table_name==='image';
  const mode=server?'Системное поле / ссылка / управляемое состояние':
    ['F1','F2'].includes(form.id)?'Ввод администратором после настройки прав':'Ввод при создании объекта или в черновике';
  return {table:c.table_name,column:c.column_name,form:form.id,mode,
          mandatory:c.is_nullable==='NO',type:c.udt_name};
});
const algorithms=[];
function flow(id,title,height,nodes,edges){
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8" fill="none" stroke="#111" stroke-width="1.5"/></marker></defs><rect width="1000" height="${height}" fill="white"/><g font-family="Arial">`;
  for(const edge of edges){svg+=`<path d="${edge.path}" stroke="#111" stroke-width="2" fill="none" marker-end="url(#a)"/>`;if(edge.label)svg+=txt(edge.x,edge.y,edge.label,24);}
  for(const n of nodes){const {x,y,w,h,type,lines}=n;let shape='';
    if(type==='connector')shape=`<circle cx="${x+w/2}" cy="${y+h/2}" r="${w/2}" fill="white" stroke="#111" stroke-width="2"/>`;
    else if(type==='decision')shape=`<polygon points="${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}" fill="white" stroke="#111" stroke-width="2"/>`;
    else if(type==='data')shape=`<polygon points="${x+25},${y} ${x+w},${y} ${x+w-25},${y+h} ${x},${y+h}" fill="white" stroke="#111" stroke-width="2"/>`;
    else shape=rect(x,y,w,h,'white','#111',type==='terminal'?h/2:0);
    svg+=shape+txt(x+w/2,y+h/2-(lines.length-1)*17+9,lines,27,'middle','#111');
  }
  algorithms.push({id,title,nodes,edges,file:`ПР8_${id}.png`});return svg+'</g></svg>';
}
const n=(type,y,lines,x=65,w=410,h=90)=>({type,x,y,w,h,lines});
const e=(path,label,x,y)=>({path,label,x,y});
const down=(a,b)=>e(`M270 ${a} V${b}`);
const views=[
 ['A1','Подбор предложений по позициям',flow('A1','Подбор предложений по позициям',1410,[
  n('terminal',20,['Начало'],135,270,60),n('data',115,['Позиции, компоненты,','предложения, t, TTL']),
  n('decision',245,['Входные данные','допустимы?'],35,470,120),n('process',410,['i = 1; результат пуст']),
  n('decision',550,['i ≤ n?'],35,470,110),n('process',705,['Получить допустимые','предложения Eᵢ']),
  n('decision',850,['Eᵢ не пусто?'],35,470,110),n('process',1005,['Выбрать минимум по','цене, коду, ID']),
  n('process',1160,['Добавить позицию; i = i + 1']),
  n('data',800,['Ошибка входа /','нет предложения'],620,310,90),n('terminal',945,['Конец'],650,250,60),
  n('connector',582,['S'],537,46,46),n('connector',1040,['S'],752,46,46),
  n('data',1140,['Выбранные позиции','К проверке состава'],620,310,90),n('terminal',1290,['Конец'],650,250,60)
 ],[down(80,115),down(205,245),e('M270 365 V410','Да',286,396),down(500,550),e('M270 660 V705','Да',286,694),down(795,850),
    e('M270 960 V1005','Да',286,992),down(1095,1160),e('M270 1250 V1350 H15 V605 H35'),
    e('M505 305 H600 V845 H620','Нет',519,288),e('M505 905 H600 V845 H620','Нет',519,931),
    e('M505 605 H537','Нет',510,585),e('M775 1086 V1140'),e('M775 890 V945'),e('M775 1230 V1290')])],
 ['A2','Расчёт цены и массы',flow('A2','Расчёт цены и массы',1250,[
  n('terminal',20,['Начало'],135,270,60),n('data',120,['Подобранный состав,','параметры расчёта']),
  n('decision',270,['Параметры допустимы,','состав совместим?'],35,470,130),
  n('process',465,['Cкомп = Σ qᵢpᵢ','C = Cкомп + A + B']),n('process',610,['P₀ = (C(1 + m) + L)','/ (1 − c)']),
  n('process',755,['P = ceil(P₀ / d) · d']),n('process',900,['W = Σ qᵢwᵢ + b']),
  n('data',1045,['Цена, масса,','себестоимость']),n('terminal',1180,['Конец'],135,270,60),
  n('data',290,['Ошибка параметров','или совместимости'],620,310,90),n('terminal',450,['Конец'],650,250,60)
 ],[down(80,120),down(210,270),e('M270 400 V465','Да',286,445),down(555,610),down(700,755),down(845,900),down(990,1045),down(1135,1180),
    e('M505 335 H620','Нет',525,318),e('M775 380 V450')])],
 ['A3','Решение о допустимости повтора',flow('A3','Решение о допустимости повтора',1270,[
  n('terminal',20,['Начало'],135,270,60),n('data',115,['Состояние, флаг, a,','t_next, t_now, лимит 3']),
  n('decision',270,['state = TEMP_ERROR?'],35,470,120),n('decision',460,['Непринятие','подтверждено?'],35,470,120),
  n('decision',650,['1 ≤ a < 3?'],35,470,120),n('decision',840,['Время задано с зоной,','t_next ≤ t_now?'],35,470,130),
  n('data',1050,['Повтор допустим: true']),n('terminal',1190,['Конец'],135,270,60),
  n('data',850,['Повтор недопустим:','false'],620,310,90),n('terminal',1080,['Конец'],650,250,60)
 ],[down(80,115),down(205,270),e('M270 390 V460','Да',285,435),e('M270 580 V650','Да',285,627),
    e('M270 770 V840','Да',285,817),e('M270 970 V1050','Да',285,1016),down(1140,1190),
    e('M505 330 H560 V895 H620','Нет',520,311),e('M505 520 H560 V895 H620','Нет',520,501),
    e('M505 710 H560 V895 H620','Нет',520,691),e('M505 905 H560 V895 H620','Нет',520,930),e('M775 940 V1080')])]
];
const emitted=[];
async function emit(stem,svg){
  await fs.writeFile(path.join(out,stem+'.svg'),svg);
  await sharp(Buffer.from(svg)).resize({width:3000}).png().toFile(path.join(out,stem+'.png'));
  emitted.push({file:stem+'.png',sha256:hash(await fs.readFile(path.join(out,stem+'.png')))});
}
for(const form of forms)await emit('ПР8_'+form.id,screen(form));
for(const [id,,svg] of views)await emit('ПР8_'+id,svg);
const manifest={database:db.database,database_evidence_sha256:math.database_evidence_sha256,
 mathematics_sha256:hash(await fs.readFile(path.join(root,'.cache/ppois5-10/mathematics-verification.json'))),
 source_sha256:hash(await fs.readFile(fileURLToPath(import.meta.url))),
 kind:'Explicitly labelled project mockups, not implemented client screenshots',forms,mapping,algorithms,emitted};
await fs.writeFile(path.join(out,'ПР8_Формы_и_алгоритмы.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({forms:forms.length,mapped_fields:mapping.length,algorithms:algorithms.length,output:out}));
