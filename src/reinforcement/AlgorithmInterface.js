/**
 * AlgorithmInterface.js
 * Defines the interface for reinforcement learning algorithms
 * 
 * This interface ensures all RL algorithms implement a consistent API
 * for training, prediction, and configuration.
 */

class AlgorithmInterface {
  /**
   * Create a new reinforcement learning algorithm instance
   * @param {Object} config - Algorithm configuration
   */
  constructor(config = {}) {
    if (this.constructor === AlgorithmInterface) {
      throw new Error('AlgorithmInterface is an abstract class and cannot be instantiated directly');
    }
    
    this.config = this._validateConfig(config);
    this.initialized = false;
    this.trainingStats = {
      episodes: 0,
      steps: 0,
      totalReward: 0,
      losses: []
    };
  }
  
  /**
   * Initialize the algorithm with environment information
   * @param {Object} envInfo - Environment information (state space, action space)
   * @returns {Boolean} - Success status
   */
  initialize(envInfo) {
    throw new Error('Method initialize() must be implemented by subclass');
  }
  
  /**
   * Select an action based on the current state
   * @param {Array|Object} state - Current environment state
   * @param {Boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {Number|Array} - Selected action
   */
  selectAction(state, explore = true) {
    throw new Error('Method selectAction() must be implemented by subclass');
  }
  
  /**
   * Update the algorithm based on experience
   * @param {Object} experience - Experience tuple (state, action, reward, nextState, done)
   * @returns {Object} - Update statistics
   */
  update(experience) {
    throw new Error('Method update() must be implemented by subclass');
  }
  
  /**
   * Perform batch update with multiple experiences
   * @param {Array<Object>} experiences - Array of experience tuples
   * @returns {Object} - Update statistics
   */
  batchUpdate(experiences) {
    throw new Error('Method batchUpdate() must be implemented by subclass');
  }
  
  /**
   * Save the algorithm state
   * @param {String} path - Path to save the model
   * @returns {Boolean} - Success status
   */
  save(path) {
    throw new Error('Method save() must be implemented by subclass');
  }
  
  /**
   * Load the algorithm state
   * @param {String} path - Path to load the model from
   * @returns {Boolean} - Success status
   */
  load(path) {
    throw new Error('Method load() must be implemented by subclass');
  }
  
  /**
   * Get algorithm configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Update algorithm configuration
   * @param {Object} config - New configuration parameters
   * @returns {Object} - Updated configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...this._validateConfig(config) };
    return this.getConfig();
  }
  
  /**
   * Get training statistics
   * @returns {Object} - Training statistics
   */
  getStats() {
    return { ...this.trainingStats };
  }
  
  /**
   * Reset the algorithm state
   * @returns {Boolean} - Success status
   */
  reset() {
    this.trainingStats = {
      episodes: 0,
      steps: 0,
      totalReward: 0,
      losses: []
    };
    return true;
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    // Base implementation returns the config as is
    // Subclasses should override this to provide validation
    return { ...config };
  }
  
  /**
   * Update training statistics
   * @param {Object} stats - Statistics to update
   * @protected
   */
  _updateStats(stats) {
    if (stats.steps) this.trainingStats.steps += stats.steps;
    if (stats.episodes) this.trainingStats.episodes += stats.episodes;
    if (stats.reward) this.trainingStats.totalReward += stats.reward;
    if (stats.loss !== undefined) this.trainingStats.losses.push(stats.loss);
    
    // Keep only the last 100 loss values
    if (this.trainingStats.losses.length > 100) {
      this.trainingStats.losses = this.trainingStats.losses.slice(-100);
    }
  }
}

module.exports = AlgorithmInterface;
