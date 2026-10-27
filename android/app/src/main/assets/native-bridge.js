(() => {
  'use strict';
  const channel = window.ZaraAndroid;
  if (!channel || window.top !== window || location.origin !== 'https://manzoor4670.github.io'
      || !(location.pathname === '/zara-ai-companion-' || location.pathname.startsWith('/zara-ai-companion-/'))
      || window.__zaraAndroidBridgeInstalled) return;
  window.__zaraAndroidBridgeInstalled = true;
  let sequence = 0, activeRecognition = null, voices = [], speaking = false;
  const utterances = new Map(), listeners = new Set();
  const post = value => channel.postMessage(JSON.stringify(value));
  const fire = (callback, event) => { if (typeof callback === 'function') { try { callback(event); } catch (_) {} } };

  class NativeRecognition {
    constructor() { this.lang = 'ur-PK'; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; }
    start() {
      if (activeRecognition) throw new DOMException('Already listening', 'InvalidStateError');
      if (navigator.userActivation && !navigator.userActivation.isActive) throw new DOMException('Tap the microphone first', 'NotAllowedError');
      this._id = 'recognition-' + (++sequence); activeRecognition = this;
      try { post({action:'startSpeech', id:this._id, lang:this.lang}); } catch (error) { activeRecognition = null; throw error; }
    }
    stop() { if (activeRecognition === this) post({action:'stopSpeech', id:this._id}); }
    abort() {
      if (activeRecognition !== this) return;
      activeRecognition = null; post({action:'abortSpeech', id:this._id});
      fire(this.onend, {type:'end'});
    }
  }
  class NativeUtterance {
    constructor(text = '') { this.text = String(text); this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; }
  }
  const synthesis = {
    getVoices: () => voices.slice(),
    get speaking() { return speaking; },
    get pending() { return utterances.size > 0; },
    get paused() { return false; },
    speak(utterance) {
      if (!utterance || typeof utterance.text !== 'string') throw new TypeError('An utterance is required');
      const id = 'utterance-' + (++sequence); utterances.set(id, utterance);
      try { post({action:'speak', id, text:utterance.text, lang:utterance.lang || 'ur-PK',
        voiceURI:utterance.voice?.voiceURI || '', rate:utterance.rate, pitch:utterance.pitch, volume:utterance.volume}); }
      catch (error) { utterances.delete(id); throw error; }
    },
    cancel() { utterances.clear(); speaking = false; post({action:'stopTts'}); },
    // Zara uses resume() for Android compatibility and exposes Stop rather than pause.
    resume() {},
    addEventListener(type, callback) { if (type === 'voiceschanged') listeners.add(callback); },
    removeEventListener(type, callback) { if (type === 'voiceschanged') listeners.delete(callback); },
    onvoiceschanged: null
  };
  channel.onmessage = event => {
    let data; try { data = JSON.parse(event.data); } catch (_) { return; }
    if (data.type === 'voices') {
      voices = Array.isArray(data.voices) ? data.voices.filter(v => typeof v.voiceURI === 'string' && typeof v.lang === 'string') : [];
      for (const callback of [...listeners]) fire(callback, {type:'voiceschanged'});
      fire(synthesis.onvoiceschanged, {type:'voiceschanged'}); return;
    }
    if (data.type?.startsWith('recognition-')) {
      const recognition = activeRecognition;
      if (!recognition || data.id !== recognition._id) return;
      if (data.type === 'recognition-start') fire(recognition.onstart, {type:'start'});
      if (data.type === 'recognition-result' && typeof data.text === 'string') {
        const result = [{transcript:data.text, confidence:1}]; result.isFinal = true;
        fire(recognition.onresult, {type:'result', resultIndex:0, results:[result]});
      }
      if (data.type === 'recognition-error') fire(recognition.onerror, {type:'error', error:data.error || 'network'});
      if (data.type === 'recognition-end') { activeRecognition = null; fire(recognition.onend, {type:'end'}); }
      return;
    }
    const utterance = utterances.get(data.id); if (!utterance) return;
    if (data.type === 'tts-start') { speaking = true; fire(utterance.onstart, {type:'start'}); }
    if (data.type === 'tts-boundary') fire(utterance.onboundary, {type:'boundary', name:'word', charIndex:data.index || 0});
    if (data.type === 'tts-end' || data.type === 'tts-error') {
      utterances.delete(data.id); speaking = false;
      fire(data.type === 'tts-end' ? utterance.onend : utterance.onerror,
        {type:data.type === 'tts-end' ? 'end' : 'error', error:data.error || 'synthesis-failed'});
    }
  };
  try {
    Object.defineProperty(window, 'SpeechRecognition', {value:NativeRecognition, configurable:true});
    Object.defineProperty(window, 'webkitSpeechRecognition', {value:NativeRecognition, configurable:true});
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {value:NativeUtterance, configurable:true});
    Object.defineProperty(window, 'speechSynthesis', {value:synthesis, configurable:true});
    post({action:'getVoices'});
  } catch (_) { /* The app's Chrome button remains available if WebView is too old. */ }

  document.addEventListener('click', async event => {
    const anchor = event.target.closest?.('a');
    if (!anchor?.download || !anchor.href?.startsWith('blob:') || !anchor.download.endsWith('.json')) return;
    event.preventDefault();
    try {
      const blob = await (await fetch(anchor.href)).blob();
      if (blob.size > 1000000) throw new Error('Backup is too large');
      const text = await blob.text(); JSON.parse(text);
      post({action:'exportJson', filename:anchor.download, text});
    } catch (_) { alert('Backup save nahi ho saka. Chrome mein export karke dobara koshish karein.'); }
  }, true);
})();
