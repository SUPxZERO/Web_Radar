-- Create the sharing mode enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE sharing_mode AS ENUM ('precise', 'blurred', 'frozen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add sharing mode columns to the friends table
-- 'user_sharing_mode' dictates how the user_id shares their location with friend_id
ALTER TABLE friends ADD COLUMN user_sharing_mode sharing_mode DEFAULT 'precise';

-- 'friend_sharing_mode' dictates how the friend_id shares their location with user_id
ALTER TABLE friends ADD COLUMN friend_sharing_mode sharing_mode DEFAULT 'precise';
