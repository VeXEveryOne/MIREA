import fs from 'node:fs/promises';
import {BpmnModdle} from 'file:///D:/OmniNotation/node_modules/bpmn-moddle/dist/index.js';
import {captureBpmn} from 'file:///D:/OmniNotation/src/notations/bpmn/model.ts';
import {bpmnTextModel} from 'file:///D:/OmniNotation/src/notations/bpmn/text.ts';
import {generateUnified} from 'file:///D:/OmniNotation/src/language/unified.ts';
import {encodeProject} from 'file:///D:/OmniNotation/src/persistence/project.ts';
import {validateBpmnData} from 'file:///D:/OmniNotation/src/notations/bpmn/validation.ts';
const out='D:/GitHub/MIREA/4/РОП/Практики_1-8/Модели_OmniNotation';
await fs.mkdir(out,{recursive:true});
const factory=new BpmnModdle();
const c=(t,p={})=>factory.create(t,p); const el={};
function node(id,type,name,props={}){return el[id]=c('bpmn:'+type,{id,name,...props});}
const main=[],prep=[],pub=[],messages=[];
function n(list,id,type,name,props={}){const e=node(id,type,name,props);list.push(e);return e;}
function f(list,id,from,to,name='',cond=''){
 const e=node(id,'SequenceFlow',name,{sourceRef:el[from],targetRef:el[to],...(cond?{conditionExpression:c('bpmn:FormalExpression',{body:cond})}:{})});
 el[from].set('outgoing',[...(el[from].outgoing||[]),e]);el[to].set('incoming',[...(el[to].incoming||[]),e]);list.push(e);return e;
}
n(main,'Start','StartEvent','Запрос на создание\nили изменение');
n(main,'Init','UserTask','Зарегистрировать\nзапрос и выбрать BOM');
n(main,'Prepare','SubProcess','Подготовить\nверсию карточки',{flowElements:prep});
n(main,'Approve','UserTask','Проверить карточку\nи разрешить публикацию');
n(main,'Publish','SubProcess','Опубликовать\nи обработать результат',{flowElements:pub});
n(main,'Finish','EndEvent','Результат\nзафиксирован');
f(main,'F1','Start','Init');f(main,'F2','Init','Prepare');f(main,'F3','Prepare','Approve');f(main,'F4','Approve','Publish');f(main,'F5','Publish','Finish');
n(prep,'PStart','StartEvent','Начало');
n(prep,'Version','UserTask','Создать версию BOM\nи выбрать состав');
n(prep,'Offers','ServiceTask','Загрузить предложения\nи разрешить слоты');
n(prep,'Validate','BusinessRuleTask','Проверить совместимость\nи свежесть предложений');
n(prep,'Valid','ExclusiveGateway','Данные допустимы?');
n(prep,'Fix','UserTask','Исправить состав,\nатрибуты или сопоставление');
n(prep,'Calc','ServiceTask','Рассчитать цену и вес\nсохранить снимок');
n(prep,'Media','UserTask','Подтвердить шаблон\nи изображения');
n(prep,'Content','ServiceTask','Сформировать контент\nпроверить полноту');
n(prep,'Complete','ExclusiveGateway','Карточка полна?');
n(prep,'PDone','EndEvent','Готова\nк публикации');
f(prep,'P1','PStart','Version');f(prep,'P2','Version','Offers');f(prep,'P3','Offers','Validate');f(prep,'P4','Validate','Valid');
f(prep,'P5','Valid','Fix','Нет','valid = false');f(prep,'P6','Fix','Offers');f(prep,'P7','Valid','Calc','Да','valid = true');f(prep,'P8','Calc','Media');f(prep,'P9','Media','Content');f(prep,'P10','Content','Complete');f(prep,'P11','Complete','Fix','Нет','complete = false');f(prep,'P12','Complete','PDone','Да','complete = true');
const tech=node('Technical','Lane','Технический специалист',{flowNodeRef:['PStart','Version','Fix'].map(x=>el[x])});
const sys=node('System','Lane','Информационная система',{flowNodeRef:['Offers','Validate','Valid','Calc','Content','Complete','PDone'].map(x=>el[x])});
const des=node('Designer','Lane','Дизайнер',{flowNodeRef:[el.Media]});
el.Prepare.set('laneSets',[c('bpmn:LaneSet',{id:'PrepLanes',lanes:[tech,sys,des]})]);
n(pub,'QStart','StartEvent','Публикация разрешена');
n(pub,'Save','ServiceTask','Зафиксировать версию\nи ключ операции');
n(pub,'Send','ServiceTask','Сверить статус и отправить\nпри отсутствии операции');
n(pub,'Result','ServiceTask','Получить результат\nили ошибку связи');
n(pub,'Outcome','ExclusiveGateway','Результат?');
n(pub,'Success','ServiceTask','Сохранить ID Ozon\nи опубликованную версию');
n(pub,'QDone','EndEvent','Опубликовано');
n(pub,'Retry','ExclusiveGateway','Повтор допустим?');
n(pub,'Wait','IntermediateCatchEvent','Задержка повтора',{eventDefinitions:[c('bpmn:TimerEventDefinition',{timeDuration:c('bpmn:FormalExpression',{body:'PT1M'})})]});
n(pub,'Increment','ServiceTask','Увеличить счётчик\nповторов');
n(pub,'Error','ServiceTask','Сохранить ошибку\nуведомить менеджера');
n(pub,'QFail','EndEvent','Ошибка публикации');
f(pub,'Q1','QStart','Save');f(pub,'Q2','Save','Send');f(pub,'Q3','Send','Result');f(pub,'Q4','Result','Outcome');f(pub,'Q5','Outcome','Success','Успех','result = success');f(pub,'Q6','Success','QDone');f(pub,'Q7','Outcome','Retry','Ошибка / ожидание','result != success');
f(pub,'Q8','Retry','Wait','Да','temporary = true and retries < 3');f(pub,'Q9','Wait','Increment');f(pub,'Q10','Increment','Send');f(pub,'Q11','Retry','Error','Нет','temporary = false or retries >= 3');f(pub,'Q12','Error','QFail');
const process=node('Process','Process','Карточки компьютерных систем TO BE',{isExecutable:false,flowElements:main});
const company=node('Ucoms','Participant','ООО «Юкомс»',{processRef:process});
node('PC4Games','Participant','PC4Games');node('ITPartner','Participant','ITPartner');node('Ozon','Participant','Ozon');
function msg(id,from,to,name){const m=node(id+'_def','Message',name);messages.push(node(id,'MessageFlow',name,{sourceRef:el[from],targetRef:el[to],messageRef:m}));return m;}
const defs=[msg('M1','Prepare','PC4Games','Запрос предложений'),msg('M2','PC4Games','Prepare','Цены и наличие'),msg('M3','Prepare','ITPartner','Запрос предложений'),msg('M4','ITPartner','Prepare','Цены и наличие'),msg('M5','Publish','Ozon','Карточка / запрос статуса'),msg('M6','Ozon','Publish','ID операции / результат')];
const coll=node('Collaboration','Collaboration','Целевой процесс',{participants:['Ucoms','PC4Games','ITPartner','Ozon'].map(x=>el[x]),messageFlows:messages});
const bounds=(x,y,width,height)=>c('dc:Bounds',{x,y,width,height});
function s(view,id,x,y,w,h,label=null){return c('bpmndi:BPMNShape',{id:view+'_'+id+'_di',bpmnElement:el[id],bounds:bounds(x,y,w,h),...(['Participant','Lane'].some(t=>el[id].$type==='bpmn:'+t)?{isHorizontal:true}:{}),...(['Prepare','Publish'].includes(id)?{isExpanded:false}:{}),...(label?{label:c('bpmndi:BPMNLabel',{bounds:bounds(...label)})}:{})});}
function e(view,id,points,label=null){return c('bpmndi:BPMNEdge',{id:view+'_'+id+'_di',bpmnElement:el[id],waypoint:points.map(([x,y])=>c('dc:Point',{x,y})),...(label?{label:c('bpmndi:BPMNLabel',{bounds:bounds(...label)})}:{})});}
const a=[s('M','Ucoms',20,270,1640,330),s('M','PC4Games',350,20,420,60),s('M','ITPartner',950,20,420,60),s('M','Ozon',20,820,1640,60),s('M','Start',85,393,44,44,[35,450,170,65]),s('M','Init',230,355,220,120),s('M','Prepare',530,355,230,120),s('M','Approve',850,355,245,120),s('M','Publish',1180,355,250,120),s('M','Finish',1550,393,44,44,[1480,450,170,70]),
e('M','F1',[[129,415],[230,415]]),e('M','F2',[[450,415],[530,415]]),e('M','F3',[[760,415],[850,415]]),e('M','F4',[[1095,415],[1180,415]]),e('M','F5',[[1430,415],[1550,415]]),
e('M','M1',[[570,355],[570,180],[430,180],[430,80]],[325,185,215,40]),e('M','M2',[[700,80],[700,130],[620,130],[620,355]],[645,195,185,40]),e('M','M3',[[680,355],[680,290],[1030,290],[1030,80]],[1045,180,215,40]),e('M','M4',[[1300,80],[1300,250],[725,250],[725,355]],[1320,170,190,60]),e('M','M5',[[1240,475],[1240,820]],[990,650,235,75]),e('M','M6',[[1370,820],[1370,475]],[1395,650,225,75])];
const b=[s('P','Technical',20,20,1710,230),s('P','System',20,250,1710,500),s('P','Designer',20,750,1710,200),
s('P','PStart',85,95,44,44,[65,160,95,45]),s('P','Version',210,65,250,100),s('P','Fix',725,65,235,100),s('P','Offers',210,355,250,110),s('P','Validate',520,355,250,110),s('P','Valid',825,383,54,54,[778,458,150,60]),s('P','Calc',990,355,265,110),s('P','Media',990,805,265,110),s('P','Content',1350,530,265,110),s('P','Complete',1445,360,54,54,[1380,280,210,60]),s('P','PDone',1635,365,44,44,[1590,420,130,80]),
e('P','P1',[[129,117],[210,117]]),e('P','P2',[[335,165],[335,355]]),e('P','P3',[[460,410],[520,410]]),e('P','P4',[[770,410],[825,410]]),e('P','P5',[[852,383],[852,165]],[865,285,60,40]),e('P','P6',[[725,115],[630,115],[630,285],[385,285],[385,355]]),e('P','P7',[[879,410],[990,410]],[906,370,50,40]),e('P','P8',[[1122,465],[1122,805]]),e('P','P9',[[1255,860],[1482,860],[1482,640]]),e('P','P10',[[1482,530],[1472,530],[1472,414]]),e('P','P11',[[1445,387],[1305,387],[1305,115],[960,115]],[1308,280,50,40]),e('P','P12',[[1499,387],[1635,387]],[1550,350,50,40])];
const d=[s('Q','QStart',30,90,44,44,[5,145,150,85]),s('Q','Save',150,60,240,105),s('Q','Send',450,60,300,105),s('Q','Result',810,60,240,105),s('Q','Outcome',1110,86,54,54,[1070,160,135,55]),s('Q','Success',1240,60,270,105),s('Q','QDone',1585,90,44,44,[1530,150,130,50]),
s('Q','Retry',1110,350,54,54,[1040,420,200,70]),s('Q','Wait',835,350,54,54,[780,415,160,65]),s('Q','Increment',450,325,265,105),s('Q','Error',1235,510,270,105),s('Q','QFail',1590,540,44,44,[1525,610,170,60]),
e('Q','Q1',[[74,112],[150,112]]),e('Q','Q2',[[390,112],[450,112]]),e('Q','Q3',[[750,112],[810,112]]),e('Q','Q4',[[1050,112],[1110,112]]),e('Q','Q5',[[1164,113],[1240,113]],[1170,65,90,35]),e('Q','Q6',[[1510,112],[1585,112]]),e('Q','Q7',[[1137,140],[1137,350]],[1160,245,210,65]),e('Q','Q8',[[1110,377],[889,377]],[980,325,60,40]),e('Q','Q9',[[835,377],[715,377]]),e('Q','Q10',[[585,325],[585,165]]),e('Q','Q11',[[1164,377],[1365,377],[1365,510]],[1320,420,70,40]),e('Q','Q12',[[1505,562],[1590,562]])];
const diagrams=[['Main',coll,a],['Preparation',el.Prepare,b],['Publication',el.Publish,d]].map(([id,owner,shapes])=>c('bpmndi:BPMNDiagram',{id:'Diagram_'+id,plane:c('bpmndi:BPMNPlane',{id:'Plane_'+id,bpmnElement:owner,planeElement:shapes})}));
const definition=c('bpmn:Definitions',{id:'Definitions_ROP_TOBE',targetNamespace:'urn:omninotation:rop:to-be',rootElements:[process,coll,...defs],diagrams});
const data=captureBpmn(definition);const source=generateUnified(bpmnTextModel(data));
const doc={formatVersion:3,notation:'BPMN',...data,source,draft:source};
await fs.writeFile(out+'/ПР2_BPMN_TO_BE.nsbpmn',await encodeProject(doc));await fs.writeFile(out+'/ПР2_BPMN_TO_BE.txt',source);
console.log(JSON.stringify(validateBpmnData(data),null,2));
