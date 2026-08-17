import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useNetworkState(sessionId: string | undefined) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);

  useEffect(() => {
    // 1. Listen for browser online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Listen to Supabase Realtime Channel state
    let channel: any;
    if (sessionId) {
      channel = supabase.channel(`session_monitor_${sessionId}`);
      
      channel.subscribe((status: string) => {
        console.log("Supabase Realtime Status:", status);
        if (status === 'SUBSCRIBED') {
          setIsSupabaseConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsSupabaseConnected(false);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (channel) supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return {
    isOnline,
    isSupabaseConnected,
    isDisconnected: !isOnline || !isSupabaseConnected
  };
}
