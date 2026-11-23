// Native export views of the same complete classifier tree.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {omniModule} from '../../../tools/runtime.mjs';
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const base=path.resolve('4/ППОИС'),dir=path.join(base,'Схемы'),cache=path.resolve('.cache/ppois-pr9-20261112');
await fs.mkdir(cache,{recursive:true});
const file=path.join(dir,'ПР9_Классификация.omni'),original=JSON.parse(await fs.readFile(file,'utf8'));
const m=original.model,layout=original.layout;
// Keep the semantic coding pattern, while its compact report view is a new sheet.
const oldPrint=new Set(m.elements.filter((e:any)=>e.kind==='view'&&e.properties.diagram==='coding_print').map((e:any)=>e.properties.element));
m.elements=m.elements.filter((e:any)=>e.id!=='coding_print'&&!oldPrint.has(e.id)&&!(e.kind==='view'&&e.properties.diagram==='coding_print'));
const live=new Set(m.elements.filter((e:any)=>e.kind==='view').map((e:any)=>e.id));
for(const k of Object.keys(layout.nodes))if(!live.has(k))delete layout.nodes[k];
for(const k of Object.keys(layout.edges))if(!live.has(k))delete layout.edges[k];
// Reproducible geometry: source coordinates are restored from table IDs, not
// repeatedly scaled from the last generated project.
for(const v of m.elements.filter((e:any)=>e.kind==='view'&&!e.properties.from&&e.properties.diagram!=='coding')){
 const b=layout.nodes[v.id];
 if(!b)throw Error('Missing node geometry');
 if(!b.style?.fontSize){b.y*=1.2;b.height*=1.2;}
 b.style={...b.style,fontSize:26,fill:'#ffffff',stroke:'#000000',color:'#000000',lineWidth:1.5};
}
for(const v of m.elements.filter((e:any)=>e.kind==='view'&&e.properties.from)){
 const e=layout.edges[v.id],a=layout.nodes[v.properties.from],b=layout.nodes[v.properties.to],middle=(a.x+a.width+b.x)/2;
 e.bends=[{x:middle,y:a.y+a.height/2},{x:middle,y:b.y+b.height/2}];
 e.from={side:'right',offset:.5};e.to={side:'left',offset:.5};e.style={stroke:'#000000'};
}
const blocks=m.elements.filter((e:any)=>e.kind==='block'),links=m.elements.filter((e:any)=>e.kind==='link');
const incoming=new Map(blocks.map((b:any)=>[b.id,0])),children=new Map(blocks.map((b:any)=>[b.id,[] as string[]]));
for(const l of links){incoming.set(l.properties.to,Number(incoming.get(l.properties.to))+1);children.get(l.properties.from)!.push(l.properties.to);}
if(blocks.length!==94||links.length!==93||[...incoming].some(([id,n])=>n!==(id==='catalog'?0:1)))throw Error('Not one complete tree');
const seen=new Set<string>(),leaves:string[]=[];
function visit(id:string,depth=0){if(seen.has(id))throw Error('Cycle');seen.add(id);const next=children.get(id)!;if(!next.length){if(depth!==5)throw Error('Wrong leaf depth');const label=blocks.find((b:any)=>b.id===id).label;leaves.push(label.split('\n').at(-1));}for(const c of next)visit(c,depth+1);}
visit('catalog');if(seen.size!==94||new Set(leaves).size!==48)throw Error('Incomplete classifier');
const add=(kind:string,id:string,label='',properties:any={})=>m.elements.push({kind,id,label,properties});
add('diagram','coding_print','Структура кода',{type:'general'});
for(const [i,[value,meaning]] of [['C1','Версия'],['A','Назначение'],['B','Корпус'],['C','Платформа'],['D','ОЗУ'],['E','SSD']].entries()){
 const id='coding_print_'+i,x=20+i*240;
 add('block',id,value,{shape:'rectangle',role:'generic'});add('view','v_'+id,'',{diagram:'coding_print',element:id});
 layout.nodes['v_'+id]={x,y:20,width:200,height:88,style:{fontSize:38,fill:'#ffffff',stroke:'#000000',color:'#000000'}};
 add('label',id+'_meaning',meaning,{text:meaning});add('view','v_'+id+'_meaning','',{diagram:'coding_print',element:id+'_meaning'});
 layout.nodes['v_'+id+'_meaning']={x:x-10,y:120,width:220,height:70,style:{fontSize:28,color:'#000000'}};
 if(i<5){add('label',id+'_dash','-',{text:'-'});add('view','v_'+id+'_dash','',{diagram:'coding_print',element:id+'_dash'});layout.nodes['v_'+id+'_dash']={x:x+200,y:20,width:40,height:88,style:{fontSize:38,color:'#000000'}};}
}
const created=schemeEngine.create(m);
const doc=schemeEngine.decode({...created,layout:{...created.layout,nodes:{...created.layout.nodes,...layout.nodes},edges:{...created.layout.edges,...layout.edges},diagrams:{...created.layout.diagrams,...layout.diagrams}}});const diagnostics=schemeEngine.validate(m);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
await fs.writeFile(file,await encodeProject(doc)+'\n');await decodeProject(await fs.readFile(file,'utf8'));
const audit=JSON.parse(await fs.readFile(path.join(dir,'ПР9_Проверка_дерева.json'),'utf8'));
audit.diagnostics=diagnostics;audit.leaf_codes=leaves.sort();
await fs.writeFile(path.join(dir,'ПР9_Проверка_дерева.json'),JSON.stringify(audit,null,2)+'\n');
const hash=async(f:string)=>createHash('sha256').update(await fs.readFile(f)).digest('hex');
const jobs=[{file,diagramId:'overview',title:'ПР9_Дерево_обзор'},...audit.sheets.map((s:any)=>({file,diagramId:s.id,title:'ПР9_Дерево_'+s.purpose+'_'+s.caseCode})),{file,diagramId:'coding_print',title:'ПР9_Структура_кода'}];
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options:{format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:5000,margin:14},jobs},null,2)+'\n');
await fs.writeFile(path.join(dir,'ПР9_Экспорт_проверка.json'),JSON.stringify({model_sha256:await hash(file),classifier_sha256:await hash(path.join(base,'Классификация/classifier.json')),card_sha256:await hash(path.join(dir,'08_ПР8_card.png')),diagnostics,nodes:94,links:93,leaves:leaves.sort(),files:jobs.map((j:any,i:number)=>String(i+1).padStart(2,'0')+'_'+j.title+'.png')},null,2)+'\n');
console.log(JSON.stringify({nodes:94,links:93,classes:48,sheets:8,diagnostics}));
