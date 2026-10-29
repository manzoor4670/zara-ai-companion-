// Mock-only Cloudflare Worker for Zara compatibility. No Character.AI traffic.
import { createCharacterProvider } from './adapter.mjs';
const cors = {
  'Access-Control-Allow-Origin':'https://manzoor4670.github.io',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Cache-Control':'no-store',
  'Vary':'Origin'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
export default {
  async fetch(request) {
    const origin=request.headers.get('Origin');
    if(origin && origin !== cors['Access-Control-Allow-Origin']) return json({error:'Origin not allowed'},403);
    const pathname=new URL(request.url).pathname;
    if(request.method==='OPTIONS') return origin===cors['Access-Control-Allow-Origin'] ? new Response(null,{status:204,headers:cors}) : json({error:'Origin not allowed'},403);
    if(request.method==='GET' && pathname==='/health') return json({service:'Zara CharacterAI mock test',ready:false,connected:false});
    if(request.method!=='POST'||pathname!=='/test') return json({error:'Not found'},404);
    if(origin!==cors['Access-Control-Allow-Origin'])return json({error:'Origin required'},403);
    let data;
    try {
      if(Number(request.headers.get('Content-Length')||0)>4096) return json({error:'Too large'},413);
      const raw=await request.text();
      if(raw.length>4096) return json({error:'Too large'},413);
      data=JSON.parse(raw);
    }catch {return json({error:'Invalid JSON'},400);}
    // Send function is a test stub, NOT a connection to Character.AI.
    const provider=createCharacterProvider({enabled:true,send:async input=>({reply:input.language==='Urdu'?'یہ صرف آزمائشی جواب ہے۔':'Yeh sirf test jawab hai.'})});
    try{const outcome=await provider.reply(data);return json({...outcome,mock:true,connected:false},outcome.code==='CHARACTERAI_BAD_REQUEST'?400:outcome.error?503:200);}
    catch {return json({error:'Invalid request'},400);}
  }
};
