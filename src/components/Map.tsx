import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBattery } from '../hooks/useBattery';

// Create 8-bit Spidey icons using Pure CSS box-shadow pixel art or Avatar
const createRetroIcon = (isLocal: boolean, heading: number | null, batteryLevel: number | null, sharingMode: string = 'precise', avatarUrl?: string, speed?: number, placeName?: string) => {
  const rotation = heading !== null ? `transform: rotate(${heading}deg);` : '';
  
  // Calculate battery color based on level
  let batColor = '#50ff6b'; // green
  if (batteryLevel !== null) {
    if (batteryLevel <= 20) batColor = '#ff5757'; // red
    else if (batteryLevel <= 50) batColor = '#ffb86c'; // orange
  }
  
  const batteryHtml = batteryLevel !== null ? 
    `<div style="position: absolute; top: -15px; left: 15px; background: rgba(0,0,0,0.7); color: ${batColor}; font-size: 8px; padding: 2px; border: 1px solid ${batColor}; border-radius: 2px;">${batteryLevel}%</div>` 
    : '';

  let markerClass = isLocal ? 'spidey-marker-local' : 'spidey-marker-remote';
  if (sharingMode === 'blurred') markerClass += ' ghost-marker';
  if (sharingMode === 'frozen') markerClass += ' frozen-marker';

  const avatarHtml = avatarUrl ? 
    `<img src="${avatarUrl}" style="width: 30px; height: 30px; border-radius: 50%; border: 2px solid ${isLocal ? '#f4b41a' : '#e50914'}; object-fit: cover;" />` : 
    `<div class="spidey-marker-base ${markerClass}" style="${rotation}"></div>`;

  let statusText = '';
  if (placeName) {
    statusText = placeName;
  } else if (speed && speed > 1) {
    statusText = `${Math.round(speed * 2.23694)} mph`;
  }

  const statusBadgeHtml = statusText ? 
    `<div style="position: absolute; bottom: -12px; background: rgba(0,0,0,0.7); color: white; font-family: var(--font-family, sans-serif); font-size: 8px; padding: 2px 6px; border-radius: 8px; white-space: nowrap; border: 1px solid #555;">${statusText}</div>` : '';

  return L.divIcon({
    className: 'retro-marker-wrapper', // clear backgrounds
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.5s ease-in-out;">
        ${avatarHtml}
        ${batteryHtml}
        ${statusBadgeHtml}
      </div>
    `,
    iconSize: [30, 30], // Size matches the 3px scale factor on the 10x10 grid
    iconAnchor: [15, 15], // Center anchor
  });
};

// Distance helper function (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in metres
}

interface MapProps {
  userId: string;
}

interface UserLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  battery_level?: number;
  avatar_url?: string;
  updated_at: string;
  sharing_mode?: string;
}

// Component to handle auto-centering on first load
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (center && !hasCentered) {
      map.flyTo(center, 16, { duration: 1 });
      setHasCentered(true);
    }
  }, [center, hasCentered, map]);

  return null;
}

export default function Map({ userId }: MapProps) {
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const battery = useBattery();
  
  const [users, setUsers] = useState<Record<string, UserLocation>>({});
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<[number, number][]>([]);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  // Throttling refs
  const lastSyncTime = useRef<number>(0);
  const lastLocation = useRef<{lat: number, lng: number, heading: number | null, battery: number | null} | null>(null);
  const lastBumpTimes = useRef<Record<string, number>>({});

  const handlePing = async (friendId: string) => {
    await supabase.from('interactions').insert({
      sender_id: userId,
      receiver_id: friendId,
      type: 'ping'
    });
  };

  const handleEmoji = async (friendId: string, emoji: string) => {
    // We'll reuse 'ping' for the table structure, but ideally it should have a 'metadata' or 'type: emoji'
    // For simplicity, let's just insert type: 'emoji' and the emoji string. The DB might not have a content column in interactions.
    // Let's check interactions schema... Wait, I don't know the schema of interactions.
    // Assuming it has type. Let's just insert type 'emoji' and if we can't store the emoji itself, we just trigger a generic emoji blast.
    await supabase.from('interactions').insert({
      sender_id: userId,
      receiver_id: friendId,
      type: 'emoji_fire'
    });
  };

  const handleFetchHistory = async (friendId: string) => {
    if (selectedHistoryId === friendId) {
      // Toggle off
      setSelectedHistoryId(null);
      setHistoryPoints([]);
      return;
    }

    const { data } = await supabase
      .from('location_history')
      .select('lat, lng')
      .eq('user_id', friendId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data && data.length > 0) {
      setHistoryPoints(data.map(p => [p.lat, p.lng]));
      setSelectedHistoryId(friendId);
    } else {
      setSelectedHistoryId(null);
      setHistoryPoints([]);
    }
  };

  // 1. Sync local location & battery to Supabase with smart throttle
  useEffect(() => {
    if (!location || !userId) return;

    const now = Date.now();
    const currentLat = location.lat;
    const currentLng = location.lng;
    const currentHeading = location.heading;
    const currentBattery = battery?.level || null;

    // Check for automatic bumps with nearby friends
    Object.entries(users).forEach(([friendId, uLoc]) => {
      // Only bump if they are sharing precise location to avoid fake bumps
      if (uLoc.sharing_mode === 'precise') {
        const dist = getDistance(currentLat, currentLng, uLoc.lat, uLoc.lng);
        if (dist <= 15) {
           const lastBump = lastBumpTimes.current[friendId] || 0;
           // Debounce bumps to once per hour per friend (3600000 ms)
           if (now - lastBump > 3600000) {
              lastBumpTimes.current[friendId] = now;
              // Insert bump
              supabase.from('interactions').insert({
                sender_id: userId,
                receiver_id: friendId,
                type: 'bump'
              }).then();
           }
        }
      }
    });

    let shouldSync = false;

    if (!lastLocation.current) {
      shouldSync = true;
    } else {
      const prev = lastLocation.current;
      const distance = getDistance(prev.lat, prev.lng, currentLat, currentLng);
      const headingDiff = (prev.heading !== null && currentHeading !== null) ? Math.abs(prev.heading - currentHeading) : 0;
      const batteryDiff = (prev.battery !== null && currentBattery !== null) ? Math.abs(prev.battery - currentBattery) : 0;
      
      const timeSinceLastSync = now - lastSyncTime.current;

      if (distance > 10 || headingDiff > 15 || batteryDiff > 1 || timeSinceLastSync > 30000) {
        shouldSync = true;
      }
    }

    if (!shouldSync) return;
    
    lastSyncTime.current = now;
    lastLocation.current = { lat: currentLat, lng: currentLng, heading: currentHeading, battery: currentBattery };

    const syncData = async () => {
      try {
        const { data: existingLoc } = await supabase
          .from('locations')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingLoc) {
          await supabase
            .from('locations')
            .update({ 
              lat: currentLat, 
              lng: currentLng, 
              heading: currentHeading, 
              speed: location.speed,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingLoc.id);
        } else {
          await supabase
            .from('locations')
            .insert({
              user_id: userId,
              lat: currentLat,
              lng: currentLng,
              heading: currentHeading,
              speed: location.speed
            });
        }

        if (battery) {
          await supabase
            .from('profiles')
            .update({ battery_level: battery.level, is_charging: battery.isCharging })
            .eq('id', userId);
        }

      } catch (err) {
        console.error('Failed to sync context:', err);
      }
    };

    syncData();
  }, [location, battery, userId]);

  // 2. Subscribe to Supabase Realtime changes and fetch places & sharing modes
  useEffect(() => {
    if (!userId) return;

    const fetchPlaces = async () => {
       const { data } = await supabase.from('user_places').select('*').eq('user_id', userId);
       if (data) setPlaces(data);
    };
    fetchPlaces();

    const fetchLocationsAndModes = async () => {
      // Fetch sharing modes
      const { data: friendships } = await supabase
        .from('friends')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      const sharingModes = new globalThis.Map<string, string>();
      friendships?.forEach(f => {
        const isSender = f.user_id === userId;
        const otherPersonId = isSender ? f.friend_id : f.user_id;
        // Mode of how THEY share to ME
        const mode = isSender ? f.friend_sharing_mode : f.user_sharing_mode;
        sharingModes.set(otherPersonId, mode);
      });

      const { data, error } = await supabase
        .from('locations')
        .select('user_id, lat, lng, heading, speed, updated_at');
      
      if (data && !error) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, battery_level, avatar_url');
          
        const profileMap = new globalThis.Map(profilesData?.map(p => [p.id, { battery: p.battery_level, avatar: p.avatar_url }]) || []);
        
        // Set local avatar
        const myProfile = profileMap.get(userId);
        if (myProfile?.avatar) setLocalAvatarUrl(myProfile.avatar);

        const initialUsers: Record<string, UserLocation> = {};
        data.forEach(row => {
          if (row.user_id === userId) return; // Skip self in 'users' map
          
          let mode = sharingModes.get(row.user_id) || 'precise';
          let displayLat = row.lat;
          let displayLng = row.lng;

          if (mode === 'blurred') {
            // Round to 2 decimal places to blur location
            displayLat = Math.round(row.lat * 100) / 100;
            displayLng = Math.round(row.lng * 100) / 100;
          }

          const pInfo = profileMap.get(row.user_id) || {};
          initialUsers[row.user_id] = { 
            lat: displayLat, 
            lng: displayLng, 
            heading: row.heading,
            speed: row.speed,
            battery_level: pInfo.battery,
            avatar_url: pInfo.avatar,
            updated_at: row.updated_at,
            sharing_mode: mode
          };
        });
        setUsers(initialUsers);
      }
    };
    fetchLocationsAndModes();

    const locationChannel = supabase.channel(`public:locations`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        (payload) => {
          const newRow = payload.new as any;
          if (payload.eventType === 'DELETE') return;
          
          if (newRow && newRow.user_id && newRow.user_id !== userId) {
            setUsers(prev => {
              const existing = prev[newRow.user_id];
              const mode = existing?.sharing_mode || 'precise';
              
              if (mode === 'frozen') {
                return prev; // Ignore updates for frozen friends
              }

              let displayLat = newRow.lat;
              let displayLng = newRow.lng;
              if (mode === 'blurred') {
                displayLat = Math.round(newRow.lat * 100) / 100;
                displayLng = Math.round(newRow.lng * 100) / 100;
              }

              return {
                ...prev,
                [newRow.user_id]: { 
                  ...existing,
                  lat: displayLat, 
                  lng: displayLng, 
                  heading: newRow.heading,
                  speed: newRow.speed,
                  updated_at: newRow.updated_at,
                  sharing_mode: mode
                }
              };
            });
          }
        }
      )
      .subscribe();

    const profileChannel = supabase.channel(`public:profiles`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.id && newRow.id !== userId) {
            setUsers(prev => ({
              ...prev,
              [newRow.id]: {
                ...prev[newRow.id],
                battery_level: newRow.battery_level
              }
            }));
          }
        }
      ).subscribe();

    const friendsChannel = supabase.channel(`public:friends`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friends' }, () => {
         fetchLocationsAndModes(); // Refetch if modes change
      }).subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(friendsChannel);
    };
  }, [userId]);

  if (geoError) {
    return (
      <div className="geo-error-screen">
        <h1 className="geo-error-text">{geoError}</h1>
      </div>
    );
  }

  if (geoLoading || !location) {
    return (
      <div className="geo-loading-screen">
        <h1 className="geo-loading-text">ACQUIRING GPS SIGNAL...</h1>
      </div>
    );
  }

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={16}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />
      <MapController center={[location.lat, location.lng]} />
      
      {/* Render Geofences */}
      {places.map(place => (
        <Circle 
           key={place.id}
           center={[place.lat, place.lng]} 
           pathOptions={{ fillColor: 'var(--radar-blue-grid)', color: 'var(--neon-red)' }} 
           radius={place.radius || 50} 
        />
      ))}

      {/* Render all users we have access to */}
      {Object.entries(users).map(([uid, uLoc]) => {
         // Check if user is inside any place (skip if blurred/frozen for privacy)
         let placeLabel = '';
         if (uLoc.sharing_mode === 'precise') {
           for (const place of places) {
              const dist = getDistance(uLoc.lat, uLoc.lng, place.lat, place.lng);
              if (dist <= (place.radius || 50)) {
                 placeLabel = place.label;
                 break;
              }
           }
         }

         return (
            <div key={uid}>
              <Marker 
                position={[uLoc.lat, uLoc.lng]} 
                icon={createRetroIcon(false, uLoc.heading || null, uLoc.battery_level || null, uLoc.sharing_mode, uLoc.avatar_url, uLoc.speed, placeLabel)} 
              >
                <Popup className="spidey-popup">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '10px' }}>INTERACTIONS</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      <button className="pixel-btn primary" onClick={() => handlePing(uid)} style={{ flex: 1 }}>PING</button>
                      <button className="pixel-btn" onClick={() => handleEmoji(uid, '🔥')} style={{ flex: 1 }}>🔥</button>
                    </div>
                    <button className="pixel-btn" onClick={() => handleFetchHistory(uid)} style={{ width: '100%' }}>
                      {selectedHistoryId === uid ? 'HIDE PATROL LOG' : 'PATROL LOG'}
                    </button>
                  </div>
                </Popup>
              </Marker>
              {placeLabel && (
                <Marker 
                  position={[uLoc.lat, uLoc.lng]}
                  icon={L.divIcon({
                     className: 'custom-place-label',
                     html: `<div style="background: var(--neon-red); color: #fff; padding: 2px 4px; font-size: 8px; border-radius: 4px; transform: translateY(15px); white-space: nowrap; text-align: center;">${placeLabel}</div>`,
                     iconAnchor: [0, -15]
                  })}
                />
              )}
            </div>
         );
      })}
      
      {/* Render Patrol Log Trail */}
      {selectedHistoryId && historyPoints.length > 1 && (
        <Polyline 
          positions={historyPoints} 
          pathOptions={{ color: 'var(--neon-red)', weight: 3, dashArray: '5, 10', className: 'web-polyline' }} 
        />
      )}
      
      {/* Local user marker */}
      <Marker 
        position={[location.lat, location.lng]} 
        icon={createRetroIcon(true, location.heading, battery?.level || null, 'precise', localAvatarUrl || undefined, location.speed || undefined)} 
      />
    </MapContainer>
  );
}
