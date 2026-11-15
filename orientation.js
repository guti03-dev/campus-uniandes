/* Optional compass. Sensor readings stay in this browser. */
(function(root){
'use strict';
const wrap=n=>(n%360+360)%360,delta=(a,b)=>((b-a+540)%360)-180;
const directions=['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste'];
const cardinal=heading=>directions[Math.round(wrap(heading)/45)%8];
function reading(event,screenAngle=0){
 if(wrap(screenAngle)!==0)return {reason:'portrait'};
 const apple=Number.isFinite(event.webkitCompassHeading);
 if(!apple&&event.absolute!==true)return {reason:'relative'};
 if(!apple&&![event.alpha,event.beta,event.gamma].every(Number.isFinite))return {reason:'missing'};
 if(apple&&event.webkitCompassAccuracy!==undefined&&(!Number.isFinite(event.webkitCompassAccuracy)||event.webkitCompassAccuracy<0||event.webkitCompassAccuracy>25))return {reason:'accuracy'};
 if(Number.isFinite(event.beta)&&Math.abs(event.beta)>65||Number.isFinite(event.gamma)&&Math.abs(event.gamma)>45)return {reason:'tilt'};
 return {heading:wrap(apple?event.webkitCompassHeading:360-event.alpha)};
}
function routeBearing(step,progress=0){
 if(!step||step.confirm||step.kind==='elevator')return null;
 const c=step.coordinates||[],rad=Math.PI/180,lengths=c.slice(1).map((p,i)=>Math.hypot((p[0]-c[i][0])*Math.cos(p[1]*rad),p[1]-c[i][1]));
 let remaining=Math.max(0,Math.min(1,step.meters?(progress-step.start)/step.meters:0))*lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){if(lengths[i]<1e-8)continue;if(remaining>lengths[i]&&i<lengths.length-1){remaining-=lengths[i];continue;}return wrap(Math.atan2((c[i+1][0]-c[i][0])*Math.cos((c[i+1][1]+c[i][1])*rad/2),c[i+1][1]-c[i][1])/rad);}return null;
}
function projectedHeading(map,point,heading){
 const fallback=wrap(heading-(map?.getBearing?.()||0));
 if(!map?.project||!Array.isArray(point)||!point.every(Number.isFinite))return fallback;
 const rad=Math.PI/180,cos=Math.cos(point[1]*rad);if(Math.abs(cos)<1e-6)return fallback;
 const next=[point[0]+Math.sin(heading*rad)*2/(111320*cos),point[1]+Math.cos(heading*rad)*2/111320],a=map.project(point),b=map.project(next),dx=b.x-a.x,dy=b.y-a.y;
 return Number.isFinite(dx)&&Number.isFinite(dy)&&Math.hypot(dx,dy)>.001?wrap(Math.atan2(dx,-dy)/rad):fallback;
}
const api={reading,cardinal,delta,routeBearing,projectedHeading};if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!root.document)return;root.CampusOrientation=api;
const by=id=>document.getElementById(id),controls=document.querySelector('.controls');if(!controls)return;
const text=(id,value)=>{const n=by(id);if(n&&n.textContent!==value)n.textContent=value;};
const openButton=document.createElement('button');openButton.type='button';openButton.id='compassOpen';openButton.textContent='🧭';openButton.setAttribute('aria-label','Abrir brújula para orientarme');openButton.setAttribute('aria-controls','compassPanel');openButton.setAttribute('aria-expanded','false');controls.append(openButton);
const panel=document.createElement('section');panel.id='compassPanel';panel.className='compass-panel';panel.hidden=true;panel.setAttribute('aria-label','Brújula y orientación');
panel.innerHTML='<div class="compass-heading"><strong>¿Hacia dónde apuntas?</strong><button id="compassClose" type="button" aria-label="Cerrar brújula">×</button></div><div class="compass-reading"><span id="compassArrow" aria-hidden="true">↑</span><div><strong id="compassDirection">Orientación sin activar</strong><small>Orientación aproximada del teléfono</small></div></div><p id="compassStatus" role="status">Sostén el teléfono casi horizontal, con la pantalla en vertical, y apunta hacia donde quieres caminar.</p><p id="compassRoute"></p><div class="compass-actions"><button id="compassEnable" type="button">Activar brújula</button><button id="compassAlign" type="button" disabled>Alinear mapa</button><button id="compassNorth" type="button">Norte arriba</button></div><button id="compassLocate" class="compass-locate" type="button">Ver mi ubicación</button>';
document.body.append(panel);
let wanted=false,pending=false,attached=false,heading=null,target=null,lastReading=0,lastEvent=0,reason='',message='',timer=null,token=0,nextBearing=null,boundMap=null;
const positions=new WeakMap();
const currentMap=()=>typeof map!=='undefined'?map:null;
function fresh(){return wanted&&heading!==null&&Date.now()-lastReading<4000;}
api.getState=()=>({enabled:wanted,pending,available:fresh(),heading:fresh()?heading:null,reason});
function decorate(element,point){
 if(!element?.classList)return;if(Array.isArray(point)&&point.length===2&&point.every(Number.isFinite))positions.set(element,point.slice());
 const available=fresh();element.classList.toggle('phone-heading',available);
 if(available){const angle=projectedHeading(currentMap(),positions.get(element),heading),value=Math.round(angle)+'deg';if(element.style.getPropertyValue('--phone-heading')!==value)element.style.setProperty('--phone-heading',value);}
}
api.decorate=decorate;
function render(){
 const available=fresh(),m=currentMap(),bearing=m?.getBearing?.()||0;
 for(const element of document.querySelectorAll('.location-user-point,.guidance-position'))decorate(element);
 const north=by('compassNorthNeedle');if(north)north.style.transform='rotate('+(-bearing)+'deg)';
 by('compassArrow').hidden=!available;if(available)by('compassArrow').style.transform='rotate('+delta(bearing,heading)+'deg)';
 text('compassDirection',available?'Tu teléfono apunta al '+cardinal(heading)+' · '+wrap(Math.round(heading/5)*5)+'°':wanted?'Buscando orientación…':'Orientación sin activar');
 text('compassEnable',pending?'Cancelar':wanted?'Desactivar brújula':'Activar brújula');by('compassAlign').disabled=!available||!m;
 openButton.setAttribute('aria-pressed',String(wanted));
 const hints={portrait:'Coloca la pantalla en vertical, con la parte superior del teléfono hacia delante.',tilt:'Sostén el teléfono casi horizontal para obtener una dirección fiable.',accuracy:'La brújula tiene poca precisión. Aléjate de objetos metálicos y mueve el teléfono suavemente en forma de 8.',missing:'No se ha recibido una orientación fiable.'};
 text('compassStatus',message||hints[reason]||(wanted?(available?(document.querySelector('.location-user-point,.guidance-position')?'La flecha azul de tu ubicación indica hacia dónde apunta el teléfono.':'Pulsa Ver mi ubicación para mostrar la flecha en el mapa.'):'Esperando una orientación fiable. No se muestra una dirección mientras falta la señal.'):'Sostén el teléfono casi horizontal, con la pantalla en vertical, y apunta hacia donde quieres caminar.'));
 let hint='';if(nextBearing!==null){hint='Dirección del tramo: '+cardinal(nextBearing)+'.';if(available){const angle=delta(heading,nextBearing);hint+=Math.abs(angle)<=25?' Tu teléfono apunta en esa dirección.':Math.abs(angle)>=155?' El tramo queda hacia atrás respecto al teléfono.':angle>0?' Queda a la derecha de donde apunta el teléfono.':' Queda a la izquierda de donde apunta el teléfono.';}}
 text('compassRoute',hint);text('guidanceOrientation',hint);
}
api.setRouteHeading=value=>{const next=Number.isFinite(value)?wrap(value):null;if(next!==nextBearing){nextBearing=next;render();}};
function sample(event){
 const angle=root.screen?.orientation?.angle??root.orientation??0,result=reading(event,angle);
 // Some browsers interleave empty sensor packets. Keep the last valid reading
 // until its freshness deadline, instead of flickering between directions.
 if(result.reason==='relative'||result.reason==='missing')return;
 lastEvent=Date.now();reason=result.reason||'';message='';
 if(Number.isFinite(result.heading)){target=result.heading;lastReading=Date.now();}else{target=null;heading=null;}
}
function tick(){
 if(target!==null&&Date.now()-lastReading<4000)heading=heading===null?target:wrap(heading+delta(heading,target)*.45);else heading=null;
 if(wanted&&!lastEvent&&Date.now()-startedAt>8000){disable();message='Este celular o navegador no proporcionó una orientación fiable. Puedes usar Norte arriba o volver a intentar.';}
 render();
}
let startedAt=0;
function detach(){root.removeEventListener('deviceorientationabsolute',sample);root.removeEventListener('deviceorientation',sample);if(timer!==null)clearInterval(timer);timer=null;attached=false;heading=target=null;lastReading=lastEvent=0;}
function attach(){if(attached||document.hidden||!wanted)return;startedAt=Date.now();root.addEventListener('deviceorientationabsolute',sample);root.addEventListener('deviceorientation',sample);timer=setInterval(tick,250);attached=true;}
function disable(){token++;wanted=pending=false;detach();reason='';message='';render();}
async function activate(){
 if(wanted||pending){disable();return;}
 if(!root.isSecureContext){message='Abre la aplicación con HTTPS para activar la brújula.';render();return;}
 const Orientation=root.DeviceOrientationEvent;if(!Orientation){message='Este navegador no ofrece una brújula. Puedes orientar el mapa con Norte arriba.';render();return;}
 const attempt=++token;pending=true;message='Permite el acceso a la orientación cuando el celular lo solicite.';render();
 try{if(typeof Orientation.requestPermission==='function'&&await Orientation.requestPermission()!=='granted'){if(attempt!==token)return;pending=false;message='No se permitió usar la brújula. Puedes seguir usando Norte arriba y las indicaciones de la ruta.';render();return;}
  if(attempt!==token)return;pending=false;wanted=true;message='';attach();render();
 }catch{if(attempt!==token)return;pending=false;wanted=false;message='No se pudo activar la brújula. Puedes seguir usando Norte arriba.';render();}
}
api.open=()=>{panel.hidden=false;openButton.setAttribute('aria-expanded','true');render();by('compassEnable').focus({preventScroll:true});};
function close(){panel.hidden=true;openButton.setAttribute('aria-expanded','false');openButton.focus({preventScroll:true});}
function northUp(){const m=currentMap();if(m){m.easeTo({bearing:0,duration:250});render();}else{message='Espera a que cargue el mapa para orientarlo.';render();}}
function bindMap(){const m=currentMap();if(boundMap!==m){boundMap?.off('rotate',render);boundMap=m;boundMap?.on('rotate',render);}render();}
openButton.onclick=api.open;by('compassClose').onclick=close;by('compassEnable').onclick=activate;by('compassNorth').onclick=northUp;
by('compassAlign').onclick=()=>{if(fresh()&&currentMap())currentMap().easeTo({bearing:heading,duration:250});};
by('compassLocate').onclick=()=>{close();by('locateOrigin')?.click();};
const rotate=by('rotate');if(rotate){rotate.innerHTML='<span id="compassNorthNeedle" aria-hidden="true">↑</span><small>N</small>';rotate.setAttribute('aria-label','Poner el norte arriba');rotate.title='Norte arriba';rotate.onclick=northUp;}
root.addEventListener('campus:map-ready',bindMap);root.addEventListener('pagehide',()=>{detach();render();});root.addEventListener('pageshow',()=>{attach();bindMap();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)detach();else attach();render();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close();});
bindMap();
})(typeof window!=='undefined'?window:globalThis);
