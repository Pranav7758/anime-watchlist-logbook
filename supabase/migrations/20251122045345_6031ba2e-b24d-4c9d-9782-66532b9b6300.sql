-- Create anime tracking table
CREATE TABLE public.anime (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  episodes_watched INTEGER NOT NULL DEFAULT 0,
  total_episodes INTEGER,
  status TEXT NOT NULL DEFAULT 'watching',
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  cover_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('watching', 'completed', 'plan_to_watch', 'dropped', 'on_hold'))
);

-- Enable Row Level Security
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own anime"
ON public.anime
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own anime"
ON public.anime
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own anime"
ON public.anime
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own anime"
ON public.anime
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_anime_updated_at
BEFORE UPDATE ON public.anime
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_anime_user_id ON public.anime(user_id);
CREATE INDEX idx_anime_status ON public.anime(status);