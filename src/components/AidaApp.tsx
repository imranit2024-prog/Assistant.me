import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines, BarChart3, Bell, BookOpen, BrainCircuit, Check, ChevronLeft, ChevronRight,
  Code2, Infinity as InfinityIcon, Layers, Maximize2, MessageSquare, Mic, Minus, PenLine,
  Search, Settings, ShieldCheck, Sparkles, Users, X, Zap,
} from 'lucide-react';
import { AIDA_MODELS, type AidaModel, type ModelIconKey } from '../data/models';
import { defaultSettings, seedConversations, uid, clock, type AidaSettings, type ChatMessage, type Conversation } from '../data/chat';
import { art } from '../data/visuals';
import { cn } from '../utils/cn';
import { ChatPanel, HistoryPanel, NotificationsPopover, SettingsPanel } from './Panels';
import DocsOverlay from './DocsOverlay';
import AvatarStage from './AvatarStage';
import { bus, type AvatarState as BusState } from '../avatar/bus';
import { speak, cancelSpeech, startListening, ttsSupported, type Listener } from '../avatar/speech';
import { generateReply } from '../avatar/brain';
import { CHARACTERS } from '../data/characters';

type AvatarState = 'idle' | 'listening' | 'processing' | 'speaking';

const ICONS: Record<ModelIconKey, typeof InfinityIcon> = {
  infinity: InfinityIcon,
  chart: BarChart3,
  code: Code2,
  layers: Layers,
  shield: ShieldCheck,
  search: Search,
  pen: PenLine,
};

const STATE_TEXT: Record<AvatarState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  processing: 'Thinking…',
  speaking: 'Speaking',
};

function Waveform({ state }: { state: AvatarState }) {
  const heights = [10, 18, 28, 16, 34, 22, 42, 30, 48, 36, 52, 40, 58, 44, 54, 38, 48, 30, 40, 22, 34, 18, 26, 14, 18];
  const active = state === 'listening' || state === 'speaking';
  return (
    <div className="relative flex h-10 items-center justify-center gap-[3px]" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full transition-all duration-500', active ? 'wave-bar' : 'bg-white/25')}
          style={{
            height: active ? h : Math.max(5, Math.round(h * 0.32)),
            background: active ? 'linear-gradient(180deg,#c4b5fd,#7c5cff)' : undefined,
            animationDelay: i * 55 + 'ms',
            boxShadow: active ? '0 0 8px rgba(167,139,250,0.7)' : undefined,
          }}
        />
      ))}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#3b82f6,#6d28d9_70%)] shadow-[0_0_24px_-4px_rgba(109,40,217,0.8)] sm:h-11 sm:w-11">
        <BrainCircuit className="h-[19px] w-[19px] text-white sm:h-[22px] sm:w-[22px]" strokeWidth={1.7} />
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30" />
      </div>
      <div className="leading-none">
        <div className="font-display text-[20px] font-bold tracking-[0.14em] text-white sm:text-[25px]">A.I.D.A</div>
        <div className="mt-1 hidden text-[8px] font-medium uppercase tracking-[0.3em] text-slate-400 sm:block sm:text-[9px]">Artificial Intelligence · Desktop Assistant</div>
      </div>
    </div>
  );
}

function RailButton({ icon: Icon, label, chip, onClick, active, title }: { icon: typeof MessageSquare; label: string; chip?: string; onClick: () => void; active?: boolean; title: string }) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        aria-label={label}
        title={title}
        className={cn('flex h-11 w-11 items-center justify-center rounded-xl border transition-all',
          active ? 'border-violet-400/50 bg-violet-500/20 text-violet-200 shadow-[0_0_18px_-6px_rgba(167,139,250,0.9)]' : 'border-white/[0.07] bg-white/[0.03] text-slate-300 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white')}
      >
        <Icon className="h-[19px] w-[19px]" strokeWidth={1.7} />
      </button>
      {chip && (
        <span className="pointer-events-none absolute left-[56px] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0b1327]/95 px-2 py-1 text-[9.5px] font-medium tracking-wide text-slate-300 shadow-xl group-hover:block">
          {chip}
        </span>
      )}
    </div>
  );
}

export default function AidaApp() {
  const [activeId, setActiveId] = useState(() => {
    try {
      const raw = localStorage.getItem('aida.settings');
      const saved = raw ? JSON.parse(raw)?.defaultModel : null;
      return AIDA_MODELS.some((m) => m.id === saved) ? saved : 'nonstop';
    } catch { return 'nonstop'; }
  });
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [online, setOnline] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AidaSettings>(() => {
    try {
      const raw = localStorage.getItem('aida.settings');
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch { return defaultSettings; }
  });
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const carousel = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, left: 0, on: false });

  const model = useMemo(() => AIDA_MODELS.find((m) => m.id === activeId) ?? AIDA_MODELS[0], [activeId]);
  const reduceMotion = !settings.animations || settings.reducedMotion;
  const [liveText, setLiveText] = useState('');
  const pendingRef = useRef<string | null>(null);
  const listenerRef = useRef<Listener | null>(null);
  const turnsRef = useRef(0);
  const modelRef = useRef(model);
  const settingsRef = useRef(settings);
  const mutedRef = useRef(muted);
  modelRef.current = model;
  settingsRef.current = settings;
  mutedRef.current = muted;

  useEffect(() => { bus.state = avatarState as BusState; }, [avatarState]);
  useEffect(() => {
    bus.animate = settings.animations;
    bus.reduceMotion = settings.reducedMotion || settings.idleLevel !== 'full';
  }, [settings.animations, settings.reducedMotion, settings.idleLevel]);
  useEffect(() => () => { cancelSpeech(); listenerRef.current?.stop(); }, []);

  const clearTimers = useCallback(() => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; }, []);
  const after = useCallback((ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    try { localStorage.setItem('aida.settings', JSON.stringify(settings)); } catch { /* storage unavailable */ }
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (k === 'h') { setHistoryOpen((v) => !v); setSettingsOpen(false); }
      if (k === 'c') { setChatOpen((v) => !v); }
      if (k === 'd') setDocsOpen((v) => !v);
      if (k === 'escape') { setChatOpen(false); setHistoryOpen(false); setSettingsOpen(false); setNotificationsOpen(false); setDocsOpen(false); }
      if (k === 'm') startVoice();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const addMessage = (msg: ChatMessage, isFirstUser?: boolean) => {
    setMessages((prev) => [...prev, msg]);
    let convId = activeConvId;
    if (!convId && msg.role === 'user') {
      convId = uid();
      setActiveConvId(convId);
      const conv: Conversation = {
        id: convId,
        title: (isFirstUser ? msg.text : 'New conversation').slice(0, 46),
        modelId: msg.modelId,
        group: 'Today',
        updated: msg.time,
        messages: [msg],
      };
      setConversations((prev) => [conv, ...prev]);
    } else if (convId) {
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, updated: msg.time, messages: [...c.messages, msg] } : c));
    }
  };

  const speakText = (mdl: AidaModel, text: string, forced = false) => {
    const s = settingsRef.current;
    const cfg = CHARACTERS[mdl.id];
    if (!forced && !s.autoPlay) { setAvatarState('idle'); bus.smileUntil = performance.now() + 1500; return; }
    if (mutedRef.current || s.volume <= 0) { setAvatarState('idle'); bus.smileUntil = performance.now() + 1500; return; }
    const supported = ttsSupported();
    if (!supported) setToast('Voice output is unavailable in this browser — showing text only.');
    const profilePitch = s.voiceProfile === 'bright' ? 1.12 : s.voiceProfile === 'calm' ? 0.92 : 1;
    setAvatarState('speaking');
    speak(text, {
      lang: s.language,
      rate: cfg.voice.rate * s.speechRate,
      volume: s.volume / 100,
      gender: cfg.voice.gender,
      pitch: cfg.voice.pitch * profilePitch,
      audible: supported,
      onEnd: () => setAvatarState('idle'),
    });
  };

  const introduce = (mdl: AidaModel = modelRef.current) => {
    if (listenerRef.current) return;
    clearTimers();
    cancelSpeech();
    const text = CHARACTERS[mdl.id].intro;
    addMessage({ id: uid(), role: 'assistant', modelId: mdl.id, text, time: clock() });
    speakText(mdl, text, true);
  };

  const respond = (mdl: AidaModel, userText: string) => {
    setAvatarState('processing');
    after(650 + Math.min(900, userText.length * 12), () => {
      const reply = generateReply(mdl, userText, turnsRef.current++, pendingRef.current);
      pendingRef.current = reply.suggest ?? null;
      addMessage({ id: uid(), role: 'assistant', modelId: mdl.id, text: reply.text, time: clock() });
      if (settingsRef.current.chatBehaviour !== 'closed') setChatOpen(true);
      speakText(mdl, reply.text);
      if (reply.switchTo) {
        const target = reply.switchTo;
        after(2200, () => switchModel(target, true));
      }
    });
  };

  const sendMessage = (text: string) => {
    clearTimers();
    cancelSpeech();
    addMessage({ id: uid(), role: 'user', modelId: modelRef.current.id, text, time: clock() }, true);
    respond(modelRef.current, text);
  };

  const startVoice = async () => {
    if (listenerRef.current) { listenerRef.current.stop(); return; }
    if (avatarState === 'speaking' || avatarState === 'processing') {
      clearTimers(); cancelSpeech(); setAvatarState('idle'); return;
    }
    if (!online) { setToast('You appear to be offline. Voice services are unavailable.'); return; }
    clearTimers();
    cancelSpeech();
    setLiveText('');
    setAvatarState('listening');
    const mdl = modelRef.current;
    let finished = false;
    const listener = await startListening(settingsRef.current.language, {
      onInterim: (t) => setLiveText(t),
      onFinal: (text) => {
        finished = true;
        listenerRef.current = null;
        setLiveText('');
        addMessage({ id: uid(), role: 'user', modelId: mdl.id, text, time: clock() }, true);
        respond(mdl, text);
      },
      onEnd: (reason) => {
        finished = true;
        listenerRef.current = null;
        if (reason === 'final') return;
        setLiveText('');
        setAvatarState('idle');
        const messages: Record<string, string> = {
          denied: 'Microphone access is blocked. Allow it in your browser settings, or chat by text.',
          unavailable: 'No microphone was found. You can still chat by text.',
          unsupported: "Speech recognition isn't available in this browser — please type your message.",
          silence: "I didn't catch that. Try again or type your message.",
          error: 'Voice input failed. Please try again or type your message.',
          stopped: '',
        };
        if (messages[reason]) setToast(messages[reason]);
        if (reason === 'denied' || reason === 'unavailable' || reason === 'unsupported') setChatOpen(true);
      },
    });
    if (!finished) listenerRef.current = listener;
  };

  const switchModel = (id: string, announce = false) => {
    if (id === activeId) { setChatOpen(true); return; }
    clearTimers();
    cancelSpeech();
    listenerRef.current?.stop();
    listenerRef.current = null;
    pendingRef.current = null;
    setAvatarState('processing');
    setActiveId(id);
    after(900, () => {
      setAvatarState('idle');
      const next = AIDA_MODELS.find((m) => m.id === id);
      if (announce && next) introduce(next);
    });
  };

  const restoreConversation = (c: Conversation) => {
    clearTimers();
    setMessages(c.messages);
    setActiveConvId(c.id);
    setActiveId(c.modelId);
    setAvatarState('idle');
    setHistoryOpen(false);
    setChatOpen(true);
    setToast(`Restored “${c.title}”`);
  };

  const newConversation = () => {
    clearTimers();
    setMessages([]);
    setActiveConvId(null);
    setAvatarState('idle');
    setHistoryOpen(false);
    setChatOpen(true);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) { setMessages([]); setActiveConvId(null); }
    setToast('Conversation deleted.');
  };

  const scrollCarousel = (dir: number) => carousel.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });

  return (
    <>
    <div className={cn('app-shell relative min-h-[100svh] overflow-x-hidden bg-[#04091a] font-sans text-slate-200', settings.theme === 'light' && 'theme-light')}>
      {/* ambient stage background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src={art.bg} alt="" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(76,29,149,0.28),transparent_62%),linear-gradient(180deg,rgba(4,9,26,0.55),rgba(4,9,26,0.94))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_50%_45%,black,transparent_78%)]" />
        <div className="absolute left-1/2 top-[44%] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/20 blur-[110px]" />
      </div>

      <div className="relative z-10 flex min-h-[100svh] flex-col lg:h-[100svh]">
        {/* ------------------------------- header ------------------------------- */}
        <header className="flex h-[70px] shrink-0 items-center justify-between px-4 sm:h-[76px] sm:px-7">
          <div className="flex items-center gap-4">
            <Brand />
            <button onClick={() => setDocsOpen(true)} className="ml-1 hidden items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 text-[9.5px] font-medium tracking-wide text-slate-400 transition hover:border-violet-400/40 hover:text-violet-200 xl:flex">
              <BookOpen className="h-3 w-3" />FRD v1.0
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button onClick={() => { setOnline((v) => !v); setToast(online ? 'Offline mode — local history remains available.' : 'Back online. All services reachable.'); }} title="Connection status"
              className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9.5px] font-bold tracking-[0.14em] transition',
                online ? 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300' : 'border-rose-400/30 bg-rose-400/[0.08] text-rose-300')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]' : 'bg-rose-400')} />
              {online ? 'ONLINE' : 'OFFLINE'}
            </button>
            <div className="relative">
              <button onClick={() => setNotificationsOpen((v) => !v)} aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-300 transition hover:border-violet-400/40 hover:text-white">
                <Bell className="h-[17px] w-[17px]" strokeWidth={1.7} />
                {online && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]" />}
              </button>
            </div>
            <button onClick={() => { setSettingsOpen(true); setHistoryOpen(false); }} aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-300 transition hover:border-violet-400/40 hover:text-white">
              <Settings className="h-[17px] w-[17px]" strokeWidth={1.7} />
            </button>
            <div className="ml-1 hidden items-center gap-1 sm:flex">
              <button aria-label="Minimise window" title="Minimise (desktop shell)" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/[0.06] hover:text-white"><Minus className="h-4 w-4" /></button>
              <button aria-label="Maximise window" title="Maximise (desktop shell)" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/[0.06] hover:text-white"><Maximize2 className="h-3.5 w-3.5" /></button>
              <button aria-label="Close window" title="Close (concept shell)" onClick={() => setToast('This is a concept desktop shell — the window stays open.')} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-200"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        {/* -------------------------------- stage -------------------------------- */}
        <main className="relative flex min-h-0 flex-1 flex-col px-3 lg:px-5">
          <div className="relative flex min-h-0 flex-1 lg:px-[64px]">
            {/* left rail */}
            <div className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
              <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#0a1124]/70 p-1.5 backdrop-blur-xl">
                <RailButton icon={MessageSquare} label="Open chat history" title="Chat history (H)" chip="History (H)" onClick={() => { setHistoryOpen((v) => !v); setChatOpen(false); }} active={historyOpen} />
                <RailButton icon={BookOpen} label="Open requirements document" title="Functional Requirements Document (D)" onClick={() => setDocsOpen(true)} />
                <RailButton icon={ChevronRight} label="Expand tools" title="More tools" onClick={() => setDocsOpen(true)} />
              </div>
            </div>

            {/* right rail */}
            <div className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
              <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#0a1124]/70 p-1.5 backdrop-blur-xl">
                <RailButton icon={MessageSquare} label="Open chat" title="Text chat (C)" onClick={() => setChatOpen((v) => !v)} active={chatOpen} />
                <RailButton icon={Layers} label="Open specification" title="Functional Requirements Document (D)" onClick={() => setDocsOpen(true)} />
                <RailButton icon={ChevronLeft} label="Collapse panel" title="Collapse panel" onClick={() => { setChatOpen(false); setHistoryOpen(false); }} />
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,0.95fr)_minmax(320px,1.18fr)_minmax(260px,0.98fr)] lg:items-center lg:gap-2">
              {/* welcome */}
              <section className="order-1 flex flex-col items-start pt-2 lg:pt-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-500/[0.09] px-3 py-1.5 text-[9px] font-semibold tracking-[0.16em] text-violet-200 sm:text-[9.5px]">
                  <Sparkles className="h-3 w-3" />WELCOME TO A.I.D.A
                </div>
                <h1 className="font-display text-[38px] font-semibold leading-[1.04] tracking-[-0.02em] text-white sm:text-[46px] xl:text-[52px]">
                  I&apos;m <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">A.I.D.A</span>
                </h1>
                <p className="mt-2 font-display text-[23px] font-semibold leading-tight tracking-[-0.01em] text-white sm:text-[26px] xl:text-[29px]">Your Virtual AI Team.</p>
                <p className="mt-4 max-w-[330px] text-[12.5px] leading-[1.8] text-slate-300/85 sm:text-[13px]">
                  A unified AI platform with specialized experts to help you plan, build, analyze, create and protect — all in one place.
                </p>
                <div className="mt-5 h-[2px] w-16 rounded-full bg-gradient-to-r from-violet-400 to-transparent" />
                <div className="mt-5 flex items-center gap-2 text-[9.5px] tracking-wide text-slate-500">
                  <span className={cn('h-1.5 w-1.5 rounded-full', avatarState === 'idle' ? 'bg-emerald-400' : 'bg-violet-400')} />
                  {model.name} · {STATE_TEXT[avatarState]}
                </div>
              </section>

              {/* avatar stage */}
              <section className="order-2 flex min-h-0 flex-col items-center justify-end">
                <div className="relative flex w-full items-end justify-center" style={{ height: 'clamp(250px, calc(100svh - 500px), 460px)' }}>
                  {/* rings */}
                  <div className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', !reduceMotion && 'ring-spin-slow')}>
                    <div className="h-[92%] aspect-square rounded-full border border-violet-400/15" />
                    <div className="absolute h-[76%] aspect-square rounded-full border border-violet-300/10" />
                    <div className="absolute h-[99%] aspect-square rounded-full border border-dashed border-violet-400/20" />
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-2xl" />
                  {/* floor */}
                  <div className="pointer-events-none absolute bottom-[-6px] left-1/2 h-[80px] w-[118%] max-w-[560px] -translate-x-1/2">
                    <div className="absolute inset-0 rounded-[50%] border border-violet-400/25 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.28),transparent_65%)] blur-[1px]" />
                    <div className="absolute left-1/2 top-1/2 h-[58%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-300/20" />
                    <div className="absolute left-1/2 top-1/2 h-[34%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-300/25 bg-violet-500/10" />
                  </div>
                  <div className="absolute inset-0 z-10"><AvatarStage modelId={model.id} label={model.name} fallbackImage={model.image} onPoke={() => { if (avatarState === 'idle') introduce(); }} /></div>
                  {avatarState === 'listening' && (
                    <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 max-w-[92%] truncate rounded-full border border-violet-400/40 bg-[#0a1224]/90 px-3 py-1 text-[9.5px] font-semibold tracking-[0.12em] text-violet-200 backdrop-blur">{liveText ? `“${liveText}”` : 'LISTENING…'}</div>
                  )}
                </div>

                <Waveform state={avatarState} />

                {/* controls */}
                <div className="relative z-20 -mt-1 flex items-center gap-3 sm:gap-4">
                  <button onClick={() => setChatOpen(true)} aria-label="Open text chat" title="Open text chat (C)"
                    className="group flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] text-slate-200 shadow-lg backdrop-blur-md transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white sm:h-[58px] sm:w-[58px]">
                    <MessageSquare className="h-5 w-5" strokeWidth={1.7} />
                  </button>
                  <button onClick={startVoice} aria-label={avatarState === 'idle' ? 'Start voice conversation' : 'Stop voice'} title="Talk to A.I.D.A (M)"
                    className={cn('group relative flex h-[74px] w-[74px] items-center justify-center rounded-full border text-white shadow-[0_0_45px_-8px_rgba(139,92,246,0.9)] transition-all sm:h-[84px] sm:w-[84px]',
                      avatarState === 'idle' && 'border-violet-300/40 bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-600 hover:brightness-110',
                      avatarState === 'listening' && 'mic-listening border-fuchsia-300/60 bg-gradient-to-br from-fuchsia-500 to-violet-600',
                      avatarState === 'processing' && 'border-violet-300/40 bg-gradient-to-br from-indigo-500 to-violet-700',
                      avatarState === 'speaking' && 'border-violet-300/50 bg-gradient-to-br from-violet-500 to-fuchsia-600 avatar-speak')}>
                    <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
                    <span className="absolute -inset-1.5 rounded-full border border-violet-400/20" />
                    <Mic className="relative h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.7} />
                    {avatarState === 'processing' && <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white/70" />}
                  </button>
                  <button onClick={() => { if (avatarState === 'speaking') { clearTimers(); cancelSpeech(); setAvatarState('idle'); } else if (avatarState === 'idle') { introduce(); } }} aria-label="Hear an introduction" title="Hear me introduce myself"
                    className="group flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] text-slate-200 shadow-lg backdrop-blur-md transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white sm:h-[58px] sm:w-[58px]">
                    <AudioLines className="h-5 w-5" strokeWidth={1.7} />
                  </button>
                </div>

                <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 pb-1 text-center text-[11px] text-slate-400">
                  <span className="hidden sm:inline">Click the mic to talk with me</span>
                  <span className="sm:hidden">Tap the mic to talk</span>
                  <span className="mx-0.5 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] text-slate-400">or</span>
                  <button onClick={() => setChatOpen(true)} className="text-[11px] font-medium text-slate-200 transition hover:text-violet-300">open text chat</button>
                </p>
              </section>

              {/* overview card */}
              <section className="order-3 flex justify-center lg:justify-end">
                <aside key={model.id} className="fade-in relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-violet-400/25 bg-[linear-gradient(155deg,rgba(37,30,74,0.85),rgba(10,18,38,0.92))] p-5 shadow-[0_25px_70px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/15 blur-2xl" />
                  <div className="relative flex flex-wrap items-center gap-2.5">
                    <Zap className="h-5 w-5 shrink-0 text-violet-300" strokeWidth={2} />
                    <h2 className="text-[18px] font-bold tracking-[0.1em] text-white">{model.name}</h2>
                    <span className="ml-auto rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-0.5 text-[8.5px] font-bold tracking-[0.14em] text-violet-200">{model.tag}</span>
                  </div>
                  <div className="relative mt-1 text-[13px] text-slate-300">{model.role}</div>
                  <div className="relative my-3.5 h-px bg-gradient-to-r from-white/15 to-transparent" />
                  <p className="relative text-[12.5px] leading-[1.75] text-slate-300/90">{model.desc}</p>
                  <div className="relative my-3.5 h-px bg-gradient-to-r from-white/15 to-transparent" />
                  <ul className="relative space-y-2.5">
                    {model.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[12px] leading-snug text-slate-200/95">
                        <span className="mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_10px_-2px_rgba(139,92,246,0.9)]">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
                    <button onClick={() => setChatOpen(true)} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-violet-300 transition hover:text-violet-200">Talk to {model.name}<ChevronRight className="h-3 w-3" /></button>
                    <span className="flex items-center gap-1.5 text-[9px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />READY</span>
                  </div>
                </aside>
              </section>
            </div>
          </div>

          {/* ------------------------------- carousel ------------------------------ */}
          <section className="relative z-10 mt-2 shrink-0 pb-3">
            <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
              <div className="flex items-start gap-2.5">
                <Users className="mt-1 h-[18px] w-[18px] shrink-0 text-slate-300" strokeWidth={1.7} />
                <div>
                  <h2 className="font-display text-[17px] font-semibold leading-tight text-white sm:text-[19px]">Meet Your AI Specialists</h2>
                  <p className="mt-0.5 text-[10.5px] text-slate-400">Slide to explore and choose the right expert for your task</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => scrollCarousel(-1)} aria-label="Previous specialists" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-slate-300 transition hover:border-violet-400/50 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => scrollCarousel(1)} aria-label="Next specialists" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-slate-300 transition hover:border-violet-400/50 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div
              ref={carousel}
              className="carousel-row flex cursor-grab gap-2 overflow-x-auto px-1 pb-1 active:cursor-grabbing"
              onPointerDown={(e) => { drag.current = { x: e.clientX, left: carousel.current?.scrollLeft ?? 0, on: true }; }}
              onPointerMove={(e) => { if (drag.current.on && carousel.current) carousel.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x); }}
              onPointerUp={() => { drag.current.on = false; }}
              onPointerLeave={() => { drag.current.on = false; }}
            >
              {AIDA_MODELS.map((m) => {
                const Icon = ICONS[m.icon];
                const active = m.id === activeId;
                return (
                  <button
                    key={m.id}
                    onClick={() => switchModel(m.id)}
                    aria-pressed={active}
                    className={cn('specialist-card group relative h-[142px] min-w-[146px] flex-1 snap-start overflow-hidden rounded-xl border text-left transition-all duration-300 sm:h-[152px]',
                      active ? 'border-violet-400/70 bg-violet-500/[0.1] shadow-[0_0_34px_-10px_rgba(139,92,246,0.95)]' : 'border-white/[0.08] bg-white/[0.025] hover:border-violet-400/35 hover:bg-violet-500/[0.05]')}
                  >
                    <img src={m.image} alt="" aria-hidden className={cn('absolute inset-0 h-full w-full object-cover object-top transition-all duration-500', active ? 'opacity-100' : 'opacity-[0.92] group-hover:opacity-100 group-hover:scale-[1.02]')} style={{ maskImage: 'linear-gradient(to bottom, #000 52%, rgba(0,0,0,0.35) 78%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 52%, rgba(0,0,0,0.35) 78%, transparent 100%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070d1d] via-[#070d1d]/20 to-transparent" />
                    {active && (
                      <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 shadow-[0_0_12px_rgba(139,92,246,0.9)]">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: active ? '#c4b5fd' : m.accent }} strokeWidth={2} />
                        <span className="truncate text-[11.5px] font-bold tracking-[0.06em] text-white">{m.name === 'NON-STOP' ? 'Non-stop' : m.name.charAt(0) + m.name.slice(1).toLowerCase()}</span>
                      </div>
                      <div className="mt-0.5 line-clamp-2 min-h-[22px] text-[9.5px] leading-[1.35] text-slate-400">{m.cardRole}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5">
              {AIDA_MODELS.map((m) => (
                <button key={m.id} onClick={() => switchModel(m.id)} aria-label={`Select ${m.name}`} className={cn('h-1.5 rounded-full transition-all', m.id === activeId ? 'w-6 bg-gradient-to-r from-violet-400 to-indigo-400' : 'w-1.5 bg-white/20 hover:bg-white/40')} />
              ))}
            </div>
          </section>
        </main>
      </div>
      </div>

      {/* ------------------------------- overlays ------------------------------- */}
      {chatOpen && (
        <ChatPanel
          model={model}
          messages={messages}
          state={avatarState}
          onSend={sendMessage}
          onVoice={startVoice}
          onClose={() => setChatOpen(false)}
          muted={muted}
          onToggleMute={() => setMuted((v) => !v)}
        />
      )}
      {historyOpen && (
        <HistoryPanel
          conversations={conversations}
          activeModel={model}
          onSelect={restoreConversation}
          onNew={newConversation}
          onRename={(id, title) => setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title: title.trim() || c.title } : c))}
          onDelete={deleteConversation}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {settingsOpen && <SettingsPanel settings={settings} model={model} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} onClose={() => setSettingsOpen(false)} />}
      {notificationsOpen && <NotificationsPopover onClose={() => setNotificationsOpen(false)} onOpenSettings={() => setSettingsOpen(true)} />}
      {docsOpen && <DocsOverlay onClose={() => setDocsOpen(false)} />}

      {(chatOpen || historyOpen) && <div className="pointer-events-none fixed inset-0 z-[60] hidden bg-black/10 lg:block" />}
      {toast && (
        <div className="toast-in fixed bottom-24 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-violet-400/30 bg-[#0b1327]/95 px-4 py-2.5 text-[11.5px] text-slate-200 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />{toast}
        </div>
      )}
    </>
  );
}
