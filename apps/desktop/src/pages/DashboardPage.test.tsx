import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../test/render-with-services';
import {
  MockStorageService,
  MockRecommendationService,
  MockHistoryService,
} from '../services/mocks';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('loads and renders every dashboard section', async () => {
    renderWithServices(<DashboardPage />, {
      services: {
        storage: new MockStorageService(),
        recommendations: new MockRecommendationService(),
        history: new MockHistoryService(),
      },
    });

    // Section headings from each widget.
    expect(await screen.findByText('Storage Overview')).toBeInTheDocument();
    expect(screen.getByText('Recoverable Space')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();

    // Data resolved from mock services.
    expect(await screen.findByText('Total')).toBeInTheDocument();
  });
});
