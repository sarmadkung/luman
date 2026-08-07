import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../../test/render-with-services';
import { MockStorageService } from '../../services/mocks';
import { StorageOverviewWidget } from './StorageOverviewWidget';

describe('StorageOverviewWidget', () => {
  it('shows loading, then the ready state with storage figures', async () => {
    renderWithServices(<StorageOverviewWidget />, {
      services: { storage: new MockStorageService() },
    });
    expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Macintosh HD')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Storage utilization' })).toBeInTheDocument();
  });

  it('shows the empty state when no overview is available', async () => {
    renderWithServices(<StorageOverviewWidget />, {
      services: { storage: new MockStorageService({ overview: null }) },
    });
    expect(await screen.findByText('Storage information unavailable')).toBeInTheDocument();
  });

  it('shows the error state with a retry action when loading fails', async () => {
    renderWithServices(<StorageOverviewWidget />, {
      services: { storage: new MockStorageService({ failWith: new Error('boom') }) },
    });
    expect(await screen.findByText('Could not read storage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
