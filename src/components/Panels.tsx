import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Bell, Check, ChevronRight, History, Mic, MicOff, Pencil, Plus, RotateCcw,
  Search, Send, Settings2, ShieldCheck, Trash2, Volume2, X,
} from 'lucide-react';
import { AIDA_MODELS, type AidaModel } from '../data/models';
import type { AidaSettings, ChatMessage, Conversation } from '../data/chat';
import { defaultSettings } from '../data/chat';
import { cn } from '../utils/cn';

/* ---------------------------------- Chat ---------------------------------- */

export function ChatPanel({
  model, messages, state, onSend, onVoice, onClose, muted, onToggleMute,
}: {
  model: AidaModel;
  messages: ChatMessage[];
  state: 'idle' | 'listening' | 'processing' | 'speaking';
  onSend: (text: string) => void;
  onVoice: () => void;
  onClose: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, state]);

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
    inputRef.current?.focus();
  };

  return (
    <aside className="panel-in fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-[420px] flex-col border-l border-white/10 bg-[#070d1d]/97 shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:bottom-3 sm:right-3 sm:top-3 sm:rounded-2xl sm:border">
      <header className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#101a33]">
          <img src={model.image} alt="" className="h-full w-full object-cover object-top" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold tracking-[0.1em] text-white">{model.name}</span>
            <span className={cn('h-1.5 w-1.5 rounded-full', state === 'idle' ? 'bg-emerald-400' : 'animate-pulse bg-violet-400')} />
          </div>
          <div className="truncate text-[10.5px] text-slate-400">{model.role} · <span className="text-slate-500">{state === 'idle' ? 'Ready' : state === 'listening' ? 'Listening' : state === 'processing' ? 'Processing' : 'Speaking'}</span></div>
        </div>
        <button onClick={onClose} aria-label="Close conversation" className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </header>

      <div className="panel-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-[13px] leading-relaxed text-slate-300">{model.desc}</p>
            <div className="mt-5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Try asking</div>
            <div className="mt-2 space-y-2">
              {model.quickPrompts.map((p) => (
                <button key={p} onClick={() => onSend(p)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left text-[12px] text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10">
                  {p}<ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const mm = AIDA_MODELS.find((x) => x.id === m.modelId) ?? model;
          return (
          <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            {m.role === 'assistant' && (
              <div className="mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/15"><img src={mm.image} alt="" className="h-full w-full object-cover object-top" /></div>
            )}
            <div className={cn('max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-[1.7]', m.role === 'user' ? 'rounded-br-md bg-gradient-to-br from-violet-600/80 to-indigo-600/80 text-white' : 'rounded-bl-md border border-white/[0.08] bg-white/[0.045] text-slate-200')}>
              {m.role === 'assistant' && <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-300">{mm.name}</div>}
              {m.text}
              <div className={cn('mt-1.5 text-[9px]', m.role === 'user' ? 'text-white/60' : 'text-slate-500')}>{m.time}</div>
            </div>
          </div>
          );
        })}
        {state === 'processing' && (
          <div className="flex gap-2.5">
            <div className="mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/15"><img src={model.image} alt="" className="h-full w-full object-cover object-top" /></div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-3.5 py-3">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" style={{ animationDelay: i * 140 + 'ms' }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/[0.08] p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/[0.1] bg-white/[0.035] p-2 focus-within:border-violet-400/50">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={2}
            placeholder={`Message ${model.name}…`}
            className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-1 text-[12.5px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-600"
          />
          <button onClick={submit} disabled={!draft.trim()} aria-label="Send message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white transition disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button onClick={onVoice} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] text-slate-400 transition hover:text-violet-300"><Mic className="h-3 w-3" />Voice</button>
            <button onClick={onToggleMute} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] text-slate-400 transition hover:text-violet-300">{muted ? <MicOff className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}{muted ? 'Muted' : 'Sound on'}</button>
          </div>
          <span className="text-[9.5px] text-slate-600">Enter to send · Shift+Enter for a new line</span>
        </div>
      </div>
    </aside>
  );
}

/* --------------------------------- History -------------------------------- */

export function HistoryPanel({
  conversations, activeModel, onSelect, onNew, onRename, onDelete, onClose,
}: {
  conversations: Conversation[];
  activeModel: AidaModel;
  onSelect: (c: Conversation) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q)));
  }, [conversations, query]);

  const groups = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
  const groupTone = ['#a78bfa', '#818cf8', '#38bdf8', '#94a3b8'];

  return (
    <aside className="panel-in-left fixed bottom-0 left-0 top-0 z-[70] flex w-full max-w-[340px] flex-col border-r border-white/10 bg-[#070d1d]/97 shadow-[30px_0_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:bottom-3 sm:left-3 sm:top-3 sm:rounded-2xl sm:border">
      <header className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white"><History className="h-4 w-4 text-violet-300" />Chat history</div>
        <div className="flex items-center gap-1.5">
          <button onClick={onNew} className="flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-1.5 text-[10.5px] font-semibold text-violet-200 transition hover:bg-violet-500/25"><Plus className="h-3 w-3" />New</button>
          <button onClick={onClose} aria-label="Close history" className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 py-2">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations…" className="w-full bg-transparent text-[11.5px] text-slate-200 outline-none placeholder:text-slate-600" />
          {query && <button onClick={() => setQuery('')}><X className="h-3 w-3 text-slate-500" /></button>}
        </div>
      </div>
      <div className="panel-scroll flex-1 overflow-y-auto px-2.5 py-3">
        {filtered.length === 0 && <div className="px-3 py-10 text-center"><div className="text-[12px] text-slate-400">No conversations found</div><div className="mt-1 text-[11px] text-slate-600">Try another search or start a new conversation.</div></div>}
        {groups.map((group, gi) => {
          const items = filtered.filter((c) => c.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="mb-4">
              <div className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">{group}</div>
              <div className="space-y-1">
                {items.map((c) => {
                  const m = c.modelId;
                  const label = m === 'nonstop' ? 'NON-STOP' : m.toUpperCase();
                  const isEditing = editing === c.id;
                  return (
                    <div key={c.id} className="group relative rounded-xl border border-transparent transition hover:border-white/[0.09] hover:bg-white/[0.035]">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 p-2">
                          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onRename(c.id, title); setEditing(null); } if (e.key === 'Escape') setEditing(null); }} className="w-full rounded border border-violet-400/40 bg-[#0b1428] px-2 py-1 text-[11.5px] text-white outline-none" />
                          <button onClick={() => { onRename(c.id, title); setEditing(null); }} className="text-emerald-300"><Check className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => onSelect(c)} className="w-full px-2.5 py-2.5 text-left">
                          <div className="truncate pr-12 text-[11.5px] font-medium text-slate-200">{c.title}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded px-1.5 py-0.5 text-[8.5px] font-bold tracking-wide" style={{ background: '#8b5cf615', color: ['executive', 'architect', 'security', 'writer', 'coder', 'researcher'].includes(m) ? '#c4b5fd' : '#a5b4fc' }}>{label}</span>
                            <span className="text-[9px] text-slate-500">{c.updated}</span>
                            <span className="truncate text-[9px] text-slate-600">· {c.messages.length} messages</span>
                          </div>
                        </button>
                      )}
                      {!isEditing && (
                        <div className="absolute right-1.5 top-2 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <button onClick={() => { setEditing(c.id); setTitle(c.title); }} aria-label="Rename conversation" className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => onDelete(c.id)} aria-label="Delete conversation" className="rounded p-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 h-px bg-white/[0.04]" style={{ background: 'linear-gradient(90deg,' + groupTone[gi] + '33, transparent)' }} />
            </div>
          );
        })}
      </div>
      <footer className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3 text-[9.5px] text-slate-500">
        <span><Archive className="mr-1 inline h-3 w-3" />Stored locally · auto-saved</span>
        <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="h-3 w-3" />Private</span>
      </footer>
      <div className="px-4 pb-3 text-[9.5px] text-slate-600">Active now: <span style={{ color: activeModel.accent }}>{activeModel.name}</span></div>
    </aside>
  );
}

/* -------------------------------- Settings -------------------------------- */

const TABS = ['General', 'Avatar', 'Voice', 'Interaction', 'Appearance', 'Privacy'] as const;
type Tab = typeof TABS[number];

export function SettingsPanel({ settings, model, onChange, onClose }: { settings: AidaSettings; model: AidaModel; onChange: (patch: Partial<AidaSettings>) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('General');

  const Toggle = ({ label, hint, value, onToggle }: { label: string; hint?: string; value: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 border-b border-white/[0.05] py-3 text-left last:border-0">
      <span><span className="block text-[12px] text-slate-200">{label}</span>{hint && <span className="mt-0.5 block text-[10.5px] text-slate-500">{hint}</span>}</span>
      <span className={cn('relative h-5 w-9 shrink-0 rounded-full border transition', value ? 'border-violet-400/60 bg-violet-500/70' : 'border-white/15 bg-white/[0.07]')}>
        <span className={cn('absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all', value ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );

  const Select = <T extends string>({ label, hint, value, options, onSelect }: { label: string; hint?: string; value: T; options: { value: T; label: string }[]; onSelect: (v: T) => void }) => (
    <div className="border-b border-white/[0.05] py-3 last:border-0">
      <div className="mb-1.5 text-[12px] text-slate-200">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.value} onClick={() => onSelect(o.value)} className={cn('rounded-lg border px-2.5 py-1.5 text-[10.5px] transition', value === o.value ? 'border-violet-400/50 bg-violet-500/20 font-semibold text-violet-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200')}>{o.label}</button>
        ))}
      </div>
      {hint && <div className="mt-1 text-[10px] text-slate-500">{hint}</div>}
    </div>
  );

  const Slider = ({ label, value, min, max, step, suffix, onSet }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onSet: (v: number) => void }) => (
    <div className="border-b border-white/[0.05] py-3">
      <div className="mb-1.5 flex items-center justify-between text-[12px] text-slate-200"><span>{label}</span><span className="font-mono text-[10.5px] text-violet-300">{value}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onSet(Number(e.target.value))} className="aida-range w-full" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-0 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div className="modal-in flex h-full w-full max-w-[820px] flex-col overflow-hidden border border-white/10 bg-[#080f20] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] sm:h-[min(680px,90vh)] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
          <div className="flex items-center gap-2.5"><Settings2 className="h-4 w-4 text-violet-300" /><span className="text-[13px] font-semibold text-white">Settings</span><span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-500">Saved automatically</span></div>
          <button onClick={onClose} aria-label="Close settings" className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex min-h-0 flex-1">
          <nav className="hidden w-[170px] shrink-0 border-r border-white/[0.07] p-2 sm:block">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn('mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11.5px] transition', tab === t ? 'bg-violet-500/15 font-semibold text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200')}>{t}{tab === t && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}</button>
            ))}
            <button onClick={() => onChange(defaultSettings)} className="mt-3 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-[10.5px] text-slate-500 hover:text-slate-300"><RotateCcw className="h-3 w-3" />Reset defaults</button>
          </nav>
          <div className="panel-scroll min-w-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 flex gap-1.5 overflow-x-auto sm:hidden">
              {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn('shrink-0 rounded-lg px-2.5 py-1.5 text-[10.5px]', tab === t ? 'bg-violet-500/20 font-semibold text-violet-100' : 'bg-white/[0.04] text-slate-400')}>{t}</button>)}
            </div>
            {tab === 'General' && (
              <div>
                <Select label="Default launch mode" value={settings.defaultModel} options={['nonstop', 'executive', 'coder', 'architect', 'security', 'researcher', 'writer'].map((v) => ({ value: v, label: v === 'nonstop' ? 'NON-STOP' : v.toUpperCase() }))} onSelect={(v) => onChange({ defaultModel: v })} hint="NON-STOP is the recommended default coordinator." />
                <Select label="Application language" value={settings.language} options={[{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }, { value: 'hi', label: 'हिन्दी' }] as { value: AidaSettings['language']; label: string }[]} onSelect={(v) => onChange({ language: v })} hint="Applied to both speech recognition and speech output." />
                <Toggle label="Notifications" hint="Session restored, mode switched, service status." value={settings.notifications} onToggle={() => onChange({ notifications: !settings.notifications })} />
              </div>
            )}
            {tab === 'Avatar' && (
              <div>
                <Toggle label="Avatar animation" hint="Idle, listening, processing and speaking states." value={settings.animations} onToggle={() => onChange({ animations: !settings.animations })} />
                <Select label="Idle animation" value={settings.idleLevel} options={[{ value: 'full', label: 'Full' }, { value: 'reduced', label: 'Reduced' }, { value: 'minimal', label: 'Minimal' }] as { value: AidaSettings['idleLevel']; label: string }[]} onSelect={(v) => onChange({ idleLevel: v })} />
                <Select label="Animation quality" value={settings.quality} options={[{ value: 'auto', label: 'Auto' }, { value: 'high', label: 'High' }, { value: 'balanced', label: 'Balanced' }, { value: 'low', label: 'Low' }] as { value: AidaSettings['quality']; label: string }[]} onSelect={(v) => onChange({ quality: v })} hint="Auto adapts to the detected graphics tier." />
              </div>
            )}
            {tab === 'Voice' && (
              <div>
                <Select label="Voice profile" value={settings.voiceProfile} options={[{ value: 'model', label: `${model.name} default` }, { value: 'warm', label: 'Warm' }, { value: 'calm', label: 'Calm' }, { value: 'bright', label: 'Bright' }] as { value: AidaSettings['voiceProfile']; label: string }[]} onSelect={(v) => onChange({ voiceProfile: v })} />
                <Slider label="Speech speed" value={settings.speechRate} min={0.75} max={1.5} step={0.05} suffix="×" onSet={(v) => onChange({ speechRate: v })} />
                <Slider label="Volume" value={settings.volume} min={0} max={100} step={5} suffix="%" onSet={(v) => onChange({ volume: v })} />
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 text-[10.5px] text-emerald-300"><Mic className="h-3.5 w-3.5" />Microphone access requested only when you start a voice turn.</div>
              </div>
            )}
            {tab === 'Interaction' && (
              <div>
                <Select label="Default interaction mode" value={settings.interaction} options={[{ value: 'last', label: 'Last used' }, { value: 'voice', label: 'Voice first' }, { value: 'text', label: 'Text first' }] as { value: AidaSettings['interaction']; label: string }[]} onSelect={(v) => onChange({ interaction: v })} />
                <Toggle label="Automatic audio playback" hint="Speak responses aloud with lip-sync when a voice turn is active." value={settings.autoPlay} onToggle={() => onChange({ autoPlay: !settings.autoPlay })} />
                <Select label="Chat panel behaviour" value={settings.chatBehaviour} options={[{ value: 'remember', label: 'Remember last state' }, { value: 'open', label: 'Open on response' }, { value: 'closed', label: 'Stay closed' }] as { value: AidaSettings['chatBehaviour']; label: string }[]} onSelect={(v) => onChange({ chatBehaviour: v })} />
              </div>
            )}
            {tab === 'Appearance' && (
              <div>
                <Select label="Theme" value={settings.theme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light (future)' }] as { value: AidaSettings['theme']; label: string }[]} onSelect={(v) => onChange({ theme: v })} hint="Premium dark theme is the MVP design." />
                <Toggle label="Reduced motion" hint="Lower idle amplitude and remove ambient particle motion." value={settings.reducedMotion} onToggle={() => onChange({ reducedMotion: !settings.reducedMotion })} />
                <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="mb-2 text-[11.5px] text-slate-200">Accent preview</div>
                  <div className="flex gap-2">{['#a78bfa', '#818cf8', '#38bdf8', '#2dd4bf'].map((c) => <span key={c} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} />)}</div>
                </div>
              </div>
            )}
            {tab === 'Privacy' && (
              <div>
                <Select label="Conversation storage" value={settings.storage} options={[{ value: 'local', label: 'Store locally' }, { value: 'none', label: 'Do not retain' }] as { value: AidaSettings['storage']; label: string }[]} onSelect={(v) => onChange({ storage: v })} hint="Local-first storage. Cloud sync is not part of the MVP." />
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] text-slate-300"><span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Microphone permission</span><span className="text-[10px] text-amber-300">Ask on first use</span></div>
                  <button onClick={() => onChange(defaultSettings)} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-[11px] text-slate-400 hover:bg-white/[0.04]">Export data (JSON) <span className="text-slate-600">· TBC in build</span></button>
                  <button className="w-full rounded-lg border border-rose-400/20 px-3 py-2 text-left text-[11px] text-rose-300/90 hover:bg-rose-500/10">Delete all conversations</button>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Content is kept out of diagnostic logs. Error records use correlation IDs only. Retention and encryption-at-rest policy is TBC.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Notifications ----------------------------- */

export function NotificationsPopover({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const items = [
    { icon: Check, tone: 'text-emerald-300', title: 'Session restored', text: 'Your previous conversation is exactly where you left it.', time: 'Just now' },
    { icon: Bell, tone: 'text-violet-300', title: 'NON-STOP online', text: 'All seven specialists are available for routing.', time: '2 min ago' },
    { icon: ShieldCheck, tone: 'text-sky-300', title: 'Microphone on demand', text: 'Access is requested only when you start a voice turn.', time: '1 h ago' },
  ];
  return (
    <div className="panel-in fixed right-3 top-[70px] z-[75] w-[310px] overflow-hidden rounded-xl border border-white/10 bg-[#0a1224]/98 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><span className="flex items-center gap-2 text-[12px] font-semibold text-white"><Bell className="h-3.5 w-3.5 text-violet-300" />Notifications</span><button onClick={onClose}><X className="h-3.5 w-3.5 text-slate-500" /></button></div>
      <div className="max-h-[320px] overflow-y-auto">
        {items.map((i) => (
          <div key={i.title} className="flex gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0">
            <i.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', i.tone)} />
            <div><div className="text-[11.5px] font-medium text-slate-100">{i.title}</div><div className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">{i.text}</div><div className="mt-1 text-[9px] text-slate-600">{i.time}</div></div>
          </div>
        ))}
      </div>
      <button onClick={() => { onOpenSettings(); onClose(); }} className="w-full border-t border-white/[0.07] px-4 py-2.5 text-left text-[10.5px] text-violet-300 hover:bg-white/[0.04]">Notification settings →</button>
    </div>
  );
}
