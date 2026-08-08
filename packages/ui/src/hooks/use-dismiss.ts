import { useEffect, type RefObject } from 'react';

/** Calls `onDismiss` on Escape key or a pointer-down outside `ref`. */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  active = true,
): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [ref, onDismiss, active]);
}
