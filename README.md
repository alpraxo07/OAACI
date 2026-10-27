# OAACI — Original Art and Craft Introduction

A social network **and** portfolio platform for artists and craftspeople in India — think Instagram's feed and gallery mixed with LinkedIn's professional profile, plus direct messages and a marketplace for original work.

## Features

**Accounts**
- Sign up with email + password, Google, or phone OTP
- **Invite-only mode** (on by default) with invite codes, a public "request an invite" waitlist, and per-member invite quotas — switch it off in *Admin → Site settings* when you're ready to go mainstream
- 18+ age check (date of birth stays private), email verification, forgot/reset password
- Change username / email / password, log out of all devices, deactivate or permanently delete the account

**Profiles (Instagram × LinkedIn)**
- Profile photo, cover photo, headline, bio, website, art disciplines, "open to commissions" badge
- Tabs: **Posts**, **Gallery** (photo/video/song grid), **About** (artist CV: exhibitions, experience, education, awards), **Shop**
- **Verified artist ✓ badge** — artists apply, moderators approve
- Followers / following lists

**Posts**
- Text (280 characters), photos, videos and songs (with optional cover art)
- ⭐ Stars, comments, reposts, view counts, share / copy link
- Edit and delete posts; "sensitive content" blur for artistic nudity
- `#hashtags` (any script — `#मधुबनी` works), `@mentions`, clickable links
- Chronological home feed, Explore (popular / latest / trending / artist directory), search (people, posts, hashtags), trending hashtags

**Messages**
- One-to-one chat with photos, typing indicator, "Seen" read receipts, delete for everyone
- Real-time with Pusher (free tier); falls back to quick polling if Pusher isn't set up
- "Who can message you" setting

**Marketplace**
- List artworks/crafts with up to 6 photos, price in ₹, category, medium, size
- Browse with search, category, price range and sorting; mark as sold / hide
- "Message seller" opens a conversation with a link to the listing (payments are arranged directly — no payment gateway yet)

**Safety & moderation**
- Block, mute, report (posts, comments, accounts, listings, messages)
- Automatic bad-word masking (English, Hindi, Bengali + admin-defined words)
- Optional automatic image moderation (Sightengine): explicit images are held for review, suggestive ones are blurred
- **Admin panel**: dashboard, report queue (remove / approve / ban / dismiss), user management (ban, verify, roles), verification requests, waitlist, invite codes, **ads** (sponsored posts in feed and sidebar with view/click stats), site settings, audit log

**Design**
- Warm "paper & terracotta" palette, light/dark/system theme toggle
- Works on phones (bottom tab bar, full-screen chat) and desktops (three-column layout)

## Tech stack

| Part | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Prisma 6 |
| Media | Cloudinary (direct browser uploads, automatic resizing/format) |
| Email | Any SMTP provider (Brevo, Resend, Gmail app password, Zoho…) via Nodemailer |
| Real-time | Pusher Channels (optional) |
| Auth | Built-in: scrypt password hashing, database sessions in http-only cookies, Google OAuth (PKCE), Twilio SMS OTP |

## Media limits

| Type | Formats | Max size | Max length |
| --- | --- | --- | --- |
| Photos | JPG, PNG, WebP | 10 MB | — |
| Videos | MP4, MOV, WebM | 100 MB | 3 minutes |
| Songs | MP3, M4A, WAV, AAC, OGG, FLAC | 25 MB | 10 minutes |

These match Cloudinary's free plan (10 MB images, 100 MB videos) and can be changed in `src/lib/constants.ts`.

---

## Run it on your computer

Works on Windows, macOS and Linux. Takes about 15 minutes the first time.

**1. Install Node.js** — download the **LTS** version from [nodejs.org](https://nodejs.org) and install it with the default options. Check it worked by opening a terminal and typing `node -v` (you need 20.9 or newer).

**2. Get the code** — on GitHub click **Code → Download ZIP** and unzip it, or run `git clone https://github.com/alpraxo07/OAACI.git`.

**3. Get a database** — pick one:
- **Easiest (nothing to install):** create a free project at [neon.tech](https://neon.tech). On the dashboard click **Connect**, turn **Connection pooling off**, and copy the connection string (it starts with `postgresql://`).
- **On your computer:** install PostgreSQL ([Windows/macOS installers](https://www.postgresql.org/download/), or [Postgres.app](https://postgresapp.com) on a Mac). Remember the password you choose. Your connection string is `postgresql://postgres:YOUR_PASSWORD@localhost:5432/oaaci`.

**4. Open a terminal in the project folder** — Windows: open the folder, right-click an empty space → **Open in Terminal**. macOS: open Terminal, type `cd ` and drag the folder onto the window, then press Enter.

**5. Create your settings file**

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Open `.env` in any text editor (Notepad is fine) and set:
- `DATABASE_URL` and `DIRECT_URL` — both to the connection string from step 3
- `ADMIN_EMAILS` — your own email address

Leave everything else empty for now.

**6. Install, create the tables, start**

```bash
npm install
npm run db:migrate
npm run dev
```

**7. Open [http://localhost:3000](http://localhost:3000)** and click **Join OAACI**. Sign up with the email you put in `ADMIN_EMAILS` — you don't need an invite code. The "confirm your email" link is printed **in the terminal** (no real email is sent yet): copy it into your browser and you're the admin.

To stop the app press **Ctrl + C** in the terminal. Next time you only need `npm run dev`.

**If something goes wrong**
- `Can't reach database server` — check the connection string in `.env` (and that PostgreSQL is running, if it's on your computer).
- `Port 3000 is in use` — run `npm run dev -- -p 3001` and open http://localhost:3001 (also set `APP_URL="http://localhost:3001"` in `.env` so email links point to the right place).
- `'npm' is not recognized` — close and reopen the terminal after installing Node.js.

Without Cloudinary, SMTP or Twilio keys the app still works locally:
- uploads are saved to `public/uploads`,
- emails (verification links, password resets, invites) are **printed in the terminal**,
- phone OTP codes are **printed in the terminal**.

### Becoming the first admin

Put your email in `ADMIN_EMAILS` in `.env`. That address can sign up **without an invite code** and becomes an admin as soon as the email is verified. (Alternatively, sign up normally and run `npm run make-admin -- you@example.com`.)

Then open **Admin → Invites** to create invite codes for your first artists, or run `npm run create-invite -- 10` to print 10 codes.

---

## Deploy for free

About an hour the first time. You'll create four free accounts, collect some keys, paste them into Vercel and deploy. Keep a notes file open to collect the values as you go.

> **Free plan rule:** Vercel's free (Hobby) plan is for **non-commercial** use. An invite-only beta is fine, but before you run ads or earn money from OAACI, upgrade the Vercel project to **Pro** (about US$20/month). Check [Vercel's fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) if unsure.

### Step 1 — Database: Neon
1. Sign up at [neon.tech](https://neon.tech) (you can use your GitHub account).
2. Create a project named `oaaci`. For **Region** choose **AWS Asia Pacific (Singapore)** — the site runs in Singapore too (see `vercel.json`), which keeps pages fast.
3. On the project dashboard click **Connect**.
   - With **Connection pooling ON**, copy the string → this is `DATABASE_URL` (its host contains `-pooler`).
   - Turn **Connection pooling OFF**, copy again → this is `DIRECT_URL`.

### Step 2 — Photos, videos and songs: Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com) (free plan).
2. Open **Settings → API Keys** (or the dashboard) and copy **Cloud name**, **API Key** and **API Secret** → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### Step 3 — Email: Gmail (simplest to start)
OAACI sends verification, password-reset and invite emails.
1. Your Google account needs **2-Step Verification** turned on ([myaccount.google.com/security](https://myaccount.google.com/security)).
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), create an app password named `OAACI`, and copy the 16 letters (without spaces).
3. Your values: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=` your Gmail address, `SMTP_PASSWORD=` the 16 letters, `EMAIL_FROM="OAACI <your Gmail address>"`.

Gmail allows about 500 emails a day. When you buy your own domain, switch to [Brevo](https://www.brevo.com) or [Resend](https://resend.com) so emails come from `no-reply@yourdomain`.

### Step 4 — Instant chat: Pusher (optional, recommended)
Without it, chat still works but checks for new messages every few seconds.
1. Sign up at [pusher.com](https://pusher.com) → **Channels** → **Create app**. Name it `oaaci`, cluster **ap2 (Mumbai)**.
2. Open **App Keys** and copy `app_id`, `key`, `secret`, `cluster` → `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER`.

### Step 5 — A secret key
`SESSION_SECRET` protects logins. Generate one with Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
(Or type any random 40+ characters. Never share it.)

### Step 6 — Hosting: Vercel
1. Sign up at [vercel.com](https://vercel.com) **with your GitHub account** and allow it to see the `OAACI` repository.
2. Click **Add New → Project**, pick `OAACI`, click **Import**. Leave the framework (Next.js) and build settings as they are — `vercel.json` already sets the build command, which also creates the database tables.
3. Open **Environment Variables** and add (you can paste several `NAME=value` lines at once):
   ```
   DATABASE_URL=...           (Neon, pooled)
   DIRECT_URL=...             (Neon, direct)
   SESSION_SECRET=...
   ADMIN_EMAILS=you@gmail.com
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=you@gmail.com
   SMTP_PASSWORD=...
   EMAIL_FROM=OAACI <you@gmail.com>
   PUSHER_APP_ID=...
   PUSHER_SECRET=...
   NEXT_PUBLIC_PUSHER_KEY=...
   NEXT_PUBLIC_PUSHER_CLUSTER=ap2
   ```
4. Click **Deploy** and wait for the confetti (2–4 minutes).

### Step 7 — Tell OAACI its address
1. Copy your site address from Vercel (for example `https://oaaci.vercel.app`).
2. In the project go to **Settings → Environment Variables**, add `APP_URL` with that address (no `/` at the end).
3. Go to **Deployments**, open the ⋯ menu on the latest one and click **Redeploy**.

Email links and Google login use `APP_URL`, so do this before anyone signs up.

### Step 8 — Become the admin and invite artists
1. Open your site and click **Join OAACI**. Sign up with the email in `ADMIN_EMAILS` (no invite code needed).
2. Click the link in the confirmation email (check spam the first time). You now see **Admin** in the menu.
3. **Admin → Site settings** shows which services are connected. **Admin → Invites** creates invite codes for your first artists.
4. Quick test: post a photo, then sign up a second account in a private window with an invite code and send yourself a message.

### Every update after this
Push changes to the `main` branch on GitHub and Vercel deploys them automatically.

### Optional extras
- **Your own domain** (e.g. `oaaci.in`, bought from any registrar): Vercel → **Settings → Domains** → add it and follow the DNS instructions, then change `APP_URL` and redeploy.
- **Google login** — create an OAuth client at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (type *Web application*), add `{APP_URL}/api/auth/google/callback` as an authorised redirect URI, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Phone OTP** — SMS is not free. With a [Twilio](https://www.twilio.com) account set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM`. (Sending SMS to Indian numbers may require DLT registration.) Without it, phone login is hidden in production.
- **Image moderation** — [Sightengine](https://sightengine.com) free tier: set `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET`.

### Free plan limits (roughly)
| Service | Free allowance |
| --- | --- |
| Neon | 0.5 GB database |
| Cloudinary | 25 credits/month (1 credit ≈ 1 GB stored or 1 GB viewed) |
| Gmail | ~500 emails/day |
| Pusher | 200,000 messages/day, 100 people connected at once |
| Vercel Hobby | Non-commercial use; generous traffic for a beta |

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build / start |
| `npm run db:migrate` | Apply schema changes in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run make-admin -- <email or username>` | Make someone an admin |
| `npm run create-invite -- [count] [uses]` | Print new invite codes |
| `npm run lint` / `npm run typecheck` | Code checks |

## Project structure

```
prisma/schema.prisma      Database schema (users, posts, messages, listings, reports…)
src/app/(auth)/           Login, sign-up, phone OTP, password reset, waitlist
src/app/(main)/           The app: feed, explore, search, profiles, messages, market, settings, admin
src/app/api/              Endpoints for uploads, pagination, unread counts, real-time auth
src/actions/              Server actions (all writes: posts, social, messages, market, account, admin)
src/lib/                  Auth, database, media, email/SMS, moderation, feeds and other helpers
src/components/           UI components
scripts/                  make-admin and create-invite command-line tools
```

## Before a public launch

- Have the **Terms** and **Privacy Policy** pages (`src/app/(main)/terms`, `.../privacy`) reviewed by a lawyer for the IT Act 2000, IT Rules 2021 and the DPDP Act 2023, and publish a grievance-officer contact.
- Use a custom domain and a verified sending domain for email.
- Ideas for later: online payments in the marketplace (e.g. Razorpay), installable app (PWA), groups/communities, multi-photo posts.
