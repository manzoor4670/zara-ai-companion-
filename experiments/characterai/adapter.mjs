// Isolated provider adapter: intentionally no Character.AI network or credential handling.
export function validateZaraRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) throw new Error('Message must contain 1-2000 characters');
  const mode = ['normal','romantic','adult','flirty'].includes(body.mode) ? body.mode : 'normal';
  const language = ['Roman Urdu','Urdu','English'].includes(body.language) ? body.language : 'Roman Urdu';
  return { message, mode: mode === 'flirty' ? 'adult' : mode, language };
}
export function createCharacterProvider({ send, enabled = false } = {}) {
  return {
    async reply(body) {
      if (!enabled) return { error:'Character.AI provider is not configured', code:'CHARACTERAI_DISABLED' };
      if (typeof send !== 'function') return { error:'No verified provider transport', code:'CHARACTERAI_UNAVAILABLE' };
      const input = validateZaraRequest(body);
      const response = await send(input);
      if (!response || typeof response.reply !== 'string' || !response.reply.trim()) throw new Error('Invalid provider response');
      return { reply:response.reply.trim(), provider:'CharacterAI-experimental' };
    }
  };
}
