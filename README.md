# SF Pickle Courts — React + TypeScript + Supabase Admin

A public pickleball-court directory. Visitors browse venue cards and open each venue's own Facebook page, map location, or website/booking page. It does **not** connect to venue booking databases.

## Requirements

- Node.js 20.19+ or 22.12+
- A Supabase project
- VS Code (recommended)

## 1. Install and run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open the local URL shown by Vite.

## 2. Configure Supabase

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase.
3. Open `supabase/setup.sql`, copy its full contents, and run it.
   - This creates `courts`, `admin_users`, the admin-check function, RLS policies, and the public `court-logos` Storage bucket.
   - It seeds Eastside Pickle, Highway Drive Pickleball, and Lakbai Pickleball.
4. In Supabase **Project Settings → API**, copy the Project URL and the publishable/anon key.
5. Paste them into your local `.env` file:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

6. Restart Vite after changing `.env`.

The public directory reads only active records from `courts`. If Supabase is not configured, the original bundled three listings are used as a local preview fallback.

## 3. Create your private admin account

For a single-owner directory, do **not** enable public sign-ups.

1. In Supabase open **Authentication → Users**.
2. Choose **Add user** and create your admin email/password. Confirm the user if the dashboard asks.
3. Copy that user's UUID from the Users table.
4. In **SQL Editor**, run this statement with the real UUID:

```sql
insert into public.admin_users (user_id)
values ('PASTE-THE-AUTH-USER-UUID-HERE');
```

Only user IDs listed in `admin_users` pass `is_court_admin()` and can create, update, or delete listings or upload logos. Keep your password private. If you need another administrator, create another Auth user and add their UUID to `admin_users`.

## 4. Open the admin dashboard

With the site running, visit:

- Local: `http://localhost:5173/admin`
- Production: `https://YOUR-DOMAIN/admin`

Sign in with the admin account you created. You can add, edit, hide/show, and delete venues; upload a logo (max 5 MB); and manage Facebook, map/location, and website/booking URLs.

The admin editor requires the court name and website/booking URL. Facebook and map links are optional. The public directory shows active courts only.

## 5. Deploy to Cloudflare Pages

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

In Cloudflare Pages → Settings → Environment variables, add the same two variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set them for both Production and Preview as appropriate, then redeploy.

## Security notes

- The frontend uses only the Supabase publishable/anon key. This key is designed to be public; RLS is the security boundary.
- **Never** put a Supabase `service_role` or secret key in `.env`, frontend code, GitHub, or Cloudflare Pages client-side variables.
- Public users can read active court listings and public logo files only.
- Only Auth users whose UUID is in `public.admin_users` can mutate court records or upload/update/delete logo files.
- Keep public Auth sign-ups disabled; create admin users from the Supabase dashboard.
- If an admin leaves, remove their UUID from `public.admin_users` and disable/delete their Auth user.

## Adding a venue

Go to `/admin` → **Add new court**. Enter the venue name, location, website/booking URL, optional Facebook and Google Maps links, description, and logo. Save. The listing appears on the public directory without a website redeploy.

## Project structure

- `src/App.tsx` — public directory and venue popup
- `src/AdminApp.tsx` — login and CRUD dashboard
- `src/courts.ts` — local preview fallback listings
- `src/lib/supabase.ts` — Supabase client
- `src/admin.css` — admin styles
- `supabase/setup.sql` — database, storage and RLS setup
