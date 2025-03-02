/**
 * Simple logger utility with environment-specific behavior
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Format timestamp for logs
const getTimestamp = (): string => {
  return new Date().toISOString();
};

// Color codes for console output in development
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

export const logger = {
  info: (message: string, ...args: any[]) => {
    const timestamp = getTimestamp();
    if (isDevelopment) {
      console.log(
        `${colors.dim}${timestamp}${colors.reset} ${colors.green}[INFO]${colors.reset} ${message}`,
        ...args
      );
    } else {
      console.log(`${timestamp} [INFO] ${message}`, ...args);
    }
  },
  
  error: (message: string, error?: any) => {
    const timestamp = getTimestamp();
    const errorDetails = error instanceof Error 
      ? error.stack 
      : (error !== undefined ? error : '');
    
    if (isDevelopment) {
      console.error(
        `${colors.dim}${timestamp}${colors.reset} ${colors.red}[ERROR]${colors.reset} ${message}`,
        errorDetails
      );
    } else {
      console.error(`${timestamp} [ERROR] ${message}`, errorDetails);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    const timestamp = getTimestamp();
    if (isDevelopment) {
      console.warn(
        `${colors.dim}${timestamp}${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${message}`,
        ...args
      );
    } else {
      console.warn(`${timestamp} [WARN] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      const timestamp = getTimestamp();
      console.debug(
        `${colors.dim}${timestamp}${colors.reset} ${colors.blue}[DEBUG]${colors.reset} ${message}`,
        ...args
      );
    }
  },
};