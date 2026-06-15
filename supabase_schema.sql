-- ==========================================
-- 🏢 IIT BHU SMART ROOM SCHEDULER: SUPABASE SCHEME
-- PostgreSQL Schema & Database Initializer
-- ==========================================

-- Enable handy Postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS REGISTRY WITH ROLE-BASED CONTROLS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Supporting persistent credential match (plaintext/hashed)
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACADEMIC ROOMS REGISTRY
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  features TEXT[] DEFAULT '{}'::TEXT[],
  image TEXT,
  color TEXT DEFAULT 'from-slate-700 to-slate-900',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INTERACTIVE ROOM RESERVATIONS
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  agenda TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  faculty_id TEXT DEFAULT '',
  attendee_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent negative-duration bookings or reversed times
  CONSTRAINT check_booking_times CHECK (start_time < end_time)
);

-- 4. REAL-TIME ACADEMIC SYSTEM NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warn')) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 📊 ANALYTICAL & PERFORMANCE INDEXING
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings(room_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ==========================================
-- 🌱 INITIAL DATABASE SEED DATA (Aligns with app fallback)
-- ==========================================

-- Seed Rooms
INSERT INTO rooms (id, name, capacity, features, image, color) VALUES
('room-1', 'S.N. Bose Seminar Hall', 60, ARRAY['Laser Projector', 'Acoustic Soundproofing', 'Video Conferencing', 'Dual Glass Whiteboards', 'Executive Faculty seating'], 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60', 'from-slate-700 to-slate-900')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, name, capacity, features, image, color) VALUES
('room-2', 'Ramanujan Computing Centre', 45, ARRAY['High-Performance Computing cluster access', 'High-Speed Fiber Ethernet', 'Ultrawide Screen projection', 'Individual power outlets', 'Smart cooling'], 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60', 'from-violet-600 to-indigo-800')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, name, capacity, features, image, color) VALUES
('room-3', 'Visvesvaraya Conference Room', 18, ARRAY['85" 4K Video Display', 'Surround sound conferencing', 'Smart Capture Canvas', 'Ergonomic Boardroom seating', 'Integrated coffee bar'], 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60', 'from-amber-600 to-orange-800')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, name, capacity, features, image, color) VALUES
('room-4', 'Aryabhata Lecture Theatre', 120, ARRAY['Staged Amphitheatre acoustics', 'Dual high-lumen projectors', 'Lavalier Microphone sound system', 'Writeable Whiteboard walls', 'Automated recording rig'], 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60', 'from-teal-600 to-emerald-800')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Users (Academic Roles)
-- In real production Supabase deployment, register users in Supabase Auth module dashboard!
INSERT INTO users (id, name, email, password, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Prof. Rajeev Sangal (Admin)', 'admin@iitbhu.ac.in', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, name, email, password, role) VALUES
('00000000-0000-0000-0000-000000000002', 'Dr. S. K. Shrivastava (Faculty)', 'faculty@iitbhu.ac.in', 'faculty123', 'faculty')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, name, email, password, role) VALUES
('00000000-0000-0000-0000-000000000003', 'Abishek Kumar (Student User)', 'student@iitbhu.ac.in', 'student123', 'student')
ON CONFLICT (email) DO NOTHING;

-- Seed Default Notification
INSERT INTO notifications (id, title, message, type, read) VALUES
('notif-1', 'IIT BHU Space Scheduler Activated', 'The smart room booking database engine is online and persistent.', 'info', false)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 🔒 ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Rooms Policy: Accessible for reading by all authenticated accounts; modifying requires Administrator role
CREATE POLICY "Rooms are globally readable" ON rooms
  FOR SELECT TO authenticated USING (true);

-- Bookings Policies: 
-- 1. All authenticated users can view existing reservations
CREATE POLICY "Select bookings is globally allowed" ON bookings
  FOR SELECT TO authenticated USING (true);

-- 2. Booking insertion is allowed for authorized roles ('faculty', 'admin' as configured)
CREATE POLICY "Insert bookings for faculty and admins" ON bookings
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.email = auth.jwt()->>'email' 
      AND (users.role = 'faculty' OR users.role = 'admin')
    )
  );

-- 3. Deletion of bookings (Students can drop their own; high roles can delete any)
CREATE POLICY "Authorized bookings cancellation policy" ON bookings
  FOR DELETE TO authenticated
  USING (
    creator_email = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.email = auth.jwt()->>'email' 
      AND (users.role = 'faculty' OR users.role = 'admin')
    )
  );

-- Real-time trigger views can be registered for instant updates!
