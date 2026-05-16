# 📧 Gmail SMTP Setup Guide

KnotEngine uses Gmail SMTP for sending transactional emails (payment alerts, security notifications, billing updates).

---

## ⚙️ Setup Steps

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "Signing in to Google", select **2-Step Verification**
4. Follow the prompts to enable 2FA

---

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Under "App passwords", select:
   - **App**: Mail
   - **Device**: Other (Custom name)
   - Enter: `KnotEngine`
3. Click **Generate**
4. Copy the 16-character password (e.g., `xxxx xxxx xxxx xxxx`)

**Important:** This is NOT your regular Gmail password. It's a special app password.

---

### Step 3: Add to Environment Variables

Create or update your `.env` file in the **project root** directory:

```bash
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587

# Email From Address
FROM_EMAIL="KnotEngine <your-email@gmail.com>"

# Dashboard URL (for email links)
DASHBOARD_URL=http://localhost:5052
```

---

### Step 4: Test Connection

Start the API server and check logs:

```bash
cd apps/api
pnpm dev
```

You should see:

```
✅ Gmail SMTP connection successful
```

If you see an error:

- Double-check your app password (no spaces)
- Ensure 2FA is enabled
- Check that GMAIL_USER is correct

---

## 📊 Gmail Sending Limits

| Account Type         | Daily Limit      | Per-Minute Limit   |
| -------------------- | ---------------- | ------------------ |
| **Free Gmail**       | 500 emails/day   | ~100 emails/minute |
| **Google Workspace** | 2,000 emails/day | ~100 emails/minute |

**For KnotEngine:**

- 100 merchants × 10 emails/month = 1,000 emails/month ✅
- Well within free tier limits

---

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use dedicated Gmail account** - Don't use personal email
3. **Rotate app password** - Generate new one every 90 days
4. **Monitor sent emails** - Check Gmail "Sent" folder regularly

---

## 🛠️ Troubleshooting

### "Invalid credentials" error

- Ensure app password has no spaces
- Check GMAIL_USER matches the Gmail account
- Verify 2FA is enabled

### "Connection timeout" error

- Check firewall settings
- Try port 465 with `secure: true`
- Verify SMTP host is `smtp.gmail.com`

### "Less secure app access" error

- This is deprecated - use App Password instead
- Follow Step 2 to generate app password

---

## 📝 Example .env File

```bash
# Database
DATABASE_URL=mongodb://localhost:27017/knotengine

# Redis
REDIS_URL=redis://localhost:6379

# Blockchain Providers
TATUM_API_KEY=your-tatum-key
ALCHEMY_API_KEY=your-alchemy-key

# Gmail SMTP
GMAIL_USER=knotengine.payments@gmail.com
GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
FROM_EMAIL="KnotEngine <knotengine.payments@gmail.com>"

# Dashboard
DASHBOARD_URL=http://localhost:5052

# JWT Secret
JWT_SECRET=your-jwt-secret-here

# Internal Secret
INTERNAL_SECRET=your-internal-secret-here
```

---

## 🎯 Production vs Development

In the current architecture, KnotEngine follows a **hybrid email model**:

1. **Local Development**: Use this guide to set up **Gmail SMTP**. It is free, requires no DNS verification, and is perfect for testing onboarding and payment flows.
2. **Production**: Use **Resend**. It provides enterprise-grade deliverability, bounce tracking, and professional custom domains.

If `NODE_ENV=production` is set, the system will prioritize the `RESEND_API_KEY`. Otherwise, it falls back to the Gmail configuration.

---

## 🎯 Gmail Production Best Practices (Optional)

If you still choose to use Gmail for production:

1. **Use Google Workspace** - Better deliverability, higher limits
2. **Set up custom domain** - `noreply@yourdomain.com`
3. **Configure SPF/DKIM** - Improves email deliverability
4. **Monitor bounce rates** - Keep under 5%

---

**Questions?** Check the [Gmail SMTP documentation](https://support.google.com/mail/answer/7126229)
