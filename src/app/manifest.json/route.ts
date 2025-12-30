import { NextResponse } from 'next/server'

// Force dynamic rendering to ensure this route handler is always executed
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// This route handler ensures manifest.json is always accessible without auth
// Route handlers bypass middleware, so this will always work
export async function GET() {
  const manifest = {
    name: "Fibi - Save Your Travel Places",
    short_name: "Fibi",
    description: "Save travel places from social media before you lose them",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ],
    share_target: {
      action: "/share",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        url: "url",
        title: "title",
        text: "text"
      }
    },
    categories: ["travel", "productivity", "social"],
    screenshots: []
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
