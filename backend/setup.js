#!/usr/bin/env node

// setup.js - Interactive setup script for Medical Backend
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function generateJWTSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                🏥 Medical Backend Setup Wizard              ║
╠══════════════════════════════════════════════════════════════╣
║ This wizard will help you configure your backend server     ║
║ by creating a proper .env file with your credentials.       ║
╚══════════════════════════════════════════════════════════════╝
  `);

  try {
    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled. Your existing .env file is unchanged.');
        rl.close();
        return;
      }
    }

    console.log('\n📋 Please provide the following information:\n');

    // Server Configuration
    const port = await question('🌐 Server Port (default: 3001): ') || '3001';
    const nodeEnv = await question('🔧 Environment (development/production, default: development): ') || 'development';

    // JWT Secret
    console.log('\n🔐 JWT Secret (leave empty to auto-generate): ');
    let jwtSecret = await question('JWT Secret: ');
    if (!jwtSecret.trim()) {
      jwtSecret = generateJWTSecret();
      console.log(`✅ Generated JWT Secret: ${jwtSecret}`);
    }

    // Supabase Configuration
    console.log('\n🗄️  Supabase Configuration:');
    console.log('   Get these from: https://supabase.com/dashboard/project/[your-project]/settings/api');
    const supabaseUrl = await question('Supabase URL: ');
    const supabaseKey = await question('Supabase Service Role Key: ');

    // Email Configuration
    console.log('\n📧 Gmail SMTP Configuration:');
    console.log('   Note: You need to enable 2FA and generate an app password');
    console.log('   Guide: https://support.google.com/accounts/answer/185833');
    const smtpEmail = await question('Gmail Address: ');
    const smtpPass = await question('Gmail App Password (16 characters): ');

    // Optional Configuration
    console.log('\n⚙️  Optional Configuration (press Enter to skip):');
    const corsOrigin = await question('CORS Origin (default: http://localhost:8000): ') || 'http://localhost:8000';
    const fromName = await question('Email From Name (default: Medical App): ') || 'Medical App';

    // Create .env content
    const envContent = `# Medical Backend Configuration
# Generated on ${new Date().toISOString()}

# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# JWT Secret - Keep this secure!
JWT_SECRET=${jwtSecret}

# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_KEY=${supabaseKey}

# Email Configuration (Gmail SMTP)
SMTP_EMAIL=${smtpEmail}
SMTP_PASS=${smtpPass}

# Optional Configuration
FROM_NAME=${fromName}
FROM_EMAIL=${smtpEmail}
CORS_ORIGIN=${corsOrigin}

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging (optional)
LOG_TO_FILE=false
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);

    console.log(`
✅ Configuration saved to .env file!

🚀 Next Steps:

1. Install dependencies:
   npm install

2. Set up your Supabase database:
   - Go to your Supabase project dashboard
   - Open the SQL Editor
   - Run the SQL commands from README.md

3. Test your configuration:
   npm run test:db

4. Start the server:
   npm start

5. Test the API:
   curl http://localhost:${port}/health

📚 Documentation:
   - README.md - Complete setup guide
   - API_DOCUMENTATION.md - API reference

🔧 Troubleshooting:
   - Check the README.md troubleshooting section
   - Verify your Supabase and Gmail credentials
   - Check server logs for detailed error messages

🎉 Your Medical Backend is ready to go!
    `);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Setup cancelled by user.');
  rl.close();
  process.exit(0);
});

main().catch(console.error);
