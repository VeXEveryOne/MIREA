// PPOIS 4: one semantic design, small readable sheets, no unrelated analysis views.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {omniModule} from '../../../tools/runtime.mjs';
const {textModel, decodeUml, layoutUml} = await omniModule('src/notations/uml/document.ts');
const {generateUnified} = await omniModule('src/language/unified.ts');
const {encodeProject} = await omniModule('src/persistence/project.ts');
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Схемы');
const modelOutput = process.env.PPOIS_MODEL_OUTPUT ?? directory;
await fs.mkdir(modelOutput, {recursive: true});
type Element = {id: string; kind: string; label: string; properties: Record<string, string>};
function recipe(id: string, label: string) {
  const model = {id, label, elements: [] as Element[]};
  const rects: Record<string, any> = {};
  const edges: Record<string, any> = {};
  function add(kind: string, id: string, label = '', properties: Record<string, string> = {}) {
    model.elements.push({kind, id, label, properties}); return id;
  }
  function view(sheet: string, element: string, rect?: number[]) {
    const id = `v_${sheet}_${element}`;
    add('view', id, '', {diagram: sheet, element});
    if (rect) {const [x,y,width,height] = rect; rects[id] = {x,y,width,height};}
    return id;
  }
  function edgeView(sheet: string, id: string, from: string, to: string) {
    add('view', `v_${sheet}_${id}`, '', {diagram: sheet, element: id, from: `v_${sheet}_${from}`, to: `v_${sheet}_${to}`});
  }
  async function save(name: string) {
    const source = generateUnified(textModel(model));
    const layout = layoutUml(model);
    Object.assign(layout.nodes, rects);
    Object.assign(layout.edges, edges);
    const document = decodeUml({formatVersion:2,notation:'UML',profile:'NS-UML-2.5.1-2',model,source,draft:source,layout});
    await fs.writeFile(path.join(modelOutput, name), await encodeProject(document) + '\n');
    return document;
  }
  return {model, rects, edges, add, view, edgeView, save};
}

const r = recipe('ppois_design', 'Проектирование ИС подготовки карточек ООО «Юкомс»');
const {add, view, edgeView} = r;
for (const type of ['UUID','String','Integer','Decimal','DateTime','Boolean','JSON','Void','CheckResult','CalculationResult','PreparedRequest','ExternalResult']) {
  add('datatype', type, type, {primitive: 'true'});
}
const classes = [
  ['Configuration','Конфигурация','entity', [['id {PK}','UUID'],['code','String']], [['findAffected','String','JSON']]],
  ['BomVersion','Версия BOM','entity', [['id {PK}','UUID'],['number','Integer'],['state','String'],['createdAt','DateTime']], [['getSnapshot','Void','JSON'],['markChecked','CheckResult','Void']]],
  ['BomSlot','Позиция BOM','entity', [['id {PK}','UUID'],['roleCode','String'],['selectionMode','String'],['quantity','Integer']], [['selectOffer','Offer','Void']]],
  ['ComponentGroup','Группа комплектующих','entity', [['id {PK}','UUID'],['code','String'],['constraints','JSON']], [['matches','Component','Boolean']]],
  ['Component','Комплектующая','entity', [['id {PK}','UUID'],['name','String'],['attributes','JSON'],['massKg','Decimal']], [['getAttributes','Void','JSON']]],
  ['Offer','Предложение поставщика','entity', [['id {PK}','UUID'],['supplierCode','String'],['priceRub','Decimal'],['stock','Integer'],['observedAt','DateTime']], [['isFresh','DateTime','Boolean']]],
  ['Card','Карточка товара','entity', [['id {PK}','UUID'],['sellerCode','String']], [['newRevision','BomVersion','CardRevision']]],
  ['CardRevision','Ревизия карточки','entity', [['id {PK}','UUID'],['state','String'],['priceRub','Decimal'],['massKg','Decimal'],['attributes','JSON']], [['getSnapshot','Void','JSON'],['markStale','Void','Void']]],
  ['Image','Изображение','entity', [['id {PK}','UUID'],['uri','String'],['checksum','String']], [['validate','Void','CheckResult']]],
  ['PublicationAttempt','Попытка публикации','entity', [['id {PK}','UUID'],['externalTaskId','String'],['state','String'],['errorCode','String'],['nextCheckAt','DateTime']], [['recordResult','ExternalResult','Void']]],
  ['BomForm','Форма BOM','boundary', [['draftData','JSON']], [['submit','JSON','CheckResult'],['showErrors','CheckResult','Void']]],
  ['CardForm','Форма карточки','boundary', [['revisionId','UUID']], [['publish','UUID','PublicationAttempt'],['showStatus','PublicationAttempt','Void']]],
  ['MarketplaceGateway','Шлюз маркетплейса','boundary', [['baseUrl','String'],['credentialRef','String']], [['prepareRequest','CardRevision','PreparedRequest'],['send','PreparedRequest','ExternalResult'],['getResult','String','ExternalResult']]],
  ['BomControl','Управление BOM','control', [], [['formVersion','JSON','BomVersion'],['resolveSlots','BomVersion','CheckResult'],['replacePreview','JSON','JSON']]],
  ['Compatibility','Проверка совместимости','control', [['rules','JSON']], [['checkCompatibility','BomVersion','CheckResult']]],
  ['Calculation','Расчёт показателей','control', [['pricingPolicy','JSON']], [['calculate','BomVersion','CalculationResult']]],
  ['Readiness','Проверка готовности','control', [], [['checkReadiness','CardRevision','CheckResult']]],
  ['PublicationControl','Управление публикацией','control', [['retryLimit','Integer']], [['requestPublication','CardRevision','PublicationAttempt'],['checkOutcome','PublicationAttempt','ExternalResult'],['mayRetry','PublicationAttempt','Boolean']]],
] as const;
for (const [id,label,role,attributes,operations] of classes) {
  add('class', id, label, {role});
  for (const [order, [label,type]] of attributes.entries()) add('attribute', `${id}_a${order}`, label, {owner: id, classifier: type, visibility: 'private', order: String(order)});
  for (const [order, [name,input,output]] of operations.entries()) {
    const operation = add('operation', `${id}_${name}`, name, {owner: id, visibility: 'public', order: String(order)});
    if (input !== 'Void') add('parameter', `${operation}_input`, 'data', {owner: operation, classifier: input, direction: 'in', order: '0'});
    add('parameter', `${operation}_return`, '', {owner: operation, classifier: output, direction: 'return', order: '1'});
  }
}
type Relation = [string,string,string,string,string,string,string,string?];
// The composite Property is typed by the part; OmniNotation draws its diamond
// at the opposite (whole) classifier, as required by the UML metamodel.
const relations: Relation[] = [
  ['config_versions','Configuration','1','BomVersion','0..*','versions','analysis_bom','composite'],
  ['version_slots','BomVersion','1','BomSlot','0..*','slots','analysis_bom','composite'],
  ['slot_group','BomSlot','0..*','ComponentGroup','0..1','group','analysis_bom'],
  ['slot_component','BomSlot','0..*','Component','0..1','resolved component','analysis_bom'],
  ['component_offers','Component','1','Offer','0..*','offers','analysis_bom'],
  ['slot_offer','BomSlot','0..*','Offer','0..1','selected offer','analysis_bom'],
  ['card_revisions','Card','1','CardRevision','0..*','revisions','analysis_card','composite'],
  ['revision_bom','BomVersion','1','CardRevision','0..*','snapshot','analysis_card'],
  ['revision_attempts','CardRevision','1','PublicationAttempt','0..*','attempts','analysis_card','composite'],
  ['revision_images','CardRevision','0..*','Image','0..*','images','analysis_card'],
];
for (const [id,from,fromMultiplicity,to,toMultiplicity,label,sheet,aggregation] of relations) {
  add('association',id,label);
  function end(side: string, classifier: string, multiplicity: string, order: string, whole = false) {
    const [lower, upper = lower] = multiplicity.split('..');
    add('end', `${id}_${side}`, '', {owner:id,classifier,lower,upper,order,...(whole && aggregation ? {aggregation} : {})});
  }
  end('a',from,fromMultiplicity,'0'); end('b',to,toMultiplicity,'1',true);
  edgeView(sheet,id,from,to);
}
add('diagram','analysis_bom','Классы проектирования: конфигурации, позиции и предложения',{type:'class'});
for (const [id,rect] of [
  ['Configuration',[40,40,350,220]],['BomVersion',[520,40,380,250]],['BomSlot',[1050,40,420,280]],
  ['ComponentGroup',[1050,430,420,220]],['Component',[520,430,380,250]],['Offer',[40,430,350,300]],
] as const) view('analysis_bom',id,[...rect]);
// Separate the three slot references at distinct bottom ports; crowded automatic
// ports can displace multiplicities far from the association they describe.
r.edges.v_analysis_bom_slot_group = {bends:[{x:1320,y:380}],label:{x:1420,y:385}};
r.edges.v_analysis_bom_slot_component = {
  bends:[{x:1150,y:390},{x:950,y:390},{x:950,y:520}],label:{x:970,y:415},
};
r.edges.v_analysis_bom_slot_offer = {
  bends:[{x:1075,y:355},{x:470,y:355},{x:470,y:650}],label:{x:730,y:345},
};
add('diagram','analysis_card','Классы проектирования: неизменяемые ревизии и попытки публикации',{type:'class'});
for (const [id,rect] of [
  ['Card',[40,40,360,220]],['CardRevision',[560,40,440,310]],['PublicationAttempt',[1160,40,480,310]],
  ['BomVersion',[40,470,360,250]],['Image',[560,470,440,220]],
] as const) view('analysis_card',id,[...rect]);
// Route the BOM snapshot link in the inter-column gutter, never on the image link.
r.edges.v_analysis_card_revision_bom = {
  bends: [{x:220,y:395},{x:480,y:395},{x:480,y:290}],
  label: {x:340,y:380},
};
for (const [sheet,label,entries] of [
  ['services_bom','Управление подготовкой состава',[
    ['BomForm',[40,40,510,190]],['BomControl',[730,40,510,260]],
    ['Compatibility',[40,470,510,190]],['Calculation',[730,470,510,190]],
  ]],
  ['services_publish','Управление публикацией',[
    ['CardForm',[40,40,530,190]],['PublicationControl',[750,40,550,260]],
    ['Readiness',[40,470,530,190]],['MarketplaceGateway',[750,470,550,260]],
  ]],
] as const) {
  add('diagram',sheet,label,{type:'class'});
  for (const [id,rect] of entries) view(sheet,id,[...rect]);
}
for (const [id,sheet,from,to] of [
  ['d1','services_bom','BomForm','BomControl'],['d2','services_bom','BomControl','Compatibility'],
  ['d3','services_bom','BomControl','Calculation'],
  ['d4','services_publish','CardForm','PublicationControl'],['d5','services_publish','PublicationControl','Readiness'],
  ['d6','services_publish','PublicationControl','MarketplaceGateway'],
] as const) {add('dependency',id,'',{from,to}); edgeView(sheet,id,from,to);}
await r.save('ПР4_Модель_проектирования.omni');

const a = recipe('ppois_activity','Подготовка ревизии для публикации');
a.add('activity','work','Подготовить ревизию карточки');
a.add('diagram','prepare','Подготовка и проверка конкретного состава',{type:'activity',activity:'work'});
a.add('diagram','main','Подготовка содержания и передача на публикацию',{type:'activity',activity:'work'});
for (const [sheet,nodes,flows] of [
  ['prepare',[
    ['start','initial','',[570,30,32,32]],['split','fork','',[420,110,330,18]],
    ['compose','action','Задать позиции: группа или точная комплектующая',[40,210,380,90]],
    ['fetch','action','Обновить цены, наличие и время получения предложений',[750,210,400,90]],
    ['join','join','',[420,390,330,18]],
    ['resolve','action','Выбрать комплектующие и предложения; сохранить черновик BOM',[390,490,390,90]],
    ['compat','action','Проверить совместимость состава',[40,490,260,90]],
    ['compatible','decision','Конфликты?',[45,680,250,90]],
    ['continue','action','Подготовить содержание карточки (продолжение на рисунке 6)',[40,885,390,90]],
    ['fix_bom','action','Показать ошибки; вернуть черновик на доработку',[650,680,420,90]],
    ['end_ok','activityFinal','',[210,1080,40,40]],['end_bad','activityFinal','',[840,885,40,40]],
  ],[
    ['start','split',''],['split','compose',''],['split','fetch',''],['compose','join',''],['fetch','join',''],
    ['join','resolve',''],['resolve','compat',''],['compat','compatible',''],
    ['compatible','continue','нет'],['compatible','fix_bom','есть'],['continue','end_ok',''],['fix_bom','end_bad',''],
  ]],
  ['main',[
    ['start_content','initial','',[180,30,32,32]],
    ['calculate','action','Рассчитать себестоимость, цену и массу по проверенному BOM',[40,110,400,90]],
    ['content','action','Подготовить изображения и обязательные атрибуты',[40,280,400,90]],
    ['ready','action','Создать неизменяемую ревизию и проверить готовность',[40,450,400,90]],
    ['decision','decision','Проверки пройдены?',[110,620,250,90]],
    ['send','action','Зарегистрировать попытку и передать ревизию модулю публикации',[40,805,400,100]],
    ['fix','action','Показать ошибки; сохранить черновик для доработки',[650,620,400,90]],
    ['done_send','activityFinal','',[210,985,40,40]],['done_fix','activityFinal','',[830,805,40,40]],
  ],[
    ['start_content','calculate',''],['calculate','content',''],['content','ready',''],['ready','decision',''],
    ['decision','send','да'],['decision','fix','else'],['send','done_send',''],['fix','done_fix',''],
  ]],
] as [string,[string,string,string,number[]][],string[][]][]) {
  for (const [id,kind,label,rect] of nodes) {a.add(kind,id,label,{owner:'work',...(kind==='action'?{kind:'opaque'}:{}),...(kind==='join'?{joinSpec:'and'}:{})});a.view(sheet,id,rect);}
  for (const [index,[from,to,guard]] of flows.entries()) {
    const id=`${sheet}_flow${index+1}`;
    a.add('controlFlow',id,'',{owner:'work',from,to,...(guard?{guard}:{})}); a.edgeView(sheet,id,from,to);
  }
}
a.edges.v_prepare_prepare_flow2 = {bends:[{x:460,y:165},{x:230,y:165}]};
a.edges.v_prepare_prepare_flow3 = {bends:[{x:710,y:165},{x:950,y:165}]};
a.edges.v_prepare_prepare_flow4 = {bends:[{x:230,y:350},{x:460,y:350},{x:460,y:365}]};
a.edges.v_prepare_prepare_flow5 = {bends:[{x:950,y:350},{x:710,y:350},{x:710,y:365}]};
await a.save('ПР4_Модель_деятельности.omni');

const exportManifest = {
  output: '.',
  options: {format:'png',background:'white',monochrome:true,title:false,legend:false,targetWidth:3000,font:'Arial'},
  jobs: [
    ...['analysis_bom','analysis_card','services_bom','services_publish'].map((diagramId,index)=>({file:'ПР4_Модель_проектирования.omni',diagramId,title:`ПР4_0${index+1}_Классы`})),
    {file:'ПР4_Модель_деятельности.omni',diagramId:'prepare',title:'ПР4_05_Деятельность_BOM'},
    {file:'ПР4_Модель_деятельности.omni',diagramId:'main',title:'ПР4_06_Деятельность_Карточка'},
  ],
};
await fs.writeFile(path.join(modelOutput,'ПР4_Экспорт.json'),JSON.stringify(exportManifest,null,2)+'\n');
console.log(JSON.stringify({classes:classes.length,relations:relations.length,output:modelOutput}));
