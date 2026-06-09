# Luca's Baby Tracker

Family login app for logging Luca’s feeds, sleep, diapers, and pumping — plus the 3-month feeding & sleep schedule.

**Live:** https://lzhang-png.github.io/baby/

## Features

- Email/password login for family members
- Invite code to add partner or relatives to the same household
- Log: feeding (nursing, formula, expressed, donated), sleep, diapers, pumping
- Today timeline with daily counts
- Schedule page (historical trends + 3-month plan)

## Supabase setup (required)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy **Project URL** and **anon public key** from Settings → API

### 2. Run the database schema

In Supabase Dashboard → **SQL Editor**, paste and run the full contents of:

```
supabase/schema.sql
```

### 3. Configure Auth URLs

In Supabase → **Authentication** → **URL configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://lzhang-png.github.io/baby/` |
| Redirect URLs | `https://lzhang-png.github.io/baby/**`, `http://localhost:5173/**` |

For local dev, you can disable **Confirm email** under Auth → Providers → Email (optional, speeds up testing).

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

For GitHub Pages deploy, add the same values as repository **Secrets** → Actions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Local development

Requires **Node.js 20+**.

```bash
npm install
npm run dev
```

Open the exact URL Vite prints, usually **http://localhost:5173/**

If you see a blank page:

1. Confirm `npm install` finished without errors
2. Confirm `npm run dev` is still running in the terminal
3. Hard refresh the browser (`Cmd+Shift+R` on Mac)
4. Open the app in Chrome or Safari (not an embedded IDE preview)
5. If an error panel appears, follow its steps or check the browser console (`F12`)

## First account vs family members

| Who | Sign up flow |
|-----|----------------|
| **First person (you)** | Sign up → leave invite code **blank** → creates household + Luca |
| **Family members** | Sign up → enter **invite code** from Family page |

Existing users sign in at `/login`.

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm run preview  # preview production build
```

## Stack

- React 19 + Vite + TypeScript
- shadcn/ui (radix-nova)
- Supabase (Auth + PostgreSQL + RLS)
- GitHub Pages + Actions
