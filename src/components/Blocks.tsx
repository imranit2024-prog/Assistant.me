import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CircleHelp,
  Flag,
  FlaskConical,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Block, CalloutVariant, ModelSpec, ScreenSpec, FlowSpec, PhaseSpec, AcceptanceRow } from '../data/types';
import { cn } from '../utils/cn';

const calloutStyles: Record<CalloutVariant, { cls: string; icon: typeof Info; label: string }> = {
  info: { cls: 'border-sky-400/30 bg-sky-400/[0.07] text-sky-200', icon: Info, label: 'Note' },
  tbc: { cls: 'border-amber-400/30 bg-amber-400/[0.07] text-amber-200', icon: CircleHelp, label: 'To Be Confirmed' },
  mvp: { cls: 'border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-200', icon: BadgeCheck, label: 'MVP' },
  warn: { cls: 'border-rose-400/30 bg-rose-400/[0.07] text-rose-200', icon: AlertTriangle, label: 'Important' },
  future: { cls: 'border-violet-400/30 bg-violet-400/[0.07] text-violet-200', icon: Sparkles, label: 'Future scope' },
};

function Callout({ block }: { block: Extract<Block, { type: 'callout' }> }) {
  const s = calloutStyles[block.variant];
  const Icon = s.icon;
  return (
    <div className={cn('my-6 flex gap-3.5 rounded-xl border px-5 py-4', s.cls)}>
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 opacity-80" />
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{s.label}</div>
        <div className="text-[13.5px] leading-relaxed text-slate-200/90">{block.title && <strong className="font-semibold text-white">{block.title} — </strong>}{block.text}</div>
      </div>
    </div>
  );
}

function DataTable({ block }: { block: Extract<Block, { type: 'table' }> }) {
  return (
    <figure className="my-7">
      <div className="overflow-x-auto rounded-xl border border-white/[0.09] bg-[#0d1428]/70 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.9)]">
        <table className={cn('w-full border-collapse text-left', block.dense ? 'text-[11.5px]' : 'text-[12.5px]')}>
          <thead>
            <tr className="bg-gradient-to-r from-indigo-500/[0.14] to-violet-500/[0.08]">
              {block.headers.map((h, i) => (
                <th key={i} className={cn('whitespace-nowrap border-b border-white/10 px-3.5 font-semibold uppercase tracking-[0.09em] text-indigo-200/90', block.dense ? 'py-2.5 text-[10px]' : 'py-3 text-[10.5px]')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="align-top transition-colors hover:bg-white/[0.025] even:bg-white/[0.012]">
                {row.map((cell, c) => (
                  <td key={c} className={cn('border-b border-white/[0.055] px-3.5 leading-relaxed text-slate-300/90', block.dense ? 'py-2' : 'py-3', c === 0 ? 'whitespace-nowrap font-semibold text-slate-100' : '')}>
                    <span className={cn('block', block.dense ? 'min-w-[70px]' : 'min-w-[110px]', block.headers.length > 8 ? 'max-w-[240px]' : 'max-w-[420px]')}>{cell}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.caption && <figcaption className="mt-2.5 pl-1 text-[11px] font-medium tracking-wide text-slate-500">{block.caption}</figcaption>}
    </figure>
  );
}

function ModelCard({ model, index }: { model: ModelSpec; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className={cn('my-3 overflow-hidden rounded-xl border bg-[#0d1428]/70 transition-colors', open ? 'border-indigo-400/35' : 'border-white/[0.09] hover:border-white/20')}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-mono text-[11px] font-semibold text-indigo-300">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold tracking-[0.08em] text-white">{model.name}</span>
          <span className="block truncate text-[12px] text-slate-400">{model.role}</span>
        </span>
        <span className="hidden rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500 sm:block">{model.id}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      <div className={cn(!open && 'hidden', 'print-reveal')}>
        <div className="border-t border-white/[0.07] px-5 pb-5 pt-4">
          <p className="mb-4 text-[13.5px] leading-relaxed text-slate-300">{model.intro}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h5 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/80">Responsibilities / capabilities</h5>
              <ul className="space-y-1.5">
                {model.responsibilities.map((r) => <li key={r} className="flex gap-2 text-[12.5px] leading-snug text-slate-300/90"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-indigo-400" />{r}</li>)}
              </ul>
            </div>
            <div className="space-y-3 text-[12.5px] leading-relaxed">
              <Field label="System instructions" value={model.instructions} />
              <Field label="Capability configuration" value={model.config} />
              <Field label="Domain boundaries" value={model.boundaries} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"><span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Avatar binding</span><span className="text-[12px] text-slate-200">{model.avatar}</span></div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"><span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Voice profile</span><span className="text-[12px] text-slate-200">{model.voice}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/80">{label}</div>
      <div className="text-slate-300/90">{value}</div>
    </div>
  );
}

function ScreenCard({ screen }: { screen: ScreenSpec }) {
  const [open, setOpen] = useState(screen.id === 'SCR-01');
  const fields: [string, string][] = [
    ['Purpose', screen.purpose], ['Layout structure', screen.layout], ['Information hierarchy', screen.hierarchy],
    ['Interaction behaviour', screen.behavior], ['Loading state', screen.loading], ['Empty state', screen.empty],
    ['Error state', screen.error], ['Success state', screen.success], ['Navigation', screen.navigation], ['Responsive behaviour', screen.responsive],
  ];
  return (
    <div className={cn('my-4 overflow-hidden rounded-xl border bg-[#0d1428]/70', open ? 'border-indigo-400/35' : 'border-white/[0.09]')}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="rounded-md bg-indigo-500/15 px-2 py-1 font-mono text-[10px] font-semibold text-indigo-300">{screen.id}</span>
        <span className="flex-1 text-[14px] font-semibold text-white">{screen.name}</span>
        <span className="hidden text-[11px] text-slate-500 sm:block">13 attributes</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      <div className={cn(!open && 'hidden', 'print-reveal')}>
        <div className="border-t border-white/[0.07] px-5 pb-6 pt-5">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {fields.map(([k, v]) => <Field key={k} label={k} value={v} />)}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
              <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/80"><Layers className="h-3.5 w-3.5" />UI components</h5>
              <div className="flex flex-wrap gap-1.5">{screen.components.map((c) => <span key={c} className="rounded border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[11px] text-slate-300">{c}</span>)}</div>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
              <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/80"><ArrowRight className="h-3.5 w-3.5" />User actions</h5>
              <div className="flex flex-wrap gap-1.5">{screen.actions.map((c) => <span key={c} className="rounded border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[11px] text-slate-300">{c}</span>)}</div>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
            <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/90"><BadgeCheck className="h-3.5 w-3.5" />Acceptance criteria</h5>
            <ul className="space-y-1.5">{screen.acceptance.map((a) => <li key={a} className="flex gap-2 text-[12.5px] text-slate-300/90"><span className="text-emerald-400">✓</span>{a}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowCard({ flow }: { flow: FlowSpec }) {
  const [open, setOpen] = useState(flow.id === 'UF-01');
  return (
    <div className={cn('my-3 overflow-hidden rounded-xl border bg-[#0d1428]/70', open ? 'border-violet-400/30' : 'border-white/[0.09]')}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="rounded-md bg-violet-500/15 px-2 py-1 font-mono text-[10px] font-semibold text-violet-300">{flow.id}</span>
        <span className="flex-1 text-[13.5px] font-semibold text-white">{flow.name}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      <div className={cn(!open && 'hidden', 'print-reveal')}>
        <div className="border-t border-white/[0.07] px-5 pb-5 pt-4">
          <Field label="Trigger" value={flow.trigger} />
          <ol className="mt-4 space-y-2">
            {flow.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed text-slate-300/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10 font-mono text-[10px] text-indigo-300">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <FlowList title="Decision points" items={flow.decisions} tone="sky" />
            <FlowList title="Alternative flows" items={flow.alternatives} tone="amber" />
            <FlowList title="Successful outcome" items={[flow.outcome]} tone="emerald" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowList({ title, items, tone }: { title: string; items: string[]; tone: 'sky' | 'amber' | 'emerald' }) {
  const colors = { sky: 'border-sky-400/20 bg-sky-400/[0.04] text-sky-300', amber: 'border-amber-400/20 bg-amber-400/[0.04] text-amber-300', emerald: 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300' };
  return (
    <div className={cn('rounded-lg border p-3.5', colors[tone])}>
      <h5 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">{title}</h5>
      <ul className="space-y-1.5">{items.map((i) => <li key={i} className="text-[12px] leading-relaxed text-slate-300/90">• {i}</li>)}</ul>
    </div>
  );
}

function PhaseCard({ phase }: { phase: PhaseSpec }) {
  return (
    <div className="my-4 rounded-xl border border-white/[0.09] bg-[#0d1428]/70 p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="rounded-md bg-gradient-to-br from-indigo-500/25 to-violet-500/20 px-2 py-1 font-mono text-[10px] font-bold text-indigo-200">{phase.id}</span>
        <div>
          <h4 className="text-[14.5px] font-semibold text-white">{phase.name}</h4>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">{phase.objective}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PhaseList title="Deliverables" items={phase.deliverables} />
        <PhaseList title="Dependencies" items={phase.dependencies} />
        <PhaseList title="Completion criteria" items={phase.exit} />
      </div>
    </div>
  );
}

function PhaseList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-300/80">{title}</h5>
      <ul className="space-y-1.5">{items.map((i) => <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-300/85"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />{i}</li>)}</ul>
    </div>
  );
}

function AcceptanceList({ items }: { items: AcceptanceRow[] }) {
  return (
    <div className="my-6 space-y-2">
      {items.map((a) => (
        <div key={a.id} className="flex flex-col gap-1 rounded-lg border border-white/[0.08] bg-[#0d1428]/70 px-4 py-3 sm:flex-row sm:gap-4">
          <span className="mt-0.5 shrink-0 font-mono text-[10px] font-bold text-emerald-300 sm:w-[96px]">{a.id}</span>
          <span className="flex-1 text-[12.5px] leading-relaxed text-slate-200/90">{a.criterion}</span>
          <span className="shrink-0 text-[11.5px] leading-relaxed text-slate-500 sm:w-[210px]"><span className="mr-1 text-indigo-400">↳</span>{a.verification}</span>
        </div>
      ))}
    </div>
  );
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="doc-blocks">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'lead': return <p key={i} className="mb-7 border-l-2 border-indigo-400/70 pl-5 text-[16px] font-medium leading-[1.8] text-slate-100/95">{block.text}</p>;
          case 'p': return <p key={i} className="mb-5 text-[13.5px] leading-[1.85] text-slate-300/90">{block.text}</p>;
          case 'h3': return <h3 key={i} className="mb-4 mt-10 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-white"><span className="h-4 w-[3px] rounded-full bg-gradient-to-b from-sky-400 to-violet-500" />{block.text}</h3>;
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return <Tag key={i} className="mb-6 space-y-2.5">{block.items.map((item, j) => <li key={j} className="flex gap-3 text-[13px] leading-[1.8] text-slate-300/90">{block.ordered ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10 font-mono text-[10px] text-indigo-300">{j + 1}</span> : <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-400" />}<span>{item}</span></li>)}</Tag>;
          }
          case 'table': return <DataTable key={i} block={block} />;
          case 'callout': return <Callout key={i} block={block} />;
          case 'steps': return (
            <div key={i} className="my-6 rounded-xl border border-white/[0.09] bg-[#0d1428]/60 p-5">
              {block.title && <h4 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300"><Flag className="h-3.5 w-3.5" />{block.title}</h4>}
              <ol className="space-y-3">{block.items.map((s, j) => <li key={j} className="flex gap-3.5 text-[12.5px] leading-[1.75] text-slate-300/90"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-indigo-400/25 bg-indigo-500/10 font-mono text-[10px] font-semibold text-indigo-300">{j + 1}</span>{s}</li>)}</ol>
            </div>
          );
          case 'kv': return (
            <div key={i} className="my-6 overflow-hidden rounded-xl border border-white/[0.09]">
              {block.items.map(([k, v], j) => <div key={j} className="grid grid-cols-[130px_1fr] gap-4 border-b border-white/[0.06] bg-[#0d1428]/70 px-4 py-3 last:border-0 sm:grid-cols-[180px_1fr]"><span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-indigo-300/80">{k}</span><span className="text-[13px] leading-relaxed text-slate-200">{v}</span></div>)}
            </div>
          );
          case 'code': return (
            <div key={i} className="my-6 overflow-hidden rounded-xl border border-white/[0.09] bg-[#080e1e]">
              {block.title && <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><FlaskConical className="h-3 w-3" />{block.title}</div>}
              <pre className="overflow-x-auto px-5 py-4 font-mono text-[11.5px] leading-[1.8] text-sky-200/85">{block.text}</pre>
            </div>
          );
          case 'models': return <div key={i} className="my-6">{block.items.map((m, j) => <ModelCard key={m.id} model={m} index={j} />)}</div>;
          case 'screens': return <div key={i} className="my-6">{block.items.map((s) => <ScreenCard key={s.id} screen={s} />)}</div>;
          case 'flows': return <div key={i} className="my-6">{block.items.map((f) => <FlowCard key={f.id} flow={f} />)}</div>;
          case 'phases': return <div key={i} className="my-6">{block.items.map((p) => <PhaseCard key={p.id} phase={p} />)}</div>;
          case 'ac': return <AcceptanceList key={i} items={block.items} />;
          default: return null;
        }
      })}
    </div>
  );
}
