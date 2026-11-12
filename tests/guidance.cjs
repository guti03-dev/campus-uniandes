const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {build,project,clean}=require('../navigation.js');
const nodes={a:{coordinates:[-74.065,4.601]},b:{coordinates:[-74.065,4.602]},c:{coordinates:[-74.064,4.602]},d:{coordinates:[-74.064,4.603],buildingCode:'ML'}};
const walk=(id,from,to)=>({id,from,to,kind:'path',meters:100,seconds:80,geometry:{type:'LineString',coordinates:[nodes[from].coordinates,nodes[to].coordinates]}});
const ab=walk('ab','a','b'),bc=walk('bc','b','c'),cd=walk('cd','c','d');
const steps=build({nodes:['a','b','c','d'],edges:[ab,bc,cd]},{nodes});
assert.deepEqual(steps.map(s=>s.title),['Avanza por el camino','Gira a la derecha','Gira a la izquierda']);
assert.equal(steps.at(-1).end,300);
const reverse=build({nodes:['d','c','b','a'],edges:[cd,bc,ab].map(e=>({...e,geometry:{...e.geometry,coordinates:e.geometry.coordinates.slice().reverse()}}))},{nodes});
assert.deepEqual(reverse.map(s=>s.title),['Avanza por el camino','Gira a la derecha','Gira a la izquierda']);
const lift={...cd,kind:'elevator',floors:5};
const ride=build({nodes:['c','d'],edges:[lift]},{nodes})[0];
assert.match(ride.text,/ascensor de ML/);assert.match(ride.text,/5 pisos/);assert.match(ride.text,/por confirmar/);assert.equal(ride.confirm,true);assert.doesNotMatch(ride.text,/hasta el piso 5/);
assert.match(build({nodes:['c','d'],edges:[{...lift,fromFloor:2,toFloor:7}]},{nodes})[0].text,/hasta el piso 7/);
assert.match(build({nodes:['d','c'],edges:[{...lift,fromFloor:2,toFloor:7}]},{nodes})[0].text,/hasta el piso 2/);
assert.equal(clean('Cruce OSM 123456'), '');assert.equal(clean('osm-123456'), '');assert.equal(clean('Entrada al puente'),'Entrada al puente');
const foot=project([-74.065,4.6015],steps);assert.ok(foot.distance<.1);assert.ok(Math.abs(foot.progress-50)<.1);
// Actual campus routes must produce useful instructions for every available mode.
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),ctx={window:{}};vm.createContext(ctx);
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){const s=m[1];if(s.includes('root.CampusRouting=')||s.includes('root.CampusNavigation=')||s.startsWith('window.CAMPUS_CLIENT_GRAPH='))vm.runInContext(s,ctx);}
const g=ctx.window.CAMPUS_CLIENT_GRAPH,codes=[...new Set(Object.values(g.nodes).map(n=>n.buildingCode).filter(Boolean))];let count=0;
for(const from of codes)for(const to of codes){if(from===to)continue;const result=ctx.window.CampusNavigation.alternatives(g,from,to);assert.equal(result.status,'ready');for(const r of result.routes){if(!r.route)continue;const out=build(r.route,g);assert.ok(out.length);assert.ok(out.every(s=>s.text&&!/OSM|osm-/.test(s.text)&&Number.isFinite(s.end)));assert.ok(Math.abs(out.at(-1).end-r.route.meters)<1);count++;}}
console.log('PASS: turn direction, reverse travel, elevator floor metadata, no OSM labels, GPS projection and '+count+' campus routes');
