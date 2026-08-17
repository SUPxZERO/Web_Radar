import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
}

export default function ProfileModal({ userId, onClose }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [spideyId, setSpideyId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('spidey_id, display_name, avatar_url, status_message')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setSpideyId(data.spidey_id);
      setDisplayName(data.display_name || '');
      setAvatarUrl(data.avatar_url);
      setStatusMessage(data.status_message || '');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setMessage('Avatar uploaded successfully. Remember to save!');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          status_message: statusMessage,
        })
        .eq('id', userId);

      if (error) throw error;
      setMessage('Profile updated successfully!');
      
      // Auto close after 1 second if successful
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pixel-ui" style={{ zIndex: 2000, width: '350px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--neon-red)' }}>PROFILE</h2>
        <button className="hud-btn" onClick={onClose}>X</button>
      </div>

      <div style={{ marginBottom: '20px', padding: '8px', border: '2px solid var(--crt-green)' }}>
        <div style={{ fontSize: '10px', color: '#aaa' }}>SPIDEY ID (Unchangeable):</div>
        <div style={{ color: 'var(--btn-bg-orange)', fontSize: '14px', marginTop: '4px' }}>{spideyId || 'LOADING...'}</div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Avatar Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--btn-bg-orange)', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px dashed #555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
              NO PIC
            </div>
          )}
          <label className="pixel-btn" style={{ fontSize: '10px', padding: '6px 12px', cursor: 'pointer' }}>
            {uploading ? 'UPLOADING...' : 'CHANGE AVATAR'}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleUpload} 
              disabled={uploading} 
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div>
          <label style={{ fontSize: '10px', display: 'block', marginBottom: '4px' }}>DISPLAY NAME</label>
          <input 
            type="text" 
            className="pixel-input" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '12px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '10px', display: 'block', marginBottom: '4px' }}>STATUS MESSAGE</label>
          <input 
            type="text" 
            className="pixel-input" 
            placeholder="What's happening?"
            value={statusMessage}
            onChange={(e) => setStatusMessage(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '12px' }}
          />
        </div>

        {error && <div style={{ color: 'var(--neon-red)', fontSize: '10px' }}>{error}</div>}
        {message && <div style={{ color: 'var(--crt-green)', fontSize: '10px' }}>{message}</div>}

        <button type="submit" className="pixel-btn primary" disabled={saving || uploading} style={{ marginTop: '8px' }}>
          {saving ? 'SAVING...' : 'SAVE PROFILE'}
        </button>
      </form>
    </div>
  );
}
