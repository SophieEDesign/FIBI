# Quick Guide: Adding Resend to Supabase

This guide shows you exactly how to configure Resend SMTP in Supabase so that Supabase can send authentication emails (signup confirmations, password resets, etc.) through Resend.

## Resend API Information

- **API Base URL:** `https://api.resend.com`
- **SMTP Host:** `smtp.resend.com` (for Supabase SMTP configuration)
- **SMTP Port:** `587` (TLS) or `465` (SSL)
- **SMTP Username:** `resend`
- **SMTP Password:** Your Resend API key
- **API Key:** `re_DRgKkAfM_K7WNtnxuKfAMWztgNa1zYRTL` (already in `.env.local`)

## Step-by-Step Instructions

### 1. Verify Your Domain in Resend (Required)

Before Supabase can send emails from `hello@fibi.world`, you need to verify the domain in Resend:

1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter: `fibi.world`
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually a few minutes, can take up to 24 hours)

**For Testing (No Verification Needed):**
- You can use `onboarding@onboarding.resend.dev` immediately
- This is Resend's default testing domain

### 2. Configure Resend SMTP in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to: **Authentication → Settings → SMTP Settings**
3. Enter these exact values:

   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_DRgKkAfM_K7WNtnxuKfAMWztgNa1zYRTL
   Sender Email: hello@fibi.world
   Sender Name: FiBi Team
   ```

4. Click **"Save"** or **"Test Connection"** to verify

### 3. Test It

1. Try signing up with a test email
2. Check if the confirmation email arrives
3. Check **Supabase Dashboard → Authentication → Logs** for any errors

## Important Notes

- ✅ Your Resend API key is already in `.env.local`
- ⚠️ The sender email (`hello@fibi.world`) must match a verified domain in Resend
- ✅ For testing, use `onboarding@onboarding.resend.dev` if your domain isn't verified yet
- ✅ Port `587` uses TLS (recommended), or use `465` for SSL

## Troubleshooting

**Emails not sending?**
- Check that your domain is verified in Resend
- Verify the sender email matches your verified domain
- Check Supabase Auth Logs for specific error messages
- Make sure the API key is correct (no extra spaces)

**Connection test fails?**
- Double-check the host: `smtp.resend.com` (not `smtp.gmail.com`)
- Verify the username is exactly: `resend`
- Make sure the password is your full API key: `re_DRgKkAfM_K7WNtnxuKfAMWztgNa1zYRTL`

## What This Does

Once configured, Supabase will use Resend to send:
- ✅ Email confirmation emails (when users sign up)
- ✅ Password reset emails
- ✅ Email change confirmation emails
- ✅ All other authentication-related emails

This replaces Gmail SMTP and provides better deliverability and higher rate limits.

