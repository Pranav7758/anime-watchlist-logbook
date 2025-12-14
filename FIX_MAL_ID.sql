-- Quick fix for missing mal_id column
-- Copy and paste this into Supabase SQL Editor and run it

-- Add mal_id column if it doesn't exist
ALTER TABLE public.anime 
ADD COLUMN IF NOT EXISTS mal_id INTEGER;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_anime_mal_id ON public.anime(mal_id);

-- Verify it was added (this will show the column if it exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'anime' 
AND column_name = 'mal_id';

