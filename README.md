# MUNA IBS

MUNA IBS is a beginner-friendly responsive Next.js app for tracking meals, symptoms, possible triggers, bowel movements, water, sleep, medication reminders, meal planning, and weekly reports.

Medical disclaimer: MUNA IBS does not provide medical diagnosis, treatment, or cure claims. Users should consult a qualified doctor or dietitian for medical advice, diagnosis, treatment, diet changes, medicines, or urgent symptoms.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase authentication and database
- PWA manifest and service worker
- MUNA IBS company/app logo assets
- Capacitor-friendly frontend structure for later Android packaging

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

3. Add your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a new Supabase project.
2. Go to Authentication > Providers and enable Email.
3. Go to SQL Editor.
4. Run `supabase/schema.sql`.
5. Copy the project URL and anon public key into `.env.local`.

The SQL creates these tables:

- `users`
- `meals`
- `symptoms`
- `bowel_movements`
- `trigger_foods`
- `water_logs`
- `sleep_logs`
- `medication_reminders`
- `weekly_reports`

Row Level Security is enabled so signed-in users can manage only their own rows.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. Deploy.

## PWA Notes

The app includes:

- `public/manifest.json`
- `public/sw.js`
- `public/brand/muna-logo.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png`
- mobile theme metadata in `src/app/layout.tsx`

The service worker registers in production builds.

## Later Capacitor Android Steps

When ready for Play Store packaging:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "MUNA IBS" "com.yourcompany.munaibs"
npx cap add android
npm run build
npx cap sync android
npx cap open android
```

For a full offline mobile app, add local storage and sync logic before publishing.
