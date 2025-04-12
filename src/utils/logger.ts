/**
 * Centralized logger module for DevSparkAgent Playground
 * 
 * Provides structured logging with different log levels, timestamps,
 * and configurable transports.
 */

import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../types/core';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'devsparkagent-playground' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ]
});

// If not in production, also log to console with a simpler format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log a message at the 'info' level
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function info(message: string, meta: Record<string, any> = {}): void {
  logger.info(message, meta);
}

/**
 * Log a message at the 'warn' level
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function warn(message: string, meta: Record<string, any> = {}): void {
  logger.warn(message, meta);
}

/**
 * Log a message at the 'error' level
 * @param {string} message - Message to log
 * @param {Error|Object} error - Error object or additional metadata
 * @param {Object} meta - Additional metadata
 */
function error(message: string, error: Error | Record<string, any> = {}, meta: Record<string, any> = {}): void {
  // If error is an Error object, include it in the metadata
  if (error instanceof Error) {
    logger.error(message, { error: { message: error.message, stack: error.stack }, ...meta });
  } else {
    // If error is not an Error object, treat it as additional metadata
    logger.error(message, { ...error, ...meta });
  }
}

/**
 * Log a message at the 'debug' level
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function debug(message: string, meta: Record<string, any> = {}): void {
  logger.debug(message, meta);
}

/**
 * Create a child logger with additional default metadata
 * @param {Object} defaultMeta - Default metadata to include in all logs
 * @returns {Object} - Child logger instance
 */
function createChildLogger(defaultMeta: Record<string, any> = {}): Logger {
  const childLogger = logger.child(defaultMeta);
  
  return {
    info: (message: string, meta: Record<string, any> = {}) => childLogger.info(message, meta),
    warn: (message: string, meta: Record<string, any> = {}) => childLogger.warn(message, meta),
    error: (message: string, error: Error | Record<string, any> = {}, meta: Record<string, any> = {}) => {
      if (error instanceof Error) {
        childLogger.error(message, { error: { message: error.message, stack: error.stack }, ...meta });
      } else {
        childLogger.error(message, { ...error, ...meta });
      }
    },
    debug: (message: string, meta: Record<string, any> = {}) => childLogger.debug(message, meta),
    createChildLogger: (meta: Record<string, any> = {}) => createChildLogger({ ...defaultMeta, ...meta })
  };
}

const loggerExport: Logger & { winston: winston.Logger } = {
  info,
  warn,
  error,
  debug,
  createChildLogger,
  // Export the winston logger for advanced usage
  winston: logger
};

export default loggerExport;
