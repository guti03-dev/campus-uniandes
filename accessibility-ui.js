/* Essential route information: distance, duration, stairs and ramps. */
(function(root){
'use strict';
const assessment=root.CampusAccessibility;if(!assessment)throw Error('Accessibility assessment is unavailable');
assessment.prepareGraph(graph);
assessment.guardRouting(root.CampusRouting);
profile={};
$('preferences')?.remove();$('mobility')?.remove();
$('alternatives').replaceChildren(el('h2','Tus opciones'),el('div','Más corta, más rápida, menos escaleras o sin escaleras.','hint'));
modes.accessible.name='Sin escaleras';
compare = function compare(){
 clearRoutes();const target=$('alternatives');target.replaceChildren(el('h2','Rutas disponibles'));
 if($('origin').value===$('destination').value){target.append(el('div','Has elegido el mismo edificio como origen y destino.','hint'));return;}
 if(!graph.edges.length){target.append(el('div','Todavía no has trazado caminos. Usa Trazar caminos, conecta las entradas de los edificios y vuelve a comparar.','hint'));return;}
 const result=CampusNavigation.alternatives(graph,$('origin').value,$('destination').value,profile);
 if(result.status==='unmapped'){target.append(el('div','No hay una entrada registrada para: '+result.missingBuildings.join(', ')+'. Prueba otra entrada o edificio.','hint'));return;}
 const blockedByClosure=!result.routes.some(r=>r.mode==='shortest'&&r.route)&&CampusNavigation.alternatives({...graph,edges:graph.edges.map(e=>({...e,closed:false}))},$('origin').value,$('destination').value,profile).routes.some(r=>r.mode==='shortest'&&r.route);
 options=result.routes;for(const item of options){const r=item.route,button=el('button',undefined,'route');button.dataset.mode=item.mode;button.setAttribute('aria-pressed','false');button.append(el('b',modes[item.mode].name));if(r){button.append(el('strong',Math.ceil(r.seconds/60)+' min'),el('small',Math.round(r.meters)+' m · '+assessment.routeSummary(r).label));button.onclick=()=>selectRoute(item.mode);const same=options.find(x=>x.mode!==item.mode&&x.route&&x.route.nodes.join('|')===r.nodes.join('|'));if(same)button.append(el('small','Comparte recorrido con '+modes[same.mode].name.toLowerCase(),'tag'));}else{button.disabled=true;button.append(el('small',blockedByClosure?'La conexión atraviesa un tramo cerrado.':item.mode==='accessible'?'No hay una ruta sin escaleras entre estas entradas.':'No hay una conexión disponible entre estas entradas.'));}target.append(button);}
 const first=options.find(x=>x.route);if(first)selectRoute(first.mode);else target.append(el('p','Revisa las conexiones de las entradas, los tramos cerrados y los sentidos únicos en Trazar caminos.'));
};
selectRoute = function selectRoute(mode){active=options.find(x=>x.mode===mode);if(!active?.route)return;document.querySelectorAll('.route[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));const section=$('directions'),r=active.route;section.replaceChildren(el('h2','Tu recorrido'));const stats=el('div',undefined,'stats');stats.append(el('span',Math.ceil(r.seconds/60)+' min estimados'),el('span',Math.round(r.meters)+' m'));stats.append(el('span',assessment.routeSummary(r).label));section.append(stats);const steps=el('ol',undefined,'steps');routeInstructions(r).forEach(text=>steps.append(el('li',text)));section.append(steps);if(chosenRoom){section.append(el('h2',chosenRoom.code),el('p','Piso '+chosenRoom.floor+(chosenRoom.note?' · '+chosenRoom.note:'')));if(chosenRoom.photo){const image=el('img',undefined,'photo');image.src=chosenRoom.photo;image.alt='Foto del salón '+chosenRoom.code;section.append(image);}}
 window.CampusGuidance?.mount(section,r,$('destination').selectedOptions[0]?.textContent?.split(' · ')[0]||'tu destino');section.classList.remove('hidden');updateRoutes();if(map){const coordinates=r.nodes.map(id=>graph.nodes[id].coordinates);map.fitBounds(boundsOf(coordinates),{padding:padding(),maxZoom:18.5,pitch:55});}
};
$('findRoutes').onclick=compare;
assessment.uiReady=true;
})(window);
