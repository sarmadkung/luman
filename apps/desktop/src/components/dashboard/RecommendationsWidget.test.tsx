import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import type { Recommendation } from '@luman/domain';
import { renderWithServices } from '../../test/render-with-services';
import { MockRecommendationService } from '../../services/mocks';
import { RecommendationsWidget } from './RecommendationsWidget';

const rec = (id: string, severity: Recommendation['severity']): Recommendation => ({
  id,
  title: id,
  rationale: `why ${id}`,
  severity,
  estimatedBytes: 1024,
  findings: [],
});

describe('RecommendationsWidget', () => {
  it('renders at most 5 cards, highest priority first', async () => {
    const many = [
      rec('info1', 'info'),
      rec('imp1', 'important'),
      rec('sug1', 'suggested'),
      rec('imp2', 'important'),
      rec('sug2', 'suggested'),
      rec('info2', 'info'),
      rec('info3', 'info'),
    ];
    renderWithServices(<RecommendationsWidget />, {
      services: { recommendations: new MockRecommendationService({ recommendations: many }) },
    });
    expect(await screen.findByText('imp1')).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(5);
    // First card is a high-priority (important) item.
    expect(articles[0]).toHaveTextContent(/High priority/);
  });

  it('shows the empty state when there are no recommendations', async () => {
    renderWithServices(<RecommendationsWidget />, {
      services: { recommendations: new MockRecommendationService({ recommendations: [] }) },
    });
    expect(await screen.findByText("You're all set")).toBeInTheDocument();
  });
});
