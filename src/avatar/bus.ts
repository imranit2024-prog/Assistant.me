/**
 * Mutable signal bus between the React UI and the 3D engine.
 * Kept outside React state so the render loop can read it every frame
 * without triggering re-renders.
 */
export type AvatarState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface SpeechSignal {
  text: string;
  start: number;
  cps: number;
  boundaryPos: number;
  boundaryAt: number;
  silent: boolean;
}

export const bus = {
  state: 'idle' as AvatarState,
  speech: null as SpeechSignal | null,
  micLevel: 0,
  pointer: null as { x: number; y: number; t: number } | null,
  hover: false,
  waveAt: 0,
  smileUntil: 0,
  reduceMotion: false,
  animate: true,
};
