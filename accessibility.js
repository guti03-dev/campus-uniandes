/* Describe recorded accessibility without turning missing data into verified data. */
(function(root){
'use strict';
const fields={kind:'tipo de camino',steps:'ausencia de escalones',slope:'pendiente',width:'ancho libre',surface:'superficie',field:'comprobación en campo',conflict:'nota de verificación contradictoria',kindConflict:'clasificación contradictoria: rampa o escalera'};
const kinds={path:'Sendero',stairs:'Escalera',ramp:'Rampa',elevator:'Ascensor',bridge:'Puente',unknown:'Tipo de camino sin clasificar'};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
function hasStairConflict(edge){return edge.kind!=='stairs'&&(edge.osmTags?.highway==='steps'||/^\s*Escalera(?:s)?\s+interpretada/i.test(edge.review||''));}
function edgeSummary(edge,profile={}){
 const limits={maxSlope:8,minWidth:90,...profile},hasStairs=edge.kind==='stairs'||finite(edge.steps)&&edge.steps>0;
 const verificationConflict=edge.accessibility==='verified'&&/not field[- ]verified|no verificado|sin verificar/i.test(edge.review||''),typeConflict=hasStairConflict(edge),conflict=verificationConflict||typeConflict;
 const barriers=[];
 if(hasStairs)barriers.push('escaleras');
 if(edge.closed)barriers.push('tramo cerrado');
 if(!hasStairs&&edge.accessibility==='no')barriers.push('acceso marcado como no accesible');
 if(finite(edge.slope)&&Math.abs(edge.slope)>limits.maxSlope)barriers.push('pendiente superior a tu límite');
 if(finite(edge.width)&&edge.width<limits.minWidth)barriers.push('ancho inferior a tu mínimo');
 if(edge.surface==='uneven')barriers.push('superficie irregular');
 const pending=[];
 if(!hasStairs){
  if(!['path','ramp','elevator','bridge'].includes(edge.kind))pending.push('kind');
  if(edge.steps!==0)pending.push('steps');
  if(!finite(edge.slope))pending.push('slope');
  if(!finite(edge.width))pending.push('width');
  if(!['firm','uneven'].includes(edge.surface))pending.push('surface');
  if(edge.accessibility!=='verified')pending.push('field');
  if(verificationConflict)pending.push('conflict');
  if(typeConflict)pending.push('kindConflict');
 }
 const status=hasStairs?'stairs':barriers.length?'barrier':pending.length?'pending':'recorded';
 return {status,hasStairs,barriers,pending,conflict,verificationConflict,typeConflict,assumed:edge.accessibility==='assumed',countKnown:Number.isInteger(edge.steps)&&edge.steps>=0};
}
const guarded=new WeakSet();
function guardRouting(routing){
 if(!routing||guarded.has(routing))return;
 const original=routing.route;
 routing.route=function(graph,start,goal,mode='shortest',profile={}){
  const selected=mode==='accessible'?{...graph,edges:graph.edges.filter(edge=>!hasStairConflict(edge))}:graph;
  return original.call(this,selected,start,goal,mode,profile);
 };
 guarded.add(routing);
}
function routeSummary(route,profile={}){
 const edges=route?.edges||[],items=edges.map(edge=>({edge,...edgeSummary(edge,profile)}));
 const stairs=items.filter(x=>x.hasStairs),pending=items.filter(x=>!x.hasStairs&&x.pending.length),barriers=items.filter(x=>x.barriers.length),assumed=items.filter(x=>x.assumed),hasTypeConflict=items.some(x=>x.typeConflict);
 const status=!items.length?'empty':stairs.length?'stairs':barriers.length?'barrier':pending.length?'pending':'recorded';
 const stepsKnown=items.length>0&&items.every(x=>x.countKnown),steps=stepsKnown?items.reduce((sum,x)=>sum+x.edge.steps,0):null;
 const stepLabel=stairs.length?(steps>0?steps+' escalones registrados':'Escaleras identificadas'):hasTypeConflict?'Posibles escaleras: clasificación pendiente':!items.length?'Sin tramos peatonales':items.some(x=>x.edge.steps!==0)?'Ausencia de escalones sin confirmar':'Sin escalones registrados';
 return {status,hasStairs:stairs.length>0,hasTypeConflict,stairsCount:stairs.length,pendingCount:pending.length,barrierCount:barriers.length,assumedCount:assumed.length,needsReview:pending.length>0,stepLabel,items};
}
function distance(a,b){const r=Math.PI/180;return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin((b[1]-a[1])*r/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin((b[0]-a[0])*r/2)**2)));}
function edgePlace(edge,buildingCoords={}){
 const c=edge.coordinates||edge.geometry?.coordinates||[];if(!c.length)return 'Ubicación del tramo';
 const mid=c[Math.floor(c.length/2)];let nearest=null;
 for(const [code,point] of Object.entries(buildingCoords)){const meters=distance(mid,point);if(!nearest||meters<nearest.meters)nearest={code,meters};}
 return nearest?'Cerca de '+nearest.code:'Tramo del recorrido';
}
function appendDetails(section,route,buildingCoords={},profile={}){
 const doc=section.ownerDocument,make=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;},summary=routeSummary(route,profile);
 const note=make('p');note.className='route-access-status';note.dataset.status=summary.status;
 note.textContent=summary.hasStairs?'Este recorrido incluye '+summary.stairsCount+' '+(summary.stairsCount===1?'tramo con escaleras identificadas.':'tramos con escaleras identificadas.'):
  summary.hasTypeConflict?'Este recorrido tiene un tramo con clasificación contradictoria: figura como rampa y también como escalera. Revisa el acceso antes de usarlo.':
  summary.status==='barrier'?'Este recorrido tiene barreras registradas para tus preferencias de accesibilidad.':
  summary.status==='pending'?'No hay escaleras registradas en este recorrido, pero hay '+summary.pendingCount+' '+(summary.pendingCount===1?'tramo pendiente de comprobar.':'tramos pendientes de comprobar.')+' No se garantiza el paso en silla de ruedas.':
  summary.status==='recorded'?'Los tramos figuran como verificados en el mapa. La revisión digital no sustituye una comprobación en campo.':'No hay tramos peatonales en este recorrido.';
 section.append(note);
 const details=make('details');details.className='route-access-details';details.append(make('summary',summary.pendingCount?'Qué está identificado y qué falta revisar':'Datos registrados de los tramos'));
 const list=make('ol');
 summary.items.forEach((item,index)=>{
  const li=make('li'),title=make('strong','Tramo '+(index+1)+' · '+(item.typeConflict?'Rampa / escalera (registro contradictorio)':kinds[item.edge.kind]||kinds.unknown)+' · '+edgePlace(item.edge,buildingCoords));
  const description=item.hasStairs?'Escaleras identificadas en el mapa; constituyen una barrera para silla de ruedas.':item.pending.length?'Por comprobar: '+item.pending.map(key=>fields[key]).join(', ')+'.':'Datos marcados como verificados en el mapa.';
  li.append(title,make('p',description));if(!item.hasStairs&&item.barriers.length)li.append(make('p','Barreras registradas: '+item.barriers.join(', ')+'.'));list.append(li);
 });
 details.append(list);section.append(details);return summary;
}
const api={edgeSummary,routeSummary,edgePlace,distance,appendDetails,hasStairConflict,guardRouting,fields,kinds};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CampusAccessibility=api;
})(typeof window!=='undefined'?window:globalThis);
