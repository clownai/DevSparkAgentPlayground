/**
 * MultiAgentEnvironment.js
 * Base class for multi-agent environments
 * 
 * This class defines the interface and common functionality for
 * environments that support multiple agents interacting simultaneously.
 */

class MultiAgentEnvironment {
  /**
   * Create a new multi-agent environment
   * @param {Object} config - Environment configuration
   */
  constructor(config = {}) {
    if (this.constructor === MultiAgentEnvironment) {
      throw new Error('MultiAgentEnvironment is an abstract class and cannot be instantiated directly');
    }
    
    this.config = this._validateConfig(config);
    this.agents = new Map();
    this.state = null;
    this.step_count = 0;
    this.episode_count = 0;
    this.initialized = false;
    
    // Communication system
    this.messageQueue = [];
  }
  
  /**
   * Register an agent in the environment
   * @param {Agent} agent - Agent to register
   * @returns {Boolean} - Success status
   */
  registerAgent(agent) {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} is already registered`);
    }
    
    this.agents.set(agent.id, {
      instance: agent,
      lastAction: null,
      lastObservation: null,
      lastReward: 0,
      active: true
    });
    
    // Initialize agent if environment is already initialized
    if (this.initialized) {
      const envInfo = this.getEnvironmentInfo();
      agent.initialize(envInfo);
    }
    
    return true;
  }
  
  /**
   * Remove an agent from the environment
   * @param {String} agentId - ID of agent to remove
   * @returns {Boolean} - Success status
   */
  removeAgent(agentId) {
    if (!this.agents.has(agentId)) {
      return false;
    }
    
    this.agents.delete(agentId);
    return true;
  }
  
  /**
   * Get all registered agents
   * @returns {Map<String, Object>} - Map of agent IDs to agent data
   */
  getAgents() {
    return new Map(this.agents);
  }
  
  /**
   * Get agent by ID
   * @param {String} agentId - Agent ID
   * @returns {Agent} - Agent instance
   */
  getAgent(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Unknown agent ID: ${agentId}`);
    }
    
    return this.agents.get(agentId).instance;
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
   * Step the environment forward with agent actions
   * @param {Map<String, *>} actions - Map of agent IDs to actions
   * @returns {Object} - Step result with observations, rewards, dones, and info
   */
  step(actions) {
    throw new Error('Method step() must be implemented by subclass');
  }
  
  /**
   * Get observations for all agents
   * @returns {Map<String, Object>} - Map of agent IDs to observations
   */
  getObservations() {
    throw new Error('Method getObservations() must be implemented by subclass');
  }
  
  /**
   * Get observation for a specific agent
   * @param {String} agentId - Agent ID
   * @returns {Object} - Agent observation
   */
  getObservation(agentId) {
    throw new Error('Method getObservation() must be implemented by subclass');
  }
  
  /**
   * Get environment information for agent initialization
   * @returns {Object} - Environment information
   */
  getEnvironmentInfo() {
    throw new Error('Method getEnvironmentInfo() must be implemented by subclass');
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
   * Process agent messages
   * @returns {Boolean} - Success status
   */
  processMessages() {
    // Collect messages from all agents
    for (const [agentId, agentData] of this.agents.entries()) {
      const messages = agentData.instance.getOutgoingMessages();
      this.messageQueue.push(...messages);
    }
    
    // Process messages
    const agentMessages = new Map();
    
    for (const message of this.messageQueue) {
      const { recipientId } = message;
      
      if (recipientId === 'all') {
        // Broadcast message to all agents
        for (const [agentId, agentData] of this.agents.entries()) {
          if (agentId !== message.senderId) {
            if (!agentMessages.has(agentId)) {
              agentMessages.set(agentId, []);
            }
            agentMessages.get(agentId).push(message);
          }
        }
      } else if (this.agents.has(recipientId)) {
        // Send message to specific agent
        if (!agentMessages.has(recipientId)) {
          agentMessages.set(recipientId, []);
        }
        agentMessages.get(recipientId).push(message);
      }
    }
    
    // Deliver messages to agents
    for (const [agentId, messages] of agentMessages.entries()) {
      const agent = this.agents.get(agentId).instance;
      agent.processMessages(messages);
    }
    
    // Clear message queue
    this.messageQueue = [];
    
    return true;
  }
  
  /**
   * Run a complete episode
   * @param {Boolean} render - Whether to render the environment
   * @returns {Object} - Episode results
   */
  runEpisode(render = false) {
    // Reset environment
    this.reset();
    
    let done = false;
    let stepCount = 0;
    const episodeRewards = new Map();
    
    // Initialize episode rewards
    for (const agentId of this.agents.keys()) {
      episodeRewards.set(agentId, 0);
    }
    
    // Episode loop
    while (!done && stepCount < this.config.maxStepsPerEpisode) {
      // Get observations for all agents
      const observations = this.getObservations();
      
      // Get actions from all agents
      const actions = new Map();
      for (const [agentId, agentData] of this.agents.entries()) {
        if (agentData.active) {
          const observation = observations.get(agentId);
          const action = agentData.instance.selectAction(observation, true);
          actions.set(agentId, action);
        }
      }
      
      // Process agent messages
      this.processMessages();
      
      // Step environment
      const { observations: nextObservations, rewards, dones, info } = this.step(actions);
      
      // Update agents
      for (const [agentId, agentData] of this.agents.entries()) {
        if (agentData.active) {
          const observation = observations.get(agentId);
          const action = actions.get(agentId);
          const nextObservation = nextObservations.get(agentId);
          const reward = rewards.get(agentId);
          const done = dones.get(agentId);
          
          // Update agent
          agentData.instance.update({
            observation,
            action,
            reward,
            nextObservation,
            done,
            info: info.get(agentId) || {}
          });
          
          // Update episode rewards
          episodeRewards.set(agentId, episodeRewards.get(agentId) + reward);
          
          // Update agent status
          agentData.active = !done;
        }
      }
      
      // Render if enabled
      if (render) {
        this.render();
      }
      
      // Check if episode is done
      done = Array.from(dones.values()).every(d => d) || 
             Array.from(this.agents.values()).every(a => !a.active);
      
      stepCount++;
    }
    
    // Update episode count
    this.episode_count++;
    
    // Return episode results
    return {
      steps: stepCount,
      rewards: episodeRewards,
      info
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
      communicationEnabled: true,
      communicationRange: Infinity,
      communicationBandwidth: Infinity,
      teamBased: false
    };
    
    return { ...defaultConfig, ...config };
  }
}

module.exports = MultiAgentEnvironment;
