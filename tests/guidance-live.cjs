const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const dom=new JSDOM('<main><select id="origin"><option value="ML">ML</option></select><button id="swap"></button><select id="destination"><option value="W">W</option></select><section id="directions"><div class="stats"></div></section></main>',{url:'https://guti03-dev.github.io/campus-uniandes/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;Object.defineProperty(w,'isSecureContext',{value:true});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
let ok,no,calls=0,clears=0,moves=0,drag=null;
Object.defineProperty(w.navigator,'geolocation',{value:{watchPosition(success,error){ok=success;no=error;return ++calls},clearWatch(){clears++}}});
w.mapboxgl={Marker:class{setLngLat(){return this}addTo(){return this}remove(){}}};
w.mockMap={on(name,fn){if(name==='dragstart')drag=fn},off(){drag=null},getZoom:()=>17,easeTo(){moves++}};
for(const m of source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].includes('root.CampusRouting=')||m[1].includes('root.CampusNavigation='))w.eval(m[1]);
w.eval(`
const graph={nodes:{a:{name:'Entrada ML',buildingCode:'ML',coordinates:[-74.065,4.601]},b:{name:'Entrada W',buildingCode:'W',coordinates:[-74.065,4.603]},c:{name:'Cruce OSM 123456',coordinates:[-74.0655,4.602]}},edges:[]};
for(const [from,to,meters] of [['a','b',222],['c','b',124]])graph.edges.push({id:from+to,from,to,meters,seconds:meters/1.2,steps:0,kind:'path',surface:'firm',slope:0,width:120,accessibility:'verified',closed:false,oneWay:false,geometry:{type:'LineString',coordinates:[graph.nodes[from].coordinates,graph.nodes[to].coordinates]}});
const CATALOG={buildings:[{code:'ML',name:'Mario Laserna'},{code:'W',name:'W'}]},profile={maxSlope:6,minWidth:110};let map=window.mockMap,options=CampusNavigation.alternatives(graph,'ML','W',profile).routes,active=options.find(r=>r.mode==='accessible');
function toast(){};function compare(){options=CampusNavigation.alternatives(graph,document.getElementById('origin').value,'W',profile).routes;}
function selectRoute(mode){active=options.find(r=>r.mode===mode);const section=document.getElementById('directions');section.innerHTML='<div class="stats"></div>';CampusGuidance.mount(section,active.route,'W');}
document.getElementById('origin').onchange=()=>window.CampusGuidance.stop();
window.editConnector=(kind)=>{graph.edges[1].kind=kind;graph.edges[1].steps=kind==='stairs'?10:0;};
`+fs.readFileSync(path.join(__dirname,'../navigation.js'),'utf8')+fs.readFileSync(path.join(__dirname,'../location.js'),'utf8')+`;CampusGuidance.mount(document.getElementById('directions'),active.route,'W');`);
const click=id=>d.getElementById(id).click(),state=()=>w.CampusGuidance.getState(),fix=(point,accuracy=5,timestamp=Date.now())=>ok({coords:{longitude:point[0],latitude:point[1],accuracy},timestamp});
assert.equal(d.getElementById('demoGuidance'),null);assert.equal(calls,0);click('startGuidance');assert.equal(calls,1);assert.equal(state().mode,'live');assert.equal(state().routeMode,'accessible');assert.doesNotMatch(d.getElementById('guidanceBadge').textContent,/prototipo|DEMO/i);
fix([-74.065,4.602]);assert.ok(state().progress>100&&state().progress<120);assert.ok(moves>0);
drag();assert.equal(state().following,false);const count=moves;fix([-74.065,4.6021]);assert.equal(moves,count);click('guidanceFollow');assert.ok(moves>count);
const progress=state().progress;fix([-74.065,4.6025],100);assert.equal(state().progress,progress);fix([-74.065,4.6025],5,Date.now()-20000);assert.equal(state().progress,progress);
fix([-74.0655,4.602]);assert.equal(state().offRoute,false);fix([-74.0655,4.602]);assert.equal(state().offRoute,true);assert.equal(state().candidate,'c');
click('guidanceRecalculate');assert.equal(d.getElementById('guidanceReplan').open,true);assert.doesNotMatch(d.getElementById('guidanceReplanPoint').textContent,/OSM/);click('guidanceReplanCancel');assert.equal(d.getElementById('origin').value,'ML');
click('guidanceRecalculate');w.editConnector('stairs');click('guidanceReplanConfirm');assert.match(d.getElementById('guidanceReplanMessage').textContent,/No hay una conexión/);assert.equal(d.getElementById('origin').value,'ML');assert.equal(state().routeMode,'accessible');
w.editConnector('path');click('guidanceReplanConfirm');assert.equal(d.getElementById('guidanceReplan'),null);assert.equal(d.getElementById('origin').value,'c');assert.equal(d.getElementById('destination').value,'W');assert.equal(state().routeMode,'accessible');assert.equal(calls,2);assert.ok(clears>=1);
const stale=ok;click('guidanceGPS');assert.equal(state().gps,false);stale({coords:{longitude:0,latitude:0,accuracy:5}});assert.equal(state().offRoute,false);
click('guidanceGPS');no({code:1});assert.equal(state().gps,false);assert.match(d.getElementById('guidanceMessage').textContent,/No se permitió/);click('guidanceAdvance');assert.equal(state().arrived,true);click('guidanceAdvance');assert.equal(state(),null);
dom.window.close();console.log('PASS: normal launch, GPS progress, map follow, poor/stale fixes, sustained deviation, confirmed replan preserving accessibility, disconnected route, pause, denied permission and cleanup');
