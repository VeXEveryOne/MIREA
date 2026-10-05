// PPOIS10: the client contract is the authority for functions and role views.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {omniModule,runtimeModule} from '../../../tools/runtime.mjs';
import {escape,wrap,measure,intersects} from '../../../tools/diagram_text.mts';
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {default:sharp}=await runtimeModule('sharp');
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.PPOIS_MODEL_OUTPUT??path.join(base,'Схемы');
const contract=JSON.parse(await fs.readFile(path.join(base,'Клиент/client_contract.json'),'utf8'));
const hash=(data:any)=>createHash('sha256').update(data).digest('hex');
await fs.mkdir(out,{recursive:true});
const model={id:'ppois_client_02',label:'Клиент ИС Юкомс версия 0.2',elements:[] as any[]};
const rects:Record<string,any>={}, routes:Record<string,any>={};
const sheets:any[]=[], printed:any[]=[], roleViews:Record<string,string[]>={};
const add=(kind:string,id:string,label='',properties:Record<string,string>={})=>{
 if(model.elements.some(e=>e.id===id))throw Error('Repeated ID '+id);
 model.elements.push({kind,id,label,properties});return id;
};
const block=(id:string,label:string,shape='rectangle',role='generic')=>add('block',id,label,{shape,role});
function sheet(id:string,label:string,width:number,height:number,print=true){
 add('diagram',id,label,{type:'general'});sheets.push({id,label,width,height,print});
}
function view(sheet:string,element:string,x:number,y:number,width:number,height:number){
 const id='v_'+sheet+'_'+element;add('view',id,'',{diagram:sheet,element});rects[id]={x,y,width,height};return id;
}
function link(sheet:string,id:string,from:string,to:string,points:number[][],label='',kind='association',labelAt?:number[]){
 add('link',id,label,{from,to,kind});const vid='v_'+sheet+'_'+id;
 add('view',vid,'',{diagram:sheet,element:id,from:'v_'+sheet+'_'+from,to:'v_'+sheet+'_'+to});
 routes[vid]={bends:points.slice(1,-1).map(([x,y])=>({x,y}))};
 printed.push({sheet,id,from,to,points,label,kind,labelAt});
}
function treeLink(sheet:string,id:string,from:string,to:string){
 const a=rects['v_'+sheet+'_'+from],b=rects['v_'+sheet+'_'+to];const mid=(a.x+a.width+b.x)/2;
 link(sheet,id,from,to,[[a.x+a.width,a.y+a.height/2],[mid,a.y+a.height/2],[mid,b.y+b.height/2],[b.x,b.y+b.height/2]]);
}
block('client','Клиент ИС Юкомс\nВерсия 0.2');block('main','Основные\nфункции');block('service','Служебные\nфункции');
for(const f of contract.functions){
 const label=f.id==='B4'?'Подбор и проверка, расчёт цены и массы':f.label;
 block(f.id,f.id+' · '+label);
}
const groups=new Map<string,any>();
for(const f of contract.functions){const key=f.branch+'_'+f.group;if(!groups.has(key)){const id='function_group_'+groups.size;groups.set(key,{id,label:f.group,branch:f.branch,functions:[]});block(id,f.group);}groups.get(key).functions.push(f.id);}
sheet('overview','Корень дерева функций',1500,520);
view('overview','client',40,195,360,120);view('overview','main',650,65,760,110);view('overview','service',650,345,760,110);
treeLink('overview','tree_client_main','client','main');treeLink('overview','tree_client_service','client','service');
for(const branch of ['main','service']){
 const chart='functions_'+branch;
 const spec=contract.functions.filter((f:any)=>f.branch===branch);const height=spec.length*100+80;
 sheet(chart,branch==='main'?'Основные функции клиента':'Служебные функции клиента',1520,height);
 view(chart,branch,20,height/2-50,280,100);
 for(const [i,f] of spec.entries())view(chart,f.id,800,40+i*100,680,90);
 for(const group of [...groups.values()].filter(g=>g.branch===branch)){
  const y=group.functions.reduce((sum:number,id:string)=>sum+rects['v_'+chart+'_'+id].y,0)/group.functions.length;
  view(chart,group.id,370,y,330,90);treeLink(chart,'tree_'+branch+'_'+group.id,branch,group.id);
  for(const id of group.functions)treeLink(chart,'tree_'+group.id+'_'+id,group.id,id);
 }
}
const canonical=model.elements.filter(e=>e.kind==='link'&&e.id.startsWith('tree_'));
const canonicalNodes=['client','main','service',...[...groups.values()].map(g=>g.id),...contract.functions.map((f:any)=>f.id)];
if(canonical.length!==canonicalNodes.length-1)throw Error('Incomplete canonical function tree');
for(const id of canonicalNodes)if(canonical.filter(e=>e.properties.to===id).length!==(id==='client'?0:1))throw Error('Invalid function parent '+id);
const reached=new Set<string>();
function walk(id:string){if(reached.has(id))throw Error('Function tree cycle');reached.add(id);for(const e of canonical.filter(e=>e.properties.from===id))walk(e.properties.to);}
walk('client');if(reached.size!==canonicalNodes.length)throw Error('Disconnected canonical function tree');

// Role sheets share function semantics with the canonical tree. They are
// available in the native project; the report gives their complete matrix.
for(const [role,spec] of Object.entries(contract.roles) as any){
 const id='role_'+role;const allowed=contract.functions.filter((f:any)=>spec.functions.includes(f.id));roleViews[role]=allowed.map((f:any)=>f.id);
 const principal='principal_'+role;
 sheet(id,'Функции роли '+spec.label,2180,900,false);block(principal,spec.label+'\n'+role);view(id,principal,20,350,300,100);
 for(const [bi,branch] of ['main','service'].entries()){
  const items=allowed.filter((f:any)=>f.branch===branch);if(!items.length)continue;
  const b=id+'_'+branch;block(b,branch==='main'?'Основные функции':'Служебные функции');view(id,b,400,40+bi*450,430,90);
  treeLink(id,id+'_branch_'+branch,principal,b);
  for(const [i,f] of items.entries()){
   view(id,f.id,1000,25+(bi?475:0)+i*62,1120,56);treeLink(id,id+'_'+f.id,b,f.id);
  }
 }
 if(JSON.stringify(roleViews[role].sort())!==JSON.stringify([...spec.functions].sort()))throw Error('Role view mismatch '+role);
}

// Dialogs describe observable UI states and server outcomes, not a fictitious
// production publication workflow. No external action is in the 0.2 model.
sheet('engineer_dialog','Диалог инженера от входа до расчёта',1520,1130);
const engineer=[
 ['e_login','Учебный вход\nИнженер',480,30,510,90,'rounded'],
 ['e_auth','Сеанс\nоткрыт?',555,160,360,150,'diamond'],
 ['e_bad','Неверный пароль\nПоказать ошибку',30,190,360,90,'rectangle'],
 ['e_select','Выбрать конфигурацию\nи исходную версию',480,355,510,90,'rectangle'],
 ['e_edit','Изменить позиции\nи количество локально',480,490,510,90,'rectangle'],
 ['e_calc','Проверить и рассчитать\nPOST /api/calculate',480,625,510,90,'rectangle'],
 ['e_ok','Расчёт\nуспешен?',555,765,360,150,'diamond'],
 ['e_error','422 · Причина ошибки\nВернуться к составу',30,795,360,90,'rectangle'],
 ['e_result','Показать позиции\nцену и массу',1090,795,380,90,'rectangle'],
 ['e_next','Перейти к сохранению\nновой версии',1090,980,380,90,'rounded'],
] as const;
for(const [id,label,x,y,w,h,shape] of engineer){block(id,label,shape);view('engineer_dialog',id,x,y,w,h);}
link('engineer_dialog','e1','e_login','e_auth',[[735,120],[735,160]],'','directed');
link('engineer_dialog','e2','e_auth','e_select',[[735,310],[735,355]],'Да','directed',[785,340]);
link('engineer_dialog','e3','e_auth','e_bad',[[555,235],[390,235]],'Нет','directed',[455,218]);
link('engineer_dialog','e4','e_bad','e_login',[[210,190],[210,75],[480,75]],'Исправить','directed',[340,57]);
link('engineer_dialog','e5','e_select','e_edit',[[735,445],[735,490]],'','directed');
link('engineer_dialog','e6','e_edit','e_calc',[[735,580],[735,625]],'','directed');
link('engineer_dialog','e7','e_calc','e_ok',[[735,715],[735,765]],'','directed');
link('engineer_dialog','e8','e_ok','e_error',[[555,840],[390,840]],'Нет','directed',[455,821]);
link('engineer_dialog','e9','e_error','e_edit',[[210,795],[210,535],[480,535]],'Исправить','directed',[340,517]);
link('engineer_dialog','e10','e_ok','e_result',[[915,840],[1090,840]],'Да','directed',[1003,820]);
link('engineer_dialog','e11','e_result','e_next',[[1280,885],[1280,980]],'','directed');

sheet('save_dialog','Сохранение новой версии инженером',1520,1030);
const save=[
 ['s_start','Сохранить новую версию\nPOST /api/versions',470,25,550,90,'rounded'],
 ['s_guard','Данные и expected_latest\nпроверены сервером',470,155,550,90,'rectangle'],
 ['s_ok','Запись\nуспешна?',565,290,360,150,'diamond'],
 ['s_conflict','409 · Версия изменена\nОбновить данные',25,320,430,90,'rectangle'],
 ['s_invalid','422 · Неверный ввод\nИсправить состав',1080,320,410,90,'rectangle'],
 ['s_state','Новая версия\nCHECKED?',565,505,360,150,'diamond'],
 ['s_draft','DRAFT · Причины ошибки\nИсправить новую версию',25,540,430,100,'rectangle'],
 ['s_checked','CHECKED\nПоказать новую версию',1080,540,410,100,'rectangle'],
 ['s_finish','Передать номер версии\nменеджеру для ревизии',1080,790,410,100,'rounded'],
] as const;
for(const [id,label,x,y,w,h,shape] of save){block(id,label,shape);view('save_dialog',id,x,y,w,h);}
link('save_dialog','s1','s_start','s_guard',[[745,115],[745,155]],'','directed');
link('save_dialog','s2','s_guard','s_ok',[[745,245],[745,290]],'','directed');
link('save_dialog','s3','s_ok','s_conflict',[[565,365],[455,365]],'409','directed',[500,348]);
link('save_dialog','s4','s_ok','s_invalid',[[925,365],[1080,365]],'422','directed',[1000,348]);
link('save_dialog','s5','s_ok','s_state',[[745,440],[745,505]],'200','directed',[785,481]);
link('save_dialog','s6','s_state','s_draft',[[565,580],[455,580]],'Нет','directed',[510,562]);
link('save_dialog','s7','s_state','s_checked',[[925,580],[1080,580]],'Да','directed',[1000,562]);
link('save_dialog','s8','s_checked','s_finish',[[1285,640],[1285,790]],'','directed');

sheet('manager_dialog','Диалог менеджера создания ревизии',1520,1000);
const manager=[
 ['m_select','Вход менеджера\nВыбрать карточку и версию',465,25,570,90,'rounded'],
 ['m_checked','Версия\nCHECKED или\nFROZEN?',560,165,380,160,'diamond'],
 ['m_disabled','DRAFT\nСохранение недоступно',20,190,430,105,'rectangle'],
 ['m_form','Заполнить название и описание\nи экономические параметры',465,370,570,110,'rectangle'],
 ['m_save','Сохранить новую ревизию\nPOST /api/revisions',465,530,570,90,'rectangle'],
 ['m_ok','Сервер\nсохранил?',560,670,380,160,'diamond'],
 ['m_error','409 / 422 · Ошибка\nОбновить или исправить',20,705,430,100,'rectangle'],
 ['m_success','Новая ревизия DRAFT\nБез отправки',1080,705,410,100,'rounded'],
] as const;
for(const [id,label,x,y,w,h,shape] of manager){block(id,label,shape);view('manager_dialog',id,x,y,w,h);}
link('manager_dialog','m1','m_select','m_checked',[[750,115],[750,165]],'','directed');
link('manager_dialog','m2','m_checked','m_disabled',[[560,245],[450,245]],'Нет','directed',[505,226]);
link('manager_dialog','m3','m_disabled','m_select',[[235,190],[235,70],[465,70]],'Выбрать другую','directed',[335,54]);
link('manager_dialog','m4','m_checked','m_form',[[750,325],[750,370]],'Да','directed',[795,353]);
link('manager_dialog','m5','m_form','m_save',[[750,480],[750,530]],'','directed');
link('manager_dialog','m6','m_save','m_ok',[[750,620],[750,670]],'','directed');
link('manager_dialog','m7','m_ok','m_error',[[560,750],[450,750]],'Нет','directed',[505,732]);
link('manager_dialog','m8','m_error','m_form',[[235,705],[235,425],[465,425]],'Исправить','directed',[335,406]);
link('manager_dialog','m9','m_ok','m_success',[[940,750],[1080,750]],'Да','directed',[1007,732]);

sheet('structure','Структура реализованных модулей',1580,900);
const modules=[
 ['html','Видимые формы\nclient.html и client.css',30,50,440,140,'rectangle','client'],
 ['dialog','Состояние и диалог\nclient.js · state render',570,50,440,140,'rectangle','client'],
 ['http','HTTP клиент\nclient.js · api run',1110,50,440,140,'rectangle','client'],
 ['handler','HTTP обработчик и сеанс\nserver.py · Handler',1110,350,440,150,'rectangle','authentication'],
 ['application','Прикладные операции\nserver.py · Application',570,350,440,150,'rectangle','application'],
 ['domain','Подбор и Decimal расчёт\nПрототип/domain.py',30,350,440,150,'rectangle','application'],
 ['rules','Роли, функции и маршруты\nclient_contract.json',1110,695,440,140,'document','authorization'],
 ['storage','Транзакции и загрузка БД\nApplication.database\nПрототип/repository.py',570,675,440,180,'rectangle','storage'],
 ['database','PostgreSQL\n12 таблиц и card_status\nОтдельная БД ppois10_*',30,675,440,180,'cylinder','database'],
] as const;
for(const [id,label,x,y,w,h,shape,role] of modules){block(id,label,shape,role);view('structure',id,x,y,w,h);}
link('structure','module1','html','dialog',[[470,120],[570,120]],'DOM','directed',[520,103]);
link('structure','module2','dialog','http',[[1010,120],[1110,120]],'Действие','directed',[1060,103]);
link('structure','module3','http','handler',[[1330,190],[1330,350]],'HTTP / JSON','directed',[1430,275]);
link('structure','module4','handler','application',[[1110,425],[1010,425]],'Допуск','directed',[1060,406]);
link('structure','module5','application','domain',[[570,425],[470,425]],'Расчёт','directed',[520,406]);
link('structure','module6','application','storage',[[790,500],[790,675]],'SQL транзакция','directed',[910,590]);
link('structure','module7','storage','database',[[570,765],[470,765]],'SQL','directed',[520,744]);
link('structure','module8','rules','handler',[[1330,695],[1330,500]],'Проверка права','directed',[1430,605]);

const document=schemeEngine.create(model);Object.assign(document.layout.nodes,rects);Object.assign(document.layout.edges,routes);
const diagnostics=schemeEngine.validate(model);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const nativeFile='ПР10_Клиент_функции_диалоги.omni';const encoded=await encodeProject(document);
await fs.writeFile(path.join(out,nativeFile),encoded+'\n');
const decoded=await decodeProject(encoded);
const normalize=(m:any)=>JSON.stringify({id:m.id,label:m.label,elements:m.elements.map((e:any)=>({id:e.id,kind:e.kind,label:e.label,
 properties:Object.fromEntries(Object.entries(e.properties).sort(([a],[b])=>a.localeCompare(b)))})).sort((a:any,b:any)=>a.id.localeCompare(b.id))});
if(normalize(decoded.model)!==normalize(model)){
 const first=model.elements.find(e=>normalize({id:'',label:'',elements:[e]})!==normalize({id:'',label:'',elements:decoded.model.elements.filter((n:any)=>n.id===e.id)}));
 console.error(JSON.stringify({expected:first,actual:decoded.model.elements.find((e:any)=>e.id===first?.id)}));throw Error('Native semantic round trip differs');
}
const emitted=[];
for(const spec of sheets.filter(s=>s.print)){
 const views=model.elements.filter(e=>e.kind==='view'&&e.properties.diagram===spec.id&&!e.properties.from);
 for(const [i,a] of views.entries())for(const b of views.slice(i+1))if(intersects(rects[a.id],rects[b.id],0))throw Error('Node overlap '+a.id+' / '+b.id);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8" fill="none" stroke="#273444" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="white"/>`;
 for(const edge of printed.filter(e=>e.sheet===spec.id)){
  svg+=`<polyline points="${edge.points.map((p:any)=>p.join(',')).join(' ')}" fill="none" stroke="#273444" stroke-width="2.3"${edge.kind==='directed'?' marker-end="url(#arrow)"':''}/>`;
  if(edge.label){const [x,y]=edge.labelAt;svg+=`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="24">${escape(edge.label)}</text>`;}
 }
 for(const v of views){const n=model.elements.find(e=>e.id===v.properties.element),box=rects[v.id];const {x,y,width:w,height:h}=box;let shape='';
  if(n.properties.shape==='diamond')shape=`<polygon points="${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}" fill="white" stroke="#273444" stroke-width="2.3"/>`;
  else if(n.properties.shape==='cylinder')shape=`<path d="M${x},${y+20} C${x},${y-7} ${x+w},${y-7} ${x+w},${y+20} V${y+h-20} C${x+w},${y+h+7} ${x},${y+h+7} ${x},${y+h-20} Z" fill="white" stroke="#273444" stroke-width="2.3"/><path d="M${x},${y+20} C${x},${y+47} ${x+w},${y+47} ${x+w},${y+20}" fill="none" stroke="#273444" stroke-width="2.3"/>`;
  else shape=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${n.properties.shape==='rounded'?h/2:5}" fill="white" stroke="#273444" stroke-width="2.3"/>`;
  const lines=await wrap(n.label,w-(n.properties.shape==='diamond'?140:35),28);
  if(lines.length*32>h-(n.properties.shape==='diamond'?55:12))throw Error('Label overflow '+n.id);
  if(n.properties.shape==='diamond')for(const [i,line] of lines.entries()){
   const dy=Math.abs(-(lines.length-1)*16+i*32)+15;
   if(await measure(line,28)>w*(1-2*dy/h)-16)throw Error('Label touches diamond '+n.id);
  }
  svg+=shape+`<text text-anchor="middle" font-family="Arial" font-size="28" fill="#111827">${lines.map((line:string,i:number)=>`<tspan x="${x+w/2}" y="${y+h/2-(lines.length-1)*16+i*32+10}">${escape(line)}</tspan>`).join('')}</text>`;
 }
 svg+='</svg>';const stem='ПР10_'+spec.id;await fs.writeFile(path.join(out,stem+'.svg'),svg);
 await sharp(Buffer.from(svg)).resize({width:3040}).png().toFile(path.join(out,stem+'.png'));
 emitted.push({sheet:spec.id,file:stem+'.png',sha256:hash(await fs.readFile(path.join(out,stem+'.png')))});
}
const manifest={notation:'SCHEME',scope:'function tree role views dialog states and implemented module connections',
 native_file:nativeFile,native_sha256:hash(await fs.readFile(path.join(out,nativeFile))),
 contract_sha256:hash(await fs.readFile(path.join(base,'Клиент/client_contract.json'))),source_sha256:hash(await fs.readFile(fileURLToPath(import.meta.url))),
 canonical_tree:{nodes:canonicalNodes.length,links:canonical.length,unique_parent:true,reachable:reached.size,functions:contract.functions.map((f:any)=>f.id)},
 roles:roleViews,sheets,emitted,diagnostics,semantic_round_trip:true};
await fs.writeFile(path.join(out,'ПР10_Модели.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Client10 models: ${sheets.length} editable sheets, ${emitted.length} print figures, ${canonical.length} canonical tree links`);
