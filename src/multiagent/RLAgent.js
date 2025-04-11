/**
 * RLAgent.js
 * Reinforcement Learning agent implementation for multi-agent environments
 * 
 * This class implements an agent that uses reinforcement learning
 * algorithms to learn optimal behavior in multi-agent environments.
 */

const Agent = require('./Agent');
const ReinforcementLearningManager = require('../reinforcement/ReinforcementLearningManager');

class RLAgent extends Agent {
  /**
   * Create a new reinforcement learning agent
   * @param {String} id - Unique identifier for this agent
   * @param {Object} config - Agent configuration
   */
  constructor(id, config = {}) {
    super(id, config);
    
    // Create RL manager
    this.rlManager = new ReinforcementLearningManager();
    
    // Create algorithm instance
    this.algorithmId = `${id}_algorithm`;
    this.algorithm = this.rlManager.createAlgorithm(
      this.config.algorithmType || 'ppo',
      this.algorithmId,
      this.config.algorithmConfig || {}
    );
    
    // Initialize experience buffer
    this.experienceBuffer = [];
    
    // Initialize state tracking
    this.currentState = null;
    this.lastAction = null;
    this.episodeReward = 0;
    this.episodeSteps = 0;
  }
  
  /**
   * Initialize the agent with environment information
   * @param {Object} envInfo - Environment information
   * @returns {Boolean} - Success status
   */
  initialize(envInfo) {
    // Register environment with RL manager
    const envId = `${this.id}_env`;
    this.rlManager.registerEnvironment(envId, {
      reset: () => null, // Dummy reset, we don't use it directly
      step: () => null,   // Dummy step, we don't use it directly
      actionSpace: envInfo.actionSpace,
      stateSpace: this._getStateSpaceFromObservation(envInfo.observationSpace)
    });
    
    // Initialize algorithm with environment
    this.rlManager.initializeAlgorithm(this.algorithmId, envId);
    
    // Reset state
    this.currentState = null;
    this.lastAction = null;
    this.episodeReward = 0;
    this.episodeSteps = 0;
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Select an action based on the current observation
   * @param {Object} observation - Current observation of the environment
   * @param {Boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {*} - Selected action
   */
  selectAction(observation, explore = true) {
    if (!this.initialized) {
      throw new Error('Agent must be initialized before selecting actions');
    }
    
    // Convert observation to state representation
    const state = this._observationToState(observation);
    this.currentState = state;
    
    // Select action using RL algorithm
    const action = this.algorithm.selectAction(state, explore);
    this.lastAction = action;
    
    return action;
  }
  
  /**
   * Update the agent based on experience
   * @param {Object} experience - Experience tuple (observation, action, reward, nextObservation, done)
   * @returns {Object} - Update statistics
   */
  update(experience) {
    if (!this.initialized) {
      throw new Error('Agent must be initialized before updating');
    }
    
    // Extract experience components
    const { observation, action, reward, nextObservation, done } = experience;
    
    // Convert observations to state representations
    const state = this._observationToState(observation);
    const nextState = this._observationToState(nextObservation);
    
    // Update RL algorithm
    const updateResult = this.algorithm.update({
      state,
      action,
      reward,
      nextState,
      done
    });
    
    // Update episode statistics
    this.episodeReward += reward;
    this.episodeSteps += 1;
    
    // Update agent statistics
    this._updateStats({
      steps: 1,
      reward: reward
    });
    
    // Check if episode is done
    if (done) {
      this._updateStats({
        episodes: 1
      });
      
      // Reset episode tracking
      this.episodeReward = 0;
      this.episodeSteps = 0;
    }
    
    return updateResult;
  }
  
  /**
   * Process incoming messages from other agents
   * @param {Array<Object>} messages - Array of messages
   * @returns {Boolean} - Success status
   */
  processMessages(messages) {
    super.processMessages(messages);
    
    // Process messages based on agent's learning strategy
    if (this.config.learnFromCommunication) {
      for (const message of messages) {
        if (message.type === 'inform' && message.content.topic === 'experience') {
          // Learn from shared experience
          const sharedExperience = message.content.content;
          
          // Convert to agent's state representation
          const state = this._observationToState(sharedExperience.observation);
          const nextState = this._observationToState(sharedExperience.nextObservation);
          
          // Update with shared experience (with lower weight)
          this.algorithm.update({
            state,
            action: sharedExperience.action,
            reward: sharedExperience.reward * this.config.sharedExperienceWeight,
            nextState,
            done: sharedExperience.done
          });
        }
      }
    }
    
    return true;
  }
  
  /**
   * Share experience with other agents
   * @param {String} recipientId - ID of recipient agent (or 'all' for broadcast)
   * @param {Object} experience - Experience to share
   * @returns {Boolean} - Success status
   */
  shareExperience(recipientId, experience) {
    return this.sendMessage(recipientId, 'inform', {
      topic: 'experience',
      content: experience
    });
  }
  
  /**
   * Save agent state
   * @param {String} path - Path to save the agent
   * @returns {Boolean} - Success status
   */
  save(path) {
    try {
      // Save algorithm
      this.algorithm.save(`${path}_algorithm`);
      
      // Save agent configuration and stats
      const agentData = {
        id: this.id,
        config: this.config,
        stats: this.stats,
        initialized: this.initialized
      };
      
      const fs = require('fs');
      fs.writeFileSync(`${path}_agent.json`, JSON.stringify(agentData, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error saving agent:', error);
      return false;
    }
  }
  
  /**
   * Load agent state
   * @param {String} path - Path to load the agent from
   * @returns {Boolean} - Success status
   */
  load(path) {
    try {
      // Load algorithm
      this.algorithm.load(`${path}_algorithm`);
      
      // Load agent configuration and stats
      const fs = require('fs');
      const agentData = JSON.parse(fs.readFileSync(`${path}_agent.json`, 'utf8'));
      
      this.config = agentData.config;
      this.stats = agentData.stats;
      this.initialized = agentData.initialized;
      
      return true;
    } catch (error) {
      console.error('Error loading agent:', error);
      return false;
    }
  }
  
  /**
   * Reset the agent state
   * @returns {Boolean} - Success status
   */
  reset() {
    super.reset();
    
    // Reset algorithm
    this.algorithm.reset();
    
    // Reset state tracking
    this.currentState = null;
    this.lastAction = null;
    this.episodeReward = 0;
    this.episodeSteps = 0;
    
    return true;
  }
  
  /**
   * Convert observation to state representation
   * @param {Object} observation - Environment observation
   * @returns {Array} - State representation
   * @private
   */
  _observationToState(observation) {
    // This is a simple implementation that flattens the observation
    // A more sophisticated implementation would process the observation
    // based on the environment type
    
    if (!observation) {
      return null;
    }
    
    const state = [];
    
    // Add position
    if (observation.position) {
      state.push(...observation.position);
    }
    
    // Add flattened vision
    if (observation.vision) {
      for (const row of observation.vision) {
        for (const cell of row) {
          state.push(...cell);
        }
      }
    }
    
    // Add message count
    if (observation.messages) {
      state.push(observation.messages.length);
    }
    
    return state;
  }
  
  /**
   * Get state space from observation space
   * @param {Object} observationSpace - Environment observation space
   * @returns {Object} - State space
   * @private
   */
  _getStateSpaceFromObservation(observationSpace) {
    // Calculate state dimension based on observation space
    let stateDim = 0;
    
    if (observationSpace.spaces.position) {
      stateDim += observationSpace.spaces.position.shape[0];
    }
    
    if (observationSpace.spaces.vision) {
      const [height, width, channels] = observationSpace.spaces.vision.shape;
      stateDim += height * width * channels;
    }
    
    if (observationSpace.spaces.messages) {
      stateDim += 1; // Just count of messages
    }
    
    return {
      shape: [stateDim]
    };
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    const parentConfig = super._validateConfig(config);
    
    const defaultConfig = {
      algorithmType: 'ppo',
      algorithmConfig: {},
      learnFromCommunication: true,
      sharedExperienceWeight: 0.5,
      explorationRate: 0.1
    };
    
    return { ...defaultConfig, ...parentConfig };
  }
}

module.exports = RLAgent;
