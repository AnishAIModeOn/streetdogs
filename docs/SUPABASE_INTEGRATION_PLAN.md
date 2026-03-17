# StreetDog App Supabase Integration Plan

## 1. Environment

Add these frontend env vars:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Add this server env var in Supabase/Vercel where needed:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
```

## 2. Apply schema

Run the SQL in:

- `supabase/streetdog_app_core.sql`

This creates:

- `profiles`
- `dogs`
- `expenses`
- `contributions`
- storage buckets `dog-photos` and `expense-receipts`
- RLS policies
- profile auto-create trigger on `auth.users`

## 3. Frontend providers

Wrap the app root with `AppProviders` from:

- `src/providers/AppProviders.tsx`

Example:

```tsx
import { AppProviders } from './providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
```

## 4. Page wiring

### Index

- Use `useDogs()` for a recent dogs strip or landing highlights.
- Use lightweight metrics via a small API route or direct query if the landing is auth-gated.

### Login

- Replace current submit handlers with `useSignIn()` and `useSignUp()`.
- After auth success, query `useAuthState()` and route by role/profile completion.

### ReportDog

- Use `useUploadDogPhoto()` first if a photo is selected.
- Pass returned `photo_path` and `photo_url` into `useCreateDog()`.
- Keep guest reporting separate if anonymous reporting remains a requirement.

### DogListing

- Use `useDogs({ city, areaName, search })`.
- Add list filtering with query params or local form state.

### Dashboard

- Use `useAuthState()` for current user/profile.
- Use `useDogs()` for recent or assigned dogs.
- Use `useExpenses()` for expense summaries and support panels.

### Admin

- Wrap with `ProtectedRoute allowedRoles={['admin']}`.
- Add admin-only queries later for profile management, dog moderation, and expense oversight.

## 5. Protected routes

Use `src/routes/ProtectedRoute.tsx` for:

- authenticated-only pages: Dashboard, ReportDog, DogListing
- admin-only pages: Admin

Example:

```tsx
<Routes>
  <Route path="/" element={<IndexPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/report-dog" element={<ReportDogPage />} />
    <Route path="/dogs" element={<DogListingPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
  </Route>
  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
    <Route path="/admin" element={<AdminPage />} />
  </Route>
</Routes>
```

## 6. Migration notes for the current repo

The current repo still uses:

- JavaScript component files
- custom path navigation instead of `react-router-dom`
- direct Supabase helpers in `src/lib`

Recommended migration order:

1. Keep the current app running as-is.
2. Move new pages or refactors to the typed service + hook layer first.
3. Introduce React Query provider at the root.
4. Migrate page data fetching one page at a time.
5. Switch routing to `react-router-dom` only when ready, since the current app uses manual path handling.
