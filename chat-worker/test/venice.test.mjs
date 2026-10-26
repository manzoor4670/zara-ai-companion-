import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
const origin='https://manzoor4670.github.io';
const env={VENICE_API_KEY:'test-secret',GEMINI_API_KEY:'test-gemini',OPENROUTER_API_KEY:'test-router'};
const request=(body)=>new Request('https://example.test/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const run=async(body,settings=env)=>{const r=await worker.fetch(request(body),settings);return {status:r.status,data:await r.json()};};
test('Venice readiness reports configuration without exposing secrets',async()=>{
 const r=await worker.fetch(new Request('https://example.test/'),{VENICE_API_KEY:'test-secret'});
 const data=await r.json();
 assert.equal(data.ready,true);assert.equal(data.providers.venice,true);assert.equal(data.primaryTextProvider,'Venice');assert.ok(!JSON.stringify(data).includes('test-secret'));
});
test('Venice keeps language, mode, history, bounded output and server-side auth',async()=>{
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.venice.ai/api/v1/chat/completions');
  assert.equal(options.headers.Authorization,'Bearer test-secret');
  const body=JSON.parse(options.body);
  assert.equal(body.model,'custom-model');assert.equal(body.max_tokens,500);
  assert.match(body.messages[0].content,/Language: Urdu. Mode: romantic/);
  assert.match(body.messages[0].content,/without graphic sexual content/);
  assert.equal(body.messages[1].content,'Pehla sawal');
  assert.equal(body.messages.at(-1).content,'Salam');
  return Response.json({choices:[{message:{content:'وعلیکم السلام'}}]});
 };
 const out=await run({message:'Salam',language:'Urdu',mode:'romantic',history:[{role:'user',content:'Pehla sawal'}]},{...env,VENICE_MODEL:'custom-model'});
 assert.equal(out.status,200);assert.equal(out.data.provider,'Venice');assert.equal(out.data.reply,'وعلیکم السلام');
});
test('Venice errors do not retry or leak upstream details',async()=>{
 for(const [status,code] of [[401,'VENICE_AUTH'],[402,'VENICE_CREDITS'],[403,'VENICE_ACCESS'],[404,'VENICE_MODEL'],[429,'VENICE_RATE_LIMIT'],[500,'VENICE_PROVIDER']]){
  let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:'sensitive upstream detail'},{status});};
  const out=await run({message:'Salam'});
  assert.equal(calls,1);assert.equal(out.data.code,code);assert.equal(out.status,status===429?429:502);assert.ok(!JSON.stringify(out).includes('sensitive'));
 }
});
test('Refusals remain visible output, and reasoning is never returned',async()=>{
 globalThis.fetch=async()=>Response.json({choices:[{message:{refusal:'Cannot help with that.',reasoning_content:'private chain'}}]});
 const out=await run({message:'Salam'});assert.equal(out.data.reply,'Cannot help with that.');assert.equal(out.data.refused,true);assert.ok(!JSON.stringify(out).includes('private chain'));
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:'',reasoning_content:'private chain'}}]});
 assert.equal((await run({message:'Salam'})).data.code,'VENICE_EMPTY');
 globalThis.fetch=async()=>{throw Error('secret');};
 assert.equal((await run({message:'Salam'})).data.code,'VENICE_NETWORK');
});
test('Validation and allowed origin run before paid API calls',async()=>{
 globalThis.fetch=async()=>{throw Error('must not call');};
 assert.equal((await run({message:''})).status,400);
 assert.equal((await run({message:'Salam',image:'invalid'})).status,400);
 const r=await worker.fetch(new Request('https://example.test/',{method:'POST',body:'{}'}),env);assert.equal(r.status,403);
});
test('Images keep existing Gemini routing, with clear error for Venice-only setup',async()=>{
 let calls=0;globalThis.fetch=async(url)=>{calls++;assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));return Response.json({candidates:[{content:{parts:[{text:'A picture'}]}}]});};
 const body={message:'Describe',image:'data:image/png;base64,YQ=='};
 assert.equal((await run(body)).data.reply,'A picture');assert.equal(calls,1);
 assert.equal((await run(body,{VENICE_API_KEY:'test-secret'})).data.code,'IMAGE_PROVIDER_REQUIRED');assert.equal(calls,1);
});
test('Without Venice, existing Gemini text path is preserved',async()=>{
 globalThis.fetch=async(url)=>{assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));return Response.json({candidates:[{content:{parts:[{text:'Salam'}]}}]});};
 assert.equal((await run({message:'Salam'},{GEMINI_API_KEY:'test-gemini'})).data.reply,'Salam');
});
