// Health-log redaction. No field that can carry health information (medicine
// names, directions, allergies, notes) may reach error logs or analytics.

const REDACT_NONE_KEYS = new Set(['medication_count', 'scope_count']);

const REDACT_PATTERNS: Array<[RegExp, string]> = [
  [/\b(paracetamol|dolo|crocin|amoxicillin|azithromycin|metformin|otel|ometrapol)\b/gi, '[redacted-drug-name]'],
  [/\b\d{1,3}\s?mg\b/gi, '[redacted-dose]'],
];

export function redactText(input: string): string {
  let out = input;
  for (const [re, repl] of REDACT_PATTERNS) out = out.replace(re, repl);
  return out;
}

export function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') return redactText(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (REDACT_NONE_KEYS.has(k)) out[k] = v;
      else out[k] = redactObject(v);
    }
    return out;
  }
  return obj;
}

/** The only logging entry point the app should use. */
export function logError(context: string, err: unknown): void {
  const payload = redactObject({
    context,
    message: err instanceof Error ? err.message : String(err),
    time: new Date().toISOString(),
  });
  console.error('[AarogyaMitra]', payload);
}
