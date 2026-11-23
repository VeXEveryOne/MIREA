// Native UML model and native OmniNotation batch export manifest for PR3.
import fs from 'node:fs/promises';
import path from 'node:path';
import {omniModule} from '../../../tools/runtime.mjs';
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {textModel,layoutUml}=await omniModule('src/notations/uml/document.ts');
const {generateUnified}=await omniModule('src/language/unified.ts');
const {validateUml}=await omniModule('src/notations/uml/validation.ts');
const root=path.resolve('4/ППОИС'), out=path.join(root,'Схемы');
const data=JSON.parse(await fs.readFile(path.join(root,'Исходники/submission_model.json'),'utf8'));
const d:any={formatVersion:2,notation:'UML',profile:'NS-UML-2.5.1-2',model:{id:'ppois3',label:'Модель анализа ИС ООО «Юкомс»',elements:[]},layout:{nodes:{},edges:{}},source:'',draft:''};
const add=(kind:string,id:string,label='',properties:any={})=>{d.model.elements.push({kind,id,label,properties});return id;};
function view(sheet:string,id:string,x:number,y:number,width=230,height=78,extra:any={}){const v='v_'+sheet+'_'+id;add('view',v,'',{diagram:sheet,element:id,...extra});d.layout.nodes[v]={x,y,width,height};return v;}
function edge(sheet:string,id:string,from:string,to:string){add('view','v_'+sheet+'_'+id,'',{diagram:sheet,element:id,from:'v_'+sheet+'_'+from,to:'v_'+sheet+'_'+to});}
add('diagram','use','Варианты использования',{type:'usecase'});
add('system','system','ИС карточек ООО «Юкомс»');view('use','system',155,0,340,900);
let uc=0;const links:any[]=[];
for(const [ri,r] of data.roles.entries()){
 add('actor',r.id,r.name);view('use',r.id,0,85+ri*220,120,110);
 const goals=[['Подготовить карточку','Опубликовать карточку'],['Проверить цену и состав','Утвердить ревизию'],['Сформировать состав','Сохранить версию состава'],['Подготовить изображения','Оформить ревизию']][ri];
 for(const [j,task] of goals.entries()){
  const id='UC'+String(++uc).padStart(2,'0');add('usecase',id,id+' '+task);add('subject','subject_'+id,'',{owner:id,system:'system'});
  view('use',id,185,45+ri*220+j*100,280,80,{parent:'v_use_system'});
  const rel=r.id+'_'+id;add('participation',rel,'',{from:r.id,to:id});edge('use',rel,r.id,id);links.push([r.name,'Ассоциация',id+' — '+task]);
 }
}
add('actor','ozon','Ozon');view('use','ozon',525,145,100,110);add('participation','ozon_UC02','',{from:'ozon',to:'UC02'});edge('use','ozon_UC02','ozon','UC02');links.push(['Ozon','Ассоциация','UC02 — Опубликовать карточку']);
add('diagram','analysis','Классы анализа',{type:'class'});
const cls:any[]=[
 ['FormRange','Форма состава','boundary',0,0],['ControlRange','Управление составом','control',330,0],['Version','Версия состава','entity',660,0],['Slot','Позиция состава','entity',990,0],
 ['FormCard','Форма карточки','boundary',0,210],['ControlCard','Подготовка карточки','control',330,210],['Revision','Ревизия карточки','entity',660,210],['Card','Карточка','entity',990,210],
 ['FormApproval','Форма согласования','boundary',0,420],['ControlApproval','Проверка готовности','control',330,420],
 ['FormImage','Форма изображений','boundary',0,630],['ControlImage','Управление контентом','control',330,630],['Image','Изображение','entity',660,630],
 ['FormPublish','Форма публикации','boundary',0,840],['ControlPublish','Публикация','control',330,840],['Attempt','Попытка публикации','entity',660,840],['Gateway','Шлюз Ozon','boundary',990,840]];
for(const [id,label,role,x,y] of cls){add('class',id,label,{role});view('analysis',id,x,y,250,90,{compartments:'name'});}
function assoc(a:string,b:string,lo='1',hi='1') {const id='a_'+a+'_'+b;add('association',id);add('end',id+'_a','',{owner:id,classifier:a,lower:lo==='*'?'0':lo,upper:lo,order:'0'});add('end',id+'_b','',{owner:id,classifier:b,lower:hi==='*'?'0':hi,upper:hi,order:'1'});edge('analysis',id,a,b);}
for(const [a,b] of [['FormRange','ControlRange'],['ControlRange','Version'],['FormCard','ControlCard'],['ControlCard','Revision'],['FormApproval','ControlApproval'],['ControlApproval','Revision'],['FormImage','ControlImage'],['ControlImage','Image'],['FormPublish','ControlPublish'],['ControlPublish','Attempt'],['ControlPublish','Gateway']])assoc(a,b);
assoc('Version','Slot','1','*');assoc('Card','Revision','1','*');assoc('Revision','Version');assoc('Revision','Image','*','*');assoc('Revision','Attempt','1','*');
const sequenceTables:any[]=[];
for(const seq of data.sequences){
 const sid='seq_'+seq.id;add('interaction',seq.id,seq.title);add('diagram',sid,seq.title,{type:'sequence',interaction:seq.id});
 const ids=seq.id==='range'?['developer','FormRange','ControlRange','Version']:['director','FormApproval','ControlApproval','Revision'];
 for(const [i,c] of ids.entries()){add('lifeline',seq.id+'_lane'+i,['u','f','c','v'][i],{owner:seq.id,classifier:c});view(sid,seq.id+'_lane'+i,20+i*210,0,180,70);}
 const rows:any[]=[];
 for(const [i,[a,b,label,reply]] of seq.messages.entries()){
  const id=seq.id+'_m'+(i+1),send=id+'_send',receive=id+'_receive';add('occurrence',send,'',{owner:seq.id,lifeline:seq.id+'_lane'+a,order:String(i*2)});add('occurrence',receive,'',{owner:seq.id,lifeline:seq.id+'_lane'+b,order:String(i*2+1)});
  const p:any={owner:seq.id,send,receive,sort:reply?'reply':'synchCall',sequence:String(i+1)};
  if(reply){const previous=seq.messages.slice(0,i).map((m:any,j:number)=>({m,j})).reverse().find(({m}:any)=>!m[3]&&m[0]===b&&m[1]===a);if(previous)p.replyTo=seq.id+'_m'+(previous.j+1);}
  const captions=seq.id==='range'?['Ввести состав','Проверить состав','Получить позиции','Позиции и цены','Проверить','Сохранить','Номер версии','Результат','Показать результат']:['Выбрать ревизию','Проверить','Получить данные','Данные ревизии','Проверить полноту','Утвердить','Состояние','Результат','Показать результат'];
  add('message',id,captions[i],p);add('view','v_'+sid+'_'+id,'',{diagram:sid,element:id});rows.push([seq.participants[a],reply?'Ответ':'Синхронный вызов',String(i+1)+'. '+captions[i],seq.participants[b]]);
 }
 sequenceTables.push({id:seq.id,title:seq.title,rows});
}
add('diagram','comm','Кооперация при утверждении ревизии',{type:'communication',interaction:'approval'});
for(const [i,pos] of [[0,[0,0]],[1,[280,0]],[2,[560,0]],[3,[560,280]]] as any)view('comm','approval_lane'+i,pos[0],pos[1],210,70);
const approval=data.sequences.find((s:any)=>s.id==='approval');
for(const [i,[a,b]] of approval.messages.entries()){
 const cid='channel_'+Math.min(a,b)+'_'+Math.max(a,b);
 if(!d.model.elements.some((e:any)=>e.id===cid)){add('connector',cid,'',{owner:'approval',from:'approval_lane'+a,to:'approval_lane'+b});edge('comm',cid,'approval_lane'+a,'approval_lane'+b);}
 d.model.elements.find((e:any)=>e.id==='approval_m'+(i+1)).properties.connector=cid;
 add('view','v_comm_approval_m'+(i+1),'',{diagram:'comm',element:'approval_m'+(i+1)});
}
// Keep the analysis view focused on the two modelled interactions and their data.
const keep=['FormRange','ControlRange','Version','Slot','FormCard','ControlCard','Revision','Card','FormApproval','ControlApproval','Image','Attempt'];
const positions:any={FormRange:[0,0],ControlRange:[330,0],Version:[660,0],Slot:[990,0],FormCard:[0,180],ControlCard:[330,180],Revision:[660,180],Card:[990,180],FormApproval:[0,360],ControlApproval:[330,360],Image:[660,540],Attempt:[990,540]};
const removed=new Set(d.model.elements.filter((e:any)=>e.kind==='class'&&!keep.includes(e.id)).map((e:any)=>e.id));
for(const e of d.model.elements.filter((e:any)=>e.kind==='end'&&removed.has(e.properties.classifier)))removed.add(e.properties.owner);
d.model.elements=d.model.elements.filter((e:any)=>!removed.has(e.id)&&!(e.kind==='end'&&removed.has(e.properties.owner))&&!(e.kind==='view'&&removed.has(e.properties.element)));
for(const id of removed)delete d.layout.nodes['v_analysis_'+id];
for(const [id,[x,y]] of Object.entries(positions) as any)d.layout.nodes['v_analysis_'+id]={x,y,width:250,height:70};
for(const e of d.model.elements.filter((e:any)=>e.kind==='interaction'))e.label=' ';
// Preconditions are part of message semantics and appear in both interactions.
for(const [id,guard] of [['range_m6','состав корректен'],['approval_m6','ревизия готова']])d.model.elements.find((e:any)=>e.id===id).properties.guard=guard;
const diagnostics=validateUml(d.model);if(diagnostics.some((x:any)=>x.blocksCommit))throw Error(JSON.stringify(diagnostics));
d.source=generateUnified(textModel(d.model));d.draft=d.source;d.layout=layoutUml(d.model,d.layout);
const file=path.join(out,'ПР3_Модель_анализа.omni');const raw=await encodeProject(d);await decodeProject(raw);await fs.writeFile(file,raw+'\n');
const jobs=[['use','ПР3_Варианты_ролей'],['analysis','ПР3_Классы_анализа'],['seq_range','ПР3_Последовательность_range'],['seq_approval','ПР3_Последовательность_approval'],['comm','ПР3_Кооперация_утверждения']].map(([diagramId,title])=>({file,diagramId,title}));
await fs.mkdir('.cache/ppois-pr3-20261111',{recursive:true});
await fs.writeFile('.cache/ppois-pr3-20261111/export.json',JSON.stringify({output:path.resolve('.cache/ppois-pr3-20261111/native'),options:{format:'png',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:4000,margin:12},jobs},null,2));
await fs.writeFile(path.join(out,'ПР3_Таблицы.json'),JSON.stringify({links,sequences:sequenceTables,diagnostics},null,2));console.log({diagnostics,diagrams:jobs.length});
