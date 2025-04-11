/**
 * BaseEnvironment.js
 * Base class for all environment types
 * 
 * This class defines the common interface and functionality
 * that all environment implementations should provide.
 */

class BaseEnvironment {
  /**
   * Create a new environment
   * @param {Object} config - Environment configuration
   */
  constructor(config = {}) {
    if (this.constructor === BaseEnvironment) {
      throw new Error('BaseEnvironment is an abstract class and cannot be instantiated directly');
    }
    
    this.config = this._validateConfig(config);
    this.state = null;
    this.stepCount = 0;
    this.episodeCount = 0;
    this.initialized = false;
    this.metadata = {
      name: this.constructor.name,
      version: '1.0.0',
      type: 'base',
      render_modes: ['human'],
      reward_range: [-Infinity, Infinity]
    };
  }
  
  /**
   * Initialize the environment
   * @returns {Object} - Initial state
   */
  initialize() {
    throw new Error('Method initialize() must be implemented by subclass');
  }
  
  /**
   * Reset the environment to initial state
   * @returns {Object} - Initial state
   */
  reset() {
    throw new Error('Method reset() must be implemented by subclass');
  }
  
  /**
   * Step the environment forward with an action
   * @param {*} action - Action to take
   * @returns {Object} - Step result with observation, reward, done, and info
   */
  step(action) {
    throw new Error('Method step() must be implemented by subclass');
  }
  
  /**
   * Get environment information
   * @returns {Object} - Environment information
   */
  getInfo() {
    throw new Error('Method getInfo() must be implemented by subclass');
  }
  
  /**
   * Render the environment
   * @param {String} mode - Render mode ('human', 'rgb_array', etc.)
   * @returns {*} - Render result, depends on mode
   */
  render(mode = 'human') {
    throw new Error('Method render() must be implemented by subclass');
  }
  
  /**
   * Close the environment and release resources
   * @returns {Boolean} - Success status
   */
  close() {
    throw new Error('Method close() must be implemented by subclass');
  }
  
  /**
   * Get action space information
   * @returns {Object} - Action space information
   */
  getActionSpace() {
    throw new Error('Method getActionSpace() must be implemented by subclass');
  }
  
  /**
   * Get observation space information
   * @returns {Object} - Observation space information
   */
  getObservationSpace() {
    throw new Error('Method getObservationSpace() must be implemented by subclass');
  }
  
  /**
   * Sample a random action from the action space
   * @returns {*} - Random action
   */
  sampleAction() {
    throw new Error('Method sampleAction() must be implemented by subclass');
  }
  
  /**
   * Check if an action is valid
   * @param {*} action - Action to check
   * @returns {Boolean} - Whether the action is valid
   */
  isActionValid(action) {
    throw new Error('Method isActionValid() must be implemented by subclass');
  }
  
  /**
   * Get current state
   * @returns {Object} - Current state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Set random seed
   * @param {Number} seed - Random seed
   * @returns {Boolean} - Success status
   */
  setSeed(seed) {
    this.seed = seed;
    return true;
  }
  
  /**
   * Get environment metadata
   * @returns {Object} - Environment metadata
   */
  getMetadata() {
    return { ...this.metadata };
  }
  
  /**
   * Run a complete episode
   * @param {Function} policy - Policy function that takes observation and returns action
   * @param {Boolean} render - Whether to render the environment
   * @returns {Object} - Episode results
   */
  runEpisode(policy, render = false) {
    // Reset environment
    const initialObs = this.reset();
    
    let observation = initialObs;
    let done = false;
    let totalReward = 0;
    let steps = 0;
    const history = {
      observations: [observation],
      actions: [],
      rewards: [],
      dones: [false],
      infos: [{}]
    };
    
    // Episode loop
    while (!done && steps < this.config.maxStepsPerEpisode) {
      // Get action from policy
      const action = policy(observation);
      
      // Take step
      const { observation: nextObs, reward, done: isDone, info } = this.step(action);
      
      // Update tracking
      observation = nextObs;
      done = isDone;
      totalReward += reward;
      steps += 1;
      
      // Update history
      history.observations.push(observation);
      history.actions.push(action);
      history.rewards.push(reward);
      history.dones.push(done);
      history.infos.push(info);
      
      // Render if enabled
      if (render) {
        this.render();
      }
    }
    
    // Update episode count
    this.episodeCount += 1;
    
    // Return episode results
    return {
      totalReward,
      steps,
      history
    };
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    const defaultConfig = {
      maxStepsPerEpisode: 1000,
      renderFPS: 30
    };
    
    return { ...defaultConfig, ...config };
  }
}

module.exports = BaseEnvironment;
