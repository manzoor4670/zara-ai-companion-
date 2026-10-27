import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../avatar.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const KEY='zara_avatar_store_v1';
function setup(saved){
  const nodes=new Map(); const storage=new Map(saved?[[KEY,JSON.stringify(saved)]]:[]);
  const node=()=>({hidden:false,disabled:false,value:'',textContent:'',style:{},files:[],append(){},replaceChildren(){},removeAttribute(k){delete this[k]},dispatchEvent(){},click(){},remove(){}});
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,body:node()};
  const context=vm.createContext({document,localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(context.full)throw Error('full');storage.set(k,v)},removeItem:k=>storage.delete(k)},alert(){},confirm:()=>true,Event:class{},console});
  vm.runInContext(source,context);
  vm.runInContext('resize=async file=>file.image',context);
  return {context,nodes,storage,get:id=>document.getElementById(id),state:()=>vm.runInContext('state',context),run:s=>vm.runInContext(s,context)};
}
const base={avatar:'original',dresses:[],chosen:-1,expression:'friendly'};
let passed=0;
async function check(name,fn){await fn();console.log('PASS',name);passed++;}
await check('existing avatar loads without migration loss',()=>{const a=setup(base);assert.equal(a.get('avatar').src,'original');assert.equal(a.get('restoreOriginal').hidden,true)});
await check('result requires original photo before applying',async()=>{const a=setup();await a.get('resultFile').onchange({target:{files:[{image:'look'}]}});assert.equal(a.get('applyImported').disabled,true);a.get('applyImported').onclick();assert.equal(a.state().manualLook,'')});
await check('manual look preserves original and survives reload',async()=>{const a=setup(base);await a.get('resultFile').onchange({target:{files:[{image:'look'}]}});a.get('applyImported').onclick();assert.equal(a.state().avatar,'original');assert.equal(a.get('avatar').src,'look');const b=setup(JSON.parse(a.storage.get(KEY)));assert.equal(b.get('avatar').src,'look');assert.equal(b.get('restoreOriginal').hidden,false)});
await check('restore returns to original and persists',()=>{const a=setup({...base,manualLook:'look'});a.get('restoreOriginal').onclick();assert.equal(a.get('avatar').src,'original');assert.equal(JSON.parse(a.storage.get(KEY)).manualLook,'')});
await check('storage failure preserves previous look',async()=>{const a=setup({...base,manualLook:'old'});await a.get('resultFile').onchange({target:{files:[{image:'new'}]}});a.context.full=true;a.get('applyImported').onclick();assert.equal(a.state().manualLook,'old');assert.equal(a.get('avatar').src,'old');a.get('restoreOriginal').onclick();assert.equal(a.state().manualLook,'old')});
await check('removing preview keeps applied look',async()=>{const a=setup(base);await a.get('resultFile').onchange({target:{files:[{image:'look'}]}});a.get('applyImported').onclick();a.get('clearImported').onclick();assert.equal(a.get('avatar').src,'look');assert.equal(a.get('applyImported').disabled,true)});
await check('failed import cannot apply a stale result',async()=>{const a=setup(base);await a.get('resultFile').onchange({target:{files:[{image:'look'}]}});a.run('resize=async()=>{throw Error("bad image")}');await a.get('resultFile').onchange({target:{files:[{}]}});a.get('applyImported').onclick();assert.equal(a.state().manualLook,'');assert.equal(a.get('applyImported').disabled,true)});
await check('removed pending upload cannot return later',async()=>{const a=setup(base);a.run('resize=()=>new Promise(resolve=>globalThis.finish=resolve)');const p=a.get('resultFile').onchange({target:{files:[{}]}});a.get('clearImported').onclick();a.context.finish('late');await p;assert.equal(a.get('importedResult').hidden,true);assert.equal(a.get('applyImported').disabled,true)});
await check('latest selected result wins upload race',async()=>{const a=setup(base);a.run('globalThis.queue=[];resize=()=>new Promise(resolve=>queue.push(resolve))');const p=a.get('resultFile').onchange({target:{files:[{}]}});const q=a.get('resultFile').onchange({target:{files:[{}]}});a.context.queue[1]('new');await q;a.context.queue[0]('old');await p;a.get('applyImported').onclick();assert.equal(a.get('avatar').src,'new')});
await check('new original clears old manual look and preview',async()=>{const a=setup({...base,manualLook:'old'});await a.get('avatarFile').onchange({target:{files:[{image:'new-original'}]}});assert.equal(a.state().manualLook,'');assert.equal(a.get('avatar').src,'new-original');assert.equal(a.get('applyImported').disabled,true)});
await check('reset clears current and original images',()=>{const a=setup({...base,manualLook:'look'});a.get('reset').onclick();assert.equal(a.get('avatar').hidden,true);assert.equal(a.storage.has(KEY),false)});
console.log(`${passed} manual dress checks passed`);
