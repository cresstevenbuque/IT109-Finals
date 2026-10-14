# API Flow Documentation

> Step-by-step explanation of every third-party integration in BasuraTrack.
> Use this document for your IT 109 presentation on System Integration and Architecture.

---

## Table of Contents

1. [Supabase Auth Flow](#1-supabase-auth-flow)
2. [Supabase Database (CRUD via supabase-js)](#2-supabase-database-crud)
3. [Map Display — Leaflet + OpenStreetMap](#3-map-display)
4. [Geocoding — Nominatim](#4-geocoding---nominatim)
5. [SMS — Semaphore API](#5-sms---semaphore-api)
6. [Email Fallback — Resend](#6-email-fallback---resend)
7. [Scheduled Reminders — Cron + Edge Function](#7-scheduled-reminders)
8. [Weather Check — OpenWeather API](#8-weather-check---openweather-api)
9. [Photo Upload — Supabase Storage](#9-photo-upload---supabase-storage)
10. [Integration Logs — Audit Trail](#10-integration-logs)

---

## 1. Supabase Auth Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant V as Vue App
    participant S as Supabase Auth

    U->>V: Fill login form (email, password)
    V->>S: supabase.auth.signInWithPassword({ email, password })
    S-->>V: { user, session } with JWT token
    V->>V: Store user in Pinia auth store
    V->>S: supabase.from('profiles').select().eq('id', user.id)
    S-->>V: Profile data (role, purok_id, etc.)
    V->>V: Router guard checks profile.role
    V->>U: Redirect to role-appropriate page
```

**Key points:**
- JWT token is stored in localStorage by supabase-js automatically
- The `handle_new_user()` trigger auto-creates a profile row on signup
- `role` is passed via `raw_user_meta_data` during signup and stored in profiles
- Router guards in `src/router/index.js` check `meta.roles` against the user's role

**Files involved:**
- `src/stores/auth.js` — login, register, logout, profile fetch
- `src/router/index.js` — beforeEach guard
- `supabase/schema.sql` — `handle_new_user()` trigger

---

## 2. Supabase Database (CRUD)

```mermaid
sequenceDiagram
    participant C as Vue Component
    participant St as Pinia Store
    participant Sv as Service Layer
    participant SB as Supabase (PostgreSQL + RLS)

    C->>St: User clicks "Create Purok"
    St->>Sv: purokService.createPurok({ name, description })
    Sv->>SB: supabase.from('puroks').insert(data).select().single()
    SB->>SB: RLS checks current_user_role() = 'admin'
    SB-->>Sv: { data: newPurok, error: null }
    Sv-->>St: Return new purok
    St-->>C: Update reactive state
    C->>C: Show snackbar "Purok created"
```

**Architecture pattern:**
```
Component (UI) → Store (state) → Service (API) → Supabase (DB + RLS)
```

- Components NEVER call Supabase directly
- Services handle all `supabase.from()` calls with try/catch
- RLS policies enforce permissions at the database level (defense in depth)
- Every service uses `{ count: 'exact' }` for server-side pagination

**Files:** `src/services/*.js` (one per table)

---

## 3. Map Display

```mermaid
sequenceDiagram
    participant V as Vue Component
    participant L as Leaflet.js
    participant T as OpenStreetMap Tile Server

    V->>L: L.map('container').setView([8.9475, 125.5406], 15)
    L->>T: GET https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
    T-->>L: Map tile images
    L-->>V: Render map in DOM
    V->>L: L.marker([lat, lng]).addTo(map)
    V->>L: L.polyline(stops, { color }).addTo(map)
```

**Used in:**
- Route Map Editor (`views/Routes/RouteMapView.vue`) — click to add stops, drag to reorder
- Resident Form (`views/Residents/ResidentFormDialog.vue`) — pin placement
- Missed Pickup Form (`views/MissedPickups/MissedPickupFormDialog.vue`) — pin location
- Resident Home (`views/Home/ResidentHomeView.vue`) — route display

**No API key needed** — OpenStreetMap tiles are free and open.

---

## 4. Geocoding — Nominatim

```mermaid
sequenceDiagram
    participant U as User
    participant V as Vue (ResidentFormDialog)
    participant G as geocodingService.js
    participant N as Nominatim API

    U->>V: Enter address "J.C. Aquino Avenue, Butuan City"
    U->>V: Click "Geocode Address"
    V->>G: geocodeAddress("J.C. Aquino Avenue, Butuan City")
    G->>G: Check in-memory cache (miss)
    G->>G: Rate limit wait (1 request/second)
    G->>N: GET https://nominatim.openstreetmap.org/search?q=...&format=json&countrycodes=ph
    Note over G,N: Headers: User-Agent: BasuraTrack/1.0
    N-->>G: [{ lat: "8.9512", lon: "125.5350", display_name: "..." }]
    G->>G: Cache result
    G-->>V: { lat: 8.9512, lng: 125.5350, display_name: "..." }
    V->>V: Place marker on map, store lat/lng in form
    V->>V: supabase.from('profiles').update({ lat, lng, address })
```

**Nominatim usage policy compliance:**
- Custom `User-Agent` header: `BasuraTrack/1.0`
- Rate limited to max 1 request per second (enforced in `geocodingService.js`)
- Results cached in-memory to avoid duplicate requests
- Country filter: `countrycodes=ph` (Philippines only)
- Fallback: if geocoding fails, user can manually click the map to place a pin

**File:** `src/services/geocodingService.js`

---

## 5. SMS — Semaphore API

```mermaid
sequenceDiagram
    participant A as Admin (Vue)
    participant SB as Supabase
    participant EF as Edge Fn: send-sms
    participant SM as Semaphore API
    participant DB as integration_logs

    A->>SB: supabase.functions.invoke('send-sms', { body: { type, purok_id, title, body } })
    SB->>EF: Forward request to Edge Function
    EF->>SB: Query profiles WHERE role='resident' AND purok_id=X
    SB-->>EF: List of residents with phone numbers
    loop For each resident
        EF->>SM: POST https://api.semaphore.co/api/v4/messages
        Note over EF,SM: Body: { apikey, number, message, sendername }
        SM-->>EF: { message_id, status: "sent" }
        EF->>DB: INSERT integration_logs (service, action, request, response, status)
    end
    EF-->>A: { sent: 12, failed: 1, total: 13 }
```

**Edge Function location:** `supabase/functions/send-sms/index.ts`

**Why an Edge Function?** The Semaphore API key is a secret and must never be exposed in frontend code. Edge Functions run server-side in Supabase's Deno runtime.

**Message format (reminder):**
```
BasuraTrack: Tomorrow, Monday 6:00 AM, collection for Biodegradable in Purok 1 - Libertad.
```

**Getting a Semaphore API key:**
1. Register at https://semaphore.co
2. Get free test credits
3. Copy your API key from the dashboard
4. Set as `SEMAPHORE_API_KEY` in Supabase Edge Function secrets

---

## 6. Email Fallback — Resend

```mermaid
sequenceDiagram
    participant EF as Edge Fn: send-sms
    participant R as Resend API

    Note over EF: If SEMAPHORE_API_KEY is not set...
    EF->>EF: Check for RESEND_API_KEY
    EF->>R: POST https://api.resend.com/emails
    Note over EF,R: Headers: Authorization: Bearer <key>
    Note over EF,R: Body: { from, to, subject, text }
    R-->>EF: { id: "email_123" }
    EF->>EF: Log to integration_logs with service='resend'
```

**Fallback logic in `send-sms/index.ts`:**
1. If `SEMAPHORE_API_KEY` exists → use Semaphore SMS
2. Else if `RESEND_API_KEY` exists → use Resend email
3. Else → log as `pending` with error "No API key configured"

---

## 7. Scheduled Reminders

```mermaid
sequenceDiagram
    participant CR as Supabase Cron (pg_cron)
    participant EF as Edge Fn: send-reminders
    participant DB as PostgreSQL
    participant SM as Semaphore API

    CR->>EF: HTTP POST (daily at 18:00 PHT)
    EF->>DB: SELECT schedules WHERE day_of_week = tomorrow AND active = true
    DB-->>EF: List of tomorrow's schedules with route/purok info
    loop For each schedule
        EF->>DB: SELECT profiles WHERE purok_id = X AND role = 'resident'
        DB-->>EF: Residents with phone numbers
        EF->>SM: Send SMS reminder to each resident
        EF->>DB: INSERT integration_logs
    end
    EF-->>CR: { schedules_found: 4, sms_sent: 45 }
```

**Cron setup** (SQL in Supabase dashboard):
```sql
SELECT cron.schedule('send-daily-reminders', '0 10 * * *', ...);
```
`0 10 * * *` = 10:00 UTC = 18:00 PHT (day before collection)

**File:** `supabase/functions/send-reminders/index.ts`

---

## 8. Weather Check — OpenWeather API

```mermaid
sequenceDiagram
    participant A as Admin Dashboard
    participant SB as Supabase
    participant EF as Edge Fn: check-weather
    participant OW as OpenWeather API
    participant DB as integration_logs

    A->>SB: supabase.functions.invoke('check-weather')
    SB->>EF: Forward request
    EF->>OW: GET https://api.openweathermap.org/data/2.5/forecast?lat=8.9475&lon=125.5406&appid=KEY&cnt=8
    OW-->>EF: Forecast data (next 24h, 3-hour intervals)
    EF->>EF: Analyze for rain (check pop > 0.5 or weather.main = 'Rain')
    EF->>DB: INSERT integration_logs (service='openweather')
    EF-->>A: { rain_expected: true, rain_probability: 70, banner_message: "⚠️ Rain expected...", draft_announcement: "Due to expected rainfall..." }
    A->>A: Show rain banner + "Create Announcement" button
```

**Response includes a `draft_announcement` string** that the admin can one-click post as an announcement.

**File:** `supabase/functions/check-weather/index.ts`

---

## 9. Photo Upload — Supabase Storage

```mermaid
sequenceDiagram
    participant R as Resident
    participant V as Vue (MissedPickupForm)
    participant S as storageService.js
    participant SB as Supabase Storage

    R->>V: Select photo file
    V->>S: uploadPhoto(file)
    S->>SB: supabase.storage.from('report-photos').upload(path, file)
    SB-->>S: { path: 'reports/1234_abc.jpg' }
    S->>SB: supabase.storage.from('report-photos').getPublicUrl(path)
    SB-->>S: { publicUrl: 'https://...supabase.co/.../reports/1234_abc.jpg' }
    S-->>V: publicUrl
    V->>V: Store photo_url in missed_pickup_reports
```

**Storage bucket:** `report-photos` (created in schema.sql)
**RLS:** Authenticated users can upload; everyone can view.

**File:** `src/services/storageService.js`

---

## 10. Integration Logs

Every API call is logged to `integration_logs`:

| Column | Description |
|--------|-------------|
| `service` | `semaphore`, `nominatim`, `openweather`, `resend` |
| `action` | `send_sms`, `send_reminder`, `geocode`, `forecast`, `send_email` |
| `reference_id` | UUID of related record (schedule, announcement, etc.) |
| `request_payload` | JSONB of what was sent |
| `response_payload` | JSONB of what was received |
| `status` | `success`, `error`, or `pending` |
| `error` | Error message if failed |

**Admin can view all logs** at `/integrations` with:
- Filter by service (Semaphore, Nominatim, OpenWeather, Resend)
- Filter by status (success, error, pending)
- Click "View" to see full JSON request/response payloads
- Color-coded status chips for quick visual scanning

This page is designed for your **presentation demo** — you can show the exact request/response of every API call made by the system.

---

## Data Flow Summary

```mermaid
graph LR
    A[User Action] --> B[Vue Component]
    B --> C[Pinia Store]
    C --> D[Service Layer]
    D --> E{Supabase}

    E --> F[PostgreSQL + RLS]
    E --> G[Auth + JWT]
    E --> H[Storage]
    E --> I[Edge Functions]

    I --> J[Semaphore SMS]
    I --> K[OpenWeather]
    I --> L[Resend Email]

    D --> M[Nominatim Geocoding]
    B --> N[Leaflet + OSM Maps]

    I --> O[integration_logs]
    D --> O
```

Every arrow represents a traceable API call that can be demoed on the Integrations page.
