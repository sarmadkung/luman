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

  it('renders three drifting blobs', () => {
    const { container } = render(<Aurora />);
    expect(container.querySelectorAll('.lm-aurora__blob')).toHaveLength(3);
  });
});
