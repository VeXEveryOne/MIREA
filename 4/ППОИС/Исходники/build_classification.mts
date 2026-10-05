// Editable SCHEME and print views generated from the same classifier.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {omniModule,runtimeModule} from '../../../tools/runtime.mjs';
import {escape,wrap} from '../../../tools/diagram_text.mts';
const {schemeEngine}=await omniModule('src/notations/scheme/document.ts');
const {encodeProject}=await omniModule('src/persistence/project.ts');
const {default:sharp}=await runtimeModule('sharp');
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.PPOIS_MODEL_OUTPUT??path.join(base,'Схемы');
await fs.mkdir(out,{recursive:true});
const spec=JSON.parse(await fs.readFile(path.join(base,'Классификация/classifier.json'),'utf8'));
const model={id:'ppois_classifier',label:'Классификация компьютерных конфигураций C1',elements:[] as any[]};
const rects:Record<string,any>={}, routes:Record<string,any>={}, leaves=new Set<string>();
const add=(kind:string,id:string,label='',properties:Record<string,string>={})=>{
  model.elements.push({kind,id,label,properties});return id;
};
function node(sheet:string,id:string,label:string,x:number,y:number,width:number,height:number){
  add('block',id,label,{shape:'rectangle',role:'generic'});
  add('view','v_'+id,'',{diagram:sheet,element:id});rects['v_'+id]={x,y,width,height};return id;
}
function link(sheet:string,parent:string,child:string,from='v_'+parent,to='v_'+child){
  const id=parent+'_to_'+child;
  add('link',id,'',{from:parent,to:child,kind:'association'});
  add('view','v_'+id,'',{diagram:sheet,element:id,from,to});
  const a=rects[from],b=rects[to];
  const middle=(a.x+a.width+b.x)/2;
  routes['v_'+id]={bends:[{x:middle,y:a.y+a.height/2},{x:middle,y:b.y+b.height/2}]};
}
const sheets:any[]=[];
for(const [purpose,purposeLabel] of Object.entries(spec.features[0].values)){
  for(const [caseCode,caseLabel] of Object.entries(spec.features[1].values)){
    const sheet='class_'+purpose+'_'+caseCode;
    const purposeTitle=purpose==='3'?String(purposeLabel):`${purposeLabel} конфигурация`;
    add('diagram',sheet,`${purposeTitle}, ${String(caseLabel).toLowerCase()} корпус`,{type:'general'});
    const root=node(sheet,sheet+'_root',`${purposeLabel}\n${caseLabel} корпус\nC1-${purpose}-${caseCode}`,20,315,320,125);
    let index=0;
    for(const [platform,platformLabel] of Object.entries(spec.features[2].values)){
      const pIndex=Number(platform)-1;
      const p=node(sheet,sheet+'_p'+platform,`Платформа ${platformLabel}\nC1-${purpose}-${caseCode}-${platform}`,
        390,166+pIndex*328,320,100);link(sheet,root,p);
      for(const [ram,ramLabel] of Object.entries(spec.features[3].values)){
        const rIndex=Number(ram)-1;
        const ry=100+pIndex*328+rIndex*164;
        const r=node(sheet,p+'_r'+ram,`ОЗУ ${ramLabel}\nC1-${purpose}-${caseCode}-${platform}-${ram}`,
          760,ry,280,80);link(sheet,p,r);
        for(const [ssd,ssdLabel] of Object.entries(spec.features[4].values)){
          const code=`C1-${purpose}-${caseCode}-${platform}-${ram}-${ssd}`;
          if(leaves.has(code))throw Error('Duplicate leaf '+code);
          leaves.add(code);
          const s=node(sheet,r+'_s'+ssd,`SSD ${ssdLabel}\n${code}`,1130,60+index*82,330,70);
          link(sheet,r,s);index++;
        }
      }
    }
    sheets.push({id:sheet,purpose,caseCode,leaves:index});
  }
}
if(leaves.size!==48)throw Error('Expected all 48 classes');
// The overview shares the six case elements with the detail sheets. This is
// one semantic tree, not six disconnected trees with merely matching labels.
add('diagram','overview','Дерево C1: назначение и исполнение корпуса',{type:'general'});
const catalog=node('overview','catalog','Конфигурации\nКлассификатор C1\n48 классов',20,318,320,110);
for(const [purpose,purposeLabel] of Object.entries(spec.features[0].values)){
  const y=130+(Number(purpose)-1)*220;
  const p=node('overview','purpose_'+purpose,`${purposeLabel}\nC1-${purpose}\n16 классов`,420,y,320,100);
  link('overview',catalog,p);
  for(const [caseCode,caseLabel] of Object.entries(spec.features[1].values)){
    const element='class_'+purpose+'_'+caseCode+'_root';
    const view='v_overview_'+element;
    add('view',view,'',{diagram:'overview',element});
    rects[view]={x:880,y:70+((Number(purpose)-1)*2+Number(caseCode)-1)*110,width:530,height:100};
    link('overview',p,element,'v_'+p,view);
  }
}
const blocks=model.elements.filter(e=>e.kind==='block');
const edges=model.elements.filter(e=>e.kind==='link');
const incoming=new Map(blocks.map(e=>[e.id,0]));
const children=new Map(blocks.map(e=>[e.id,[] as string[]]));
for(const e of edges){
  incoming.set(e.properties.to,incoming.get(e.properties.to)!+1);
  children.get(e.properties.from)!.push(e.properties.to);
}
if(blocks.length!==94||edges.length!==93)throw Error('Unexpected full-tree size');
for(const [id,count] of incoming)if(count!==(id==='catalog'?0:1))throw Error('Invalid parent count '+id);
const visited=new Set<string>();
function walk(id:string,depth:number){
  if(visited.has(id))throw Error('Cycle or repeated child '+id);
  visited.add(id);
  const next=children.get(id)!;
  if(next.length===0&&depth!==5)throw Error('Leaf at the wrong feature level');
  for(const child of next)walk(child,depth+1);
}
walk('catalog',0);
if(visited.size!==blocks.length)throw Error('Disconnected classification tree');
add('diagram','coding','Структура классификационного кода C1',{type:'coding'});
add('codePattern','pattern','Классификационный код');
add('view','v_pattern','',{diagram:'coding',element:'pattern'});
rects.v_pattern={x:30,y:50,width:2420,height:260};
let order=0;
add('segment','version','Версия',{owner:'pattern',kind:'literal',literal:'C1',width:'2',meaning:'Версия классификатора',order:String(order++)});
for(const feature of spec.features){
  add('segment','separator_'+feature.key,'',{owner:'pattern',kind:'literal',literal:'-',width:'1',order:String(order++)});
  add('segment',feature.key,feature.name,{owner:'pattern',kind:'value',width:'1',alphabet:'digits',
    example:feature.key==='ram'||feature.key==='ssd'?'2':'1',meaning:feature.name,order:String(order++)});
}
const document=schemeEngine.create(model);
Object.assign(document.layout.nodes,rects);Object.assign(document.layout.edges,routes);
const diagnostics=schemeEngine.validate(model);
if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
await fs.writeFile(path.join(out,'ПР9_Классификация.omni'),await encodeProject(document)+'\n');

// Print typography is deliberately larger than the editor's default view.
for(const sheet of [{id:'overview',overview:true},...sheets]){
  const nodes=model.elements.filter(e=>e.kind==='view'&&e.properties.diagram===sheet.id&&e.properties.element&&!e.properties.from);
  const links=model.elements.filter(e=>e.kind==='view'&&e.properties.diagram===sheet.id&&e.properties.from);
  const index=new Map(model.elements.map(e=>[e.id,e]));
  let content='';
  for(const view of links){
    const a=rects[view.properties.from],b=rects[view.properties.to];
    const route=routes[view.id];
    const points=[{x:a.x+a.width,y:a.y+a.height/2},...route.bends,{x:b.x,y:b.y+b.height/2}];
    content+=`<polyline points="${points.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#4b5563" stroke-width="2.4"/>`;
  }
  for(const view of nodes){
    const box=rects[view.id],element=index.get(view.properties.element);
    const lines=await wrap(element.label,box.width-24,26);
    if(lines.length*30>box.height-8)throw Error('Label does not fit '+element.id);
    content+=`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="5" fill="white" stroke="#334155" stroke-width="2.4"/>`;
    const y=box.y+box.height/2-(lines.length-1)*15;
    content+=`<text text-anchor="middle" font-family="Arial" font-size="26" fill="#111827">${lines.map((s,i)=>`<tspan x="${box.x+box.width/2}" y="${y+i*30+9}">${escape(s)}</tspan>`).join('')}</text>`;
  }
  const headers=sheet.overview?
    [['Объект классификации',180],['Назначение',580],['Корпус и префикс ветви',1145]]:
    [['Класс и корпус',180],['Платформа',550],['Объём ОЗУ',900],['SSD и полный код',1295]];
  content+=headers.map(([t,x])=>`<text x="${x}" y="29" text-anchor="middle" font-family="Arial" font-size="26" font-weight="bold">${escape(t)}</text>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1480" height="735" viewBox="0 0 1480 735"><rect width="1480" height="735" fill="white"/>${content}</svg>`;
  const file=path.join(out,sheet.overview?'ПР9_Дерево_обзор':'ПР9_Дерево_'+sheet.purpose+'_'+sheet.caseCode);
  await fs.writeFile(file+'.svg',svg);await sharp(Buffer.from(svg)).resize({width:2960}).png().toFile(file+'.png');
}
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="300" viewBox="0 0 1460 300"><rect width="1460" height="300" fill="white"/>';
const segments=[['C1','Версия'],['1','Назначение'],['1','Корпус'],['1','Платформа'],['2','ОЗУ'],['2','SSD']];
segments.forEach(([value,label],i)=>{
  const x=30+i*240;
  svg+=`<rect x="${x}" y="45" width="200" height="84" fill="white" stroke="#334155" stroke-width="2.5"/><text x="${x+100}" y="99" text-anchor="middle" font-family="Arial" font-size="38">${value}</text><text x="${x+100}" y="177" text-anchor="middle" font-family="Arial" font-size="27">${label}</text>`;
  if(i<5)svg+=`<text x="${x+220}" y="98" text-anchor="middle" font-family="Arial" font-size="38">-</text>`;
});
svg+='<text x="730" y="254" text-anchor="middle" font-family="Arial" font-size="30">C1-1-1-1-2-2: офисная, башенная, AM5, 32 ГБ ОЗУ, SSD 1 ТБ</text></svg>';
await fs.writeFile(path.join(out,'ПР9_Структура_кода.svg'),svg);
await sharp(Buffer.from(svg)).resize({width:2920}).png().toFile(path.join(out,'ПР9_Структура_кода.png'));
await fs.writeFile(path.join(out,'ПР9_Проверка_дерева.json'),JSON.stringify({
  notation:'SCHEME',profile:'general and coding',sheets,overview:'overview',leaf_codes:[...leaves].sort(),
  tree_checks:{nodes:blocks.length,edges:edges.length,root:'catalog',reachable:visited.size,
    unique_parent:true,leaf_depth:5,shared_case_elements:true},
  diagnostics,all_48_classes_present:true,source:'Классификация/classifier.json'
},null,2)+'\n');
console.log(`Classifier: ${leaves.size} leaves, ${sheets.length} print sheets, native model valid`);
