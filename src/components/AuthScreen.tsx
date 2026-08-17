import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLogin: (session: any) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom spidey id and display name for sign up
  const [spideyId, setSpideyId] = useState('');
  const [displayName, setDisplayName] = useState('');

  const generateSpideyId = () => {
    return 'SPIDER-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().replace(/\s+/g, ''),
          password
        });
        if (authError) throw authError;
        onLogin(data.session);
      } else {
        // Validation for signup
        if (!spideyId.trim()) {
           throw new Error("Spidey ID is required.");
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim().replace(/\s+/g, ''),
          password
        });
        
        if (authError) throw authError;

        // Check if user is created
        if (data.user) {
           // Insert profile
           const { error: profileError } = await supabase
             .from('profiles')
             .insert({
                id: data.user.id,
                spidey_id: spideyId,
                display_name: displayName,
             });
             
           if (profileError) {
             console.error("Profile creation error: ", profileError);
             throw new Error("Account created but failed to set up profile. Try logging in.");
           }
        }
        
        if (data.session) {
           onLogin(data.session);
        } else {
           setError("Registration successful! Please check your email to verify your account.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-container halftone-bg">
      <div className="landing-content">
        <h1 className="landing-title glitch-text">SPIDEY TRACKER</h1>
        
        {error && <div className="error-message">ERROR: {error}</div>}

        <div className="action-section">
          <form onSubmit={handleAuth} className="join-form">
            {!isLogin && (
              <>
                <input 
                  type="text" 
                  className="pixel-input" 
                  placeholder="SPIDEY ID" 
                  value={spideyId}
                  onChange={(e) => setSpideyId(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  required
                />
                <button type="button" className="hud-btn" onClick={() => setSpideyId(generateSpideyId())} style={{marginTop: '-10px', marginBottom: '10px'}}>GENERATE ID</button>
                <input 
                  type="text" 
                  className="pixel-input" 
                  placeholder="DISPLAY NAME" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                />
              </>
            )}
            
            <input 
              type="email" 
              className="pixel-input" 
              placeholder="EMAIL" 
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
              disabled={isLoading}
              required
            />
            <input 
              type="password" 
              className="pixel-input" 
              placeholder="PASSWORD" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            
            <button 
              type="submit" 
              className="pixel-btn primary"
              disabled={isLoading}
            >
              {isLoading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'REGISTER')}
            </button>
          </form>
        </div>

        <div className="divider">-- OR --</div>

        <button 
          className="pixel-btn"
          onClick={() => setIsLogin(!isLogin)}
          disabled={isLoading}
          style={{ width: '100%' }}
        >
          {isLogin ? 'CREATE ACCOUNT' : 'BACK TO LOGIN'}
        </button>
      </div>
    </div>
  );
}
