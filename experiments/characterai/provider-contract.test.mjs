// Offline contract tests for a possible Character.AI provider.
// Does not log in, contact Character.AI, read tokens, or deploy.
// Run with: node experiments/characterai/provider-contract.test.mjs
import assert from 'node:assert/strict';

function normalizeResult(providerResult) {
  if (!providerResult || typeof providerResult !== 'object') throw new Error('Invalid provider result');
  if (typeof providerResult.reply !== 'string' || !providerResult.reply.trim()) throw new Error('Empty response');
  return { reply: providerResult.reply.trim() };
}

function validateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid input');
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) throw new Error('Message length invalid');
  const mode = ['normal','romantic','adult','flirty'].includes(body.mode) ? body.mode : 'normal';
  const language = ['Roman Urdu','Urdu','English'].includes(body.language) ? body.language : 'Roman Urdu';
  return { message, mode, language };
}

const sample = validateInput({message:'Salam Zara',mode:'romantic',language:'Roman Urdu'});
assert.deepEqual(sample, {message:'Salam Zara',mode:'romantic',language:'Roman Urdu'});
assert.deepEqual(normalizeResult({reply:'  Walaikum salam!  '}),{reply:'Walaikum salam!'});
assert.throws(()=>validateInput({message:'  '}));
assert.throws(()=>normalizeResult({reply:''}));
assert.equal(validateInput({message:'Hello',mode:'unknown'}).mode,'normal');
console.log('PASS: Zara provider request/response contract (offline only)');
