import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Aurora } from './Aurora';

describe('Aurora', () => {
  it('is decorative and hidden from assistive technology', () => {
    const { container } = render(<Aurora />);
    const root = container.querySelector('.lm-aurora');
    expect(root).not.toBeNull();
    expect(root!.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders both orbiting lights', () => {
    const { container } = render(<Aurora />);
    expect(container.querySelectorAll('.lm-aurora__light')).toHaveLength(2);
  });

  /*
   * The two lights must stay distinguishable: they orbit in opposite
   * directions and carry different tints, so a copy-paste that leaves both on
   * the same modifier would silently collapse the motion to one light.
   */
  it('gives each light its own modifier', () => {
    const { container } = render(<Aurora />);
    expect(container.querySelectorAll('.lm-aurora__light--a')).toHaveLength(1);
    expect(container.querySelectorAll('.lm-aurora__light--b')).toHaveLength(1);
  });
});
