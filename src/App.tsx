import { useState, useEffect } from 'react';
import Map from './components/Map';
import AuthScreen from './components/AuthScreen';
import FriendsPanel from './components/FriendsPanel';
import InteractionOverlay from './components/InteractionOverlay';
import ProfileModal from './components/ProfileModal';
import ChatPanel from './components/ChatPanel';
import { useNetworkState } from './hooks/useNetworkState';
import { useTheme } from './components/ThemeContext';
import { supabase } from './lib/supabase';

function App() {
  const [session, setSession] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Use the network hook, passing the user ID if we have one
  const { isDisconnected } = useNetworkState(session?.user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {theme === 'retro' && <div className="crt-overlay"></div>}
      
      {/* Edge case: Global Warning UI for Network Disconnects */}
      {isDisconnected && (
        <div className="network-warning">
          <span className="blink-text">CONNECTION LOST - RECONNECTING...</span>
        </div>
      )}
      
      <div className="device-frame">
        {session ? (
          <>
            <div className="map-wrapper">
              <Map userId={userId} />
              
              {/* Overlays that sit directly on top of the map but under HUD panels */}
              <div className="map-grid-overlay"></div>
              <div className="radar-sweep"></div>
            </div>

            <div className="hud-overlay" style={{ pointerEvents: 'none' }}>
              <InteractionOverlay userId={userId} />
            </div>

            {/* Friends Panel Modal */}
            {showFriends && (
              <FriendsPanel userId={userId} onClose={() => setShowFriends(false)} />
            )}

            {/* Profile Modal */}
            {showProfile && (
              <ProfileModal userId={userId} onClose={() => setShowProfile(false)} />
            )}

            {/* Chat Panel */}
            {showChat && (
              <ChatPanel userId={userId} onClose={() => setShowChat(false)} />
            )}

            {/* HUD Overlays */}
            <div className="hud-panel top-banner glitch-text">
              {theme === 'retro' ? 'SPIDEY TRACKER ACTIVE - MONITORING VICINITY' : 'AMO MAP - LIVE LOCATIONS'}
            </div>

            <div className="hud-panel left-toolbar">
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-red)' }}>D</button>
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-red)' }}>S</button>
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-red)' }} onClick={toggleTheme}>T</button>
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-red)' }} onClick={handleLogout}>Q</button>
            </div>

            <div className="spidey-icon-bottom-left">
              <div className="spidey-marker-base spidey-marker-local"></div>
            </div>

            <div className="hud-panel bottom-controls">
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-light)' }}>p1</button>
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-light)' }} onClick={() => setShowProfile(!showProfile)}>PROFILE</button>
              <button className="hud-btn primary" onClick={() => setShowFriends(!showFriends)}>FRIENDS</button>
              
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-red)' }}>p2</button>
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-light)' }}>PROF 2</button>
              <button className="hud-btn primary" onClick={() => setShowChat(!showChat)}>CHAT</button>
              
              <button className="hud-btn" style={{ visibility: 'hidden' }}>x</button>
              <button className="hud-btn" style={{ backgroundColor: 'var(--btn-bg-light)' }}>PROF 3</button>
              <button className="hud-btn primary">CENTER LOC</button>
            </div>

            <div className="hud-panel top-right-stats">
              <div className="stat-row">
                <span>BATTERY</span>
                <span style={{ color: 'var(--neon-red)' }}>♥ 4</span>
              </div>
              <div className="stat-row">
                <span>X: 2026</span>
              </div>
              <div className="stat-row">
                <span>Y: 0802</span>
              </div>
              <div className="stat-row" style={{ marginTop: '8px', color: 'var(--neon-red)' }}>
                USER: {userId.substring(0,6)}
              </div>
            </div>
          </>
        ) : (
          <AuthScreen onLogin={setSession} />
        )}
      </div>
    </>
  );
}

export default App;
