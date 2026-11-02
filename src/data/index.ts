import type { Section } from './types';
import { sections1 } from './frd1';
import { sections2 } from './frd2';
import { sections3 } from './frd3';

export const sections: Section[] = [...sections1, ...sections2, ...sections3];

export const groups = [
  { name: 'Governance & Scope', range: '01–06', description: 'Control, vision, scope and roles' },
  { name: 'Product Definition', range: '07–18', description: 'Models, interface, avatars and interaction' },
  { name: 'Engineering Specification', range: '19–25', description: 'Screens, flows, requirements, data and integration' },
  { name: 'Delivery & Assurance', range: '26–35', description: 'Quality, errors, phases, testing and roadmap' },
];

export const stats = [
  { value: '35', label: 'Numbered sections' },
  { value: '07', label: 'AI specialist modes' },
  { value: '64', label: 'Functional requirements' },
  { value: '25', label: 'Acceptance criteria' },
];
