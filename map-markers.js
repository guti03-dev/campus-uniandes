/* Compact map points. Nearby items remain available through their group. */
(function(root){
'use strict';
function metrics(map){
 const zoom=typeof map?.getZoom==='function'?map.getZoom():19;
 const size=zoom<15.5?16:zoom<16.5?18:zoom<17.5?22:zoom<18.5?26:30;
 return {zoom,size,hit:Math.max(24,size),font:size<20?10:size<26?12:14,radius:zoom<18?size+10:0};
}
function groups(items,map,coordinates){
 const view=metrics(map),result=[];
 const sorted=items.map((item,index)=>({item,index,coordinates:coordinates(item)})).filter(x=>Array.isArray(x.coordinates)&&x.coordinates.length===2&&x.coordinates.every(Number.isFinite)).sort((a,b)=>a.coordinates[0]-b.coordinates[0]||a.coordinates[1]-b.coordinates[1]||a.index-b.index);
 for(const entry of sorted){
  const point=typeof map?.project==='function'?map.project(entry.coordinates):null;
  // Exact-location groups also work when map projection is unavailable.
  let found=result.find(g=>g.coordinates[0]===entry.coordinates[0]&&g.coordinates[1]===entry.coordinates[1]);
  if(!found&&view.radius&&point)found=result.find(g=>g.point&&Math.hypot(g.point.x-point.x,g.point.y-point.y)<=view.radius);
  if(found){found.items.push(entry.item);}else result.push({items:[entry.item],coordinates:entry.coordinates,point});
 }
 return result;
}
function size(element,map){const m=metrics(map);element.style.setProperty('--map-dot',m.size+'px');element.style.setProperty('--map-hit',m.hit+'px');element.style.setProperty('--map-font',m.font+'px');}
const api={metrics,groups,size};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CampusMapMarkers=api;
})(typeof window!=='undefined'?window:globalThis);
