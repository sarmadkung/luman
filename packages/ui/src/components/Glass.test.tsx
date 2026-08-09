import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Glass } from './Glass';

describe('Glass', () => {
  it('defaults to the chrome variant', () => {
    const { container } = render(<Glass>content</Glass>);
    const el = container.querySelector('.lm-glass')!;
    expect(el.classList.contains('lm-glass--chrome')).toBe(true);
    expect(el.classList.contains('lm-glass--surface')).toBe(false);
  });

  it('applies the surface variant for content cards', () => {
    const { container } = render(<Glass variant="surface">content</Glass>);
    const el = container.querySelector('.lm-glass')!;
    expect(el.classList.contains('lm-glass--surface')).toBe(true);
    expect(el.classList.contains('lm-glass--chrome')).toBe(false);
  });

  it('still supports the strong blur modifier', () => {
    const { container } = render(<Glass strong>content</Glass>);
    expect(container.querySelector('.lm-glass')!.classList.contains('lm-glass--strong')).toBe(true);
  });
});
