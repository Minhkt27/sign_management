import { useState, useEffect, useCallback, useRef } from 'react';

export type CompassPermission = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export interface CompassHeading {
  heading: number | null;        // 0-360, độ từ Bắc, chiều kim đồng hồ
  permissionState: CompassPermission;
  active: boolean;
  requestAndStart: () => Promise<void>;
  stop: () => void;
}

export function useCompassHeading(): CompassHeading {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<CompassPermission>('unknown');
  const [active, setActive] = useState(false);
  const listenersRef = useRef<{ absolute: boolean }>({ absolute: false });

  const supported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let h: number | null = null;

    // iOS: webkitCompassHeading là hướng thực (0 = Bắc, chiều kim đồng hồ)
    const webkit = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
      .webkitCompassHeading;
    if (webkit != null && webkit >= 0) {
      h = webkit;
    } else if (event.alpha != null) {
      // Android deviceorientationabsolute: alpha tăng ngược chiều kim đồng hồ → đổi dấu
      h = (360 - event.alpha % 360) % 360;
    }

    if (h != null) setHeading(Math.round(h));
  }, []);

  const stop = useCallback(() => {
    window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener);
    window.removeEventListener('deviceorientation', handleOrientation as EventListener);
    listenersRef.current.absolute = false;
    setActive(false);
    setHeading(null);
  }, [handleOrientation]);

  const requestAndStart = useCallback(async () => {
    if (!supported) {
      setPermissionState('unsupported');
      return;
    }
    if (active) { stop(); return; }

    setPermissionState('requesting');
    try {
      // iOS 13+ yêu cầu xin quyền explicit
      const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DOE.requestPermission === 'function') {
        const result = await DOE.requestPermission();
        if (result !== 'granted') {
          setPermissionState('denied');
          return;
        }
      }

      setPermissionState('granted');
      setActive(true);

      // Ưu tiên deviceorientationabsolute (Android Chrome ≥ 65) — tham chiếu từ Bắc thực
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener);
      // Fallback deviceorientation cho iOS và Android cũ
      window.addEventListener('deviceorientation', handleOrientation as EventListener);
    } catch {
      setPermissionState('denied');
    }
  }, [supported, active, stop, handleOrientation]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener);
    };
  }, [handleOrientation]);

  if (!supported) {
    return {
      heading: null,
      permissionState: 'unsupported',
      active: false,
      requestAndStart: async () => {},
      stop: () => {},
    };
  }

  return { heading, permissionState, active, requestAndStart, stop };
}
