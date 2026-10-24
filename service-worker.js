// Offline UI shell only. AI model, try-on and external websites still require internet.
const CACHE="zara-static-v1";
const ASSETS=["./","./index.html","./admin.html","./avatar.html","./dress-prompt.html","./manifest.webmanifest","./zara-icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("zara-static-")&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith("/zara-ai-companion-/"))return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{})}return res}).catch(async()=>{return await caches.match(req,{ignoreSearch:true})||await caches.match("./index.html")||Response.error()}));
  return;
 }
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});