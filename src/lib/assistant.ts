// Limited in-app assistant. Explains app navigation and summarizes the
// schedules the user entered. It must NEVER diagnose, prescribe, recommend
// medicine changes, advise on interactions, or advise taking extra/missing
// doses. violatingQuery() and SAFETY_BOUNDARY are unit tested.

export const SAFETY_BOUNDARY =
  'This assistant only explains how to use Aarogya Mitra. It cannot diagnose, prescribe, recommend medicine changes, discuss interactions, or advise about taking or skipping doses. Ask your doctor or pharmacist.';

export interface AssistantIntent {
  key: string;
  patterns: RegExp[];
  answer: string;
  route?: string;
}

const NAV_INTENTS: AssistantIntent[] = [
  {
    key: 'nav-dashboard',
    route: '/app',
    patterns: [/where (is|are).*(today|dashboard)|open.*dashboard|go to.*(home|dashboard|today)/i],
    answer: 'The Today dashboard shows next dose, all scheduled doses for today and adherence. Opening it now.',
  },
  {
    key: 'nav-medications',
    route: '/app/medications',
    patterns: [/where.*(medication|medicine) list|open.*medications|add.*medication|go to.*medications/i],
    answer: 'The Medications page lists everything you entered. Use “Add medication” to transpose a prescription. Opening it now.',
  },
  {
    key: 'nav-refills',
    route: '/app/refills',
    patterns: [/refill|how much.*(left|remaining)/i],
    answer: 'Refill planning shows quantity remaining, days left and your refill history. Opening it now.',
  },
  {
    key: 'nav-reminders',
    route: '/app/reminders',
    patterns: [/notification|reminder setting|enable.*notification/i],
    answer: 'The Reminders page controls in-app, browser and optional email reminders. Opening it now.',
  },
  {
    key: 'nav-caregivers',
    route: '/app/caregivers',
    patterns: [/caregiver|family (member|access)|grant.*access/i],
    answer: 'Caregiver access lets you invite a family member and choose exactly what they can see. Opening it now.',
  },
  {
    key: 'nav-profile',
    route: '/app/profile',
    patterns: [/profile|allerg(y|ies)|emergency contact|timezone/i],
    answer: 'Your profile has name, timezone, allergies, notes, emergency contact, privacy settings and data export/deletion. Opening it now.',
  },
  {
    key: 'nav-consultations',
    route: '/app/consultations',
    patterns: [/consultation|doctor visit|history page/i],
    answer: 'Consultation history stores provider visits, notes and follow-ups. Opening it now.',
  },
  {
    key: 'nav-export',
    route: '/app/profile',
    patterns: [/export|download.*data/i],
    answer: 'You can export your data from Profile → “Export my data”. Opening it now.',
  },
  {
    key: 'log-dose',
    route: '/app',
    patterns: [/(log|mark|record) (a |my )?(dose|tablet|medicine) (as )?taken/i],
    answer: 'On the Today dashboard you can log a dose as taken or skipped, and enter the actual time and an optional note. Opening the dashboard now.',
  },
  {
    key: 'what-is-app',
    patterns: [/what (is|does) (this|aarogya mitra) (app|do)?|who are you|help me use/i],
    answer:
      'Aarogya Mitra is a reminder and tracking tool for your own health record-keeping. You can add medicines exactly as your prescription says, log doses, plan refills, and share limited information with a caregiver you approve.',
  },
];

const PROHIBITED: RegExp[] = [
  /diagnos/i,
  /\bprescrib/i,
  /what (medicine|drug|dose|dosage) should/i,
  /should i (take|skip|stop|double|increase|reduce)/i,
  /interaction/i,
  /replace.*(medicine|tablet)/i,
  /which (tablet|tablet brand|medicine) (is |for )/i,
  /extra dose|missing dose|booster/i,
  /am i (sick|unwell)|what (disease|illness)/i,
];

export function isProhibitedQuery(text: string): boolean {
  return PROHIBITED.some((re) => re.test(text));
}

export function findIntent(text: string): AssistantIntent | null {
  for (const intent of NAV_INTENTS) {
    if (intent.patterns.some((p) => p.test(text))) return intent;
  }
  return null;
}

export interface ScheduleSummaryInput {
  medicationName: string;
  strength: string;
  times: string[];
}

export function summarizeSchedule(items: ScheduleSummaryInput[], tz: string): string {
  if (items.length === 0) {
    return 'You have not entered any medicine schedule yet. Add a prescription on the Medications page.';
  }
  const lines = items.map((i) => {
    const times = [...i.times].sort().join(', ');
    return `• ${i.medicationName} ${i.strength} at ${times}`;
  });
  return `Your entered schedule (time zone ${tz}):\n${lines.join('\n')}\n\nRemember: this only repeats what you typed in. Check the prescription label for exact instructions.`;
}

export interface AssistantReply {
  text: string;
  route?: string;
  refused: boolean;
}

export function askAssistant(query: string, schedule: ScheduleSummaryInput[], tz: string): AssistantReply {
  if (isProhibitedQuery(query)) {
    return { text: SAFETY_BOUNDARY, refused: true };
  }
  if (/summar(y|ise|ize)|read (my |the )?schedule|read out/i.test(query)) {
    return { text: summarizeSchedule(schedule, tz), refused: false };
  }
  const intent = findIntent(query);
  if (intent) return { text: intent.answer, route: intent.route, refused: false };
  return {
    text:
      'I can show you how Aarogya Mitra works and read out your own schedule. Try asking “Where is the medication list?”, “Plan a refill” or “Summarize my schedule”. I cannot give medical advice.',
    refused: false,
  };
}
