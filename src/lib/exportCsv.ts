// Export helpers. Data is bundled client-side from the patient's own rows.

import type { ExportBundle } from './types';

export interface ExportCategory {
  key: string;
  label: string;
}

export const EXPORT_CATEGORIES: ExportCategory[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'medications', label: 'Medications' },
  { key: 'dose_logs', label: 'Dose logs' },
  { key: 'refill_plans', label: 'Refill plans' },
  { key: 'safety_flags', label: 'Safety flags' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'caregivers', label: 'Caregiver permissions & audit' },
];

export function bundleToCsv(bundle: ExportBundle): string {
  const lines: string[] = [`# Aarogya Mitra data export — generated ${bundle.generated_at}`, ''];
  for (const cat of bundle.categories) {
    const rows = (bundle.data[cat] ?? []) as Record<string, unknown>[];
    lines.push(`## ${cat}`);
    if (rows.length === 0) {
      lines.push('(no records)');
      lines.push('');
      continue;
    }
    const headers = Object.keys(rows[0]);
    lines.push(headers.join(','));
    for (const row of rows) {
      lines.push(
        headers
          .map((h) => {
            const v = row[h];
            const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
