import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FriendsPanelProps {
  userId: string;
  onClose: () => void;
}

export default function FriendsPanel({ userId, onClose }: FriendsPanelProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [addSpideyId, setAddSpideyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mySpideyId, setMySpideyId] = useState<string>('');

  useEffect(() => {
    fetchProfile();
    fetchFriends();

    const friendSubscription = supabase
      .channel('public:friends')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        fetchFriends();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(friendSubscription);
    };
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('spidey_id').eq('id', userId).single();
    if (data) setMySpideyId(data.spidey_id);
  };

  const fetchFriends = async () => {
    const { data: friendships, error } = await supabase
      .from('friends')
      .select(`
        *,
        user:profiles!friends_user_id_fkey(id, spidey_id, display_name, avatar_url),
        friend:profiles!friends_friend_id_fkey(id, spidey_id, display_name, avatar_url)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
      console.error(error);
      return;
    }

    const accepted: any[] = [];
    const pending: any[] = [];

    friendships.forEach(f => {
      const isSender = f.user_id === userId;
      const otherPerson = isSender ? f.friend : f.user;
      
      // Determine sharing modes based on who initiated the request
      const mySharingMode = isSender ? f.user_sharing_mode : f.friend_sharing_mode;
      const theirSharingMode = isSender ? f.friend_sharing_mode : f.user_sharing_mode;
      
      if (f.status === 'accepted') {
        accepted.push({ 
          ...otherPerson, 
          friendshipId: f.id, 
          isSender,
          mySharingMode,
          theirSharingMode
        });
      } else if (f.status === 'pending') {
        if (!isSender) {
          pending.push({ ...otherPerson, friendshipId: f.id });
        }
      }
    });

    setFriends(accepted);
    setPendingRequests(pending);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!addSpideyId.trim()) return;

    if (addSpideyId.toUpperCase() === mySpideyId) {
      setError("You cannot add yourself.");
      return;
    }

    try {
      const { data: friendProfile, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('spidey_id', addSpideyId.toUpperCase())
        .single();

      if (searchError || !friendProfile) {
        throw new Error('Spidey ID not found.');
      }

      const { error: insertError } = await supabase
        .from('friends')
        .insert({
          user_id: userId,
          friend_id: friendProfile.id,
          status: 'pending'
        });

      if (insertError) {
        if (insertError.code === '23505') throw new Error('Friend request already exists.');
        throw insertError;
      }

      setMessage('Friend request sent!');
      setAddSpideyId('');
    } catch (err: any) {
      setError(err.message || 'Failed to add friend.');
    }
  };

  const handleAccept = async (friendshipId: string) => {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchFriends();
  };

  const handleReject = async (friendshipId: string) => {
    await supabase.from('friends').delete().eq('id', friendshipId);
    fetchFriends();
  };

  const handleModeChange = async (friendshipId: string, isSender: boolean, newMode: string) => {
    const updateField = isSender ? 'user_sharing_mode' : 'friend_sharing_mode';
    await supabase.from('friends').update({ [updateField]: newMode }).eq('id', friendshipId);
    fetchFriends();
  };

  return (
    <div className="pixel-ui" style={{ zIndex: 2000, width: '350px', maxHeight: '80vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--neon-red)' }}>FRIENDS</h2>
        <button className="hud-btn" onClick={onClose}>X</button>
      </div>

      <div style={{ marginBottom: '20px', padding: '8px', border: '2px solid var(--crt-green)' }}>
        <div style={{ fontSize: '10px', color: '#aaa' }}>YOUR SPIDEY ID:</div>
        <div style={{ color: 'var(--btn-bg-orange)', fontSize: '14px', marginTop: '4px' }}>{mySpideyId || 'LOADING...'}</div>
      </div>

      <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" 
          className="pixel-input" 
          placeholder="ENTER SPIDEY ID" 
          value={addSpideyId}
          onChange={(e) => setAddSpideyId(e.target.value)}
          style={{ padding: '8px', flex: 1, fontSize: '12px' }}
        />
        <button type="submit" className="pixel-btn primary" style={{ padding: '8px' }}>ADD</button>
      </form>

      {error && <div style={{ color: 'var(--neon-red)', fontSize: '10px', marginBottom: '16px' }}>{error}</div>}
      {message && <div style={{ color: 'var(--crt-green)', fontSize: '10px', marginBottom: '16px' }}>{message}</div>}

      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--btn-bg-orange)', marginBottom: '8px' }}>PENDING REQUESTS</h3>
          {pendingRequests.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#222', marginBottom: '4px' }}>
              <div>
                <div style={{ fontSize: '12px' }}>{req.display_name || 'UNKNOWN'}</div>
                <div style={{ fontSize: '8px', color: '#aaa' }}>{req.spidey_id}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="hud-btn" style={{ backgroundColor: 'var(--crt-green)', padding: '4px' }} onClick={() => handleAccept(req.friendshipId)}>Y</button>
                <button className="hud-btn" style={{ backgroundColor: 'var(--neon-red)', padding: '4px' }} onClick={() => handleReject(req.friendshipId)}>N</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 style={{ fontSize: '12px', color: 'var(--btn-bg-orange)', marginBottom: '8px' }}>FRIEND LIST</h3>
        {friends.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#777' }}>NO FRIENDS ADDED</div>
        ) : (
          friends.map(friend => (
            <div key={friend.id} style={{ padding: '8px', backgroundColor: '#111', border: '1px solid #333', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   {friend.avatar_url ? (
                     <img src={friend.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-red)' }} />
                   ) : (
                     <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#222', border: '1px solid var(--neon-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>?</div>
                   )}
                   <div>
                     <div style={{ fontSize: '12px' }}>{friend.display_name || 'UNKNOWN'}</div>
                     <div style={{ fontSize: '8px', color: '#aaa' }}>{friend.spidey_id}</div>
                   </div>
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                   <div style={{ fontSize: '8px', color: '#777' }}>SHARE MY LOCATION AS:</div>
                   <select 
                      className="pixel-input"
                      style={{ padding: '4px', fontSize: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #555' }}
                      value={friend.mySharingMode || 'precise'}
                      onChange={(e) => handleModeChange(friend.friendshipId, friend.isSender, e.target.value)}
                   >
                     <option value="precise">PRECISE</option>
                     <option value="blurred">BLURRED</option>
                     <option value="frozen">FROZEN</option>
                   </select>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
