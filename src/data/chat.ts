export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  modelId: string;
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  group: string;
  updated: string;
  messages: ChatMessage[];
}

export const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const uid = () => Math.random().toString(36).slice(2, 10);

export const seedConversations: Conversation[] = [
  {
    id: 'c-arch',
    title: 'Platform architecture review',
    modelId: 'architect',
    group: 'Today',
    updated: '11:42',
    messages: [
      { id: 'm1', role: 'user', modelId: 'architect', text: 'How should I separate the AI routing layer from the 3D avatar layer?', time: '11:38' },
      { id: 'm2', role: 'assistant', modelId: 'architect', text: 'Keep them behind a single interaction controller. The intelligence layer resolves model_id, instructions and context; the presentation layer only consumes an animation state and a viseme timeline. A mode switch is one coordinated transaction across both, so the avatar can never disagree with the active brain.', time: '11:39' },
      { id: 'm3', role: 'user', modelId: 'architect', text: 'And persistence?', time: '11:41' },
      { id: 'm4', role: 'assistant', modelId: 'architect', text: 'Store append-only messages with a per-conversation sequence number and the model_id plus config_version that produced each response. Never rewrite history when a specialist or configuration changes later.', time: '11:42' },
    ],
  },
  {
    id: 'c-exec',
    title: 'Q3 planning priorities',
    modelId: 'executive',
    group: 'Today',
    updated: '09:15',
    messages: [
      { id: 'm5', role: 'user', modelId: 'executive', text: 'Help me prioritise the Q3 roadmap.', time: '09:12' },
      { id: 'm6', role: 'assistant', modelId: 'executive', text: 'Score each initiative on impact, effort, risk and reversibility. Commit to the two highest-impact, reversible items for this quarter, and place the rest behind explicit gates. Each committed item needs one owner and one measurable outcome.', time: '09:15' },
    ],
  },
  {
    id: 'c-sec',
    title: 'Security hardening checklist',
    modelId: 'security',
    group: 'Yesterday',
    updated: '17:20',
    messages: [
      { id: 'm7', role: 'user', modelId: 'security', text: 'What should we harden first?', time: '17:18' },
      { id: 'm8', role: 'assistant', modelId: 'security', text: 'Start with least-privilege access control, credential storage and redacted logging. Confirm that API keys never ship in the client bundle and that conversation content never reaches diagnostic logs. Then review dependency risk and network exposure.', time: '17:20' },
    ],
  },
  {
    id: 'c-write',
    title: 'Launch announcement draft',
    modelId: 'writer',
    group: 'Previous 7 days',
    updated: 'Mon',
    messages: [
      { id: 'm9', role: 'user', modelId: 'writer', text: 'Draft a short launch announcement for A.I.D.A.', time: '10:02' },
      { id: 'm10', role: 'assistant', modelId: 'writer', text: 'Meet your virtual AI team. A.I.D.A brings seven specialised experts into one calm, voice-first desktop workspace — each one visible, each one focused on the work you need done. Pick a specialist, speak naturally, and keep every conversation exactly where you left it.', time: '10:03' },
    ],
  },
  {
    id: 'c-code',
    title: 'Debounce rapid mode switches',
    modelId: 'coder',
    group: 'Previous 7 days',
    updated: 'Sun',
    messages: [
      { id: 'm11', role: 'user', modelId: 'coder', text: 'How do I debounce rapid model selection?', time: '15:40' },
      { id: 'm12', role: 'assistant', modelId: 'coder', text: 'Keep only the latest selection in a ref, cancel the previous transition, then commit once after roughly 250–300ms of quiet. Make the transition function idempotent so a cancelled switch can never leave the avatar and the AI configuration out of sync.', time: '15:41' },
    ],
  },
];

export interface AidaSettings {
  defaultModel: string;
  notifications: boolean;
  animations: boolean;
  idleLevel: 'full' | 'reduced' | 'minimal';
  quality: 'auto' | 'high' | 'balanced' | 'low';
  voiceProfile: 'model' | 'warm' | 'calm' | 'bright';
  speechRate: number;
  volume: number;
  language: 'en' | 'es' | 'fr' | 'de' | 'hi';
  interaction: 'voice' | 'text' | 'last';
  autoPlay: boolean;
  chatBehaviour: 'remember' | 'open' | 'closed';
  theme: 'dark' | 'light';
  reducedMotion: boolean;
  storage: 'local' | 'none';
}

export const defaultSettings: AidaSettings = {
  defaultModel: 'nonstop',
  notifications: true,
  animations: true,
  idleLevel: 'full',
  quality: 'auto',
  voiceProfile: 'model',
  speechRate: 1,
  volume: 70,
  language: 'en',
  interaction: 'last',
  autoPlay: true,
  chatBehaviour: 'remember',
  theme: 'dark',
  reducedMotion: false,
  storage: 'local',
};
