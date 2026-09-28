import fs from 'node:fs/promises';
import {build} from 'file:///D:/OmniNotation/node_modules/esbuild/lib/main.js';
import {decodeUml} from 'file:///D:/OmniNotation/src/notations/uml/document.ts';
import {validateUml} from 'file:///D:/OmniNotation/src/notations/uml/validation.ts';
import {encodeProject} from 'file:///D:/OmniNotation/src/persistence/project.ts';
import {buildUmlScene} from 'file:///D:/OmniNotation/src/notations/uml/projection.ts';
const base='D:/GitHub/MIREA/tmp/ppois_omni_refresh';
const doc=decodeUml(JSON.parse(await fs.readFile(base+'/original.omni','utf8')));
// Old manually placed sequence labels predate the dynamic timeline.
for(const [id,value] of Object.entries(doc.layout.edges))if(id.includes('_seq_'))delete value.label;
for(const id of ['v_use_UC02_UC03','v_use_UC04_UC03'])delete doc.layout.edges[id];
// Start all actor participation routes from the side of the stick figure.
doc.layout.edges.v_use_manager_UC05={bends:[{x:184,y:74},{x:184,y:620},{x:402.5,y:620}]};
doc.layout.edges.v_use_specialist_UC04={bends:[{x:245,y:314},{x:245,y:547.5}]};
doc.layout.edges.v_use_designer_UC07={bends:[{x:1115,y:397},{x:1115,y:257.5}]};
doc.layout.edges.v_use_designer_UC09={bends:[{x:1115,y:397},{x:1115,y:547.5}]};
for(const edge of buildUmlScene(doc,'use').edges)if(['v_use_UC02_UC03','v_use_UC04_UC03'].includes(edge.id)){
 const b=edge.data.geometry.label;doc.layout.edges[edge.id]={label:{x:b.x+b.width/2+28,y:b.y+b.height}};
}
doc.layout.edges.v_use_UC05_UC08.label={x:715,y:555};
// Leave enough space between class boxes for the actual association-end labels.
const cp={FormBOM:[0,0],BOMController:[340,0],Rule:[680,0],Offer:[1020,0],Slot:[0,280],Version:[340,280],Card:[680,280],Publication:[1020,280],FormCard:[0,620],PubController:[340,620],Adapter:[680,620]};
for(const [name,[x,y]]of Object.entries(cp))doc.layout.nodes['v_classes_'+name]={x,y,width:230,height:y===280?240:180};
for(const id of Object.keys(doc.layout.edges))if(id.startsWith('v_classes_'))delete doc.layout.edges[id];
doc.layout.edges.v_classes_dep_BOMController_Offer={bends:[{x:455,y:-35},{x:1135,y:-35}]};
doc.layout.edges.v_classes_slot_offer={bends:[{x:115,y:230},{x:1135,y:230}]};
doc.layout.edges.v_classes_dep_PubController_Publication={bends:[{x:625,y:710},{x:625,y:550},{x:1135,y:550}]};
doc.layout.edges.v_classes_dep_PubController_Card={bends:[{x:455,y:590},{x:795,y:590}]};
// In communication, each group of messages follows its own visible channel.
const cl=doc.layout.nodes;
for(const [i,x,y]of [[0,0,40],[1,0,350],[2,650,350],[3,650,40],[4,1150,350],[5,1150,660],[6,650,660]])cl['v_comm_pub_lane'+i]={x,y,width:250,height:100};
for(const id of Object.keys(doc.layout.edges))if(id.startsWith('v_comm_'))delete doc.layout.edges[id];
doc.layout.edges.v_comm_pub_channel_2_2={bends:[{x:775,y:490},{x:1060,y:490},{x:1060,y:400}]};
for(const [n,x,y]of [[1,290,195],[14,290,285],[2,485,365],[13,485,455],[3,945,195],[4,945,260],[12,945,325],[5,1040,545],[6,955,585],[11,955,645],[7,1025,365],[10,1025,455],[8,1460,565],[9,1460,635]])doc.layout.edges['v_comm_pub_m'+n]={label:{x,y}};
// Keep message labels on their own event rows rather than across operand guards.
for(const sheet of ['bom_seq','pub_seq']){
 const s=buildUmlScene(doc,sheet);
 for(const edge of s.edges)if(edge.data.element.kind==='message'){
  const p=edge.data.geometry.points;
  doc.layout.edges[edge.id]={label:{x:edge.source===edge.target?p[0].x+110:(p[0].x+p.at(-1).x)/2,y:p[0].y+(['v_bom_seq_bom_m1','v_bom_seq_bom_m12','v_pub_seq_pub_m15'].includes(edge.id)?55:-8)}};
 }
}
const diagnostics=validateUml(doc.model);
if(diagnostics.length)throw new Error(JSON.stringify(diagnostics));
await fs.writeFile(base+'/updated.omni',await encodeProject(doc));
await build({entryPoints:[base+'/render.tsx'],outfile:base+'/bundle.js',bundle:true,platform:'browser',format:'iife',jsx:'automatic',alias:{react:'D:/OmniNotation/node_modules/react'},logLevel:'warning'});
await fs.writeFile(base+'/render.html','<!doctype html><html lang="ru"><meta charset="utf-8"><link rel="stylesheet" href="bundle.css"><style>.react-flow__handle{opacity:0!important}.uml-shape{font-size:16px;line-height:1.25}.uml-class-name small{font-size:13px}.uml-compartment{font-size:14px}.uml-compartment>div{line-height:20px}.uml-edge-label{font-size:16px;line-height:20px;padding:4px 6px}.uml-end-label{font-size:13px}body{margin:0;background:white;font-family:Segoe UI,sans-serif}</style><body><div id="root"></div><script>window.modelDocument='+JSON.stringify(doc)+'</script><script src="bundle.js"></script></body></html>');
console.log('Model valid; renderer built from updated OmniNotation sources.');

