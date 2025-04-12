/**
 * Domain-specific error classes for the reinforcement learning module
 */

import { AppError, AppErrorOptions } from '../utils/errors';

/**
 * Options for ReinforcementLearningError constructor
 */
export interface ReinforcementLearningErrorOptions extends AppErrorOptions {
  algorithm?: string;
  [key: string]: any;
}

/**
 * Base class for reinforcement learning errors
 */
export class ReinforcementLearningError extends AppError {
  /**
   * Create a new ReinforcementLearningError
   * @param {string} message - Error message
   * @param {ReinforcementLearningErrorOptions} options - Additional options
   */
  constructor(message: string, options: ReinforcementLearningErrorOptions = {}) {
    super(message, {
      code: 'RL_ERROR',
      ...options
    });
  }
}

/**
 * Options for AlgorithmInitializationError constructor
 */
export interface AlgorithmInitializationErrorOptions extends ReinforcementLearningErrorOptions {
  algorithm?: string;
  config?: Record<string, any>;
}

/**
 * Error for algorithm initialization failures
 */
export class AlgorithmInitializationError extends ReinforcementLearningError {
  algorithm?: string;
  config?: Record<string, any>;

  /**
   * Create a new AlgorithmInitializationError
   * @param {string} message - Error message
   * @param {AlgorithmInitializationErrorOptions} options - Additional options
   */
  constructor(message: string = 'Failed to initialize reinforcement learning algorithm', options: AlgorithmInitializationErrorOptions = {}) {
    super(message, {
      code: 'RL_INIT_ERROR',
      ...options
    });
    
    this.algorithm = options.algorithm;
    this.config = options.config;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      algorithm: this.algorithm,
      config: this.config
    };
  }
}

/**
 * Options for EnvironmentCompatibilityError constructor
 */
export interface EnvironmentCompatibilityErrorOptions extends ReinforcementLearningErrorOptions {
  algorithm?: string;
  environment?: string;
  reason?: string;
}

/**
 * Error for environment compatibility issues
 */
export class EnvironmentCompatibilityError extends ReinforcementLearningError {
  algorithm?: string;
  environment?: string;
  reason?: string;

  /**
   * Create a new EnvironmentCompatibilityError
   * @param {string} message - Error message
   * @param {EnvironmentCompatibilityErrorOptions} options - Additional options
   */
  constructor(message: string = 'Environment is not compatible with algorithm', options: EnvironmentCompatibilityErrorOptions = {}) {
    super(message, {
      code: 'RL_ENV_COMPATIBILITY_ERROR',
      ...options
    });
    
    this.algorithm = options.algorithm;
    this.environment = options.environment;
    this.reason = options.reason;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      algorithm: this.algorithm,
      environment: this.environment,
      reason: this.reason
    };
  }
}

/**
 * Options for ModelPersistenceError constructor
 */
export interface ModelPersistenceErrorOptions extends ReinforcementLearningErrorOptions {
  operation?: string;
  path?: string;
}

/**
 * Error for model saving/loading failures
 */
export class ModelPersistenceError extends ReinforcementLearningError {
  operation?: string;
  path?: string;

  /**
   * Create a new ModelPersistenceError
   * @param {string} message - Error message
   * @param {ModelPersistenceErrorOptions} options - Additional options
   */
  constructor(message: string = 'Failed to save or load model', options: ModelPersistenceErrorOptions = {}) {
    super(message, {
      code: 'RL_MODEL_PERSISTENCE_ERROR',
      ...options
    });
    
    this.operation = options.operation;
    this.path = options.path;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      path: this.path
    };
  }
}

/**
 * Options for TrainingError constructor
 */
export interface TrainingErrorOptions extends ReinforcementLearningErrorOptions {
  algorithm?: string;
  episode?: number;
  step?: number;
}

/**
 * Error for training process failures
 */
export class TrainingError extends ReinforcementLearningError {
  algorithm?: string;
  episode?: number;
  step?: number;

  /**
   * Create a new TrainingError
   * @param {string} message - Error message
   * @param {TrainingErrorOptions} options - Additional options
   */
  constructor(message: string = 'Error during training process', options: TrainingErrorOptions = {}) {
    super(message, {
      code: 'RL_TRAINING_ERROR',
      ...options
    });
    
    this.algorithm = options.algorithm;
    this.episode = options.episode;
    this.step = options.step;
  }
  
  /**
   * Convert error to a plain object for logging or serialization
   * @returns {Record<string, any>} Plain object representation of the error
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      algorithm: this.algorithm,
      episode: this.episode,
      step: this.step
    };
  }
}

// Export all error classes
export default {
  ReinforcementLearningError,
  AlgorithmInitializationError,
  EnvironmentCompatibilityError,
  ModelPersistenceError,
  TrainingError
};
