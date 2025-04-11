/**
 * ReinforcementConfig.js
 * Configuration utilities for reinforcement learning algorithms
 */

class ReinforcementConfig {
  /**
   * Default configurations for different algorithms
   */
  static defaults = {
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
   * @param {String} algorithm - Algorithm name
   * @param {Object} config - User configuration
   * @returns {Object} - Merged configuration
   */
  static getConfig(algorithm, config = {}) {
    const lowerAlgo = algorithm.toLowerCase();
    
    if (!this.defaults[lowerAlgo]) {
      throw new Error(`Unknown algorithm: ${algorithm}. Available algorithms: ${Object.keys(this.defaults).join(', ')}`);
    }
    
    return { ...this.defaults[lowerAlgo], ...config };
  }
  
  /**
   * Validate specific configuration parameter
   * @param {String} algorithm - Algorithm name
   * @param {String} param - Parameter name
   * @param {*} value - Parameter value
   * @returns {Boolean} - Validation result
   */
  static validateParam(algorithm, param, value) {
    const lowerAlgo = algorithm.toLowerCase();
    
    if (!this.defaults[lowerAlgo]) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }
    
    if (!(param in this.defaults[lowerAlgo])) {
      throw new Error(`Unknown parameter: ${param} for algorithm: ${algorithm}`);
    }
    
    // Type-specific validation
    const defaultValue = this.defaults[lowerAlgo][param];
    
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
   * @param {String} algorithm - Algorithm name
   * @param {String} param - Parameter name
   * @returns {Object} - Parameter description
   */
  static getParamDescription(algorithm, param) {
    const descriptions = {
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
      defaultValue: this.defaults[lowerAlgo][param],
      type: typeof this.defaults[lowerAlgo][param]
    };
  }
  
  /**
   * Get all parameter descriptions for an algorithm
   * @param {String} algorithm - Algorithm name
   * @returns {Array<Object>} - Parameter descriptions
   */
  static getAllParamDescriptions(algorithm) {
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
   * @returns {Array<String>} - Available algorithms
   */
  static getAvailableAlgorithms() {
    return Object.keys(this.defaults);
  }
}

module.exports = ReinforcementConfig;
