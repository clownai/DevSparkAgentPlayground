/**
 * ReinforcementConfig.ts
 * Configuration utilities for reinforcement learning algorithms
 */

import { AlgorithmConfig } from '../types/reinforcement';

// Define algorithm-specific configuration interfaces
export interface PPOConfig extends AlgorithmConfig {
  learningRate: number;
  gamma: number;
  epsilon: number;
  epochs: number;
  batchSize: number;
  entropyCoef: number;
  valueCoef: number;
  maxGradNorm: number;
  useCritic: boolean;
  useGAE: boolean;
  gaeParam: number;
  clipGradient: boolean;
  normalizeAdvantage: boolean;
  sharedNetwork: boolean;
}

export interface SACConfig extends AlgorithmConfig {
  learningRate: number;
  gamma: number;
  tau: number;
  alpha: number;
  autoAlpha: boolean;
  targetUpdateInterval: number;
  batchSize: number;
  bufferSize: number;
  hiddenSize: number[];
  activationFn: string;
  optimizerType: string;
}

export interface DQNConfig extends AlgorithmConfig {
  learningRate: number;
  gamma: number;
  epsilon: number;
  epsilonMin: number;
  epsilonDecay: number;
  targetUpdateFreq: number;
  batchSize: number;
  bufferSize: number;
  hiddenSize: number[];
  activationFn: string;
  prioritizedReplay: boolean;
  doubleDQN: boolean;
}

// Union type for all algorithm configs
export type AlgorithmSpecificConfig = PPOConfig | SACConfig | DQNConfig;

// Parameter description interface
export interface ParamDescription {
  name: string;
  description: string;
  defaultValue: any;
  type: string;
}

class ReinforcementConfig {
  /**
   * Default configurations for different algorithms
   */
  static defaults: Record<string, AlgorithmSpecificConfig> = {
    ppo: {
      learningRate: 0.0003,
      gamma: 0.99,
      epsilon: 0.2,
      epochs: 10,
      batchSize: 64,
      entropyCoef: 0.01,
      valueCoef: 0.5,
      maxGradNorm: 0.5,
      useCritic: true,
      useGAE: true,
      gaeParam: 0.95,
      clipGradient: true,
      normalizeAdvantage: true,
      sharedNetwork: false
    },
    
    sac: {
      learningRate: 0.0003,
      gamma: 0.99,
      tau: 0.005,
      alpha: 0.2,
      autoAlpha: true,
      targetUpdateInterval: 1,
      batchSize: 256,
      bufferSize: 1000000,
      hiddenSize: [256, 256],
      activationFn: 'relu',
      optimizerType: 'adam'
    },
    
    dqn: {
      learningRate: 0.001,
      gamma: 0.99,
      epsilon: 1.0,
      epsilonMin: 0.01,
      epsilonDecay: 0.995,
      targetUpdateFreq: 10,
      batchSize: 32,
      bufferSize: 10000,
      hiddenSize: [64, 64],
      activationFn: 'relu',
      prioritizedReplay: false,
      doubleDQN: true
    }
  };
  
  /**
   * Validate and merge configuration with defaults
   * @param {string} algorithm - Algorithm name
   * @param {Partial<AlgorithmSpecificConfig>} config - User configuration
   * @returns {AlgorithmSpecificConfig} - Merged configuration
   */
  static getConfig(algorithm: string, config: Partial<AlgorithmSpecificConfig> = {}): AlgorithmSpecificConfig {
    const lowerAlgo = algorithm.toLowerCase();
    
    if (!this.defaults[lowerAlgo]) {
      throw new Error(`Unknown algorithm: ${algorithm}. Available algorithms: ${Object.keys(this.defaults).join(', ')}`);
    }
    
    return { ...this.defaults[lowerAlgo], ...config };
  }
  
  /**
   * Validate specific configuration parameter
   * @param {string} algorithm - Algorithm name
   * @param {string} param - Parameter name
   * @param {any} value - Parameter value
   * @returns {boolean} - Validation result
   */
  static validateParam(algorithm: string, param: string, value: any): boolean {
    const lowerAlgo = algorithm.toLowerCase();
    
    if (!this.defaults[lowerAlgo]) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }
    
    if (!(param in this.defaults[lowerAlgo])) {
      throw new Error(`Unknown parameter: ${param} for algorithm: ${algorithm}`);
    }
    
    // Type-specific validation
    const defaultValue = this.defaults[lowerAlgo][param as keyof AlgorithmSpecificConfig];
    
    switch (typeof defaultValue) {
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'string':
        return typeof value === 'string';
      case 'object':
        if (Array.isArray(defaultValue)) {
          return Array.isArray(value);
        }
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }
  
  /**
   * Get parameter description
   * @param {string} algorithm - Algorithm name
   * @param {string} param - Parameter name
   * @returns {ParamDescription} - Parameter description
   */
  static getParamDescription(algorithm: string, param: string): ParamDescription {
    const descriptions: Record<string, Record<string, string>> = {
      ppo: {
        learningRate: 'Learning rate for the optimizer',
        gamma: 'Discount factor for future rewards',
        epsilon: 'Clipping parameter for PPO',
        epochs: 'Number of epochs to train on each batch',
        batchSize: 'Batch size for training',
        entropyCoef: 'Entropy coefficient for exploration',
        valueCoef: 'Value function coefficient',
        maxGradNorm: 'Maximum norm for gradient clipping',
        useCritic: 'Whether to use a critic network',
        useGAE: 'Whether to use Generalized Advantage Estimation',
        gaeParam: 'GAE parameter (lambda) for advantage estimation',
        clipGradient: 'Whether to clip gradients',
        normalizeAdvantage: 'Whether to normalize advantages',
        sharedNetwork: 'Whether to use a shared network for actor and critic'
      },
      
      sac: {
        learningRate: 'Learning rate for the optimizer',
        gamma: 'Discount factor for future rewards',
        tau: 'Target network update rate',
        alpha: 'Temperature parameter for entropy regularization',
        autoAlpha: 'Whether to automatically adjust alpha',
        targetUpdateInterval: 'Interval for updating target networks',
        batchSize: 'Batch size for training',
        bufferSize: 'Size of the replay buffer',
        hiddenSize: 'Sizes of hidden layers',
        activationFn: 'Activation function for hidden layers',
        optimizerType: 'Type of optimizer to use'
      },
      
      dqn: {
        learningRate: 'Learning rate for the optimizer',
        gamma: 'Discount factor for future rewards',
        epsilon: 'Initial exploration rate',
        epsilonMin: 'Minimum exploration rate',
        epsilonDecay: 'Decay rate for epsilon',
        targetUpdateFreq: 'Frequency of target network updates',
        batchSize: 'Batch size for training',
        bufferSize: 'Size of the replay buffer',
        hiddenSize: 'Sizes of hidden layers',
        activationFn: 'Activation function for hidden layers',
        prioritizedReplay: 'Whether to use prioritized experience replay',
        doubleDQN: 'Whether to use double DQN'
      }
    };
    
    const lowerAlgo = algorithm.toLowerCase();
    
    if (!descriptions[lowerAlgo]) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }
    
    if (!descriptions[lowerAlgo][param]) {
      throw new Error(`No description available for parameter: ${param} in algorithm: ${algorithm}`);
    }
    
    return {
      name: param,
      description: descriptions[lowerAlgo][param],
      defaultValue: this.defaults[lowerAlgo][param as keyof AlgorithmSpecificConfig],
      type: typeof this.defaults[lowerAlgo][param as keyof AlgorithmSpecificConfig]
    };
  }
  
  /**
   * Get all parameter descriptions for an algorithm
   * @param {string} algorithm - Algorithm name
   * @returns {ParamDescription[]} - Parameter descriptions
   */
  static getAllParamDescriptions(algorithm: string): ParamDescription[] {
    const lowerAlgo = algorithm.toLowerCase();
    
    if (!this.defaults[lowerAlgo]) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }
    
    return Object.keys(this.defaults[lowerAlgo]).map(param => 
      this.getParamDescription(lowerAlgo, param)
    );
  }
  
  /**
   * Get available algorithms
   * @returns {string[]} - Available algorithms
   */
  static getAvailableAlgorithms(): string[] {
    return Object.keys(this.defaults);
  }
}

export default ReinforcementConfig;
