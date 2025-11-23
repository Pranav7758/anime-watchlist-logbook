-- Add mal_id to anime table to track MyAnimeList IDs
ALTER TABLE public.anime 
ADD COLUMN mal_id INTEGER;

-- Create index for mal_id lookups
CREATE INDEX idx_anime_mal_id ON public.anime(mal_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  anime_id UUID,
  anime_title TEXT NOT NULL,
  season_number INTEGER,
  episode_number INTEGER,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('episode_release', 'season_release')),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_anime FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE
);

-- Enable Row Level Security for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

