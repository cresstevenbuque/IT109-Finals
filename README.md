# BasuraTrack 🚛♻️

**Barangay Garbage Collection Scheduler** — A full-stack web application for managing garbage collection operations in Butuan City barangays.

> Final Project for IT 109: System Integration and Architecture

## Architecture

```mermaid
graph TB
    subgraph Frontend ["Frontend — Vue 3 + Vite (Vercel)"]
        direction TB
        UI[Vue Components & Views]
        Stores[Pinia Stores]
        Services[Service Layer]
        UI --> Stores --> Services
    end

    subgraph Supabase ["Backend — Supabase"]
        direction TB
        Auth[Auth + JWT]
        DB[(PostgreSQL + RLS)]
        Storage[Storage Bucket]
        EF1[Edge Fn: send-sms]
        EF2[Edge Fn: send-reminders]
        EF3[Edge Fn: check-weather]
    end

    subgraph External ["Third-Party APIs"]
        OSM[OpenStreetMap Tiles]
        NOM[Nominatim Geocoding]
        SEM[Semaphore SMS]
        OW[OpenWeather]
        RES[Resend Email]
    end

    Services -->|supabase-js| Auth
    Services -->|supabase-js| DB
    Services -->|supabase-js| Storage
    Services -->|functions.invoke| EF1
    Services -->|functions.invoke| EF3
    UI -->|Leaflet| OSM
    Services -->|fetch| NOM
    EF1 -->|POST| SEM
    EF1 -.->|fallback| RES
    EF2 -->|POST| SEM
    EF3 -->|GET| OW
    EF1 -->|INSERT| DB
    EF2 -->|INSERT| DB
    EF3 -->|INSERT| DB
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API, `<script setup>`), Vite, Vue Router 4, Pinia |
| UI Framework | Vuetify 3 (Material Design) |
| Backend/DB | Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions) |
| Maps | Leaflet + OpenStreetMap tiles, Nominatim geocoding |
| Charts | Chart.js via vue-chartjs |
| SMS | Semaphore (Philippine SMS API) |
| Email Fallback | Resend |
| Weather | OpenWeather API |
| CSV Export | PapaParse |
| Deployment | Vercel (frontend), Supabase (backend) |

## User Roles

| Role | Access |
|------|--------|
| **admin** | Full access: manage puroks, trucks, routes, schedules, residents, logs, reports, announcements, integrations |
| **collector** | View assigned routes, log collection status (completed/delayed/skipped) |
| **resident** | View schedule & map, report missed pickups, read announcements |

## Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) [Semaphore](https://semaphore.co) API key for SMS
- (Optional) [OpenWeather](https://openweathermap.org/api) API key for weather
- (Optional) [Resend](https://resend.com) API key for email fallback

### 1. Clone and Install

```bash
git clone <repo-url>
cd BasuraTrack
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql` — this creates all tables, triggers, RLS policies, and the storage bucket
3. Then run `supabase/seed.sql` — this inserts sample data (4 puroks, 3 trucks, 4 routes, schedules, etc.)
4. Go to **Authentication → Settings** and disable email confirmation for testing
5. Create test users via **Authentication → Users → Add User**:
   - `admin@basuratrack.test` / `Admin123!`
   - `collector1@basuratrack.test` / `Collector123!`
   - `resident1@basuratrack.test` / `Resident123!`
6. Update profiles to set roles:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<admin-user-uuid>';
   UPDATE profiles SET role = 'collector' WHERE id = '<collector-user-uuid>';
   ```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key (from **Settings → API**):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 5. Deploy Edge Functions (Optional)

If you have the Supabase CLI installed:
```bash
supabase functions deploy send-sms
supabase functions deploy send-reminders
supabase functions deploy check-weather
```

Set secrets:
```bash
supabase secrets set SEMAPHORE_API_KEY=your-key
supabase secrets set OPENWEATHER_API_KEY=your-key
supabase secrets set RESEND_API_KEY=your-key
```

### 6. Set Up Cron for Daily Reminders

In Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'send-daily-reminders',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 7. Deploy to Vercel

```bash
npm run build
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## API Keys — Where to Get Them

| Service | URL | Free Tier |
|---------|-----|-----------|
| Supabase | https://supabase.com | 500MB DB, 1GB storage |
| Semaphore | https://semaphore.co | Free credits for testing |
| OpenWeather | https://openweathermap.org/api | 1,000 calls/day |
| Resend | https://resend.com | 100 emails/day |

## Project Structure

```
src/
├── main.js              # App entry point
├── App.vue              # Root component with snackbar & confirm dialog
├── plugins/
│   └── vuetify.js       # Vuetify theme config (green/teal, light/dark)
├── router/
│   └── index.js         # Routes with role-based guards
├── stores/
│   └── auth.js          # Pinia auth store
├── services/            # All API calls (never in components)
│   ├── supabaseClient.js
│   ├── purokService.js
│   ├── truckService.js
│   ├── routeService.js
│   ├── scheduleService.js
│   ├── residentService.js
│   ├── collectionLogService.js
│   ├── missedPickupService.js
│   ├── announcementService.js
│   ├── integrationLogService.js
│   ├── geocodingService.js
│   └── storageService.js
├── composables/         # Shared reactive logic
│   ├── useSnackbar.js
│   ├── useConfirmDialog.js
│   └── useWasteTypeColors.js
├── components/
│   └── layout/
│       ├── AppShell.vue
│       └── NavDrawer.vue
└── views/               # Page components (one folder per module)
    ├── Auth/
    ├── Dashboard/
    ├── Puroks/
    ├── Trucks/
    ├── Routes/
    ├── Schedules/
    ├── Residents/
    ├── CollectionLogs/
    ├── MissedPickups/
    ├── Announcements/
    ├── Integrations/
    └── Home/
```

## License

MIT — Built for IT 109: System Integration and Architecture
