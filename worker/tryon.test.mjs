import assert from 'node:assert/strict';
import worker from './src/index.js';
const base='https://tryon.example/';
const origin='https://manzoor4670.github.io';
const ask=(method,body,headers={},env={})=>worker.fetch(new Request(base,{method,headers:{Origin:origin,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
let response=await worker.fetch(new Request(base),{});
let data=await response.json();
assert.equal(data.ready,false);
assert.equal(data.providerConfigured,false);
response=await worker.fetch(new Request(base),{TRYON_PROVIDER_URL:'https://provider.example/api'});
data=await response.json();
assert.equal(data.ready,false);
assert.equal(data.providerConfigured,true);
response=await worker.fetch(new Request(base),{TRYON_PROVIDER_URL:'not a url'});
data=await response.json();
assert.equal(data.providerConfigured,false);
response=await ask('POST',null,{}, {TRYON_PROVIDER_URL:'https://provider.example/api'});
assert.equal(response.status,400);
response=await ask('POST',{avatar:'x',dress:'y'});
assert.equal(response.status,503);
response=await worker.fetch(new Request(base,{method:'OPTIONS',headers:{Origin:'https://other.example'}}),{});
assert.equal(response.status,403);
response=await worker.fetch(new Request(base,{method:'OPTIONS',headers:{Origin:origin}}),{});
assert.equal(response.status,204);

response=await worker.fetch(new Request(base),{TRYON_PROVIDER:'replicate',REPLICATE_API_TOKEN:'test-token'});
data=await response.json();
assert.equal(data.providerConfigured,true);
response=await ask('POST',{avatar:'data:image/png;base64,AAAA',dress:'data:image/png;base64,AAAA'}, {}, {TRYON_PROVIDER:'replicate'});
assert.equal(response.status,503);
const oldFetch=globalThis.fetch;
try {
  let called=false;
  globalThis.fetch=async (url,options)=>{
    called=true;
    assert.equal(url,'https://api.replicate.com/v1/models/prunaai/p-image-try-on/predictions');
    assert.equal(options.headers.Authorization,'Bearer test-token');
    const payload=JSON.parse(options.body);
    assert.equal(payload.input.person_image,'data:image/png;base64,AAAA');
    assert.deepEqual(payload.input.garment_images,['data:image/png;base64,AAAA']);
    return new Response(JSON.stringify({status:'succeeded',output:'https://replicate.delivery/example.jpg'}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  response=await ask('POST',{avatar:'data:image/png;base64,AAAA',dress:'data:image/png;base64,AAAA'}, {}, {TRYON_PROVIDER:'replicate',REPLICATE_API_TOKEN:'test-token'});
  data=await response.json();
  assert.equal(response.status,200);
  assert.equal(data.image,'https://replicate.delivery/example.jpg');
  assert.equal(called,true);
}finally{globalThis.fetch=oldFetch}

console.log('PASS: Zara Try-On readiness and mock Replicate provider checks (offline; no charges)');
