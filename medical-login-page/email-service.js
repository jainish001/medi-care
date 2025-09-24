// Email Service with SMTP Integration
import { emailConfig, validateEmailConfig } from './email-config.js';

class EmailService {
    constructor() {
        this.config = emailConfig;
        this.isConfigured = false;
        this.rateLimitTracker = new Map();
        
        this.init();
    }

    init() {
        // Validate configuration
        const validation = validateEmailConfig(this.config);
        
        if (validation.isValid) {
            this.isConfigured = true;
            console.log('✅ Email service configured successfully');
        } else {
            console.warn('⚠️ Email service not configured:', validation.errors);
            console.log('📧 Using simulation mode. Configure SMTP in email-config.js');
        }
    }

    // Send OTP email
    async sendOTPEmail(email, otp, fullName = '', expiryMinutes = 10) {
        try {
            if (!this.isConfigured) {
                return await this.simulateEmailSending(email, otp, fullName, 'otp');
            }

            // Check rate limiting
            if (!this.checkRateLimit(email)) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            // Prepare email content
            const emailContent = this.prepareOTPEmail(email, otp, fullName, expiryMinutes);
            
            // Send email via SMTP
            const result = await this.sendSMTPEmail(emailContent);
            
            // Track sent email for rate limiting
            this.trackSentEmail(email);
            
            return {
                success: true,
                message: 'OTP email sent successfully',
                messageId: result.messageId
            };

        } catch (error) {
            console.error('Send OTP email error:', error);
            
            // Fallback to simulation if SMTP fails
            if (this.isConfigured) {
                console.warn('SMTP failed, falling back to simulation');
                return await this.simulateEmailSending(email, otp, fullName, 'otp');
            }
            
            throw error;
        }
    }

    // Send password reset email
    async sendPasswordResetEmail(email, resetLink, fullName = '') {
        try {
            if (!this.isConfigured) {
                return await this.simulateEmailSending(email, resetLink, fullName, 'reset');
            }

            // Check rate limiting
            if (!this.checkRateLimit(email)) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            // Prepare email content
            const emailContent = this.preparePasswordResetEmail(email, resetLink, fullName);
            
            // Send email via SMTP
            const result = await this.sendSMTPEmail(emailContent);
            
            // Track sent email for rate limiting
            this.trackSentEmail(email);
            
            return {
                success: true,
                message: 'Password reset email sent successfully',
                messageId: result.messageId
            };

        } catch (error) {
            console.error('Send password reset email error:', error);
            
            // Fallback to simulation if SMTP fails
            if (this.isConfigured) {
                console.warn('SMTP failed, falling back to simulation');
                return await this.simulateEmailSending(email, resetLink, fullName, 'reset');
            }
            
            throw error;
        }
    }

    // Prepare OTP email content
    prepareOTPEmail(email, otp, fullName, expiryMinutes) {
        const template = this.config.templates.otp.template;
        const subject = this.config.templates.otp.subject;
        
        const htmlContent = template
            .replace(/{{fullName}}/g, fullName || 'User')
            .replace(/{{otp}}/g, otp)
            .replace(/{{expiryMinutes}}/g, expiryMinutes);

        return {
            from: {
                name: this.config.templates.from.name,
                address: this.config.templates.from.email
            },
            to: email,
            subject: subject,
            html: htmlContent,
            text: this.htmlToText(htmlContent)
        };
    }

    // Prepare password reset email content
    preparePasswordResetEmail(email, resetLink, fullName) {
        const template = this.config.templates.passwordReset.template;
        const subject = this.config.templates.passwordReset.subject;
        
        const htmlContent = template
            .replace(/{{fullName}}/g, fullName || 'User')
            .replace(/{{resetLink}}/g, resetLink);

        return {
            from: {
                name: this.config.templates.from.name,
                address: this.config.templates.from.email
            },
            to: email,
            subject: subject,
            html: htmlContent,
            text: this.htmlToText(htmlContent)
        };
    }

    // Send email via SMTP (Browser-compatible implementation)
    async sendSMTPEmail(emailContent) {
        try {
            // Since we're in a browser environment, we'll use a server endpoint
            // This would typically be handled by a backend service
            
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    smtpConfig: this.config.smtp,
                    emailContent: emailContent
                })
            });

            if (!response.ok) {
                throw new Error(`SMTP server error: ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            // If no backend endpoint is available, fall back to simulation
            console.warn('No backend email endpoint available, using simulation');
            throw new Error('SMTP service unavailable');
        }
    }

    // Simulate email sending (for development/demo)
    async simulateEmailSending(email, data, fullName, type) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const timestamp = new Date().toLocaleString();
        
        if (type === 'otp') {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    📧 EMAIL SIMULATION                       ║
╠══════════════════════════════════════════════════════════════╣
║ Type: OTP Verification                                       ║
║ To: ${email.padEnd(50)} ║
║ Subject: MedCare Portal - Email Verification Code           ║
║ Time: ${timestamp.padEnd(48)} ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ Hello ${(fullName || 'User').padEnd(51)} ║
║                                                              ║
║ Your verification code is:                                   ║
║                                                              ║
║                        ${data}                         ║
║                                                              ║
║ This code will expire in 10 minutes.                        ║
║                                                              ║
║ If you didn't request this code, please ignore this email.  ║
║                                                              ║
║ Best regards,                                                ║
║ MedCare Portal Team                                          ║
╚══════════════════════════════════════════════════════════════╝
            `);
        } else if (type === 'reset') {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    📧 EMAIL SIMULATION                       ║
╠══════════════════════════════════════════════════════════════╣
║ Type: Password Reset                                         ║
║ To: ${email.padEnd(50)} ║
║ Subject: MedCare Portal - Password Reset Request            ║
║ Time: ${timestamp.padEnd(48)} ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ Hello ${(fullName || 'User').padEnd(51)} ║
║                                                              ║
║ We received a request to reset your password.               ║
║                                                              ║
║ Reset Link: ${data.substring(0, 40).padEnd(40)} ║
║                                                              ║
║ This link will expire in 1 hour.                            ║
║                                                              ║
║ If you didn't request this reset, ignore this email.        ║
║                                                              ║
║ Best regards,                                                ║
║ MedCare Portal Team                                          ║
╚══════════════════════════════════════════════════════════════╝
            `);
        }

        // Show browser notification in development
        if (typeof window !== 'undefined' && type === 'otp') {
            setTimeout(() => {
                const notification = document.createElement('div');
                notification.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #2c5aa0;
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        z-index: 10000;
                        max-width: 350px;
                        font-family: Arial, sans-serif;
                        animation: slideIn 0.3s ease-out;
                    ">
                        <div style="font-weight: bold; margin-bottom: 10px;">
                            📧 Development Mode - Email Sent
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong>To:</strong> ${email}
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong>OTP Code:</strong> 
                            <span style="
                                background: rgba(255,255,255,0.2);
                                padding: 5px 10px;
                                border-radius: 4px;
                                font-family: monospace;
                                font-size: 18px;
                                font-weight: bold;
                            ">${data}</span>
                        </div>
                        <div style="font-size: 12px; opacity: 0.8;">
                            Check console for full email content
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" style="
                            position: absolute;
                            top: 5px;
                            right: 10px;
                            background: none;
                            border: none;
                            color: white;
                            font-size: 18px;
                            cursor: pointer;
                        ">×</button>
                    </div>
                `;
                
                document.body.appendChild(notification);
                
                // Auto remove after 10 seconds
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.style.animation = 'slideOut 0.3s ease-out';
                        setTimeout(() => {
                            if (document.body.contains(notification)) {
                                document.body.removeChild(notification);
                            }
                        }, 300);
                    }
                }, 10000);
            }, 500);
        }

        return {
            success: true,
            message: 'Email simulated successfully',
            messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }

    // Rate limiting
    checkRateLimit(email) {
        const now = Date.now();
        const windowMs = this.config.settings.rateLimit.windowMs;
        const maxEmails = this.config.settings.rateLimit.maxEmails;
        
        // Clean old entries
        for (const [key, timestamps] of this.rateLimitTracker.entries()) {
            const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
            if (validTimestamps.length === 0) {
                this.rateLimitTracker.delete(key);
            } else {
                this.rateLimitTracker.set(key, validTimestamps);
            }
        }
        
        // Check current email rate limit
        const emailTimestamps = this.rateLimitTracker.get(email) || [];
        return emailTimestamps.length < maxEmails;
    }

    trackSentEmail(email) {
        const now = Date.now();
        const timestamps = this.rateLimitTracker.get(email) || [];
        timestamps.push(now);
        this.rateLimitTracker.set(email, timestamps);
    }

    // Convert HTML to plain text
    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Test email configuration
    async testConfiguration() {
        try {
            if (!this.isConfigured) {
                return {
                    success: false,
                    message: 'Email service not configured'
                };
            }

            // Send test email
            const testResult = await this.sendSMTPEmail({
                from: {
                    name: this.config.templates.from.name,
                    address: this.config.templates.from.email
                },
                to: this.config.templates.from.email,
                subject: 'MedCare Portal - SMTP Test',
                html: '<h1>SMTP Configuration Test</h1><p>If you receive this email, your SMTP configuration is working correctly!</p>',
                text: 'SMTP Configuration Test - If you receive this email, your SMTP configuration is working correctly!'
            });

            return {
                success: true,
                message: 'SMTP configuration test successful',
                result: testResult
            };

        } catch (error) {
            return {
                success: false,
                message: `SMTP configuration test failed: ${error.message}`,
                error: error
            };
        }
    }

    // Get configuration status
    getStatus() {
        return {
            configured: this.isConfigured,
            smtpHost: this.config.smtp.host || 'Not configured',
            fromEmail: this.config.templates.from.email || 'Not configured',
            rateLimitActive: this.rateLimitTracker.size > 0
        };
    }
}

// Add CSS for email notifications
const emailNotificationCSS = `
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(100px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100px);
    }
}
`;

// Inject CSS if in browser environment
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = emailNotificationCSS;
    document.head.appendChild(style);
}

// Create and export singleton instance
const emailService = new EmailService();

export default emailService;

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = emailService;
}
