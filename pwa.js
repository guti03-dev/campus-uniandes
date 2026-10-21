(function(){
'use strict';
const host=document.getElementById('menu-settings');
const box=document.createElement('section');box.id='pwaSettings';box.innerHTML='<h3>Campus en tu teléfono</h3><button id="installCampus" type="button">Instalar Campus</button><p id="installHelp"></p><p id="offlineReady" role="status">Preparando acceso sin conexión…</p><button id="updateCampus" type="button" hidden>Actualizar aplicación</button><p>Sin internet puedes consultar los datos guardados y calcular rutas. El mapa 3D, algunas fotos, Google Maps y la actualización de horarios requieren conexión. La caché puede ser eliminada por el navegador.</p>';host.prepend(box);
const help=document.getElementById('installHelp'),ready=document.getElementById('offlineReady'),install=document.getElementById('installCampus'),update=document.getElementById('updateCampus');
const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
let promptEvent=null,registration=null;
function installHelp(){if(isStandalone()){install.hidden=true;help.textContent='Campus está abierto como aplicación.';}else if(location.protocol==='file:'){install.disabled=true;help.textContent='Abre la página publicada con HTTPS para instalar Campus. No se instala desde el archivo descargado.';}else{help.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'En Safari: Compartir → Añadir a la pantalla de inicio.':'Pulsa Instalar cuando el navegador lo permita, o usa su menú → Instalar aplicación / Añadir a pantalla de inicio.';}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;install.hidden=false;help.textContent='Ya puedes añadir Campus a tu dispositivo.';});window.addEventListener('appinstalled',()=>{promptEvent=null;install.hidden=true;help.textContent='Campus instalado.';});install.onclick=async()=>{if(promptEvent){const p=promptEvent;promptEvent=null;await p.prompt();await p.userChoice;installHelp();}else installHelp();};installHelp();
const badge=document.createElement('span');badge.id='connectionBadge';badge.setAttribute('role','status');document.querySelector('header').append(badge);
function connection(){const offline=!navigator.onLine;badge.textContent=offline?'Sin conexión · datos guardados':'';badge.hidden=!offline;document.body.classList.toggle('campus-offline',offline);if(offline){document.getElementById('mapStatus').classList.add('hidden');}else if(typeof map!=='undefined'&&!map&&typeof connect==='function'){document.getElementById('mapStatus').classList.remove('hidden');connect();}}
window.addEventListener('offline',connection);window.addEventListener('online',connection);if(!navigator.onLine)connection();
function waiting(){if(registration?.waiting){update.hidden=false;update.textContent='Actualizar aplicación';}}
let requestedUpdate=false;update.onclick=()=>{if(registration?.waiting){requestedUpdate=true;update.disabled=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}};
if('serviceWorker' in navigator&&location.protocol!=='file:'&&window.isSecureContext){navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requestedUpdate)location.reload();});navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{registration=reg;waiting();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')waiting();});});return navigator.serviceWorker.ready;}).then(()=>{ready.textContent='Copia guardada: rutas, salones y directorio disponibles sin conexión.';}).catch(()=>{ready.textContent='No se pudo guardar la copia sin conexión. Vuelve a abrir la página con internet.';});}else{ready.textContent='El modo instalable y sin conexión requiere HTTPS y un navegador compatible.';}
})();


// Independent community module; keep routing and the offline shell available.
(function(){
 const base=new URL('./',location.href);
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('community.css',base);document.head.append(style);
 const script=document.createElement('script');script.src=new URL('community.js',base);script.defer=true;
 const uiStyle=document.createElement('link');uiStyle.rel='stylesheet';uiStyle.href=new URL('mobile-ui.css',base);document.head.append(uiStyle);
 const loadUI=()=>{const ui=document.createElement('script');ui.src=new URL('mobile-ui.js',base);const geo=()=>{const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('location.css',base);document.head.append(css);const js=document.createElement('script');js.src=new URL('location.js',base);document.body.append(js);};ui.onload=geo;ui.onerror=geo;document.body.append(ui);};
 script.onload=loadUI;script.onerror=loadUI;document.body.append(script);
})();
