/**
 * 3D character definitions.
 * Five rigged base avatars (shared humanoid skeleton naming) are varied with
 * material rules and hidden accessories to give each of the seven specialists
 * a distinct identity.
 */
export type RigId = 'sdk' | 'avaturn' | 'rpm' | 'brunette' | 'julie';

export interface MaterialRule {
  /** Matches the mesh (node) name */
  mesh: RegExp;
  /** Replace the albedo with a flat colour (keeps normal / roughness detail) */
  flat?: string;
  /** Multiply the existing albedo by a colour */
  multiply?: string;
  roughness?: number;
  metalness?: number;
}

export interface CharacterConfig {
  id: string;
  rig: RigId;
  hide?: RegExp[];
  rules?: MaterialRule[];
  voice: { gender: 'f' | 'm'; pitch: number; rate: number };
  intro: string;
}

export const RIG_LOADERS: Record<RigId, () => Promise<{ default: string }>> = {
  sdk: () => import('../assets/models/sdk'),
  avaturn: () => import('../assets/models/avaturn'),
  rpm: () => import('../assets/models/rpm'),
  brunette: () => import('../assets/models/brunette'),
  julie: () => import('../assets/models/julie'),
};

export const CHARACTERS: Record<string, CharacterConfig> = {
  nonstop: {
    id: 'nonstop',
    rig: 'sdk',
    rules: [{ mesh: /outfit_top/i, flat: '#1d2748', roughness: 0.85 }],
    voice: { gender: 'm', pitch: 1.0, rate: 1.0 },
    intro: "Hi, I'm A.I.D.A — your virtual AI team. I'm NON-STOP, your general assistant. Tell me what you need, and I'll answer or bring in the right specialist.",
  },
  executive: {
    id: 'executive',
    rig: 'avaturn',
    voice: { gender: 'f', pitch: 0.95, rate: 0.98 },
    intro: "Hello, I'm EXECUTIVE. I turn business goals into clear plans, priorities and decisions you can act on.",
  },
  coder: {
    id: 'coder',
    rig: 'rpm',
    hide: [/headwear/i, /beard/i],
    rules: [
      { mesh: /outfit_top/i, multiply: '#8493ff' },
      { mesh: /wolf3d_head|wolf3d_skin/i, multiply: '#f0d9c4' },
    ],
    voice: { gender: 'm', pitch: 1.1, rate: 1.05 },
    intro: "Hey, I'm CODER. Show me your code or your error, and I'll help you write, debug and understand it.",
  },
  architect: {
    id: 'architect',
    rig: 'brunette',
    rules: [{ mesh: /wolf3d_hair/i, flat: '#5b3a26', roughness: 0.55 }],
    voice: { gender: 'f', pitch: 1.0, rate: 0.98 },
    intro: "Hi, I'm ARCHITECT. I design systems — components, data, APIs and infrastructure — and I'll tell you the trade-offs honestly.",
  },
  security: {
    id: 'security',
    rig: 'julie',
    rules: [{ mesh: /wolf3d_hair/i, flat: '#161b30', roughness: 0.5 }],
    voice: { gender: 'f', pitch: 0.85, rate: 0.95 },
    intro: "I'm SECURITY. I help you find risks and strengthen your defences — always on the defensive side.",
  },
  researcher: {
    id: 'researcher',
    rig: 'rpm',
    hide: [/headwear/i],
    rules: [{ mesh: /outfit_top/i, multiply: '#a89f86' }],
    voice: { gender: 'm', pitch: 0.9, rate: 0.95 },
    intro: "Hello, I'm RESEARCHER. I separate facts from inference, compare options fairly, and tell you what we still don't know.",
  },
  writer: {
    id: 'writer',
    rig: 'brunette',
    rules: [
      { mesh: /wolf3d_hair/i, flat: '#1fb59a', roughness: 0.45 },
      { mesh: /outfit_top/i, flat: '#43573a', roughness: 0.8 },
    ],
    voice: { gender: 'f', pitch: 1.12, rate: 1.02 },
    intro: "Hi, I'm WRITER. Give me your audience, your purpose and your tone, and I'll draft, edit and polish.",
  },
};
