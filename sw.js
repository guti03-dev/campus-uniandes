'use strict';
const BUILD='community-markers-v3-20261021';
const ROOT=new URL('./',self.location.href);
const PREFIX='campus-pwa-'+encodeURIComponent(ROOT.pathname)+'-';
const CACHE=PREFIX+BUILD;
const FILES=['./','./index.html','./manifest.webmanifest','./pwa.js','./community.js','./community.css','./mobile-ui.js','./mobile-ui.css','./vendor/supabase-2.118.0.js','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
const URLS=FILES.map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})))));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
const home=url.pathname===ROOT.pathname||url.pathname===new URL('index.html',ROOT).pathname;
const canonical=home?new URL('index.html',ROOT).href:url.origin+url.pathname;
if(!home&&!URLS.includes(canonical))return;
event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(canonical);if(cached)return cached;return fetch(req);})());});

