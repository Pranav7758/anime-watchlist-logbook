# Google OAuth Setup Guide for AnimeTracker

This guide will help you set up Google Login for your AnimeTracker app. Follow each step carefully.

---

## Step 1: Go to Google Cloud Console

1. Open your browser and go to: **https://console.cloud.google.com**
2. Sign in with your Google account

---

## Step 2: Create a New Project

1. Click the project dropdown at the top of the page (it might say "Select a project")
2. Click **"NEW PROJECT"**
3. Enter a project name: `AnimeTracker` (or any name you prefer)
4. Click **"CREATE"**
5. Wait for the project to be created, then select it from the dropdown

---

## Step 3: Configure OAuth Consent Screen

1. In the search bar at the top, type **"OAuth consent screen"** and click on it
2. Select **"External"** and click **"CREATE"**
3. Fill in the required fields:
   - **App name**: `AnimeTracker`
   - **User support email**: Select your email
   - **Developer contact email**: Enter your email
4. Click **"SAVE AND CONTINUE"**
5. On the "Scopes" page, click **"SAVE AND CONTINUE"** (no changes needed)
6. On the "Test users" page, click **"ADD USERS"**
7. Add your own email address (and any other emails you want to test with)
8. Click **"SAVE AND CONTINUE"**
9. Click **"BACK TO DASHBOARD"**

---

## Step 4: Create OAuth Credentials

1. In the left sidebar, click **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. For "Application type", select **"Web application"**
5. Enter a name: `AnimeTracker Web Client`
6. Under **"Authorized JavaScript origins"**, click **"+ ADD URI"** and add:
   - Your Replit app URL (e.g., `https://your-replit-project.replit.dev`)
   
7. Under **"Authorized redirect URIs"**, click **"+ ADD URI"** and add:
   - `https://qakolgnkvrtbbmjfalzv.supabase.co/auth/v1/callback`
   
8. Click **"CREATE"**
9. A popup will show your **Client ID** and **Client Secret** - **COPY BOTH** and save them somewhere safe!

---

## Step 5: Add Credentials to Supabase

1. Go to your Supabase Dashboard: **https://supabase.com/dashboard**
2. Select your project: `qakolgnkvrtbbmjfalzv`
3. In the left sidebar, click **"Authentication"**
4. Click **"Providers"**
5. Find **"Google"** in the list and click on it
6. Toggle it to **"Enabled"**
7. Paste your **Client ID** from Step 4
8. Paste your **Client Secret** from Step 4
9. Click **"Save"**

---

## Step 6: Configure Redirect URLs in Supabase

1. Still in Authentication settings, click **"URL Configuration"**
2. In **"Site URL"**, enter your Replit app URL (e.g., `https://your-replit-project.replit.dev`)
3. Under **"Redirect URLs"**, click **"Add URL"** and add:
   - `https://your-replit-project.replit.dev/*`
4. Click **"Save"**

---

## Step 7: Test Google Login

1. Go to your app's login page
2. Click **"Continue with Google"**
3. Sign in with a Google account you added as a test user
4. You should be redirected back to the app and logged in!

---

## Troubleshooting

### "403: You do not have access to this page"
This means Google OAuth is not configured correctly. Check these:
1. Go to Google Cloud Console -> APIs & Services -> Credentials
2. Make sure you selected "Web application" as the Application type (NOT Android or iOS)
3. Verify the Authorized redirect URI is EXACTLY: `https://qakolgnkvrtbbmjfalzv.supabase.co/auth/v1/callback`
4. Add your Replit URL to Authorized JavaScript origins
5. In Supabase Dashboard -> Authentication -> Providers -> Google, make sure Google is ENABLED and you've entered the Client ID and Secret

### "Access blocked: This app's request is invalid"
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://qakolgnkvrtbbmjfalzv.supabase.co/auth/v1/callback`

### "Error 400: redirect_uri_mismatch"
- Double-check that you added the correct Supabase callback URL in Google Cloud Console

### "This app isn't verified"
- This is normal for development. Click "Continue" to proceed
- For production, you'll need to verify your app with Google

### Google login redirects but doesn't log in
- Make sure your Site URL in Supabase matches your actual app URL
- Check that you added your app URL to Redirect URLs in Supabase

---

## Quick Reference

| Setting | Value |
|---------|-------|
| Supabase Callback URL | `https://qakolgnkvrtbbmjfalzv.supabase.co/auth/v1/callback` |
| Your Supabase Project ID | `qakolgnkvrtbbmjfalzv` |

---

## Need Help?

If you're stuck, make sure:
1. You're using the correct project in Google Cloud Console
2. All URLs are spelled correctly with no extra spaces
3. You saved all changes in both Google Cloud and Supabase
