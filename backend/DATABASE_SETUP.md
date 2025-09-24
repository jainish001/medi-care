# 🏥 Medical Backend Database Setup Guide

## 📋 Overview
This guide will help you set up the complete database schema for your medical backend system, including user profiles, appointments, medical records, and prescriptions.

## 🗄️ Database Schema

### Tables Created:
1. **users** - Enhanced user profiles with medical information
2. **otp_records** - OTP verification system
3. **appointments** - Medical appointments tracking
4. **medical_records** - Patient medical records
5. **prescriptions** - Active prescriptions management

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)
```bash
cd C:/Users/Jainish\ pachori/backend
node run-setup.js
```

### Option 2: Manual SQL Setup
1. Copy the SQL from `database-schema.sql`
2. Run it in your Supabase SQL editor
3. Verify tables are created

## 📊 User Profile Fields

The enhanced `users` table now includes:

### Basic Information:
- `id` - Unique user identifier (UUID)
- `email` - User email (unique)
- `name` - Full name
- `phone` - Phone number
- `age` - User age

### Medical Profile:
- `gender` - Gender selection
- `blood_type` - Blood type (A+, B+, O+, etc.)
- `address` - Home address
- `emergency_contact` - Emergency contact information
- `allergies` - Known allergies
- `medical_conditions` - Chronic conditions
- `profile_picture_url` - Profile image URL

### System Fields:
- `is_active` - Account status
- `created_at` - Registration date
- `updated_at` - Last profile update

## 🔗 API Endpoints for Profile Management

### Get User Profile
```http
GET /auth/profile/:email
```

### Update User Profile
```http
PUT /auth/update-profile
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "age": 30,
  "gender": "Male",
  "bloodType": "O+",
  "address": "123 Main St",
  "emergencyContact": "Jane Doe: +0987654321",
  "allergies": "Peanuts, Shellfish",
  "medicalConditions": "Hypertension"
}
```

### Get Dashboard Stats
```http
GET /dashboard/stats/:email
```

### Get Recent Activity
```http
GET /dashboard/activity/:email
```

## 📈 Dashboard Integration

The dashboard now supports:

### Real-time Statistics:
- **Upcoming Appointments** - Count from appointments table
- **Medical Records** - Total records count
- **Active Prescriptions** - Current prescriptions
- **Health Score** - Calculated based on profile completeness

### Profile Management:
- **View Profile** - Display all user information
- **Edit Profile** - Update personal and medical information
- **Medical Information** - Allergies, conditions, emergency contacts

## 🔧 Configuration

### Environment Variables Required:
```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
JWT_SECRET=your-jwt-secret
```

### Database Permissions:
Ensure your Supabase service key has permissions to:
- Create tables
- Insert/Update/Delete records
- Execute SQL functions

## 📝 Sample Data

The setup includes sample data for testing:

### Sample User:
- **Email**: harshitsethiya0102@gmail.com
- **Name**: harshit sethiya
- **Phone**: 7389698790
- **Age**: 18
- **Complete medical profile**

### Sample Records:
- 3 upcoming appointments
- 2 medical records
- 1 active prescription

## 🧪 Testing the Setup

### 1. Verify Database Tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 2. Check Sample Data:
```sql
SELECT * FROM users WHERE email = 'harshitsethiya0102@gmail.com';
```

### 3. Test API Endpoints:
```bash
# Get profile
curl http://localhost:3004/auth/profile/harshitsethiya0102@gmail.com

# Get stats
curl http://localhost:3004/dashboard/stats/harshitsethiya0102@gmail.com
```

## 🔄 Frontend Integration

### Dashboard JavaScript Updates:
The dashboard now calls real API endpoints:
- Profile data loaded from database
- Statistics calculated from real data
- Profile updates saved to database

### Profile Form Fields:
All form fields in the dashboard profile section are now connected to the database:
- Personal information
- Medical information
- Emergency contacts

## 🚨 Troubleshooting

### Common Issues:

1. **Tables not created**:
   - Check Supabase credentials
   - Verify service key permissions
   - Run setup script again

2. **Profile updates not saving**:
   - Check API endpoint responses
   - Verify database connection
   - Check browser console for errors

3. **Stats not loading**:
   - Ensure user exists in database
   - Check API endpoint logs
   - Verify table relationships

### Debug Commands:
```bash
# Check backend logs
cd C:/Users/Jainish\ pachori/backend
node final-production.js

# Test database connection
node verify-otp-records.mjs
```

## 📚 Next Steps

1. **Run the setup**: `node run-setup.js`
2. **Start the backend**: `node final-production.js`
3. **Test the dashboard**: Login and check profile section
4. **Customize fields**: Add more medical fields as needed
5. **Add real appointments**: Integrate with calendar system

## 🎯 Production Checklist

- [ ] Database tables created
- [ ] Sample data inserted
- [ ] API endpoints tested
- [ ] Frontend integration verified
- [ ] Profile updates working
- [ ] Dashboard stats displaying
- [ ] Error handling implemented
- [ ] Security measures in place

Your medical backend is now ready with complete profile management and database integration! 🎉
