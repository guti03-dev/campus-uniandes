/* Curated campus restaurant directory. Shared Google Maps links updated 2026-11-16.
   Coordinates are references, never indoor navigation or confirmed entrances. */
(function(){
'use strict';
const places=window.CAMPUS_RESTAURANTS,points=window.CampusMapMarkers;
const types={restaurante:'Restaurante',rapida:'Comida rápida',cafe:'Café y panadería'};
const center=[-74.064969,4.60244];
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function distance(c){if(!c)return null;const r=Math.PI/180,h=Math.sin((c[1]-center[1])*r/2)**2+Math.cos(center[1]*r)*Math.cos(c[1]*r)*Math.sin((c[0]-center[0])*r/2)**2;return Math.round(12742000*Math.asin(Math.sqrt(Math.min(1,h))));}
function searchURL(p){if(p.mapsUrl)return p.mapsUrl;return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name.replace(' · ',' ')+' '+p.address+' Bogotá Colombia');}
function directionsURL(p){if(p.mapsUrl)return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p.coordinates[1]+','+p.coordinates[0])+'&travelmode=walking';return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p.name.replace(' · ',' ')+' '+p.address+' Bogotá Colombia')+'&travelmode=walking';}
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const link=(text,url)=>{const n=node('a',text);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;};
const panel=node('details',null,'restaurants-panel');panel.id='nearbyRestaurants';
panel.innerHTML=`<summary>Listado de restaurantes</summary><p>Pulsa un punto naranja del mapa para ver el restaurante y cómo llegar.</p><label for="foodSearch">Buscar por nombre o dirección</label><input id="foodSearch" type="search" placeholder="Ej. Wok, café, CityU…" autocomplete="off"><div class="food-filters"><div><label for="foodType">Tipo</label><select id="foodType"><option value="">Todos</option><option value="restaurante">Restaurantes</option><option value="rapida">Comida rápida</option><option value="cafe">Cafés y panaderías</option></select></div><div><label for="foodZone">Zona</label><select id="foodZone"><option value="selected" selected>Lugares compartidos</option><option value="">Todas</option><option>Junto al campus</option><option>CityU</option><option>Dentro del campus</option></select></div></div><p id="foodCount" role="status" aria-live="polite"></p><div id="foodList"></div><p class="food-note">${places.filter(p=>p.number).length} lugares seleccionados mediante tus enlaces de Google Maps. Últimos enlaces consultados: 16 nov. 2026. Directorio guardado, sin actualización automática. Consulta en Google Maps horarios, reseñas y posibles cambios.</p><a class="food-explore" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=restaurantes+cerca+Universidad+de+los+Andes+Bogota">Buscar más en Google Maps ↗</a><p class="food-note">Distancias en línea recta desde el centro del campus. Los marcadores corresponden a los lugares compartidos. Puedes filtrar por zona o consultar todo el directorio. Las indicaciones externas no comprueban accesibilidad. Coordenadas de referencia: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> y Wikimapia.</p>`;
document.getElementById('campusServices').after(panel);
const tools=node('div',null,'food-map-tools');
tools.innerHTML='<label><input id="showFoodMarkers" type="checkbox" checked> Restaurantes en el mapa</label><button id="fitFoodMarkers" type="button">Ver todos en el mapa</button>';
panel.before(tools);
const get=id=>document.getElementById(id);let markers=[],popup=null,labelMap=null;
function layoutFoodLabels(){
 const m=currentMap();if(!m||typeof m.project!=='function')return;
 const entries=markers.map(marker=>({element:marker.getElement(),point:m.project(marker.getLngLat())}));
 const radius=points.metrics(m).hit/2;
 const occupied=entries.map(({point:p})=>[p.x-radius,p.y-radius,p.x+radius,p.y+radius]);
 for(const {element} of entries)points.size(element,m);
 const container=m.getContainer(),width=container.clientWidth,height=container.clientHeight;
 for(const {element,point:p} of entries){
  const label=element.querySelector('.food-marker-name');if(!label)continue;
  const zoom=m.getZoom();label.hidden=zoom<18;if(label.hidden)continue;
  const w=label.offsetWidth||Math.min(270,label.textContent.length*7+12),h=label.offsetHeight||24;
  const candidates=[[p.x+22,p.y-h/2],[p.x-w-22,p.y-h/2],[p.x-w/2,p.y-h-22],[p.x-w/2,p.y+22]];
  const spot=candidates.find(([x,y])=>x>=4&&y>=4&&x+w<width-4&&y+h<height-4&&!occupied.some(b=>x<b[2]+4&&x+w>b[0]-4&&y<b[3]+4&&y+h>b[1]-4));
  label.classList.toggle('food-label-collided',!spot&&zoom<18.5);
  if(!spot&&zoom>=18.5){label.style.left='36px';label.style.top='2px';}
  if(spot){const [x,y]=spot;label.style.left=(x-p.x+radius)+'px';label.style.top=(y-p.y+radius)+'px';occupied.push([x,y,x+w,y+h]);}
 }
}

function currentMap(){return typeof map==='undefined'?null:map;}
function cleanup(){markers.forEach(m=>m.remove());markers=[];if(popup){popup.remove();popup=null;}}
function card(p,compact=false){
 const box=node('article',null,'food-card');box.append(node('h3',p.name),node('p',types[p.kind]+' · '+p.zone),node('p',p.address));
 if(p.description)box.append(node('p',p.description));
 const meters=distance(p.coordinates);box.append(node('p',meters===null?'Ubicación disponible en Google Maps.':'≈ '+meters+' m en línea recta.','food-note'));
 const actions=node('div',null,'food-actions');
 if(p.coordinates&&!compact){const b=node('button','Ver en el mapa');b.type='button';b.onclick=()=>focus(p);actions.append(b);}
 actions.append(link('Google Maps ↗',searchURL(p)),link('Cómo llegar ↗',directionsURL(p)));box.append(actions);
 if(compact)box.append(node('p',p.precision,'food-note'));
 const sources=node('details',null,'food-sources');sources.append(node('summary','Fuentes y ubicación'));sources.append(node('p',p.precision));for(const s of p.sources)sources.append(link(s.label,s.url));box.append(sources);return box;
}
function focus(p){const m=currentMap();if(!m||typeof mapboxgl==='undefined'){get('foodCount').textContent='El mapa está cargando. Puedes consultar Google Maps mientras tanto.';return;}if(popup)popup.remove();m.flyTo({center:p.coordinates,zoom:17.6,pitch:35});popup=new mapboxgl.Popup({offset:25,maxWidth:'330px'}).setLngLat(p.coordinates).setDOMContent(card(p,true)).addTo(m);}
function filtered(){const q=fold(get('foodSearch').value.trim()),type=get('foodType').value,zone=get('foodZone').value;return places.filter(p=>(!type||p.kind===type)&&(!zone||(zone==='selected'?Boolean(p.number):p.zone===zone))&&(!q||fold([p.name,p.address,p.zone,types[p.kind],p.description||''].join(' ')).includes(q))).sort((a,b)=>(distance(a.coordinates)??Infinity)-(distance(b.coordinates)??Infinity)||a.name.localeCompare(b.name,'es'));}
function render(){
 cleanup();
 const results=filtered(),list=get('foodList');list.replaceChildren();get('foodCount').textContent=results.length?results.length+' lugares · selecciona uno para explorar':'No hay resultados. Prueba otro nombre, tipo o zona.';for(const p of results)list.append(card(p));
 renderMarkers(results);
}
function renderMarkers(results=filtered()){
 markers.forEach(m=>m.remove());markers=[];
 const m=currentMap();if(!m||typeof mapboxgl==='undefined'||!get('showFoodMarkers').checked)return;
 for(const group of points.groups(results,m,p=>p.coordinates)){
  const list=group.items,p=list[0],label=list.map(item=>item.name).join(' · '),b=node('button',null,'food-marker food-marker-labeled'+(list.length>1?' food-cluster':''));b.type='button';b.title=label;b.setAttribute('aria-label',list.length>1?list.length+' restaurantes: '+label:label);
  b.append(node('span',list.length>1?String(list.length):'🍴','food-marker-dot'),node('span',list.length>1?list.length+' restaurantes':label,'food-marker-name'));points.size(b,m);
  b.onclick=e=>{e.stopPropagation();if(list.length===1){focus(p);return;}if(popup)popup.remove();const content=node('div',null,'food-group');content.append(node('strong',list.length+' restaurantes'));for(const item of list){const select=node('button',item.name);select.type='button';select.onclick=()=>focus(item);content.append(select);}popup=new mapboxgl.Popup({offset:20,maxWidth:'320px'}).setLngLat(group.coordinates).setDOMContent(content).addTo(m);};
  markers.push(new mapboxgl.Marker({element:b,anchor:'center'}).setLngLat(group.coordinates).addTo(m));
 }
 if(labelMap!==m){if(labelMap){labelMap.off('move',layoutFoodLabels);labelMap.off('zoomend',regroup);}labelMap=m;m.on('move',layoutFoodLabels);m.on('zoomend',regroup);}
 layoutFoodLabels();
}
function regroup(){renderMarkers();}
for(const id of ['foodSearch','foodType','foodZone'])get(id).addEventListener(id==='foodSearch'?'input':'change',render);
get('showFoodMarkers').addEventListener('change',render);
get('fitFoodMarkers').onclick=()=>{
 const m=currentMap(),points=filtered().filter(p=>p.coordinates).map(p=>p.coordinates);
 if(!m){get('foodCount').textContent='Espera a que cargue el mapa 3D.';panel.open=true;return;}
 if(!points.length){get('foodCount').textContent='No hay restaurantes para estos filtros.';panel.open=true;return;}
 get('showFoodMarkers').checked=true;render();
 const all=points;const bounds=[[Math.min(...all.map(c=>c[0])),Math.min(...all.map(c=>c[1]))],[Math.max(...all.map(c=>c[0])),Math.max(...all.map(c=>c[1]))]];
 m.fitBounds(bounds,{padding:typeof padding==='function'?padding():70,maxZoom:19,pitch:35});
};
window.CampusRestaurants={places,filtered,render,focus,renderMarkers};
window.addEventListener('campus:map-ready',render);
render();
})();
