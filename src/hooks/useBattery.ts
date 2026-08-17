import { useState, useEffect } from 'react';

export interface BatteryData {
  level: number;
  isCharging: boolean;
}

export function useBattery() {
  const [battery, setBattery] = useState<BatteryData | null>(null);

  useEffect(() => {
    let batteryManager: any = null;

    const updateBatteryInfo = () => {
      if (batteryManager) {
        setBattery({
          level: Math.round(batteryManager.level * 100),
          isCharging: batteryManager.charging,
        });
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bm: any) => {
        batteryManager = bm;
        updateBatteryInfo();

        bm.addEventListener('levelchange', updateBatteryInfo);
        bm.addEventListener('chargingchange', updateBatteryInfo);
      });
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBatteryInfo);
        batteryManager.removeEventListener('chargingchange', updateBatteryInfo);
      }
    };
  }, []);

  return battery;
}
