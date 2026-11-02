import type { SpeechSignal } from './bus';

/** Oculus / Ready Player Me viseme set */
export const VISEMES = ['sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U'] as const;
export type Viseme = typeof VISEMES[number];

/** How far each viseme opens the mouth (used for jaw, energy and fallback rigs) */
export const OPENNESS: Record<Viseme, number> = {
  sil: 0, PP: 0, FF: 0.1, TH: 0.2, DD: 0.3, kk: 0.3, CH: 0.3, SS: 0.2, nn: 0.25, RR: 0.3, aa: 1, E: 0.55, I: 0.4, O: 0.75, U: 0.45,
};

interface Mapped { v: Viseme; s: number }

const SIL: Mapped = { v: 'sil', s: 0 };

/** Map the letter at index i to a viseme (with simple digraph handling). */
export function charViseme(text: string, i: number): Mapped {
  const c = text[i]?.toLowerCase();
  const n = text[i + 1]?.toLowerCase();
  const p = text[i - 1]?.toLowerCase();
  if (!c || !/[a-z]/.test(c)) return SIL;
  if (c === 'h' && (p === 't' || p === 'c' || p === 's')) return { v: 'sil', s: 0.1 };
  if (c === 't' && n === 'h') return { v: 'TH', s: 0.9 };
  if (c === 'c' && n === 'h') return { v: 'CH', s: 0.9 };
  if (c === 's' && n === 'h') return { v: 'CH', s: 0.9 };
  switch (c) {
    case 'a': return { v: 'aa', s: 1 };
    case 'e': return { v: 'E', s: 0.95 };
    case 'i': case 'y': return { v: 'I', s: 0.9 };
    case 'o': return { v: 'O', s: 1 };
    case 'u': case 'w': return { v: 'U', s: 0.9 };
    case 'b': case 'm': case 'p': return { v: 'PP', s: 1 };
    case 'f': case 'v': return { v: 'FF', s: 1 };
    case 'd': case 't': return { v: 'DD', s: 0.85 };
    case 'l': case 'n': return { v: 'nn', s: 0.8 };
    case 'k': case 'g': case 'c': case 'q': return { v: 'kk', s: 0.8 };
    case 'j': return { v: 'CH', s: 0.9 };
    case 's': case 'z': case 'x': return { v: 'SS', s: 0.8 };
    case 'r': return { v: 'RR', s: 0.8 };
    case 'h': return { v: 'aa', s: 0.3 };
    default: return SIL;
  }
}

export interface SpeechFrame { v: Viseme; w: number; done: boolean }

/**
 * Evaluate the viseme timeline at `now`. The position in the text is driven by
 * word-boundary events from the speech engine (when available) and advanced
 * by an estimated characters-per-second rate between events.
 */
export function speechFrame(sp: SpeechSignal, now: number): SpeechFrame {
  const pos = sp.boundaryPos + ((now - sp.boundaryAt) / 1000) * sp.cps;
  if (pos >= sp.text.length + 1) return { v: 'sil', w: 0, done: true };
  if (pos < 0) return { v: 'sil', w: 0, done: false };
  const i = Math.floor(pos);
  const frac = pos - i;
  const m = charViseme(sp.text, i);
  // open → close envelope per letter so the mouth visibly articulates
  const env = 0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, frac * 1.05));
  return { v: m.v, w: m.s * env, done: false };
}
