import { AIDA_MODELS, type AidaModel } from '../data/models';

/**
 * Local, deterministic "intelligence layer" for the concept build.
 * It demonstrates domain boundaries and NON-STOP routing without any
 * external AI service. Replace `generateReply` with a real gateway call.
 */
export interface Reply {
  text: string;
  /** specialist that NON-STOP / a specialist recommends */
  suggest?: string;
  /** immediate switch requested by the user */
  switchTo?: string;
}

const DOMAIN: Record<string, RegExp> = {
  executive: /\b(plan|planning|strategy|strategic|roadmap|priorit\w+|okr|budget|business|kpi|market|stakeholder|project manage\w*|decision|quarter\w*|revenue|growth)\b/i,
  coder: /\b(code|coding|bug|debug|function|react|javascript|typescript|python|compile|script|refactor|regex|algorithm|stack ?trace|exception|program\w*|css|html|sql query)\b/i,
  architect: /\b(architect\w*|database|schema|scal\w+|system design|microservice\w*|infrastructure|api design|data model|latency|throughput|cloud|diagram)\b/i,
  security: /\b(secur\w+|vulnerab\w+|hack\w*|encrypt\w*|password|threat|risk|auth\w*|firewall|malware|phishing|breach|privacy)\b/i,
  researcher: /\b(research|compare|comparison|evidence|stud(y|ies)|analy[sz]e|analysis|statistic\w*|survey|literature|findings|sources)\b/i,
  writer: /\b(write|writing|draft|email|article|blog|proofread|edit|story|announcement|tone|headline|copy|essay|speech)\b/i,
};

const NAMES: Record<string, RegExp> = {
  nonstop: /non[- ]?stop|general assistant|main assistant/i,
  executive: /executive|business (expert|specialist)/i,
  coder: /coder|programmer|developer/i,
  architect: /architect/i,
  security: /security|cyber/i,
  researcher: /researcher|research (expert|specialist)/i,
  writer: /writer|writing (expert|specialist)/i,
};

const label = (id: string) => AIDA_MODELS.find((m) => m.id === id)?.name ?? id.toUpperCase();
const pretty = (id: string) => { const n = label(id); return n === 'NON-STOP' ? 'Non-stop' : n.charAt(0) + n.slice(1).toLowerCase(); };

function topic(text: string) {
  const t = text.replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '');
  return t.length > 60 ? t.slice(0, 57).trimEnd() + '…' : t;
}

export function detectDomain(text: string): string | null {
  let best: string | null = null;
  let bestHits = 0;
  for (const [id, re] of Object.entries(DOMAIN)) {
    const hits = (text.match(new RegExp(re.source, 'gi')) ?? []).length;
    if (hits > bestHits) { best = id; bestHits = hits; }
  }
  return best;
}

export function generateReply(model: AidaModel, text: string, turn: number, pending: string | null): Reply {
  const t = text.trim();
  const lower = t.toLowerCase();

  // accepting an earlier recommendation
  if (pending && /^(yes|yeah|yep|sure|ok(ay)?|please|go ahead|do it|switch|connect me|sounds good|let'?s do it)\b/i.test(lower)) {
    return { text: `Connecting you to ${label(pending)} now.`, switchTo: pending };
  }

  // explicit switch request
  const wants = /\b(talk to|switch to|connect me to|bring in|get me|i want|let me (talk|speak) to|speak to|ask)\b/i.test(lower);
  if (wants) {
    for (const [id, re] of Object.entries(NAMES)) {
      if (id !== model.id && re.test(lower)) return { text: `Of course — bringing in ${label(id)}.`, switchTo: id };
    }
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|greetings)\b/i.test(lower)) {
    return { text: `Hello! I'm ${model.name}. ${model.desc.split('. ')[0].replace(/\.$/, '')}. What can I do for you today?` };
  }
  if (/\b(thank(s| you)|cheers|appreciate)\b/i.test(lower)) {
    return { text: "You're welcome! I'm here whenever you need me — just talk or type." };
  }
  if (/\b(who are you|what are you|introduce yourself|what can you do|what do you do)\b/i.test(lower)) {
    return { text: `I'm ${model.name}, your ${model.role.toLowerCase()}. ${model.features.slice(0, 3).join(', ')}.` };
  }
  if (/\b(your team|specialists|who else)\b/i.test(lower)) {
    return { text: 'Your team has seven members: Non-stop, Executive, Coder, Architect, Security, Researcher and Writer. Tell me what you need and I will pick the right one.' };
  }

  const domain = detectDomain(t);

  if (model.id === 'nonstop') {
    if (domain && domain !== 'nonstop') {
      return {
        text: `That sounds like a job for ${label(domain)}, our ${AIDA_MODELS.find((m) => m.id === domain)?.role.toLowerCase()} specialist. Shall I connect you? Just say yes, or tap their card.`,
        suggest: domain,
      };
    }
    return { text: `Happy to help with “${topic(t)}”. ${model.replies[turn % model.replies.length]}` };
  }

  // specialist: stay within the domain boundary
  if (domain && domain !== model.id) {
    return {
      text: `That's outside my area — it's closer to ${pretty(domain)}'s expertise. I'd rather not guess. Want me to hand you back to Non-stop so you can be routed to ${pretty(domain)}?`,
      suggest: 'nonstop',
    };
  }
  return { text: `On “${topic(t)}” — ${model.replies[turn % model.replies.length]}` };
}
