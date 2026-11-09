import { useCallback, useRef, useState } from "react";

/**
 * A value that is both state (for rendering) and a ref (for synchronous reads
 * in event handlers right after it was set, before React re-renders).
 *
 * Render reads `value` (a plain ref would not re-render the view); handlers
 * that must see a just-made change read `ref.current`. `set` updates both.
 */
export function useRefState<T>(initial: T | (() => T)) {
  const [value, setValue] = useState<T>(initial);
  const ref = useRef<T>(value);
  const set = useCallback((next: T) => {
    ref.current = next;
    setValue(next);
  }, []);
  return [ref, value, set] as const;
}
