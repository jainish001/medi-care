// Simple Database Setup Runner
// Run this to set up your database tables and sample data

import { setupDatabase } from './setup-database.js';

console.log("🚀 Starting Medical Database Setup...");
console.log("This will create all necessary tables and sample data for your medical system.");

setupDatabase()
  .then(() => {
    console.log("\n✅ Database setup completed successfully!");
    console.log("🎉 Your medical backend is now ready with:");
    console.log("   • User profiles with medical information");
    console.log("   • Appointments tracking");
    console.log("   • Medical records storage");
    console.log("   • Prescriptions management");
    console.log("   • Sample data for testing");
    console.log("\n🔗 You can now use the dashboard profile section!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  });
