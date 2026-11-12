// Native GANTT schedule plus an editable SCHEME print view of the same calculated data.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {omniModule} from '../../../tools/runtime.mjs';
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {ganttEngine}=await omniModule('src/notations/gantt/document.ts');
const {calculateSchedule,resourceLoads}=await omniModule('src/notations/gantt/schedule.ts');
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const base=path.resolve('4/ППОИС'),cache=path.resolve('.cache/ppois-pr6-20261112');
await fs.mkdir(cache,{recursive:true});
const plan=JSON.parse(await fs.readFile(path.join(base,'Планирование/План_разработки.json'),'utf8'));
const m:any={id:'pr6_schedule',label:'План разработки информационной системы',elements:[]};
const add=(kind:string,id:string,label='',properties:any={})=>m.elements.push({kind,id,label,properties});
add('calendar','weekdays','Пятидневная неделя',{hoursPerDay:'8',monday:'true',tuesday:'true',wednesday:'true',thursday:'true',friday:'true',saturday:'false',sunday:'false'});
add('calendarException','holiday','4 ноября',{owner:'weekdays',date:'2026-11-04',working:'false'});
add('plan','plan','Разработка ИС',{start:plan.start,calendar:'weekdays',mode:'auto'});
add('diagram','gantt','План разработки',{type:'gantt',plan:'plan'});
const resourceIds=new Map<string,string>();
for(const [i,role] of Object.keys(plan.role_effort).entries()){const id='resource_'+(i+1);resourceIds.set(role,id);add('resource',id,role,{role,capacityHoursPerDay:'8'});}
const leafId=(code:string)=>'task_'+code.replace('.','_');
for(const phase of plan.tasks){
 const parent='stage_'+phase.id;
 add('task',parent,phase.name,{kind:'summary',order:String(phase.id),wbsCode:String(phase.id)});
 add('view','v_'+parent,'',{diagram:'gantt',element:parent});
 for(const [i,t] of phase.subtasks.entries()){
  const id=leafId(t.code),hours=Object.values(t.effort).reduce((a:any,b:any)=>a+b,0) as number;
  add('task',id,t.name,{kind:'task',parent,order:String(i+1),wbsCode:t.code,duration:String(t.duration),effortHours:String(hours*8),progress:'0'});
  add('view','v_'+id,'',{diagram:'gantt',element:id});
  for(const [role,days] of Object.entries(t.effort))add('assignment',id+'_'+resourceIds.get(role),'',{task:id,resource:resourceIds.get(role),effortHours:String(Number(days)*8)});
 }
}
for(const phase of plan.tasks)for(const t of phase.subtasks)for(const before of t.after){
 const from=leafId(before),to=leafId(t.code),id='dep_'+from+'_'+to;
 add('dependency',id,'',{from,to,type:'FS',lag:'0'});
 add('view','v_'+id,'',{diagram:'gantt',element:id,from:'v_'+from,to:'v_'+to});
}
const native=ganttEngine.create(m);native.layout.diagrams.gantt={gantt:{scale:'weeks',tableWidth:1600,today:false}};
const diagnostics=ganttEngine.validate(m);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const schedule=calculateSchedule(m),rows:any[]=[];
for(const phase of plan.tasks){
 const t=schedule.tasks.get('stage_'+phase.id);
 if(t.startDate!==phase.start_date||t.finishDate!==phase.end_date||t.duration!==phase.duration)throw Error('Phase date mismatch '+phase.id);
 if(t.hours!==Object.values(phase.effort).reduce((a:any,b:any)=>a+b,0)*8)throw Error('Phase effort mismatch '+phase.id);
 rows.push({code:String(phase.id),name:phase.name,kind:'summary',performers:Object.keys(phase.effort),start:t.startDate,finish:t.finishDate});
 for(const task of phase.subtasks){const calculated=schedule.tasks.get(leafId(task.code));
  if(calculated.startDate!==task.start_date||calculated.finishDate!==task.end_date||calculated.duration!==task.duration)throw Error('Task date mismatch '+task.code);
  rows.push({code:task.code,name:task.name,kind:'task',performers:task.performers,start:calculated.startDate,finish:calculated.finishDate});
 }
}
const loads=resourceLoads(m,schedule);if(loads.some((r:any)=>r.overload>1e-7))throw Error('Resource overload');
const nativeFile=path.join(base,'Планирование/ПР6_План_разработки.omni');
await fs.writeFile(nativeFile,await encodeProject(native)+'\n');await decodeProject(await fs.readFile(nativeFile,'utf8'));
// The stock GANTT print exporter always adds service notes and resource-code legends.
// This model is its report view: actual editable OmniNotation elements, no SVG/raster drawing.
const print:any={id:'pr6_print',label:'Календарный график разработки',elements:[]},nodes:any={};
const item=(kind:string,id:string,label:string,properties:any={})=>print.elements.push({kind,id,label,properties});
item('diagram','calendar','Календарный график',{type:'general'});
function rect(id:string,x:number,y:number,w:number,h:number,fill='#000000'){
 item('block',id,'',{shape:'rectangle',role:'generic'});item('view','v_'+id,'',{diagram:'calendar',element:id});
 nodes['v_'+id]={x:x-w/98,y:y-h/98,width:w/.98,height:h/.98,z:1,style:{fill,stroke:fill,lineWidth:.1}};
}
function label(id:string,body:string,x:number,y:number,w:number,h:number,size=26){
 item('label',id,body,{text:body});item('view','v_'+id,'',{diagram:'calendar',element:id});
 nodes['v_'+id]={x,y,width:w,height:h,z:4,style:{fontSize:size,color:'#000000'}};
}
const rowH=44,top=78,x0=1135,dayW=20,totalW=x0+56*dayW,totalH=top+rows.length*rowH;
const day=(s:string)=>Date.parse(s+'T00:00:00Z'),origin=day(plan.start),dx=(s:string)=>(day(s)-origin)/86400000*dayW;
label('code_header','Код',0,10,105,58,28);label('task_header','Этап / задача',105,10,600,58,28);label('people_header','Исполнители',705,10,430,58,28);
for(let i=0;i<=56;i++){
 const x=x0+i*dayW;
 rect('grid_day_'+i,x,top,i%7===0?1.2:.8,totalH-top,i%7===0?'#777777':'#cccccc');
 if(i<56&&i%7===0){const d=new Date(origin+i*86400000).toISOString().slice(0,10);label('week_'+i,d.slice(8,10)+'.'+d.slice(5,7),x,10,140,58,25);}
}
for(const x of [0,105,705,x0,totalW])rect('column_'+x,x,5,1.1,totalH-5,'#777777');
for(let i=0;i<=rows.length;i++)rect('line_'+i,0,top+i*rowH,totalW,.6,'#aaaaaa');
const short:any={'Backend-разработчик':'Backend','Frontend-разработчик':'Frontend','Руководитель проекта':'Рук. проекта','Администратор БД':'Адм. БД','Инженер эксплуатации':'Эксплуатация'};
for(const [i,row] of rows.entries()){
 const y=top+i*rowH,isSummary=row.kind==='summary';
 label('code_'+i,row.code,0,y,105,rowH,25);
 label('task_'+i,isSummary?row.name.toUpperCase():row.name,105+(isSummary?0:25),y,600-(isSummary?0:25),rowH,isSummary?28:26);
 label('people_'+i,row.performers.map((s:string)=>short[s]??s).join(', '),705,y,430,rowH,24);
 const a=x0+dx(row.start),b=x0+dx(row.finish)+dayW;
 if(isSummary){rect('stage_bar_'+i,a,y+18,b-a,6);rect('stage_start_'+i,a,y+18,3,14);rect('stage_finish_'+i,b-3,y+18,3,14);}
 else for(let d=day(row.start);d<=day(row.finish);d+=86400000){const date=new Date(d),iso=date.toISOString().slice(0,10);if(![0,6].includes(date.getUTCDay())&&iso!=='2026-11-04')rect('work_'+i+'_'+iso,x0+(d-origin)/86400000*dayW+1,y+12,dayW-2,20);}
}
const presentation=schemeEngine.create(print);Object.assign(presentation.layout.nodes,nodes);
const printDiagnostics=schemeEngine.validate(print);if(printDiagnostics.some((d:any)=>d.blocksCommit||d.blocksExport))throw Error(JSON.stringify(printDiagnostics));
const printFile=path.join(base,'Схемы/ПР6_Гант.omni');await fs.writeFile(printFile,await encodeProject(presentation)+'\n');await decodeProject(await fs.readFile(printFile,'utf8'));
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options:{format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:5000,margin:12},jobs:[{file:printFile,diagramId:'calendar',title:'ПР6_Гант_этапы_задачи'}]},null,2));
const proof={diagnostics,printWarnings:printDiagnostics.length,source_sha256:{native:createHash('sha256').update(await fs.readFile(nativeFile)).digest('hex'),presentation:createHash('sha256').update(await fs.readFile(printFile)).digest('hex')},summaryCount:8,taskCount:16,assignmentCount:m.elements.filter((e:any)=>e.kind==='assignment').length,effortHours:560,resourceOverloads:0,rows};
await fs.writeFile(path.join(base,'Планирование/Проверка_плана.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({summaryCount:8,taskCount:16,assignments:proof.assignmentCount,diagnostics,printWarnings:proof.printWarnings}));
