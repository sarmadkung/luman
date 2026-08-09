import './Aurora.css';

/**
 * Aurora background. Three large, heavily blurred blobs that drift slowly
 * behind all content. Decorative only — never interactive, never announced.
 * Drift is disabled under `prefers-reduced-motion: reduce`; the blobs then
 * render static. Opacity is theme-driven: subtle in light, luminous in dark.
 */
export function Aurora() {
  return (
    <div className="lm-aurora" aria-hidden="true">
      <div className="lm-aurora__blob lm-aurora__blob--1" />
      <div className="lm-aurora__blob lm-aurora__blob--2" />
      <div className="lm-aurora__blob lm-aurora__blob--3" />
    </div>
  );
}
