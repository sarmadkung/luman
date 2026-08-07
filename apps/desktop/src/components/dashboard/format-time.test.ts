import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './format-time';

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-07T12:00:00.000Z');
  it('handles null and invalid input', () => {
    expect(formatRelativeTime(null, now)).toBe('Never');
    expect(formatRelativeTime('not-a-date', now)).toBe('—');
  });
  it('formats minutes, hours, and days', () => {
    expect(formatRelativeTime('2026-08-07T11:30:00.000Z', now)).toBe('30 min ago');
    expect(formatRelativeTime('2026-08-07T09:00:00.000Z', now)).toBe('3 hr ago');
    expect(formatRelativeTime('2026-08-05T12:00:00.000Z', now)).toBe('2 days ago');
  });
});
