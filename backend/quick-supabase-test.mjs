import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const dbModule = await import("./db.js");
  const supabase = dbModule.default;
  const { data, error } = await supabase
    .from("otp_records")
    .insert([
      {
        contact: "debug@test.com",
        otp_hash: "h",
        salt: "s",
        expires_at: new Date().toISOString(),
      },
    ]);
  console.log("SUPABASE TEST RESULT:", { data, error });
} catch (err) {
  console.error("SUPABASE TEST EXCEPTION:", err);
}
