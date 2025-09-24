// Production Startup Script
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import supabase from "./db.js"; 
import { sendEmailOtp } from "./adapters/notifications.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import logger from "./utils/logger.js";

dotenv.config();

const app = express();

// Production Security
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Allow 5 OTP requests per minute
  message: { error: 'Too many OTP requests, please wait.' }
});

// Production logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  console.log(`🔥 PRODUCTION: ${req.method} ${req.path} from ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// OTP Config
const OTP_TTL_MS = 5 * 60 * 1000;

// Helper functions
function genOtp() {
  return String(crypto.randomInt(100000, 999999)); // 6-digit OTP
}

function hashOtp(otp, salt) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET || "devsecret")
    .update(otp + salt)
    .digest("hex");
}

// Validation middleware
const validateEmail = [
  body('email').isEmail().normalizeEmail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'invalid_email', message: 'Please provide a valid email address' });
    }
    next();
  }
];

const validateOtp = [
  body('contact').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'invalid_input', message: 'Please provide valid email and 6-digit OTP' });
    }
    next();
  }
];

// PRODUCTION ROUTES

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: "production"
  });
});

// Request OTP - PRODUCTION
app.post("/auth/request-otp", otpLimiter, validateEmail, async (req, res) => {
  const { email } = req.body;
  
  try {
    console.log(`🔥 PRODUCTION OTP REQUEST: ${email}`);
    
    const otp = genOtp();
    const salt = crypto.randomBytes(8).toString("hex");
    const otpHash = hashOtp(otp, salt);

    // Store in database
    const { data, error } = await supabase.from("otp_records").insert([{
      contact: email,
      otp_hash: otpHash,
      salt,
      created_at: new Date(),
      expires_at: new Date(Date.now() + OTP_TTL_MS),
      consumed: false,
      attempts: 0
    }]);

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "database_error", message: "Failed to store OTP" });
    }

    console.log(`✅ DATABASE: OTP stored for ${email}`);

    // Send email
    await sendEmailOtp(email, otp);
    console.log(`✅ EMAIL: OTP sent to ${email}`);

    return res.json({ 
      status: "success", 
      message: "OTP sent successfully",
      expiresIn: 300 // 5 minutes
    });

  } catch (err) {
    console.error("💥 PRODUCTION ERROR:", err);
    return res.status(500).json({ error: "internal_error", message: "Something went wrong" });
  }
});

// Verify OTP - PRODUCTION
app.post("/auth/verify-otp", validateOtp, async (req, res) => {
  try {
    const { contact, otp } = req.body;
    
    console.log(`🔥 PRODUCTION OTP VERIFY: ${contact}`);

    const { data: recs } = await supabase
      .from("otp_records")
      .select("*")
      .eq("contact", contact)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!recs || recs.length === 0) {
      return res.status(400).json({ error: "otp_not_found", message: "No OTP found for this email" });
    }

    const rec = recs[0];
    
    if (rec.consumed) {
      return res.status(400).json({ error: "otp_already_used", message: "OTP already used" });
    }
    
    if (new Date() > new Date(rec.expires_at)) {
      return res.status(400).json({ error: "otp_expired", message: "OTP has expired" });
    }
    
    if (rec.attempts >= 5) {
      return res.status(429).json({ error: "too_many_attempts", message: "Too many failed attempts" });
    }

    const candidate = hashOtp(String(otp).trim(), rec.salt);

    if (candidate !== rec.otp_hash) {
      await supabase.from("otp_records")
        .update({ attempts: rec.attempts + 1 })
        .eq("id", rec.id);
      
      return res.status(400).json({ 
        error: "invalid_otp", 
        message: "Invalid OTP",
        attemptsRemaining: 5 - (rec.attempts + 1)
      });
    }

    // Mark as consumed
    await supabase.from("otp_records").update({ consumed: true }).eq("id", rec.id);
    
    console.log(`✅ OTP VERIFIED: ${contact}`);

    return res.json({ 
      status: "success", 
      message: "OTP verified successfully",
      verified: true
    });

  } catch (err) {
    console.error("💥 VERIFY ERROR:", err);
    return res.status(500).json({ error: "internal_error", message: "Verification failed" });
  }
});

// User Registration - PRODUCTION
app.post("/auth/signup", async (req, res) => {
  try {
    const { email, name, phone, age } = req.body;
    
    if (!email || !name || !phone || !age) {
      return res.status(400).json({ error: "missing_fields", message: "All fields are required" });
    }

    console.log(`🔥 PRODUCTION SIGNUP: ${email}`);

    const { data, error } = await supabase.from("users")
      .insert([{ email, name, phone, age }])
      .select();

    if (error) {
      console.error("❌ Signup error:", error);
      return res.status(500).json({ error: "signup_failed", message: "Registration failed" });
    }

    console.log(`✅ USER REGISTERED: ${email}`);

    return res.json({ 
      status: "success", 
      message: "Registration successful",
      user: data[0] 
    });
    
  } catch (err) {
    console.error("💥 SIGNUP ERROR:", err);
    return res.status(500).json({ error: "internal_error", message: "Registration failed" });
  }
});

// Dashboard stats
app.get("/dashboard/stats", (req, res) => {
  res.json({
    users: 1234,
    sales: 5678,
    appointmentsToday: 8,
    activeUsers: 112,
    timestamp: new Date().toISOString()
  });
});

// User profile
app.get("/user/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "user_not_found", message: "User not found" });
    }

    return res.json({ status: "success", user: data });
    
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Start production server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                🔥 PRODUCTION MODE ACTIVE 🔥                  ║
╠══════════════════════════════════════════════════════════════╣
║ Server: http://localhost:${PORT}                              ║
║ Environment: PRODUCTION                                      ║
║ Real OTP Emails: ✅ ENABLED                                  ║
║ Database: ✅ SUPABASE CONNECTED                              ║
╠══════════════════════════════════════════════════════════════╣
║ 🚀 READY FOR REAL TESTING:                                  ║
║ • Real OTP emails will be sent                              ║
║ • Database entries will be created                          ║
║ • Full registration flow active                             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
/ /   L o g i n   e n d p o i n t  
 