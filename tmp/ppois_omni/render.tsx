import React from 'D:/OmniNotation/node_modules/react/index.js';
import {createRoot} from 'D:/OmniNotation/node_modules/react-dom/client.js';
import {ReactFlow,ReactFlowProvider} from 'D:/OmniNotation/node_modules/@xyflow/react/dist/esm/index.js';
import {buildUmlScene} from 'D:/OmniNotation/src/notations/uml/projection';
import {UmlShape,UmlConnection} from 'D:/OmniNotation/src/ui/uml/UmlShapes';
import 'D:/OmniNotation/node_modules/@xyflow/react/dist/style.css';
import 'D:/OmniNotation/src/ui/uml/uml.css';
const doc=(window as any).modelDocument;
const id=new URLSearchParams(location.search).get('sheet')!;
const scene=buildUmlScene(doc,id);
const minX=Math.min(...scene.nodes.map(n=>n.position.x),...scene.edges.flatMap(e=>(e.data.bends||[]).map(p=>p.x)))-40;
const minY=Math.min(...scene.nodes.map(n=>n.position.y),...scene.edges.flatMap(e=>(e.data.bends||[]).map(p=>p.y)))-40;
const nodes=scene.nodes.map(n=>({...n,type:'uml',style:{width:n.width,height:n.height},position:{x:n.position.x-minX,y:n.position.y-minY}}));
const edges=scene.edges.map(e=>{
 const s=scene.nodes.find(n=>n.id===e.source),t=scene.nodes.find(n=>n.id===e.target);
 const dx=(t?.position.x||0)+(t?.width||0)/2-(s?.position.x||0)-(s?.width||0)/2;
 const dy=(t?.position.y||0)+(t?.height||0)/2-(s?.position.y||0)-(s?.height||0)/2;
 const sides=e.source===e.target?['right','top']:Math.abs(dx)>=Math.abs(dy)?dx>=0?['right','left']:['left','right']:dy>=0?['bottom','top']:['top','bottom'];
 return {...e,type:'uml',sourceHandle:e.sourceHandle??sides[0]+':out',targetHandle:e.targetHandle??sides[1]+':in',data:{...e.data,labelPosition:e.data.labelPosition?{x:e.data.labelPosition.x-minX,y:e.data.labelPosition.y-minY}:undefined,bends:e.data.bends?.map(p=>({x:p.x-minX,y:p.y-minY}))}};
});
const W=Math.max(...nodes.map(n=>n.position.x+n.width),...edges.map(e=>(e.data.labelPosition?.x||0)+240))+40;
const H=Math.max(...nodes.map(n=>n.position.y+n.height))+40;
(window as any).exportSize={width:Math.ceil(W),height:Math.ceil(H)};
document.body.style.margin='0';document.body.style.width=W+'px';document.body.style.height=H+'px';
const part=Number(new URLSearchParams(location.search).get('part')||0);
if(id.endsWith('_seq'))for(const e of edges){if(e.data.element.kind==='message')e.data.label=e.data.element.properties.sequence+'. '+e.data.label;}
const pubEvent=nodes.flatMap(n=>n.data.events.map(e=>({id:e.id,y:n.position.y+e.y}))).find(e=>e.id==='pub_m8_receive');
const cuts=id==='bom_seq'?[0,nodes.find(n=>n.data.element.id==='bom_alt')!.position.y-10,H]:id==='pub_seq'?[0,pubEvent!.y+40,H]:[0,H];
const start=part?cuts[part-1]:0,end=part?cuts[part]:H,header=part>1?220:0;
if(part){(window as any).exportSize={width:Math.ceil(W),height:Math.ceil(end-start+header)};document.body.style.height=(end-start+header)+'px';}
function Flow({head=false}){return <ReactFlowProvider><ReactFlow nodes={nodes} edges={head?[]:edges} nodeTypes={{uml:UmlShape}} edgeTypes={{uml:UmlConnection}} defaultViewport={{x:0,y:0,zoom:1}} minZoom={0.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{hideAttribution:true}}/></ReactFlowProvider>}
function App(){return <>{header>0&&<div style={{width:W,height:header,overflow:'hidden',position:'relative'}}><div style={{width:W,height:H,position:'absolute',top:0}}><Flow head/></div></div>}<div style={{width:W,height:end-start,overflow:'hidden',position:'relative',background:'white'}}><div style={{width:W,height:H,position:'absolute',top:-start}}><Flow/></div></div></>}
createRoot(document.getElementById('root')!).render(<App/>);
setTimeout(()=>{
 // Print adaptation: make multiplicities visible outside class boxes.
 for(const edge of edges){
  if(!edge.data.fromEnd)continue;
  const el=document.querySelector(`[data-id="${edge.id}"]`);if(!el)continue;
  const labels=el.querySelectorAll('.uml-end-label');
  const fromSide=edge.sourceHandle.split(':')[0],toSide=edge.targetHandle.split(':')[0];
  const shift=(side:string,isFrom:boolean)=>side==='left'?(isFrom?-24:0):side==='right'?(isFrom?0:24):20;
  labels.forEach((label,i)=>{const side=i===0?fromSide:toSide;label.setAttribute('transform',`translate(${shift(side,i===0)},${edge.id.includes('slot_offer')?-30:i===1?28:side==='bottom'?28:0})`)});
 }
 (window as any).exportReady=true;
},1200);
