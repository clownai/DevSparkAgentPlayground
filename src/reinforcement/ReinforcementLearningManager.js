/**
 * ReinforcementLearningManager.js
 * Central manager for reinforcement learning algorithms
 * 
 * This class provides a unified interface for creating, configuring,
 * and using different reinforcement learning algorithms.
 */

const AlgorithmInterface = require('./AlgorithmInterface');
const ReinforcementConfig = require('./ReinforcementConfig');
const PPO = require('./algorithms/PPO');
const SAC = require('./algorithms/SAC');

class ReinforcementLearningManager {
  /**
   * Create a new reinforcement learning manager
   */
  constructor() {
    this.algorithms = new Map();
    this.environments = new Map();
    this.registeredAlgorithms = new Map();
    
    // Register built-in algorithms
    this._registerBuiltInAlgorithms();
  }
  
  /**
   * Register built-in algorithms
   * @private
   */
  _registerBuiltInAlgorithms() {
    this.registerAlgorithm('ppo', PPO);
    this.registerAlgorithm('sac', SAC);
  }
  
  /**
   * Register a new algorithm
   * @param {String} name - Algorithm name
   * @param {Class} algorithmClass - Algorithm class (must extend AlgorithmInterface)
   * @returns {Boolean} - Registration success
   */
  registerAlgorithm(name, algorithmClass) {
    // Validate algorithm class
    if (!algorithmClass.prototype instanceof AlgorithmInterface) {
      console.warn(`Algorithm ${name} does not extend AlgorithmInterface`);
    }
    
    this.registeredAlgorithms.set(name.toLowerCase(), algorithmClass);
    return true;
  }
  
  /**
   * Create a new algorithm instance
   * @param {String} name - Algorithm name
   * @param {String} id - Unique identifier for this instance
   * @param {Object} config - Algorithm configuration
   * @returns {AlgorithmInterface} - Algorithm instance
   */
  createAlgorithm(name, id, config = {}) {
    const lowerName = name.toLowerCase();
    
    // Check if algorithm is registered
    if (!this.registeredAlgorithms.has(lowerName)) {
      throw new Error(`Unknown algorithm: ${name}. Available algorithms: ${Array.from(this.registeredAlgorithms.keys()).join(', ')}`);
    }
    
    // Check if ID is already used
    if (this.algorithms.has(id)) {
      throw new Error(`Algorithm with ID ${id} already exists`);
    }
    
    // Create algorithm instance
    const AlgorithmClass = this.registeredAlgorithms.get(lowerName);
    const algorithm = new AlgorithmClass(config);
    
    // Store algorithm
    this.algorithms.set(id, {
      name: lowerName,
      instance: algorithm,
      config
    });
    
    return algorithm;
  }
  
  /**
   * Get algorithm instance
   * @param {String} id - Algorithm identifier
   * @returns {AlgorithmInterface} - Algorithm instance
   */
  getAlgorithm(id) {
    if (!this.algorithms.has(id)) {
      throw new Error(`Unknown algorithm ID: ${id}`);
    }
    
    return this.algorithms.get(id).instance;
  }
  
  /**
   * Get all algorithm instances
   * @returns {Map<String, Object>} - Map of algorithm instances
   */
  getAllAlgorithms() {
    return new Map(this.algorithms);
  }
  
  /**
   * Remove algorithm instance
   * @param {String} id - Algorithm identifier
   * @returns {Boolean} - Removal success
   */
  removeAlgorithm(id) {
    if (!this.algorithms.has(id)) {
      return false;
    }
    
    this.algorithms.delete(id);
    return true;
  }
  
  /**
   * Register environment
   * @param {String} id - Environment identifier
   * @param {Object} environment - Environment object
   * @returns {Boolean} - Registration success
   */
  registerEnvironment(id, environment) {
    // Validate environment
    if (!environment || !environment.reset || !environment.step) {
      throw new Error('Environment must have reset and step methods');
    }
    
    this.environments.set(id, environment);
    return true;
  }
  
  /**
   * Get environment
   * @param {String} id - Environment identifier
   * @returns {Object} - Environment object
   */
  getEnvironment(id) {
    if (!this.environments.has(id)) {
      throw new Error(`Unknown environment ID: ${id}`);
    }
    
    return this.environments.get(id);
  }
  
  /**
   * Get all registered environments
   * @returns {Map<String, Object>} - Map of environments
   */
  getAllEnvironments() {
    return new Map(this.environments);
  }
  
  /**
   * Remove environment
   * @param {String} id - Environment identifier
   * @returns {Boolean} - Removal success
   */
  removeEnvironment(id) {
    if (!this.environments.has(id)) {
      return false;
    }
    
    this.environments.delete(id);
    return true;
  }
  
  /**
   * Initialize algorithm with environment
   * @param {String} algorithmId - Algorithm identifier
   * @param {String} environmentId - Environment identifier
   * @returns {Boolean} - Initialization success
   */
  initializeAlgorithm(algorithmId, environmentId) {
    const algorithm = this.getAlgorithm(algorithmId);
    const environment = this.getEnvironment(environmentId);
    
    // Get environment info
    const envInfo = {
      stateSpace: environment.stateSpace,
      actionSpace: environment.actionSpace,
      actionType: environment.actionType || 'continuous'
    };
    
    // Initialize algorithm
    return algorithm.initialize(envInfo);
  }
  
  /**
   * Train algorithm in environment
   * @param {String} algorithmId - Algorithm identifier
   * @param {String} environmentId - Environment identifier
   * @param {Object} options - Training options
   * @returns {Promise<Object>} - Training results
   */
  async trainAlgorithm(algorithmId, environmentId, options = {}) {
    const algorithm = this.getAlgorithm(algorithmId);
    const environment = this.getEnvironment(environmentId);
    
    // Default options
    const defaultOptions = {
      episodes: 100,
      maxStepsPerEpisode: 1000,
      render: false,
      renderInterval: 10,
      verbose: true,
      evaluationInterval: 10,
      evaluationEpisodes: 5
    };
    
    const trainingOptions = { ...defaultOptions, ...options };
    
    // Initialize if not already initialized
    if (!algorithm.initialized) {
      this.initializeAlgorithm(algorithmId, environmentId);
    }
    
    // Training results
    const results = {
      episodes: [],
      totalReward: 0,
      averageReward: 0,
      totalSteps: 0,
      successRate: 0,
      evaluations: []
    };
    
    // Training loop
    for (let episode = 0; episode < trainingOptions.episodes; episode++) {
      // Reset environment
      let state = environment.reset();
      let done = false;
      let episodeReward = 0;
      let steps = 0;
      
      // Episode loop
      while (!done && steps < trainingOptions.maxStepsPerEpisode) {
        // Select action
        const action = algorithm.selectAction(state, true);
        
        // Take action in environment
        const { nextState, reward, done: episodeDone, info } = environment.step(action);
        
        // Update algorithm
        algorithm.update({
          state,
          action,
          reward,
          nextState,
          done: episodeDone,
          info
        });
        
        // Update state and counters
        state = nextState;
        done = episodeDone;
        episodeReward += reward;
        steps++;
        
        // Render if enabled
        if (trainingOptions.render && episode % trainingOptions.renderInterval === 0) {
          environment.render();
        }
      }
      
      // Record episode results
      results.episodes.push({
        episode,
        reward: episodeReward,
        steps,
        success: info?.success || false
      });
      
      results.totalReward += episodeReward;
      results.totalSteps += steps;
      
      // Log progress if verbose
      if (trainingOptions.verbose && (episode + 1) % 10 === 0) {
        console.log(`Episode ${episode + 1}/${trainingOptions.episodes} - Reward: ${episodeReward.toFixed(2)} - Steps: ${steps}`);
      }
      
      // Evaluate if interval reached
      if ((episode + 1) % trainingOptions.evaluationInterval === 0) {
        const evaluationResult = await this.evaluateAlgorithm(
          algorithmId,
          environmentId,
          {
            episodes: trainingOptions.evaluationEpisodes,
            maxStepsPerEpisode: trainingOptions.maxStepsPerEpisode
          }
        );
        
        results.evaluations.push({
          episode: episode + 1,
          ...evaluationResult
        });
        
        if (trainingOptions.verbose) {
          console.log(`Evaluation at episode ${episode + 1} - Average Reward: ${evaluationResult.averageReward.toFixed(2)}`);
        }
      }
    }
    
    // Calculate final statistics
    results.averageReward = results.totalReward / trainingOptions.episodes;
    results.successRate = results.episodes.filter(e => e.success).length / trainingOptions.episodes;
    
    return results;
  }
  
  /**
   * Evaluate algorithm in environment
   * @param {String} algorithmId - Algorithm identifier
   * @param {String} environmentId - Environment identifier
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} - Evaluation results
   */
  async evaluateAlgorithm(algorithmId, environmentId, options = {}) {
    const algorithm = this.getAlgorithm(algorithmId);
    const environment = this.getEnvironment(environmentId);
    
    // Default options
    const defaultOptions = {
      episodes: 10,
      maxStepsPerEpisode: 1000,
      render: false
    };
    
    const evaluationOptions = { ...defaultOptions, ...options };
    
    // Initialize if not already initialized
    if (!algorithm.initialized) {
      this.initializeAlgorithm(algorithmId, environmentId);
    }
    
    // Evaluation results
    const results = {
      episodes: [],
      totalReward: 0,
      averageReward: 0,
      totalSteps: 0,
      successRate: 0
    };
    
    // Evaluation loop
    for (let episode = 0; episode < evaluationOptions.episodes; episode++) {
      // Reset environment
      let state = environment.reset();
      let done = false;
      let episodeReward = 0;
      let steps = 0;
      
      // Episode loop
      while (!done && steps < evaluationOptions.maxStepsPerEpisode) {
        // Select action (no exploration)
        const action = algorithm.selectAction(state, false);
        
        // Take action in environment
        const { nextState, reward, done: episodeDone, info } = environment.step(action);
        
        // Update state and counters
        state = nextState;
        done = episodeDone;
        episodeReward += reward;
        steps++;
        
        // Render if enabled
        if (evaluationOptions.render) {
          environment.render();
        }
      }
      
      // Record episode results
      results.episodes.push({
        episode,
        reward: episodeReward,
        steps,
        success: info?.success || false
      });
      
      results.totalReward += episodeReward;
      results.totalSteps += steps;
    }
    
    // Calculate final statistics
    results.averageReward = results.totalReward / evaluationOptions.episodes;
    results.successRate = results.episodes.filter(e => e.success).length / evaluationOptions.episodes;
    
    return results;
  }
  
  /**
   * Save algorithm
   * @param {String} algorithmId - Algorithm identifier
   * @param {String} path - Path to save the algorithm
   * @returns {Boolean} - Save success
   */
  saveAlgorithm(algorithmId, path) {
    const algorithm = this.getAlgorithm(algorithmId);
    return algorithm.save(path);
  }
  
  /**
   * Load algorithm
   * @param {String} algorithmId - Algorithm identifier
   * @param {String} path - Path to load the algorithm from
   * @returns {Boolean} - Load success
   */
  loadAlgorithm(algorithmId, path) {
    const algorithm = this.getAlgorithm(algorithmId);
    return algorithm.load(path);
  }
  
  /**
   * Get available algorithms
   * @returns {Array<String>} - Available algorithm names
   */
  getAvailableAlgorithms() {
    return Array.from(this.registeredAlgorithms.keys());
  }
  
  /**
   * Get algorithm configuration schema
   * @param {String} name - Algorithm name
   * @returns {Object} - Configuration schema
   */
  getAlgorithmConfigSchema(name) {
    const lowerName = name.toLowerCase();
    
    if (!this.registeredAlgorithms.has(lowerName)) {
      throw new Error(`Unknown algorithm: ${name}`);
    }
    
    return ReinforcementConfig.getAllParamDescriptions(lowerName);
  }
}

module.exports = ReinforcementLearningManager;
