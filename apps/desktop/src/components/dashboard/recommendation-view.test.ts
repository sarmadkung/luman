import { describe, it, expect } from 'vitest';
import type { Recommendation } from '@luman/domain';
import { toRecommendationView, topRecommendations } from './recommendation-view';

const rec = (
  id: string,
  severity: Recommendation['severity'],
  bytes: number | null,
): Recommendation => ({
  id,
  title: id,
  rationale: `why ${id}`,
  severity,
  estimatedBytes: bytes,
  findings: [],
});

describe('recommendation-view', () => {
  it('maps severity to priority and formats bytes', () => {
    const v = toRecommendationView(rec('a', 'important', 1024));
    expect(v.priority).toBe('high');
    expect(v.estimatedRecovery).toBe('1.0 KB');
    expect(v.icon).toBeTruthy();
  });

  it('omits estimate when bytes are null', () => {
    expect(toRecommendationView(rec('a', 'info', null)).estimatedRecovery).toBeUndefined();
  });

  it('sorts by severity (highest first) and caps the list', () => {
    const input = [
      rec('info1', 'info', 1),
      rec('imp1', 'important', 1),
      rec('sug1', 'suggested', 1),
      rec('imp2', 'important', 1),
      rec('info2', 'info', 1),
      rec('sug2', 'suggested', 1),
    ];
    const top = topRecommendations(input, 5);
    expect(top).toHaveLength(5);
    expect(top[0]?.severity).toBe('important');
    expect(top[1]?.severity).toBe('important');
    expect(top[top.length - 1]?.severity).not.toBe('important');
  });
});
