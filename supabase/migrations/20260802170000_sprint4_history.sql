-- Create location_history table
CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own history" ON location_history FOR INSERT WITH CHECK (auth.uid() = user_id);
-- A user can read history of their accepted friends
CREATE POLICY "Users can read friends history" ON location_history FOR SELECT USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT friend_id FROM friends WHERE user_id = auth.uid() AND status = 'accepted'
    UNION
    SELECT user_id FROM friends WHERE friend_id = auth.uid() AND status = 'accepted'
  )
);

-- Create Haversine distance function in PL/pgSQL
CREATE OR REPLACE FUNCTION get_haversine_distance(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371e3; -- Earth radius in meters
  phi1 DOUBLE PRECISION;
  phi2 DOUBLE PRECISION;
  dphi DOUBLE PRECISION;
  dlam DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  phi1 := lat1 * pi() / 180;
  phi2 := lat2 * pi() / 180;
  dphi := (lat2 - lat1) * pi() / 180;
  dlam := (lon2 - lon1) * pi() / 180;

  a := sin(dphi / 2) * sin(dphi / 2) +
       cos(phi1) * cos(phi2) *
       sin(dlam / 2) * sin(dlam / 2);
  
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create Trigger Function to smart archive history
CREATE OR REPLACE FUNCTION archive_location_history()
RETURNS TRIGGER AS $$
DECLARE
  last_record location_history%ROWTYPE;
  dist DOUBLE PRECISION;
  time_diff INTERVAL;
BEGIN
  -- Get the last history point for this user
  SELECT * INTO last_record
  FROM location_history
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no history exists, insert the first one
  IF NOT FOUND THEN
    INSERT INTO location_history (user_id, lat, lng, speed, created_at)
    VALUES (NEW.user_id, NEW.lat, NEW.lng, NEW.speed, NEW.updated_at);
    RETURN NEW;
  END IF;

  -- Calculate distance and time difference
  dist := get_haversine_distance(NEW.lat, NEW.lng, last_record.lat, last_record.lng);
  time_diff := NEW.updated_at - last_record.created_at;

  -- Insert if moved more than 50 meters OR 15 minutes have passed
  IF dist > 50 OR time_diff > interval '15 minutes' THEN
    INSERT INTO location_history (user_id, lat, lng, speed, created_at)
    VALUES (NEW.user_id, NEW.lat, NEW.lng, NEW.speed, NEW.updated_at);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to locations table
CREATE TRIGGER trigger_archive_location
AFTER INSERT OR UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION archive_location_history();
