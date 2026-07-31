import { useCallback, useState } from 'react';
import { hospitalService } from '@/services/hospitalService';
import { Hospital } from '@/shared/types';

const GEOLOCATION_TIMEOUT_MS = 5000;

export type HospitalDetectStatus = 'idle' | 'detecting' | 'found' | 'denied' | 'no-match' | 'error';

// GPS chỉ là fallback phụ cho luồng "mở app lạnh" (chưa quét QR nào)
// Gọi API backend để lấy bệnh viện gần nhất dựa trên tọa độ GPS.
export function useHospitalDetect() {
  const [status, setStatus] = useState<HospitalDetectStatus>('idle');
  const [detected, setDetected] = useState<Hospital | null>(null);

  const detect = useCallback(async (): Promise<Hospital | null> => {
    setStatus('detecting');
    setDetected(null);

    if (!('geolocation' in navigator)) {
      setStatus('error');
      return null;
    }

    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: 60000,
        });
      });
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      setStatus(geoErr?.code === geoErr?.PERMISSION_DENIED ? 'denied' : 'error');
      return null;
    }

    try {
      const { latitude, longitude } = position.coords;
      const closest = await hospitalService.getNearbyHospital(latitude, longitude);

      if (closest) {
        setDetected(closest);
        setStatus('found');
        return closest;
      } else {
        setStatus('no-match');
        return null;
      }
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  return { status, detected, detect };
}
