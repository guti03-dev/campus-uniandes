/* Route choices depend on stairs, ramps, closures and direction. Counts may be estimated. */
(function(root){
'use strict';
const STEP_RUN_METERS=.30;
const ML_ENTRANCES=['pmwcc5qljiajcr6','pmwcc69o8qjlvhy','pmwcc79kans7wtc'];
function hasStairConflict(e){return e.kind!=='stairs'&&(e.osmTags?.highway==='steps'||/^\s*Escalera(?:s)?\s+interpretada/i.test(e.review||''));}
function hasStairs(e){return e.kind==='stairs'||Number.isInteger(e.steps)&&e.steps>0||hasStairConflict(e);}
function isEstimate(e){return !!e.stepsEstimated||!Number.isInteger(e.steps)||e.steps<=0;}
function stairCount(e){return hasStairs(e)?Number.isInteger(e.steps)&&e.steps>0?e.steps:Math.max(1,Math.ceil(Math.max(0,Number(e.meters)||0)/STEP_RUN_METERS)):0;}
function prepareGraph(graph){
 for(const id of ML_ENTRANCES){const n=graph.nodes[id];if(n?.buildingCode==='J'){n.buildingCode='ML';n.name='Entrada ML';}}
 if(graph.nodes['osm-3821418227']?.buildingCode==='J')graph.nodes['osm-3821418227'].name='Entrada J';
 for(const e of graph.edges){if(hasStairs(e)){
  if(e.kind!=='stairs'){e.sourceKind=e.kind;e.kind='stairs';e.classificationSource='stairs in source note or tags';}
  if(isEstimate(e)){e.steps=stairCount(e);e.stepsEstimated=true;e.stepEstimateMeters=STEP_RUN_METERS;}
 }}
 return graph;
}
function routeSummary(route){
 const edges=route?.edges||[],stairs=edges.filter(hasStairs),steps=stairs.reduce((s,e)=>s+stairCount(e),0),estimated=stairs.some(isEstimate),ramps=edges.filter(e=>!hasStairs(e)&&e.kind==='ramp').length;
 const stepLabel=stairs.length?(estimated?'≈':'')+steps+' escalones':'Sin escaleras',rampLabel=ramps?ramps+' '+(ramps===1?'rampa':'rampas'):'';
 return {hasStairs:!!stairs.length,stairsCount:stairs.length,steps,estimated,ramps,stepLabel,label:[stepLabel,rampLabel].filter(Boolean).join(' · ')};
}
const routeModes=['shortest','fast','stairs','accessible'];
const less=(a,b)=>a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1]);
const equal=(a,b)=>a[0]===b[0]&&a[1]===b[1];
function distance(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length<2||b.length<2||![...a,...b].every(Number.isFinite))return null;
 const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2)));
}
class Heap{
 constructor(){this.items=[];}
 push(item){const a=this.items;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(!less(a[i].f,a[p].f))break;[a[i],a[p]]=[a[p],a[i]];i=p;}}
 pop(){const a=this.items;if(!a.length)return null;const first=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;while(true){let j=i,l=2*i+1,r=l+1;if(l<a.length&&less(a[l].f,a[j].f))j=l;if(r<a.length&&less(a[r].f,a[j].f))j=r;if(j===i)break;[a[i],a[j]]=[a[j],a[i]];i=j;}}return first;}
}
function route(graph,start,goal,mode='shortest',profile={}){
 if(!routeModes.includes(mode))throw Error('Modo desconocido');
 if(!graph.nodes[start]||!graph.nodes[goal])return null;
 const adj=Object.fromEntries(Object.keys(graph.nodes).map(id=>[id,[]]));
 let meterScale=Infinity,timeScale=Infinity,geoValid=true;
 for(const source of graph.edges){
  const e=hasStairs(source)?{...source,kind:'stairs',steps:stairCount(source),stepsEstimated:isEstimate(source)}:source;
  if(!adj[e.from]||!adj[e.to])throw Error('Conexión sin nodo');
  if(![e.seconds,e.meters].every(n=>Number.isFinite(n)&&n>=0)||(e.steps!==null&&(!Number.isInteger(e.steps)||e.steps<0)))throw Error('Peso inválido');
  if(e.closed)continue;
  if(mode==='accessible'&&hasStairs(e))continue;
  adj[e.from].push({edge:e,next:e.to});if(!e.oneWay)adj[e.to].push({edge:e,next:e.from});
  const direct=distance(graph.nodes[e.from].coordinates,graph.nodes[e.to].coordinates);
  if(direct===null)geoValid=false;
  else if(direct>0){meterScale=Math.min(meterScale,e.meters/direct);timeScale=Math.min(timeScale,e.seconds/direct);}
 }
 // Scaling to actual edge weights also supports measured times and synthetic graphs.
 meterScale=geoValid&&Number.isFinite(meterScale)?meterScale*(1-1e-12):0;
 timeScale=geoValid&&Number.isFinite(timeScale)?timeScale*(1-1e-12):0;
 const h=id=>{const d=distance(graph.nodes[id].coordinates,graph.nodes[goal].coordinates)??0;return mode==='stairs'?[0,d*timeScale]:[d*(mode==='shortest'?meterScale:timeScale),0];};
 const stairCost=e=>hasStairs(e)?stairCount(e):0;
 const weight=e=>mode==='stairs'?[stairCost(e),e.seconds]:mode==='shortest'?[e.meters,e.seconds]:[e.seconds,e.meters];
 const g=Object.assign(Object.create(null),{[start]:[0,0]}),previous=Object.create(null),open=new Heap();
 open.push({id:start,g:g[start],f:h(start)});let expanded=0;
 while(open.items.length){
  const current=open.pop();if(!equal(current.g,g[current.id]))continue;
  if(current.id===goal){
   const nodes=[goal],edges=[];let id=goal;
   while(id!==start){const p=previous[id];edges.push({...p.edge,next:id,...(p.edge.geometry?{geometry:{...p.edge.geometry,coordinates:p.edge.from===p.node?p.edge.geometry.coordinates:p.edge.geometry.coordinates.slice().reverse()}}:{})});id=p.node;nodes.push(id);}
   nodes.reverse();edges.reverse();
   return {nodes,edges,accessUncertain:false,stairCost:edges.reduce((sum,e)=>sum+stairCost(e),0),stairsEstimated:edges.some(e=>hasStairs(e)&&isEstimate(e)),meters:edges.reduce((s,e)=>s+e.meters,0),seconds:edges.reduce((s,e)=>s+e.seconds,0),steps:edges.reduce((s,e)=>s+stairCost(e),0),algorithm:'A*',expanded};
  }
  expanded++;
  for(const {edge,next} of adj[current.id]){
   const w=weight(edge),candidate=[current.g[0]+w[0],current.g[1]+w[1]];
   if(!g[next]||less(candidate,g[next])){g[next]=candidate;previous[next]={node:current.id,edge};const estimate=h(next);open.push({id:next,g:candidate,f:[candidate[0]+estimate[0],candidate[1]+estimate[1]]});}
  }
 }
 return null;
}
function guardRouting(routing){if(routing)routing.route=route;}
const api={prepareGraph,guardRouting,route,hasStairs,hasStairConflict,stairCount,isEstimate,routeSummary,STEP_RUN_METERS,ML_ENTRANCES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CampusAccessibility=api;
})(typeof window!=='undefined'?window:globalThis);
