# Meta App Review - Access and Testing Instructions

## App URL

**Primary URL:** https://www.fibi.world/  
**Alternative URL:** https://fibi.world/ (redirects to www)

The app is a web application accessible via any modern web browser. No mobile app download is required.

---

## How to Access and Test the App

### 1. Navigate to the App

1. Open a web browser (Chrome, Firefox, Safari, or Edge)
2. Visit: **https://www.fibi.world/**
3. You will see the landing page

### 2. Create an Account (Required for Testing)

1. Click **"Login"** in the navigation or navigate directly to: **https://www.fibi.world/login**
2. Click the **"Sign up"** tab
3. Enter:
   - A valid email address
   - A password (minimum 6 characters)
4. Click **"Sign up"**
5. Check your email inbox for a confirmation email
6. Click the confirmation link in the email
7. You will be redirected back to the app and can now log in

### 3. Test Instagram oEmbed Functionality

After logging in, test the Instagram oEmbed integration:

1. Navigate to **https://www.fibi.world/add** (or click **"Add"** in the navigation)
2. In the **URL field**, paste an Instagram post URL, for example:
   - `https://www.instagram.com/p/ABC123xyz/`
   - `https://www.instagram.com/reel/EXAMPLE/`
   - Any valid public Instagram post URL

3. The app will automatically:
   - Detect that it's an Instagram URL
   - Call the Meta Instagram oEmbed API (`https://graph.facebook.com/v18.0/instagram_oembed`) to fetch preview data
   - Display a rich preview showing:
     - Thumbnail image from the Instagram post
     - Post caption/description
     - Author information (if available)
     - Embedded preview (on desktop)

4. Verify the oEmbed data is displayed:
   - ✅ Thumbnail image should appear
   - ✅ Post caption/description should be visible in the description field
   - ✅ Author information should be shown (if available)
   - ✅ Preview should match the Instagram post content

5. Optionally fill in additional fields:
   - Title (auto-filled from Instagram data)
   - Location (using Google Places search)
   - Category (e.g., "Restaurant", "Attraction", "Hotel")
   - Stage (e.g., "Want to go", "Planning", "Visited")

6. Click **"Save Place"** to save the item to your collection

7. You will be redirected to the home page where you can see your saved items in a grid view

### 4. Additional Testing Scenarios

#### Test Other Platforms
- **TikTok URLs**: The app also supports TikTok oEmbed (e.g., `https://www.tiktok.com/@user/video/1234567890`)
- **YouTube URLs**: The app supports YouTube oEmbed (e.g., `https://www.youtube.com/watch?v=EXAMPLE`)
- **Generic URLs**: Any URL with Open Graph metadata will work

#### Test Viewing Saved Items
1. After saving an item, you'll be on the home page (`/app`)
2. You can:
   - View all saved items in a grid
   - Filter by category or status
   - Click on any item to view/edit details
   - Navigate using the bottom navigation (mobile) or top navigation (desktop)

#### Test Editing Items
1. Click on any saved item from the home page
2. You can edit:
   - Title
   - Description
   - Location
   - Category
   - Status
   - Upload a custom screenshot
3. Click **"Save Changes"** to update

---

## Facebook Login Confirmation

**This app does NOT use Facebook Login or any Meta user authentication APIs.**

### Authentication Method
- The app uses **Supabase email/password authentication**
- Users sign up and log in using email and password only
- No Facebook Login, OAuth, or social authentication is implemented

### Meta API Usage
The **only Meta API integration** in this app is:

**Instagram oEmbed API** (`https://graph.facebook.com/v18.0/instagram_oembed`)
- **Purpose**: Fetch public preview data (thumbnails, captions, author info) for Instagram posts
- **Usage**: When a user pastes an Instagram URL, the app calls this API to get preview data
- **Permissions**: Uses an App Access Token (no user permissions required)
- **Data Access**: Only accesses public Instagram post data (no private content, no user data)
- **User Permissions**: None - this is a public API endpoint that doesn't require user authentication

### Why No Facebook Login?
Facebook Login is not implemented because:
1. The app's authentication needs are met by email/password authentication
2. Users prefer direct account creation without social login dependencies
3. The app only needs public Instagram post previews, not user authentication

### Testing Instagram oEmbed Without Facebook Login
To test Instagram oEmbed functionality:
1. Create an account using email/password (as described above)
2. Paste an Instagram URL in the "Add" form
3. The app will automatically fetch preview data using the Instagram oEmbed API
4. No Facebook Login is required or used

---

## Payment and Membership Requirements

**No payment or membership is required to access any features of this app.**

- ✅ All features are free
- ✅ No subscription required
- ✅ No in-app purchases
- ✅ No premium features
- ✅ No access codes needed

The app is fully functional for all users after creating a free account.

---

## Geographic Restrictions

**No geographic restrictions or geo-blocking is implemented.**

- ✅ The app is accessible from any location worldwide
- ✅ No VPN or proxy required
- ✅ No country-specific restrictions
- ✅ All features work globally

---

## Technical Details for Reviewers

### Meta API Integration Details

**API Endpoint Used:**
- `https://graph.facebook.com/v18.0/instagram_oembed`

**Implementation Location:**
- File: `src/app/api/oembed/route.ts`
- Function: `fetchInstagramOEmbed()`
- Lines: 79-117

**How It Works:**
1. User pastes an Instagram URL in the form
2. App detects it's an Instagram URL
3. App calls `/api/oembed` endpoint
4. Server-side code calls Facebook Graph API Instagram oEmbed endpoint
5. Returns preview data (thumbnail, caption, author) to the client
6. Client displays the preview

**Access Token:**
- Uses environment variable: `FACEBOOK_ACCESS_TOKEN` or `INSTAGRAM_ACCESS_TOKEN`
- Token type: App Access Token (for public content)
- No user permissions required

**Rate Limits:**
- Subject to Facebook Graph API rate limits
- App implements 1-hour caching to minimize API calls

**Data Privacy:**
- Only fetches public Instagram post data
- No user data is collected from Meta/Facebook
- No user permissions requested
- No user authentication via Meta APIs

---

## Troubleshooting for Reviewers

### If Instagram oEmbed Doesn't Work

1. **Check if access token is configured:**
   - The app requires `FACEBOOK_ACCESS_TOKEN` or `INSTAGRAM_ACCESS_TOKEN` environment variable
   - If not configured, Instagram URLs will still work but won't show rich previews
   - The app will fall back to Open Graph metadata extraction

2. **Verify Instagram URL format:**
   - Must be a valid public Instagram post URL
   - Format: `https://www.instagram.com/p/POST_ID/` or `https://www.instagram.com/reel/REEL_ID/`

3. **Check browser console:**
   - Open browser developer tools (F12)
   - Check Console tab for any error messages
   - Check Network tab to see API calls

### If You Can't Access the App

1. **Try both URLs:**
   - https://www.fibi.world/
   - https://fibi.world/

2. **Check your internet connection**

3. **Try a different browser**

4. **Clear browser cache and cookies**

### If Email Confirmation Doesn't Work

1. Check your spam/junk folder
2. Wait a few minutes for the email to arrive
3. Try signing up with a different email address
4. Contact support if the issue persists

---

## Summary

- **App URL**: https://www.fibi.world/
- **Authentication**: Email/password (Supabase) - NO Facebook Login
- **Meta API Usage**: Instagram oEmbed API only (for public post previews)
- **Payment Required**: No
- **Geo-Restrictions**: None
- **Test Account**: Create one using the sign-up process above

---

**Last Updated**: January 14, 2026  
**Note**: If a test page or demo account is set up in the future, these instructions will be updated accordingly.

