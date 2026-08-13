import { createServices, type Services, type Logger } from '@luman/core';
import { MockStorageService, MockRecommendationService, MockHistoryService } from './mocks';

/**
 * Sprint 03 service graph: mock Storage/Recommendation/History behind the real
 * Sprint 01 contracts, with Scanner/Cleanup remaining stubs (their features are
 * out of scope until Sprints 05 and 07). Swapping these mocks for real adapters
 * later requires no change to any widget — they depend only on the interfaces.
 */
export function createAppServices(logger: Logger): Services {
  const base = createServices({ logger });
  return {
    ...base,
    storage: new MockStorageService({ delayMs: 300 }),
    recommendations: new MockRecommendationService({ delayMs: 300 }),
    history: new MockHistoryService({ delayMs: 300 }),
  };
}
