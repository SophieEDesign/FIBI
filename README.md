# Fibi - Save Your Travel Places

Fibi is a "save-first" app that captures travel places from social media before you lose them. Users save links quickly, see them visually, and optionally add lightweight location + category info.

## Features

- **Quick Save**: Paste a URL and Fibi automatically fetches metadata (title, description, thumbnail)
- **Visual Grid**: Pinterest-style grid view of all saved places
- **Smart Platform Detection**: Automatically detects TikTok, Instagram, YouTube, or Other
- **Optional Metadata**: Add location (city/country), category, and status
- **Filtering**: Filter saved items by category and status
- **Secure**: Row-level security ensures users can only access their own data

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
```

You can find the Supabase values in your Supabase project settings under **API**.

For AI enrichment:
- **OpenAI**: Get an API key from [platform.openai.com](https://platform.openai.com/api-keys) (uses `gpt-4o-mini` model)
- **Anthropic**: Get an API key from [console.anthropic.com](https://console.anthropic.com) (uses `claude-3-haiku` model)

**Note**: AI enrichment is optional. The app works without it, but won't show AI suggestions for titles, locations, or categories.

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

