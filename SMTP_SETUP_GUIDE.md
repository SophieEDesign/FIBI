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

## Current SMTP Configuration

Based on your setup:
- **Host:** `smtp.gmail.com` ✅
- **Port:** `587` ✅ (fixed from 581)
- **Username:** `sophie@uppcyx.co.uk` ✅
- **Sender:** `hello@fibi.world` ✅

**Action Items:**
1. Verify you're using Gmail App Password (not regular password)
2. Check redirect URLs are whitelisted
3. Test signup and check Auth Logs for errors
4. Consider switching to transactional email service for production

