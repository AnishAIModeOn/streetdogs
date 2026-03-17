# StreetDogs

StreetDogs is a responsive community welfare app for tracking local dog care, food planning, donation appeals, volunteer contributions, and task coordination.

## Tech stack

- React 19
- Vite 7
- Supabase JavaScript client
- Vercel deployment

## Environment variables

Create a `.env.local` file in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Vite is configured to expose `NEXT_PUBLIC_*` values to the browser, so the same variable names should also be used in Vercel.

## Supabase setup

1. Open your Supabase project.
2. Go to the SQL editor.
3. Run `supabase/schema.sql`.

This creates the following tables:

- `users`
- `dogs`
- `donation_appeals`
- `contributions`
- `tasks`
- `inventory_items`
- `food_commitments`

It also enables Row Level Security and adds basic read/insert/update policies for `anon` and `authenticated` roles so the frontend can work with the anon key during local development and Vercel previews.

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Vercel environment variables

In Vercel project settings, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use the same values from your local `.env.local`.

## What is already connected

- Dog profiles are loaded from Supabase.
- Dog profile creation writes to Supabase.
- Inventory items are loaded from Supabase.
- Inventory item creation writes to Supabase.
- Donation appeals are loaded from Supabase.
- Contributions are loaded from Supabase.
- Tasks are loaded from Supabase.
- Donation appeal create and status update flows write back to Supabase.
- Contribution create and status update flows write back to Supabase.
