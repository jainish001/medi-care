// index.js (backend entry) - Enhanced with middleware and better structure
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import supabase from "./db.js"; 
import { sendEmailOtp } from "./adapters/notifications.js";
import logger from "./utils/logger.js";
import { 
  validateOtpRequest, 
  validateOtpVerification, 
  validateUserSignup,
  sanitizeInput 
} from "./middleware/validation.js";
import { 
  generalLimiter, 
  otpLimiter, 
  authLimiter, 
  signupLimiter 
} from "./middleware/rateLimiter.js";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:8000",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(logger.requestLogger());

// Input sanitization
app.use(sanitizeInput);

// General rate limiting
app.use(generalLimiter);

// OTP Configuration
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

// Helper functions
function genOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp, salt) {
  const secret = process.env.JWT_SECRET || "devsecret";
  return crypto.createHmac("sha256", secret)
    .update(otp + salt)
    .digest("hex");
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// ---------------- AUTHENTICATION ROUTES ----------------

// Request OTP endpoint
app.post("/auth/request-otp", otpLimiter, validateOtpRequest, async (req, res) => {
  const { email } = req.body;
  
  try {
    // Clean up expired OTP records for this email
    await supabase
      .from("otp_records")
      .delete()
      .eq("contact", email)
      .lt("expires_at", new Date().toISOString());

    // Generate new OTP
    const otp = genOtp();
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = hashOtp(otp, salt);

    // Store OTP record
    const { data, error } = await supabase
      .from("otp_records")
      .insert([{
        contact: email,
        otp_hash: otpHash,
        salt,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        consumed: false,
        attempts: 0
      }])
      .select();

    if (error) {
      logger.logDbOperation("insert", "otp_records", null, error);
      return res.status(500).json({ error: "database_error", message: "Failed to store OTP" });
    }

    logger.logDbOperation("insert", "otp_records", data);
    logger.logOtp(email, otp, "generated");

    // Send OTP via email
    try {
      await sendEmailOtp(email, otp);
      logger.logEmail(email, "OTP Verification Code", "sent");
    } catch (emailError) {
      logger.logEmail(email, "OTP Verification Code", "failed", null, emailError);
      return res.status(500).json({ error: "email_error", message: "Failed to send OTP" });
    }

    return res.json({ 
      status: "success", 
      message: "OTP sent successfully",
      expiresIn: OTP_TTL_MS / 1000 // seconds
    });

  } catch (err) {
    logger.error("Error in /auth/request-otp", { email, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// Verify OTP endpoint
app.post("/auth/verify-otp", authLimiter, validateOtpVerification, async (req, res) => {
  const { contact, otp } = req.body;
  
  try {
    // Get the latest OTP record for this contact
    const { data: recs, error: fetchError } = await supabase
      .from("otp_records")
      .select("*")
      .eq("contact", contact)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      logger.logDbOperation("select", "otp_records", null, fetchError);
      return res.status(500).json({ error: "database_error" });
    }

    if (!recs || recs.length === 0) {
      logger.warn("OTP verification attempted with no record", { contact });
      return res.status(400).json({ error: "otp_not_found", message: "No OTP found for this email" });
    }

    const rec = recs[0];

    // Check if OTP is already consumed
    if (rec.consumed) {
      logger.warn("OTP verification attempted with consumed OTP", { contact });
      return res.status(400).json({ error: "otp_already_used", message: "This OTP has already been used" });
    }

    // Check if OTP is expired
    if (new Date() > new Date(rec.expires_at)) {
      logger.warn("OTP verification attempted with expired OTP", { contact });
      return res.status(400).json({ error: "otp_expired", message: "OTP has expired" });
    }

    // Check attempt limit
    if (rec.attempts >= MAX_OTP_ATTEMPTS) {
      logger.warn("OTP verification exceeded max attempts", { contact, attempts: rec.attempts });
      return res.status(429).json({ error: "too_many_attempts", message: "Too many failed attempts" });
    }

    // Verify OTP
    const candidate = hashOtp(String(otp).trim(), rec.salt);

    if (candidate !== rec.otp_hash) {
      // Increment attempt count
      await supabase
        .from("otp_records")
        .update({ attempts: rec.attempts + 1 })
        .eq("id", rec.id);

      logger.warn("Invalid OTP attempt", { contact, attempts: rec.attempts + 1 });
      return res.status(400).json({ 
        error: "invalid_otp", 
        message: "Invalid OTP",
        attemptsRemaining: MAX_OTP_ATTEMPTS - (rec.attempts + 1)
      });
    }

    // Mark OTP as consumed
    const { error: updateError } = await supabase
      .from("otp_records")
      .update({ consumed: true })
      .eq("id", rec.id);

    if (updateError) {
      logger.logDbOperation("update", "otp_records", null, updateError);
      return res.status(500).json({ error: "database_error" });
    }

    logger.info("OTP verified successfully", { contact });
    return res.json({ 
      status: "success", 
      message: "OTP verified successfully" 
    });

  } catch (err) {
    logger.error("Error in /auth/verify-otp", { contact, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// User signup endpoint
app.post("/auth/signup", signupLimiter, validateUserSignup, async (req, res) => {
  const { email, name, phone, age } = req.body;
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    if (existingUser) {
      logger.warn("Signup attempted with existing email", { email });
      return res.status(409).json({ error: "user_exists", message: "User with this email already exists" });
    }

    // Create new user
    const { data, error } = await supabase
      .from("users")
      .insert([{ 
        email: email.toLowerCase(), 
        name: name.trim(), 
        phone: phone?.trim(), 
        age: parseInt(age) 
      }])
      .select("id, email, name, phone, age, created_at");

    if (error) {
      logger.logDbOperation("insert", "users", null, error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: "user_exists", message: "User with this email already exists" });
      }
      return res.status(500).json({ error: "database_error", message: "Failed to create user" });
    }

    logger.logDbOperation("insert", "users", data);
    logger.info("User created successfully", { email, userId: data[0].id });

    return res.status(201).json({ 
      status: "success", 
      message: "User created successfully",
      user: data[0] 
    });

  } catch (err) {
    logger.error("Error in /auth/signup", { email, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// Login endpoint (Database-based with fallback test user)
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        error: "email_and_password_required", 
        message: "Email and password are required" 
      });
    }

    logger.info("Login attempt", { email });

    // Check if user exists in database
    const { data: user, error } = await supabase.from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      logger.warn("User not found in database", { email });
      
      // Fallback: Allow test user for demonstration
      if (email === "test@example.com" && password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)) {
        logger.info("Fallback test user allowed", { email });
        return res.json({ 
          status: "ok", 
          message: "Login successful!", 
          user: {
            id: 999,
            email: "test@example.com",
            name: "Test User",
            phone: "1234567890",
            age: 25,
            created_at: new Date().toISOString()
          }
        });
      }
      
      return res.status(401).json({ 
        error: "user_not_found", 
        message: "User not found. Please register first or use test@example.com with a valid password (e.g., Test1234)." 
      });
    }

    logger.info("User found in database", { email });
    
    return res.json({ 
      status: "ok", 
      message: "Login successful!", 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        age: user.age,
        created_at: user.created_at
      }
    });

  } catch (err) {
    logger.error("Error in /auth/login", { error: err.message });
    return res.status(500).json({ 
      error: "internal_error", 
      message: "Login failed" 
    });
  }
});

// ---------------- DASHBOARD ROUTES ----------------

// Dashboard stats endpoint
app.get("/dashboard/stats", (req, res) => {
  try {
    // In a real application, these would be actual database queries
    const stats = {
      users: 1234,
      sales: 5678,
      appointmentsToday: 8,
      activeUsers: 112,
      timestamp: new Date().toISOString()
    };

    logger.debug("Dashboard stats requested", stats);
    return res.json(stats);

  } catch (err) {
    logger.error("Error in /dashboard/stats", { error: err.message });
    return res.status(500).json({
      error: "internal_error",
      message: "Failed to fetch dashboard stats"
    });
  }
});

// Update user profile endpoint
app.put("/auth/update-profile", authLimiter, async (req, res) => {
  const { email, name, phone, age, gender, bloodType, address, emergencyContact, allergies, medicalConditions } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({ error: "email_required", message: "Email is required" });
    }

    // Update user profile
    const { data, error } = await supabase
      .from("users")
      .update({
        name: name?.trim(),
        phone: phone?.trim(),
        age: age ? parseInt(age) : null,
        gender: gender?.trim(),
        blood_type: bloodType?.trim(),
        address: address?.trim(),
        emergency_contact: emergencyContact?.trim(),
        allergies: allergies?.trim(),
        medical_conditions: medicalConditions?.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("email", email)
      .select("id, email, name, phone, age, gender, blood_type, address, emergency_contact, allergies, medical_conditions, updated_at");

    if (error) {
      logger.logDbOperation("update", "users", null, error);
      return res.status(500).json({ error: "database_error", message: "Failed to update profile" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "user_not_found", message: "User not found" });
    }

    logger.info("User profile updated successfully", { email });
    return res.json({ 
      status: "success", 
      message: "Profile updated successfully",
      user: data[0] 
    });

  } catch (err) {
    logger.error("Error in /auth/update-profile", { email, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// ---------------- USER MANAGEMENT ROUTES ----------------

// Get user profile
app.get("/user/profile/:email", async (req, res) => {
  const { email } = req.params;
  
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, phone, age, gender, blood_type, address, emergency_contact, allergies, medical_conditions, profile_picture_url, created_at, updated_at")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: "user_not_found", message: "User not found" });
      }
      logger.logDbOperation("select", "users", null, error);
      return res.status(500).json({ error: "database_error" });
    }

    logger.debug("User profile retrieved", { email });
    return res.json({ status: "success", user: data });

  } catch (err) {
    logger.error("Error in /user/profile", { email, error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---------------- MEDICATION TRACKER ROUTES ----------------

// Get all available medicines (using prescriptions as medicine stock)
app.get("/api/medicine-stock", async (req, res) => {
  try {
    // Get unique medication names from prescriptions as available medicines
    const { data, error } = await supabase
      .from("prescriptions")
      .select("medication_name, dosage")
      .eq("status", "active")
      .order("medication_name");

    if (error) {
      logger.logDbOperation("select", "prescriptions", null, error);
      return res.status(500).json({ error: "database_error", message: "Failed to fetch available medicines" });
    }

    // Create mock stock data from prescriptions
    const uniqueMedicines = [];
    const medicineMap = new Map();
    
    data?.forEach(prescription => {
      if (!medicineMap.has(prescription.medication_name)) {
        medicineMap.set(prescription.medication_name, {
          id: prescription.medication_name.toLowerCase().replace(/\s+/g, '-'),
          name: prescription.medication_name,
          description: `Available medication: ${prescription.medication_name}`,
          stock_quantity: Math.floor(Math.random() * 50) + 10, // Mock stock quantity
          unit: 'pills',
          low_stock_threshold: 10
        });
      }
    });

    uniqueMedicines.push(...medicineMap.values());

    logger.debug("Available medicines retrieved", { count: uniqueMedicines.length });
    return res.json({ status: "success", data: uniqueMedicines });

  } catch (err) {
    logger.error("Error in /api/medicine-stock", { error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// Add medicine for specific date (using prescriptions table)
app.post("/api/medicines", authLimiter, async (req, res) => {
  const { user_email, medicine_name, dosage, scheduled_date, scheduled_time } = req.body;
  
  try {
    if (!user_email || !medicine_name || !dosage || !scheduled_date) {
      return res.status(400).json({ 
        error: "missing_fields", 
        message: "User email, medicine name, dosage, and scheduled date are required" 
      });
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user_email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "user_not_found", message: "User not found" });
    }

    // Create a prescription entry for the scheduled medicine
    const { data: prescriptionData, error: prescriptionError } = await supabase
      .from("prescriptions")
      .insert([{
        user_id: userData.id,
        medication_name: medicine_name,
        dosage: dosage.trim(),
        frequency: `Scheduled for ${scheduled_date} at ${scheduled_time || '09:00'}`,
        duration: "1 day",
        doctor_name: "Self-scheduled",
        prescribed_date: new Date().toISOString(),
        status: 'active',
        notes: `Scheduled via Medication Tracker for ${scheduled_date}`
      }])
      .select();

    if (prescriptionError) {
      logger.logDbOperation("insert", "prescriptions", null, prescriptionError);
      return res.status(500).json({ error: "database_error", message: "Failed to schedule medicine" });
    }

    logger.info("Medicine scheduled successfully", { 
      user_email, 
      medicine_name, 
      scheduled_date
    });

    return res.json({ 
      status: "success", 
      message: "Medicine scheduled successfully",
      data: {
        id: prescriptionData[0].id,
        name: medicine_name,
        dosage: dosage,
        scheduled_date: scheduled_date,
        scheduled_time: scheduled_time || '09:00:00',
        status: 'scheduled'
      }
    });

  } catch (err) {
    logger.error("Error in /api/medicines", { user_email, medicine_name, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// Get medicines for specific date (from prescriptions)
app.get("/api/medicines/:date", async (req, res) => {
  const { date } = req.params;
  const { user_email } = req.query;
  
  try {
    if (!user_email) {
      return res.status(400).json({ error: "user_email_required", message: "User email is required" });
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user_email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "user_not_found", message: "User not found" });
    }

    // Get prescriptions that match the date in notes or are active
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", userData.id)
      .eq("status", "active")
      .ilike("notes", `%${date}%`);

    if (error) {
      logger.logDbOperation("select", "prescriptions", null, error);
      return res.status(500).json({ error: "database_error", message: "Failed to fetch medicines" });
    }

    // Transform prescriptions to medicine format
    const medicines = data?.map(prescription => ({
      id: prescription.id,
      name: prescription.medication_name,
      dosage: prescription.dosage,
      scheduled_date: date,
      scheduled_time: '09:00:00', // Default time
      status: prescription.status === 'active' ? 'scheduled' : 'taken',
      notes: prescription.notes
    })) || [];

    logger.debug("Medicines retrieved for date", { date, user_email, count: medicines.length });
    return res.json({ status: "success", data: medicines });

  } catch (err) {
    logger.error("Error in /api/medicines/:date", { date, user_email, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// Get all medicines for a user (from prescriptions)
app.get("/api/medicines/user/:email", async (req, res) => {
  const { email } = req.params;
  
  try {
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "user_not_found", message: "User not found" });
    }

    // Get all active prescriptions for user
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", userData.id)
      .order("prescribed_date", { ascending: false });

    if (error) {
      logger.logDbOperation("select", "prescriptions", null, error);
      return res.status(500).json({ error: "database_error", message: "Failed to fetch medicines" });
    }

    // Transform prescriptions to medicine format
    const medicines = data?.map(prescription => ({
      id: prescription.id,
      name: prescription.medication_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      status: prescription.status,
      prescribed_date: prescription.prescribed_date,
      doctor_name: prescription.doctor_name,
      notes: prescription.notes
    })) || [];

    logger.debug("All medicines retrieved for user", { email, count: medicines.length });
    return res.json({ status: "success", data: medicines });

  } catch (err) {
    logger.error("Error in /api/medicines/user/:email", { email, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// Mark medicine as taken (update prescription status)
app.put("/api/medicines/:id/take", authLimiter, async (req, res) => {
  const { id } = req.params;
  const { user_email, notes } = req.body;
  
  try {
    if (!user_email) {
      return res.status(400).json({ error: "user_email_required", message: "User email is required" });
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user_email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "user_not_found", message: "User not found" });
    }

    // Update prescription status to completed
    const { data: updatedPrescription, error: updateError } = await supabase
      .from("prescriptions")
      .update({ 
        status: 'completed',
        notes: notes ? `${notes} - Taken on ${new Date().toISOString()}` : `Taken on ${new Date().toISOString()}`
      })
      .eq("id", id)
      .eq("user_id", userData.id)
      .select();

    if (updateError) {
      logger.logDbOperation("update", "prescriptions", null, updateError);
      return res.status(500).json({ error: "database_error", message: "Failed to update medicine status" });
    }

    if (!updatedPrescription || updatedPrescription.length === 0) {
      return res.status(404).json({ error: "medicine_not_found", message: "Medicine not found" });
    }

    logger.info("Medicine marked as taken", { id, user_email, medicine_name: updatedPrescription[0].medication_name });
    return res.json({ 
      status: "success", 
      message: "Medicine marked as taken",
      data: {
        id: updatedPrescription[0].id,
        name: updatedPrescription[0].medication_name,
        status: 'taken'
      }
    });

  } catch (err) {
    logger.error("Error in /api/medicines/:id/take", { id, user_email, error: err.message });
    return res.status(500).json({ error: "internal_error", message: "Server error occurred" });
  }
});

// ---------------- ERROR HANDLING ----------------

// 404 handler
app.use("*", (req, res) => {
  logger.warn("404 - Route not found", { method: req.method, path: req.originalUrl });
  res.status(404).json({
    error: "not_found",
    message: "Route not found",
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", { 
    error: err.message, 
    stack: err.stack,
    method: req.method,
    path: req.originalUrl
  });

  res.status(500).json({
    error: "internal_error",
    message: process.env.NODE_ENV === 'development' ? err.message : "Internal server error"
  });
});

// ---------------- SERVER STARTUP ----------------

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`🏥 Medical Backend Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🏥 Medical Backend API                    ║
╠══════════════════════════════════════════════════════════════╣
║ Server: http://localhost:${PORT.toString().padEnd(33)} ║
║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(28)} ║
║ Health Check: http://localhost:${PORT}/health${' '.repeat(18)} ║
╠══════════════════════════════════════════════════════════════╣
║ Endpoints:                                                   ║
║ • POST /auth/request-otp - Request OTP                      ║
║ • POST /auth/verify-otp  - Verify OTP                       ║
║ • POST /auth/signup      - User registration                ║
║ • GET  /dashboard/stats  - Dashboard statistics             ║
║ • GET  /user/profile/:email - User profile                  ║
║ • GET  /health           - Health check                     ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
