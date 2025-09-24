// utils/logger.js
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  writeToFile(level, message, meta = {}) {
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const formattedMessage = this.formatMessage(level, message, meta);
    
    fs.appendFile(logFile, formattedMessage + '\n', (err) => {
      if (err) console.error('Failed to write to log file:', err);
    });
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    switch (level) {
      case 'ERROR':
        console.error('\x1b[31m%s\x1b[0m', formattedMessage);
        break;
      case 'WARN':
        console.warn('\x1b[33m%s\x1b[0m', formattedMessage);
        break;
      case 'INFO':
        console.info('\x1b[36m%s\x1b[0m', formattedMessage);
        break;
      case 'DEBUG':
        console.log('\x1b[37m%s\x1b[0m', formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // Write to file in production or if explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
      this.writeToFile(level, message, meta);
    }
  }

  error(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      this.log('ERROR', message, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      this.log('WARN', message, meta);
    }
  }

  info(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      this.log('INFO', message, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      this.log('DEBUG', message, meta);
    }
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Log request
      this.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? req.body : undefined
      });

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        
        this.log(level, `${req.method} ${req.path} - ${res.statusCode}`, {
          duration: `${duration}ms`,
          ip: req.ip,
          statusCode: res.statusCode
        });
      });

      next();
    };
  }

  // OTP logging (with security considerations)
  logOtp(email, otp, action = 'generated') {
    if (process.env.NODE_ENV === 'development') {
      this.debug(`OTP ${action} for ${email}: ${otp}`);
    } else {
      // In production, don't log the actual OTP
      this.info(`OTP ${action} for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
    }
  }

  // Database operation logging
  logDbOperation(operation, table, result, error = null) {
    if (error) {
      this.error(`Database ${operation} failed on ${table}`, {
        operation,
        table,
        error: error.message,
        code: error.code
      });
    } else {
      this.debug(`Database ${operation} successful on ${table}`, {
        operation,
        table,
        affected: result?.length || result?.count || 'unknown'
      });
    }
  }

  // Email logging
  logEmail(to, subject, status, messageId = null, error = null) {
    if (error) {
      this.error(`Email failed to ${to}`, {
        to: to.replace(/(.{2}).*(@.*)/, '$1***$2'),
        subject,
        error: error.message
      });
    } else {
      this.info(`Email sent to ${to.replace(/(.{2}).*(@.*)/, '$1***$2')}`, {
        subject,
        messageId,
        status
      });
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

// Export individual methods for convenience
export const { error, warn, info, debug, requestLogger, logOtp, logDbOperation, logEmail } = logger;
