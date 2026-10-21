/* Mobile bottom sheet and independent campus tools. No routing/data changes. */
(function(){
'use strict';
const panel=document.querySelector('main.panel');if(!panel||document.getElementById('routeSheetHandle'))return;
const media=window.matchMedia('(max-width:700px)');
const content=document.createElement('div');content.id='routeSheetContent';content.className='route-sheet-content';
while(panel.firstChild)content.append(panel.firstChild);
const handle=document.createElement('button');handle.type='button';handle.id='routeSheetHandle';handle.className='route-sheet-handle';handle.setAttribute('aria-controls',content.id);
handle.innerHTML='<span class="sheet-grip" aria-hidden="true"></span><span class="sheet-heading">Encuentra tu camino <span class="sheet-chevron" aria-hidden="true">⌃</span></span><span class="sheet-summary"></span>';
panel.append(handle,content);let level=0,drag=null,suppressClick=false;
const height=()=>window.visualViewport?.height||window.innerHeight;
const stops=()=>{const h=height();return [Math.min(132,h*.28),h*.48,h*.86];};
function paint(px){panel.style.setProperty('--sheet-height',px+'px');document.documentElement.style.setProperty('--route-sheet-height',px+'px');}
function settle(next){level=Math.max(0,Math.min(2,next));panel.dataset.sheet=String(level);paint(stops()[level]);handle.setAttribute('aria-expanded',String(level!==0));handle.setAttribute('aria-label',level===0?'Abrir búsqueda de ruta. Desliza hacia arriba para ampliar.':'Cambiar tamaño del panel. Desliza hacia abajo para minimizar.');content.inert=media.matches&&level===0;content.setAttribute('aria-hidden',String(media.matches&&level===0));}
function summary(){const dest=document.getElementById('destination');handle.querySelector('.sheet-summary').textContent=level===0?'Desliza hacia arriba para elegir tu ruta':(dest?.selectedOptions[0]?.textContent||'Elige tu destino');}
handle.addEventListener('pointerdown',e=>{if(!media.matches||(e.pointerType==='mouse'&&e.button!==0))return;drag={y:e.clientY,start:panel.getBoundingClientRect().height,moved:false};handle.setPointerCapture(e.pointerId);panel.classList.add('sheet-dragging');});
handle.addEventListener('pointermove',e=>{if(!drag)return;const delta=drag.y-e.clientY;if(Math.abs(delta)>6)drag.moved=true;const s=stops();paint(Math.max(s[0],Math.min(s[2],drag.start+delta)));});
function end(e,cancel=false){if(!drag)return;const d=drag;drag=null;panel.classList.remove('sheet-dragging');if(d.moved&&!cancel){suppressClick=true;const current=panel.getBoundingClientRect().height,s=stops();settle(s.reduce((best,value,i)=>Math.abs(value-current)<Math.abs(s[best]-current)?i:best,0));setTimeout(()=>suppressClick=false,0);}else settle(level);summary();}
handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',e=>end(e,true));
handle.addEventListener('click',()=>{if(suppressClick)return;settle(level===2?0:level+1);summary();});
handle.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();settle(e.key==='Home'?0:e.key==='End'?2:level+(e.key==='ArrowUp'?1:-1));summary();}});
content.addEventListener('focusin',()=>{if(media.matches&&level<1){settle(1);summary();}});
document.getElementById('destination')?.addEventListener('change',summary);
// A selected route exposes the map while keeping the route panel within reach.
document.getElementById('alternatives')?.addEventListener('click',e=>{if(media.matches&&e.target.closest('button.route')){settle(0);summary();}});
function resize(){settle(level);summary();}media.addEventListener('change',resize);window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
const menu=window.CampusMenu,drawer=document.getElementById('campusMenu');
if(menu&&drawer){const originalOpen=menu.open;menu.open=function(page='aula'){document.getElementById('communityMenu')?.close();originalOpen(page);document.getElementById('campusMenuTitle').textContent=({aula:'Explorar · Salones',food:'Restaurantes',settings:'Ajustes'})[page]||'Explorar';};
 document.getElementById('openExplore').textContent='Explorar';document.getElementById('openSettings').textContent='Ajustes';const communityButton=document.getElementById('openCommunity');if(communityButton)communityButton.textContent='Comunidad';
 document.getElementById('openExplore').onclick=()=>menu.open('aula');document.getElementById('openSettings').onclick=()=>menu.open('settings');
 const food=document.createElement('button');food.id='openRestaurants';food.type='button';food.textContent='Restaurantes';food.setAttribute('aria-haspopup','dialog');food.setAttribute('aria-controls','campusMenu');food.onclick=()=>menu.open('food');document.getElementById('openSettings').before(food);
 drawer.querySelector('.menu-tabs').hidden=true;
}
window.CampusSheet={setLevel(n){settle(n);summary();},getLevel:()=>level};
})();
