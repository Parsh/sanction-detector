import winston from 'winston';
import config from '../config';

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'crypto-sanction-detector'
  },
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Add correlation ID to log context
export const createChildLogger = (correlationId: string) => {
  return logger.child({ correlationId });
};

export default logger;
