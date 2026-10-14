-- ============================================================
-- BasuraTrack — Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================
-- NOTE: User accounts must be created via Supabase Auth API or Dashboard.
-- This seed assumes the following users exist in auth.users with these IDs.
-- You can create them via the Auth dashboard or use the app's register page.
--
-- Test Accounts (create these in Supabase Auth → Users → Add User):
--   admin@basuratrack.test    / Admin123!     (then set role to 'admin' in profiles)
--   collector1@basuratrack.test / Collector123!
--   collector2@basuratrack.test / Collector123!
--   resident1@basuratrack.test through resident15@basuratrack.test / Resident123!
--
-- After creating them, run this seed, then update profiles with the correct auth IDs.

-- ============================================================
-- BARANGAYS (4 barangay zones around Butuan City)
-- ============================================================
INSERT INTO puroks (id, name, description, center_lat, center_lng) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Barangay Libertad', 
   'Downtown area near Butuan City Hall', 8.9475, 125.5406),
  ('a1000000-0000-0000-0000-000000000002', 'Barangay Rizal', 
   'Commercial district along J.C. Aquino Avenue', 8.9512, 125.5350),
  ('a1000000-0000-0000-0000-000000000003', 'Barangay Mabini', 
   'Residential area near Robinsons Place', 8.9440, 125.5310),
  ('a1000000-0000-0000-0000-000000000004', 'Barangay Bonifacio', 
   'Area near Guingona Park and Agusan River', 8.9530, 125.5450)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TRUCKS (3 garbage trucks)
-- ============================================================
INSERT INTO trucks (id, plate_no, capacity, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'AGN-1234', '6 cubic meters', 'active'),
  ('b1000000-0000-0000-0000-000000000002', 'AGN-5678', '8 cubic meters', 'active'),
  ('b1000000-0000-0000-0000-000000000003', 'AGN-9012', '6 cubic meters', 'maintenance')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROUTES (4 routes, one per purok)
-- Collector IDs will be updated after user accounts are created
-- ============================================================
INSERT INTO routes (id, name, purok_id, truck_id, collector_id, color) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Libertad Main Route',
   'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', NULL, '#4CAF50'),
  ('c1000000-0000-0000-0000-000000000002', 'Rizal Loop Route',
   'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', NULL, '#2196F3'),
  ('c1000000-0000-0000-0000-000000000003', 'Mabini Circuit Route',
   'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', NULL, '#FF9800'),
  ('c1000000-0000-0000-0000-000000000004', 'Bonifacio River Route',
   'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', NULL, '#9C27B0')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROUTE STOPS (realistic stops around Butuan City)
-- ============================================================
INSERT INTO route_stops (route_id, stop_order, label, lat, lng) VALUES
  -- Libertad Main Route stops
  ('c1000000-0000-0000-0000-000000000001', 1, 'City Hall Corner', 8.9475, 125.5406),
  ('c1000000-0000-0000-0000-000000000001', 2, 'Libertad Market', 8.9480, 125.5415),
  ('c1000000-0000-0000-0000-000000000001', 3, 'Libertad Church', 8.9470, 125.5420),
  ('c1000000-0000-0000-0000-000000000001', 4, 'Libertad School', 8.9465, 125.5400),

  -- Rizal Loop Route stops
  ('c1000000-0000-0000-0000-000000000002', 1, 'J.C. Aquino Start', 8.9512, 125.5350),
  ('c1000000-0000-0000-0000-000000000002', 2, 'Gaisano Mall Area', 8.9520, 125.5340),
  ('c1000000-0000-0000-0000-000000000002', 3, 'Rizal Park', 8.9505, 125.5330),
  ('c1000000-0000-0000-0000-000000000002', 4, 'Rizal Residential', 8.9510, 125.5360),

  -- Mabini Circuit Route stops
  ('c1000000-0000-0000-0000-000000000003', 1, 'Robinsons Entrance', 8.9440, 125.5310),
  ('c1000000-0000-0000-0000-000000000003', 2, 'Mabini Homes', 8.9445, 125.5320),
  ('c1000000-0000-0000-0000-000000000003', 3, 'Mabini Basketball Court', 8.9435, 125.5325),
  ('c1000000-0000-0000-0000-000000000003', 4, 'Mabini Chapel', 8.9430, 125.5305),

  -- Bonifacio River Route stops
  ('c1000000-0000-0000-0000-000000000004', 1, 'Guingona Park', 8.9530, 125.5450),
  ('c1000000-0000-0000-0000-000000000004', 2, 'Riverside Walk', 8.9535, 125.5460),
  ('c1000000-0000-0000-0000-000000000004', 3, 'Bonifacio Bridge', 8.9525, 125.5470),
  ('c1000000-0000-0000-0000-000000000004', 4, 'Bonifacio Housing', 8.9540, 125.5445)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SCHEDULES (weekly, covering all waste types)
-- day_of_week: 0=Sunday, 1=Monday ... 6=Saturday
-- ============================================================
INSERT INTO schedules (id, route_id, day_of_week, start_time, end_time, waste_type, active) VALUES
  -- Monday: Biodegradable for all routes
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1, '06:00', '09:00', 'biodegradable', true),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 1, '06:00', '09:00', 'biodegradable', true),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 1, '09:00', '12:00', 'biodegradable', true),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 1, '09:00', '12:00', 'biodegradable', true),

  -- Wednesday: Non-biodegradable
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 3, '06:00', '09:00', 'non_biodegradable', true),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002', 3, '06:00', '09:00', 'non_biodegradable', true),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000003', 3, '09:00', '12:00', 'non_biodegradable', true),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 3, '09:00', '12:00', 'non_biodegradable', true),

  -- Friday: Recyclable
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001', 5, '06:00', '09:00', 'recyclable', true),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000002', 5, '06:00', '09:00', 'recyclable', true),
  ('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000003', 5, '09:00', '12:00', 'recyclable', true),
  ('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000004', 5, '09:00', '12:00', 'recyclable', true),

  -- Saturday: Residual
  ('d1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001', 6, '06:00', '09:00', 'residual', true),
  ('d1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000002', 6, '06:00', '09:00', 'residual', true),
  ('d1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000003', 6, '09:00', '12:00', 'residual', true),
  ('d1000000-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000004', 6, '09:00', '12:00', 'residual', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE COLLECTION LOGS (last 2 weeks of data)
-- ============================================================
INSERT INTO collection_logs (schedule_id, collection_date, status, notes) VALUES
  -- Last week Monday biodegradable
  ('d1000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '7 days', 'completed', 'Collected 4 cubic meters'),
  ('d1000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '7 days', 'completed', 'Smooth collection'),
  ('d1000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', 'delayed', 'Truck had flat tire, 30 min delay'),
  ('d1000000-0000-0000-0000-000000000004', CURRENT_DATE - INTERVAL '7 days', 'completed', NULL),

  -- Last week Wednesday non-biodegradable
  ('d1000000-0000-0000-0000-000000000005', CURRENT_DATE - INTERVAL '5 days', 'completed', NULL),
  ('d1000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '5 days', 'completed', 'Heavy load today'),
  ('d1000000-0000-0000-0000-000000000007', CURRENT_DATE - INTERVAL '5 days', 'skipped', 'Heavy rain, streets flooded'),
  ('d1000000-0000-0000-0000-000000000008', CURRENT_DATE - INTERVAL '5 days', 'completed', NULL),

  -- Last week Friday recyclable
  ('d1000000-0000-0000-0000-000000000009', CURRENT_DATE - INTERVAL '3 days', 'completed', 'Lots of recyclables today'),
  ('d1000000-0000-0000-0000-000000000010', CURRENT_DATE - INTERVAL '3 days', 'completed', NULL),
  ('d1000000-0000-0000-0000-000000000011', CURRENT_DATE - INTERVAL '3 days', 'completed', NULL),
  ('d1000000-0000-0000-0000-000000000012', CURRENT_DATE - INTERVAL '3 days', 'delayed', 'Started 1 hour late')
ON CONFLICT (schedule_id, collection_date) DO NOTHING;

-- ============================================================
-- SAMPLE MISSED PICKUP REPORTS
-- (resident_id will need to be updated after creating user accounts)
-- ============================================================
-- These use placeholder UUIDs; update after creating resident accounts
-- INSERT INTO missed_pickup_reports (resident_id, purok_id, report_date, description, lat, lng, status) VALUES
--   ('<resident1_uuid>', 'a1000000-0000-0000-0000-000000000001', CURRENT_DATE - 2, 
--    'Garbage was not collected yesterday even though it was scheduled', 8.9478, 125.5410, 'resolved'),
--   ('<resident2_uuid>', 'a1000000-0000-0000-0000-000000000003', CURRENT_DATE - 1,
--    'The truck skipped our street corner near the basketball court', 8.9436, 125.5322, 'open');

-- ============================================================
-- SAMPLE ANNOUNCEMENTS
-- ============================================================
INSERT INTO announcements (title, body, purok_id, sms_sent) VALUES
  ('Holiday Schedule Change',
   'Due to the upcoming holiday on November 1 (All Saints Day), garbage collection for all puroks will be moved to November 2. Please prepare your waste accordingly.',
   NULL, false),
  ('Purok 1 Special Collection',
   'There will be a special bulky waste collection in Purok 1 - Libertad this Saturday from 7 AM to 11 AM. Please place large items at the designated collection points.',
   'a1000000-0000-0000-0000-000000000001', false),
  ('Waste Segregation Reminder',
   'Please remember to properly segregate your waste: GREEN bags for biodegradable, YELLOW for non-biodegradable, BLUE for recyclable, and RED for residual waste. Thank you for your cooperation!',
   NULL, true),
  ('New Recycling Drop-off Point',
   'A new recycling drop-off point has been set up near Robinsons Place in Purok 3 - Mabini. You can bring recyclable materials any day from 8 AM to 5 PM.',
   'a1000000-0000-0000-0000-000000000003', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE INTEGRATION LOGS (for demo purposes)
-- ============================================================
INSERT INTO integration_logs (service, action, request_payload, response_payload, status) VALUES
  ('semaphore', 'send_sms', 
   '{"to": "09171234567", "message": "BasuraTrack: Tomorrow, Monday 6:00 AM, collection for biodegradable in Purok 1 - Libertad."}'::jsonb,
   '{"message_id": "sem_123456", "status": "sent"}'::jsonb,
   'success'),
  ('nominatim', 'geocode',
   '{"address": "J.C. Aquino Avenue, Butuan City"}'::jsonb,
   '{"lat": 8.9512, "lng": 125.5350, "display_name": "J.C. Aquino Avenue, Butuan City, Agusan del Norte"}'::jsonb,
   'success'),
  ('openweather', 'forecast',
   '{"lat": 8.9475, "lng": 125.5406}'::jsonb,
   '{"temp": 28, "description": "light rain", "rain_probability": 0.7}'::jsonb,
   'success'),
  ('semaphore', 'send_sms',
   '{"to": "09181234567", "message": "BasuraTrack: Your missed pickup report has been resolved."}'::jsonb,
   '{"error": "insufficient_credits"}'::jsonb,
   'error')
ON CONFLICT DO NOTHING;
