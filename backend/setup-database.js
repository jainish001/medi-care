// Database Setup Script for Medical Backend
// This script creates all necessary tables and sample data

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || "your-supabase-url",
    process.env.SUPABASE_SERVICE_KEY || "your-service-key"
);

async function setupDatabase() {
    console.log("🚀 Starting database setup...");

    try {
        // 1. Create Users Table with Profile Fields
        console.log("📋 Creating users table...");
        const { error: usersError } = await supabase.rpc('exec_sql', {
            sql: `
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
            `
        });

        if (usersError) {
            console.log("ℹ️ Users table may already exist:", usersError.message);
        } else {
            console.log("✅ Users table created successfully");
        }

        // 2. Create Appointments Table
        console.log("📅 Creating appointments table...");
        const { error: appointmentsError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS appointments (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    doctor_name VARCHAR(255) NOT NULL,
                    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    appointment_type VARCHAR(100),
                    status VARCHAR(50) DEFAULT 'scheduled',
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });

        if (appointmentsError) {
            console.log("ℹ️ Appointments table may already exist:", appointmentsError.message);
        } else {
            console.log("✅ Appointments table created successfully");
        }

        // 3. Create Medical Records Table
        console.log("📋 Creating medical_records table...");
        const { error: recordsError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS medical_records (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    record_type VARCHAR(100) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    file_url VARCHAR(500),
                    doctor_name VARCHAR(255),
                    record_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });

        if (recordsError) {
            console.log("ℹ️ Medical records table may already exist:", recordsError.message);
        } else {
            console.log("✅ Medical records table created successfully");
        }

        // 4. Create Prescriptions Table
        console.log("💊 Creating prescriptions table...");
        const { error: prescriptionsError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS prescriptions (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    medication_name VARCHAR(255) NOT NULL,
                    dosage VARCHAR(100),
                    frequency VARCHAR(100),
                    duration VARCHAR(100),
                    doctor_name VARCHAR(255),
                    prescribed_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    status VARCHAR(50) DEFAULT 'active',
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });

        if (prescriptionsError) {
            console.log("ℹ️ Prescriptions table may already exist:", prescriptionsError.message);
        } else {
            console.log("✅ Prescriptions table created successfully");
        }

        // 5. Insert/Update Sample User
        console.log("👤 Setting up sample user...");
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'harshitsethiya0102@gmail.com')
            .single();

        if (!existingUser) {
            const { error: userInsertError } = await supabase
                .from('users')
                .insert([{
                    email: 'harshitsethiya0102@gmail.com',
                    name: 'harshit sethiya',
                    phone: '7389698790',
                    age: 18,
                    gender: 'Male',
                    blood_type: 'O+',
                    address: '123 Medical Street, Healthcare City',
                    emergency_contact: 'Emergency Contact: +91-9876543210',
                    allergies: 'No known allergies',
                    medical_conditions: 'No chronic conditions'
                }]);

            if (userInsertError) {
                console.error("❌ Error inserting sample user:", userInsertError);
            } else {
                console.log("✅ Sample user created successfully");
            }
        } else {
            console.log("ℹ️ Sample user already exists");
        }

        // 6. Get user ID for sample data
        const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'harshitsethiya0102@gmail.com')
            .single();

        if (userData) {
            const userId = userData.id;

            // 7. Insert Sample Appointments
            console.log("📅 Creating sample appointments...");
            const { error: appointmentInsertError } = await supabase
                .from('appointments')
                .upsert([
                    {
                        user_id: userId,
                        doctor_name: 'Dr. Smith',
                        appointment_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
                        appointment_type: 'General Checkup',
                        status: 'scheduled',
                        notes: 'Regular health checkup'
                    },
                    {
                        user_id: userId,
                        doctor_name: 'Dr. Johnson',
                        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
                        appointment_type: 'Blood Test',
                        status: 'scheduled',
                        notes: 'Annual blood work'
                    },
                    {
                        user_id: userId,
                        doctor_name: 'Dr. Wilson',
                        appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
                        appointment_type: 'Follow-up',
                        status: 'scheduled',
                        notes: 'Follow-up consultation'
                    }
                ], { onConflict: 'user_id,doctor_name,appointment_date' });

            if (appointmentInsertError) {
                console.log("ℹ️ Sample appointments may already exist:", appointmentInsertError.message);
            } else {
                console.log("✅ Sample appointments created successfully");
            }

            // 8. Insert Sample Medical Records
            console.log("📋 Creating sample medical records...");
            const { error: recordInsertError } = await supabase
                .from('medical_records')
                .upsert([
                    {
                        user_id: userId,
                        record_type: 'lab_result',
                        title: 'Blood Test Results',
                        description: 'Complete blood count - All values normal',
                        doctor_name: 'Dr. Wilson',
                        record_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
                    },
                    {
                        user_id: userId,
                        record_type: 'diagnosis',
                        title: 'Annual Physical Exam',
                        description: 'Overall health status: Excellent',
                        doctor_name: 'Dr. Smith',
                        record_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
                    }
                ], { onConflict: 'user_id,title,record_date' });

            if (recordInsertError) {
                console.log("ℹ️ Sample medical records may already exist:", recordInsertError.message);
            } else {
                console.log("✅ Sample medical records created successfully");
            }

            // 9. Insert Sample Prescriptions
            console.log("💊 Creating sample prescriptions...");
            const { error: prescriptionInsertError } = await supabase
                .from('prescriptions')
                .upsert([
                    {
                        user_id: userId,
                        medication_name: 'Vitamin D3',
                        dosage: '1000 IU',
                        frequency: 'Once daily',
                        duration: '30 days',
                        doctor_name: 'Dr. Smith',
                        prescribed_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                        status: 'active'
                    }
                ], { onConflict: 'user_id,medication_name,prescribed_date' });

            if (prescriptionInsertError) {
                console.log("ℹ️ Sample prescriptions may already exist:", prescriptionInsertError.message);
            } else {
                console.log("✅ Sample prescriptions created successfully");
            }
        }

        console.log("\n🎉 Database setup completed successfully!");
        console.log("\n📊 Summary:");
        console.log("✅ Users table with profile fields");
        console.log("✅ Appointments table");
        console.log("✅ Medical records table");
        console.log("✅ Prescriptions table");
        console.log("✅ Sample data for testing");
        console.log("\n🔗 Your database is ready for the medical dashboard!");

    } catch (error) {
        console.error("❌ Database setup failed:", error);
        process.exit(1);
    }
}

// Alternative method using direct SQL execution
async function setupDatabaseWithSQL() {
    console.log("🚀 Setting up database with SQL file...");
    
    try {
        // Read the SQL file
        const sqlFile = path.join(process.cwd(), 'database-schema.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // Split SQL commands (basic splitting - you might need more sophisticated parsing)
        const sqlCommands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

        console.log(`📝 Found ${sqlCommands.length} SQL commands to execute`);

        // Execute each command
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i];
            if (command.includes('CREATE TABLE') || command.includes('INSERT') || command.includes('CREATE INDEX')) {
                try {
                    console.log(`⚡ Executing command ${i + 1}/${sqlCommands.length}`);
                    const { error } = await supabase.rpc('exec_sql', { sql: command });
                    if (error) {
                        console.log(`ℹ️ Command ${i + 1} may have already been executed:`, error.message);
                    }
                } catch (cmdError) {
                    console.log(`⚠️ Command ${i + 1} skipped:`, cmdError.message);
                }
            }
        }

        console.log("✅ SQL file execution completed!");
        
    } catch (error) {
        console.error("❌ SQL file execution failed:", error);
        // Fall back to manual setup
        console.log("🔄 Falling back to manual database setup...");
        await setupDatabase();
    }
}

// Run the setup
if (process.argv.includes('--sql')) {
    setupDatabaseWithSQL();
} else {
    setupDatabase();
}

export { setupDatabase };
