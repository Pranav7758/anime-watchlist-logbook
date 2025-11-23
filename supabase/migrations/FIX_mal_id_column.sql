-- Fix: Add mal_id column if it doesn't exist
-- Run this if you get "could not find mal_id column" error

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'anime' 
        AND column_name = 'mal_id'
    ) THEN
        ALTER TABLE public.anime ADD COLUMN mal_id INTEGER;
        CREATE INDEX IF NOT EXISTS idx_anime_mal_id ON public.anime(mal_id);
        RAISE NOTICE 'mal_id column added successfully';
    ELSE
        RAISE NOTICE 'mal_id column already exists';
    END IF;
END $$;

