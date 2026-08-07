import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithServices, LocationProbe } from '../../test/render-with-services';
import { QuickActionsWidget } from './QuickActionsWidget';

describe('QuickActionsWidget', () => {
  it('routes to the correct destination when a tile is clicked', async () => {
    renderWithServices(
      <>
        <Routes>
          <Route path="*" element={<QuickActionsWidget />} />
        </Routes>
        <LocationProbe />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Smart Scan/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/smart-scan');

    await userEvent.click(screen.getByRole('button', { name: /Large Files/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/large-files');
  });
});
