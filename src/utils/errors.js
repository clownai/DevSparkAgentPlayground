/**
 * Error handling module for DevSparkAgent Playground
 * 
 * Provides a centralized error handling system with base error classes,
 * domain-specific error classes, and error handling utilities.
 */

const logger = require('./logger');

/**
 * Base error class for all application errors
 * Extends the native Error class with additional properties
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.code - Error code
   * @param {number} options.statusCode - HTTP status code (for API errors)
   * @param {boolean} options.isOperational - Whether this is an operational error
   * @param {Error} options.cause - Original error that caused this error
   * @param {Object} options.context - Additional context for the error
   */
  constructor(message, options = {}) {
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
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
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
 * Validation error class for input validation errors
 */
class ValidationError extends AppError {
  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {Object} options.validationErrors - Validation error details
   */
  constructor(message, options = {}) {
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
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Not found error class for resource not found errors
 */
class NotFoundError extends AppError {
  /**
   * Create a new NotFoundError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.resource - Resource type that was not found
   * @param {string} options.id - ID of the resource that was not found
   */
  constructor(message, options = {}) {
    super(message || 'Resource not found', {
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
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      resource: this.resource,
      id: this.id
    };
  }
}

/**
 * Authorization error class for permission and access errors
 */
class AuthorizationError extends AppError {
  /**
   * Create a new AuthorizationError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.requiredPermission - Permission that was required
   * @param {string} options.userId - ID of the user who was denied access
   */
  constructor(message, options = {}) {
    super(message || 'Unauthorized access', {
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
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
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
class AuthenticationError extends AppError {
  /**
   * Create a new AuthenticationError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   */
  constructor(message, options = {}) {
    super(message || 'Authentication failed', {
      code: 'UNAUTHENTICATED',
      statusCode: 401,
      isOperational: true,
      ...options
    });
  }
}

/**
 * Configuration error class for system configuration errors
 */
class ConfigurationError extends AppError {
  /**
   * Create a new ConfigurationError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.configKey - Configuration key that caused the error
   */
  constructor(message, options = {}) {
    super(message || 'Invalid configuration', {
      code: 'CONFIG_ERROR',
      statusCode: 500,
      isOperational: true,
      ...options
    });
    
    this.configKey = options.configKey;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      configKey: this.configKey
    };
  }
}

/**
 * External service error class for errors from external dependencies
 */
class ExternalServiceError extends AppError {
  /**
   * Create a new ExternalServiceError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.service - Name of the external service
   * @param {string} options.endpoint - Endpoint that was called
   * @param {number} options.statusCode - Status code returned by the service
   */
  constructor(message, options = {}) {
    super(message || 'External service error', {
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
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
      endpoint: this.endpoint
    };
  }
}

/**
 * Database error class for database-related errors
 */
class DatabaseError extends AppError {
  /**
   * Create a new DatabaseError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.operation - Database operation that failed
   * @param {string} options.collection - Database collection/table
   */
  constructor(message, options = {}) {
    super(message || 'Database operation failed', {
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
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
      collection: this.collection
    };
  }
}

/**
 * Rate limit error class for rate limiting errors
 */
class RateLimitError extends AppError {
  /**
   * Create a new RateLimitError
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {number} options.retryAfter - Seconds until retry is allowed
   */
  constructor(message, options = {}) {
    super(message || 'Rate limit exceeded', {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      isOperational: true,
      ...options
    });
    
    this.retryAfter = options.retryAfter;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

/**
 * Centralized error handler
 * Handles errors based on their type and provides appropriate responses
 */
class ErrorHandler {
  /**
   * Handle an error
   * @param {Error} error - Error to handle
   * @param {Object} options - Handler options
   * @param {boolean} options.logError - Whether to log the error
   * @param {Function} options.responseCallback - Callback for sending response (for API errors)
   * @returns {Object} Handled error result
   */
  static handle(error, options = {}) {
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
   * @param {Error} error - Error to normalize
   * @returns {AppError} Normalized AppError
   */
  static normalizeError(error) {
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
  static logError(error) {
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
  static sendErrorResponse(error, responseCallback) {
    const response = {
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    };
    
    // Add validation errors if present
    if (error instanceof ValidationError && error.validationErrors) {
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
   * @returns {Object} Safe error response
   */
  static createSafeErrorResponse(error) {
    const response = {
      success: false,
      error: {
        code: error.code,
        message: error.isOperational ? error.message : 'Internal server error'
      }
    };
    
    // Add validation errors if present
    if (error instanceof ValidationError && error.validationErrors) {
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

// Export all error classes and the error handler
module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  AuthenticationError,
  ConfigurationError,
  ExternalServiceError,
  DatabaseError,
  RateLimitError,
  ErrorHandler
};
