import {writeFile, mkdir} from 'node:fs/promises';
import {BpmnModdle} from 'file:///D:/OmniNotation/node_modules/bpmn-moddle/dist/index.js';
import {captureBpmn} from 'file:///D:/OmniNotation/src/notations/bpmn/model.ts';
import {bpmnTextModel} from 'file:///D:/OmniNotation/src/notations/bpmn/text.ts';
import {generateUnified} from 'file:///D:/OmniNotation/src/language/unified.ts';
import {encodeProject} from 'file:///D:/OmniNotation/src/persistence/project.ts';
import {validateBpmnData} from 'file:///D:/OmniNotation/src/notations/bpmn/validation.ts';
const factory=new BpmnModdle();
const c=(t,p={})=>factory.create(t,p);
const el={};
function node(id,type,name,props={}) { return el[id]=c('bpmn:'+type,{id,name,...props}); }
const main=[],detail=[],messages=[];
function n(list,id,type,name,props={}){const e=node(id,type,name,props);list.push(e);return e;}
function flow(list,id,from,to,name='',condition='') {
 const e=node(id,'SequenceFlow',name,{sourceRef:el[from],targetRef:el[to],...(condition?{conditionExpression:c('bpmn:FormalExpression',{body:condition})}:{})});
 el[from].set('outgoing',[...(el[from].outgoing||[]),e]);el[to].set('incoming',[...(el[to].incoming||[]),e]);list.push(e);return e;
}
n(main,'Start','StartEvent','Потребность\nв карточке');
n(main,'Init','Task','Инициировать\nновую карточку\nили изменение');
n(main,'Prepare','SubProcess','Подготовить\nданные карточки',{flowElements:detail});
n(main,'Submit','Task','Ввести данные\nв Ozon и отправить\nкарточку');
n(main,'Result','ReceiveTask','Получить статус\nиз Ozon');
n(main,'Accepted','ExclusiveGateway','Опубликована?');
n(main,'Published','EndEvent','Карточка\nопубликована\nили обновлена');
n(main,'RecordError','Task','Зафиксировать\nошибку и замечания\nдля исправления');
n(main,'Failed','EndEvent','Ошибка\nпубликации');
flow(main,'F01','Start','Init');flow(main,'F02','Init','Prepare');flow(main,'F03','Prepare','Submit');flow(main,'F04','Submit','Result');flow(main,'F05','Result','Accepted');flow(main,'F06','Accepted','Published','Да','status = published');flow(main,'F07','Accepted','RecordError','Нет','status = error');flow(main,'F08','RecordError','Failed');
n(detail,'PrepStart','StartEvent','Начало\nподготовки');
n(detail,'BOM','Task','Сформировать BOM\nи сопоставить\nмодели поставщиков');
n(detail,'Check','Task','Проверить\nсовместимость\nкомплектующих');
n(detail,'Compatible','ExclusiveGateway','Совместимо?');
n(detail,'Fix','Task','Исправить\nнесовместимую\nконфигурацию');
n(detail,'Offers','Task','Запросить и собрать\nцены и наличие\nу обоих поставщиков');
n(detail,'Available','ExclusiveGateway','Всё доступно?');
n(detail,'Replace','Task','Локально заменить\nнедоступный\nкомпонент в BOM');
n(detail,'Calculate','Task','Рассчитать\nцену и вес');
n(detail,'Images','Task','Подготовить\nизображения');
n(detail,'PrepEnd','EndEvent','Данные\nподготовлены');
flow(detail,'D01','PrepStart','BOM');flow(detail,'D02','BOM','Check');flow(detail,'D03','Check','Compatible');flow(detail,'D04','Compatible','Fix','Нет','compatible = false');flow(detail,'D05','Fix','Check');flow(detail,'D06','Compatible','Offers','Да','compatible = true');flow(detail,'D07','Offers','Available');flow(detail,'D08','Available','Replace','Нет','available = false');flow(detail,'D09','Replace','Check');flow(detail,'D10','Available','Calculate','Да','available = true');flow(detail,'D11','Calculate','Images');flow(detail,'D12','Images','PrepEnd');
const tech=node('Technical','Lane','Технический специалист',{flowNodeRef:['PrepStart','BOM','Check','Compatible','Fix','Replace','Calculate'].map(x=>el[x])});
const stock=node('Stock','Lane','Сотрудник склада',{flowNodeRef:[el.Offers,el.Available]});
const designer=node('Designer','Lane','Дизайнер',{flowNodeRef:[el.Images,el.PrepEnd]});
el.Prepare.set('laneSets',[c('bpmn:LaneSet',{id:'PrepLanes',lanes:[tech,stock,designer]})]);
const process=node('Process','Process','Формирование и актуализация карточек AS IS',{isExecutable:false,flowElements:main});
const company=node('Ucoms','Participant','ООО «Юкомс»',{processRef:process});
const pc=node('PC4Games','Participant','Поставщик PC4Games');
const it=node('ITPartner','Participant','Поставщик ITPartner');
const ozon=node('Ozon','Participant','Ozon');
function message(id,from,to,name){const msg=node(id+'_Message','Message',name);const e=node(id,'MessageFlow',name,{sourceRef:el[from],targetRef:el[to],messageRef:msg});messages.push(e);return msg;}
const messageDefs=[message('M01','Prepare','PC4Games','Запрос цен\nи наличия'),message('M02','PC4Games','Prepare','Цены\nи наличие'),message('M03','Prepare','ITPartner','Запрос цен\nи наличия'),message('M04','ITPartner','Prepare','Цены\nи наличие'),message('M05','Submit','Ozon','Данные карточки'),message('M06','Ozon','Result','Статус и замечания')];
const collaboration=node('Collaboration','Collaboration','Публикация и внешние участники',{participants:[company,pc,it,ozon],messageFlows:messages});
const bounds=(x,y,width,height)=>c('dc:Bounds',{x,y,width,height});
function shape(view,id,x,y,w,h,label=null){return c('bpmndi:BPMNShape',{id:view+'_'+id+'_di',bpmnElement:el[id],bounds:bounds(x,y,w,h),...(['Participant','Lane'].some(t=>el[id].$type==='bpmn:'+t)?{isHorizontal:true}:{}),...(id==='Prepare'?{isExpanded:false}:{}),...(label?{label:c('bpmndi:BPMNLabel',{bounds:bounds(...label)})}:{})});}
function edge(view,id,points,label=null){return c('bpmndi:BPMNEdge',{id:view+'_'+id+'_di',bpmnElement:el[id],waypoint:points.map(([x,y])=>c('dc:Point',{x,y})),...(label?{label:c('bpmndi:BPMNLabel',{bounds:bounds(...label)})}:{})});}
const a=[
 shape('Main','Ucoms',20,280,1420,420),shape('Main','PC4Games',290,20,390,65),shape('Main','ITPartner',790,20,390,65),shape('Main','Ozon',20,830,1420,65),
 shape('Main','Start',90,383,44,44,[45,435,140,70]),shape('Main','Init',180,355,200,100),shape('Main','Prepare',435,350,210,110),shape('Main','Submit',700,355,210,100),shape('Main','Result',960,355,200,100),shape('Main','Accepted',1205,378,54,54,[1150,445,170,40]),shape('Main','Published',1350,383,44,44,[1290,440,145,90]),shape('Main','RecordError',1120,545,220,100),shape('Main','Failed',1370,573,44,44,[1315,632,120,55]),
 edge('Main','F01',[[134,405],[180,405]]),edge('Main','F02',[[380,405],[435,405]]),edge('Main','F03',[[645,405],[700,405]]),edge('Main','F04',[[910,405],[960,405]]),edge('Main','F05',[[1160,405],[1205,405]]),edge('Main','F06',[[1259,405],[1350,405]],[1280,368,50,30]),edge('Main','F07',[[1232,432],[1232,545]],[1248,490,55,30]),edge('Main','F08',[[1340,595],[1370,595]]),
 edge('Main','M01',[[470,350],[470,170],[365,170],[365,85]],[303,188,160,65]),edge('Main','M02',[[610,85],[610,150],[520,150],[520,350]],[535,200,110,65]),edge('Main','M03',[[570,350],[570,280],[800,280],[800,160],[865,160],[865,85]],[802,200,160,65]),edge('Main','M04',[[1110,85],[1110,300],[615,300],[615,350]],[1140,170,145,65]),
 edge('Main','M05',[[805,455],[805,830]],[615,745,185,35]),edge('Main','M06',[[1060,830],[1060,455]],[1075,750,220,35])
];
const b=[shape('Prep','Technical',20,20,1420,370),shape('Prep','Stock',20,390,1420,210),shape('Prep','Designer',20,600,1420,190),
 shape('Prep','PrepStart',90,128,44,44,[50,180,130,60]),shape('Prep','BOM',185,100,215,100),shape('Prep','Check',445,100,210,100),shape('Prep','Compatible',705,123,54,54,[667,70,135,40]),shape('Prep','Fix',625,270,210,100),shape('Prep','Offers',675,445,245,100),shape('Prep','Available',995,468,54,54,[950,535,160,40]),shape('Prep','Replace',900,265,235,100),shape('Prep','Calculate',1185,100,220,100),shape('Prep','Images',1185,645,220,90),shape('Prep','PrepEnd',1045,668,44,44,[986,723,155,55]),
 edge('Prep','D01',[[134,150],[185,150]]),edge('Prep','D02',[[400,150],[445,150]]),edge('Prep','D03',[[655,150],[705,150]]),edge('Prep','D04',[[732,177],[732,270]],[742,210,55,30]),edge('Prep','D05',[[625,320],[550,320],[550,200]]),edge('Prep','D06',[[759,150],[860,150],[860,420],[795,420],[795,445]],[805,160,50,30]),edge('Prep','D07',[[920,495],[995,495]]),edge('Prep','D08',[[1022,468],[1022,365]],[1032,414,55,30]),edge('Prep','D09',[[1017,265],[1017,230],[620,230],[620,200]]),edge('Prep','D10',[[1049,495],[1148,495],[1148,150],[1185,150]],[1075,462,50,30]),edge('Prep','D11',[[1295,200],[1295,645]]),edge('Prep','D12',[[1185,690],[1089,690]])];
const diagrams=[c('bpmndi:BPMNDiagram',{id:'Diagram_Main',name:'Публикация',plane:c('bpmndi:BPMNPlane',{id:'Plane_Main',bpmnElement:collaboration,planeElement:a})}),c('bpmndi:BPMNDiagram',{id:'Diagram_Preparation',name:'Подготовка',plane:c('bpmndi:BPMNPlane',{id:'Plane_Preparation',bpmnElement:el.Prepare,planeElement:b})})];
const definitions=c('bpmn:Definitions',{id:'Definitions_ROP',targetNamespace:'urn:omninotation:rop:cards',rootElements:[process,collaboration,...messageDefs],diagrams});
const data=captureBpmn(definitions);const source=generateUnified(bpmnTextModel(data));
const doc={formatVersion:3,notation:'BPMN',...data,source,draft:source};
const out='D:/GitHub/MIREA/4/РОП/BPMN';await mkdir(out,{recursive:true});
await writeFile(out+'/РОП_Практика_1_AS_IS.nsbpmn',await encodeProject(doc),'utf8');await writeFile(out+'/РОП_Практика_1_AS_IS.txt',source,'utf8');
const diagnostics=validateBpmnData(data);await writeFile('D:/GitHub/MIREA/tmp/rop_bpmn_review/validation.json',JSON.stringify(diagnostics,null,2));console.log({diagnostics,modelObjects:Object.keys(data.model.objects).length,views:diagrams.length});

