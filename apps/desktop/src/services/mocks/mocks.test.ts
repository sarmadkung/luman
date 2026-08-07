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
