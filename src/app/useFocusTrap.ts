import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab within `containerRef` while `active`, and restores
 * focus to whatever was focused before the trap engaged once it releases.
 *
 * Used by the quest encounter and the completion dialog — both are true
 * modal interruptions, so focus must never silently leak to the page behind
 * them.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusFirst = (): void => {
      const first = container?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    };

    // Deferred so content that renders after the initial paint (staged
    // reveals) is present by the time we look for a focus target.
    const raf = window.requestAnimationFrame(focusFirst);

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Tab' || !container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeydown);
      previouslyFocused?.focus();
    };
  }, [active, containerRef]);
}
