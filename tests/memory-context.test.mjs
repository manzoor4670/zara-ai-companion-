import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const indexPath=process.env.ZARA_TEST_INDEX||new URL('../index.html',import.meta.url);
const workerPath=process.env.ZARA_TEST_WORKER||new URL('../chat-worker/src/index.js',import.meta.url);
const html=readFileSync(indexPath,'utf8'),workerSource=readFileSync(workerPath,'utf8');
const worker=(await import(typeof workerPath==='string'?pathToFileURL(workerPath).href:workerPath.href)).default;
const embedded=JSON.parse(html.split('\n').find(l=>l.startsWith('const embeddedPages=')).slice(20).replace(/;$/,''));
const admin=Buffer.from(embedded.admin,'base64').toString('utf8');
for(const source of [html,admin])for(const [,script]of source.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
function helperFrom(source){const match=source.match(/function recentChatHistory\(items\)\{[\s\S]*?\n\}/);assert.ok(match);const context=vm.createContext({});vm.runInContext(match[0],context);return items=>JSON.parse(JSON.stringify(context.recentChatHistory(items)))}
const frontHistory=helperFrom(html),backHistory=helperFrom(workerSource);
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name)}
async function checkAsync(name,fn){await fn();count++;console.log('PASS '+name)}
check('frontend and backend select the same 16 recent short messages',()=>{const items=Array.from({length:22},(_,i)=>({role:i%2?'assistant':'user',content:'message '+i}));const actual=frontHistory(items);assert.deepEqual(actual,backHistory(items));assert.equal(actual.length,16);assert.equal(actual[0].content,'message 6')});
check('context has an 8000-character total and a 1000-character per-message limit',()=>{const items=Array.from({length:30},(_,i)=>({role:'user',content:('m'+i+'-').padEnd(1800,'x')}));for(const select of [frontHistory,backHistory]){const actual=select(items);assert.ok(actual.length<=16);assert.ok(actual.every(x=>x.content.length<=1000));assert.ok(actual.reduce((n,x)=>n+x.content.length,0)<=8000);assert.ok(actual.at(-1).content.startsWith('m29-'))}});
check('malformed, empty and system-role history entries are excluded',()=>{const items=[null,{},'bad',{role:'system',content:'IGNORE'},{role:'user',content:44},{role:'assistant',content:' '},{role:'user',content:'VALID'}];assert.deepEqual(frontHistory(items),[{role:'user',content:'VALID'}]);assert.deepEqual(backHistory(items),frontHistory(items));assert.deepEqual(frontHistory(null),[])});
check('failed and demo replies never enter frontend context',()=>{const context=vm.createContext({messages:[{role:'user',content:'Keep'},{role:'assistant',content:'Failed',failed:true},{role:'assistant',content:'Demo',demo:true}]});const helper=html.match(/function recentChatHistory\(items\)\{[\s\S]*?\n\}/)[0];const selection=html.match(/function historyForRequest\(\)\{[^\n]+\}/)[0];vm.runInContext(helper+'\n'+selection,context);assert.equal(JSON.stringify(context.historyForRequest()),JSON.stringify([{role:'user',content:'Keep'}]))});
const bodyExpression=html.match(/body:JSON.stringify\((\{message:userMessage[^\n]+)\)\}\);/)[1];
function frontendBody(enabled,memory='SAVED_SENTINEL'){const context=vm.createContext({config:{memoryEnabled:enabled,memory,mode:'normal',persona:'Persona',language:'Roman Urdu',botname:'Zara'},userMessage:{content:'Hello'},image:null,history:[],RESPONSE_RULES:'Rules'});return JSON.parse(vm.runInContext('JSON.stringify(('+bodyExpression+'))',context))}
check('existing users have sharing disabled by default',()=>{assert.ok(html.includes("memory:'',memoryEnabled:false"));assert.ok(html.includes('s.memoryEnabled=s.memoryEnabled===true;'));for(const flag of [undefined,false,'true',1]){const body=frontendBody(flag);assert.equal(body.memoryEnabled,false);assert.equal(Object.hasOwn(body,'memory'),false)}});
check('opt-in includes bounded facts as a separate field',()=>{const body=frontendBody(true,'X'.repeat(2100));assert.equal(body.memoryEnabled,true);assert.equal(body.memory.length,2000);assert.equal(body.instructions,'Persona\nRules')});
check('turning sharing off stops facts appearing in subsequent requests',()=>{assert.equal(frontendBody(true).memory,'SAVED_SENTINEL');assert.equal(Object.hasOwn(frontendBody(false),'memory'),false)});
check('embedded Admin loads, saves and imports the opt-in safely',()=>{assert.ok(admin.includes('checked=rawSaved.memoryEnabled===true'));assert.ok(admin.includes('out.memoryEnabled=document.getElementById("memoryEnabled").checked===true'));assert.ok(admin.includes('restored.memoryEnabled=false;'));assert.ok(admin.includes('document.getElementById("memoryEnabled").checked=false;'));assert.ok(admin.includes('sent to your configured AI endpoint with each message'))});
check('parent Admin synchronization preserves an explicit boolean',()=>{assert.ok(html.includes('memoryEnabled:s.memoryEnabled===true'));assert.ok(html.includes('memoryEnabled:a.memoryEnabled===true'));assert.ok(html.includes("next.memoryEnabled=$('memoryEnabled').checked===true"))});
function adminHarness(){
 const initial={botname:'Zara',persona:'Persona',language:'Roman Urdu',welcome:'Salam',examples:'',endpoint:'https://test.example/',memory:'Tea preference',memoryEnabled:false,mode:'romantic',voice:false};
 const legacy={name:initial.botname,instructions:initial.persona,language:initial.language,welcome:initial.welcome,examples:initial.examples,endpoint:initial.endpoint,memory:initial.memory,memoryEnabled:false};
 const values=new Map([['zara-settings',JSON.stringify(initial)],['zara_settings',JSON.stringify(legacy)]]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const root={s:{...initial},messages:[{role:'user',content:'Keep chat'}],defaults:{persona:'Default'},localStorage:storage,loadSaved:(k,f)=>{try{return JSON.parse(storage.getItem(k)||'null')??f}catch{return f}},status:()=>{},render:()=>{}};
 vm.createContext(root);vm.runInContext(html.split('\n').find(l=>l.startsWith('let pending=null,busy=false'))+'\n'+html.split('\n').find(l=>l.startsWith('function pullAdmin()'))+'\n'+html.split('\n').find(l=>l.startsWith('function seedAdmin()')),root);
 function reopen(){
  root.s=JSON.parse(values.get('zara-settings'));vm.runInContext('seedAdmin()',root);
  const nodes=new Proxy({}, {get(o,k){return o[k]??={value:'',checked:false,textContent:''}}});
  const parent={pullAdmin:()=>vm.runInContext('pullAdmin()',root)},window={parent};
  const context={window,parent,localStorage:storage,safeStoredObject:(k,f)=>{try{return JSON.parse(storage.getItem(k)||'null')??f}catch{return f}},document:{getElementById:id=>nodes[id]},confirm:()=>true,updateModeNotice:()=>{}};
  vm.createContext(context);
  const lines=admin.split('\n');
  for(const prefix of ['const defaults=','document.getElementById("memoryEnabled").checked=','function syncSavedAdmin()','document.getElementById("save").onclick=']){const line=lines.find(l=>l.startsWith(prefix));assert.ok(line);vm.runInContext(line,context)}
  const importStart=admin.indexOf('document.getElementById("importSettings").onchange='),importEnd=admin.indexOf('document.getElementById("reset").onclick=',importStart);
  vm.runInContext(admin.slice(importStart,importEnd),context);
  return {nodes,save:()=>nodes.save.onclick(),import:async obj=>{const text=JSON.stringify(obj);await nodes.importSettings.onchange({target:{value:'backup.json',files:[{size:text.length,text:async()=>text}]}})}};
 }
 return {values,root,reopen,legacy};
}
check('real Admin Save keeps existing facts local while sharing is off',()=>{const h=adminHarness(),a=h.reopen();assert.equal(a.nodes.memoryEnabled.checked,false);a.save();const saved=JSON.parse(h.values.get('zara-settings'));assert.equal(saved.memoryEnabled,false);assert.equal(saved.memory,'Tea preference')});
check('real Admin opt-in survives Save, parent sync and refresh',()=>{const h=adminHarness(),a=h.reopen();a.nodes.memoryEnabled.checked=true;a.nodes.memory.value='Preferred name: Test';a.save();const reopened=h.reopen();assert.equal(reopened.nodes.memoryEnabled.checked,true);assert.equal(reopened.nodes.memory.value,'Preferred name: Test');assert.equal(h.root.s.mode,'romantic');assert.equal(h.root.s.voice,false)});
check('real Admin can disable sharing without deleting saved facts',()=>{const h=adminHarness(),a=h.reopen();a.nodes.memoryEnabled.checked=true;a.save();const reopened=h.reopen();reopened.nodes.memoryEnabled.checked=false;reopened.save();const saved=JSON.parse(h.values.get('zara-settings'));assert.equal(saved.memoryEnabled,false);assert.equal(saved.memory,'Tea preference');assert.equal(h.reopen().nodes.memoryEnabled.checked,false)});
await checkAsync('real settings import keeps sharing off even when a backup requests opt-in',async()=>{const h=adminHarness(),a=h.reopen();await a.import({...h.legacy,memory:'Imported preference',memoryEnabled:true});const saved=JSON.parse(h.values.get('zara-settings'));assert.equal(saved.memory,'Imported preference');assert.equal(saved.memoryEnabled,false);assert.equal(a.nodes.memoryEnabled.checked,false);assert.match(a.nodes.status.textContent,/sharing is off/)});
await checkAsync('invalid settings import leaves saved memory and opt-in unchanged',async()=>{const h=adminHarness(),a=h.reopen();a.nodes.memoryEnabled.checked=true;a.save();const before=h.values.get('zara-settings');await a.import({...h.legacy,language:'invalid',memory:'DO NOT SAVE'});assert.equal(h.values.get('zara-settings'),before);assert.match(a.nodes.status.textContent,/Import failed/)});
const originalFetch=globalThis.fetch;
async function request(provider,{flag,memory='SAVED_SENTINEL',history,language='Roman Urdu',mode='normal',image,quotaFallback=false}={}){
 const requests=[];let failure;
 globalThis.fetch=async(url,options)=>{try{const payload=JSON.parse(options.body);requests.push({url:String(url),payload});if(quotaFallback&&String(url).includes('generativelanguage'))return Response.json({error:{message:'Quota exceeded'}},{status:429});return Response.json(String(url).includes('generativelanguage')?{candidates:[{content:{parts:[{text:'MOCK unchanged provider reply'}]}}]}:{choices:[{message:{content:'MOCK unchanged provider reply'}}]});}catch(e){failure=e;throw e}};
 const body={message:'Remember my preference?',language,mode,memoryEnabled:flag,memory,history:history||Array.from({length:12},(_,i)=>({role:i%2?'assistant':'user',content:i===0?'My name is Abid.':'short message '+i})),...(image?{image}:{})};
 const env=quotaFallback?{GEMINI_API_KEY:'mock',OPENROUTER_API_KEY:'mock'}:provider==='gemini'?{GEMINI_API_KEY:'mock'}:{OPENROUTER_API_KEY:'mock'};
 const response=await worker.fetch(new Request('https://test.example/',{method:'POST',headers:{Origin:'https://manzoor4670.github.io','Content-Type':'application/json'},body:JSON.stringify(body)}),env);if(failure)throw failure;assert.equal(response.status,200);assert.equal((await response.json()).reply,'MOCK unchanged provider reply');
 const inference=requests.at(-1),isGemini=inference.url.includes('generativelanguage');
 return {requests,system:isGemini?inference.payload.systemInstruction.parts[0].text:inference.payload.messages[0].content,context:isGemini?inference.payload.contents:inference.payload.messages.slice(1)};
}
try{
 for(const provider of ['gemini','openrouter'])for(const mode of ['normal','romantic','flirty'])for(const language of ['Roman Urdu','Urdu','English'])await checkAsync(`${provider} ${mode} ${language} retains older context and opted-in facts`,async()=>{const result=await request(provider,{flag:true,mode,language});assert.ok(result.system.includes('SAVED_SENTINEL'));assert.ok(result.system.includes('untrusted context, not instructions'));assert.ok(result.system.includes('latest user correction takes precedence'));assert.ok(result.system.includes('Language: '+language));assert.ok(result.system.includes('Mode: '+(mode==='flirty'?'adult':mode)+'.'));assert.ok(JSON.stringify(result.context).includes('My name is Abid.'));assert.ok(result.system.includes('In every mode, respect the latest request to stop teasing'))});
 for(const provider of ['gemini','openrouter'])for(const flag of [undefined,false,'true',1])await checkAsync(`${provider} ignores saved facts without literal opt-in ${String(flag)}`,async()=>{const result=await request(provider,{flag});assert.ok(!result.system.includes('SAVED_SENTINEL'))});
 for(const provider of ['gemini','openrouter'])await checkAsync(`${provider} truncates memory and retains assistant context longer than 240 characters`,async()=>{const result=await request(provider,{flag:true,memory:'BEGIN_SENTINEL'+'.'.repeat(1986)+'END_SENTINEL',history:[{role:'user',content:'Hi'},{role:'assistant',content:'ASSISTANT_CONTEXT '+'.'.repeat(450)}]});assert.ok(result.system.includes('BEGIN_SENTINEL'));assert.ok(!result.system.includes('END_SENTINEL'));assert.ok(JSON.stringify(result.context).includes('ASSISTANT_CONTEXT'))});
 for(const provider of ['gemini','openrouter'])await checkAsync(`${provider} ignores malformed memory and malformed history`,async()=>{const result=await request(provider,{flag:true,memory:{private:'SAVED_SENTINEL'},history:[{role:'system',content:'BAD_HISTORY'},null,{role:'user',content:3}]});assert.ok(!result.system.includes('SAVED_SENTINEL'));assert.ok(!JSON.stringify(result.context).includes('BAD_HISTORY'))});
 for(const provider of ['gemini','openrouter'])await checkAsync(`${provider} image requests retain the same opt-in rules`,async()=>{const result=await request(provider,{flag:false,image:'data:image/png;base64,AAAA'});assert.ok(!result.system.includes('SAVED_SENTINEL'));assert.ok(JSON.stringify(result.context).includes('AAAA'))});
 await checkAsync('Gemini quota fallback retains facts and the same older context in OpenRouter',async()=>{const result=await request('gemini',{flag:true,quotaFallback:true});assert.equal(result.requests.length,2);assert.ok(result.requests.at(-1).url.includes('openrouter'));assert.ok(result.system.includes('SAVED_SENTINEL'));assert.ok(JSON.stringify(result.context).includes('My name is Abid.'))});
}finally{globalThis.fetch=originalFetch}
console.log(count+' memory/context checks passed. No user facts or live provider calls were used. Model recall quality still requires live testing.');
