import { describe, it, expect } from 'vitest';
import { resolveTheme } from './resolve-theme';

describe('resolveTheme', () => {
  it('honors explicit modes regardless of OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the OS preference in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});
