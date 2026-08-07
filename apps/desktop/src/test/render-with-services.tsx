/* eslint-disable react-refresh/only-export-components -- test-only helpers, not app modules */
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createServices, ConsoleLogger, type Services } from '@luman/core';
import { ServicesContext } from '../services';

const silentLogger = new ConsoleLogger({
  minLevel: 'error',
  sink: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
});

/** Build a full Services graph (stubs) with optional overrides for a test. */
export function makeServices(overrides: Partial<Services> = {}): Services {
  return { ...createServices({ logger: silentLogger }), ...overrides };
}

export interface RenderOptions {
  readonly services?: Partial<Services>;
  readonly initialEntries?: string[];
}

/** Render a component within a services provider and a memory router. */
export function renderWithServices(ui: ReactElement, options: RenderOptions = {}): RenderResult {
  const services = makeServices(options.services);
  return render(
    <ServicesContext.Provider value={services}>
      <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{ui}</MemoryRouter>
    </ServicesContext.Provider>,
  );
}

/** Probe that renders the current pathname; useful for navigation assertions. */
export function LocationProbe(): ReactNode {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}
