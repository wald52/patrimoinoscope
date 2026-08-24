const CACHE="patrimoinoscope-v2";
const ASSETS=[
  "./",
  "./index.html",
  "./audit.html",
  "./explorer.html",
  "./mentions-legales.html",
  "./site/style.css",
  "./site/app.js",
  "./site/config.js",
  "./manifest.json",
  "./data/kpis.json",
  "./data/by_category.json",
  "./data/by_mandat.json",
  "./data/interets.json",
  "./data/timeseries.json",
  "./data/di_explorer.json"
];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))) .then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e=>{
  const url=new URL(e.request.url);
  // cache-first for data
  if(url.pathname.endsWith(".json") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js")){
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      const clone=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, clone));
      return res;
    }).catch(()=>caches.match(e.request))));
    return;
  }
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
