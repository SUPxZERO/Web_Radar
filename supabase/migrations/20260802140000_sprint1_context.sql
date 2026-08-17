-- Add battery tracking to profiles
ALTER TABLE profiles ADD COLUMN battery_level INT;
ALTER TABLE profiles ADD COLUMN is_charging BOOLEAN;

-- Add heading and speed to locations
ALTER TABLE locations ADD COLUMN heading FLOAT;
ALTER TABLE locations ADD COLUMN speed FLOAT;

-- Create user_places table
CREATE TABLE user_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  radius INT NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_places
ALTER TABLE user_places ENABLE ROW LEVEL SECURITY;

-- Policies for user_places
CREATE POLICY "Users can view their own places" ON user_places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own places" ON user_places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own places" ON user_places FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own places" ON user_places FOR DELETE USING (auth.uid() = user_id);
