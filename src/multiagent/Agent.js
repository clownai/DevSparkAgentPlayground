/**
 * Agent.js
 * Base class for all agents in multi-agent environments
 * 
 * This class defines the interface that all agents must implement
 * to participate in multi-agent environments.
 */

class Agent {
  /**
   * Create a new agent
   * @param {String} id - Unique identifier for this agent
   * @param {Object} config - Agent configuration
   */
  constructor(id, config = {}) {
    if (this.constructor === Agent) {
      throw new Error('Agent is an abstract class and cannot be instantiated directly');
    }
    
    this.id = id;
    this.config = this._validateConfig(config);
    this.initialized = false;
    this.stats = {
      episodes: 0,
      steps: 0,
      totalReward: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };
    
    // Communication channels
    this.incomingMessages = [];
    this.outgoingMessages = [];
  }
  
  /**
   * Initialize the agent with environment information
   * @param {Object} envInfo - Environment information
   * @returns {Boolean} - Success status
   */
  initialize(envInfo) {
    throw new Error('Method initialize() must be implemented by subclass');
  }
  
  /**
   * Select an action based on the current observation
   * @param {Object} observation - Current observation of the environment
   * @param {Boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {*} - Selected action
   */
  selectAction(observation, explore = true) {
    throw new Error('Method selectAction() must be implemented by subclass');
  }
  
  /**
   * Update the agent based on experience
   * @param {Object} experience - Experience tuple (observation, action, reward, nextObservation, done)
   * @returns {Object} - Update statistics
   */
  update(experience) {
    throw new Error('Method update() must be implemented by subclass');
  }
  
  /**
   * Process incoming messages from other agents
   * @param {Array<Object>} messages - Array of messages
   * @returns {Boolean} - Success status
   */
  processMessages(messages) {
    this.incomingMessages = [...this.incomingMessages, ...messages];
    return true;
  }
  
  /**
   * Send messages to other agents
   * @param {String} recipientId - ID of recipient agent (or 'all' for broadcast)
   * @param {String} type - Message type
   * @param {Object} content - Message content
   * @returns {Boolean} - Success status
   */
  sendMessage(recipientId, type, content) {
    const message = {
      senderId: this.id,
      recipientId,
      type,
      content,
      timestamp: Date.now()
    };
    
    this.outgoingMessages.push(message);
    return true;
  }
  
  /**
   * Get all outgoing messages and clear the queue
   * @returns {Array<Object>} - Array of outgoing messages
   */
  getOutgoingMessages() {
    const messages = [...this.outgoingMessages];
    this.outgoingMessages = [];
    return messages;
  }
  
  /**
   * Clear all incoming messages
   * @returns {Boolean} - Success status
   */
  clearIncomingMessages() {
    this.incomingMessages = [];
    return true;
  }
  
  /**
   * Get agent configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Update agent configuration
   * @param {Object} config - New configuration parameters
   * @returns {Object} - Updated configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...this._validateConfig(config) };
    return this.getConfig();
  }
  
  /**
   * Get agent statistics
   * @returns {Object} - Agent statistics
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * Reset the agent state
   * @returns {Boolean} - Success status
   */
  reset() {
    this.stats = {
      episodes: 0,
      steps: 0,
      totalReward: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };
    
    this.incomingMessages = [];
    this.outgoingMessages = [];
    
    return true;
  }
  
  /**
   * Save agent state
   * @param {String} path - Path to save the agent
   * @returns {Boolean} - Success status
   */
  save(path) {
    throw new Error('Method save() must be implemented by subclass');
  }
  
  /**
   * Load agent state
   * @param {String} path - Path to load the agent from
   * @returns {Boolean} - Success status
   */
  load(path) {
    throw new Error('Method load() must be implemented by subclass');
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
   * Update agent statistics
   * @param {Object} stats - Statistics to update
   * @protected
   */
  _updateStats(stats) {
    if (stats.steps) this.stats.steps += stats.steps;
    if (stats.episodes) this.stats.episodes += stats.episodes;
    if (stats.reward) this.stats.totalReward += stats.reward;
    if (stats.win) this.stats.wins += 1;
    if (stats.loss) this.stats.losses += 1;
    if (stats.draw) this.stats.draws += 1;
  }
}

module.exports = Agent;
