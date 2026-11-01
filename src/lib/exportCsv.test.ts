// Tests for CSV exporting and health-log redaction.

import { describe, expect, it } from 'vitest';
import { bundleToCsv, EXPORT_CATEGORIES } from './exportCsv';
import { logError, redactObject, redactText } from './logger';
import type { ExportBundle } from './types';

describe('EXPORT_CATEGORIES', () => {
  it('offers the selectable data categories', () => {
    const keys = EXPORT_CATEGORIES.map((c) => c.key);
    expect(keys).toEqual(
      expect.arrayContaining(['profile', 'medications', 'dose_logs', 'consultations', 'caregivers']),
    );
  });
});

describe('bundleToCsv', () => {
  const bundle: ExportBundle = {
    generated_at: '2026-10-30T10:00:00Z',
    categories: ['profile', 'dose_logs'],
    data: {
      profile: [{ full_name: 'Demo Patient', timezone: 'Asia/Kolkata' }],
      dose_logs: [{ scheduled_date: '2026-10-30', state: 'taken', note: 'after lunch' }],
    },
  };

  it('produces section headers and CSV rows', () => {
    const csv = bundleToCsv(bundle);
    expect(csv).toContain('# Aarogya Mitra data export');
    expect(csv).toContain('## profile');
    expect(csv).toContain('full_name,timezone');
    expect(csv).toContain('Demo Patient,Asia/Kolkata');
    expect(csv).toContain('## dose_logs');
    expect(csv).toContain('scheduled_date,state,note');
    expect(csv).toContain('2026-10-30,taken,after lunch');
  });

  it('quotes values containing commas/quotes and escapes correctly', () => {
    const csv = bundleToCsv({
      generated_at: bundle.generated_at,
      categories: ['profile'],
      data: { profile: [{ notes: 'He said "take with food", then rest' }] },
    });
    expect(csv).toContain('"He said ""take with food"", then rest"');
  });

  it('renders (no records) for empty categories', () => {
    const csv = bundleToCsv({ generated_at: '', categories: ['profile'], data: { profile: [] } });
    expect(csv).toContain('(no records)');
  });
});

describe('health-log redaction', () => {
  it('redacts drug names and mg doses from text', () => {
    expect(redactText('Paracetamol 500 mg failed')).toContain('[redacted-drug-name]');
    expect(redactText('Paracetamol 500 mg failed')).toContain('[redacted-dose]');
    expect(redactText('Paracetamol 500 mg failed')).not.toContain('Paracetamol');
  });

  it('redacts nested objects and arrays', () => {
    const clean = redactObject({
      msg: 'Metformin 10 mg failed',
      stacked: { directions: 'take 2 tablets of Azithromycin at once' },
      list: ['Amoxicillin 1 pill'],
      count_keep: 3,
    }) as Record<string, unknown>;
    expect(JSON.stringify(clean)).not.toMatch(/metformin|azithromycin|amoxicillin/i);
    expect(clean.count_keep).toBe(3);
  });

  it('logError call degenerates safely in a console-less environment', () => {
    const original = console.error;
    const received: unknown[] = [];
    console.error = (...args: unknown[]) => received.push(args);
    logError('test-context', new Error('demo failure'));
    console.error = original;
    expect(received.length).toBe(1);
    expect(JSON.stringify(received[0])).toContain('test-context');
  });
});
