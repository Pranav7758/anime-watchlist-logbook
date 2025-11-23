-- Update RLS policies to allow friends to view each other's anime
-- First, drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view their own anime" ON public.anime;

-- Create a new policy that allows users to view their own anime AND their friends' anime
CREATE POLICY "Users can view their own and friends' anime"
ON public.anime
FOR SELECT
USING (
  -- Users can view their own anime
  auth.uid() = user_id
  OR
  -- Users can view their friends' anime (where they are the friend)
  EXISTS (
    SELECT 1 FROM public.friends
    WHERE (
      (friends.user_id = auth.uid() AND friends.friend_id = anime.user_id)
      OR
      (friends.friend_id = auth.uid() AND friends.user_id = anime.user_id)
    )
    AND friends.status = 'accepted'
  )
);

