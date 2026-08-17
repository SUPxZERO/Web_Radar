  -- Add new columns to profiles for Amo-style experience
  ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS status_message TEXT;

  -- Create avatars bucket in storage if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

  -- Set up RLS for avatars bucket
  CREATE POLICY "Avatar images are publicly accessible."
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'avatars' );

  CREATE POLICY "Users can upload their own avatars."
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );
    
  CREATE POLICY "Users can update their own avatars."
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'avatars' AND auth.uid() = owner );

  -- Create messages table for real-time chat (Phase 2)
  CREATE TABLE IF NOT EXISTS public.messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- Enable RLS on messages
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

  -- Messages can be read if user is sender or receiver
  CREATE POLICY "Users can read their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

  -- Messages can be inserted if user is the sender
  CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

  -- Add realtime to messages
  alter publication supabase_realtime add table public.messages;
