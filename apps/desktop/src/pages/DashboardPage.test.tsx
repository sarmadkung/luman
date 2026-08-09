import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../test/render-with-services';
import {
  MockStorageService,
  MockRecommendationService,
  MockHistoryService,
} from '../services/mocks';
import { DashboardPage } from './DashboardPage';

function renderDashboard() {
  return renderWithServices(<DashboardPage />, {
    services: {
      storage: new MockStorageService(),
      recommendations: new MockRecommendationService(),
      history: new MockHistoryService(),
    },
  });
}

describe('DashboardPage', () => {
  it('leads with the hero as the page heading', async () => {
    renderDashboard();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('has exactly one level-1 heading', async () => {
    renderDashboard();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every dashboard section', async () => {
    renderDashboard();
    expect(await screen.findByText('Storage Used')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Storage Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('no longer renders the widgets that moved off the dashboard', async () => {
    renderDashboard();
    await screen.findByText('Storage Used');
    expect(screen.queryByText('Quick Actions')).toBeNull();
    expect(screen.queryByText('System Status')).toBeNull();
    expect(screen.queryByText('Recoverable Space')).toBeNull();
  });

  it('resolves breakdown data from the mock services', async () => {
    renderDashboard();
    expect(await screen.findByText('System')).toBeInTheDocument();
  });
});
