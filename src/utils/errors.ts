/**
 * Error handling module for DevSparkAgent Playground
 * 
 * Provides a centralized error handling system with base error classes,
 * domain-specific error classes, and error handling utilities.
 */

import logger from './logger';

/**
 * Options for AppError constructor
 */
export interface AppErrorOptions {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  cause?: Error;
  context?: Record<string, any>;
  [key: string]: any;
}

/**
 * Base error class for all application errors
 * Extends the native Error class with additional properties
 */
export class AppError extends Error {
  name: string;
  code: string;
  statusCode: number;
  isOperational: boolean;
  cause?: Error;
  context: Record<string, any>;
  timestamp: Date;

  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {AppErrorOptions} options - Additional options
   */
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = options.code || 'INTERNAL_ERROR';
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.cause = options.cause;
    this.context = options.context || {};
    this.timestamp = new Date();
    
    // Capture stack trace, excluding the constructor call from the stack
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Options for ValidationError constructor
 */
export interface ValidationErrorOptions extends AppErrorOptions {
  validationErrors?: Record<string, string>;
}

/**
 * Validation error class for input validation errors
 */
export class ValidationError extends AppError {
  validationErrors: Record<string, string>;

  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {ValidationErrorOptions} options - Additional options
   */
  constructor(message: string, options: ValidationErrorOptions = {}) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      isOperational: true,
      ...options
    });
    
    this.validationErrors = options.validationErrors || {};
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Options for NotFoundError constructor
 */
export interface NotFoundErrorOptions extends AppErrorOptions {
  resource?: string;
  id?: string;
}

/**
 * Not found error class for resource not found errors
 */
export class NotFoundError extends AppError {
  resource?: string;
  id?: string;

  /**
   * Create a new NotFoundError
   * @param {string} message - Error message
   * @param {NotFoundErrorOptions} options - Additional options
   */
  constructor(message: string = 'Resource not found', options: NotFoundErrorOptions = {}) {
    super(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
      isOperational: true,
      ...options
    });
    
    this.resource = options.resource;
    this.id = options.id;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      resource: this.resource,
      id: this.id
    };
  }
}

/**
 * Options for AuthorizationError constructor
 */
export interface AuthorizationErrorOptions extends AppErrorOptions {
  requiredPermission?: string;
  userId?: string;
}

/**
 * Authorization error class for permission and access errors
 */
export class AuthorizationError extends AppError {
  requiredPermission?: string;
  userId?: string;

  /**
   * Create a new AuthorizationError
   * @param {string} message - Error message
   * @param {AuthorizationErrorOptions} options - Additional options
   */
  constructor(message: string = 'Unauthorized access', options: AuthorizationErrorOptions = {}) {
    super(message, {
      code: 'UNAUTHORIZED',
      statusCode: 403,
      isOperational: true,
      ...options
    });
    
    this.requiredPermission = options.requiredPermission;
    this.userId = options.userId;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      requiredPermission: this.requiredPermission,
      userId: this.userId
    };
  }
}

/**
 * Authentication error class for login and identity errors
 */
export class AuthenticationError extends AppError {
  /**
   * Create a new AuthenticationError
   * @param {string} message - Error message
   * @param {AppErrorOptions} options - Additional options
   */
  constructor(message: string = 'Authentication failed', options: AppErrorOptions = {}) {
    super(message, {
      code: 'UNAUTHENTICATED',
      statusCode: 401,
      isOperational: true,
      ...options
    });
  }
}

/**
 * Options for ConfigurationError constructor
 */
export interface ConfigurationErrorOptions extends AppErrorOptions {
  configKey?: string;
}

/**
 * Configuration error class for system configuration errors
 */
export class ConfigurationError extends AppError {
  configKey?: string;

  /**
   * Create a new ConfigurationError
   * @param {string} message - Error message
   * @param {ConfigurationErrorOptions} options - Additional options
   */
  constructor(message: string = 'Invalid configuration', options: ConfigurationErrorOptions = {}) {
    super(message, {
      code: 'CONFIG_ERROR',
      statusCode: 500,
      isOperational: true,
      ...options
    });
    
    this.configKey = options.configKey;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      configKey: this.configKey
    };
  }
}

/**
 * Options for ExternalServiceError constructor
 */
export interface ExternalServiceErrorOptions extends AppErrorOptions {
  service?: string;
  endpoint?: string;
  statusCode?: number;
}

/**
 * External service error class for errors from external dependencies
 */
export class ExternalServiceError extends AppError {
  service?: string;
  endpoint?: string;

  /**
   * Create a new ExternalServiceError
   * @param {string} message - Error message
   * @param {ExternalServiceErrorOptions} options - Additional options
   */
  constructor(message: string = 'External service error', options: ExternalServiceErrorOptions = {}) {
    super(message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: options.statusCode || 502,
      isOperational: true,
      ...options
    });
    
    this.service = options.service;
    this.endpoint = options.endpoint;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      service: this.service,
      endpoint: this.endpoint
    };
  }
}

/**
 * Options for DatabaseError constructor
 */
export interface DatabaseErrorOptions extends AppErrorOptions {
  operation?: string;
  collection?: string;
}

/**
 * Database error class for database-related errors
 */
export class DatabaseError extends AppError {
  operation?: string;
  collection?: string;

  /**
   * Create a new DatabaseError
   * @param {string} message - Error message
   * @param {DatabaseErrorOptions} options - Additional options
   */
  constructor(message: string = 'Database operation failed', options: DatabaseErrorOptions = {}) {
    super(message, {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      isOperational: true,
      ...options
    });
    
    this.operation = options.operation;
    this.collection = options.collection;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      collection: this.collection
    };
  }
}

/**
 * Options for RateLimitError constructor
 */
export interface RateLimitErrorOptions extends AppErrorOptions {
  retryAfter?: number;
}

/**
 * Rate limit error class for rate limiting errors
 */
export class RateLimitError extends AppError {
  retryAfter?: number;

  /**
   * Create a new RateLimitError
   * @param {string} message - Error message
   * @param {RateLimitErrorOptions} options - Additional options
   */
  constructor(message: string = 'Rate limit exceeded', options: RateLimitErrorOptions = {}) {
    super(message, {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      isOperational: true,
      ...options
    });
    
    this.retryAfter = options.retryAfter;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

/**
 * Interface for error response
 */
export interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    validationErrors?: Record<string, string>;
    resource?: string;
    id?: string;
    [key: string]: any;
  };
}

/**
 * Options for error handler
 */
export interface ErrorHandlerOptions {
  logError?: boolean;
  responseCallback?: (statusCode: number, response: Record<string, any>) => void;
}

/**
 * Centralized error handler
 * Handles errors based on their type and provides appropriate responses
 */
export class ErrorHandler {
  /**
   * Handle an error
   * @param {Error | string | any} error - Error to handle
   * @param {ErrorHandlerOptions} options - Handler options
   * @returns {AppError} Handled error result
   */
  static handle(error: Error | string | any, options: ErrorHandlerOptions = {}): AppError {
    const { logError = true, responseCallback } = options;
    
    // Convert to AppError if it's a native Error
    const appError = ErrorHandler.normalizeError(error);
    
    // Log the error if requested
    if (logError) {
      ErrorHandler.logError(appError);
    }
    
    // Send response if callback provided (for API errors)
    if (responseCallback && typeof responseCallback === 'function') {
      ErrorHandler.sendErrorResponse(appError, responseCallback);
    }
    
    // Return the normalized error
    return appError;
  }
  
  /**
   * Convert any error to an AppError
   * @param {Error | string | any} error - Error to normalize
   * @returns {AppError} Normalized AppError
   */
  static normalizeError(error: Error | string | any): AppError {
    // If it's already an AppError, return it
    if (error instanceof AppError) {
      return error;
    }
    
    // If it's a native Error, convert it to an AppError
    if (error instanceof Error) {
      return new AppError(error.message, {
        cause: error,
        isOperational: false
      });
    }
    
    // If it's a string, create an AppError with the string as message
    if (typeof error === 'string') {
      return new AppError(error);
    }
    
    // If it's an object, create an AppError with the object as context
    if (typeof error === 'object') {
      return new AppError('Unknown error', {
        context: error
      });
    }
    
    // Default case
    return new AppError('Unknown error');
  }
  
  /**
   * Log an error using the logger
   * @param {AppError} error - Error to log
   */
  static logError(error: AppError): void {
    // Log operational errors as warnings, programming errors as errors
    if (error.isOperational) {
      logger.warn(`Operational error: ${error.message}`, error.toJSON());
    } else {
      logger.error(`Programming error: ${error.message}`, error.toJSON());
    }
  }
  
  /**
   * Send an error response (for API errors)
   * @param {AppError} error - Error to send
   * @param {Function} responseCallback - Callback for sending response
   */
  static sendErrorResponse(
    error: AppError, 
    responseCallback: (statusCode: number, response: Record<string, any>) => void
  ): void {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    };
    
    // Add validation errors if present
    if (error instanceof ValidationError) {
      response.error.validationErrors = error.validationErrors;
    }
    
    // Add additional context for specific error types
    if (error instanceof NotFoundError) {
      response.error.resource = error.resource;
      response.error.id = error.id;
    }
    
    // Call the response callback with the status code and response
    responseCallback(error.statusCode, response);
  }
  
  /**
   * Create a safe error response for clients (removes sensitive information)
   * @param {AppError} error - Error to create response for
   * @returns {ErrorResponse} Safe error response
   */
  static createSafeErrorResponse(error: AppError): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.isOperational ? error.message : 'Internal server error'
      }
    };
    
    // Add validation errors if present
    if (error instanceof ValidationError) {
      response.error.validationErrors = error.validationErrors;
    }
    
    // Add additional context for specific error types
    if (error instanceof NotFoundError) {
      response.error.resource = error.resource;
      response.error.id = error.id;
    }
    
    return response;
  }
}

// Export default ErrorHandler for convenience
export default ErrorHandler;
