import React from 'D:/OmniNotation/node_modules/react/index.js';
import {createRoot} from 'D:/OmniNotation/node_modules/react-dom/client.js';
import {ReactFlow,ReactFlowProvider} from 'D:/OmniNotation/node_modules/@xyflow/react/dist/esm/index.js';
import {buildUmlScene} from 'D:/OmniNotation/src/notations/uml/projection';
import {umlSceneBounds,routeUmlEdges} from 'D:/OmniNotation/src/notations/uml/geometry';
import {UmlShape,UmlConnection} from 'D:/OmniNotation/src/ui/uml/UmlShapes';
import 'D:/OmniNotation/node_modules/@xyflow/react/dist/style.css';
import 'D:/OmniNotation/src/ui/uml/uml.css';
const doc=(window as any).modelDocument;
const query=new URLSearchParams(location.search),id=query.get('sheet')!,part=Number(query.get('part')||0);
const scene=buildUmlScene(doc,id);
// Numbered captions are a report presentation choice; route with the same native geometry.
if(id.endsWith('_seq')){
 for(const edge of scene.edges)if(edge.data.element.kind==='message')edge.data.label=edge.data.element.properties.sequence+'. '+edge.data.label;
 scene.edges=routeUmlEdges(scene.nodes,scene.edges);
}
// Print typography: keep every routed path, enlarge text boxes about their native anchors.
for(const edge of scene.edges){
 const g=edge.data.geometry!,b=g.label,oldX=b.x,cx=b.x+b.width/2,bottom=b.y+b.height;
 b.width*=4/3;b.height=b.lines.length*20+8;b.x=cx-b.width/2;b.y=bottom-b.height;
 if(id==='comm'&&edge.data.element.kind==='message'&&g.points.length===2&&g.points[0].x===g.points[1].x)
  for(const point of g.points)point.x+=b.x-oldX;
}
for(const node of scene.nodes)if(node.kind==='lifeline'&&node.data.headHeight)node.data.headHeight=Math.ceil(node.data.headHeight*1.35);
for(const frame of scene.nodes.filter(n=>n.data.shape==='interactionFrame')){
 const right=Math.max(...scene.edges.map(e=>e.data.geometry!.label.x+e.data.geometry!.label.width));
 frame.width=Math.max(frame.width,right-frame.position.x+28);
}
const bounds=umlSceneBounds(scene.nodes,scene.edges),W=Math.ceil(bounds.width),H=Math.ceil(bounds.height);
const nodes=scene.nodes.map(n=>({...n,type:'uml',style:{width:n.width,height:n.height}}));
const edges=scene.edges.map(e=>({...e,type:'uml',sourceHandle:e.sourceHandle??e.data.geometry!.sourceSide+':out',targetHandle:e.targetHandle??e.data.geometry!.targetSide+':in'}));
const pubEvent=nodes.flatMap(n=>n.data.events.map(e=>({id:e.id,y:n.position.y+e.y-bounds.y}))).find(e=>e.id==='pub_m8_receive');
const cuts=id==='bom_seq'?[0,nodes.find(n=>n.data.element.id==='bom_alt')!.position.y-bounds.y-10,H]:id==='pub_seq'?[0,pubEvent!.y+35,H]:[0,H];
const header=id.endsWith('_seq')?Math.ceil(Math.max(...nodes.filter(n=>n.kind==='lifeline').map(n=>n.position.y+(n.data.headHeight||54)))-bounds.y+22):0;
const start=part?cuts[part-1]:0,end=part?cuts[part]:H,repeat=part>1?header:0;
(window as any).exportSize={width:W,height:Math.ceil(end-start+repeat)};
(window as any).sceneData={bounds,nodes:scene.nodes,edges:scene.edges,cuts,header};
document.body.style.width=W+'px';document.body.style.height=(end-start+repeat)+'px';
function Flow({head=false}){return <ReactFlowProvider><ReactFlow nodes={nodes} edges={head?[]:edges} nodeTypes={{uml:UmlShape}} edgeTypes={{uml:UmlConnection}} defaultViewport={{x:-bounds.x,y:-bounds.y,zoom:1}} minZoom={0.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{hideAttribution:true}}/></ReactFlowProvider>}
function App(){return <>{repeat>0&&<div style={{width:W,height:repeat,overflow:'hidden',position:'relative'}}><div style={{width:W,height:H,position:'absolute',top:0}}><Flow head/></div></div>}<div style={{width:W,height:end-start,overflow:'hidden',position:'relative',background:'white'}}><div style={{width:W,height:H,position:'absolute',top:-start}}><Flow/></div></div></>}
createRoot(document.getElementById('root')!).render(<App/>);
setTimeout(()=>{(window as any).exportReady=true},800);
