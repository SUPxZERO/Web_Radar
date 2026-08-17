export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // UUID
          spidey_id: string;
          display_name: string | null;
          avatar_color: string;
          created_at: string;
        };
        Insert: {
          id: string;
          spidey_id: string;
          display_name?: string | null;
          avatar_color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          spidey_id?: string;
          display_name?: string | null;
          avatar_color?: string;
          created_at?: string;
        };
      };
      friends: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
        };
      };
      locations: {
        Row: {
          id: string; // UUID
          user_id: string;
          lat: number;
          lng: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lat: number;
          lng: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lat?: number;
          lng?: number;
          updated_at?: string;
        };
      };
    };
  };
}
