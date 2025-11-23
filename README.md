# Anime Logbook

A modern web application for tracking your anime watchlist, built with React, TypeScript, and Supabase.

## Features

- 📺 **Anime Tracking**: Add and manage your anime collection with detailed information
- 🔍 **Jikan API Integration**: Search and fetch anime data from MyAnimeList via Jikan API
- 📊 **Season Management**: Automatically detect and manage multiple seasons of anime
- 🔔 **Notifications**: Get notified when new episodes or seasons are released
- ⭐ **Rating System**: Rate and review your favorite anime
- 📝 **Notes**: Add personal notes and thoughts about each anime
- 🎨 **Modern UI**: Beautiful, responsive interface built with shadcn/ui and Tailwind CSS
- 🔐 **User Authentication**: Secure user accounts with Supabase Auth
- 🎯 **Filtering**: Filter anime by status, search, and content type
- 👥 **Social Features**: View rankings and friend lists (coming soon)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **API**: Jikan API (MyAnimeList)
- **Build Tool**: Vite
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd anime-logbook-main
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. Set up the database:
   - Go to your Supabase Dashboard → SQL Editor
   - Run the migration files in order from `supabase/migrations/`:
     - `20251122045345_6031ba2e-b24d-4c9d-9782-66532b9b6300.sql` (initial schema)
     - `20251124000000_add_notifications_and_mal_id.sql` (notifications & MAL ID)
     - `20251125000001_add_hentai_field.sql` (hentai filter)
     - Any other migration files as needed

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
anime-logbook-main/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── integrations/  # Supabase integration
│   └── lib/            # Utility functions
├── supabase/
│   └── migrations/      # Database migration files
└── public/             # Static assets
```

## Features in Detail

### Anime Management
- Add anime manually or search via Jikan API
- Automatic season detection for multi-season anime
- Track episodes watched per season
- Set status (Watching, Completed, Plan to Watch, On Hold, Dropped)
- Rate anime from 1-10
- Add personal notes

### Notifications
- Automatic detection of new episode releases
- Automatic detection of new seasons
- Real-time notifications via Supabase

### Filtering
- Filter by status
- Search by title
- Filter by content type (Show All, Hide Hentai, Hentai Only)

## Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:
- `anime`: Stores anime entries with user data
- `notifications`: Stores user notifications
- Additional tables for rankings and friends (coming soon)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Jikan API](https://jikan.moe/) for anime data
- [MyAnimeList](https://myanimelist.net/) for the anime database
- [shadcn/ui](https://ui.shadcn.com/) for UI components
