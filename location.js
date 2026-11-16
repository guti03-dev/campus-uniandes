/* Location stays in the browser. Route origins use confirmed existing network nodes. */
(function(){
'use strict';
const by=id=>document.getElementById(id),origin=by('origin');if(!origin||by('locateOrigin'))return;
const box=document.createElement('section');box.className='location-tools';box.innerHTML='<div class="location-actions"><button id="locateOrigin" type="button">⌖ Usar mi ubicación</button><button id="pickOrigin" type="button">Elegir en mapa</button></div><p id="locationMessage" role="status" aria-live="polite">Usa tu ubicación o selecciona un edificio como origen.</p><div id="locationCandidates" hidden><label for="locationNode">Punto cercano de la red de caminos</label><select id="locationNode"></select><p>Confirma que puedes llegar a este punto. La ruta y su distancia comienzan allí.</p><button id="confirmLocation" type="button">Empezar desde este punto</button></div><button id="cancelLocationPick" type="button" hidden>Cancelar selección en mapa</button>';
origin.after(box);const msg=by('locationMessage'),list=by('locationNode');let request=0,position=null,candidates=[],userMarker=null,candidateMarker=null,picking=null,selectedId=null;
const distance=(a,b)=>{const rad=Math.PI/180;return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin((b[1]-a[1])*rad/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2)));};
function nearby(point){const connected=new Set();for(const e of graph.edges){if(e.closed)continue;connected.add(e.from);if(!e.oneWay)connected.add(e.to);}return Object.entries(graph.nodes).filter(([id,n])=>connected.has(id)&&Array.isArray(n.coordinates)).map(([id,n])=>({id,node:n,distance:distance(point,n.coordinates)})).filter(x=>x.distance<=60).sort((a,b)=>a.distance-b.distance).slice(0,5);}
function marker(old,point,className,label){old?.remove();if(!map||typeof mapboxgl==='undefined')return null;const el=document.createElement('div');el.className=className;el.title=label;el.setAttribute('aria-label',label);el.setAttribute('role','img');const result=new mapboxgl.Marker({element:el,anchor:'center'}).setLngLat(point).addTo(map);if(className==='location-user-point')window.CampusOrientation?.decorate(el,point);return result;}
function showCandidate(){const chosen=candidates.find(c=>c.id===list.value);candidateMarker=marker(candidateMarker,chosen?.node.coordinates,'location-start-point','Punto propuesto para comenzar');}
function cancelPick(){if(picking&&map){map.off('click',picking);map.getCanvas().style.cursor='';}picking=null;by('cancelLocationPick').hidden=true;}
function invalidate(){by('locationCandidates').hidden=true;candidates=[];candidateMarker?.remove();candidateMarker=null;}
function showPosition(point,accuracy,manual=false){cancelPick();window.CampusSheet?.setLevel(1);position={point,accuracy,manual};invalidate();userMarker=marker(userMarker,point,'location-user-point',manual?'Ubicación marcada por ti':'Tu ubicación aproximada');if(!manual&&(!Number.isFinite(accuracy)||accuracy>50)){msg.textContent='La ubicación tiene poca precisión'+(Number.isFinite(accuracy)?' (±'+Math.round(accuracy)+' m)':'')+'. Intenta de nuevo al aire libre o elige el punto en el mapa. No se cambió el origen.';return;}
 candidates=nearby(point);if(!candidates.length){msg.textContent='No hay un punto conectado de nuestra red a menos de 60 m. Elige un edificio o un punto del campus en el mapa. No se cambió el origen.';return;}
 list.replaceChildren(...candidates.map(c=>{const o=document.createElement('option');o.value=c.id;const code=c.node.buildingCode;const name=code?CATALOG.buildings.find(b=>b.code===code)?.name:null;o.textContent=(code?code+(name?' · '+name:''):(c.node.name&&!/OSM|osm-|^p[a-z0-9]{8,}$/i.test(c.node.name)?c.node.name:'Cruce del camino'))+' · a '+Math.round(c.distance)+' m';return o;}));by('locationCandidates').hidden=false;msg.textContent=manual?'Punto marcado. Confirma dónde iniciarás el recorrido.':'Ubicación encontrada · precisión aproximada ±'+Math.round(accuracy)+' m. Confirma el punto de partida.';showCandidate();window.CampusSheet?.setLevel(1);if(map)map.flyTo({center:point,zoom:18});}
list.onchange=showCandidate;
by('locateOrigin').onclick=()=>{pauseAutomatic(true);automaticStatus=false;centerPending=false;cancelPick();const token=++request;invalidate();if(!navigator.geolocation){msg.textContent='Este navegador no permite obtener la ubicación. Usa Elegir en mapa o un edificio.';return;}if(!window.isSecureContext){msg.textContent='Abre la página con HTTPS para usar tu ubicación.';return;}by('locateOrigin').disabled=true;msg.textContent='Buscando tu ubicación… permite el acceso cuando el teléfono lo solicite.';navigator.geolocation.getCurrentPosition(p=>{if(token!==request)return;by('locateOrigin').disabled=false;automaticDenied=false;showPosition([p.coords.longitude,p.coords.latitude],p.coords.accuracy);},error=>{if(token!==request)return;by('locateOrigin').disabled=false;if(error.code===1)automaticDenied=true;msg.textContent=error.code===1?'No se permitió acceder a tu ubicación. Puedes habilitar el permiso del sitio o elegir el punto en el mapa.':error.code===3?'La búsqueda tardó demasiado. Intenta de nuevo o elige en el mapa.':'No se pudo obtener tu ubicación. Activa la ubicación del teléfono o elige en el mapa.';},{enableHighAccuracy:true,timeout:15000,maximumAge:0});};
by('pickOrigin').onclick=()=>{pauseAutomatic(true);automaticStatus=false;centerPending=false;request++;by('locateOrigin').disabled=false;cancelPick();invalidate();if(!map){automaticPaused=false;resumeAutomatic();msg.textContent='El mapa todavía no está disponible. Puedes seleccionar un edificio como origen.';return;}by('cancelLocationPick').hidden=false;msg.textContent='Toca el mapa donde estás. Después confirmarás un punto cercano del camino.';window.CampusSheet?.setLevel(0);map.getCanvas().style.cursor='crosshair';picking=e=>{showPosition([e.lngLat.lng,e.lngLat.lat],0,true);};map.on('click',picking);toast('Toca tu ubicación en el mapa. Pulsa Escape para cancelar.');};
by('cancelLocationPick').onclick=()=>{cancelPick();automaticPaused=false;resumeAutomatic();window.CampusSheet?.setLevel(1);msg.textContent='Selección cancelada. El origen no cambió.';};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking)by('cancelLocationPick').click();});
function useConfirmedNode(id,label='Mi ubicación · punto confirmado'){
 if(!graph.nodes[id])return false;
 automaticPaused=false;automaticStatus=false;centerPending=false;
 request++;by('locateOrigin').disabled=false;cancelPick();invalidate();
 let option=origin.querySelector('[data-location-origin]');if(!option){option=document.createElement('option');option.dataset.locationOrigin='true';origin.prepend(option);}option.value=id;option.textContent=label;origin.value=id;selectedId=id;origin.dispatchEvent(new Event('change',{bubbles:true}));msg.textContent='Origen actualizado al punto confirmado. El acceso desde tu posición hasta ese punto se confirma por separado.';return true;
}
by('confirmLocation').onclick=()=>{const c=candidates.find(x=>x.id===list.value);if(!c||!graph.nodes[c.id]){invalidate();return;}const manual=position.manual;if(!useConfirmedNode(c.id,manual?'Ubicación elegida · punto confirmado':'Mi ubicación · punto confirmado'))return;msg.textContent='Origen confirmado a '+Math.round(c.distance)+' m del punto '+(manual?'marcado':'detectado')+'. Elige tu destino y pulsa Comparar rutas. Puedes actualizar tu ubicación cuando cambies de lugar.';window.CampusSheet?.setLevel(2);};
origin.addEventListener('change',()=>{automaticPaused=false;automaticStatus=false;centerPending=false;queueMicrotask(resumeAutomatic);request++;by('locateOrigin').disabled=false;if(origin.value!==selectedId){selectedId=null;cancelPick();invalidate();candidateMarker?.remove();msg.textContent='Origen por edificio seleccionado. Puedes volver a usar tu ubicación.';}});
const swap=by('swap'),swapOriginal=swap.onclick;swap.onclick=()=>{if(origin.selectedOptions[0]?.hasAttribute('data-location-origin')){toast('Para intercambiar origen y destino, selecciona primero un edificio como origen.');return;}swapOriginal?.();};
// The display of the user's position is independent from the confirmed route origin.
let automaticWatch=null,automaticSession=0,automaticPaused=false,automaticDenied=false,automaticStatus=true,centerPending=true,lastAutomatic=null,expiry=null,permission=null,boundMap=null,automaticReady=false,automaticMarkerMap=null;
const demo=new URLSearchParams(location.search).get('recorrido')==='demo';
function validPosition(p){const c=p?.coords;return !!c&&[c.longitude,c.latitude,c.accuracy].every(Number.isFinite)&&Math.abs(c.longitude)<=180&&Math.abs(c.latitude)<=90&&c.accuracy>=0&&(!Number.isFinite(p.timestamp)||Date.now()-p.timestamp<=30000&&p.timestamp<=Date.now()+5000);}
function automaticMessage(text){if(automaticStatus)msg.textContent=text;}
function removeUserMarker(){userMarker?.remove();userMarker=null;}
function expireAutomatic(){lastAutomatic=null;removeUserMarker();automaticMessage('La señal de ubicación se perdió. Puedes volver a intentar con Usar mi ubicación.');}
function pauseAutomatic(manual=false){automaticPaused=manual;automaticSession++;if(automaticWatch!==null)navigator.geolocation?.clearWatch(automaticWatch);automaticWatch=null;if(expiry!==null)clearTimeout(expiry);expiry=null;}
function displayAutomatic(){
 if(!lastAutomatic||document.hidden||document.body.classList.contains('guidance-active')||automaticPaused)return;
 if(Date.now()-lastAutomatic.time>30000){expireAutomatic();return;}
 const {point,accuracy}=lastAutomatic;
 const label='Tu ubicación aproximada · precisión ±'+Math.round(accuracy)+' m';
 if(userMarker&&automaticMarkerMap===map){userMarker.setLngLat(point);const el=userMarker.getElement?.();if(el){el.title=label;el.setAttribute('aria-label',label);window.CampusOrientation?.decorate(el,point);}}
 else{userMarker=marker(userMarker,point,'location-user-point',label);automaticMarkerMap=map;}
 userMarker?.getElement?.().classList.toggle('location-uncertain',accuracy>50);
 if(centerPending&&accuracy<=50&&nearby(point).length&&map){centerPending=false;map.flyTo({center:point,zoom:18,...(typeof padding==='function'?{padding:padding()}:{}),duration:500});}
}
function receiveAutomatic(p,session){
 if(session!==automaticSession||automaticPaused||document.hidden||document.body.classList.contains('guidance-active'))return;
 if(!validPosition(p)){automaticMessage('Esperando una ubicación reciente…');return;}
 const point=[p.coords.longitude,p.coords.latitude],accuracy=p.coords.accuracy;
 lastAutomatic={point,accuracy,time:Number.isFinite(p.timestamp)?p.timestamp:Date.now()};
 if(expiry!==null)clearTimeout(expiry);expiry=setTimeout(expireAutomatic,Math.max(0,30000-(Date.now()-lastAutomatic.time)));
 displayAutomatic();
 automaticMessage(accuracy>50?'Ubicación aproximada · poca precisión (±'+Math.round(accuracy)+' m).':nearby(point).length?'Ubicación activa · precisión ±'+Math.round(accuracy)+' m.':'Tu ubicación está fuera de la red del campus. Puedes elegir un edificio.');
}
function resumeAutomatic(){
 if(typeof document==='undefined'||!document?.body)return;
 if(!automaticReady||demo||automaticWatch!==null||automaticPaused||automaticDenied||document.hidden||document.body.classList.contains('guidance-active')||!window.isSecureContext||typeof navigator.geolocation?.watchPosition!=='function')return;
 const session=++automaticSession;automaticMessage('Buscando tu ubicación… permite el acceso cuando el navegador lo solicite.');
 try{automaticWatch=navigator.geolocation.watchPosition(p=>receiveAutomatic(p,session),error=>{
  if(session!==automaticSession)return;
  if(error.code===1){automaticDenied=true;pauseAutomatic();lastAutomatic=null;removeUserMarker();automaticMessage('Ubicación sin permiso. Puedes permitirla en el navegador o elegir un edificio.');}
  else automaticMessage(error.code===3?'La ubicación está tardando. Puedes usar Usar mi ubicación o elegir un edificio.':'No se pudo obtener tu ubicación. Puedes usar Usar mi ubicación o elegir un edificio.');
 },{enableHighAccuracy:true,timeout:15000,maximumAge:10000});}catch{automaticMessage('Puedes activar la ubicación con Usar mi ubicación o elegir un edificio.');}
}
async function initializeAutomatic(){
 if(typeof document==='undefined'||!document?.body)return;
 if(demo||!window.isSecureContext||typeof navigator.geolocation?.watchPosition!=='function')return;
 try{if(navigator.permissions?.query){permission=await navigator.permissions.query({name:'geolocation'});automaticDenied=permission.state==='denied';permission.addEventListener?.('change',()=>{
  automaticDenied=permission.state==='denied';if(automaticDenied){pauseAutomatic();lastAutomatic=null;removeUserMarker();automaticMessage('Ubicación sin permiso. Puedes permitirla en el navegador o elegir un edificio.');}else resumeAutomatic();
 });}}catch{}
 if(typeof document==='undefined'||!document?.body)return;
 automaticReady=true;
 if(automaticDenied){automaticMessage('Ubicación sin permiso. Puedes permitirla en el navegador o elegir un edificio.');return;}
 resumeAutomatic();
}
function mapDragged(){centerPending=false;}
function bindLocationMap(){
 if(boundMap!==map){boundMap?.off?.('dragstart',mapDragged);boundMap=map;boundMap?.on?.('dragstart',mapDragged);}
 if(automaticPaused){if(position&&!document.body.classList.contains('guidance-active'))userMarker=marker(userMarker,position.point,'location-user-point',position.manual?'Ubicación marcada por ti':'Tu ubicación aproximada');}
 else displayAutomatic();
}
by('destination')?.addEventListener('change',()=>{centerPending=false;});
by('findRoutes')?.addEventListener('click',()=>{centerPending=false;});
window.addEventListener('campus:guidance-start',()=>{pauseAutomatic();removeUserMarker();invalidate();cancelPick();});
window.addEventListener('campus:guidance-stop',()=>{automaticPaused=false;queueMicrotask(resumeAutomatic);});
window.addEventListener('campus:map-ready',bindLocationMap);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseAutomatic(automaticPaused);removeUserMarker();}else{bindLocationMap();resumeAutomatic();}});
window.addEventListener('pagehide',()=>{pauseAutomatic(automaticPaused);removeUserMarker();});
window.addEventListener('pageshow',()=>{bindLocationMap();resumeAutomatic();});
window.CampusLocation={nearby,distance,useConfirmedNode,getState:()=>({tracking:automaticWatch!==null,denied:automaticDenied,paused:automaticPaused,point:lastAutomatic?.point.slice()||null})};
bindLocationMap();queueMicrotask(initializeAutomatic);
})();
