# Supabase + Vercel Setup

## 1) Local development
The project already has [.env.local](.env.local) with:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Run local app and confirm cloud sync works.

## 2) Vercel environment variables
In Vercel Dashboard -> Project -> Settings -> Environment Variables, add:

- VITE_SUPABASE_URL = https://kvcgrlfrhjdxhmpqawko.supabase.co
- VITE_SUPABASE_ANON_KEY = your anon key

Apply to all environments you use:

- Production
- Preview
- Development

## 3) Redeploy
Redeploy from Vercel so frontend build includes the VITE_* values.

## 4) Supabase checks
Ensure these are done in Supabase:

- RLS enabled on profiles, question_progress, stats, settings
- Policies allow rows where user_id = auth.uid() if using Supabase Auth

## 5) Supabase Auth mode (recommended production)

- Go to Profile page in app and sign in/up using email + password for cloud auth.
- Confirm footer shows hasAuth=yes.
- After verifying sync works, run:

	- [data/supabase_sql/003_enable_auth_uid_policies.sql](data/supabase_sql/003_enable_auth_uid_policies.sql)

This removes temporary anon-wide access and enforces owner-only access by auth.uid().

## 6) Current app behavior
The app is local-first:

- Still writes localStorage immediately
- Auto-syncs to Supabase when env is configured
- Falls back to local-only mode if Supabase is unreachable
