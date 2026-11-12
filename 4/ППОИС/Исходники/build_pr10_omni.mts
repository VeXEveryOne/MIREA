// Function hierarchy, four complete role dialogs and client module structure.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {omniModule} from '../../../tools/runtime.mjs';
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const base=path.resolve('4/ППОИС'),dir=path.join(base,'Схемы'),cache=path.resolve('.cache/ppois-pr10-20261112');
await fs.mkdir(cache,{recursive:true});
const source=path.join(base,'Исходники/practice10_model.json'),data=JSON.parse(await fs.readFile(source,'utf8'));
const m:any={id:'pr10_client',label:'Функции и диалоги клиентской части',elements:[]},nodes:any={},edges:any={},jobs:any[]=[],tree:any[]=[],dialogProof:any[]=[];
let sheet='',serial=0;
const add=(kind:string,id:string,label='',properties:any={})=>m.elements.push({kind,id,label,properties});
function diagram(id:string,title:string){sheet=id;add('diagram',id,title,{type:'general'});jobs.push({diagramId:id,title:'ПР10_'+id});}
function block(id:string,label:string,x:number,y:number,w:number,h:number,size=27,z=2){add('block',id,label,{shape:'rectangle',role:'generic'});add('view','v_'+id,'',{diagram:sheet,element:id});nodes['v_'+id]={x,y,width:w,height:h,z,style:{fontSize:size,color:'#000000',stroke:'#000000',fill:'#ffffff',lineWidth:1.4}};return id;}
function label(id:string,text:string,x:number,y:number,w:number,h:number,size=27){add('label',id,text,{text});add('view','v_'+id,'',{diagram:sheet,element:id});nodes['v_'+id]={x,y,width:w,height:h,z:4,style:{fontSize:size,color:'#000000'}};}
function rule(id:string,x:number,y:number,w:number){block(id,'',x,y,w,1,12,3);}
function link(a:string,b:string,label='',from='bottom',to='top',bends:any[]=[],offset=.5,kind='directed'){
 const id='link_'+serial++;add('link',id,label,{from:a,to:b,kind});add('view','v_'+id,'',{diagram:sheet,element:id,from:'v_'+a,to:'v_'+b});
 edges['v_'+id]={from:{side:from,offset},to:{side:to,offset:.5},bends,style:{stroke:'#000000'}};return id;
}
diagram('functions','Дерево основных и служебных функций');
block('root','Функции клиентской части',540,10,580,85,31);block('main','Основные функции',340,140,620,85,29);block('service','Служебные функции',1330,140,330,85,29);
link('root','main','','bottom','top',[{x:830,y:120},{x:650,y:120}],.35,'association');link('root','service','','bottom','top',[{x:830,y:120},{x:1495,y:120}],.65,'association');tree.push(['root','main'],['root','service']);
data.roles.forEach((r:any,i:number)=>{
 const x=20+i*325,id='role_'+r.id;block(id,r.name,x,290,300,100,28);link('main',id,'','bottom','top',[{x:650,y:255},{x:x+150,y:255}],.5,'association');tree.push(['main',id]);
 r.tasks.forEach((t:any,j:number)=>{const tid='function_'+r.id+'_'+t.id,y=435+j*150;block(tid,t.title,x+25,y,275,110,26);link(id,tid,'','left','left',[{x:x-10,y:340},{x:x-10,y:y+55}],.5,'association');
  tree.push([id,tid]);
 });
});
data.service_functions.forEach((title:string,i:number)=>{const id='service_'+i;block(id,title,1355,435+i*150,305,110,26);link('service',id,'','left','left',[{x:1320,y:182.5},{x:1320,y:490+i*150}],.5,'association');tree.push(['service',id]);});
for(const role of data.roles){
 diagram('dialog_'+role.id,'Сценарий диалога — '+role.name.toLowerCase());
 const login=block('login_'+role.id,'Вход в систему\nЛогин и пароль',535,10,560,90,28),menu=block('menu_'+role.id,'Главное меню\n'+role.name+'\nВыбор задачи',500,145,630,135,28);
 link(login,menu);
 const tasks:any[]=[];
 role.tasks.forEach((task:any,i:number)=>{
  const x=i%2?850:30,y=i<2?350:715,w=650,h=315,id='dialog_'+role.id+'_'+task.id;
  block(id,'',x,y,w,h);label(id+'_title',(i+1)+'. '+task.title,x+12,y+6,w-24,65,29);rule(id+'_rule',x+6,y+75,w-12);
  const body=[...task.steps,'Результат: '+task.result,'Отказ: '+task.failure].join('\n');label(id+'_body',body,x+16,y+83,w-32,h-92,25);
  const bends=i<2?[{x:x+w/2,y:210},{x:x+w/2,y:320}]:[{x:i===2?740:795,y:310},{x:i===2?740:795,y:680},{x:x+w/2,y:680}];
  link(menu,id,'',i<2?(i?'right':'left'):'bottom','top',bends,i<2?.5:i===2?.35:.65);
  tasks.push({id:task.id,title:task.title,steps:task.steps,result:task.result,failure:task.failure,node:id});
 });
 dialogProof.push({role:role.id,name:role.name,menu,tasks});
}
diagram('structure','Структурная схема клиентской части');
label('client_title','Клиентская часть',20,20,1190,60,33);
label('visual_title','Визуальные модули',45,115,460,50,29);
label('logic_title','Невизуальные модули',610,115,570,50,29);
block('auth','Форма входа',70,195,410,95,29);block('navigation','Главное меню и навигация',70,350,410,105,29);
block('forms','Представления ролей:\nменеджер маркетплейса;\nдизайнер; разработчик;\nгенеральный директор',70,535,410,240,28);
block('session','Сеанс и проверка прав',650,195,490,95,29);block('validation','Проверка ввода\nи сообщения об ошибках',650,365,490,105,28);
block('commands','Обработчики команд\nи обновление представлений',650,555,490,125,28);block('application','Прикладной сервис:\nсостав, расчёт, карточки,\nизображения и публикация',1345,550,450,135,28);
link('auth','session','','right','left');link('auth','navigation');link('navigation','forms');link('forms','validation','','right','left',[{x:565,y:655},{x:565,y:417.5}]);link('validation','commands');link('commands','application','','right','left',[],.5,'bidirectional');
link('commands','forms','','bottom','bottom',[{x:895,y:815},{x:275,y:815}]);label('result_label','Результаты',510,750,350,50,27);
const document=schemeEngine.create(m);Object.assign(document.layout.nodes,nodes);Object.assign(document.layout.edges,edges);
const diagnostics=schemeEngine.validate(m);if(diagnostics.some((d:any)=>d.blocksCommit||d.blocksExport))throw Error(JSON.stringify(diagnostics));
const file=path.join(dir,'ПР10_Функции_и_диалоги.omni');await fs.writeFile(file,await encodeProject(document)+'\n');await decodeProject(await fs.readFile(file,'utf8'));
const hash=async(f:string)=>createHash('sha256').update(await fs.readFile(f)).digest('hex');
const proof={source_sha256:await hash(source),model_sha256:await hash(file),diagnostics,tree:{nodes:26,links:25,edges:tree},dialogs:dialogProof,files:jobs.map((j:any,i:number)=>String(i+1).padStart(2,'0')+'_'+j.title+'.png')};
if(tree.length!==25||new Set(tree.flat()).size!==26)throw Error('Incomplete function tree');
await fs.writeFile(path.join(dir,'ПР10_Проверка_модели.json'),JSON.stringify(proof,null,2)+'\n');
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options:{format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:5000,margin:14},jobs:jobs.map(j=>({file,...j}))},null,2)+'\n');
console.log(JSON.stringify({treeNodes:26,treeLinks:25,roleDialogs:4,tasks:15,sheets:6,warnings:diagnostics.length}));
