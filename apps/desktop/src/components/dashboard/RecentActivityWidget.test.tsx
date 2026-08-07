import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../../test/render-with-services';
import { MockHistoryService } from '../../services/mocks';
import { RecentActivityWidget } from './RecentActivityWidget';

describe('RecentActivityWidget', () => {
  it('renders activity stats when a summary exists', async () => {
    renderWithServices(<RecentActivityWidget />, {
      services: {
        history: new MockHistoryService({
          summary: {
            lastScanAt: '2026-08-07T11:00:00.000Z',
            lastCleanupAt: null,
            totalRecoveredBytes: 1073741824,
          },
        }),
      },
    });
    expect(await screen.findByText('Total Recovered')).toBeInTheDocument();
    expect(screen.getByText('Last Scan')).toBeInTheDocument();
  });

  it('shows the empty state when there is no activity', async () => {
    renderWithServices(<RecentActivityWidget />, {
      services: { history: new MockHistoryService({ summary: null }) },
    });
    expect(await screen.findByText('No activity yet.')).toBeInTheDocument();
  });
});
