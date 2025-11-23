# How to Disable Email Confirmation in Supabase

## Steps:

1. **Go to your Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Providers** (or go to Settings → Auth)

3. **Disable Email Confirmation**
   - Find **Email** provider settings
   - Look for **"Confirm email"** or **"Enable email confirmations"** toggle
   - **Turn it OFF** (disable it)

4. **Alternative: Disable in Auth Settings**
   - Go to **Authentication** → **Settings** (or **Configuration**)
   - Find **"Enable email confirmations"** or **"Confirm email"**
   - **Uncheck/Disable** it
   - Click **Save**

5. **That's it!** 
   - Now when users sign up, they can sign in immediately without confirming email
   - No confirmation email will be sent

## Note:
After disabling, existing users who haven't confirmed their email will still need to confirm. But new signups won't require confirmation.

