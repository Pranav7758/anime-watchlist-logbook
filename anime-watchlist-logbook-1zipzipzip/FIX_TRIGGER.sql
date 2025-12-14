-- RUN THIS SQL IN YOUR SUPABASE DASHBOARD -> SQL EDITOR
-- This fixes the "Database error saving new user" issue

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create function with SECURITY DEFINER and SET search_path
-- This is the critical fix - the search_path must be explicitly set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN new;
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- Verify the function was created
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'handle_new_user';
