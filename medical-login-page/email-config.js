// Email Configuration for SMTP
// Fill in your SMTP details manually

export const emailConfig = {
    // SMTP Server Configuration
    smtp: {
        host: '', // e.g., 'smtp.gmail.com', 'smtp.outlook.com', 'mail.your-domain.com'
        port: 587, // Common ports: 587 (TLS), 465 (SSL), 25 (non-secure)
        secure: false, // true for 465, false for other ports
        
        // Authentication
        auth: {
            user: '', // Your email address
            pass: ''  // Your email password or app-specific password
        },
        
        // Additional SMTP options
        tls: {
            rejectUnauthorized: false // Set to true in production
        }
    },
    
    // Email Templates Configuration
    templates: {
        from: {
            name: 'MedCare Portal',
            email: '' // Should match your SMTP auth user
        },
        
        // OTP Email Template
        otp: {
            subject: 'MedCare Portal - Email Verification Code',
            template: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification - MedCare Portal</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .otp-code { background: #fff; border: 2px solid #2c5aa0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #2c5aa0; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏥 MedCare Portal</h1>
                            <p>Email Verification Required</p>
                        </div>
                        <div class="content">
                            <h2>Hello {{fullName}},</h2>
                            <p>Thank you for registering with MedCare Portal. To complete your registration, please verify your email address using the code below:</p>
                            
                            <div class="otp-code">{{otp}}</div>
                            
                            <p><strong>This verification code will expire in {{expiryMinutes}} minutes.</strong></p>
                            
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong>
                                <ul>
                                    <li>Never share this code with anyone</li>
                                    <li>MedCare Portal will never ask for this code via phone or email</li>
                                    <li>If you didn't request this code, please ignore this email</li>
                                </ul>
                            </div>
                            
                            <p>If you're having trouble with the verification process, please contact our support team.</p>
                            
                            <p>Best regards,<br>The MedCare Portal Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>&copy; 2024 MedCare Portal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        },
        
        // Password Reset Email Template
        passwordReset: {
            subject: 'MedCare Portal - Password Reset Request',
            template: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset - MedCare Portal</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .reset-button { display: inline-block; background: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏥 MedCare Portal</h1>
                            <p>Password Reset Request</p>
                        </div>
                        <div class="content">
                            <h2>Hello {{fullName}},</h2>
                            <p>We received a request to reset your password for your MedCare Portal account.</p>
                            
                            <p>Click the button below to reset your password:</p>
                            <a href="{{resetLink}}" class="reset-button">Reset Password</a>
                            
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">{{resetLink}}</p>
                            
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong>
                                <ul>
                                    <li>This link will expire in 1 hour</li>
                                    <li>If you didn't request this reset, please ignore this email</li>
                                    <li>Your password will remain unchanged until you create a new one</li>
                                </ul>
                            </div>
                            
                            <p>Best regards,<br>The MedCare Portal Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>&copy; 2024 MedCare Portal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        }
    },
    
    // Email Service Settings
    settings: {
        maxRetries: 3,
        retryDelay: 1000, // milliseconds
        timeout: 30000, // 30 seconds
        
        // Rate limiting
        rateLimit: {
            maxEmails: 100, // per hour
            windowMs: 3600000 // 1 hour in milliseconds
        }
    }
};

// SMTP Provider Presets (for easy configuration)
export const smtpPresets = {
    gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        note: 'Use App Password instead of regular password'
    },
    
    outlook: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        note: 'Works with Outlook.com and Hotmail'
    },
    
    yahoo: {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        note: 'Enable "Less secure app access" or use App Password'
    },
    
    zoho: {
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        note: 'Professional email service'
    },
    
    sendgrid: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        note: 'Use API key as password'
    },
    
    mailgun: {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        note: 'Use Mailgun SMTP credentials'
    }
};

// Configuration validation
export function validateEmailConfig(config) {
    const errors = [];
    
    if (!config.smtp.host) {
        errors.push('SMTP host is required');
    }
    
    if (!config.smtp.port) {
        errors.push('SMTP port is required');
    }
    
    if (!config.smtp.auth.user) {
        errors.push('SMTP username is required');
    }
    
    if (!config.smtp.auth.pass) {
        errors.push('SMTP password is required');
    }
    
    if (!config.templates.from.email) {
        errors.push('From email address is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Helper function to get preset configuration
export function getPresetConfig(provider) {
    return smtpPresets[provider] || null;
}
