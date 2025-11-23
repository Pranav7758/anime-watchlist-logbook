-- Add ranking field to anime table for user's personal rankings
ALTER TABLE public.anime 
ADD COLUMN IF NOT EXISTS ranking INTEGER;

-- Create index for ranking queries
CREATE INDEX IF NOT EXISTS idx_anime_ranking ON public.anime(user_id, ranking);

-- Create friends/followers table
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- The user who sent the request
  friend_id UUID NOT NULL, -- The user who received the request
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security for friends
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Create policies for friends
CREATE POLICY "Users can view their own friend requests"
ON public.friends
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
ON public.friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friend requests"
ON public.friends
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create index for faster queries
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.update_friends_updated_at();

