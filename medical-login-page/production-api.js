// Production API Service - Connects to Backend Server
class ProductionAPIService {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.otpStorage = new Map();
    }

    // Request OTP from production backend
    async requestOTP(email) {
        try {
            console.log(`🔥 FRONTEND: Requesting OTP for ${email}`);
            
            const response = await fetch(`${this.baseURL}/auth/request-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            console.log('✅ FRONTEND: OTP request successful');
            
            // Store email for verification
            this.otpStorage.set(email, {
                requested: true,
                timestamp: Date.now()
            });

            return {
                success: true,
                message: data.message,
                expiresIn: data.expiresIn
            };

        } catch (error) {
            console.error('❌ FRONTEND: OTP request failed:', error);
            throw new Error(error.message || 'Failed to send OTP');
        }
    }

    // Verify OTP with production backend
    async verifyOTP(email, otp) {
        try {
            console.log(`🔥 FRONTEND: Verifying OTP for ${email}`);
            
            const response = await fetch(`${this.baseURL}/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    contact: email, 
                    otp: otp 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }

            console.log('✅ FRONTEND: OTP verified successfully');
            
            return {
                success: true,
                message: data.message,
                verified: data.verified
            };

        } catch (error) {
            console.error('❌ FRONTEND: OTP verification failed:', error);
            throw new Error(error.message || 'OTP verification failed');
        }
    }

    // Register user with production backend
    async registerUser(email, name, phone, age) {
        try {
            console.log(`🔥 FRONTEND: Registering user ${email}`);
            
            const response = await fetch(`${this.baseURL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    name, 
                    phone, 
                    age: parseInt(age)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            console.log('✅ FRONTEND: User registered successfully');
            
            // Clean up OTP storage
            this.otpStorage.delete(email);

            return {
                success: true,
                message: data.message,
                user: data.user
            };

        } catch (error) {
            console.error('❌ FRONTEND: Registration failed:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    // Complete registration flow: OTP → Verify → Register
    async completeRegistration(email, name, phone, age, otp) {
        try {
            // Step 1: Verify OTP
            await this.verifyOTP(email, otp);
            
            // Step 2: Register user
            const result = await this.registerUser(email, name, phone, age);
            
            return {
                success: true,
                message: 'Registration completed successfully!',
                user: result.user
            };

        } catch (error) {
            console.error('❌ FRONTEND: Complete registration failed:', error);
            throw new Error(error.message);
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'error', message: error.message };
        }
    }

    // Get dashboard stats
    async getDashboardStats() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/stats`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Dashboard stats failed:', error);
            return null;
        }
    }

    // Get user profile
    async getUserProfile(email) {
        try {
            const response = await fetch(`${this.baseURL}/user/profile/${encodeURIComponent(email)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to get user profile');
            }
            
            return data;
        } catch (error) {
            console.error('Get user profile failed:', error);
            throw new Error(error.message);
        }
    }
}

// Create and export singleton instance
const productionAPI = new ProductionAPIService();

// Test connection on load
if (typeof window !== 'undefined') {
    productionAPI.healthCheck().then(health => {
        if (health.status === 'healthy') {
            console.log('🔥 PRODUCTION API: Connected successfully!', health);
        } else {
            console.warn('⚠️ PRODUCTION API: Connection issue', health);
        }
    });
}

export default productionAPI;

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = productionAPI;
}
