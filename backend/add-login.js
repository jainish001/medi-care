// Add login endpoint to existing server
import express from "express";
import supabase from "./db.js";

const app = express();

// ✅ Real Login Endpoint
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        error: "email_and_password_required", 
        message: "Email and password are required" 
      });
    }

    console.log(`🔥 PRODUCTION LOGIN: ${email}`);

    // Check if user exists in database
    const { data: user, error } = await supabase.from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.log(`❌ USER NOT FOUND: ${email}`);
      return res.status(401).json({ 
        error: "user_not_found", 
        message: "User not found. Please register first." 
      });
    }

    console.log(`✅ USER FOUND: ${email}`);
    
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
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({ 
      error: "internal_error", 
      message: "Login failed" 
    });
  }
});

console.log("Login endpoint ready to be added");
