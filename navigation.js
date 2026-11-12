/* Campus walking guidance. Position remains in this browser. */
(function(root){
'use strict';
const rad=Math.PI/180;
function distance(a,b){return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin((b[1]-a[1])*rad/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2)));}
const bearing=(a,b)=>Math.atan2((b[0]-a[0])*Math.cos((a[1]+b[1])*rad/2),b[1]-a[1])/rad;
const turn=(a,b)=>((b-a+540)%360)-180;
const clean=value=>typeof value==='string'&&!/\bOSM\b|osm-|^p[a-z0-9]{8,}$/i.test(value)?value:'';
function build(route,network){
 const output=[];let current=null,previous=null,total=0;
 const flush=()=>{if(!current)return;current.text=current.title+(current.meters>=1?' durante '+Math.max(1,Math.round(current.meters))+' m':'')+'.';current.end=total;output.push(current);current=null;};
 for(let i=0;i<route.edges.length;i++){
  const e=route.edges[i],coords=e.geometry?.coordinates||e.coordinates||[],forward=e.from===route.nodes[i];
  if(['stairs','ramp','elevator','bridge'].includes(e.kind)){
   flush();const start=total;total+=e.meters;
   let title,detail='',icon;
   if(e.kind==='elevator'){
    const target=forward?e.toFloor:e.fromFloor;
    const code=clean(network.nodes[route.nodes[i]]?.buildingCode||network.nodes[route.nodes[i+1]]?.buildingCode);
    const where=code?' de '+code:'';
    title='Toma el ascensor'+where;
    if(target!==undefined&&target!==null&&String(target).trim()!=='')detail='Ve hasta el piso '+String(target)+'.';
    else detail='Recorre '+e.floors+' '+(e.floors===1?'piso':'pisos')+'. Número de piso de llegada por confirmar.';
    icon='↕';
   }else{title=e.kind==='stairs'?'Toma las escaleras':e.kind==='ramp'?'Continúa por la rampa':'Cruza el puente';icon=e.kind==='stairs'?'▥':e.kind==='ramp'?'↗':'↔';detail='Recorre '+Math.max(1,Math.round(e.meters))+' m.';}
   output.push({kind:e.kind,title,detail,text:title+'. '+detail,icon,meters:e.meters,seconds:e.seconds,start,end:total,coordinates:coords,confirm:e.kind==='elevator'});
   previous=null;continue;
  }
  const walkLength=coords.slice(1).reduce((sum,p,j)=>sum+distance(coords[j],p),0);
  for(let j=1;j<coords.length;j++){
   const length=distance(coords[j-1],coords[j]);if(length<.05)continue;
   const direction=bearing(coords[j-1],coords[j]),angle=previous===null?0:turn(previous,direction);
   if(!current||length>=2&&previous!==null&&Math.abs(angle)>=35){
    flush();const turning=previous!==null&&Math.abs(angle)>=35;
    const title=turning?(Math.abs(angle)>=150?'Da la vuelta':angle>0?'Gira a la derecha':'Gira a la izquierda'):output.length?'Continúa recto':'Avanza por el camino';
    current={kind:turning?'turn':'walk',title,detail:'',icon:turning?(Math.abs(angle)>=150?'↶':angle>0?'↱':'↰'):'↑',meters:0,seconds:0,start:total,coordinates:[coords[j-1]]};
   }
   const meters=walkLength?length*e.meters/walkLength:0;
   current.meters+=meters;current.seconds+=walkLength?length*e.seconds/walkLength:0;current.coordinates.push(coords[j]);total+=meters;if(length>=2)previous=direction;
  }
  if(walkLength<.05&&e.meters>0){flush();output.push({kind:'walk',title:'Continúa por el camino',detail:'',text:'Continúa por el camino.',icon:'↑',meters:e.meters,seconds:e.seconds,start:total,end:total+e.meters,coordinates:coords});total+=e.meters;}
 }
 flush();return output;
}
function project(point,steps){
 let best={distance:Infinity,progress:0,index:0,point:null};
 steps.forEach((step,index)=>{const c=step.coordinates;let before=0;const lengths=c.slice(1).map((p,j)=>distance(c[j],p)),length=lengths.reduce((a,b)=>a+b,0);
  for(let i=1;i<c.length;i++){
   const scale=Math.cos(point[1]*rad),a=[(c[i-1][0]-point[0])*scale,c[i-1][1]-point[1]],b=[(c[i][0]-point[0])*scale,c[i][1]-point[1]],dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/d)):0;
   const foot=[c[i-1][0]+t*(c[i][0]-c[i-1][0]),c[i-1][1]+t*(c[i][1]-c[i-1][1])],away=distance(point,foot);
   if(away<best.distance)best={distance:away,progress:step.start+(length?(before+t*lengths[i-1])/length:0)*step.meters,index,point:foot};before+=lengths[i-1];
  }
 });return best;
}
function validFix(p,now=Date.now()){
 const c=p?.coords;
 return !!c&&[c.longitude,c.latitude,c.accuracy].every(Number.isFinite)&&Math.abs(c.longitude)<=180&&Math.abs(c.latitude)<=90&&c.accuracy>=0&&c.accuracy<=25&&(!Number.isFinite(p.timestamp)||now-p.timestamp<=15000&&p.timestamp<=now+5000);
}
function nearestStart(network,point,maxDistance=40){
 const outgoing=new Set();for(const e of network.edges)if(!e.closed){outgoing.add(e.from);if(!e.oneWay)outgoing.add(e.to);}
 let best=null;for(const id of outgoing){const node=network.nodes[id];if(!node?.coordinates)continue;const meters=distance(point,node.coordinates);if(meters<=maxDistance&&(!best||meters<best.distance))best={id,node,distance:meters};}return best;
}
const api={build,distance,project,clean,validFix,nearestStart};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!root.document)return;
root.CampusGuidance=api;
const by=id=>document.getElementById(id),make=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
let state=null,card=null,watch=null,marker=null,session=0,lastFocus=null,trackedMap=null,replanDialog=null;
const demoEnabled=new URLSearchParams(location.search).get('recorrido')==='demo';
function untrack(){if(watch!==null)navigator.geolocation?.clearWatch(watch);watch=null;marker?.remove();marker=null;if(trackedMap){trackedMap.off('dragstart',dragged);trackedMap.setPadding?.({top:0,right:0,bottom:0,left:0});}trackedMap=null;}
function dragged(){if(state){state.following=false;render();}}
function stop(restore=false){session++;untrack();replanDialog?.close();replanDialog?.remove();replanDialog=null;card?.remove();card=null;state=null;document.body.classList.remove('guidance-active');if(restore&&lastFocus?.isConnected){window.CampusSheet?.setLevel(2);lastFocus.focus();}}
api.stop=stop;
api.getState=()=>state?{mode:state.mode,index:state.index,count:state.steps.length,progress:state.progress,arrived:state.arrived,gps:watch!==null,routeMode:state.routeMode,following:state.following,offRoute:state.offRoute,candidate:state.candidate?.id||null}:null;
function schematic(){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 120');svg.setAttribute('role','img');svg.setAttribute('aria-label','Esquema del recorrido hasta '+state.destination);svg.classList.add('guidance-map');
 const routeCoords=state.steps.flatMap(s=>s.coordinates);if(!routeCoords.length)return svg;
 const xs=routeCoords.map(c=>c[0]),ys=routeCoords.map(c=>c[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
 const ratio=Math.cos(cy*rad),spanX=Math.max(.00025,(Math.max(...xs)-Math.min(...xs))*ratio),spanY=Math.max(.00025,Math.max(...ys)-Math.min(...ys)),scale=Math.min(290/spanX,85/spanY);
 const xy=c=>[170+(c[0]-cx)*ratio*scale,60-(c[1]-cy)*scale],draw=(name,attrs)=>{const n=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);return n;};
 for(const e of graph.edges){const c=e.geometry?.coordinates||[];draw('polyline',{points:c.map(xy).map(c=>c.join(',')).join(' '),fill:'none',stroke:'#d8e2d4','stroke-width':3});}
 draw('polyline',{points:routeCoords.map(xy).map(c=>c.join(',')).join(' '),fill:'none',stroke:'#246a4e','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'});
 const first=xy(routeCoords[0]),last=xy(routeCoords.at(-1));draw('circle',{cx:first[0],cy:first[1],r:5,fill:'white',stroke:'#246a4e','stroke-width':2});draw('circle',{cx:last[0],cy:last[1],r:6,fill:'#246a4e',stroke:'white','stroke-width':2});
 const current=state.arrived?routeCoords.at(-1):state.point||state.steps[state.index].coordinates[0];if(current){const p=xy(current);draw('circle',{cx:p[0],cy:p[1],r:10,fill:'#318bea',stroke:'white','stroke-width':3});}
 return svg;
}
function render(){
 if(!state||!card)return;
 card.dataset.map=trackedMap&&trackedMap.isStyleLoaded?.()!==false?'ready':'offline';
 const step=state.steps[state.index],next=state.steps[state.index+1],remaining=state.arrived?0:Math.max(0,state.route.meters-state.progress),fraction=step.meters?Math.max(0,Math.min(1,(step.end-state.progress)/step.meters)):1,seconds=step.seconds*fraction+state.steps.slice(state.index+1).reduce((sum,s)=>sum+s.seconds,0);
 by('guidanceBadge').textContent=state.mode==='demo'?'DEMO · avance manual':state.arrived?'RECORRIDO COMPLETADO':watch!==null?'RECORRIDO · GPS':'RECORRIDO · avance manual';
 by('guidanceTitle').textContent=state.arrived?'Llegaste a '+state.destination:step.title;
 by('guidanceIcon').textContent=state.arrived?'✓':step.icon;
 by('guidanceDetail').textContent=state.arrived?'Has llegado al final del recorrido hasta la entrada del edificio.':step.detail||'Continúa '+Math.max(1,Math.round(step.meters))+' m por este tramo.';
 by('guidanceRemaining').textContent=Math.round(remaining)+' m';by('guidanceETA').textContent=state.arrived?'Llegada':Math.max(1,Math.ceil(seconds/60))+' min aprox.';
 const progress=by('guidanceProgress');progress.max=state.route.meters||1;progress.value=state.arrived?progress.max:state.progress;
 by('guidanceStep').textContent=state.arrived?'Recorrido completado':'Paso '+(state.index+1)+' de '+state.steps.length;
 by('guidanceNext').textContent=state.arrived?'El acceso al salón se consulta por separado.':next?'Después: '+next.title.toLowerCase()+'.':'Después: llegada a '+state.destination+'.';
 by('guidanceAdvance').textContent=state.arrived?'Finalizar':step.confirm?'Ya salí del ascensor':state.index===state.steps.length-1?'Confirmar llegada':'Siguiente paso';
 by('guidanceBack').disabled=state.index===0||state.arrived||watch!==null;
 by('guidanceGPS').hidden=state.mode==='demo'||state.arrived;by('guidanceGPS').textContent=watch!==null?'Pausar GPS':'Activar GPS';
 by('guidanceFollow').hidden=state.mode==='demo'||state.arrived||!state.fix;by('guidanceFollow').textContent=state.following?'Siguiendo ubicación':'Centrar en mi ubicación';
 by('guidanceRecalculate').hidden=!state.offRoute||!state.candidate||state.arrived;
 by('guidanceMap').replaceChildren(schematic());
 by('guidanceMessage').textContent=state.message||(state.mode==='demo'?'Simulación: avanza con los botones. No se usa tu ubicación.':watch!==null?'Seguimiento GPS activo. Puedes confirmar cada paso; confirma los ascensores manualmente.':'Avanza al completar cada paso o activa el GPS. Confirma los ascensores manualmente.');
}
function advance(){if(!state)return;if(state.arrived){stop(true);return;}if(state.index===state.steps.length-1){state.arrived=true;state.progress=state.route.meters;untrack();session++;state.fix=null;state.offRoute=false;state.candidate=null;}else{state.index++;state.progress=state.steps[state.index].start;}state.point=null;state.message='';render();}
function showOnMap(point){
 if(typeof map==='undefined'||!map||typeof mapboxgl==='undefined')return;
 if(trackedMap!==map){if(trackedMap)trackedMap.off('dragstart',dragged);marker?.remove();marker=null;trackedMap=map;trackedMap.on('dragstart',dragged);}
 if(!marker){const el=make('div','','guidance-position');el.setAttribute('role','img');el.setAttribute('aria-label','Tu ubicación aproximada');marker=new mapboxgl.Marker({element:el}).setLngLat(point).addTo(map);}else marker.setLngLat(point);
 if(state.following){
  card.dataset.map=map.isStyleLoaded?.()!==false?'ready':'offline';
  const mobile=window.matchMedia?.('(max-width:700px)').matches,rect=card.getBoundingClientRect();
  const top=mobile?Math.max(130,document.querySelector('.app-menu-buttons')?.getBoundingClientRect().bottom+12||130):90;
  const safeTop=Math.min(top,innerHeight*.3),padding=mobile?{top:safeTop,bottom:Math.max(0,Math.min(innerHeight-safeTop-60,innerHeight-rect.top+18)),left:18,right:58}:{top:90,bottom:40,left:Math.min(400,innerWidth*.3),right:Math.min(460,innerWidth*.34)};
  map.easeTo({center:point,padding,zoom:Math.max(map.getZoom(),18),duration:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:500});
 }
}
function recalculate(){
 if(!state?.candidate||!state.fix||Date.now()-state.fix.time>15000){if(state){state.message='Espera una ubicación precisa y reciente para recalcular.';render();}return;}
 const candidate=state.candidate,token=session;
 replanDialog?.remove();replanDialog=make('dialog','','campus-menu guidance-replan');replanDialog.id='guidanceReplan';replanDialog.setAttribute('aria-labelledby','guidanceReplanTitle');
 replanDialog.innerHTML='<h2 id="guidanceReplanTitle">Retomar el recorrido</h2><p id="guidanceReplanPoint"></p><p>Confirma que puedes llegar a este punto y que estás en el mismo nivel. El acceso desde tu ubicación hasta el punto no está verificado.</p><p id="guidanceReplanMessage" role="status"></p><button id="guidanceReplanConfirm" class="primary" type="button">Confirmar punto y recalcular</button><button id="guidanceReplanCancel" type="button">Cancelar</button>';
 const pointName=clean(candidate.node.buildingCode)?'Entrada de '+candidate.node.buildingCode:clean(candidate.node.name)||'Cruce del camino';
 replanDialog.querySelector('#guidanceReplanPoint').textContent=pointName+' · a '+Math.round(candidate.distance)+' m. Se conservarán tu destino y el tipo de ruta seleccionado.';
 document.body.append(replanDialog);const dialog=replanDialog;dialog.showModal();
 const cancel=()=>{dialog.close();dialog.remove();if(replanDialog===dialog)replanDialog=null;by('guidanceRecalculate')?.focus();};
 dialog.querySelector('#guidanceReplanCancel').onclick=cancel;dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
 dialog.querySelector('#guidanceReplanConfirm').onclick=()=>{
  if(!state||session!==token){cancel();return;}
  if(!state.fix||Date.now()-state.fix.time>15000||distance(state.fix.point,candidate.node.coordinates)>40){dialog.querySelector('#guidanceReplanMessage').textContent='La ubicación cambió o perdió precisión. Cancela y vuelve a obtener un punto cercano.';return;}
  const saved={destinationCode:state.destinationCode,routeMode:state.routeMode,profile:{...state.profile}},result=CampusNavigation.alternatives(graph,candidate.id,saved.destinationCode,saved.profile),chosen=result.routes.find(r=>r.mode===saved.routeMode)?.route;
  if(!chosen){dialog.querySelector('#guidanceReplanMessage').textContent='No hay una conexión disponible desde este punto con el tipo de ruta elegido. Puedes cancelar y revisar otras opciones.';return;}
  if(!window.CampusLocation?.useConfirmedNode(candidate.id)){dialog.querySelector('#guidanceReplanMessage').textContent='No se pudo actualizar el origen. Cancela y vuelve a comparar las rutas.';return;}
  compare();selectRoute(saved.routeMode);by('startGuidance')?.click();
 };
}
function gps(){
 if(!state||state.mode==='demo')return;
 if(watch!==null){session++;untrack();state.fix=null;state.point=null;state.offRoute=false;state.candidate=null;state.message='GPS en pausa. Puedes continuar paso a paso o volver a activarlo.';render();return;}
 if(!navigator.geolocation||!window.isSecureContext){state.message='El GPS requiere HTTPS y un navegador compatible. Puedes avanzar manualmente.';render();return;}
 const token=++session;state.offRouteFixes=0;state.message='Buscando tu ubicación…';render();
 watch=navigator.geolocation.watchPosition(p=>{
  if(token!==session||!state)return;
  const accuracy=p.coords?.accuracy;
  if(!validFix(p)){state.fix=null;state.offRoute=false;state.candidate=null;state.offRouteFixes=0;state.message='GPS con poca precisión o ubicación desactualizada'+(Number.isFinite(accuracy)?' (±'+Math.round(accuracy)+' m)':'')+'. El avance automático está en pausa; puedes confirmar cada paso.';render();return;}
  const point=[p.coords.longitude,p.coords.latitude];state.fix={point,accuracy,time:Date.now()};showOnMap(point);
  const nearest=project(point,state.steps);state.point=nearest.point;
  if(nearest.distance>Math.max(20,accuracy*2)){state.offRouteFixes++;state.offRoute=state.offRouteFixes>=2;state.candidate=state.offRoute?nearestStart(graph,point):null;state.point=point;state.message=state.offRoute?'Te alejaste del recorrido. '+(state.candidate?'Puedes recalcular desde un punto cercano que confirmes.':'No hay un punto conectado cercano para recalcular. Pulsa Revisar ruta.'):'Comprobando si te alejaste del recorrido…';render();return;}
  state.offRouteFixes=0;state.offRoute=false;state.candidate=null;
  const current=state.steps[state.index];
  if(!current.confirm){
   // A GPS fix cannot skip an elevator or confirm arrival; neither can it jump across a loop.
   const local=project(point,state.steps.slice(state.index,state.index+2));
   if(local.distance<=Math.max(20,accuracy*2)){state.progress=Math.max(state.progress,Math.min(local.progress,current.end));if(local.index===1&&local.progress>=current.end+3){state.index++;state.progress=state.steps[state.index].start;}}
  }
  state.message=current.confirm?'Confirma «Ya salí del ascensor» al llegar al nivel indicado. El GPS no distingue pisos.':'Ubicación aproximada · ±'+Math.round(accuracy)+' m. Confirma el paso si el GPS no avanza.';
  render();
 },error=>{if(token!==session||!state)return;state.message=error.code===1?'No se permitió el acceso a tu ubicación. Continúa con los botones.':'No se pudo obtener tu ubicación. Continúa con los botones o vuelve a activar el GPS.';untrack();state.fix=null;state.offRoute=false;state.candidate=null;session++;render();},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 render();
}
function start(route,steps,destination,mode,trigger){
 stop();if(!steps.length)return;lastFocus=trigger;state={route,steps,destination,mode,index:0,progress:0,arrived:false,message:'',point:null,fix:null,following:true,offRoute:false,offRouteFixes:0,candidate:null,routeMode:active?.mode||'shortest',destinationCode:by('destination').value,profile:{...profile}};
 card=make('section','','guidance-card');card.id='guidanceCard';card.setAttribute('aria-label','Guía del recorrido');
 card.innerHTML='<div class="guidance-top"><span id="guidanceBadge"></span><button id="guidanceClose" type="button" aria-label="Cerrar guía">×</button></div><div class="guidance-instruction" aria-live="polite" aria-atomic="true"><span id="guidanceIcon" aria-hidden="true"></span><div><h2 id="guidanceTitle" tabindex="-1"></h2><p id="guidanceDetail"></p></div></div><div class="guidance-content"><div class="guidance-destination"></div><div id="guidanceMap"></div><div class="guidance-metrics"><strong id="guidanceRemaining"></strong><span id="guidanceETA"></span><span id="guidanceStep"></span></div><progress id="guidanceProgress" aria-label="Progreso del recorrido"></progress><p id="guidanceNext"></p><div class="guidance-actions"><button id="guidanceBack" type="button" aria-label="Paso anterior">←</button><button id="guidanceAdvance" type="button"></button></div><p id="guidanceMessage" role="status"></p><div class="guidance-tools"><button id="guidanceGPS" type="button">Activar GPS</button><button id="guidanceReview" type="button">Revisar ruta</button></div></div>';
 card.querySelector('.guidance-destination').textContent='Hacia '+destination+' · hasta la entrada';
 if(state.routeMode==='accessible'&&(route.accessUncertain||route.edges.some(e=>e.accessibility==='assumed'))){const note=make('p',route.accessUncertain?'Accesibilidad por confirmar: faltan datos de algunos tramos.':'Esta ruta usa datos de accesibilidad estimados.','guidance-access');card.querySelector('.guidance-destination').after(note);}
 const follow=make('button','Centrar en mi ubicación');follow.type='button';follow.id='guidanceFollow';follow.onclick=()=>{if(state?.fix){state.following=true;showOnMap(state.fix.point);render();}};card.querySelector('.guidance-tools').append(follow);
 const recalc=make('button','Recalcular desde aquí','guidance-recalculate');recalc.type='button';recalc.id='guidanceRecalculate';recalc.hidden=true;recalc.onclick=recalculate;card.querySelector('.guidance-tools').before(recalc);
 card.querySelector('.guidance-content').append(card.querySelector('.guidance-actions'));document.body.append(card);document.body.classList.add('guidance-active');window.dispatchEvent(new Event('campus:guidance-start'));window.CampusSheet?.setLevel(0);
 by('guidanceClose').onclick=()=>stop(true);by('guidanceAdvance').onclick=advance;by('guidanceBack').onclick=()=>{if(state.index>0){state.index--;state.progress=state.steps[state.index].start;state.point=null;render();}};
 by('guidanceGPS').onclick=gps;by('guidanceReview').onclick=()=>{stop(true);by('directions').scrollIntoView({block:'start',behavior:'smooth'});};
 render();by('guidanceTitle').focus({preventScroll:true});if(mode!=='demo')gps();
}
api.mount=(section,route,destination)=>{
 stop();const steps=build(route,graph);if(!steps.length)return;
 const actions=make('div','','guidance-launch'),live=make('button','Iniciar recorrido ↗'),demo=make('button','Probar demo');
 live.type=demo.type='button';live.id='startGuidance';demo.id='demoGuidance';live.className='primary';live.onclick=()=>start(route,steps,destination,'live',live);demo.onclick=()=>start(route,steps,destination,'demo',demo);actions.append(live);if(demoEnabled)actions.append(demo);section.querySelector('.stats')?.after(actions);
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state&&!document.querySelector('dialog[open]'))stop(true);});
// The optional demo is separate from the normal start/track flow.
if(demoEnabled)window.addEventListener('load',()=>{
 by('mapStatus').classList.add('hidden');compare();by('demoGuidance')?.click();
},{once:true});
})(typeof window!=='undefined'?window:globalThis);
