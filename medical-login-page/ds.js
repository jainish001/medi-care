// Database Service - Supabase Integration
// Import Supabase from CDN
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import emailService from './email-service.js';

class DatabaseService {
    constructor() {
        // Initialize Supabase client - Replace these with your actual Supabase credentials
        this.supabaseUrl = 'https://mepbseakmsruhzgmxbpj.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcGJzZWFrbXNydWh6Z214YnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODcxOTIsImV4cCI6MjA3NDA2MzE5Mn0.SJAbfGvv6f424Fzae2O-ZAgEZjHfUofk_BdxKrR6cLw';
        
        // Only initialize Supabase if credentials are provided
        if (this.supabaseUrl !== ' https://mepbseakmsruhzgmxbpj.supabase.co ' && this.supabaseKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcGJzZWFrbXNydWh6Z214YnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODcxOTIsImV4cCI6MjA3NDA2MzE5Mn0.SJAbfGvv6f424Fzae2O-ZAgEZjHfUofk_BdxKrR6cLw') {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            console.warn('Supabase credentials not configured. Using demo mode.');
            this.supabase = null;
        }
        
        // OTP storage for verification
        this.otpStorage = new Map();
        this.otpExpiry = 10; // 10 minutes
    }

    // Authentication Methods
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw new Error(error.message);
            }

            return {
                success: true,
                user: data.user,
                session: data.session
            };
        } catch (error) {
            console.error('Sign in error:', error);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: userData.fullName || '',
                        role: userData.role || 'healthcare_provider',
                        department: userData.department || '',
                        phone: userData.phone || ''
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            return {
                success: true,
                user: data.user,
                session: data.session
            };
        } catch (error) {
            console.error('Sign up error:', error);
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                throw new Error(error.message);
            }
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            throw new Error(`Logout failed: ${error.message}`);
        }
    }

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) {
                throw new Error(error.message);
            }
            return user;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    async getCurrentSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) {
                throw new Error(error.message);
            }
            return session;
        } catch (error) {
            console.error('Get current session error:', error);
            return null;
        }
    }

    // OTP Methods for Registration
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendRegistrationOTP(email, userData) {
        try {
            // Generate OTP
            const otp = this.generateOTP();
            const expiryTime = new Date(Date.now() + this.otpExpiry * 60 * 1000);

            // Store OTP with user data
            this.otpStorage.set(email, {
                otp: otp,
                userData: userData,
                expiryTime: expiryTime,
                attempts: 0
            });

            // Send OTP via email using the new email service
            await this.sendOTPEmail(email, otp, userData.fullName);

            return {
                success: true,
                message: 'OTP sent successfully',
                expiryTime: expiryTime
            };
        } catch (error) {
            console.error('Send OTP error:', error);
            throw new Error(`Failed to send OTP: ${error.message}`);
        }
    }

    async sendOTPEmail(email, otp, fullName = '') {
        try {
            // Use the new email service
            const result = await emailService.sendOTPEmail(email, otp, fullName, this.otpExpiry);
            
            if (result.success) {
                console.log('✅ OTP email sent successfully:', result.message);
                return result;
            } else {
                throw new Error(result.message || 'Failed to send OTP email');
            }

        } catch (error) {
            console.error('Send OTP email error:', error);
            
            // Fallback to simulation if email service fails
            console.warn('Email service failed, using fallback simulation');
            await this.simulateEmailSending(email, otp, fullName);
            
            return {
                success: true,
                message: 'OTP sent via simulation',
                messageId: `fallback_${Date.now()}`
            };
        }
    }

    async simulateEmailSending(email, otp, fullName) {
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Log OTP for development purposes
        console.log(`
        ========================================
        📧 EMAIL SIMULATION - OTP VERIFICATION
        ========================================
        To: ${email}
        Subject: MedCare Portal - Email Verification
        
        Hello ${fullName || 'User'},
        
        Your verification code is: ${otp}
        
        This code will expire in ${this.otpExpiry} minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        MedCare Portal Team
        ========================================
        `);

        // In development, also show alert
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                alert(`Development Mode - OTP sent to ${email}\n\nYour OTP is: ${otp}\n\n(Check console for full email simulation)`);
            }, 500);
        }
    }

    async verifyRegistrationOTP(email, enteredOTP, password) {
        try {
            const otpData = this.otpStorage.get(email);

            if (!otpData) {
                throw new Error('OTP not found or expired. Please request a new one.');
            }

            // Check expiry
            if (new Date() > otpData.expiryTime) {
                this.otpStorage.delete(email);
                throw new Error('OTP has expired. Please request a new one.');
            }

            // Check attempts
            if (otpData.attempts >= 3) {
                this.otpStorage.delete(email);
                throw new Error('Too many failed attempts. Please request a new OTP.');
            }

            // Verify OTP
            if (otpData.otp !== enteredOTP) {
                otpData.attempts++;
                throw new Error(`Invalid OTP. ${3 - otpData.attempts} attempts remaining.`);
            }

            // OTP verified, proceed with registration
            const registrationResult = await this.signUp(email, password, otpData.userData);

            // Clean up OTP data
            this.otpStorage.delete(email);

            return {
                success: true,
                message: 'Registration completed successfully',
                user: registrationResult.user,
                session: registrationResult.session
            };

        } catch (error) {
            console.error('OTP verification error:', error);
            throw new Error(error.message);
        }
    }

    async resendOTP(email) {
        try {
            const otpData = this.otpStorage.get(email);
            
            if (!otpData) {
                throw new Error('No pending registration found for this email.');
            }

            // Generate new OTP
            const newOTP = this.generateOTP();
            const newExpiryTime = new Date(Date.now() + this.otpExpiry * 60 * 1000);

            // Update stored data
            otpData.otp = newOTP;
            otpData.expiryTime = newExpiryTime;
            otpData.attempts = 0;

            // Send new OTP
            await this.sendOTPEmail(email, newOTP, otpData.userData.fullName);

            return {
                success: true,
                message: 'New OTP sent successfully',
                expiryTime: newExpiryTime
            };

        } catch (error) {
            console.error('Resend OTP error:', error);
            throw new Error(error.message);
        }
    }

    // User Profile Methods
    async updateUserProfile(userId, profileData) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    ...profileData,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                throw new Error(error.message);
            }

            return { success: true, data };
        } catch (error) {
            console.error('Update profile error:', error);
            throw new Error(`Failed to update profile: ${error.message}`);
        }
    }

    async getUserProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw new Error(error.message);
            }

            return data;
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }

    // Password Reset Methods
    async sendPasswordResetEmail(email, fullName = '') {
        try {
            // Generate reset link (in real implementation, this would be a secure token)
            const resetToken = this.generateResetToken();
            const resetLink = `${window.location.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
            
            // Use the email service
            const result = await emailService.sendPasswordResetEmail(email, resetLink, fullName);
            
            if (result.success) {
                console.log('✅ Password reset email sent successfully:', result.message);
                
                // Store reset token (in real implementation, this would be in database)
                this.storeResetToken(email, resetToken);
                
                return {
                    success: true,
                    message: 'Password reset email sent successfully',
                    messageId: result.messageId
                };
            } else {
                throw new Error(result.message || 'Failed to send password reset email');
            }

        } catch (error) {
            console.error('Send password reset email error:', error);
            throw new Error(`Failed to send password reset email: ${error.message}`);
        }
    }

    // Generate secure reset token
    generateResetToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Store reset token (temporary implementation)
    storeResetToken(email, token) {
        const expiryTime = new Date(Date.now() + 3600000); // 1 hour
        
        // In a real implementation, this would be stored in the database
        if (typeof localStorage !== 'undefined') {
            const resetData = {
                email: email,
                token: token,
                expiryTime: expiryTime.toISOString(),
                used: false
            };
            localStorage.setItem(`reset_${token}`, JSON.stringify(resetData));
        }
    }

    // Password Reset Methods (Updated to use Supabase + Email Service)
    async requestPasswordReset(email) {
        try {
            // First, check if user exists
            const { data: users, error: userError } = await this.supabase
                .from('auth.users')
                .select('email, user_metadata')
                .eq('email', email)
                .limit(1);

            if (userError && userError.code !== 'PGRST116') {
                console.warn('Could not verify user existence, proceeding anyway');
            }

            // Use Supabase's built-in password reset
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                throw new Error(error.message);
            }

            // Also send our custom email for better user experience
            try {
                const fullName = users && users.length > 0 ? users[0].user_metadata?.full_name : '';
                await this.sendPasswordResetEmail(email, fullName);
            } catch (emailError) {
                console.warn('Custom password reset email failed:', emailError);
                // Don't fail the entire process if custom email fails
            }

            return {
                success: true,
                message: 'Password reset email sent successfully'
            };
        } catch (error) {
            console.error('Password reset error:', error);
            throw new Error(`Failed to send password reset email: ${error.message}`);
        }
    }

    // Utility Methods
    onAuthStateChange(callback) {
        return this.supabase.auth.onAuthStateChange(callback);
    }

    // Clean up expired OTPs periodically
    startOTPCleanup() {
        setInterval(() => {
            const now = new Date();
            for (const [email, otpData] of this.otpStorage.entries()) {
                if (now > otpData.expiryTime) {
                    this.otpStorage.delete(email);
                    console.log(`Cleaned up expired OTP for ${email}`);
                }
            }
        }, 60000); // Clean up every minute
    }
}

// Create and export singleton instance
const dbService = new DatabaseService();

// Start OTP cleanup when service is initialized
if (typeof window !== 'undefined') {
    dbService.startOTPCleanup();
}

export default dbService;

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dbService;
}
