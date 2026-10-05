/* Local educational client 0.2. Data is rendered as text, never HTML markup. */
'use strict';

const root = document.getElementById('app');
const state = {contract:null, session:null, data:{}, page:'help', busy:false, message:'', severity:'',
  configurationId:null, version:0, slots:[], dirty:false, pendingSelection:null, pendingLogout:false,
  newCode:'', newName:'', cardId:null, revision:{title:'Учебный ПК AM5',description:'Учебный расчётный снимок без внешней публикации',
    seller_code:'',name:''}, result:null, diagnostics:null,
  policy:{assembly_rub:'2000',packaging_rub:'500',logistics_rub:'700',markup_rate:'0.20',commission_rate:'0.15',
    round_step_rub:'100',packaging_mass_kg:'0.800'}};
const labels = {catalog:'Каталог и предложения',configurations:'Версии состава',calculation:'Проверка и расчёт',
  cards:'Карточки и ревизии',publications:'Результаты публикаций',diagnostics:'Диагностика',help:'Справка'};
const policyLabels = {assembly_rub:'Сборка, ₽',packaging_rub:'Упаковка, ₽',logistics_rub:'Логистика, ₽',
  markup_rate:'Наценка, доля',commission_rate:'Комиссия, доля',round_step_rub:'Шаг округления, ₽',packaging_mass_kg:'Упаковка, кг'};

function dom(tag, attributes={}, ...children) {
  const node = document.createElement(tag);
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  for (const [key,value] of Object.entries(attributes)) {
    if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2),value);
    else if (key === 'className') node.className = value;
    else if (key === 'value' || key === 'disabled' || key === 'checked') node[key] = value;
    else node.setAttribute(key,value);
  }
  return node;
}
const can = id => Boolean(state.session?.functions.includes(id));
const shortId = id => id ? (id.startsWith('00000000-0000-0000-0000-') ? 'U' + id.slice(-3) : id.slice(0,8) + '…') : '—';
const field = (label,control) => dom('label',{className:'field'},dom('span',{},label),control);
const option = (value,label) => dom('option',{value},label);
const button = (label,action,primary=false,disabled=false) => dom('button',{type:'button',className:primary?'primary':'',
  disabled:disabled || state.busy,onclick:action},label);
const paragraph = (text,cls='muted') => dom('p',{className:cls},text);
const panel = (title,...body) => dom('section',{className:'panel'},dom('h2',{},title),...body);
function table(headers,rows) {
  return dom('div',{className:'table-scroll'},dom('table',{},dom('thead',{},dom('tr',{},headers.map(h=>dom('th',{scope:'col'},h)))),
    dom('tbody',{},rows.map(row=>dom('tr',{},row.map(value=>dom('td',{},value ?? '—')))))));
}
function invalidateResult() {
  state.result = null;
  document.getElementById('calculation-result')?.replaceChildren();
}
function changeSlot(row,key,value) {row[key]=value; state.dirty=true; invalidateResult();}
async function api(path,data) {
  const response = await fetch(path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','X-CSRF-Token':state.session?.csrf ?? ''},body:data===undefined?undefined:JSON.stringify(data)});
  const value = await response.json();
  if (!response.ok) {const error = new Error(value.error ?? 'Ошибка запроса'); error.status=response.status; throw error;}
  return value;
}
async function run(action) {
  if (state.busy) return;
  state.busy=true; state.message=''; render();
  try {await action();}
  catch(error) {
    state.message=error.message; state.severity='error';
    if (error.status===401) {state.session=null; state.data={};state.slots=[];state.dirty=false;}
  } finally {state.busy=false; render();}
}
function notice(message,severity='success') {state.message=message;state.severity=severity;}
function configurations() {return state.data.configurations ?? [];}
function currentVersion() {return configurations().find(r=>r.id===state.configurationId && r.version_no===state.version);}
function latestVersion() {return Math.max(0,...configurations().filter(r=>r.id===state.configurationId).map(r=>r.version_no));}
function defaultSlots() {
  const groups = state.data.catalog?.component_group ?? [];
  return ['CPU-AM5','BOARD-AM5','RAM-DDR5','SSD-M2','CASE-ATX','PSU-650'].map((code,i)=>({line_no:i+1,
    quantity:code==='RAM-DDR5'?2:1,group_id:groups.find(g=>g.code===code)?.id ?? null,requested_component_id:null}));
}
async function loadBom() {
  if (!state.configurationId) {state.slots=defaultSlots();return;}
  const rows = await api('/api/bom?configuration_id=' + encodeURIComponent(state.configurationId) + '&version_no=' + state.version);
  state.slots = rows.map(({line_no,quantity,group_id,requested_component_id})=>({line_no,quantity,group_id,requested_component_id}));
  state.dirty=false; invalidateResult();
}
async function loadData() {
  const jobs = [['catalog','/api/catalog','B1'],['configurations','/api/configurations','B2'],
    ['cards','/api/cards','B5'],['publications','/api/publications','B7']].filter(([, , permission])=>can(permission));
  const values = await Promise.all(jobs.map(async([key,path])=>[key,await api(path)]));
  state.data=Object.fromEntries(values);
  if (can('B2') && !configurations().some(c=>c.id===state.configurationId && c.version_no===state.version)) {
    const first = configurations()[0]; state.configurationId=first?.id ?? null;state.version=first?.version_no ?? 0;
  }
  if (can('B2')) await loadBom();
  if (can('B5') && !state.data.cards.cards.some(c=>c.id===state.cardId)) state.cardId=state.data.cards.cards[0]?.id ?? null;
}
function availablePages() {return Object.keys(labels).filter(page=>state.contract.functions.some(f=>f.page===page && can(f.id)));}
async function selectConfiguration(value) {
  if (value==='new') {state.configurationId=null;state.version=0;state.slots=defaultSlots();state.newCode='';state.newName='';state.dirty=true;invalidateResult();return;}
  const [id,version] = value.split('/');state.configurationId=id;state.version=Number(version);await loadBom();
}
function chooseConfiguration(value) {
  if (state.dirty) {state.pendingSelection=value;render();return;}
  run(()=>selectConfiguration(value));
}
function configurationSelector() {
  const value = state.configurationId ? state.configurationId + '/' + state.version : 'new';
  return field('Конфигурация и версия состава',dom('select',{value,disabled:state.busy,onchange:e=>chooseConfiguration(e.target.value)},
    !state.configurationId ? option('new','Новая конфигурация') : null,
    configurations().map(c=>option(c.id+'/'+c.version_no,`${c.code} · версия ${c.version_no} · ${c.state}${c.referenced?' · используется ревизией':''}`))));
}
function selectionWarning() {
  if (!state.pendingSelection) return null;
  const selected=state.pendingSelection;
  return dom('div',{className:'notice error'},'Есть несохранённые изменения состава. Перейти без сохранения?',
    dom('div',{className:'toolbar'},button('Остаться',()=>{state.pendingSelection=null;render();}),
      button('Отменить изменения и перейти',()=>run(async()=>{state.pendingSelection=null;state.dirty=false;await selectConfiguration(selected);} ))));
}
function catalogPage() {
  const data=state.data.catalog;
  return [panel('Комплектующие',paragraph('Каталог доступен только для чтения. Цена хранится в отдельном предложении поставщика.'),
    table(['SKU','Наименование','Группа','Масса, кг','Сокет','Память','Мощность, Вт'],data.component.map(c=>[c.sku,c.name,
      data.component_group.find(g=>g.id===c.group_id)?.code,c.mass_kg,c.socket,c.memory_type,c.power_w]))),
    panel('Предложения поставщиков',paragraph('Цена и остаток — учебные наблюдения, не текущие котировки. Для подбора используется показанное время стенда.'),
    table(['ID','SKU','Поставщик','Цена, ₽','Остаток','Наблюдение'],data.offer.map(o=>[shortId(o.id),
      data.component.find(c=>c.id===o.component_id)?.sku,data.supplier.find(s=>s.id===o.supplier_id)?.code,
      o.unit_price_rub,o.stock,o.observed_at])))];
}
function configurationsPage() {
  const writable=can('B3'); const data=state.data.catalog;
  const rows=state.slots.map(row=>{
    const exact=Boolean(row.requested_component_id);
    const choices=exact?data.component:data.component_group;
    return dom('tr',{},dom('td',{},row.line_no),dom('td',{},dom('select',{value:exact?'component':'group',disabled:!writable||state.busy,
      'aria-label':'Тип выбора строки '+row.line_no,onchange:e=>{
        const isExact=e.target.value==='component'; row.group_id=isExact?null:data.component_group[0].id;
        row.requested_component_id=isExact?data.component[0].id:null;state.dirty=true;invalidateResult();render();
      }},option('group','Группа'),option('component','Точная модель'))),
      dom('td',{className:'selector'},dom('select',{value:exact?row.requested_component_id:row.group_id,disabled:!writable||state.busy,
        'aria-label':'Компонент или группа строки '+row.line_no,onchange:e=>changeSlot(row,exact?'requested_component_id':'group_id',e.target.value)},
        choices.map(c=>option(c.id,`${c.sku ?? c.code} — ${c.name}`)))),
      dom('td',{className:'quantity'},dom('input',{type:'number',min:'1',step:'1',value:row.quantity,disabled:!writable||state.busy,
        'aria-label':'Количество строки '+row.line_no,oninput:e=>changeSlot(row,'quantity',Number(e.target.value))})),
      writable?dom('td',{},button('Убрать',()=>{state.slots=state.slots.filter(s=>s!==row);state.dirty=true;invalidateResult();render();})):null);
  });
  const headers=['Строка','Выбор','Группа или компонент','Кол-во',...(writable?['Новая версия']:[])];
  return [panel('Выбор состава',configurationSelector(),selectionWarning(),
    writable?dom('div',{className:'toolbar'},button('Новая конфигурация',()=>chooseConfiguration('new'))):null),
    panel(writable?'Состав новой версии':'Просмотр сохранённого состава',
      paragraph(writable?'Сохранение всегда создаёт новую версию. Использованный ревизией состав не переписывается.':'Для текущей роли редактирование состава запрещено.'),
      !state.configurationId?dom('div',{className:'grid two'},field('Код конфигурации',dom('input',{value:state.newCode,maxlength:'30',
        disabled:state.busy,oninput:e=>{state.newCode=e.target.value;}})),field('Название',dom('input',{value:state.newName,maxlength:'160',
        disabled:state.busy,oninput:e=>{state.newName=e.target.value;}}))):null,
      dom('div',{className:'table-scroll'},dom('table',{},dom('thead',{},dom('tr',{},headers.map(h=>dom('th',{scope:'col'},h)))),dom('tbody',{},rows))),
      writable?dom('div',{className:'toolbar'},button('Добавить позицию',()=>{
        state.slots.push({line_no:Math.max(0,...state.slots.map(s=>s.line_no))+1,quantity:1,group_id:data.component_group[0].id,requested_component_id:null});
        state.dirty=true;invalidateResult();render();
      },false,state.slots.length>=state.contract.limits.max_slots),button('Сохранить новую версию',()=>run(async()=>{
        const payload={expected_latest:state.configurationId?latestVersion():0,slots:state.slots};
        if (state.configurationId) payload.configuration_id=state.configurationId;
        else {payload.code=state.newCode;payload.name=state.newName;}
        const saved=await api('/api/versions',payload);state.configurationId=saved.configuration_id;state.version=saved.version_no;
        state.dirty=false;await loadData();notice(`Создана версия ${saved.version_no}: ${saved.state}.`+(saved.errors.length?' '+saved.errors.join('; '):' Предложения подобраны и перечисленные правила проверены.'),saved.errors.length?'error':'success');
      }),true)):null)];
}
function policyFields() {
  return dom('div',{className:'grid'},Object.entries(policyLabels).map(([name,label])=>field(label,
    dom('input',{value:state.policy[name],inputmode:'decimal',disabled:state.busy||(!can('B3')&&!can('B6')),
      oninput:e=>{state.policy[name]=e.target.value;invalidateResult();}}))));
}
function calculationOutput() {
  if (!state.result) return dom('div',{id:'calculation-result'});
  const {result,positions}=state.result;
  const metrics=[['Себестоимость, ₽',result.cost_rub],['Цена карточки, ₽',result.price_rub],['Масса с упаковкой, кг',result.mass_kg]];
  return dom('div',{id:'calculation-result'},panel('Результат расчёта',
    table(['Строка','SKU','Кол-во','Цена единицы, ₽','Сумма, ₽','Масса позиции, кг'],positions.map(p=>[
      p.line_no,p.sku,p.quantity,p.unit_price_rub,p.line_cost_rub,p.line_mass_kg])),
    dom('div',{className:'metrics'},metrics.map(([name,value])=>dom('div',{className:'metric'},paragraph(name),dom('strong',{},value)))),
    paragraph('Расчёт выполнен сервером через Decimal. Успех означает проверку сокета, памяти, обязательных позиций и запаса питания; это не полная аппаратная сертификация и не утверждение карточки.')));
}
function calculationPage() {
  return [panel('Источник расчёта',configurationSelector(),selectionWarning(),
    paragraph(can('B3')&&state.dirty?'Проверяется несохранённый состав инженера. Сохраните новую версию перед передачей менеджеру.':'Расчёт использует выбранную сохранённую версию.')),
    panel('Экономические параметры',paragraph('Доли вводятся десятичной дробью с точкой: 0.20 означает 20%. Параметры предварительного расчёта не изменяют сохранённые ревизии.'),policyFields(),
    dom('div',{className:'toolbar'},button('Проверить и рассчитать',()=>run(async()=>{
      const source=can('B3')?{slots:state.slots}:{configuration_id:state.configurationId,version_no:state.version};
      state.result=await api('/api/calculate',{...source,policy:state.policy});notice('Подбор и расчёт выполнены. Карточка не публиковалась.');
    }),true))),calculationOutput()];
}
function cardsPage() {
  const data=state.data.cards; const writable=can('B6');
  const revisions=data.revisions.filter(r=>r.card_id===state.cardId);
  const latest=Math.max(0,...revisions.map(r=>r.revision_no));
  const cardSelect=field('Карточка',dom('select',{value:state.cardId??'',disabled:state.busy,onchange:e=>{state.cardId=e.target.value||null;render();}},
    writable?option('','Новая карточка'):null,data.cards.map(c=>option(c.id,c.seller_code+' — '+c.name))));
  const items=[panel('Сохранённые карточки',cardSelect,table(['Ревизия','Версия состава','Состояние','Заголовок'],revisions.map(r=>[r.revision_no,r.version_no,r.state,r.title])),
    paragraph('Все сохранённые ревизии неизменяемы по содержимому. Новая ревизия здесь создаётся только как DRAFT: готовность атрибутов, изображения и публикация не подтверждаются.'))];
  if (writable) items.push(panel('Новая расчётная ревизия',configurationSelector(),selectionWarning(),
    !state.cardId?dom('div',{className:'grid two'},field('Код продавца',dom('input',{value:state.revision.seller_code,maxlength:'60',disabled:state.busy,
      oninput:e=>state.revision.seller_code=e.target.value})),field('Название карточки',dom('input',{value:state.revision.name,maxlength:'160',disabled:state.busy,
      oninput:e=>state.revision.name=e.target.value}))):null,
    field('Заголовок новой ревизии',dom('input',{value:state.revision.title,maxlength:'200',disabled:state.busy,oninput:e=>state.revision.title=e.target.value})),
    field('Описание новой ревизии',dom('textarea',{value:state.revision.description,maxlength:'5000',disabled:state.busy,oninput:e=>state.revision.description=e.target.value})),
    dom('h3',{},'Параметры расчётного снимка'),policyFields(),
    dom('div',{className:'toolbar'},button('Сохранить новую ревизию DRAFT',()=>run(async()=>{
      const payload={expected_latest:latest,configuration_id:state.configurationId,version_no:state.version,
        title:state.revision.title,description:state.revision.description,policy:state.policy};
      if (state.cardId) payload.card_id=state.cardId;
      else {payload.seller_code=state.revision.seller_code;payload.name=state.revision.name;}
      const saved=await api('/api/revisions',payload);state.cardId=saved.card_id;await loadData();
      notice(`Ревизия ${saved.revision_no} сохранена как DRAFT. ${saved.notice}.`);
    }),true,!state.configurationId||!['CHECKED','FROZEN'].includes(currentVersion()?.state))),
    paragraph('Требуется сохранённая CHECKED/FROZEN-версия с актуальными выбранными предложениями. Сервер повторно проверяет её независимо от состояния кнопки.')));
  const links=data.image_links.filter(l=>l.card_id===state.cardId);
  items.push(panel('Метаданные изображений',table(['Ревизия','Порядок','URI','Размеры, px'],links.map(l=>{
    const image=data.images.find(i=>i.id===l.image_id);return [l.revision_no,l.ordinal,image?.uri,image?image.width_px+' × '+image.height_px:'—'];
  })),paragraph('Показаны тестовые метаданные БД. URI и условный хеш не доказывают наличия файла; загрузка изображений в версии 0.2 не реализована.')));
  return items;
}
function publicationsPage() {
  return [panel('История сохранённых попыток',paragraph('Это данные учебной БД, не ответы нового вызова Ozon. ACCEPTED означает принятие задачи, а не подтверждённую публикацию. UNKNOWN требует сверки, не слепой повторной отправки.'),
    table(['Карточка','Ревизия','Попытка','Состояние','Внешний ID','Следующая сверка'],state.data.publications.map(p=>[
      shortId(p.card_id),p.revision_no,p.attempt_no,p.state,p.external_task_id,p.next_check_at])),
    dom('div',{className:'toolbar'},button('Отправить в Ozon — не реализовано',()=>{},false,true)))];
}
function diagnosticsPage() {
  return [panel('Локальный учебный стенд',paragraph('Администратор не получает бизнес-права автоматически. Диагностика читает служебные сведения ограниченной ролью БД.'),
    button('Проверить соединение',()=>run(async()=>{state.diagnostics=await api('/api/diagnostics');notice('Проверено локальное соединение с отдельной клиентской БД.');}),true),
    state.diagnostics?dom('dl',{className:'definition'},Object.entries(state.diagnostics).flatMap(([k,v])=>[dom('dt',{},k),dom('dd',{},String(v))])):null)];
}
function helpPage() {
  const rows=state.contract.functions.filter(f=>can(f.id)).map(f=>[f.id,f.branch==='main'?'Основная':'Служебная',f.label]);
  return [panel('Как пройти учебный сценарий',paragraph('Инженер выбирает состав, исправляет позиции и сохраняет новую версию. Проверенная версия получает CHECKED; несовместимая остаётся DRAFT с причинами. Затем можно выполнить расчёт.'),
    paragraph('Менеджер выбирает сохранённую CHECKED/FROZEN-версию и создаёт новую расчётную ревизию карточки. Она остаётся DRAFT. Наблюдатель читает данные и выполняет расчёт без записи. Администратор проверяет локальный стенд.'),
    paragraph('Сеанс действует 30 минут. Кнопки соответствуют роли, но каждый API-маршрут также проверяет право на сервере. Прямого обращения браузера к PostgreSQL нет.')),
    panel('Доступные функции текущей роли',table(['Код','Ветка','Функция'],rows)),
    panel('Границы версии 0.2',paragraph('Работа выполняется только на localhost с отдельной ppois10_* базой. Используется фиксированное учебное время и синтетические цены. Общий пароль демонстрационных аккаунтов — coursework-demo; это не промышленная аутентификация.'),
    paragraph('Не реализованы внешний обмен, загрузка изображений, промышленный TLS, аудит пользователей, миграции из интерфейса, проверка нагрузки и восстановление. Подбор по отдельным позициям не ищет альтернативную совместимую комбинацию.'))];
}
const views={catalog:catalogPage,configurations:configurationsPage,calculation:calculationPage,cards:cardsPage,
  publications:publicationsPage,diagnostics:diagnosticsPage,help:helpPage};
function loginPage() {
  const username=dom('select',{name:'username'},Object.entries(state.contract?.roles ?? {}).map(([id,r])=>option(id,r.label+' ('+id+')')));
  const password=dom('input',{type:'password',name:'password',autocomplete:'current-password',required:'',maxlength:'128'});
  return dom('div',{className:'login'},dom('section',{className:'panel'},dom('div',{className:'brand'},'Юкомс',paragraph('Учебный клиент ППОИС · 0.2','small')),
    dom('h1',{},'Демонстрационный вход'),paragraph('Выберите учебную учётную запись. Её права проверяются сервером.'),
    state.message?dom('div',{className:'notice error',role:'alert'},state.message):null,
    dom('form',{onsubmit:e=>{e.preventDefault();run(async()=>{state.session=await api('/api/login',{username:username.value,password:password.value});
      await loadData();state.page=can('B2')?'configurations':'diagnostics';location.hash=state.page;});}},
      field('Учётная запись',username),field('Пароль учебного аккаунта',password),dom('button',{type:'submit',className:'primary',disabled:state.busy},state.busy?'Вход…':'Войти')),
    paragraph('Учебный пароль: coursework-demo. Не вводите пароли реальных сервисов.','small')));
}
async function logout() {await api('/api/logout',{});state.session=null;state.data={};state.slots=[];state.dirty=false;state.pendingLogout=false;state.pendingSelection=null;state.message='';}
function render() {
  if (!state.session) {root.replaceChildren(loginPage());return;}
  const pages=availablePages();if (!pages.includes(state.page)) state.page='help';
  const nav=dom('nav',{'aria-label':'Разделы'},pages.map(page=>dom('button',{type:'button',className:page===state.page?'selected':'',
    'aria-current':page===state.page?'page':'false',disabled:state.busy,onclick:()=>{state.page=page;location.hash=page;render();}},labels[page])));
  const side=dom('aside',{},dom('div',{className:'brand'},'Юкомс',paragraph('Карточки компьютерных систем','small')),nav,
    dom('div',{className:'aside-bottom'},dom('span',{className:'tag'},'Учебная версия 0.2'),button('Выйти',()=>{
      if (state.dirty) {state.pendingLogout=true;render();} else run(logout);
    })));
  const head=dom('header',{className:'page-header'},dom('div',{},dom('h1',{},labels[state.page]),paragraph('Учебное время: '+state.session.control_time,'small')),
    dom('div',{className:'role'},dom('span',{className:'tag'},state.session.label),paragraph(state.session.role,'small')));
  const warning=state.pendingLogout?dom('div',{className:'notice error'},'Состав не сохранён. Завершить сеанс и отменить изменения?',
    dom('div',{className:'toolbar'},button('Остаться',()=>{state.pendingLogout=false;render();}),button('Выйти без сохранения',()=>run(logout)))):null;
  root.replaceChildren(dom('div',{className:'shell'},side,dom('main',{'aria-busy':String(state.busy)},head,warning,
    state.busy?dom('div',{className:'notice',role:'status'},'Запрос выполняется…'):null,
    state.message?dom('div',{className:'notice '+state.severity,role:state.severity==='error'?'alert':'status'},state.message):null,
    views[state.page]())));
}
window.addEventListener('hashchange',()=>{if (!state.busy && state.session) {state.page=location.hash.slice(1);render();}});
window.addEventListener('beforeunload',event=>{if (state.dirty) {event.preventDefault();event.returnValue='';}});
async function init() {
  try {
    const [contract,session]=await Promise.all([api('/contract.json'),api('/api/session').catch(e=>{if(e.status===401)return null;throw e;})]);
    state.contract=contract;state.session=session;
    if (session) {await loadData();state.page=location.hash.slice(1)||availablePages()[0];}
  } catch(e) {state.message=e.message;state.severity='error';}
  render();
}
init();
