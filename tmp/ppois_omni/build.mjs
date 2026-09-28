import fs from 'node:fs/promises';
import { element, layoutUml, textModel, decodeUml } from 'file:///D:/OmniNotation/src/notations/uml/document.ts';
import { generateUnified } from 'file:///D:/OmniNotation/src/language/unified.ts';
import { interactionFingerprint } from 'file:///D:/OmniNotation/src/notations/uml/model.ts';
import { validateUml } from 'file:///D:/OmniNotation/src/notations/uml/validation.ts';
import { encodeProject } from 'file:///D:/OmniNotation/src/persistence/project.ts';
const base='D:/GitHub/MIREA/tmp/ppois_omni';
const input=JSON.parse(await fs.readFile(base+'/data.json','utf8'));
const model={id:'ppois3',label:'ППОИС 3 — Модель анализа ИС ООО «Юкомс»',elements:[]};
const add=(kind,id,label='',p={})=>{const e=element(kind,label,p,id);model.elements.push(e);return e;};
const placements={},edges={};
const view=(sheet,id,rect,p={})=>{const v=add('view','v_'+sheet+'_'+id,'',{diagram:sheet,element:id,...p});if(rect)placements[v.id]=rect;return v.id;};
const rect=(x,y,width=230,height=130)=>({x,y,width,height});
add('interaction','bom','UC02 — Формирование версии BOM');add('interaction','pub','UC05 — Публикация карточки товара');
for(const [id,label,type,interaction] of [['use','1. Варианты использования','usecase'],['classes','2. Классы анализа','class'],['bom_seq','3. Последовательность UC02','sequence','bom'],['pub_seq','4. Последовательность UC05','sequence','pub'],['comm','5. Кооперация UC05','communication','pub']])add('diagram',id,label,{type,...(interaction?{interaction}:{})});
const actors=[['manager','Менеджер маркетплейсов',30,40],['specialist','Технический специалист',30,280],['ozon','Ozon',30,570],['suppliers','PC4Games / ITPartner',1140,40],['designer','Дизайнер',1140,350],['admin','Администратор',1140,610]];
for(const [id,label,x,y]of actors){add('actor',id,label);view('use',id,rect(x,y,145,115));}
add('system','system','ИС формирования и актуализации карточек ООО «Юкомс»');const frame=view('use','system',rect(210,0,880,785));
for(let i=0;i<input.uc.length;i++){const [id,label]=input.uc[i];add('usecase',id,id+' — '+label.replaceAll('\n',' '),id==='UC02'?{interaction:'bom'}:id==='UC05'?{interaction:'pub'}:{});add('subject','subject_'+id,'',{owner:id,system:'system'});view('use',id,rect(i<5?270:765,65+i%5*145,265,95),{parent:frame});}
for(const [a,b]of [['manager','UC01'],['manager','UC05'],['manager','UC06'],['specialist','UC02'],['specialist','UC03'],['specialist','UC04'],['designer','UC07'],['designer','UC09'],['admin','UC10'],['suppliers','UC06'],['ozon','UC05']]){let id=a+'_'+b;add('participation',id,'',{from:a,to:b});view('use',id);}
for(const[a,b]of [['UC02','UC03'],['UC04','UC03'],['UC05','UC08']]){const id=a+'_'+b;add('include',id,'',{from:a,to:b});view('use',id);}
edges.v_use_manager_UC06={bends:[{x:190,y:35},{x:897,y:35}]};
edges.v_use_manager_UC05={bends:[{x:190,y:110},{x:190,y:690}]};
edges.v_use_UC02_UC03={label:{x:445,y:336}};edges.v_use_UC04_UC03={label:{x:445,y:470}};
edges.v_use_UC05_UC08={bends:[{x:650,y:690},{x:650,y:402}],label:{x:650,y:555}};
const positions={FormBOM:[20,30],BOMController:[420,30],Rule:[850,30],Slot:[20,280],Version:[420,280],Offer:[850,280],FormCard:[20,530],PubController:[420,530],Card:[850,530],Adapter:[420,780],Publication:[850,780]};
for(const[id,[role,label,details]]of Object.entries(input.classes)){add('class',id,label,{role});view('classes',id,rect(...positions[id],285,180));let n=0;for(const line of details.split(/\n|; /)){const op=line.includes('(');add(op?'operation':'attribute',id+'_f'+n++,line.replace(/\(.*\)/,''),{owner:id,visibility:op?'public':'private',order:String(n)});}}
for(const[a,b]of [['FormBOM','BOMController'],['BOMController','Rule'],['BOMController','Version'],['BOMController','Offer'],['FormCard','PubController'],['PubController','Card'],['PubController','Adapter'],['PubController','Publication']]){const id='dep_'+a+'_'+b;add('dependency',id,'',{from:a,to:b});view('classes',id);}
function assoc(id,a,b,al,au,bl,bu,composition=false){add('association',id);add('end',id+'_a','',{owner:id,classifier:a,lower:al,upper:au,order:'0'});add('end',id+'_b','',{owner:id,classifier:b,lower:bl,upper:bu,order:'1',...(composition?{aggregation:'composite'}:{})});view('classes',id);}
assoc('version_slots','Version','Slot','1','1','1','*',true);assoc('slot_offer','Slot','Offer','0','*','0','1');assoc('card_version','Card','Version','0','*','1','1');assoc('card_publications','Card','Publication','1','1','0','*');
edges.v_classes_slot_offer={bends:[{x:160,y:242},{x:992,y:242}]};edges.v_classes_card_version={bends:[{x:1000,y:487},{x:560,y:487}]};edges.v_classes_dep_BOMController_Offer={bends:[{x:790,y:120},{x:790,y:370}]};edges.v_classes_dep_PubController_Publication={bends:[{x:785,y:620},{x:785,y:870}]};
function interaction(id,sheet,participants,msgs,altStart,elseStart){
 const lanes=participants.map((classifier,i)=>{const lane=id+'_lane'+i;add('lifeline',lane,['user','form','control','data','service','result','log'][i],{owner:id,classifier});view(sheet,lane,rect(40+i*230,30,190,500));if(id==='pub')view('comm',lane,rect(...[[40,40],[350,40],[820,40],[350,380],[820,380],[820,740],[350,740]][i],240,90));return lane;});
 let order=0;const calls={};const channels={};
 for(let i=0;i<msgs.length;i++){
  if(i===altStart){add('fragment',id+'_alt','',{owner:id,operator:'alt',order:String(order++)});view(sheet,id+'_alt');for(const lane of lanes)add('coverage',id+'_cover_'+lane,'',{owner:id+'_alt',lifeline:lane});add('operand',id+'_ok','',{owner:id+'_alt',guard:id==='bom'?'нет конфликтов и предложения выбраны':'карточка готова к публикации',order:'0'});add('operand',id+'_bad','',{owner:id+'_alt',guard:id==='bom'?'есть конфликт или отсутствует предложение':'есть ошибки готовности',order:'1'});}
  const[a,b,label,isReply]=msgs[i],mid=id+'_m'+(i+1),owner=i<altStart?id:i<elseStart?id+'_ok':id+'_bad';
  add('occurrence',mid+'_send','',{owner,lifeline:lanes[a],order:String(order++)});add('occurrence',mid+'_receive','',{owner,lifeline:lanes[b],order:String(order++)});
  let connector;
  if(id==='pub'){const pair=[a,b].sort().join('_');if(!channels[pair]){channels[pair]=id+'_channel_'+pair;add('connector',channels[pair],'',{owner:id,from:lanes[a],to:lanes[b]});view('comm',channels[pair]);}connector=channels[pair];}
  const p={owner:id,send:mid+'_send',receive:mid+'_receive',sort:isReply?'reply':'synchCall',sequence:String(i+1),...(connector?{connector}:{})};
  if(isReply&&calls[b+'_'+a])p.replyTo=calls[b+'_'+a];else if(!isReply)calls[a+'_'+b]=mid;
  add('message',mid,label.replace(/^\d+\. /,''),p);view(sheet,mid);if(id==='pub'&&i<elseStart)view('comm',mid);
 }
 if(id==='pub'){
  add('scenario','ready_card','Готовая карточка',{owner:id});model.elements.find(e=>e.id==='comm').properties.scenario='ready_card';add('choice','ready_choice','',{owner:'ready_card',fragment:'pub_alt',operand:'pub_ok'});for(let i=0;i<elseStart;i++)add('step','ready_step'+i,'',{owner:'ready_card',message:'pub_m'+(i+1),order:String(i+1)});
  model.elements.find(e=>e.id==='ready_card').properties.fingerprint=interactionFingerprint(model,id);
 }
}
interaction('bom','bom_seq',['specialist','FormBOM','BOMController','Rule','Offer','Version'],input.seq1,7,11);
interaction('pub','pub_seq',['manager','FormCard','PubController','Card','Adapter','ozon','Publication'],input.seq2,5,14);
const msgPositions=[[275,55],[710,55],[490,240],[490,290],[1190,150],[490,640],[1100,285],[1130,570],[1130,635],[1100,340],[490,700],[490,340],[710,125],[275,125]];
for(let i=0;i<msgPositions.length;i++)edges['v_comm_pub_m'+(i+1)]={label:{x:msgPositions[i][0],y:msgPositions[i][1]}};
edges.v_comm_pub_channel_2_3={bends:[{x:750,y:100},{x:750,y:425}]};edges.v_comm_pub_channel_2_6={bends:[{x:700,y:130},{x:700,y:785}]};
const layout=layoutUml(model);Object.assign(layout.nodes,placements);Object.assign(layout.edges,edges);
// Compact class sheet: entity links remain in one row for readable printing.
const classPositions={FormBOM:[0,0],BOMController:[335,0],Rule:[670,0],Offer:[1005,0],Slot:[0,280],Version:[335,280],Card:[670,280],Publication:[1005,280],FormCard:[0,580],PubController:[335,580],Adapter:[670,580]};
for(const [id,pos] of Object.entries(classPositions))layout.nodes['v_classes_'+id]=rect(...pos,285,id==='Publication'?260:id==='Card'?230:195);
for(const id of ['dep_BOMController_Offer','dep_PubController_Publication','slot_offer','card_version'])delete layout.edges['v_classes_'+id];
layout.edges.v_classes_dep_BOMController_Offer={bends:[{x:640,y:98},{x:640,y:-45},{x:985,y:-45},{x:985,y:98}]};
layout.edges.v_classes_dep_PubController_Publication={bends:[{x:645,y:677},{x:645,y:555},{x:980,y:555},{x:980,y:410}]};
layout.edges.v_classes_slot_offer={bends:[{x:315,y:378},{x:315,y:235},{x:975,y:235},{x:975,y:98}]};
// Reverse association-end ordering to keep end labels outside the boxes.
for(const id of ['version_slots','card_version']){const a=model.elements.find(e=>e.id===id+'_a');const b=model.elements.find(e=>e.id===id+'_b');a.properties.order='1';b.properties.order='0';}
// Place the first sequence labels below the actor header.
layout.edges.v_bom_seq_bom_m1={label:{x:255,y:150}};
layout.edges.v_pub_seq_pub_m1={label:{x:255,y:150}};
// Communication: give the top messages their own gaps and keep labels inside the frame.
const commPos=[[0,40],[450,40],[1050,40],[450,390],[1050,390],[1050,780],[450,780]];
for(let i=0;i<commPos.length;i++)layout.nodes['v_comm_pub_lane'+i]=rect(...commPos[i],260,100);
const commLabels=[[350,50],[890,50],[585,245],[585,295],[1210,250],[585,640],[1190,340],[1180,610],[1180,685],[1190,400],[585,705],[585,345],[890,160],[350,160]];
for(let i=0;i<commLabels.length;i++)layout.edges['v_comm_pub_m'+(i+1)]={label:{x:commLabels[i][0],y:commLabels[i][1]}};
layout.edges.v_comm_pub_channel_2_3={bends:[{x:950,y:90},{x:950,y:440}]};
layout.edges.v_comm_pub_channel_2_6={bends:[{x:850,y:90},{x:850,y:830}]};
layout.edges.v_comm_pub_m5={label:{x:1050,y:205}};
layout.edges.v_comm_pub_m7={label:{x:1190,y:270}};
layout.edges.v_comm_pub_m10={label:{x:1190,y:340}};
for(const e of model.elements.filter(e=>e.kind==='lifeline')){
 const i=Number(e.id.at(-1));e.label=['u','f','c','d','s','r','p'][i];
 const id=e.properties.owner;layout.nodes['v_'+(id==='bom'?'bom_seq':'pub_seq')+'_'+e.id]=rect(35+i*180,30,155,500);
}
layout.edges.v_bom_seq_bom_m1.label.x=210;
layout.edges.v_pub_seq_pub_m1.label.x=210;
model.elements.find(e=>e.id==='ready_card').properties.fingerprint=interactionFingerprint(model,'pub');
for(const i of [3,4])layout.nodes['v_comm_pub_lane'+i].y=330;
for(const i of [5,6])layout.nodes['v_comm_pub_lane'+i].y=650;
for(const [n,x,y] of [[3,585,205],[4,585,255],[12,585,305],[5,1040,170],[7,1220,210],[10,1220,285],[6,585,505],[11,585,570],[8,1180,490],[9,1180,565]])layout.edges['v_comm_pub_m'+n]={label:{x,y}};
layout.edges.v_comm_pub_channel_2_3={bends:[{x:950,y:90},{x:950,y:380}]};
layout.edges.v_comm_pub_channel_2_6={bends:[{x:850,y:90},{x:850,y:700}]};
layout.edges.v_comm_pub_m5={label:{x:1190,y:165}};
for(const sheet of ['bom_seq','pub_seq'])for(const [id,box]of Object.entries(layout.nodes)){
 if(!id.startsWith('v_'+sheet+'_')||!id.includes('_lane'))continue;
 if(id.endsWith('lane0'))box.width=245;else box.x+=90;
}
layout.edges.v_bom_seq_bom_m1.label.x=270;
layout.edges.v_pub_seq_pub_m1.label.x=270;
layout.edges.v_use_manager_UC05={bends:[{x:102.5,y:190},{x:235,y:190},{x:235,y:620},{x:402.5,y:620}]};
layout.edges.v_use_ozon_UC05={bends:[{x:210,y:627.5},{x:210,y:692.5}]};
const source=generateUnified(textModel(model));
const diagnostics=validateUml(model);await fs.writeFile(base+'/diagnostics.json',JSON.stringify(diagnostics,null,2));
const doc=decodeUml({formatVersion:1,notation:'UML',profile:'NS-UML-2.5.1-1',model,source,draft:source,layout});
await fs.writeFile('D:/GitHub/MIREA/4/ППОИС/Схемы/ПР3_Модель_анализа.omni',await encodeProject(doc));
console.log(JSON.stringify({elements:model.elements.length,diagrams:model.elements.filter(e=>e.kind==='diagram').length,diagnostics}));
