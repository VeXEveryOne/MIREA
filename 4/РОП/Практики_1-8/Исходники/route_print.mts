// Shared orthogonal routing for the editable models and their print projections.
// Independent connections reserve separate tracks; crossings never imply joins.
export type Point={x:number,y:number};
export type Box={x:number,y:number,width:number,height:number};
export const normal=(side:string)=>({left:[-1,0],right:[1,0],top:[0,-1],bottom:[0,1]}[side]!);
export function attach(n:Box,side:string,offset=.5){
 const [nx,ny]=normal(side);
 return {x:n.x+(side==='right'?n.width:side==='left'?0:n.width*offset),y:n.y+(side==='bottom'?n.height:side==='top'?0:n.height*offset),nx,ny};
}
export function hits(a:Point,b:Point,r:Box,pad=0){
 const x=r.x-pad,y=r.y-pad,w=r.width+2*pad,h=r.height+2*pad;
 if(Math.abs(a.x-b.x)<.01)return a.x>x+.01&&a.x<x+w-.01&&Math.max(a.y,b.y)>y+.01&&Math.min(a.y,b.y)<y+h-.01;
 if(Math.abs(a.y-b.y)<.01)return a.y>y+.01&&a.y<y+h-.01&&Math.max(a.x,b.x)>x+.01&&Math.min(a.x,b.x)<x+w-.01;
 return true;
}
export function segments(points:Point[]){return points.slice(1).map((b,i)=>({a:points[i],b})).filter(s=>Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>.01);}
export function shared(a:Point,b:Point,c:Point,d:Point,gap=.01){
 const av=Math.abs(a.x-b.x)<.01,cv=Math.abs(c.x-d.x)<.01;
 if(av!==cv)return 0;
 if(Math.abs(av?a.x-c.x:a.y-c.y)>=gap)return 0;
 return Math.max(0,Math.min(av?Math.max(a.y,b.y):Math.max(a.x,b.x),av?Math.max(c.y,d.y):Math.max(c.x,d.x))-Math.max(av?Math.min(a.y,b.y):Math.min(a.x,b.x),av?Math.min(c.y,d.y):Math.min(c.x,d.x)));
}
export function crossing(a:Point,b:Point,c:Point,d:Point){
 const av=Math.abs(a.x-b.x)<.01,cv=Math.abs(c.x-d.x)<.01;if(av===cv)return false;
 if(!av)return crossing(c,d,a,b);
 return a.x>Math.min(c.x,d.x)+.01&&a.x<Math.max(c.x,d.x)-.01&&c.y>Math.min(a.y,b.y)+.01&&c.y<Math.max(a.y,b.y)-.01;
}
export function onSegment(p:Point,a:Point,b:Point){
 if(Math.abs(a.x-b.x)<.01)return Math.abs(p.x-a.x)<.01&&p.y>=Math.min(a.y,b.y)-.01&&p.y<=Math.max(a.y,b.y)+.01;
 if(Math.abs(a.y-b.y)<.01)return Math.abs(p.y-a.y)<.01&&p.x>=Math.min(a.x,b.x)-.01&&p.x<=Math.max(a.x,b.x)+.01;
 return false;
}
function simplify(points:Point[]){
 const out:Point[]=[];
 for(const p of points){if(out.length&&Math.hypot(p.x-out.at(-1)!.x,p.y-out.at(-1)!.y)<.01)continue;out.push({x:p.x,y:p.y});
  while(out.length>=3){const [a,b,c]=out.slice(-3);if((a.x===b.x&&b.x===c.x&&(b.y-a.y)*(c.y-b.y)>=0)||(a.y===b.y&&b.y===c.y&&(b.x-a.x)*(c.x-b.x)>=0))out.splice(-2,1);else break;}}
 return out;
}
class Heap{
 q:any[]=[];
 push(v:any){this.q.push(v);let i=this.q.length-1;while(i){const p=(i-1)>>1;if(this.q[p].priority<=v.priority)break;this.q[i]=this.q[p];i=p;}this.q[i]=v;}
 pop(){const v=this.q[0],last=this.q.pop();if(this.q.length){let i=0;while(i*2+1<this.q.length){let c=i*2+1;if(c+1<this.q.length&&this.q[c+1].priority<this.q[c].priority)c++;if(this.q[c].priority>=last.priority)break;this.q[i]=this.q[c];i=c;}this.q[i]=last;}return v;}
}
export function route(a:any,b:any,boxes:Box[],used:Point[][]=[],opts:any={}){
 const gap=opts.gap??16,pad=opts.pad??10,escape=opts.escape??28;
 const start={x:a.x+a.nx*escape,y:a.y+a.ny*escape},end={x:b.x+b.nx*escape,y:b.y+b.ny*escape};
 const occupied=used.flatMap(segments),vertices=used.flat(),obstacles=boxes.map(r=>({x:r.x-pad,y:r.y-pad,width:r.width+pad*2,height:r.height+pad*2}));
 const near=(p:Point,q:Point)=>occupied.some(s=>shared(p,q,s.a,s.b,gap)>.01);
 if(near(a,start)||near(end,b))throw Error('Attachment tracks too close');
 const bounds=opts.bounds;
 const xs=[...new Set([start.x,end.x,...obstacles.flatMap(r=>[r.x-1,r.x+r.width+1]),...occupied.flatMap(s=>s.a.x===s.b.x?[s.a.x-gap,s.a.x+gap]:[]),...(opts.xs??[])])].sort((a,b)=>a-b);
 const ys=[...new Set([start.y,end.y,...obstacles.flatMap(r=>[r.y-1,r.y+r.height+1]),...occupied.flatMap(s=>s.a.y===s.b.y?[s.a.y-gap,s.a.y+gap]:[]),...(opts.ys??[])])].sort((a,b)=>a-b);
 const costOf=(p:Point,q:Point)=>{
  if(bounds&&(Math.min(p.x,q.x)<bounds.x||Math.max(p.x,q.x)>bounds.x+bounds.width||Math.min(p.y,q.y)<bounds.y||Math.max(p.y,q.y)>bounds.y+bounds.height))return Infinity;
  if(obstacles.some(r=>hits(p,q,r))||near(p,q)||vertices.some(v=>onSegment(v,p,q)))return Infinity;
  return Math.hypot(q.x-p.x,q.y-p.y)+occupied.reduce((n,s)=>n+(crossing(p,q,s.a,s.b)?(opts.crossCost??100):0),0);
 };
 const sx=xs.indexOf(start.x),sy=ys.indexOf(start.y),ex=xs.indexOf(end.x),ey=ys.indexOf(end.y),nx=xs.length,ny=ys.length;
 const key=(x:number,y:number,dir:number)=>(y*nx+x)*2+dir;
 const scores=new Map<number,number>(),previous=new Map<number,number>(),queue=new Heap();
 const sk=key(sx,sy,a.nx?0:1);scores.set(sk,0);queue.push({x:sx,y:sy,dir:a.nx?0:1,cost:0,priority:0});let terminal:number|undefined;
 const cache=new Map<string,number>();
 while(queue.q.length){
  const cur=queue.pop(),ck=key(cur.x,cur.y,cur.dir);if(cur.cost!==scores.get(ck))continue;
  if(cur.x===ex&&cur.y===ey){terminal=ck;break;}
  for(const [dx,dy,dir] of [[1,0,0],[-1,0,0],[0,1,1],[0,-1,1]]){
   const x=cur.x+dx,y=cur.y+dy;if(x<0||x>=nx||y<0||y>=ny)continue;
   // The first and final stubs leave and enter the node along its port normal.
   if(ck===sk&&dx*a.nx+dy*a.ny<0)continue;
   if(x===ex&&y===ey&&dx*b.nx+dy*b.ny>0)continue;
   const p={x:xs[cur.x],y:ys[cur.y]},q={x:xs[x],y:ys[y]},cacheKey=[Math.min(cur.x,x),Math.min(cur.y,y),dir].join(',');
   if(cur.dir!==dir&&occupied.some(s=>onSegment(p,s.a,s.b)))continue;
   let step=cache.get(cacheKey);if(step===undefined){step=costOf(p,q);cache.set(cacheKey,step);}if(!Number.isFinite(step))continue;
   const nk=key(x,y,dir),cost=cur.cost+step+(dir===cur.dir?0:(opts.bendCost??45));
   if(cost<(scores.get(nk)??Infinity)){scores.set(nk,cost);previous.set(nk,ck);queue.push({x,y,dir,cost,priority:cost+Math.abs(xs[x]-end.x)+Math.abs(ys[y]-end.y)});}
  }
 }
 if(terminal===undefined)throw Error('No separate orthogonal route');
 const points:Point[]=[];
 for(let k:number|undefined=terminal;k!==undefined;k=previous.get(k)){const pos=Math.floor(k/2);points.unshift({x:xs[pos%nx],y:ys[Math.floor(pos/nx)]});}
 const result=simplify([a,...points,b]);
 if(segments(result).some(s=>occupied.some(t=>shared(s.a,s.b,t.a,t.b)>.01)))throw Error('Shared route segment');
 return result;
}
export function auditRoutes(id:string,routes:any[],boxes:Box[]=[]){
 const overlaps:any[]=[],nodeHits:any[]=[],falseJunctions:any[]=[];
 for(const [i,r] of routes.entries())for(const q of routes.slice(0,i)){
  if(r.points.some(p=>segments(q.points).some(s=>onSegment(p,s.a,s.b)))||q.points.some(p=>segments(r.points).some(s=>onSegment(p,s.a,s.b))))falseJunctions.push({a:q.id,b:r.id});
 }
 for(const [i,r] of routes.entries())for(const s of segments(r.points)){
  for(const q of routes.slice(0,i))for(const t of segments(q.points)){const length=shared(s.a,s.b,t.a,t.b);if(length>.1)overlaps.push({a:q.id,b:r.id,length,opposite:(s.b.x-s.a.x)*(t.b.x-t.a.x)+(s.b.y-s.a.y)*(t.b.y-t.a.y)<0});}
  for(const n of boxes)if(hits(s.a,s.b,n))nodeHits.push({edge:r.id,node:(n as any).id});
 }
 if(overlaps.length||nodeHits.length||falseJunctions.length)throw Error(JSON.stringify({id,overlaps,nodeHits,falseJunctions}));
 return {id,connections:routes.length,overlaps:0,oppositeOverlaps:0,nodeIntersections:0,falseJunctions:0};
}
