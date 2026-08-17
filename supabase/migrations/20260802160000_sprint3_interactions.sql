-- Create the interaction type ENUM
DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM ('ping', 'bump', 'message', 'sos');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create interactions table
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type interaction_type NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on interactions
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert interactions to anyone" ON interactions FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view interactions where they are sender or receiver" ON interactions FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);


-- Create push_tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Enable RLS on push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own push tokens" ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own push tokens" ON push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own push tokens" ON push_tokens FOR DELETE USING (auth.uid() = user_id);

-- Set up Webhook Trigger to call Edge Function
-- NOTE: In a real Supabase instance, you would create a webhook via the Dashboard or API.
-- For this migration script, we document that the trigger is expected to be managed via the Supabase Dashboard Webhooks UI 
-- hitting https://[PROJECT_REF].supabase.co/functions/v1/push-notify
