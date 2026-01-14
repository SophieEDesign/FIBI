# Meta oEmbed Test Instructions

## Overview

FiBi uses Instagram oEmbed API to display rich previews of Instagram posts when users save travel places from Instagram. This document provides test instructions for Meta App Review.

## Test URLs

### 1. oEmbed Endpoint (Direct Test)
**URL Format:**
```
https://fibi.world/api/oembed?url={instagram_post_url}&format=json
```

**Example:**
```
https://fibi.world/api/oembed?url=https://www.instagram.com/p/Cx123456789/&format=json
```

**Expected Response:**
```json
{
  "html": "<blockquote class=\"instagram-media\"...",
  "thumbnail_url": "https://...",
  "author_name": "username",
  "title": "Post title",
  "provider_name": "Instagram"
}
```

### 2. Test Page (Interactive Demo)
**URL:**
```
https://fibi.world/oembed-test
```

This page allows you to:
- Test the oEmbed endpoint with any Instagram URL
- See the oEmbed response in JSON format
- View how the preview appears in the FiBi app
- See the embedded Instagram content (if HTML is returned)

## How to Test

### Step 1: Verify oEmbed Endpoint
1. Open a browser or use curl/Postman
2. Visit: `https://fibi.world/api/oembed?url={instagram_url}&format=json`
   - Replace `{instagram_url}` with a public Instagram post URL
   - Example: `https://www.instagram.com/p/Cx123456789/`
3. Verify the response contains:
   - `html`: Embeddable HTML (if available)
   - `thumbnail_url`: Image thumbnail
   - `author_name`: Instagram username
   - `title`: Post title/caption
   - `provider_name`: "Instagram"

### Step 2: Test with Test Page
1. Visit: `https://fibi.world/oembed-test`
2. Enter a public Instagram post URL in the input field
3. Click "Test" button
4. Verify:
   - oEmbed response is displayed in JSON format
   - Preview is rendered showing thumbnail/image
   - Embedded content appears (if HTML is available)

### Step 3: Verify in App Context
1. Visit: `https://fibi.world/login`
2. Sign in or create an account
3. Navigate to "Add Item" page
4. Paste an Instagram URL
5. Verify that a rich preview appears with:
   - Thumbnail image
   - Post title/caption
   - Author information

## Technical Details

### oEmbed Endpoint
- **Method**: GET (standard oEmbed format)
- **Parameters**:
  - `url` (required): Instagram post URL
  - `format` (optional): "json" (default)
- **Response**: JSON with oEmbed standard fields
- **CORS**: Enabled for oEmbed discovery

### Instagram oEmbed Implementation
- Uses Facebook Graph API Instagram oEmbed endpoint
- Requires `FACEBOOK_ACCESS_TOKEN` environment variable
- Fetches rich metadata including:
  - Embeddable HTML
  - Thumbnail images
  - Author information
  - Post captions

### Use Case
FiBi is a travel planning app that helps users save places they discover on social media (Instagram, TikTok, etc.). When users save an Instagram post about a travel destination, FiBi uses oEmbed to:
1. Display a rich preview of the Instagram post
2. Extract metadata (title, description, images)
3. Help users identify and remember saved places

## Troubleshooting

### If oEmbed endpoint returns empty response:
- Check that `FACEBOOK_ACCESS_TOKEN` is configured
- Verify the Instagram URL is public and accessible
- Check server logs for errors

### If test page shows errors:
- Ensure JavaScript is enabled
- Check browser console for errors
- Verify the Instagram URL is valid and public

### If preview doesn't appear in app:
- Verify user is logged in
- Check that the URL is a valid Instagram post
- Ensure network requests are not blocked

## Example Instagram URLs for Testing

Use any public Instagram post URL in these formats:
- `https://www.instagram.com/p/{POST_ID}/`
- `https://www.instagram.com/reel/{REEL_ID}/`
- `https://www.instagram.com/tv/{TV_ID}/`

**Note**: Replace `{POST_ID}`, `{REEL_ID}`, or `{TV_ID}` with actual IDs from public Instagram posts.

## Contact

If you encounter any issues during testing, please contact:
- Email: [Your support email]
- Or use the contact form on the website

---

**Last Updated**: [Current Date]
**App Version**: [Version Number]

