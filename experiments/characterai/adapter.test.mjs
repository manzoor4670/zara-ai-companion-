import assert from 'node:assert/strict';
import { validateZaraRequest, createCharacterProvider } from './adapter.mjs';
assert.equal(validateZaraRequest({ message:'  Salam ', mode:'flirty' }).mode,'adult');
assert.equal(validateZaraRequest({message:'Salam'}).language,'Roman Urdu');
assert.throws(()=>validateZaraRequest({message:' '}));
assert.deepEqual(await createCharacterProvider().reply({message:'hello'}),{error:'Character.AI provider is not configured',code:'CHARACTERAI_DISABLED'});
assert.equal((await createCharacterProvider({enabled:true,send:async input=>({reply:'  Walaikum salam  '})}).reply({message:'Salam'})).reply,'Walaikum salam');
await assert.rejects(()=>createCharacterProvider({enabled:true,send:async()=>({reply:''})}).reply({message:'Salam'}));
console.log('PASS: 6 offline adapter checks');
