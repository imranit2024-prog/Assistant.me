import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Printer, Search, X } from 'lucide-react';
import { sections, groups } from '../data';
import type { Block } from '../data/types';
import { BlockRenderer } from './Blocks';
import { cn } from '../utils/cn';

function flatten(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'lead': case 'p': case 'h3': parts.push(b.text); break;
      case 'list': case 'steps': parts.push(...b.items); break;
      case 'table': parts.push(...b.headers, ...b.rows.flat(), b.caption ?? ''); break;
      case 'callout': parts.push(b.title, b.text); break;
      case 'kv': parts.push(...b.items.flat()); break;
      case 'code': parts.push(b.text, b.title ?? ''); break;
      case 'models': parts.push(...b.items.flatMap((m) => [m.name, m.role, m.intro, m.instructions, m.config, m.boundaries])); break;
      case 'screens': parts.push(...b.items.flatMap((s) => [s.name, s.purpose, s.layout, s.behavior, ...s.components, ...s.acceptance])); break;
      case 'flows': parts.push(...b.items.flatMap((f) => [f.name, f.trigger, f.outcome, ...f.steps, ...f.alternatives])); break;
      case 'phases': parts.push(...b.items.flatMap((p) => [p.name, p.objective, ...p.deliverables, ...p.exit])); break;
      case 'ac': parts.push(...b.items.flatMap((a) => [a.id, a.criterion, a.verification])); break;
    }
  }
  return parts.join(' ');
}

const index = sections.map((s) => ({ s, text: flatten(s.blocks).toLowerCase() }));

export default function DocsOverlay({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(sections[0].id);
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id.replace('doc-', ''));
    }, { root, rootMargin: '-10px 0px -72% 0px' });
    sections.forEach((s) => { const el = document.getElementById('doc-' + s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const nav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return index.filter((i) => i.s.title.toLowerCase().includes(q) || i.text.includes(q)).map((i) => i.s);
  }, [query]);

  const go = (id: string) => {
    setActive(id);
    const el = document.getElementById('doc-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="docs-overlay fixed inset-0 z-[90] flex flex-col bg-[#050a16] text-slate-200">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.09] bg-[#070d1c]/95 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onClose} aria-label="Back to A.I.D.A" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-violet-400/40 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /><span className="hidden sm:inline">Back to app</span></button>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-violet-300" />
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold text-white">A.I.D.A — Functional Requirements Document</div>
              <div className="truncate text-[9.5px] text-slate-500">AIDA-FRD-001 · v1.0 baseline · 35 sections</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 py-1.5 md:flex">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter sections or IDs…" className="w-[190px] bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600" />
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-violet-400/40 hover:text-white"><Printer className="h-3.5 w-3.5" /><span className="hidden sm:inline">Print / PDF</span></button>
          <button onClick={onClose} aria-label="Close document" className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="docs-toc panel-scroll hidden w-[288px] shrink-0 overflow-y-auto border-r border-white/[0.08] px-3 py-4 md:block">
          {query && <div className="mb-2 px-2 text-[9.5px] text-slate-500">{nav.length} matching section(s)</div>}
          {groups.map((g) => {
            const items = nav.filter((s) => s.group === g.name);
            if (!items.length) return null;
            return (
              <div key={g.name} className="mb-4">
                <div className="mb-1.5 flex items-center justify-between px-2"><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{g.name}</span><span className="font-mono text-[9px] text-slate-600">{g.range}</span></div>
                {items.map((s) => (
                  <button key={s.id} onClick={() => go(s.id)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-[6px] text-left text-[11.5px] leading-snug transition', active === s.id ? 'bg-violet-500/15 font-semibold text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200')}>
                    <span className={cn('w-[20px] shrink-0 font-mono text-[9.5px]', active === s.id ? 'text-violet-300' : 'text-slate-600')}>{String(s.number).padStart(2, '0')}</span>
                    <span className="flex-1">{s.title}</span>
                    {active === s.id && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div ref={scrollRef} className="docs-scroll panel-scroll min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-8 sm:py-10">
            <div className="mb-8 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-4">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300"><ChevronRight className="h-3 w-3" />Development-ready baseline</div>
              <p className="text-[12px] leading-relaxed text-slate-300">This full FRD is the specification behind the A.I.D.A interface. It covers seven AI modes, rigged 3D avatars, audio-driven lip-sync, persistence and acceptance criteria. Items marked TBC are undecided — not assumed.</p>
            </div>
            {sections.map((s) => (
              <section key={s.id} id={'doc-' + s.id} className="doc-docs scroll-mt-4 border-t border-white/[0.08] pt-8 first:border-0 first:pt-0 [&:not(:first-child)]:mt-10">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-md border border-violet-400/25 bg-violet-500/10 px-1.5 font-mono text-[10.5px] font-bold text-violet-300">{String(s.number).padStart(2, '0')}</span>
                  {s.eyebrow && <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{s.eyebrow}</span>}
                </div>
                <h2 className="mb-4 text-[24px] font-semibold tracking-[-0.02em] text-white">{s.title}</h2>
                <BlockRenderer blocks={s.blocks} />
              </section>
            ))}
            <div className="mt-12 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-center text-[11px] text-slate-500">End of AIDA-FRD-001 v1.0 · 7 AI modes · 64 requirements · 25 acceptance criteria</div>
          </div>
        </div>
      </div>
    </div>
  );
}
