// PR4: native UML classes/activity and an editable SCHEME state chart.
import fs from 'node:fs/promises';
import path from 'node:path';
import {omniModule} from '../../../tools/runtime.mjs';
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {textModel,layoutUml}=await omniModule('src/notations/uml/document.ts');
const {generateUnified}=await omniModule('src/language/unified.ts');
const {validateUml}=await omniModule('src/notations/uml/validation.ts');
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const out=path.resolve('4/ППОИС/Схемы'), cache=path.resolve('.cache/ppois-pr45-20261112/pr4');
await fs.mkdir(cache,{recursive:true});
const model:any={id:'ppois4',label:'Модель проектирования ИС карточек ООО «Юкомс»',elements:[]};
const layout:any={nodes:{},edges:{}};
const add=(kind:string,id:string,label='',properties:any={})=>{model.elements.push({kind,id,label,properties});return id;};
function view(sheet:string,id:string,x:number,y:number,width=260,height=200,props:any={}){const v='v_'+sheet+'_'+id;add('view',v,'',{diagram:sheet,element:id,...props});layout.nodes[v]={x,y,width,height};return v;}
function ev(sheet:string,id:string,a:string,b:string){const v='v_'+sheet+'_'+id;add('view',v,'',{diagram:sheet,element:id,from:'v_'+sheet+'_'+a,to:'v_'+sheet+'_'+b});return v;}
for(const id of ['UUID','String','Integer','Decimal','Boolean','DateTime','Void','CheckResult','SlotList'])add('datatype',id,id);
add('enumeration','RevisionState','RevisionState');for(const [i,s] of ['DRAFT','READY','STALE'].entries())add('literal','state_'+s,s,{owner:'RevisionState',order:String(i)});
// Same classifiers as PR3, with explicit properties and operations.
const classes:any[]=[
 ['FormRange','Форма состава','boundary',[['draft','String']],[['submit',[['positions','String']],'CheckResult'],['showResult',[['result','CheckResult']],'Void']]],
 ['ControlRange','Управление составом','control',[['expectedVersion','Integer']],[['check',[['version','Version']],'CheckResult'],['save',[['version','Version']],'Integer']]],
 ['Version','Версия состава','entity',[['id','UUID'],['number','Integer'],['createdAt','DateTime'],['checked','Boolean']],[['getSlots',[],'SlotList'],['save',[],'Integer']]],
 ['Slot','Позиция состава','entity',[['lineNo','Integer'],['componentCode','String'],['quantity','Integer'],['unitPrice','Decimal'],['massKg','Decimal']],[['cost',[],'Decimal'],['mass',[],'Decimal']]],
 ['FormCard','Форма карточки','boundary',[['cardId','UUID']],[['submit',[['title','String'],['description','String']],'Revision'],['showResult',[['result','CheckResult']],'Void']]],
 ['ControlCard','Подготовка карточки','control',[['markupRate','Decimal'],['commissionRate','Decimal']],[['calculatePrice',[['version','Version']],'Decimal'],['calculateMass',[['version','Version']],'Decimal'],['create',[['card','Card'],['version','Version']],'Revision']]],
 ['Card','Карточка','entity',[['id','UUID'],['sellerCode','String'],['name','String']],[['newRevision',[['version','Version']],'Revision']]],
 ['Revision','Ревизия карточки','entity',[['number','Integer'],['title','String'],['description','String'],['priceRub','Decimal'],['massKg','Decimal'],['state','RevisionState']],[['approve',[],'Boolean'],['markStale',[],'Void']]],
 ['FormApproval','Форма согласования','boundary',[['revisionNo','Integer']],[['requestCheck',[['revision','Revision']],'CheckResult'],['showResult',[['result','CheckResult']],'Void']]],
 ['ControlApproval','Проверка готовности','control',[['requiredImageCount','Integer']],[['check',[['revision','Revision']],'CheckResult'],['approve',[['revision','Revision']],'Boolean']]],
 ['Image','Изображение','entity',[['id','UUID'],['uri','String'],['widthPx','Integer'],['heightPx','Integer']],[['validate',[],'CheckResult']]],
 ['Attempt','Попытка публикации','entity',[['number','Integer'],['externalTaskId','String'],['status','String'],['createdAt','DateTime']],[['recordResult',[['status','String']],'Void']]],
];
const descriptions:any={FormRange:'Принимает позиции состава и показывает результат проверки и сохранения версии.',ControlRange:'Координирует проверку совместимости и сохранение новой версии состава.',Version:'Хранит номер, время создания и результат проверки конкретной версии состава.',Slot:'Представляет компонент позиции, его количество, зафиксированную цену и массу единицы.',FormCard:'Принимает содержание карточки и показывает результат подготовки ревизии.',ControlCard:'Рассчитывает цену и массу по версии состава и создаёт ревизию карточки.',Card:'Хранит постоянный код продавца и объединяет последовательные ревизии карточки.',Revision:'Хранит содержание, расчётные показатели и состояние ревизии; выполняет утверждение и отметку устаревания.',FormApproval:'Передаёт выбранную ревизию на проверку и показывает результат согласования.',ControlApproval:'Проверяет полноту ревизии, состояние состава и изображения перед утверждением.',Image:'Хранит местоположение и размеры изображения, проверяет его пригодность.',Attempt:'Фиксирует время, внешний идентификатор и результат отдельной попытки публикации.'};
for(const [id,name,role,attrs,ops] of classes){add('class',id,id,{role,description:name});
 for(const [i,[label,type]] of attrs.entries())add('attribute',id+'_a'+i,label,{owner:id,classifier:type,visibility:'private',order:String(i)});
 for(const [i,[label,args,ret,multi]] of ops.entries()){const op=id+'_op'+i;add('operation',op,label,{owner:id,visibility:'public',order:String(i)});for(const [j,[name,type]] of args.entries())add('parameter',op+'_p'+j,name,{owner:op,classifier:type,direction:'in',order:String(j)});add('parameter',op+'_return','',{owner:op,classifier:ret,direction:'return',order:'99',...(multi?{lower:'0',upper:multi}:{})});}
}
add('diagram','classes','Диаграмма классов',{type:'class'});
// A single sheet: each classifier occurs once. Boundary classes remain name-only,
// as detailed UI design is not required by the assignment (p. 4, item 4).
for(const [id,x,y,w,h] of [
 ['FormRange',0,0,350,60],['FormApproval',430,0,350,60],['FormCard',860,0,390,60],
 ['ControlRange',0,90,350,150],['ControlApproval',430,90,350,150],['ControlCard',860,90,390,180],
 ['Version',0,310,350,225],['Revision',430,310,350,225],['Card',860,310,390,225],
 ['Slot',0,655,350,205],['Image',430,655,350,170],['Attempt',860,655,390,170],
] as any[])view('classes',id,x,y,w,h,id.startsWith('Form')?{compartments:'name'}:{});
const relations:any[]=[];
function relation(a:string,b:string,m1='',m2='',kind='dependency'){
 const id='r_'+a+'_'+b;add(kind==='dependency'?'dependency':'association',id,'',kind==='dependency'?{from:a,to:b}:{});
 if(kind!=='dependency')for(const [i,c,m] of [[0,a,m1],[1,b,m2]] as any){const [lo,hi=lo]=m.split('..');add('end',id+'_'+i,'',{owner:id,classifier:c,lower:lo,upper:hi,order:String(i),...(kind==='composition'&&i===1?{aggregation:'composite'}:{})});}
 ev('classes',id,a,b);relations.push([a,m1?m1+' / '+m2:'—',kind==='dependency'?'Зависимость':kind==='composition'?'Композиция':'Ассоциация',b]);
}
relation('FormRange','ControlRange');relation('ControlRange','Version');relation('Version','Slot','1','1..*','composition');
relation('FormCard','ControlCard');relation('ControlCard','Card');relation('ControlCard','Revision');relation('Card','Revision','1','0..*','composition');relation('Revision','Version','0..*','1','association');
relation('FormApproval','ControlApproval');relation('ControlApproval','Revision');relation('Revision','Image','0..*','0..*','association');relation('Revision','Attempt','1','0..*','composition');
layout.edges.v_classes_r_ControlCard_Revision={bends:[{x:930,y:285},{x:710,y:285}]};
layout.edges.v_classes_r_Revision_Attempt={bends:[{x:720,y:560},{x:1055,y:560}]};
// UML activity: explicit partition membership carries responsibility.
add('activity','work','Подготовка и публикация карточки');add('diagram','activity','Деятельность',{type:'activity',activity:'work'});
const roles=[['manager','Менеджер'],['developer','Разработчик'],['designer','Дизайнер'],['director','Генеральный директор']];
for(const [i,[id,name]] of roles.entries()){add('actor',id,name);add('partition',id+'_lane',name.toUpperCase(),{owner:'work'});const v=view('activity',id+'_lane',i*180,0,id==='director'?220:180,830);layout.nodes[v].orientation='vertical';}
function act(id:string,kind:string,label:string,role:string,x:number,y:number,w=165,h=60){add(kind,id,label,{owner:'work',...(kind==='action'?{kind:'opaque'}:{}),...(kind==='join'?{joinSpec:'and'}:{})});view('activity',id,x,y,w,h,{parent:'v_activity_'+role+'_lane'});add('partitionMember','member_'+id,'',{owner:role+'_lane',element:id});}
act('start','initial','','manager',75,60,30,30);act('register','action','Создать\nзадание','manager',10,105,160,90);
act('merge_compose','merge','','developer',255,70,30,30);
act('compose','action','Подготовить\nсостав','developer',190,120,160,90);
act('valid','decision','Состав\nкорректен?','developer',220,230,100,70);
act('merge_prepare','merge','','manager',75,320,30,30);
act('fork','fork','','manager',40,370,100,12);
act('calc','action','Рассчитать\nцену и массу','manager',10,405,160,90);act('images','action','Подготовить\nизображения','designer',370,405,160,90);
act('join','join','','manager',40,525,100,12);act('create','action','Создать\nревизию','manager',10,555,160,90);
act('review','action','Согласовать\nревизию','director',550,555,160,90);act('approved','decision','Утверждена?','director',565,670,130,70);
act('publish','action','Опубликовать\nревизию','manager',10,670,160,90);act('final','activityFinal','','manager',75,790,30,30);
function flow(id:string,a:string,b:string,guard='',bends?:any[]){add('controlFlow',id,'',{owner:'work',from:a,to:b,...(guard?{guard}:{})});const v=ev('activity',id,a,b);if(bends)layout.edges[v]={bends};}
flow('f1','start','register');flow('f2','register','merge_compose','',[{x:175,y:150},{x:175,y:85}]);flow('f3','merge_compose','compose');flow('f4','compose','valid');
flow('f5','valid','merge_compose','нет',[{x:355,y:265},{x:355,y:85}]);flow('f6','valid','merge_prepare','да',[{x:270,y:310},{x:90,y:310}]);flow('f7','merge_prepare','fork');flow('f8','fork','calc');
flow('f9','fork','images','',[{x:155,y:393},{x:450,y:393}]);flow('f10','calc','join');flow('f11','images','join','',[{x:450,y:513},{x:115,y:513}]);
flow('f12','join','create');flow('f13','create','review','',[{x:175,y:600},{x:175,y:545},{x:630,y:545}]);flow('f14','review','approved');
flow('f15','approved','merge_prepare','нет',[{x:745,y:705},{x:745,y:350},{x:170,y:350},{x:170,y:335}]);flow('f16','approved','publish','да',[{x:175,y:705},{x:175,y:715}]);flow('f17','publish','final');
layout.edges.v_activity_f15.label={x:738,y:470};layout.edges.v_activity_f16.label={x:360,y:695};layout.edges.v_activity_f6.label={x:205,y:300};
const diagnostics=validateUml(model);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const source=generateUnified(textModel(model));const doc:any={formatVersion:2,notation:'UML',profile:'NS-UML-2.5.1-2',model,source,draft:source,layout:layoutUml(model,layout)};
const umlFile=path.join(out,'ПР4_Модель_проектирования.omni');await fs.writeFile(umlFile,await encodeProject(doc)+'\n');await decodeProject(await fs.readFile(umlFile,'utf8'));
// State chart in the general schema editor; not represented as a supported UML state-machine metamodel.
const sm:any={id:'revision_lifecycle',label:'Жизненный цикл ревизии карточки',elements:[]};const sn:any={},se:any={};
const sa=(kind:string,id:string,label='',properties:any={})=>sm.elements.push({kind,id,label,properties});
sa('diagram','states','Состояния ревизии',{type:'general'});
function shape(id:string,x:number,y:number,w:number,h:number,form='rectangle',style:any={},z=0,label=''){sa('block',id,label,{shape:form,role:'generic'});sa('view','v_'+id,'',{diagram:'states',element:id});sn['v_'+id]={x,y,width:w,height:h,z,style:{fontSize:19,color:'#000000',stroke:'#000000',fill:'#ffffff',...style}};}
// The native shape has a 1% inset; compensate when composing exact visual boundaries.
function ink(id:string,x:number,y:number,w:number,h:number,form='rectangle',style:any={},z=0){shape(id,x-w/98,y-h/98,w/.98,h/.98,form,style,z);}
function text(id:string,label:string,x:number,y:number,w:number,h:number,size=19){sa('label',id,label,{text:label});sa('view','v_'+id,'',{diagram:'states',element:id});sn['v_'+id]={x,y,width:w,height:h,z:8,style:{fontSize:size,color:'#000000'}};}
function state(id:string,title:string,actions:string[],x:number,y:number){
 const w=380,h=200,r=12;
 // Native editable primitives form a small-radius state boundary with a name compartment.
 // SCHEME's stock "rounded" uses an excessive 35% radius, unsuitable for UML states.
 shape(id,x,y,w,h,'rectangle',{stroke:'#ffffff'},0);
 for(const [i,cx,cy] of [[0,x,y],[1,x+w-r*2,y],[2,x,y+h-r*2],[3,x+w-r*2,y+h-r*2]])ink(id+'_corner'+i,cx as number,cy as number,r*2,r*2,'ellipse',{},1);
 ink(id+'_mask_h',x+r,y-.5,w-2*r,h+1,'rectangle',{stroke:'#ffffff',lineWidth:.1},2);
 ink(id+'_mask_v',x-.5,y+r,w+1,h-2*r,'rectangle',{stroke:'#ffffff',lineWidth:.1},2);
 for(const [part,px,py,pw,ph] of [['top',x+r,y,w-2*r,1.3],['bottom',x+r,y+h-1.3,w-2*r,1.3],['left',x,y+r,1.3,h-2*r],['right',x+w-1.3,y+r,1.3,h-2*r],['divider',x,y+49,w,1.3]])ink(id+'_'+part,px as number,py as number,pw as number,ph as number,'rectangle',{stroke:'#000000',fill:'#000000',lineWidth:.1},3);
 text(id+'_name',title,x+10,y+2,w-20,46,22);
 actions.forEach((line,i)=>text(id+'_action'+i,line,x+5,y+57+i*42,w-10,42,19));
}
shape('initial',10,187,26,26,'ellipse',{fill:'#000000'});
state('draft','Черновик (DRAFT)',['entry / включить редактирование','do / проверять заполнение','exit / сохранить данные'],110,100);
state('checking','Проверка готовности',['entry / загрузить данные ревизии','do / проверить состав и полноту','exit / сохранить результат'],690,100);
state('ready','Готова (READY)',['entry / зафиксировать утверждение','do / отслеживать публикацию','exit / снять готовность'],690,470);
state('stale','Устарела (STALE)',['entry / отметить устаревание','do / показывать причину'],110,470);
function transition(id:string,a:string,b:string,label:string,bends?:any[],labelPos?:any){sa('link',id,label,{from:a,to:b,kind:'directed'});sa('view','v_'+id,'',{diagram:'states',element:id,from:'v_'+a,to:'v_'+b});se['v_'+id]={style:{fontSize:18,color:'#000000'},...(bends?{bends}:{}),...(labelPos?{label:labelPos}:{})};}
transition('t1','initial','draft','создать',undefined,{x:63,y:175});transition('t2','draft','checking','запросить\nутверждение',undefined,{x:590,y:173});
transition('t3','checking','ready','[ошибок нет] /\nутвердить',undefined,{x:880,y:382});
transition('t4','checking','draft','[есть ошибки] / вернуть замечания',[{x:880,y:35},{x:300,y:35}],{x:590,y:25});
transition('t5','ready','stale','изменился состав /\nснять утверждение',undefined,{x:590,y:543});
se.v_t1.from={side:'right',offset:.5};se.v_t1.to={side:'left',offset:.5};
se.v_t2.from={side:'right',offset:.5};se.v_t2.to={side:'left',offset:.5};
se.v_t3.from={side:'bottom',offset:.5};se.v_t3.to={side:'top',offset:.5};
se.v_t4.from={side:'top',offset:.5};se.v_t4.to={side:'top',offset:.5};
se.v_t5.from={side:'left',offset:.5};se.v_t5.to={side:'right',offset:.5};
const sd=schemeEngine.create(sm);Object.assign(sd.layout.nodes,sn);Object.assign(sd.layout.edges,se);const stateDiagnostics=schemeEngine.validate(sm);if(stateDiagnostics.some((x:any)=>x.blocksCommit))throw Error(JSON.stringify(stateDiagnostics));
const stateFile=path.join(out,'ПР4_Состояния.omni');await fs.writeFile(stateFile,await encodeProject(sd)+'\n');await decodeProject(await fs.readFile(stateFile,'utf8'));
const jobs=[{file:umlFile,diagramId:'classes',title:'ПР4_Классы_полная'},{file:umlFile,diagramId:'activity',title:'ПР4_Деятельность'},{file:stateFile,diagramId:'states',title:'ПР4_Состояния'}];
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options:{format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:4000,margin:12},jobs},null,2));
await fs.writeFile(path.join(out,'ПР4_Таблицы.json'),JSON.stringify({classes:classes.map(([id,name,role,attrs,ops])=>({id,name,role,attributes:attrs,operations:ops,description:descriptions[id]})),relations,diagnostics,stateDiagnostics},null,2));
console.log(JSON.stringify({classes:classes.length,diagrams:jobs.length,diagnostics,stateWarnings:stateDiagnostics.length}));
