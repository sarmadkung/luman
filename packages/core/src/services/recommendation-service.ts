import type { Recommendation } from '@luman/domain';

/** Produces explainable recommendations from findings. Read-only. */
export interface RecommendationService {
  getRecommendations(): Promise<readonly Recommendation[]>;
}

/** Sprint 1 stub — returns no recommendations. */
export class StubRecommendationService implements RecommendationService {
  async getRecommendations(): Promise<readonly Recommendation[]> {
    return [];
  }
}
