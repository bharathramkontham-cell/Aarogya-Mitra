// Tests for the limited assistant: navigation works, schedule summary works,
// and every prohibited medical request is refused with the safety boundary.

import { describe, expect, it } from 'vitest';
import { askAssistant, isProhibitedQuery, summarizeSchedule, SAFETY_BOUNDARY } from './assistant';

const schedule = [
  { medicationName: 'Sample-one', strength: '500 mg', times: ['08:00', '20:00'] },
  { medicationName: 'Sample-two', strength: '10 mg', times: ['09:30'] },
];

describe('isProhibitedQuery', () => {
  it('refuses diagnosis, prescription, interactions and dose advice', () => {
    for (const q of [
      'What disease do I have?',
      'Can you diagnose my fever?',
      'Should I increase my dose?',
      'Which tablet should I take instead?',
      'Is there an interaction between my tablets?',
      'What should I do about a missing dose?',
      'Prescribe something for me',
    ]) {
      expect(isProhibitedQuery(q), `should refuse: ${q}`).toBe(true);
    }
  });

  it('allows navigation help', () => {
    expect(isProhibitedQuery('Where is the medication list?')).toBe(false);
    expect(isProhibitedQuery('Summarize my schedule')).toBe(false);
  });
});

describe('askAssistant', () => {
  it('refuses medical advice attempts with the safety boundary', () => {
    const reply = askAssistant('What medicine should I take for my headache?', schedule, 'Asia/Kolkata');
    expect(reply.refused).toBe(true);
    expect(reply.text).toBe(SAFETY_BOUNDARY);
    expect(SAFETY_BOUNDARY).toContain('cannot diagnose');
  });

  it('summarizes the user-entered schedule', () => {
    const reply = askAssistant('Summarize my schedule', schedule, 'Asia/Kolkata');
    expect(reply.refused).toBe(false);
    expect(reply.text).toContain('Sample-one 500 mg');
    expect(reply.text).toContain('08:00, 20:00');
    expect(reply.text).toContain('Asia/Kolkata');
    expect(reply.text).toContain('Check the prescription label');
  });

  it('answers navigation intents with a route', () => {
    const reply = askAssistant('Where is the refill page?', schedule, 'Asia/Kolkata');
    expect(reply.route).toBe('/app/refills');
    expect(reply.refused).toBe(false);
  });

  it('falls back to a help message that declares no medical advice', () => {
    const reply = askAssistant('banana', schedule, 'Asia/Kolkata');
    expect(reply.text).toContain('cannot give medical advice');
  });

  it('schedule summary with no entries points to adding medicines', () => {
    expect(summarizeSchedule([], 'UTC')).toContain('not entered any medicine schedule');
  });
});
