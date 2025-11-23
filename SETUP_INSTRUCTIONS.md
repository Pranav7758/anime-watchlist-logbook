# Quick Setup Guide for Supabase

## The Problem
Lovable created a Supabase project that you don't have access to. You need to create your own.

## Solution: Create Your Own Supabase Project

### Step 1: Create Supabase Project (5 minutes)

1. Go to **https://supabase.com** and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `anime-logbook` (or any name)
   - **Database Password**: Create a strong password (SAVE IT!)
   - **Region**: Choose closest to you
4. Click **"Create new project"** and wait 2-3 minutes

### Step 2: Get Your API Keys (2 minutes)

1. In Supabase dashboard, click **Settings** (⚙️ icon) → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 3: Create .env File (1 minute)

1. In your project root folder, create a file named `.env`
2. Add these lines (replace with YOUR values from Step 2):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**Example:**
```
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Run Database Migrations (5 minutes)

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy and paste the SQL from each migration file (one at a time):

**Migration 1:** Copy everything from `supabase/migrations/20251122045345_6031ba2e-b24d-4c9d-9782-66532b9b6300.sql`
   - Paste into SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)
   - Should see "Success. No rows returned"

**Migration 2:** Copy everything from `supabase/migrations/20251123051208_06f4ffd5-e3b6-43d6-9b4f-d17f716904be.sql`
   - Paste into SQL Editor
   - Click **"Run"**

**Migration 3:** Copy everything from `supabase/migrations/20251124000000_add_notifications_and_mal_id.sql`
   - Paste into SQL Editor
   - Click **"Run"**

### Step 5: Restart Your App

1. Stop your dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```
3. Try signing up - it should work now!

## Troubleshooting

**"Failed to add anime" error:**
- Make sure all 3 migrations ran successfully
- Check the SQL Editor for any error messages

**Can't connect to Supabase:**
- Double-check your `.env` file has correct values
- Make sure there are no extra spaces in `.env`
- Restart your dev server after creating `.env`

**Still seeing old data:**
- Clear your browser localStorage
- Or use incognito/private window

## Need Help?

If you get stuck, check:
- Supabase dashboard → SQL Editor → Check if tables exist (should see `anime` and `notifications` tables)
- Browser console for error messages
- Make sure `.env` file is in the project root (same folder as `package.json`)

