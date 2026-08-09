import type { ReactNode } from 'react';
import './HeroBanner.css';

export interface HeroBannerProps {
  /** The page's primary heading. Rendered as <h1>. */
  readonly headline: string;
  readonly subhead?: ReactNode;
  /** Primary call to action, e.g. a Button. */
  readonly action?: ReactNode;
  /** Decorative illustration, e.g. <StorageOrb />. */
  readonly visual?: ReactNode;
}

/**
 * Hero band: headline, supporting line, one call to action, and an optional
 * decorative visual. Purely presentational — callers derive the copy.
 */
export function HeroBanner({ headline, subhead, action, visual }: HeroBannerProps) {
  return (
    <section className="lm-hero">
      <div className="lm-hero__copy">
        <h1 className="lm-hero__headline">{headline}</h1>
        {subhead != null && <p className="lm-hero__subhead">{subhead}</p>}
        {action != null && <div className="lm-hero__action">{action}</div>}
      </div>
      {visual != null && <div className="lm-hero__visual">{visual}</div>}
    </section>
  );
}
