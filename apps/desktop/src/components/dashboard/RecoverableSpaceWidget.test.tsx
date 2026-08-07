import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../../test/render-with-services';
import { MockStorageService, MockHistoryService } from '../../services/mocks';
import { RecoverableSpaceWidget } from './RecoverableSpaceWidget';

describe('RecoverableSpaceWidget', () => {
  it('shows recoverable size and last scan when a scan exists', async () => {
    renderWithServices(<RecoverableSpaceWidget />, {
      services: {
        storage: new MockStorageService(),
        history: new MockHistoryService(),
      },
    });
    expect(await screen.findByText(/Last scan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Smart Scan' })).toBeInTheDocument();
  });

  it('shows the "no scan" empty state when no scan has run', async () => {
    renderWithServices(<RecoverableSpaceWidget />, {
      services: {
        storage: new MockStorageService(),
        history: new MockHistoryService({ summary: null }),
      },
    });
    expect(await screen.findByText('No scan has been performed.')).toBeInTheDocument();
  });
});
