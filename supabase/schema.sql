-- ============================================================
-- BasuraTrack — Supabase Schema Migration
-- Barangay Garbage Collection Scheduler
-- ============================================================
-- Run this in Supabase SQL Editor (or via supabase db push)
-- Prerequisites: Supabase project with Auth enabled

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PUROKS (barangay subdivisions / zones)
-- ============================================================
CREATE TABLE IF NOT EXISTS puroks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  center_lat  DOUBLE PRECISION,
  center_lng  DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_puroks_name ON puroks (name);

-- ============================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('admin', 'collector', 'resident')),
  phone      TEXT,
  address    TEXT,
  purok_id   UUID REFERENCES puroks(id) ON DELETE SET NULL,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role     ON profiles (role);
CREATE INDEX idx_profiles_purok_id ON profiles (purok_id);

-- ============================================================
-- 3. TRUCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS trucks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_no   TEXT NOT NULL UNIQUE,
  capacity   TEXT NOT NULL DEFAULT 'standard',
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trucks_status ON trucks (status);

-- ============================================================
-- 4. ROUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  purok_id     UUID REFERENCES puroks(id) ON DELETE SET NULL,
  truck_id     UUID REFERENCES trucks(id) ON DELETE SET NULL,
  collector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  color        TEXT NOT NULL DEFAULT '#4CAF50',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_purok_id     ON routes (purok_id);
CREATE INDEX idx_routes_collector_id ON routes (collector_id);

-- ============================================================
-- 5. ROUTE STOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS route_stops (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id   UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL DEFAULT 0,
  label      TEXT NOT NULL DEFAULT '',
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_stops_route_id ON route_stops (route_id);
CREATE INDEX idx_route_stops_order    ON route_stops (route_id, stop_order);

-- ============================================================
-- 6. SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id     UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  waste_type   TEXT NOT NULL CHECK (waste_type IN ('biodegradable','non_biodegradable','recyclable','residual')),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_route_id    ON schedules (route_id);
CREATE INDEX idx_schedules_day         ON schedules (day_of_week);
CREATE INDEX idx_schedules_waste_type  ON schedules (waste_type);

-- ============================================================
-- 7. COLLECTION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id     UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  collection_date DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','delayed','skipped')),
  notes           TEXT,
  logged_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, collection_date)
);

CREATE INDEX idx_collection_logs_date   ON collection_logs (collection_date);
CREATE INDEX idx_collection_logs_status ON collection_logs (status);

-- ============================================================
-- 8. MISSED PICKUP REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS missed_pickup_reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purok_id       UUID REFERENCES puroks(id) ON DELETE SET NULL,
  report_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  description    TEXT NOT NULL,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  photo_url      TEXT,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  admin_response TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_missed_pickup_resident ON missed_pickup_reports (resident_id);
CREATE INDEX idx_missed_pickup_status   ON missed_pickup_reports (status);
CREATE INDEX idx_missed_pickup_date     ON missed_pickup_reports (report_date);

-- ============================================================
-- 9. ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  purok_id   UUID REFERENCES puroks(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sms_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_purok ON announcements (purok_id);

-- ============================================================
-- 10. INTEGRATION LOGS (audit trail for all third-party API calls)
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service          TEXT NOT NULL,           -- 'semaphore', 'nominatim', 'openweather', 'resend'
  action           TEXT NOT NULL,           -- 'send_sms', 'geocode', 'forecast', 'send_email'
  reference_id     UUID,                    -- FK-free reference to related record
  request_payload  JSONB,
  response_payload JSONB,
  status           TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','pending')),
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_service ON integration_logs (service);
CREATE INDEX idx_integration_logs_status  ON integration_logs (status);
CREATE INDEX idx_integration_logs_date    ON integration_logs (created_at DESC);

-- ============================================================
-- FUNCTION: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after a new auth.users row is inserted
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: Auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'puroks','profiles','trucks','routes','route_stops',
      'schedules','collection_logs','missed_pickup_reports','announcements'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON %I; ' ||
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I ' ||
      'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get the role of the current user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get the purok_id of the current user
CREATE OR REPLACE FUNCTION public.current_user_purok()
RETURNS UUID AS $$
  SELECT purok_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PUROKS ────────────────────────────────────────────────
ALTER TABLE puroks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "puroks_select_all" ON puroks
  FOR SELECT USING (true);

CREATE POLICY "puroks_insert_admin" ON puroks
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "puroks_update_admin" ON puroks
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "puroks_delete_admin" ON puroks
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── PROFILES ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.current_user_role() = 'admin'
  );

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── TRUCKS ────────────────────────────────────────────────
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trucks_select_all" ON trucks
  FOR SELECT USING (true);

CREATE POLICY "trucks_insert_admin" ON trucks
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "trucks_update_admin" ON trucks
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "trucks_delete_admin" ON trucks
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── ROUTES ────────────────────────────────────────────────
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_select_all" ON routes
  FOR SELECT USING (true);

CREATE POLICY "routes_insert_admin" ON routes
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "routes_update_admin" ON routes
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "routes_delete_admin" ON routes
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── ROUTE STOPS ───────────────────────────────────────────
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_stops_select_all" ON route_stops
  FOR SELECT USING (true);

CREATE POLICY "route_stops_insert_admin" ON route_stops
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "route_stops_update_admin" ON route_stops
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "route_stops_delete_admin" ON route_stops
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── SCHEDULES ─────────────────────────────────────────────
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_select_all" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "schedules_insert_admin" ON schedules
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "schedules_update_admin" ON schedules
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "schedules_delete_admin" ON schedules
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── COLLECTION LOGS ──────────────────────────────────────
ALTER TABLE collection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_logs_select_all" ON collection_logs
  FOR SELECT USING (true);

CREATE POLICY "collection_logs_insert_collector_admin" ON collection_logs
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'collector')
  );

CREATE POLICY "collection_logs_update_collector_admin" ON collection_logs
  FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'collector')
  );

CREATE POLICY "collection_logs_delete_admin" ON collection_logs
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── MISSED PICKUP REPORTS ────────────────────────────────
ALTER TABLE missed_pickup_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missed_pickups_select" ON missed_pickup_reports
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    OR resident_id = auth.uid()
  );

CREATE POLICY "missed_pickups_insert_resident" ON missed_pickup_reports
  FOR INSERT WITH CHECK (
    resident_id = auth.uid()
    AND public.current_user_role() IN ('resident', 'admin')
  );

CREATE POLICY "missed_pickups_update" ON missed_pickup_reports
  FOR UPDATE USING (
    public.current_user_role() = 'admin'
    OR (resident_id = auth.uid() AND status = 'open')
  );

CREATE POLICY "missed_pickups_delete" ON missed_pickup_reports
  FOR DELETE USING (
    public.current_user_role() = 'admin'
    OR (resident_id = auth.uid() AND status = 'open')
  );

-- ─── ANNOUNCEMENTS ────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_all" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "announcements_insert_admin" ON announcements
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "announcements_update_admin" ON announcements
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "announcements_delete_admin" ON announcements
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ─── INTEGRATION LOGS ─────────────────────────────────────
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_logs_select_admin" ON integration_logs
  FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "integration_logs_insert_all" ON integration_logs
  FOR INSERT WITH CHECK (true);  -- Edge functions need to insert

-- ============================================================
-- STORAGE: Create bucket for photo uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: residents can upload, everyone can view
CREATE POLICY "report_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'report-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "report_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'report-photos');

CREATE POLICY "report_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'report-photos'
    AND auth.role() = 'authenticated'
  );
