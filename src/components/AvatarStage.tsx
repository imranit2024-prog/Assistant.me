import { useEffect, useRef, useState } from 'react';
import { AvatarEngine } from '../avatar/engine';
import { bus } from '../avatar/bus';

interface Props {
  modelId: string;
  fallbackImage?: string;
  label: string;
  onPoke?: () => void;
}

/** Transparent WebGL canvas that renders the active 3D character. */
export default function AvatarStage({ modelId, fallbackImage, label, onPoke }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<AvatarEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let eng: AvatarEngine;
    try {
      eng = new AvatarEngine(canvas.current!);
    } catch {
      setFailed(true);
      return;
    }
    engine.current = eng;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) eng.resize(r.width, r.height);
    });
    ro.observe(wrap.current!);
    const rect = wrap.current!.getBoundingClientRect();
    eng.resize(rect.width, rect.height);
    eng.start();

    const onMove = (e: PointerEvent) => { bus.pointer = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onLeave = () => { bus.pointer = null; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      ro.disconnect();
      eng.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    const eng = engine.current;
    if (!eng) return;
    let cancelled = false;
    setLoading(true);
    setShown(false);
    eng.show(modelId)
      .then(() => {
        if (cancelled) return;
        bus.waveAt = performance.now();
        bus.smileUntil = performance.now() + 2600;
        setLoading(false);
        requestAnimationFrame(() => setShown(true));
      })
      .catch(() => { if (!cancelled) { setFailed(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [modelId]);

  return (
    <div ref={wrap} className="absolute inset-0">
      {failed ? (
        fallbackImage && <img src={fallbackImage} alt={label} className="absolute inset-0 h-full w-full object-contain object-bottom" />
      ) : (
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${label} — interactive 3D character. Move your mouse and the character will look at you; click to say hello.`}
          title="Click to say hello"
          className="absolute inset-0 h-full w-full cursor-pointer touch-none transition-opacity duration-300"
          style={{
            opacity: shown ? 1 : 0,
            WebkitMaskImage: 'linear-gradient(to bottom, #000 86%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, #000 86%, transparent 100%)',
          }}
          onPointerEnter={() => { bus.hover = true; }}
          onPointerLeave={() => { bus.hover = false; }}
          onClick={() => { bus.waveAt = performance.now(); bus.smileUntil = performance.now() + 2200; onPoke?.(); }}
        />
      )}
      {loading && !failed && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-300" />
          <div className="text-[10px] font-medium tracking-[0.18em] text-violet-200/80">LOADING 3D CHARACTER…</div>
        </div>
      )}
    </div>
  );
}
