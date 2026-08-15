import { createServices, type Services, type Logger } from '@luman/core';
import {
  MockStorageService,
  MockRecommendationService,
  MockHistoryService,
  MockVolumeService,
  MockPermissionService,
  MockScanEngine,
} from './mocks';

/** Simulated latency, so Loading states stay visible while developing. */
const MOCK_DELAY_MS = 300;

/**
 * The desktop service graph: mocks behind the real contracts.
 *
 * **Mocks are the default and stay the default.** `TauriVolumeService` and
 * `TauriPermissionService` exist (INF-005, INF-006) but are deliberately not
 * wired here — both reach real hardware behind an off-by-default flag, and
 * switching the graph over is Sprint 06's call, made deliberately rather than
 * inherited by accident. A test asserts this graph resolves to mocks.
 *
 * Swapping any of these for a real adapter later requires no change to any
 * widget: they depend only on the interfaces.
 */
export function createAppServices(logger: Logger): Services {
  const base = createServices({ logger });
  return {
    ...base,
    storage: new MockStorageService({ delayMs: MOCK_DELAY_MS }),
    recommendations: new MockRecommendationService({ delayMs: MOCK_DELAY_MS }),
    history: new MockHistoryService({ delayMs: MOCK_DELAY_MS }),
    volumes: new MockVolumeService({ delayMs: MOCK_DELAY_MS }),
    permissions: new MockPermissionService({ delayMs: MOCK_DELAY_MS }),
    scanEngine: new MockScanEngine({ delayMs: MOCK_DELAY_MS }),
  };
}
