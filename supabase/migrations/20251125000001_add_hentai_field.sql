-- Add is_hentai field to anime table
ALTER TABLE public.anime 
ADD COLUMN IF NOT EXISTS is_hentai BOOLEAN DEFAULT false;

-- Create index for hentai filtering
CREATE INDEX IF NOT EXISTS idx_anime_is_hentai ON public.anime(user_id, is_hentai);

