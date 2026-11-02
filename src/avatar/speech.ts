import { bus } from './bus';

/* --------------------------- text-to-speech (output) ----------------------- */

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

const LANG_TAG: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN' };
export const langTag = (l: string) => LANG_TAG[l] ?? 'en-US';

const FEMALE = /female|woman|zira|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|jenny|aria|emma|libby|sonia|natasha|google uk english female|google us english|microsoft (zira|aria|jenny)/i;
const MALE = /\bmale\b|david|mark|daniel|alex|fred|george|guy|ryan|james|thomas|google uk english male|microsoft (david|mark|guy|ryan)/i;

function pickVoice(lang: string, gender: 'f' | 'm') {
  const all = window.speechSynthesis.getVoices();
  const pool = all.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const list = pool.length ? pool : all;
  const re = gender === 'f' ? FEMALE : MALE;
  return list.find((v) => re.test(v.name)) ?? list.find((v) => !(gender === 'f' ? MALE : FEMALE).test(v.name)) ?? list[0] ?? null;
}

export interface SpeakOptions {
  lang: string;
  rate: number;
  volume: number;
  gender: 'f' | 'm';
  pitch: number;
  audible: boolean;
  onEnd: () => void;
}

let current = 0;

export function cancelSpeech() {
  current++;
  bus.speech = null;
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/**
 * Speak `text` and publish a lip-sync signal. When audio is not possible
 * (muted / unsupported) the lip-sync runs silently on an estimated timeline.
 */
export function speak(text: string, o: SpeakOptions) {
  cancelSpeech();
  const id = current;
  const clean = text.replace(/\s+/g, ' ').trim();
  const cps = 13.5 * o.rate;
  const begin = performance.now();
  bus.speech = { text: clean, start: begin, cps, boundaryPos: -2, boundaryAt: begin, silent: !o.audible };

  const finish = () => {
    if (id !== current) return;
    bus.speech = null;
    o.onEnd();
  };

  if (!o.audible || !ttsSupported() || o.volume <= 0) {
    window.setTimeout(finish, (clean.length / cps) * 1000 + 500);
    return { audible: false };
  }

  const u = new SpeechSynthesisUtterance(clean);
  u.lang = langTag(o.lang);
  u.rate = o.rate;
  u.pitch = o.pitch;
  u.volume = Math.min(1, o.volume);
  const v = pickVoice(o.lang, o.gender);
  if (v) { u.voice = v; u.lang = v.lang; }
  u.onstart = () => {
    if (id !== current || !bus.speech) return;
    bus.speech.boundaryPos = 0;
    bus.speech.boundaryAt = performance.now();
  };
  u.onboundary = (e) => {
    if (id !== current || !bus.speech) return;
    if (typeof e.charIndex === 'number') {
      bus.speech.boundaryPos = e.charIndex;
      bus.speech.boundaryAt = performance.now();
    }
  };
  u.onend = finish;
  u.onerror = (e) => {
    if (id !== current) return;
    if (bus.speech && bus.speech.boundaryPos < 0 && e.error !== 'canceled' && e.error !== 'interrupted') {
      // engine failed before producing audio: keep the character talking silently
      bus.speech.boundaryPos = 0;
      bus.speech.boundaryAt = performance.now();
      bus.speech.silent = true;
      window.setTimeout(finish, (clean.length / cps) * 1000 + 400);
      return;
    }
    finish();
  };
  // safety net: if the engine never starts (autoplay policy), fall back to silent timing
  const watchdog = window.setTimeout(() => {
    if (id === current && bus.speech && bus.speech.boundaryPos < 0) {
      bus.speech.boundaryPos = 0;
      bus.speech.boundaryAt = performance.now();
      bus.speech.silent = true;
      window.setTimeout(finish, (clean.length / cps) * 1000 + 400);
    }
  }, 1800);
  u.onstart = ((prev) => () => { window.clearTimeout(watchdog); prev(); })(u.onstart as () => void);
  window.speechSynthesis.speak(u);
  return { audible: true };
}

/* ---------------------------- speech-to-text (input) ----------------------- */

interface RecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognition(): (new () => RecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const sttSupported = () => !!getRecognition();

export type ListenEnd = 'final' | 'silence' | 'stopped' | 'denied' | 'unavailable' | 'unsupported' | 'error';

export interface Listener { stop: () => void }

export interface ListenHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: (reason: ListenEnd) => void;
}

/** Capture microphone level (for the avatar to react) and recognise speech. */
export async function startListening(lang: string, h: ListenHandlers): Promise<Listener> {
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let raf = 0;
  let ended = false;
  let finalText = '';
  let rec: RecognitionLike | null = null;
  let silenceTimer = 0;

  const cleanup = () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(silenceTimer);
    bus.micLevel = 0;
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close().catch(() => undefined);
  };
  const end = (r: ListenEnd) => {
    if (ended) return;
    ended = true;
    try { rec?.abort(); } catch { /* ignore */ }
    cleanup();
    h.onEnd(r);
  };

  if (!navigator.mediaDevices?.getUserMedia) { h.onEnd('unavailable'); return { stop: () => undefined }; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const name = (e as DOMException)?.name;
    h.onEnd(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    return { stop: () => undefined };
  }

  // live input level
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const tick = () => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      bus.micLevel += (Math.min(1, rms * 5) - bus.micLevel) * 0.35;
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch { /* level meter is optional */ }

  const Rec = getRecognition();
  if (!Rec) {
    // no recogniser: briefly show listening, then report so the UI can fall back to text
    silenceTimer = window.setTimeout(() => end('unsupported'), 1400);
    return { stop: () => end('stopped') };
  }

  rec = new Rec();
  rec.lang = langTag(lang);
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = r[0]?.transcript ?? '';
      if (r.isFinal) finalText += t; else interim += t;
    }
    window.clearTimeout(silenceTimer);
    h.onInterim((finalText + interim).trim());
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') end('denied');
    else if (e.error === 'no-speech') end('silence');
    else if (e.error === 'aborted') end('stopped');
    else end('error');
  };
  rec.onend = () => {
    if (ended) return;
    if (finalText.trim()) { const t = finalText.trim(); ended = true; cleanup(); h.onFinal(t); h.onEnd('final'); }
    else end('silence');
  };
  try { rec.start(); } catch { end('error'); }
  silenceTimer = window.setTimeout(() => end('silence'), 9000);

  return {
    stop: () => {
      if (ended) return;
      // let recogniser flush a final result when the user stops manually
      try { rec?.stop(); } catch { end('stopped'); }
      window.setTimeout(() => end('stopped'), 1200);
    },
  };
}
