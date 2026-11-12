/* Walking guidance prototype. Position remains in this browser. */
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
  let walked=0;const walkLength=coords.slice(1).reduce((sum,p,j)=>sum+distance(coords[j],p),0);
  for(let j=1;j<coords.length;j++){
   const length=distance(coords[j-1],coords[j]);if(length<.05)continue;
   const direction=bearing(coords[j-1],coords[j]),angle=previous===null?0:turn(previous,direction);
   if(!current||length>=2&&previous!==null&&Math.abs(angle)>=35){
    flush();const turning=previous!==null&&Math.abs(angle)>=35;
    const title=turning?(Math.abs(angle)>=150?'Da la vuelta':angle>0?'Gira a la derecha':'Gira a la izquierda'):output.length?'Continúa recto':'Avanza por el camino';
    current={kind:turning?'turn':'walk',title,detail:'',icon:turning?(Math.abs(angle)>=150?'↶':angle>0?'↱':'↰'):'↑',meters:0,seconds:0,start:total,coordinates:[coords[j-1]]};
   }
   const meters=walkLength?length*e.meters/walkLength:0;
   current.meters+=meters;current.seconds+=walkLength?length*e.seconds/walkLength:0;current.coordinates.push(coords[j]);total+=meters;walked+=meters;if(length>=2)previous=direction;
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
const api={build,distance,project,clean};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!root.document)return;
root.CampusGuidance=api;
const by=id=>document.getElementById(id),make=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
let state=null,card=null,watch=null,marker=null,session=0,lastFocus=null;
function stop(restore=false){session++;if(watch!==null)navigator.geolocation?.clearWatch(watch);watch=null;marker?.remove();marker=null;card?.remove();card=null;state=null;document.body.classList.remove('guidance-active');if(restore&&lastFocus?.isConnected){window.CampusSheet?.setLevel(2);lastFocus.focus();}}
api.stop=stop;
api.getState=()=>state?{mode:state.mode,index:state.index,count:state.steps.length,progress:state.progress,arrived:state.arrived,gps:watch!==null}:null;
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
 const step=state.steps[state.index],next=state.steps[state.index+1],remaining=state.arrived?0:Math.max(0,state.route.meters-state.progress),seconds=state.steps.slice(state.index).reduce((sum,s)=>sum+s.seconds,0);
 by('guidanceBadge').textContent=state.mode==='demo'?'DEMO · avance manual':watch!==null?'GPS · prototipo':'RECORRIDO · avance manual';
 by('guidanceTitle').textContent=state.arrived?'Llegaste a '+state.destination:step.title;
 by('guidanceIcon').textContent=state.arrived?'✓':step.icon;
 by('guidanceDetail').textContent=state.arrived?'Has llegado al final del recorrido hasta la entrada del edificio.':step.detail||'Continúa '+Math.max(1,Math.round(step.meters))+' m por este tramo.';
 by('guidanceRemaining').textContent=Math.round(remaining)+' m';by('guidanceETA').textContent=state.arrived?'Llegada':Math.max(1,Math.ceil(seconds/60))+' min aprox.';
 const progress=by('guidanceProgress');progress.max=state.route.meters||1;progress.value=state.arrived?progress.max:state.progress;
 by('guidanceStep').textContent=state.arrived?'Recorrido completado':'Paso '+(state.index+1)+' de '+state.steps.length;
 by('guidanceNext').textContent=state.arrived?'El acceso al salón se consulta por separado.':next?'Después: '+next.title.toLowerCase()+'.':'Después: llegada a '+state.destination+'.';
 by('guidanceAdvance').textContent=state.arrived?'Finalizar':step.confirm?'Ya salí del ascensor':state.index===state.steps.length-1?'Confirmar llegada':'Siguiente paso';
 by('guidanceBack').disabled=state.index===0||state.arrived||watch!==null;
 by('guidanceGPS').hidden=state.mode==='demo'||state.arrived;by('guidanceGPS').textContent=watch!==null?'Desactivar GPS':'Activar GPS';
 by('guidanceMap').replaceChildren(schematic());
 by('guidanceMessage').textContent=state.message||(state.mode==='demo'?'Simulación: avanza con los botones. No se usa tu ubicación.':'Avanza al completar cada paso o activa el GPS. Confirma los ascensores manualmente.');
}
function advance(){if(!state)return;if(state.arrived){stop(true);return;}if(state.index===state.steps.length-1){state.arrived=true;state.progress=state.route.meters;if(watch!==null)navigator.geolocation?.clearWatch(watch);watch=null;marker?.remove();marker=null;session++;}else{state.index++;state.progress=state.steps[state.index].start;}state.point=null;state.message='';render();}
function gps(){
 if(!state||state.mode==='demo')return;
 if(watch!==null){session++;navigator.geolocation.clearWatch(watch);watch=null;state.message='GPS desactivado. Puedes continuar paso a paso.';render();return;}
 if(!navigator.geolocation||!window.isSecureContext){state.message='El GPS requiere HTTPS y un navegador compatible. Puedes avanzar manualmente.';render();return;}
 const token=++session;state.message='Buscando tu ubicación…';render();
 watch=navigator.geolocation.watchPosition(p=>{
  if(token!==session||!state)return;
  const point=[p.coords.longitude,p.coords.latitude],accuracy=p.coords.accuracy;
  if(!Number.isFinite(accuracy)||accuracy>25){state.message='GPS con poca precisión'+(Number.isFinite(accuracy)?' (±'+Math.round(accuracy)+' m)':'')+'. El avance automático está en pausa; puedes confirmar cada paso.';render();return;}
  const nearest=project(point,state.steps);state.point=nearest.point;
  if(nearest.distance>Math.max(20,accuracy*2)){state.point=null;state.message='Parece que te alejaste del recorrido. Revisa el mapa o pulsa Revisar ruta para comparar de nuevo.';render();return;}
  const current=state.steps[state.index];
  if(!current.confirm){
   // A GPS fix cannot skip an elevator or confirm arrival; neither can it jump across a loop.
   const allowed=nearest.index>=state.index&&nearest.index<=state.index+1;
   if(allowed){state.progress=Math.max(state.progress,Math.min(nearest.progress,current.end));if(nearest.index===state.index+1&&nearest.progress>=current.end+3){state.index++;state.progress=state.steps[state.index].start;}}
  }
  state.message=current.confirm?'Confirma «Ya salí del ascensor» al llegar al nivel indicado. El GPS no distingue pisos.':'Ubicación aproximada · ±'+Math.round(accuracy)+' m. Confirma el paso si el GPS no avanza.';
  if(typeof map!=='undefined'&&map&&typeof mapboxgl!=='undefined'){
   if(!marker){const el=make('div','','guidance-position');marker=new mapboxgl.Marker({element:el}).setLngLat(point).addTo(map);}else marker.setLngLat(point);
  }
  render();
 },error=>{if(token!==session||!state)return;state.message=error.code===1?'No se permitió el acceso a tu ubicación. Continúa con los botones.':'No se pudo obtener tu ubicación. Continúa con los botones o vuelve a activar el GPS.';if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;session++;render();},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 render();
}
function start(route,steps,destination,mode,trigger){
 stop();if(!steps.length)return;lastFocus=trigger;state={route,steps,destination,mode,index:0,progress:0,arrived:false,message:'',point:null};
 card=make('section','','guidance-card');card.id='guidanceCard';card.setAttribute('aria-label','Guía del recorrido');
 card.innerHTML='<div class="guidance-top"><span id="guidanceBadge"></span><button id="guidanceClose" type="button" aria-label="Cerrar guía">×</button></div><div class="guidance-instruction" aria-live="polite" aria-atomic="true"><span id="guidanceIcon" aria-hidden="true"></span><div><h2 id="guidanceTitle" tabindex="-1"></h2><p id="guidanceDetail"></p></div></div><div class="guidance-content"><div class="guidance-destination"></div><div id="guidanceMap"></div><div class="guidance-metrics"><strong id="guidanceRemaining"></strong><span id="guidanceETA"></span><span id="guidanceStep"></span></div><progress id="guidanceProgress" aria-label="Progreso del recorrido"></progress><p id="guidanceNext"></p><div class="guidance-actions"><button id="guidanceBack" type="button" aria-label="Paso anterior">←</button><button id="guidanceAdvance" type="button"></button></div><p id="guidanceMessage" role="status"></p><div class="guidance-tools"><button id="guidanceGPS" type="button">Activar GPS</button><button id="guidanceReview" type="button">Revisar ruta</button></div></div>';
 card.querySelector('.guidance-destination').textContent='Hacia '+destination+' · hasta la entrada';
 card.querySelector('.guidance-content').append(card.querySelector('.guidance-actions'));document.body.append(card);document.body.classList.add('guidance-active');window.CampusSheet?.setLevel(0);
 by('guidanceClose').onclick=()=>stop(true);by('guidanceAdvance').onclick=advance;by('guidanceBack').onclick=()=>{if(state.index>0){state.index--;state.progress=state.steps[state.index].start;state.point=null;render();}};
 by('guidanceGPS').onclick=gps;by('guidanceReview').onclick=()=>{stop(true);by('directions').scrollIntoView({block:'start',behavior:'smooth'});};
 render();by('guidanceTitle').focus({preventScroll:true});
}
api.mount=(section,route,destination)=>{
 stop();const steps=build(route,graph);if(!steps.length)return;
 const actions=make('div','','guidance-launch'),live=make('button','Iniciar recorrido ↗'),demo=make('button','Probar demo');
 live.type=demo.type='button';live.id='startGuidance';demo.id='demoGuidance';live.className='primary';live.onclick=()=>start(route,steps,destination,'manual',live);demo.onclick=()=>start(route,steps,destination,'demo',demo);actions.append(live,demo);section.querySelector('.stats')?.after(actions);
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state&&!document.querySelector('dialog[open]'))stop(true);});
// A shareable entry point for trying the prototype without granting GPS access.
if(new URLSearchParams(location.search).get('recorrido')==='demo')window.addEventListener('load',()=>{
 by('mapStatus').classList.add('hidden');compare();by('demoGuidance')?.click();
},{once:true});
})(typeof window!=='undefined'?window:globalThis);
