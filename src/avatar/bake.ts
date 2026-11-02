import { AvatarEngine } from './engine';
import { CHARACTERS } from '../data/characters';
import { bus } from './bus';

/** Dev utility: renders every character to a transparent portrait (?bake=1). */
export async function runBake() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:360px;height:380px;background:#222';
  document.body.appendChild(canvas);
  bus.animate = false;
  const eng = new AvatarEngine(canvas, { preserve: true });
  const out: Record<string, string> = {};
  const w = window as unknown as { __thumbs?: Record<string, string>; __bakeError?: string };
  try {
    for (const id of Object.keys(CHARACTERS)) {
      out[id] = await eng.portrait(id, 360, 380, { center: 1.56, height: 0.6, width: 0.64 });
    }
    w.__thumbs = out;
  } catch (e) {
    w.__bakeError = String(e);
  }
}
