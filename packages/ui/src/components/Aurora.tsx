import './Aurora.css';

/**
 * Aurora background — the single continuous surface every other chrome
 * element sits on. A static base sheet carries the route's colour; two soft
 * lights orbit the inside of the window on long co-prime loops so the
 * highlight is always moving without ever visibly repeating.
 *
 * Decorative only — never interactive, never announced. Under
 * `prefers-reduced-motion: reduce` the lights hold a fixed pose.
 */
export function Aurora() {
  return (
    <div className="lm-aurora" aria-hidden="true">
      <div className="lm-aurora__light lm-aurora__light--a" />
      <div className="lm-aurora__light lm-aurora__light--b" />
    </div>
  );
}
