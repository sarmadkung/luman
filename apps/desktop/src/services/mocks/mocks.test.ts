import { describe, it, expect } from 'vitest';
import { MockStorageService } from './mock-storage-service';
import { MockRecommendationService } from './mock-recommendation-service';
import { MockHistoryService } from './mock-history-service';

describe('mock services', () => {
  it('MockStorageService returns a coherent overview', async () => {
    const overview = await new MockStorageService().getOverview();
    expect(overview).not.toBeNull();
    expect(overview!.usedBytes + overview!.freeBytes).toBeLessThanOrEqual(overview!.totalBytes + 1);
    expect(overview!.reclaimableBytes).toBeLessThanOrEqual(overview!.usedBytes);
  });

  it('MockStorageService can simulate empty and error', async () => {
    expect(await new MockStorageService({ overview: null }).getOverview()).toBeNull();
    await expect(
      new MockStorageService({ failWith: new Error('x') }).getOverview(),
    ).rejects.toThrow('x');
  });

  it('MockRecommendationService returns at least one recommendation', async () => {
    const recs = await new MockRecommendationService().getRecommendations();
    expect(recs.length).toBeGreaterThan(0);
  });

  it('MockHistoryService returns a summary and can be empty', async () => {
    expect(await new MockHistoryService().getActivitySummary()).not.toBeNull();
    expect(await new MockHistoryService({ summary: null }).getActivitySummary()).toBeNull();
  });
});

describe('MockStorageService.getBreakdown', () => {
  it('returns categories that sum exactly to the overview used bytes', async () => {
    const service = new MockStorageService();
    const [overview, breakdown] = await Promise.all([
      service.getOverview(),
      service.getBreakdown(),
    ]);
    const total = breakdown!.reduce((sum, c) => sum + c.bytes, 0);
    expect(total).toBe(overview!.usedBytes);
  });

  it('returns categories with unique keys and positive sizes', async () => {
    const breakdown = (await new MockStorageService().getBreakdown())!;
    expect(breakdown.length).toBeGreaterThan(0);
    expect(new Set(breakdown.map((c) => c.key)).size).toBe(breakdown.length);
    for (const category of breakdown) {
      expect(category.bytes).toBeGreaterThan(0);
      expect(category.label.length).toBeGreaterThan(0);
    }
  });

  it('exercises the empty state when breakdown is explicitly null', async () => {
    expect(await new MockStorageService({ breakdown: null }).getBreakdown()).toBeNull();
  });

  it('propagates the configured failure', async () => {
    const boom = new Error('nope');
    await expect(new MockStorageService({ failWith: boom }).getBreakdown()).rejects.toThrow('nope');
  });
});
