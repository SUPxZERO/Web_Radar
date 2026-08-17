import { useState, useEffect } from 'react';

export interface LocationData {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('ERROR: GEOLOCATION NOT SUPPORTED BY BROWSER');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('ERROR: GPS SIGNAL LOST / PERMISSION DENIED');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('ERROR: GPS POSITION UNAVAILABLE');
            break;
          case err.TIMEOUT:
            setError('ERROR: GPS REQUEST TIMED OUT');
            break;
          default:
            setError('ERROR: UNKNOWN GPS FAILURE');
            break;
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { location, loading, error };
}
