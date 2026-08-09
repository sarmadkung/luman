import './StorageOrb.css';

export interface StorageOrbProps {
  /** Rendered square size in px. */
  readonly size?: number;
}

/**
 * Decorative hero illustration: concentric rings with an aurora glow, standing
 * in for the mockup's remotely-hosted 3D render. Built from tokens so it themes
 * correctly in light and dark, and ships offline. The outer ring rotates slowly
 * unless the user prefers reduced motion.
 */
export function StorageOrb({ size = 320 }: StorageOrbProps) {
  return (
    <svg
      className="lm-orb"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="lm-orb-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" className="lm-orb__stop-bright" />
          <stop offset="65%" className="lm-orb__stop-mid" />
          <stop offset="100%" className="lm-orb__stop-edge" />
        </radialGradient>
      </defs>

      <circle className="lm-orb__glow" cx="100" cy="100" r="76" />
      <circle className="lm-orb__body" cx="100" cy="100" r="60" fill="url(#lm-orb-core)" />
      <circle className="lm-orb__ring lm-orb__ring--inner" cx="100" cy="100" r="42" />
      <circle className="lm-orb__ring lm-orb__ring--mid" cx="100" cy="100" r="60" />
      <g className="lm-orb__spin">
        <circle className="lm-orb__ring lm-orb__ring--outer" cx="100" cy="100" r="78" />
        <circle className="lm-orb__tick" cx="100" cy="22" r="4" />
      </g>
      <circle className="lm-orb__hub" cx="100" cy="100" r="10" />
    </svg>
  );
}
