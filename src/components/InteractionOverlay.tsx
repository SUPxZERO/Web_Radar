import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface InteractionOverlayProps {
  userId: string;
}

export default function InteractionOverlay({ userId }: InteractionOverlayProps) {
  const [activeEffect, setActiveEffect] = useState<'ping' | 'bump' | 'sos' | 'emoji_fire' | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('public:interactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload) => {
          const newInteraction = payload.new as any;
          if (newInteraction.receiver_id === userId || newInteraction.sender_id === userId) {
            
            // Only trigger effects if we received a ping/sos, or if we are involved in a bump
            if (newInteraction.type === 'ping' && newInteraction.receiver_id === userId) {
               triggerEffect('ping');
            } else if (newInteraction.type === 'bump') {
               triggerEffect('bump');
            } else if (newInteraction.type === 'sos' && newInteraction.receiver_id === userId) {
               triggerEffect('sos');
            } else if (newInteraction.type === 'emoji_fire' && newInteraction.receiver_id === userId) {
               triggerEffect('emoji_fire');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const triggerEffect = (type: 'ping' | 'bump' | 'sos' | 'emoji_fire') => {
    setActiveEffect(type);
    
    // Auto-hide effect after 3 seconds
    setTimeout(() => {
      setActiveEffect(null);
    }, 3000);
  };

  if (!activeEffect) return null;

  return (
    <div className={`interaction-overlay effect-${activeEffect}`}>
       {activeEffect === 'ping' && <div className="effect-text">SPIDER-SENSE TINGLING!</div>}
       {activeEffect === 'bump' && <div className="effect-text">FIST BUMP! 👊</div>}
       {activeEffect === 'sos' && <div className="effect-text" style={{color: 'red'}}>🚨 SOS DISTRESS 🚨</div>}
       {activeEffect === 'emoji_fire' && <div className="effect-text emoji-blast" style={{fontSize: '64px'}}>🔥🔥🔥</div>}
    </div>
  );
}
