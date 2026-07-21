import { FieldDescriptor, normalize, tokenize } from './describe';
import { SYNONYMS, INDIAN_STATES } from './synonyms';
import { Rule } from '../profile/store';
import { fingerprintOf } from './rules';
import { setCustomFieldsCallback } from '../profile/schema';

export type MatchSource = 'teach' | 'ai' | 'heuristic' | 'option-signal';

export interface FieldMatch {
  descriptor: FieldDescriptor;
  key: string | null;
  confidence: number;
  source: MatchSource | null;
  fingerprint: string;
  occurrence: number;
}

export const THRESHOLD_FILL = 0.75;
export const THRESHOLD_SUGGEST = 0.45;

interface Scored {
  key: string;
  score: number;
}

/** Pre-tokenized synonyms, rebuilt when custom fields change. */
const SYN_TOKENS: Record<string, { phrase: string; tokens: string[] }[]> = {};

function rebuildSynTokens(): void {
  for (const k of Object.keys(SYN_TOKENS)) delete SYN_TOKENS[k];
  for (const [key, phrases] of Object.entries(SYNONYMS)) {
    SYN_TOKENS[key] = phrases.map((p) => ({ phrase: normalize(p), tokens: tokenize(p) }));
  }
}

rebuildSynTokens();
setCustomFieldsCallback((customFields) => {
  for (const k of Object.keys(SYNONYMS)) {
    if (k.startsWith('custom.')) delete SYNONYMS[k];
  }
  for (const f of customFields) {
    SYNONYMS[f.key] = [f.label];
  }
  rebuildSynTokens();
});


function scoreHeuristic(d: FieldDescriptor): Scored | null {
  let best: Scored | null = null;
  const fieldSet = new Set(d.tokens);

  for (const [key, entries] of Object.entries(SYN_TOKENS)) {
    let keyScore = 0;
    for (const { phrase, tokens } of entries) {
      if (!tokens.length) continue;
      const matched = tokens.filter((t) => fieldSet.has(t)).length;
      const coverage = matched / tokens.length;
      let s = 0;
      if (d.text.includes(phrase) && phrase.length > 2) {
        s = 0.95; // whole phrase appears in the descriptor
      } else if (coverage === 1) {
        // Single distinctive token (state, category, pincode…) is enough to
        // fill; multi-token full coverage is stronger still.
        s = tokens.length >= 2 ? 0.85 : 0.8;
      } else {
        s = coverage * 0.7;
      }
      // Prefer the more specific (longer) phrase on ties — e.g. "alternative
      // number" must beat "mobile number" on an alternate-number field. Never
      // grant a bonus to a zero score: that used to hand gibberish fields an
      // arbitrary key at confidence ~0.
      if (s > 0) s += Math.min(phrase.length, 40) * 0.0008;
      // A field the user explicitly created must outrank a built-in synonym
      // that scores the same or nearly the same.
      if (s > 0 && key.startsWith('custom.')) s = Math.min(s + 0.05, 1);
      if (s > keyScore) keyScore = s;
    }
    if (keyScore > 0 && (!best || keyScore > best.score)) {
      best = { key, score: keyScore };
    }
  }
  return best;
}

/** Infer a key from a select/radio option set regardless of label text. */
function scoreOptionSignal(d: FieldDescriptor): Scored | null {
  if (!d.options.length) return null;
  const opts = d.options.map((o) => normalize(o));
  const has = (re: RegExp) => opts.filter((o) => re.test(o)).length;

  const cat = has(/\b(general|ur|unreserved|obc|sc|st|ews)\b/);
  if (cat >= 3) return { key: 'personal.category', score: 0.9 };

  const gender = opts.some((o) => /\bmale\b/.test(o)) && opts.some((o) => /\bfemale\b/.test(o));
  if (gender) return { key: 'personal.gender', score: 0.9 };

  const states = opts.filter((o) => INDIAN_STATES.some((s) => o.includes(s))).length;
  if (states >= 5) return { key: 'address.permanent.state', score: 0.82 };

  const emailDomains = opts.filter((o) => /\b(gmail|yahoo|hotmail|outlook|rediffmail|live|icloud|mail)\s+(com|in|co\s+in|org|net)\b/.test(o)).length;
  if (emailDomains >= 2) return { key: 'contact.email', score: 0.85 };

  return null;
}

function ruleFor(
  fingerprint: string,
  occurrence: number,
  rules: Rule[],
): Rule | undefined {
  return (
    rules.find((r) => r.fingerprint === fingerprint && r.occurrence === occurrence) ??
    rules.find((r) => r.fingerprint === fingerprint)
  );
}

export function matchAll(descriptors: FieldDescriptor[], rules: Rule[]): FieldMatch[] {
  const seen = new Map<string, number>();

  return descriptors.map((d) => {
    const fingerprint = fingerprintOf(d);
    const occurrence = seen.get(fingerprint) ?? 0;
    seen.set(fingerprint, occurrence + 1);

    // 1. Rules always win.
    const rule = ruleFor(fingerprint, occurrence, rules);
    if (rule) {
      return {
        descriptor: d,
        key: rule.key,
        confidence: 1,
        source: rule.source === 'ai' ? 'ai' : 'teach',
        fingerprint,
        occurrence,
      };
    }

    // 2. Option-list signal, 3. heuristic — take the stronger.
    const opt = scoreOptionSignal(d);
    const heur = scoreHeuristic(d);
    let chosen: Scored | null = null;
    let source: MatchSource = 'heuristic';
    if (opt && (!heur || opt.score >= heur.score)) {
      chosen = opt;
      source = 'option-signal';
    } else if (heur) {
      chosen = heur;
      source = 'heuristic';
    }

    return {
      descriptor: d,
      key: chosen?.key ?? null,
      confidence: chosen?.score ?? 0,
      source: chosen ? source : null,
      fingerprint,
      occurrence,
    };
  });
}
