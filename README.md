# Fibi - Save Your Travel Places

Fibi is a "save-first" app that captures travel places from social media before you lose them. Users save links quickly, see them visually, and optionally add lightweight location + category info.

## Features

- **Direct Share**: Share directly from TikTok, Instagram, YouTube, and other apps to Fibi — no copy-paste needed! Just tap Share → Fibi
- **Quick Save**: URLs are automatically captured when shared, and Fibi fetches metadata (title, description, thumbnail)
- **Visual Grid**: Pinterest-style grid view of all saved places
- **Smart Platform Detection**: Automatically detects TikTok, Instagram, YouTube, or Other
- **Optional Metadata**: Add location (city/country), category, and status
- **Filtering**: Filter saved items by category and status
- **Secure**: Row-level security ensures users can only access their own data

## How to Use Fibi - User Guide

### Installing Fibi as an App

Fibi works best when installed as a Progressive Web App (PWA) on your phone. This allows you to share directly from other apps.

**On Android (Chrome):**
1. Open Fibi in Chrome on your Android device
2. Tap the menu (⋮) in the top right corner
3. Look for "Add to Home screen" or "Install app"
4. Tap it and follow the prompts
5. Fibi will now appear as an app on your home screen

**On iPhone (Safari):**
1. Open Fibi in Safari on your iPhone
2. Tap the Share button (□↑) at the bottom of the screen
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. Fibi will now appear as an app on your home screen

### Sharing Places to Fibi - Step by Step

Once you've installed Fibi as an app, you can share directly from TikTok, Instagram, YouTube, and other apps. **This is a direct share — no need to copy and paste links!**

#### Step 1: Find Something to Save
- Open TikTok, Instagram, YouTube, or any app with a video or post you want to save
- Find the specific post/video you're interested in

#### Step 2: Share Directly to Fibi
1. **Tap the Share button** on the post/video (usually a → or Share icon)
2. **Look for "Fibi" in your Share Sheet** — it will appear alongside other apps like Messages, WhatsApp, etc.
3. **Tap "Fibi"** — this directly opens Fibi with the link already loaded
4. You'll be taken to the Add Place screen with the URL automatically filled in

#### Step 3: Review and Save
- Fibi automatically fetches the title, description, and thumbnail
- Add any additional details (location, category, screenshot) if you want
- Tap "Save" to add it to your collection

**Important Notes:**
- ✅ **Direct Share**: When you share to Fibi, the link is sent directly — no copy-paste needed
- ✅ **Works in Share Sheet**: Fibi appears in your device's native Share Sheet as a shareable app
- ✅ **Must be Installed**: Make sure you've installed Fibi as an app (see instructions above) for it to appear in Share Sheets
- ❌ **Not Copy-Paste**: You don't need to copy the link and paste it manually — sharing is automatic

### Alternative: Manual Entry

If you prefer, you can also:
1. Open Fibi
2. Tap "Add" 
3. Paste a URL manually
4. Fibi will fetch the metadata automatically

But for the best experience, install Fibi as an app and use direct sharing!

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
3. Run the migration file `supabase/migrations/001_initial_schema.sql` to create the `saved_items` table and RLS policies

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

You can find the Supabase values in your Supabase project settings under **API**.

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

All RLS policies are configured to ensure:
- Users can only view their own saved items
- Users can only insert items for themselves
- Users can only update their own items
- Users can only delete their own items

## Project Structure

```
├── app/
│   ├── api/
│   │   └── metadata/          # API route for fetching URL metadata
│   ├── add/                    # Add new place page
│   ├── item/[id]/             # Item detail/edit page
│   ├── login/                  # Authentication page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page (grid view)
├── components/
│   ├── AddItemForm.tsx         # Form for adding new places
│   ├── HomeGrid.tsx            # Main grid view component
│   └── ItemDetail.tsx          # Item detail/edit component
├── lib/
│   ├── supabase/               # Supabase client utilities
│   └── utils.ts                # Utility functions (platform detection)
├── supabase/
│   └── migrations/             # Database migrations
└── types/
    └── database.ts             # TypeScript types
```

## Building for Production

```bash
npm run build
npm start
```

## Notes

- The metadata fetching API attempts to extract Open Graph tags from URLs. If metadata fetching fails, the URL is still saved.
- Platform detection is based on the URL hostname.
- All timestamps are automatically managed by the database.

## License

Private project - All rights reserved

