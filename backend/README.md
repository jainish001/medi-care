# Medical Backend API

A Node.js/Express backend service for medical application with OTP-based authentication, user management, and email notifications.

## 🚀 Features

- **OTP Authentication**: Secure email-based OTP verification
- **User Management**: Registration, login, and profile management
- **Email Service**: Automated email notifications using Nodemailer
- **Supabase Integration**: PostgreSQL database with real-time capabilities
- **Security**: JWT tokens, password hashing, rate limiting
- **Dashboard Stats**: Analytics and reporting endpoints

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- A Supabase account
- A Gmail account (for SMTP)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Fill in your environment variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Email Configuration (Gmail SMTP)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Supabase Setup

#### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

#### Step 2: Get Your Credentials
1. Go to Project Settings → API
2. Copy your `Project URL` (SUPABASE_URL)
3. Copy your `service_role` key (SUPABASE_SERVICE_KEY)

#### Step 3: Create Database Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    age INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create OTP records table
CREATE TABLE otp_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX idx_otp_records_contact ON otp_records(contact);
CREATE INDEX idx_otp_records_expires_at ON otp_records(expires_at);
CREATE INDEX idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_records ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can manage all data" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage OTP records" ON otp_records
    FOR ALL USING (auth.role() = 'service_role');
```

### 4. Gmail SMTP Setup

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Enable 2-Factor Authentication

#### Step 2: Generate App Password
1. Go to Google Account → Security → 2-Step Verification
2. Scroll down to "App passwords"
3. Generate a new app password for "Mail"
4. Use this password in your `.env` file as `SMTP_PASS`

### 5. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3001`

## 📚 API Endpoints

### Authentication

#### Request OTP
```http
POST /auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "contact": "user@example.com",
  "otp": "123456"
}
```

#### User Signup
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "age": 30
}
```

### Dashboard

#### Get Stats
```http
GET /dashboard/stats
```

## 🧪 Testing

### Test Supabase Connection
```bash
node quick-supabase-test.mjs
```

### Test API Endpoints

You can use curl, Postman, or any HTTP client:

```bash
# Test OTP request
curl -X POST http://localhost:3001/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test dashboard stats
curl http://localhost:3001/dashboard/stats
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `JWT_SECRET` | JWT signing secret | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `SMTP_EMAIL` | Gmail address for sending emails | Yes |
| `SMTP_PASS` | Gmail app password | Yes |

### OTP Configuration

- **OTP Length**: 6 digits
- **OTP TTL**: 5 minutes
- **Max Attempts**: 5 per OTP
- **Hash Algorithm**: HMAC-SHA256

## 🚨 Troubleshooting

### Common Issues

#### 1. Supabase Connection Error
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check if your IP is allowed in Supabase settings
- Ensure tables are created correctly

#### 2. Email Not Sending
- Verify Gmail app password is correct
- Check if 2FA is enabled on your Google account
- Ensure `SMTP_EMAIL` and `SMTP_PASS` are set correctly

#### 3. OTP Verification Fails
- Check if OTP hasn't expired (5-minute limit)
- Verify the email address matches exactly
- Ensure OTP hasn't been used already

#### 4. Database Errors
- Check Supabase logs in the dashboard
- Verify table schemas match the expected structure
- Ensure RLS policies allow your operations

### Debug Mode

Set `NODE_ENV=development` to see detailed logs including:
- Generated OTP codes (for testing)
- Database query details
- Email sending status

## 🔒 Security Considerations

- Always use HTTPS in production
- Keep your JWT secret secure and rotate it regularly
- Use strong passwords for your database
- Enable rate limiting for production
- Regularly update dependencies
- Monitor Supabase logs for suspicious activity

## 📝 Development

### Project Structure
```
backend/
├── index.js              # Main server file
├── db.js                 # Database configuration
├── package.json          # Dependencies
├── .env                  # Environment variables
├── .env.example          # Environment template
├── README.md             # This file
├── quick-supabase-test.mjs # Database test script
└── adapters/
    └── notifications.js   # Email service
```

### Adding New Features

1. Create new route handlers in `index.js`
2. Add database operations using the Supabase client
3. Update this README with new endpoints
4. Test thoroughly before deployment

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the server logs for error details
3. Verify your environment configuration
4. Test individual components (database, email) separately

## 📄 License

This project is licensed under the MIT License.
