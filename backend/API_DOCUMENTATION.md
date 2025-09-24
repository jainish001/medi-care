# Medical Backend API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
This API uses OTP-based authentication. No API keys or tokens are required for most endpoints.

## Rate Limiting
- General API: 100 requests per 15 minutes per IP
- OTP requests: 5 requests per 15 minutes per IP
- Authentication: 10 requests per 15 minutes per IP
- Signup: 3 requests per hour per IP

## Response Format
All responses follow this structure:
```json
{
  "status": "success|error",
  "message": "Human readable message",
  "data": {}, // Optional: response data
  "error": "error_code", // Only present on errors
  "details": [] // Optional: validation errors
}
```

---

## Endpoints

### 1. Health Check
Check if the server is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3001/health
```

---

### 2. Request OTP
Request an OTP to be sent to the specified email address.

**Endpoint:** `POST /auth/request-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

**Response (Error):**
```json
{
  "error": "validation_error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

**Possible Errors:**
- `validation_error`: Invalid email format
- `database_error`: Failed to store OTP
- `email_error`: Failed to send email
- `rate_limit_exceeded`: Too many OTP requests

**cURL Example:**
```bash
curl -X POST http://localhost:3001/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

### 3. Verify OTP
Verify the OTP sent to the email address.

**Endpoint:** `POST /auth/verify-otp`

**Request Body:**
```json
{
  "contact": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "OTP verified successfully"
}
```

**Response (Error):**
```json
{
  "error": "invalid_otp",
  "message": "Invalid OTP",
  "attemptsRemaining": 3
}
```

**Possible Errors:**
- `validation_error`: Invalid email or OTP format
- `otp_not_found`: No OTP found for this email
- `otp_already_used`: OTP has already been used
- `otp_expired`: OTP has expired (5-minute limit)
- `too_many_attempts`: Exceeded maximum attempts (5)
- `invalid_otp`: Incorrect OTP code

**cURL Example:**
```bash
curl -X POST http://localhost:3001/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"contact":"test@example.com","otp":"123456"}'
```

---

### 4. User Signup
Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "age": 30
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "User created successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "age": 30,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "user_exists",
  "message": "User with this email already exists"
}
```

**Validation Rules:**
- `email`: Valid email format, required
- `name`: 2-100 characters, required
- `phone`: Valid phone number, optional
- `age`: Integer between 1-150, optional

**Possible Errors:**
- `validation_error`: Invalid input data
- `user_exists`: Email already registered
- `database_error`: Failed to create user

**cURL Example:**
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "name":"John Doe",
    "phone":"+1234567890",
    "age":30
  }'
```

---

### 5. Dashboard Stats
Get dashboard statistics (demo data).

**Endpoint:** `GET /dashboard/stats`

**Response:**
```json
{
  "users": 1234,
  "sales": 5678,
  "appointmentsToday": 8,
  "activeUsers": 112,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3001/dashboard/stats
```

---

### 6. User Profile
Get user profile information by email.

**Endpoint:** `GET /user/profile/:email`

**Parameters:**
- `email`: User's email address (URL encoded)

**Response (Success):**
```json
{
  "status": "success",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "age": 30,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "user_not_found",
  "message": "User not found"
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3001/user/profile/user%40example.com"
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `validation_error` | Invalid input data |
| `email_required` | Email field is required |
| `contact_and_otp_required` | Both contact and OTP are required |
| `otp_not_found` | No OTP record found |
| `otp_already_used` | OTP has been consumed |
| `otp_expired` | OTP has expired |
| `invalid_otp` | Incorrect OTP code |
| `too_many_attempts` | Exceeded maximum OTP attempts |
| `user_exists` | User already registered |
| `user_not_found` | User does not exist |
| `database_error` | Database operation failed |
| `email_error` | Email sending failed |
| `internal_error` | Server error |
| `rate_limit_exceeded` | Too many requests |
| `not_found` | Endpoint not found |

---

## Testing Workflow

### Complete Registration Flow
1. **Request OTP:**
   ```bash
   curl -X POST http://localhost:3001/auth/request-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Check email for OTP code**

3. **Verify OTP:**
   ```bash
   curl -X POST http://localhost:3001/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"contact":"test@example.com","otp":"123456"}'
   ```

4. **Create User Account:**
   ```bash
   curl -X POST http://localhost:3001/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email":"test@example.com",
       "name":"Test User",
       "phone":"+1234567890",
       "age":25
     }'
   ```

5. **Get User Profile:**
   ```bash
   curl -X GET "http://localhost:3001/user/profile/test%40example.com"
   ```

---

## Postman Collection

You can import this collection into Postman for easier testing:

```json
{
  "info": {
    "name": "Medical Backend API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/health",
          "host": ["{{baseUrl}}"],
          "path": ["health"]
        }
      }
    },
    {
      "name": "Request OTP",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"{{testEmail}}\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/request-otp",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "request-otp"]
        }
      }
    },
    {
      "name": "Verify OTP",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"contact\": \"{{testEmail}}\",\n  \"otp\": \"{{otpCode}}\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/verify-otp",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "verify-otp"]
        }
      }
    },
    {
      "name": "User Signup",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"{{testEmail}}\",\n  \"name\": \"Test User\",\n  \"phone\": \"+1234567890\",\n  \"age\": 25\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/signup",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "signup"]
        }
      }
    },
    {
      "name": "Dashboard Stats",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/dashboard/stats",
          "host": ["{{baseUrl}}"],
          "path": ["dashboard", "stats"]
        }
      }
    },
    {
      "name": "User Profile",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/user/profile/{{testEmail}}",
          "host": ["{{baseUrl}}"],
          "path": ["user", "profile", "{{testEmail}}"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "testEmail",
      "value": "test@example.com"
    },
    {
      "key": "otpCode",
      "value": "123456"
    }
  ]
}
```

---

## Development Notes

- OTP codes are logged to console in development mode
- All requests are logged with timestamps
- Rate limiting is enforced per IP address
- Input validation is performed on all endpoints
- Database operations are logged for debugging
- Email sending status is tracked and logged
