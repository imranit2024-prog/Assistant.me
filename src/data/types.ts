export type CalloutVariant = 'info' | 'tbc' | 'mvp' | 'warn' | 'future';

export type Block =
  | { type: 'lead'; text: string }
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][]; dense?: boolean }
  | { type: 'callout'; variant: CalloutVariant; title: string; text: string }
  | { type: 'steps'; title?: string; items: string[] }
  | { type: 'kv'; items: [string, string][] }
  | { type: 'code'; title?: string; text: string }
  | { type: 'models'; items: ModelSpec[] }
  | { type: 'screens'; items: ScreenSpec[] }
  | { type: 'flows'; items: FlowSpec[] }
  | { type: 'phases'; items: PhaseSpec[] }
  | { type: 'ac'; items: AcceptanceRow[] };

export interface ModelSpec {
  id: string;
  name: string;
  role: string;
  accent: string;
  intro: string;
  responsibilities: string[];
  instructions: string;
  config: string;
  avatar: string;
  voice: string;
  boundaries: string;
}

export interface ScreenSpec {
  id: string;
  name: string;
  purpose: string;
  layout: string;
  components: string[];
  hierarchy: string;
  actions: string[];
  behavior: string;
  loading: string;
  empty: string;
  error: string;
  success: string;
  navigation: string;
  responsive: string;
  acceptance: string[];
}

export interface FlowSpec {
  id: string;
  name: string;
  trigger: string;
  steps: string[];
  decisions: string[];
  alternatives: string[];
  outcome: string;
}

export interface PhaseSpec {
  id: string;
  name: string;
  objective: string;
  deliverables: string[];
  dependencies: string[];
  exit: string[];
}

export interface AcceptanceRow {
  id: string;
  criterion: string;
  verification: string;
}

export interface Section {
  number: number;
  id: string;
  title: string;
  group: string;
  eyebrow?: string;
  blocks: Block[];
}
