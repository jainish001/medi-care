-- Medical Backend Database Schema
-- This file contains all SQL queries needed for the medical dashboard system

-- =====================================================
-- 1. USERS TABLE (Enhanced for Profile Management)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    age INTEGER,
    gender VARCHAR(20),
    blood_type VARCHAR(10),
    address TEXT,
    emergency_contact VARCHAR(255),
    allergies TEXT,
    medical_conditions TEXT,
    profile_picture_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. OTP RECORDS TABLE (Existing)
-- =====================================================

CREATE TABLE IF NOT EXISTS otp_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0
);

-- =====================================================
-- 3. USER SESSIONS TABLE (For Better Session Management)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =====================================================
-- 4. MEDICAL APPOINTMENTS TABLE (For Dashboard Stats)
-- =====================================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    appointment_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. MEDICAL RECORDS TABLE (For Dashboard Stats)
-- =====================================================

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    record_type VARCHAR(100) NOT NULL, -- lab_result, prescription, diagnosis, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500),
    doctor_name VARCHAR(255),
    record_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. PRESCRIPTIONS TABLE (For Dashboard Stats)
-- =====================================================

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    doctor_name VARCHAR(255),
    prescribed_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, discontinued
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- OTP records indexes
CREATE INDEX IF NOT EXISTS idx_otp_records_contact ON otp_records(contact);
CREATE INDEX IF NOT EXISTS idx_otp_records_expires_at ON otp_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_records_consumed ON otp_records(consumed);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Medical records indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_user_id ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(record_date);

-- Prescriptions indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

-- =====================================================
-- 8. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample user (for testing)
INSERT INTO users (email, name, phone, age, gender, blood_type, address, emergency_contact, allergies, medical_conditions) 
VALUES (
    'harshitsethiya0102@gmail.com',
    'harshit sethiya',
    '7389698790',
    18,
    'Male',
    'O+',
    '123 Medical Street, Healthcare City',
    'Emergency Contact: +91-9876543210',
    'No known allergies',
    'No chronic conditions'
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    age = EXCLUDED.age,
    updated_at = NOW();

-- Insert sample appointments
INSERT INTO appointments (user_id, doctor_name, appointment_date, appointment_type, status, notes)
SELECT 
    u.id,
    'Dr. Smith',
    NOW() + INTERVAL '2 hours',
    'General Checkup',
    'scheduled',
    'Regular health checkup'
FROM users u WHERE u.email = 'harshitsethiya0102@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO appointments (user_id, doctor_name, appointment_date, appointment_type, status, notes)
SELECT 
    u.id,
    'Dr. Johnson',
    NOW() + INTERVAL '1 day',
    'Blood Test',
    'scheduled',
    'Annual blood work'
FROM users u WHERE u.email = 'harshitsethiya0102@gmail.com'
ON CONFLICT DO NOTHING;

-- Insert sample medical records
INSERT INTO medical_records (user_id, record_type, title, description, doctor_name, record_date)
SELECT 
    u.id,
    'lab_result',
    'Blood Test Results',
    'Complete blood count - All values normal',
    'Dr. Wilson',
    NOW() - INTERVAL '1 day'
FROM users u WHERE u.email = 'harshitsethiya0102@gmail.com'
ON CONFLICT DO NOTHING;

-- Insert sample prescriptions
INSERT INTO prescriptions (user_id, medication_name, dosage, frequency, duration, doctor_name, prescribed_date, status)
SELECT 
    u.id,
    'Vitamin D3',
    '1000 IU',
    'Once daily',
    '30 days',
    'Dr. Smith',
    NOW() - INTERVAL '2 days',
    'active'
FROM users u WHERE u.email = 'harshitsethiya0102@gmail.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. MEDICATION TRACKER TABLES
-- =====================================================

-- Medicine Stock Table - Available medicines with stock levels
CREATE TABLE IF NOT EXISTS medicine_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    stock_quantity INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pills', -- pills, ml, mg, etc.
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Medicines Table - Scheduled medicines for users
CREATE TABLE IF NOT EXISTS medicines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    medicine_stock_id UUID REFERENCES medicine_stock(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Denormalized for quick access
    dosage VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME DEFAULT '09:00:00',
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, taken, missed, skipped
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medicine Logs Table - Track when medicines are actually taken
CREATE TABLE IF NOT EXISTS medicine_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actual_dosage VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. MEDICATION TRACKER INDEXES
-- =====================================================

-- Medicine stock indexes
CREATE INDEX IF NOT EXISTS idx_medicine_stock_name ON medicine_stock(name);
CREATE INDEX IF NOT EXISTS idx_medicine_stock_quantity ON medicine_stock(stock_quantity);

-- Medicines indexes
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_medicines_date ON medicines(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_medicines_status ON medicines(status);
CREATE INDEX IF NOT EXISTS idx_medicines_user_date ON medicines(user_id, scheduled_date);

-- Medicine logs indexes
CREATE INDEX IF NOT EXISTS idx_medicine_logs_medicine_id ON medicine_logs(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_user_id ON medicine_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_taken_at ON medicine_logs(taken_at);

-- =====================================================
-- 10. SAMPLE MEDICATION DATA
-- =====================================================

-- Insert sample medicine stock
INSERT INTO medicine_stock (name, description, stock_quantity, unit, low_stock_threshold) VALUES
('Paracetamol', 'Pain reliever and fever reducer', 50, 'pills', 10),
('Ibuprofen', 'Anti-inflammatory pain reliever', 30, 'pills', 10),
('Vitamin D3', 'Vitamin D supplement', 25, 'pills', 5),
('Aspirin', 'Blood thinner and pain reliever', 40, 'pills', 10),
('Amoxicillin', 'Antibiotic for bacterial infections', 20, 'pills', 5),
('Omeprazole', 'Proton pump inhibitor for acid reflux', 35, 'pills', 10),
('Metformin', 'Diabetes medication', 45, 'pills', 15),
('Lisinopril', 'Blood pressure medication', 30, 'pills', 10)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    stock_quantity = EXCLUDED.stock_quantity,
    updated_at = NOW();

-- Insert sample scheduled medicines for test user
INSERT INTO medicines (user_id, medicine_stock_id, name, dosage, scheduled_date, scheduled_time, status)
SELECT 
    u.id,
    ms.id,
    ms.name,
    '500mg',
    CURRENT_DATE,
    '09:00:00',
    'scheduled'
FROM users u, medicine_stock ms 
WHERE u.email = 'harshitsethiya0102@gmail.com' 
AND ms.name = 'Paracetamol'
ON CONFLICT DO NOTHING;

INSERT INTO medicines (user_id, medicine_stock_id, name, dosage, scheduled_date, scheduled_time, status)
SELECT 
    u.id,
    ms.id,
    ms.name,
    '1000 IU',
    CURRENT_DATE,
    '20:00:00',
    'scheduled'
FROM users u, medicine_stock ms 
WHERE u.email = 'harshitsethiya0102@gmail.com' 
AND ms.name = 'Vitamin D3'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. PATIENT REPORTS TABLE (For File Upload System)
-- =====================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- lab_report, xray, mri, prescription, etc.
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL, -- in bytes
    mime_type VARCHAR(100) NOT NULL,
    google_drive_file_id VARCHAR(255) NOT NULL UNIQUE,
    google_drive_url VARCHAR(500) NOT NULL,
    qr_code_data TEXT, -- Base64 encoded QR code image
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    doctor_name VARCHAR(255),
    notes TEXT,
    is_public BOOLEAN DEFAULT false, -- Whether file is publicly accessible
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. REPORTS TABLE INDEXES
-- =====================================================

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_upload_date ON reports(upload_date);
CREATE INDEX IF NOT EXISTS idx_reports_google_drive_id ON reports(google_drive_file_id);
CREATE INDEX IF NOT EXISTS idx_reports_public ON reports(is_public);

-- =====================================================
-- 13. USEFUL QUERIES FOR DASHBOARD
-- =====================================================

-- Get user profile with all details
-- SELECT * FROM users WHERE email = 'user@example.com';

-- Get upcoming appointments count
-- SELECT COUNT(*) as upcoming_appointments 
-- FROM appointments 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com') 
-- AND appointment_date > NOW() 
-- AND status = 'scheduled';

-- Get total medical records count
-- SELECT COUNT(*) as total_records 
-- FROM medical_records 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');

-- Get active prescriptions count
-- SELECT COUNT(*) as active_prescriptions 
-- FROM prescriptions 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com') 
-- AND status = 'active';

-- Get recent activity (appointments and records)
-- SELECT 'appointment' as type, doctor_name as title, appointment_date as date
-- FROM appointments 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
-- UNION ALL
-- SELECT 'record' as type, title, record_date as date
-- FROM medical_records 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
-- ORDER BY date DESC 
-- LIMIT 10;
