-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  spidey_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_color TEXT DEFAULT '#ff5757',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friends table
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Modify locations table to tie it to profiles instead of sessions
-- We will just drop the old one and recreate it for simplicity, since it's a demo
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view all profiles for adding friends" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Friends Policies
CREATE POLICY "Users can view their friendships" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can insert friendships" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own friendships" ON friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete their own friendships" ON friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Locations Policies
CREATE POLICY "Users can update their own location" ON locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own location" ON locations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own location, AND locations of friends where status is accepted
CREATE POLICY "Users can view friends locations" ON locations FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM friends 
    WHERE status = 'accepted' AND 
    ((friends.user_id = auth.uid() AND friends.friend_id = locations.user_id) OR 
     (friends.friend_id = auth.uid() AND friends.user_id = locations.user_id))
  )
);
