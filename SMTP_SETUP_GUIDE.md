# SMTP Setup Guide for Supabase Authentication

## Quick Fix Checklist

### 1. Check Supabase SMTP Settings
Go to: **Supabase Dashboard → Authentication → Settings → SMTP Settings**

**Required Settings:**
- ✅ **Host:** `smtp.gmail.com`
- ✅ **Port:** `587` (TLS) or `465` (SSL) - **NOT 581**
- ✅ **Username:** Your Gmail address (e.g., `sophie@uppcyx.co.uk`)
- ✅ **Password:** Gmail App Password (NOT your regular password)
- ✅ **Sender Email:** `hello@fibi.world` (or your configured sender)
- ✅ **Sender Name:** `FiBi Team`

### 2. Gmail App Password Setup
If using Gmail SMTP with 2FA enabled:

1. Go to: **Google Account → Security → 2-Step Verification**
2. Scroll down to **App Passwords**
3. Generate a new app password for "Mail"
4. Use this 16-character password in Supabase (not your regular Gmail password)

### 3. Redirect URLs Whitelist
Go to: **Supabase Dashboard → Authentication → URL Configuration**

**Add these URLs:**
- `https://fibi.world/auth/callback` (production)
- `https://*.vercel.app/auth/callback` (preview deployments - wildcard)
- `http://localhost:3000/auth/callback` (local development)

### 4. Email Confirmation Settings
Go to: **Supabase Dashboard → Authentication → Settings**

**Check:**
- ✅ "Enable email signups" = ON
- ✅ "Enable email confirmations" = ON (or OFF for testing)
- ✅ "Secure email change" = ON

### 5. Test SMTP Connection
1. Try signing up with a test email
2. Check Supabase Dashboard → Authentication → Users
3. Look for the user and check email status
4. Check email spam folder
5. Check Supabase Logs → Auth Logs for errors

## Common Issues

### Issue: "504 Gateway Timeout" on Signup
**Cause:** SMTP server not responding or wrong port
**Fix:** 
- Verify port is 587 (TLS) or 465 (SSL)
- Check Gmail App Password is correct
- Try testing SMTP connection in Supabase dashboard

### Issue: Emails Not Sending
**Causes:**
1. Wrong SMTP port (should be 587 or 465, not 581)
2. Using regular Gmail password instead of App Password
3. Gmail rate limits (too many emails sent)
4. Redirect URL not whitelisted

**Fixes:**
- Use App Password (not regular password)
- Check Supabase Auth Logs for specific errors
- Verify redirect URLs are whitelisted
- Consider using transactional email service (SendGrid, Resend, Mailgun)

### Issue: "Email already registered" but can't login
**Cause:** Email confirmation required but email never sent
**Fix:**
- Check if email confirmation is enabled
- Resend confirmation email from Supabase dashboard
- Or temporarily disable email confirmation for testing

## Temporary Workaround: Disable Email Confirmation

For testing, you can temporarily disable email confirmation:

1. Go to: **Supabase Dashboard → Authentication → Settings**
2. Turn OFF "Enable email confirmations"
3. Users can sign up and login immediately without email confirmation
4. **Remember to turn it back ON for production!**

## Better Solution: Use Transactional Email Service

Gmail SMTP is for personal use and has limitations:
- Rate limits (can block after too many emails)
- May be marked as spam
- Not designed for transactional emails

**Recommended Services:**
- **Resend** (best for Next.js, easy setup)
- **SendGrid** (popular, reliable)
- **Mailgun** (developer-friendly)
- **Postmark** (great deliverability)

These services provide:
- Better deliverability
- Higher rate limits
- Better analytics
- SMTP credentials that work with Supabase

## Setting Up Resend SMTP in Supabase

### Step 1: Verify Your Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `fibi.world` (or your sending domain)
4. Follow the DNS verification steps:
   - Add the provided DNS records to your domain registrar
   - Wait for verification (can take a few minutes to 24 hours)
5. Once verified, you can send emails from `hello@fibi.world` (or your verified domain)

**Note:** For testing, Resend provides a default domain `onboarding.resend.dev` that you can use immediately without verification.

### Step 2: Get Resend SMTP Credentials

1. Go to [Resend Dashboard → API Keys](https://resend.com/api-keys)
2. Your API key should be set in `.env.local` as `RESEND_API_KEY`
3. For SMTP, you'll use this API key as the password

### Step 3: Configure Resend SMTP in Supabase

1. Go to **Supabase Dashboard → Authentication → Settings → SMTP Settings**
2. Enter the following Resend SMTP credentials:

   **SMTP Settings:**
   - **Host:** `smtp.resend.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Username:** `resend`
   - **Password:** `your_resend_api_key` (use your Resend API key from `.env.local`)
   - **Sender Email:** `hello@fibi.world` (must be from your verified domain)
   - **Sender Name:** `FiBi Team`

3. Click **"Save"** or **"Test Connection"** to verify the settings work

### Step 4: Test the Configuration

1. Try signing up with a test email address
2. Check if the confirmation email arrives
3. Check Supabase Dashboard → Authentication → Logs for any errors
4. If emails aren't arriving:
   - Verify your domain is verified in Resend
   - Check that the sender email matches your verified domain
   - Check Supabase Auth Logs for specific error messages

### Resend SMTP Configuration Summary

```
Host: smtp.resend.com
Port: 587 (TLS) or 465 (SSL)
Username: resend
Password: your_resend_api_key
Sender Email: hello@fibi.world
Sender Name: FiBi Team
```

**Important Notes:**
- The sender email (`hello@fibi.world`) must be from a domain verified in Resend
- For testing, you can use `onboarding@onboarding.resend.dev` (no verification needed)
- Resend has generous rate limits (100 emails/day on free tier, 50,000/month on paid)
- Better deliverability than Gmail SMTP for transactional emails

## Current SMTP Configuration

### Option 1: Gmail SMTP (Current)
- **Host:** `smtp.gmail.com` ✅
- **Port:** `587` ✅ (fixed from 581)
- **Username:** `sophie@uppcyx.co.uk` ✅
- **Sender:** `hello@fibi.world` ✅

### Option 2: Resend SMTP (Recommended for Production)
- **Host:** `smtp.resend.com`
- **Port:** `587` (TLS) or `465` (SSL)
- **Username:** `resend`
- **Password:** `your_resend_api_key` (from `.env.local`)
- **Sender:** `hello@fibi.world` (requires domain verification in Resend)

**Action Items:**
1. ✅ Resend API key configured in `.env.local`
2. ⏳ Verify `fibi.world` domain in Resend dashboard
3. ⏳ Update Supabase SMTP settings with Resend credentials
4. ⏳ Test email sending with Resend
5. ✅ Check redirect URLs are whitelisted in Supabase

