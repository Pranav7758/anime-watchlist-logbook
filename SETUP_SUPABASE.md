# Setting Up Your Own Supabase Project

Since Lovable created a Supabase project you don't have access to, you need to create your own. Follow these steps:

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Your project name (e.g., "anime-logbook")
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for development
5. Click "Create new project"
6. Wait 2-3 minutes for the project to be set up

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon) → **API**
2. You'll see:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. In your project root, create a file named `.env` (not `.env.example`)
2. Add these lines (replace with your actual values):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Important**: Make sure `.env` is in your `.gitignore` (it should be already)

## Step 4: Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Open the migration file: `supabase/migrations/20251122045345_6031ba2e-b24d-4c9d-9782-66532b9b6300.sql`
3. Copy and paste the SQL into the editor
4. Click "Run"
5. Repeat for: `supabase/migrations/20251123051208_06f4ffd5-e3b6-43d6-9b4f-d17f716904be.sql`
6. Repeat for: `supabase/migrations/20251124000000_add_notifications_and_mal_id.sql`

## Step 5: Test the Connection

1. Restart your dev server:
   ```bash
   npm run dev
   ```
2. Try signing up/logging in
3. If it works, you're all set!

## Troubleshooting

- **"Failed to add anime"**: Make sure all migrations ran successfully
- **Can't connect**: Double-check your `.env` file has the correct values
- **Migration errors**: Make sure you run migrations in order (oldest first)

