import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a drawer, menu, modal, or overlay is open.
 * Prevents scrolling the background content behind the menu.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    // Lock body scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
