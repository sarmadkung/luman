import type { RecommendationService } from '@luman/core';
import type { Recommendation } from '@luman/domain';

export interface MockRecommendationOptions {
  readonly delayMs?: number;
  readonly failWith?: Error;
  readonly recommendations?: readonly Recommendation[];
}

const DEFAULT_RECOMMENDATIONS: readonly Recommendation[] = [
  {
    id: 'rec-dev-caches',
    title: 'Clear developer caches',
    rationale: 'Xcode DerivedData, npm, and Homebrew caches can be safely rebuilt on demand.',
    severity: 'important',
    estimatedBytes: 22_548_578_304, // ~21 GB
    findings: [],
  },
  {
    id: 'rec-system-logs',
    title: 'Remove old system & app logs',
    rationale: 'Log files older than 30 days are rarely needed and regenerate automatically.',
    severity: 'suggested',
    estimatedBytes: 3_221_225_472, // ~3 GB
    findings: [],
  },
  {
    id: 'rec-trash',
    title: 'Empty the Trash',
    rationale: 'Items in the Trash still occupy disk space until removed.',
    severity: 'suggested',
    estimatedBytes: 8_589_934_592, // ~8 GB
    findings: [],
  },
  {
    id: 'rec-temp',
    title: 'Delete temporary files',
    rationale: 'Leftover temporary files from installers and apps are safe to remove.',
    severity: 'info',
    estimatedBytes: 1_610_612_736, // ~1.5 GB
    findings: [],
  },
  {
    id: 'rec-mail-attachments',
    title: 'Review downloaded mail attachments',
    rationale: 'Large cached attachments can be re-downloaded from your mail server if needed.',
    severity: 'info',
    estimatedBytes: 2_147_483_648, // ~2 GB
    findings: [],
  },
];

/** Mock RecommendationService implementing the Sprint 1 contract. */
export class MockRecommendationService implements RecommendationService {
  constructor(private readonly options: MockRecommendationOptions = {}) {}

  async getRecommendations(): Promise<readonly Recommendation[]> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.recommendations ?? DEFAULT_RECOMMENDATIONS;
  }
}

function delay(ms?: number): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
