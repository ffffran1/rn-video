import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Visibilidad de los controles: se muestran al interactuar y se ocultan tras
 * `timeout` ms mientras `canHide` sea `true` (p. ej. reproduciendo).
 */
export function useAutoHide(timeout: number, canHide: boolean) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clear();
    if (canHide && timeout > 0) {
      timer.current = setTimeout(() => setVisible(false), timeout);
    }
  }, [canHide, clear, timeout]);

  const show = useCallback(() => {
    setVisible(true);
    schedule();
  }, [schedule]);

  const hide = useCallback(() => {
    clear();
    setVisible(false);
  }, [clear]);

  const toggle = useCallback(() => {
    setVisible((prev) => {
      if (prev) {
        clear();
        return false;
      }
      return true;
    });
  }, [clear]);

  useEffect(() => {
    if (!canHide) {
      clear();
      setVisible(true);
    } else if (visible) {
      schedule();
    }
    return clear;
  }, [canHide, visible, schedule, clear]);

  return { visible, show, hide, toggle, keepAlive: schedule };
}
