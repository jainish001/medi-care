import supabase from "./db.js";

console.log("🔍 Checking OTP records in database...");

try {
  // Query the most recent OTP records
  const { data, error } = await supabase
    .from("otp_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("❌ Database query error:", error);
  } else {
    console.log("✅ Database query successful!");
    console.log(`📊 Found ${data.length} OTP records:`);
    
    data.forEach((record, index) => {
      console.log(`\n📝 Record ${index + 1}:`);
      console.log(`   Contact: ${record.contact}`);
      console.log(`   Created: ${record.created_at}`);
      console.log(`   Expires: ${record.expires_at}`);
      console.log(`   Consumed: ${record.consumed}`);
      console.log(`   Attempts: ${record.attempts}`);
    });
  }
} catch (err) {
  console.error("💥 Exception:", err);
}
