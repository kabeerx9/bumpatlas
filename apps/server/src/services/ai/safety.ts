/**
 * Deterministic safety classifier.
 *
 * Rules, not a model. The whole point is that the response to "I want to hurt my baby" or
 * "how much paracetamol for a 4-month-old" cannot depend on an LLM's mood, a prompt
 * regression, or a provider outage. These categories return fixed text before any provider
 * is contacted.
 *
 * Deliberately over-triggering: a false positive costs a parent one unnecessary "please
 * seek help" message, a false negative could cost far more. Keyword lists are checked
 * against normalised text, so they catch the phrasings people actually type in distress.
 */

export type CriticalCategory =
  | "self_harm"
  | "infant_harm"
  | "abuse"
  | "pregnancy_emergency"
  | "infant_emergency"
  | "medication_dosing"
  | "diagnosis_request";

export type Classification =
  | { kind: "critical"; category: CriticalCategory }
  | { kind: "out_of_scope"; reason: "diagnosis" | "dosing" }
  | { kind: "normal" };

/** Lowercased, punctuation collapsed, so "kill  my-self!" matches "kill myself". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PATTERNS: { category: CriticalCategory; patterns: RegExp[] }[] = [
  {
    category: "self_harm",
    patterns: [
      // `(ing)?` grouped: `ing?` would require the letters "in", so bare "hurt myself"
      // would not match.
      /\b(kill|hurt|harm)(ing|ed)? (myself|me)\b/,
      /\b(i want to|i am going to|i will|im going to) (die|end it|end my life)\b/,
      /\bsuicid(e|al)\b/,
      // Contractions are stripped of punctuation by `normalise`, so "don't" arrives as
      // "dont" and a "not want" pattern alone would miss it.
      /\b(not|dont|do not|didnt|cant) want to (be|live)\b/,
      /\bnot want to be (alive|here)\b/,
      /\bbetter off (dead|without me)\b/,
      // Trailing suffixes: "self harming" must match as well as "self harm".
      /\bself harm(ing|ed|s)?\b/,
      /\bharming myself\b/,
    ],
  },
  {
    category: "infant_harm",
    patterns: [
      /\b(hurt|harm|shake|shaking|hit|hitting|drop)\w* (my|the) (baby|child|son|daughter|newborn)\b/,
      /\b(i am|im|i m) (going to|about to) (hurt|harm|lose it)\b/,
      /\bscared (i|that i) (will|might) hurt\b/,
      /\bwant to (hurt|harm) (my|the) (baby|child)\b/,
    ],
  },
  {
    category: "abuse",
    patterns: [
      /\b(my )?(partner|husband|wife|boyfriend|girlfriend) (hits|hit|beat|beats|hurts|hurt|chokes|threatens|threatened) me\b/,
      /\b(domestic|family) (violence|abuse)\b/,
      /\bafraid of (my )?(partner|husband|wife)\b/,
      /\bnot safe at home\b/,
    ],
  },
  {
    category: "pregnancy_emergency",
    patterns: [
      /\b(heavy )?bleeding\b/,
      /\bno (fetal |baby )?movement\b/,
      /\b(reduced|less) (fetal )?movement\b/,
      /\bwater broke\b/,
      /\bcontractions? (every|are)\b/,
      /\bsevere (headache|pain|swelling)\b/,
      /\bblurred vision\b/,
      /\bpreeclampsia\b/,
    ],
  },
  {
    category: "infant_emergency",
    patterns: [
      /\b(baby|child|newborn).{0,20}\b(not breathing|turning blue|blue lips|unresponsive|limp|seizure|seizing)\b/,
      /\b(high )?fever\b.{0,30}\b(newborn|weeks old|month old)\b/,
      /\bwont wake up\b/,
      /\bchoking\b/,
      /\bnot (feeding|waking) at all\b/,
    ],
  },
  {
    category: "medication_dosing",
    patterns: [
      /\bhow (much|many) (ml|mg|drops?|doses?)\b/,
      /\b(dose|dosage|dosing) (of|for)\b/,
      /\b(paracetamol|acetaminophen|tylenol|ibuprofen|calpol|nurofen|antibiotic|amoxicillin)\b/,
      /\bcan i (take|give) \w+ (while|during) (pregnan|breastfeed)/,
      /\bis \w+ safe (in|during) pregnancy\b/,
    ],
  },
  {
    category: "diagnosis_request",
    patterns: [
      /\b(do|does) (i|my baby|my child|he|she|they) have\b/,
      /\bis (this|it) (normal|serious|dangerous)\b/,
      /\bwhat( i)?s wrong with (my|the) (baby|child)\b/,
      /\bdiagnos(e|is|ed)\b/,
      /\b(autism|adhd|autistic)\b/,
      /\b(is|are) (this|these) (a )?symptoms? of\b/,
    ],
  },
];

/**
 * Classifies a user message.
 *
 * Order matters: life-safety categories are checked before dosing and diagnosis, so
 * "my baby is not breathing, how much CPR" escalates rather than being answered as a
 * dosing refusal.
 */
export function classifyMessage(message: string): Classification {
  const text = normalise(message);

  for (const { category, patterns } of PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) {
      // Dosing and diagnosis are refusals rather than escalations: nobody is in danger,
      // the assistant simply must not answer.
      if (category === "medication_dosing") {
        return { kind: "out_of_scope", reason: "dosing" };
      }
      if (category === "diagnosis_request") {
        return { kind: "out_of_scope", reason: "diagnosis" };
      }

      return { kind: "critical", category };
    }
  }

  return { kind: "normal" };
}

export type FixedResponse = {
  body: string;
  escalate: { title: string; body: string } | null;
};

/**
 * Fixed responses. Never generated, never varied.
 *
 * Written to do one thing: get the person to a human who can help, without diagnosing,
 * minimising, or implying the assistant can handle it.
 */
const CRITICAL_RESPONSES: Record<CriticalCategory, FixedResponse> = {
  self_harm: {
    body: "I am really glad you said that, and I am not the right kind of help for it. Please talk to someone who can support you properly — right now if you can.",
    escalate: {
      title: "Please reach out for support",
      body: "Contact your local emergency number, a crisis line, or your midwife, GP or health visitor. If you are in immediate danger, call emergency services.",
    },
  },
  infant_harm: {
    body: "Thank you for saying this out loud. Feeling this way does not make you a bad parent, and it does need real support rather than an app.",
    escalate: {
      title: "Get support now",
      body: "Put your baby somewhere safe, like their cot, and step away for a moment. Then call your health visitor, GP, or your local emergency number. If you are worried about immediate safety, call emergency services.",
    },
  },
  abuse: {
    body: "I am sorry. That is not something you should have to manage on your own, and it is not something I can help with safely.",
    escalate: {
      title: "Confidential support is available",
      body: "A domestic abuse helpline, your midwife, or your GP can help you plan safely and confidentially. If you are in immediate danger, call emergency services.",
    },
  },
  pregnancy_emergency: {
    body: "What you are describing needs to be checked by a clinician now rather than by me.",
    escalate: {
      title: "Contact your maternity team",
      body: "Call your midwife, maternity assessment unit, or your local emergency number straight away. Do not wait to see whether it settles.",
    },
  },
  infant_emergency: {
    body: "That needs urgent medical attention, not an app.",
    escalate: {
      title: "Seek emergency care now",
      body: "Call your local emergency number immediately. If your baby is not breathing or is unresponsive, ask the operator to talk you through what to do.",
    },
  },
  medication_dosing: {
    body: "I cannot help with medicines or doses.",
    escalate: {
      title: "Ask a pharmacist or clinician",
      body: "A pharmacist, GP, midwife, or health visitor can advise on what is safe and how much, for your situation specifically.",
    },
  },
  diagnosis_request: {
    body: "I cannot tell you what is or is not wrong — I am not able to assess your child, and guessing would not be fair to either of you.",
    escalate: {
      title: "Someone who can actually look",
      body: "Your health visitor, GP, or paediatrician can examine your child and answer this properly.",
    },
  },
};

export function fixedResponseFor(classification: Classification): FixedResponse {
  if (classification.kind === "critical") {
    return CRITICAL_RESPONSES[classification.category];
  }

  if (classification.kind === "out_of_scope") {
    return classification.reason === "dosing"
      ? CRITICAL_RESPONSES.medication_dosing
      : CRITICAL_RESPONSES.diagnosis_request;
  }

  // A normal message has no fixed response; callers must not reach here. Failing loudly
  // beats returning a reassuring default that was never reviewed for the situation.
  throw new Error("fixedResponseFor called for a non-critical classification");
}

/**
 * Post-check on generated text.
 *
 * The classifier guards the input; this guards the output. A provider can still produce a
 * dose, a diagnosis, or a reassurance it has no basis for, and shipping that to a parent
 * is the failure mode this whole phase exists to prevent.
 */
const BLOCKED_OUTPUT_PATTERNS = [
  /\b\d+(\.\d+)?\s?(ml|mg|mcg|g)\b/i,
  /\b(you|your baby|your child) (probably |likely |may )?(has|have)\b.{0,40}\b(infection|reflux|allergy|autism|adhd|colic|thrush|mastitis)\b/i,
  /\bit is (definitely|certainly) (not )?(normal|serious|fine)\b/i,
  /\b(diagnos|prescrib)(e|es|ed|ing)\b/i,
  /\b(give|take) (them |him |her |your baby )?(paracetamol|ibuprofen|calpol|tylenol|antibiotics)\b/i,
];

export function containsBlockedClaim(text: string): boolean {
  return BLOCKED_OUTPUT_PATTERNS.some((pattern) => pattern.test(text));
}
