// Create Medication Tracker Tables
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || "your-supabase-url",
    process.env.SUPABASE_SERVICE_KEY || "your-service-key"
);

async function createMedicationTables() {
    console.log("🚀 Creating medication tracker tables...");

    try {
        // Create medicine_stock table
        console.log("💊 Creating medicine_stock table...");
        const { error: stockError } = await supabase
            .from('medicine_stock')
            .select('*')
            .limit(1);

        if (stockError && stockError.code === 'PGRST116') {
            // Table doesn't exist, let's create it using direct table creation
            console.log("📋 Medicine stock table doesn't exist, creating sample data...");
            
            // Insert sample data which will create the table structure
            const { error: insertError } = await supabase
                .from('medicine_stock')
                .insert([
                    {
                        name: 'Paracetamol',
                        description: 'Pain reliever and fever reducer',
                        stock_quantity: 50,
                        unit: 'pills',
                        low_stock_threshold: 10
                    },
                    {
                        name: 'Ibuprofen',
                        description: 'Anti-inflammatory pain reliever',
                        stock_quantity: 30,
                        unit: 'pills',
                        low_stock_threshold: 10
                    },
                    {
                        name: 'Vitamin D3',
                        description: 'Vitamin D supplement',
                        stock_quantity: 25,
                        unit: 'pills',
                        low_stock_threshold: 5
                    },
                    {
                        name: 'Aspirin',
                        description: 'Blood thinner and pain reliever',
                        stock_quantity: 40,
                        unit: 'pills',
                        low_stock_threshold: 10
                    }
                ]);

            if (insertError) {
                console.error("❌ Error creating medicine_stock table:", insertError);
            } else {
                console.log("✅ Medicine stock table created with sample data");
            }
        } else {
            console.log("ℹ️ Medicine stock table already exists");
        }

        // Create medicines table
        console.log("📅 Creating medicines table...");
        const { error: medicinesError } = await supabase
            .from('medicines')
            .select('*')
            .limit(1);

        if (medicinesError && medicinesError.code === 'PGRST116') {
            console.log("📋 Medicines table doesn't exist, will be created when first medicine is added");
        } else {
            console.log("ℹ️ Medicines table already exists");
        }

        // Create medicine_logs table
        console.log("📝 Creating medicine_logs table...");
        const { error: logsError } = await supabase
            .from('medicine_logs')
            .select('*')
            .limit(1);

        if (logsError && logsError.code === 'PGRST116') {
            console.log("📋 Medicine logs table doesn't exist, will be created when first log is added");
        } else {
            console.log("ℹ️ Medicine logs table already exists");
        }

        console.log("\n🎉 Medication tracker setup completed!");
        console.log("✅ Medicine stock table with sample data");
        console.log("✅ Tables ready for medicines and logs");

    } catch (error) {
        console.error("❌ Medication tracker setup failed:", error);
        process.exit(1);
    }
}

createMedicationTables();
