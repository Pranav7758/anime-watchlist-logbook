-- Add short_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;

-- Create function to generate short ID (5 characters)
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars like 0, O, I, 1
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure unique short_id
CREATE OR REPLACE FUNCTION ensure_unique_short_id()
RETURNS TRIGGER AS $$
DECLARE
  new_short_id TEXT;
BEGIN
  -- If short_id is not set, generate one
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    LOOP
      new_short_id := generate_short_id();
      -- Check if it exists
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE short_id = new_short_id) THEN
        NEW.short_id := new_short_id;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate short_id
DROP TRIGGER IF EXISTS trigger_ensure_unique_short_id ON public.profiles;
CREATE TRIGGER trigger_ensure_unique_short_id
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_unique_short_id();

-- Generate short_ids for existing profiles that don't have one
DO $$
DECLARE
  profile_record RECORD;
  new_short_id TEXT;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles WHERE short_id IS NULL OR short_id = '' LOOP
    LOOP
      new_short_id := generate_short_id();
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE short_id = new_short_id) THEN
        UPDATE public.profiles SET short_id = new_short_id WHERE id = profile_record.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_short_id ON public.profiles(short_id);

