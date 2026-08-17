-- Create the sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (allows read/write without auth for this phase)
CREATE POLICY "Allow anonymous SELECT on sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous INSERT on sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous UPDATE on sessions" ON sessions FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous SELECT on locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous INSERT on locations" ON locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous UPDATE on locations" ON locations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous DELETE on locations" ON locations FOR DELETE USING (true);
