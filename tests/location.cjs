const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const dom=new JSDOM('<select id="origin"><option value="ML">ML</option></select><button id="swap"></button>',{url:'https://guti03-dev.github.io/campus-uniandes/',runScripts:'outside-only'}),w=dom.window,d=w.document;
Object.defineProperty(w,'isSecureContext',{value:true});let success,failure;Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition(ok,no){success=ok;failure=no;}}});w.toast=()=>{};w.CampusSheet={setLevel(){}};
w.eval("const CATALOG={buildings:[{code:'ML',name:'Mario Laserna'}]};const graph={nodes:{a:{coordinates:[-74.065,4.601]},b:{coordinates:[-74.0649,4.601],buildingCode:'ML'},c:{coordinates:[-74.06,4.61]}},edges:[{from:'a',to:'b',closed:false}]};let map=null;"+fs.readFileSync(path.join(__dirname,'../location.js'),'utf8'));
const locate=()=>d.getElementById('locateOrigin').click(),msg=()=>d.getElementById('locationMessage').textContent;
locate();failure({code:1});assert.match(msg(),/No se permitió/);assert.equal(d.getElementById('origin').value,'ML');
locate();success({coords:{longitude:-74.065,latitude:4.601,accuracy:100}});assert.match(msg(),/poca precisión/);assert.equal(d.getElementById('locationCandidates').hidden,true);
locate();success({coords:{longitude:0,latitude:0,accuracy:5}});assert.match(msg(),/No hay un punto/);
locate();success({coords:{longitude:-74.065,latitude:4.601,accuracy:5}});assert.equal(d.getElementById('locationNode').options.length,2);assert.equal(d.getElementById('origin').value,'ML');d.getElementById('confirmLocation').click();assert.equal(d.getElementById('origin').value,'a');assert.match(msg(),/Origen confirmado/);
locate();const stale=success;d.getElementById('origin').value='ML';d.getElementById('origin').dispatchEvent(new w.Event('change'));stale({coords:{longitude:-74.065,latitude:4.601,accuracy:5}});assert.equal(d.getElementById('locationCandidates').hidden,true);assert.equal(d.getElementById('origin').value,'ML');
assert.equal(w.CampusLocation.nearby([-74.06,4.61]).length,0);assert.equal(w.CampusLocation.distance([0,0],[0,0]),0);
// Verify the existing route engine accepts a confirmed node ID as origin.
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){if(m[1].includes('root.CampusRouting=')||m[1].includes('root.CampusNavigation='))w.eval(m[1]);}
const graph={nodes:{a:{coordinates:[-74.065,4.601]},b:{coordinates:[-74.0649,4.601],buildingCode:'ML'}},edges:[{id:'ab',from:'a',to:'b',meters:11,seconds:10,steps:0,kind:'path',accessibility:'verified',slope:0,width:120,surface:'firm'}]};const result=w.CampusNavigation.alternatives(graph,'a','ML');assert.equal(result.status,'ready');assert.equal(result.routes[0].route.nodes[0],'a');
w.close();console.log('PASS: permissions, low accuracy, outside network, confirmation required, stale GPS, isolated nodes and actual route engine');
