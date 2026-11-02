import { thumbs } from './thumbs';
const T = (k: string) => thumbs[k] ?? '';

export type ModelIconKey = 'infinity' | 'chart' | 'code' | 'layers' | 'shield' | 'search' | 'pen';

export interface AidaModel {
  id: string;
  name: string;
  role: string;
  cardRole: string;
  tag: string;
  desc: string;
  features: string[];
  image: string;
  icon: ModelIconKey;
  accent: string;
  quickPrompts: string[];
  replies: string[];
}

export const AIDA_MODELS: AidaModel[] = [
  {
    id: 'nonstop',
    name: 'NON-STOP',
    role: 'General AI Assistant',
    cardRole: 'General AI Assistant',
    tag: 'PRIMARY',
    desc: "I'm your all-in-one assistant. I can understand your needs, answer questions, and connect you with the right specialist from our AI team.",
    features: ['General assistance & problem solving', 'Smart route to the right specialist', 'Cross-domain understanding', 'Continuous, non-stop support'],
    image: T('nonstop'),
    icon: 'infinity',
    accent: '#a78bfa',
    quickPrompts: ['What can my AI team do?', 'Help me plan my day', 'Which specialist should I use?'],
    replies: [
      'I can help with general questions, shape your requirements, and route you to the right specialist. For example, EXECUTIVE handles planning, CODER handles implementation, and SECURITY reviews risk.',
      'Here is the quickest path: tell me the outcome you need, and I will either answer directly or recommend one of the six specialists with a short rationale.',
      'You can work with me by voice or text at any time. Your conversations are kept in the history drawer and can be restored exactly where you left them.',
    ],
  },
  {
    id: 'executive',
    name: 'EXECUTIVE',
    role: 'Strategy & Management',
    cardRole: 'Strategy & Management',
    tag: 'SPECIALIST',
    desc: 'I turn business goals into clear plans and decisions — objectives, priorities, trade-offs and measurable outcomes, ready for action.',
    features: ['Business planning & strategy', 'Prioritisation & trade-offs', 'Performance planning', 'Management recommendations'],
    image: T('executive'),
    icon: 'chart',
    accent: '#818cf8',
    quickPrompts: ['Draft a quarterly plan', 'Prioritise these initiatives', 'Build a decision matrix'],
    replies: [
      'Let us frame this as objective, options, trade-offs and measures. Share the goal and the constraint that matters most, and I will build a decision-ready structure.',
      'I recommend three horizons: now (this month), next (this quarter) and later. Each item should have one owner, one measurable outcome and an explicit trade-off.',
      'A useful starting point is a simple comparison: impact, effort, risk and reversibility. I can prepare that table once you confirm the candidate initiatives.',
    ],
  },
  {
    id: 'coder',
    name: 'CODER',
    role: 'Programming & Development',
    cardRole: 'Programming & Development',
    tag: 'SPECIALIST',
    desc: 'I write, debug, review and explain code — with explicit assumptions, edge cases and reproducible examples you can build on.',
    features: ['Code generation & refactoring', 'Debugging & code review', 'Programming explanations', 'Optimisation guidance'],
    image: T('coder'),
    icon: 'code',
    accent: '#60a5fa',
    quickPrompts: ['Review this function', 'Explain this error', 'Write a React hook'],
    replies: [
      'Share the snippet and the runtime version. I will return a corrected version with assumptions stated, the failure mode explained and a minimal reproduction.',
      'One approach is to isolate the failing case first, then verify the fix with a single automated test before refactoring. I can sketch both if you paste the code.',
      'I will keep the solution dependency-light and comment the non-obvious parts. If this becomes an architecture question, I will hand you back to ARCHITECT.',
    ],
  },
  {
    id: 'architect',
    name: 'ARCHITECT',
    role: 'System Design & Architecture',
    cardRole: 'System Design & Architecture',
    tag: 'SPECIALIST',
    desc: 'I design components, interfaces, data models and infrastructure — separating firm decisions from open questions and stating trade-offs.',
    features: ['System & API architecture', 'Database design', 'Scalability & infrastructure', 'Technical documentation'],
    image: T('architect'),
    icon: 'layers',
    accent: '#22d3ee',
    quickPrompts: ['Design a scalable API', 'Model this data', 'Compare two architectures'],
    replies: [
      'I would start with boundaries: what data each component owns, which interfaces are synchronous, and where consistency can be eventual. Then we size the failure domains.',
      'A clean structure separates the presentation layer from the intelligence layer and the persistence layer. That keeps model switching and avatar rendering independent.',
      'Before we commit, I will list the assumptions we are making and label anything unconfirmed as TBC rather than presenting it as a decision.',
    ],
  },
  {
    id: 'security',
    name: 'SECURITY',
    role: 'Cybersecurity & Protection',
    cardRole: 'Cybersecurity & Protection',
    tag: 'SPECIALIST',
    desc: 'I help you understand and reduce risk with defensive, prioritised security guidance — scope, threats, controls and verification.',
    features: ['Threat identification', 'Vulnerability guidance', 'Risk & impact analysis', 'Defensive security architecture'],
    image: T('security'),
    icon: 'shield',
    accent: '#2dd4bf',
    quickPrompts: ['Assess this risk', 'Harden our auth flow', 'Create a threat model'],
    replies: [
      'I work within defensive scope and assume you own the system. Let us identify the assets, the trust boundaries and the most likely threats before recommending controls.',
      'Prioritise by likelihood and impact. I would start with access control, credential handling and logging, then move to network exposure and dependency risk.',
      'Two immediate checks: confirm least-privilege on every role, and make sure no credentials or raw conversation content reach application logs.',
    ],
  },
  {
    id: 'researcher',
    name: 'RESEARCHER',
    role: 'Research & Analysis',
    cardRole: 'Research & Analysis',
    tag: 'SPECIALIST',
    desc: 'I structure investigation, evaluate evidence and compare options — clearly separating facts, inferences and open unknowns.',
    features: ['Evidence evaluation', 'Comparative research', 'Data interpretation', 'Structured analytical reports'],
    image: T('researcher'),
    icon: 'search',
    accent: '#fbbf24',
    quickPrompts: ['Compare these options', 'Summarise the evidence', 'Build an analysis plan'],
    replies: [
      'I will separate what is known, what is inferred and what is unknown — and state confidence rather than inventing certainty.',
      'For a fair comparison we need consistent criteria: cost, effort, risk, time to value and reversibility. I can score each option once you confirm the shortlist.',
      'A useful research plan has a question, a source strategy, an evidence table and a decision threshold. I can draft that structure for your topic.',
    ],
  },
  {
    id: 'writer',
    name: 'WRITER',
    role: 'Content & Communication',
    cardRole: 'Content & Communication',
    tag: 'SPECIALIST',
    desc: 'I draft, edit and refine content for a specific audience — with clear tone, structure and a change rationale when I edit.',
    features: ['Content creation', 'Business communication', 'Editing & proofreading', 'Storytelling & tone'],
    image: T('writer'),
    icon: 'pen',
    accent: '#fb7185',
    quickPrompts: ['Draft a launch announcement', 'Edit this paragraph', 'Adjust the tone'],
    replies: [
      'Tell me the audience, the purpose and the tone you want — for example concise, warm or formal. I will draft to that brief and keep the structure easy to scan.',
      'Here is a sharper version: lead with the outcome, remove hedging, then add one concrete proof point. I can also explain every change if you prefer a review.',
      'If the content needs verifiable facts rather than polished language, I will flag them and hand you over to RESEARCHER through NON-STOP.',
    ],
  },
];
