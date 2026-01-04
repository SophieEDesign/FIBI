# Facebook & Instagram App Setup Guide

This guide explains how to set up a Facebook App to enable Instagram oEmbed link previews in your Fibi application.

## Overview

Your app uses Instagram's oEmbed API via Facebook Graph API to fetch rich previews of Instagram posts. This requires:
1. A Facebook App created in Facebook Developer Console
2. An access token with appropriate permissions
3. Environment variables configured in your app

## Step-by-Step Setup

### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type (or "Consumer" if Business isn't available)
4. Fill in:
   - **App Name**: `Fibi` (or your preferred name)
   - **App Contact Email**: Your email address
   - **Business Account** (optional): Link if you have one
5. Click **"Create App"**

### 2. Add Instagram Product

1. In your app dashboard, go to **"Add Products"** or **"Products"** in the left sidebar
2. Find **"Instagram"** and click **"Set Up"**
3. You'll see options for:
   - **Instagram Basic Display** (for user content)
   - **Instagram Graph API** (for business accounts)
   
   **For oEmbed (link previews), you typically don't need to add a specific product** - the oEmbed endpoint is publicly accessible with an access token.

### 3. Get an Access Token

For Instagram oEmbed, you need a **User Access Token** or **App Access Token**. The simplest approach:

#### Option A: App Access Token (Simplest - for public content)

1. In your app dashboard, go to **"Settings"** → **"Basic"**
2. Note your **App ID** and **App Secret**
3. Create an access token using this format:
   ```
   https://graph.facebook.com/oauth/access_token?client_id={APP_ID}&client_secret={APP_SECRET}&grant_type=client_credentials
   ```
   Replace `{APP_ID}` and `{APP_SECRET}` with your actual values.

4. Visit this URL in your browser - you'll get a response like:
   ```json
   {
     "access_token": "YOUR_APP_ACCESS_TOKEN",
     "token_type": "bearer"
   }
   ```

#### Option B: User Access Token (From Graph API Explorer)

1. Go to **"Tools"** → **"Graph API Explorer"** (you're already here!)
2. Select your app from the dropdown (e.g., "FIBI")
3. **Permissions**: For Instagram oEmbed, you don't need any special permissions. The default `public_profile` is fine, or you can remove all permissions
4. Click **"Generate Access Token"**
5. Copy the generated token from the "Access Token" field

**Note**: User tokens expire after ~60 days. For production, **Option A (App Access Token) is recommended** as it doesn't expire. If you need a long-lived user token, you can exchange it for a long-lived token using the Graph API.

### 4. Configure Environment Variables

Add the access token to your environment variables:

```bash
# In your .env.local or production environment
FACEBOOK_ACCESS_TOKEN=your_access_token_here
# OR
INSTAGRAM_ACCESS_TOKEN=your_access_token_here
```

Your code checks for both variables (see `src/app/api/oembed/route.ts` line 82).

### 5. Test the Setup

Test the Instagram oEmbed endpoint:

```bash
curl "https://graph.facebook.com/v18.0/instagram_oembed?url=https://www.instagram.com/p/EXAMPLE&access_token=YOUR_TOKEN"
```

Replace:
- `EXAMPLE` with an actual Instagram post ID
- `YOUR_TOKEN` with your access token

### 6. App Settings (Optional but Recommended)

#### Basic Settings
- **App Domains**: Add your production domain (e.g., `fibi.world`)
- **Privacy Policy URL**: Add your privacy policy URL
- **Terms of Service URL**: Add your terms URL
- **App Icon**: Upload an icon (1200x1200px recommended)

#### Advanced Settings
- **Require App Secret**: Keep enabled for security
- **Use Strict Mode for Redirect URIs**: Enable for production

## Important Notes

### Rate Limits
- Instagram oEmbed has rate limits based on your app's usage
- Monitor usage in Facebook Developer Console → **"Tools"** → **"API Usage"**

### Token Expiration
- **App Access Tokens**: Don't expire (but can be revoked)
- **User Access Tokens**: Expire after ~60 days
- **Long-Lived Tokens**: Last ~60 days but can be refreshed

### Privacy & Permissions
- For **public Instagram posts**, you typically don't need special permissions
- For **private posts** or user-specific content, you'd need Instagram Basic Display or Graph API with user authorization

### Instagram Business Accounts
If you want to access Instagram Business account content:
1. Connect an Instagram Business account to your Facebook Page
2. Use **Instagram Graph API** product
3. Get a **Page Access Token** (doesn't expire)

## Troubleshooting

### Error: "Instagram oEmbed requires authentication"
- Check that `FACEBOOK_ACCESS_TOKEN` or `INSTAGRAM_ACCESS_TOKEN` is set in your environment
- Verify the token is valid (not expired)

### Error: "Invalid OAuth access token"
- Token may have expired (if using User Access Token)
- Token may have been revoked
- Regenerate the token

### Error: "Rate limit exceeded"
- You're making too many requests
- Wait before retrying
- Consider implementing caching (your code already caches for 1 hour)

### Error: "Unsupported get request"
- The Instagram URL format may be incorrect
- Ensure you're using the full Instagram post URL (e.g., `https://www.instagram.com/p/ABC123/`)

## Production Checklist

- [ ] Facebook App created
- [ ] Access token generated (App Access Token recommended)
- [ ] Environment variable set (`FACEBOOK_ACCESS_TOKEN`)
- [ ] Tested with real Instagram URLs
- [ ] App domains configured in Facebook settings
- [ ] Privacy policy URL added (if required)
- [ ] Monitoring set up for API usage

## Resources

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Instagram oEmbed Documentation](https://developers.facebook.com/docs/instagram/oembed)
- [Access Tokens Guide](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [Facebook Developer Console](https://developers.facebook.com/apps/)

## Security Best Practices

1. **Never commit access tokens to git** - Always use environment variables
2. **Use App Access Tokens** for public content (simpler, no expiration)
3. **Rotate tokens** if they're exposed or compromised
4. **Monitor API usage** to detect unusual activity
5. **Set up rate limiting** in your application to avoid hitting Facebook's limits

