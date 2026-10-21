# Fibi - Save Your Travel Places

Fibi is a "save-first" app that captures travel places from social media before you lose them. Users save links quickly, see them visually, and optionally add lightweight location + category info.

## Features

- **Quick Save**: Paste a TikTok, Instagram, YouTube, or web link — Fibi fetches title, description, and thumbnail
- **Android Share Target**: On Android (installed PWA), tap Share → Fibi so the link opens already filled in
- **iPhone Paste Flow**: On iPhone, copy the link, open Fibi, and paste — iOS web apps do not appear in the system share sheet
- **Visual Grid**: Calm grid of all saved places
- **Smart Platform Detection**: Automatically detects TikTok, Instagram, YouTube, or Other
- **Optional Metadata**: Add location (city/country), category, and status
- **Filtering**: Filter saved items by category and status
- **Secure**: Row-level security ensures users can only access their own data

## How to Use Fibi - User Guide

### Installing Fibi as an App

Fibi works best when installed as a Progressive Web App (PWA) on your phone.

**On Android (Chrome):**
1. Open Fibi in Chrome on your Android device
2. Tap the menu (⋮) in the top right corner
3. Look for "Add to Home screen" or "Install app"
4. Tap it and follow the prompts
5. Fibi will now appear as an app on your home screen — and in the Android share sheet

**On iPhone (Safari):**
1. Open Fibi in Safari on your iPhone
2. Tap the Share button (□↑) at the bottom of the screen
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. Fibi will now appear as an app on your home screen (for easy paste saves — it still will not show in the iOS share sheet)

### Saving Places to Fibi

#### On iPhone (Paste)
1. In TikTok, Instagram, or another app, open Share → **Copy link**
2. Open Fibi (from your home screen or Safari)
3. Tap **Save a place**, paste the link, and save

#### On Android (Share sheet)
1. Tap **Share** on the post
2. Choose **Fibi** in the share sheet (install the PWA first if you do not see it)
3. Review the preview and save

#### On a computer
1. Open Fibi → **Save a place**
2. Paste a URL
3. Fibi fetches the metadata automatically

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Database + Authentication)

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Run all migration files in `supabase/migrations/` in order (001, 002, …) to create tables and RLS policies

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: AI Enrichment (for smart suggestions)
# Add ONE of the following to enable AI-powered suggestions:
OPENAI_API_KEY=your_openai_api_key
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Instagram oEmbed (for rich Instagram link previews)
# Get this from Facebook Developer Console - see FACEBOOK_INSTAGRAM_SETUP.md
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
# OR
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token

# Optional: Resend (for sending transactional emails)
# Get this from https://resend.com/api-keys
RESEND_API_KEY=your_resend_api_key
```

You can find the Supabase values in your Supabase project settings under **API**. For a full list of env vars by context (dev, preview, production, cron), see [docs/ENV.md](docs/ENV.md).

For AI enrichment:
- **OpenAI**: Get an API key from [platform.openai.com](https://platform.openai.com/api-keys) (uses `gpt-4o-mini` model)
- **Anthropic**: Get an API key from [console.anthropic.com](https://console.anthropic.com) (uses `claude-3-haiku` model)

For Instagram link previews:
- **Facebook/Instagram**: See `FACEBOOK_INSTAGRAM_SETUP.md` for detailed setup instructions
- Requires creating a Facebook App and generating an access token
- Without this, Instagram links will still work but won't show rich oEmbed previews

For transactional emails:
- **Resend**: Get an API key from [resend.com/api-keys](https://resend.com/api-keys)
- Used for sending custom emails (notifications, etc.)
- Supabase handles authentication emails via its SMTP settings
- Without this, custom email functionality won't work, but authentication emails will still work via Supabase

**Note**: AI enrichment, Instagram oEmbed, and Resend are all optional. The app works without them, but won't show AI suggestions, rich Instagram previews, or be able to send custom emails.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Account

1. Navigate to the login page
2. Click "Sign up" and create an account
3. Start saving places!

## Database Schema

The `saved_items` table includes:

- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `url` (text, required)
- `platform` (text, required) - TikTok, Instagram, YouTube, or Other
- `title` (text, nullable)
- `description` (text, nullable)
- `thumbnail_url` (text, nullable)
- `location_country` (text, nullable)
- `location_city` (text, nullable)
- `category` (text, nullable) - Food, Stay, Nature, Activity, City, Beach, Other
- `status` (text, nullable) - Want, Dream, Maybe, Been
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Row-Level Security (RLS)

All RLS policies are configured so users only access their own data (and shared itineraries where applicable). For security lint fixes and ongoing RLS guidance, see [docs/SUPABASE_SECURITY_LINTS.md](docs/SUPABASE_SECURITY_LINTS.md).

## Project Structure

```
src/
├── app/
│   ├── (protected)/            # Auth-required routes
│   │   ├── app/                 # Main app: /app, /app/calendar, /app/map, /app/how-to, /app/admin
│   │   ├── add/                 # Add place
│   │   ├── item/[id]/           # Item detail
│   │   └── profile/             # User profile
│   ├── login/, signup/, reset-password/
│   ├── auth/callback/           # OAuth / magic-link callback
│   ├── share/itinerary/[token]/  # Public shared itinerary
│   ├── api/                     # API routes (auth, itinerary, admin, cron, etc.)
│   ├── layout.tsx
│   └── page.tsx                 # Landing
├── components/                  # HomeGrid, AddItemForm, ItemDetail, CalendarView, MapView, etc.
├── lib/                         # supabase/, auth, admin, utils, email, SSRF
├── hooks/
supabase/migrations/             # Ordered SQL migrations
docs/                            # ENV.md, API_AUTH.md, ADMIN_SETUP, TESTING, etc.
```

## Building for Production

```bash
npm run build
npm start
```

For deployment (Vercel, env, cron), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Notes

- The metadata fetching API attempts to extract Open Graph tags from URLs. If metadata fetching fails, the URL is still saved.
- Platform detection is based on the URL hostname.
- All timestamps are automatically managed by the database.

## License

Private project - All rights reserved

