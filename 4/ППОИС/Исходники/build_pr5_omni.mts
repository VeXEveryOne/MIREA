// Native OmniNotation component model. The user's retained deployment image is not rewritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import {omniModule} from '../../../tools/runtime.mjs';
const {encodeProject,decodeProject}=await omniModule('src/persistence/project.ts');
const {textModel,layoutUml}=await omniModule('src/notations/uml/document.ts');
const {generateUnified}=await omniModule('src/language/unified.ts');
const {validateUml}=await omniModule('src/notations/uml/validation.ts');
const dir=path.resolve('4/ППОИС/Схемы'),cache=path.resolve('.cache/ppois-pr45-20261112/pr5');
await fs.mkdir(cache,{recursive:true});
const previous=await decodeProject(await fs.readFile(path.join(dir,'ПР4_Модель_проектирования.omni'),'utf8'));
const model:any={id:'pr5_components',label:'Компоненты информационной системы',elements:[]};
const layout:any={nodes:{},edges:{}};
const add=(kind:string,id:string,label='',properties:any={})=>model.elements.push({kind,id,label,properties});
add('diagram','components','Компоненты информационной системы',{type:'component'});
const components:any[]=[
 ['client','Клиент',['FormRange','FormCard','FormApproval'],0,0,190,100],
 ['app','Прикладной сервис',['ControlRange','ControlCard','ControlApproval'],250,0,210,100],
 ['gateway','Шлюз площадки',[],520,0,190,100],
 ['range','Состав и расчёты',['Version','Slot'],0,160,190,100],
 ['cards','Карточки и контент',['Card','Revision','Image','Attempt'],250,160,210,100],
 ['data','Доступ к данным',[],520,160,190,100],
 ['catalog','Каталог и предложения',[],0,320,190,100],
];
const sourceClasses=previous.model.elements.filter((e:any)=>e.kind==='class').map((e:any)=>e.id).sort();
if(JSON.stringify(components.flatMap(c=>c[2]).sort())!==JSON.stringify(sourceClasses))throw Error('PR4 class distribution is incomplete');
for(const [id,name,classes,x,y,width,height] of components){
 add('component',id,name);add('view','v_'+id,'',{diagram:'components',element:id});layout.nodes['v_'+id]={x,y,width,height};
}
const links:any[]=[['client','app'],['app','range'],['app','cards'],['app','gateway'],['range','catalog'],['cards','data'],['catalog','data']];
for(const [a,b] of links){const id='dep_'+a+'_'+b;add('dependency',id,'',{from:a,to:b});add('view','v_'+id,'',{diagram:'components',element:id,from:'v_'+a,to:'v_'+b});}
layout.edges.v_dep_app_range={bends:[{x:280,y:130},{x:95,y:130}]};
layout.edges.v_dep_catalog_data={bends:[{x:95,y:455},{x:615,y:455}]};
const diagnostics=validateUml(model);if(diagnostics.length)throw Error(JSON.stringify(diagnostics));
const source=generateUnified(textModel(model));
const doc:any={formatVersion:2,notation:'UML',profile:'NS-UML-2.5.1-2',model,source,draft:source,layout:layoutUml(model,layout)};
const file=path.join(dir,'ПР5_Компоненты.omni');await fs.writeFile(file,await encodeProject(doc)+'\n');await decodeProject(await fs.readFile(file,'utf8'));
await fs.writeFile(path.join(cache,'export.json'),JSON.stringify({output:path.join(cache,'native-'+Date.now()),options:{format:'png',background:'white',title:false,legend:false,monochrome:true,font:'Times New Roman',targetWidth:4000,margin:12},jobs:[{file,diagramId:'components',title:'ПР5_Компоненты'}]},null,2));
await fs.writeFile(path.join(dir,'ПР5_Таблицы.json'),JSON.stringify({distribution:components.map(([id,name,classes])=>({id,name,classes})),relations:links.map(([a,b])=>[components.find(c=>c[0]===a)[1],'Компонент',components.find(c=>c[0]===b)[1],'Компонент']),diagnostics},null,2));
console.log(JSON.stringify({components:components.length,classes:12,diagnostics}));
