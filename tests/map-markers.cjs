const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../map-markers.js');
let zoom=15;const map={getZoom:()=>zoom,project:([x,y])=>({x:x*100*2**(zoom-15),y:y*100*2**(zoom-15)})};
const items=[{id:1,c:[0,0]},{id:2,c:[.1,.05]},{id:3,c:[1,1]},{id:4,c:[0,0]}],coordinates=x=>x.c;
let groups=P.groups(items,map,coordinates);assert.equal(groups.length,2);assert.equal(groups.reduce((n,g)=>n+g.items.length,0),4);assert.equal(groups[0].items.length,3);assert.equal(P.metrics(map).size,16);
zoom=19;groups=P.groups(items,map,coordinates);assert.equal(groups.length,3);assert.equal(groups[0].items.length,2);assert.equal(P.metrics(map).size,30);
for(zoom=12;zoom<=21;zoom+=.5){groups=P.groups(items,map,coordinates);assert.equal(new Set(groups.flatMap(g=>g.items.map(x=>x.id))).size,4);assert.ok(P.metrics(map).hit>=24);}
assert.equal(P.groups(items,{},coordinates).length,3);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),places=JSON.parse(html.match(/window\.CAMPUS_RESTAURANTS=([\s\S]*?);<\/script>/)[1]);
const names=['Starbucks City U','WingStop UniAndes','Puerto Arepa','Chick n Chips','One Burrito','Acai Bowls Colombia','One Burrito Pola'];
for(const name of names){const p=places.filter(p=>p.name===name);assert.equal(p.length,1,name+' must have one listing');assert.ok(p[0].number);assert.match(p[0].mapsUrl,/^https:\/\/maps\.app\.goo\.gl\//);assert.ok(p[0].coordinates.every(Number.isFinite));assert.match(p[0].googleMapsFeatureId,/^0x/);}
assert.equal(places.length,30);assert.equal(places.filter(p=>p.number).length,25);assert.equal(new Set(places.map(p=>p.id)).size,places.length);
assert.equal(places.filter(p=>p.name==='One Burrito Pola')[0].coordinates[0],-74.0668499);assert.notDeepEqual(places.find(p=>p.name==='One Burrito').coordinates,places.find(p=>p.name==='One Burrito Pola').coordinates);
console.log('PASS: zoom sizes, proximity/exact groups, all points retained, seven resolved links and duplicate-free restaurant directory');
