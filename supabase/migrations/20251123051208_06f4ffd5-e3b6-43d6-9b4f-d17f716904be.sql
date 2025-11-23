-- Add season field to anime table
ALTER TABLE public.anime 
ADD COLUMN season_number integer DEFAULT 1;

-- Create index for better performance when grouping by title
CREATE INDEX idx_anime_title_season ON public.anime(user_id, title, season_number);