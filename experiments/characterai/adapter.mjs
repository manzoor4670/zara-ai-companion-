// Experimental Zara provider boundary. No Character.AI requests or credentials.
export function validateZaraRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
  const message=typeof body.message==='string'?body.message.trim():'';
  if (!message || message.length>2000) throw new Error('Message must contain 1-2000 characters');
  const mode=['normal','romantic','adult','flirty'].includes(body.mode)?body.mode:'normal';
  const language=['Roman Urdu','Urdu','English'].includes(body.language)?body.language:'Roman Urdu';
  return {message,mode:mode==='flirty'?'adult':mode,language};
}
export function createCharacterProvider({send,enabled=false,timeoutMs=12000}={}) {
  return {
    async reply(body) {
      if (!enabled) return {error:'Character.AI provider is not configured',code:'CHARACTERAI_DISABLED'};
      if (typeof send!=='function') return {error:'No verified provider transport',code:'CHARACTERAI_UNAVAILABLE'};
      let input;
      try {input=validateZaraRequest(body)}
      catch {return {error:'Invalid chat request',code:'CHARACTERAI_BAD_REQUEST'}}
      const timeout=Math.max(100,Math.min(30000,Number(timeoutMs)||12000));
      const controller=new AbortController();
      let timer;
      try {
        const result=await Promise.race([
          Promise.resolve().then(()=>send(input,{signal:controller.signal})),
          new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('provider timeout'))},timeout)})
        ]);
        if (!result || typeof result.reply!=='string' || !result.reply.trim()) return {error:'Empty provider response',code:'CHARACTERAI_EMPTY'};
        return {reply:result.reply.trim(),provider:'CharacterAI-experimental'};
      } catch {
        return {error:controller.signal.aborted?'Provider timeout':'Provider request failed',code:controller.signal.aborted?'CHARACTERAI_TIMEOUT':'CHARACTERAI_ERROR'};
      } finally {clearTimeout(timer)}
    }
  };
}
