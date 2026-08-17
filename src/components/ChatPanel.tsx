import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ChatPanelProps {
  userId: string;
  onClose: () => void;
}

export default function ChatPanel({ userId, onClose }: ChatPanelProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
      
      const messageSubscription = supabase
        .channel(`public:messages`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `sender_id=eq.${selectedFriend.id}` // only listen to incoming from them (or we can just listen to all and filter)
          }, (payload) => {
          // If the message is between us and the selected friend
          const msg = payload.new as any;
          if ((msg.sender_id === selectedFriend.id && msg.receiver_id === userId) ||
              (msg.sender_id === userId && msg.receiver_id === selectedFriend.id)) {
             setMessages(prev => [...prev, msg]);
             scrollToBottom();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
      };
    }
  }, [selectedFriend, userId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchFriends = async () => {
    const { data: friendships } = await supabase
      .from('friends')
      .select(`
        *,
        user:profiles!friends_user_id_fkey(id, spidey_id, display_name, avatar_url),
        friend:profiles!friends_friend_id_fkey(id, spidey_id, display_name, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (friendships) {
      const friendList = friendships.map(f => {
        const isSender = f.user_id === userId;
        return isSender ? f.friend : f.user;
      });
      setFriends(friendList);
    }
  };

  const fetchMessages = async (friendId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(50);
      
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;

    const msgText = newMessage;
    setNewMessage(''); // optimistic clear
    
    // Optimistic UI update
    const tempMsg = {
      id: Math.random().toString(),
      sender_id: userId,
      receiver_id: selectedFriend.id,
      content: msgText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: selectedFriend.id,
      content: msgText
    });
  };

  return (
    <div className="pixel-ui" style={{ zIndex: 2000, width: '600px', height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--neon-red)' }}>COMM-LINK</h2>
        <button className="hud-btn" onClick={onClose}>X</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px' }}>
        {/* Friends List */}
        <div style={{ width: '200px', borderRight: '2px solid var(--device-border)', overflowY: 'auto', paddingRight: '8px' }}>
          {friends.length === 0 ? (
            <div style={{ fontSize: '10px', color: '#777' }}>NO CONTACTS</div>
          ) : (
            friends.map(friend => (
              <div 
                key={friend.id} 
                onClick={() => setSelectedFriend(friend)}
                style={{ 
                  padding: '8px', 
                  backgroundColor: selectedFriend?.id === friend.id ? 'var(--btn-bg-light)' : '#111', 
                  border: '1px solid #333', 
                  marginBottom: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>?</div>
                )}
                <div style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {friend.display_name || friend.spidey_id}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedFriend ? (
            <>
              <div style={{ padding: '8px', borderBottom: '2px solid #333', fontSize: '12px', color: 'var(--btn-bg-orange)' }}>
                CHAT WITH {selectedFriend.display_name || selectedFriend.spidey_id}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map(msg => {
                  const isMe = msg.sender_id === userId;
                  return (
                    <div key={msg.id} style={{ 
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      backgroundColor: isMe ? 'var(--btn-bg-light)' : '#222',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      maxWidth: '80%',
                      border: `1px solid ${isMe ? 'var(--spider-cyan, #0ff)' : '#555'}`
                    }}>
                      <div style={{ fontSize: '12px', color: '#fff', wordBreak: 'break-word' }}>{msg.content}</div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="text" 
                  className="pixel-input" 
                  placeholder="MESSAGE..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                />
                <button type="submit" className="pixel-btn primary" style={{ padding: '8px' }}>SEND</button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#777' }}>
              SELECT A CONTACT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
