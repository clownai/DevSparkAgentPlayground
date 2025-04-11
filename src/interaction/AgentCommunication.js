/**
 * Agent Communication for DevSparkAgent Playground
 * 
 * Handles communication between agents.
 */

class AgentCommunication {
  /**
   * Create a new AgentCommunication instance
   * @param {Object} config - Configuration options
   * @param {MessageProtocol} messageProtocol - Message protocol instance
   * @param {MessageBroker} messageBroker - Message broker instance
   */
  constructor(config, messageProtocol, messageBroker) {
    this.config = config;
    this.messageProtocol = messageProtocol;
    this.messageBroker = messageBroker;
    this.agents = new Map();
    this.pendingRequests = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the agent communication
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing AgentCommunication...');
      
      this.logger.info('AgentCommunication initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`AgentCommunication initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register an agent
   * @param {string} agentId - Agent ID
   * @param {Object} agentInfo - Agent information
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerAgent(agentId, agentInfo) {
    try {
      this.logger.info(`Registering agent ${agentId}`);
      
      // Store agent information
      this.agents.set(agentId, {
        id: agentId,
        info: agentInfo,
        status: 'registered',
        registeredAt: new Date(),
        lastActive: new Date()
      });
      
      // Subscribe to direct messages
      await this.messageBroker.subscribe(agentId, agentId, (message) => {
        this._handleAgentMessage(agentId, message);
      });
      
      // Subscribe to broadcast messages
      await this.messageBroker.subscribe(agentId, 'topic:broadcast', (message) => {
        this._handleAgentMessage(agentId, message);
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterAgent(agentId) {
    try {
      this.logger.info(`Unregistering agent ${agentId}`);
      
      // Check if agent is registered
      if (!this.agents.has(agentId)) {
        this.logger.warn(`Agent ${agentId} not registered`);
        return false;
      }
      
      // Unsubscribe from direct messages
      await this.messageBroker.unsubscribe(agentId, agentId);
      
      // Unsubscribe from broadcast messages
      await this.messageBroker.unsubscribe(agentId, 'topic:broadcast');
      
      // Remove agent
      this.agents.delete(agentId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send a message from one agent to another
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} toAgentId - Recipient agent ID
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Message object
   */
  async sendMessage(fromAgentId, toAgentId, type, content, options = {}) {
    try {
      this.logger.debug(`Sending message from ${fromAgentId} to ${toAgentId}`);
      
      // Check if sender is registered
      if (!this.agents.has(fromAgentId)) {
        throw new Error(`Sender agent ${fromAgentId} not registered`);
      }
      
      // Create message
      const message = this.messageProtocol.createMessage(fromAgentId, toAgentId, type, content, options);
      
      // Publish message
      await this.messageBroker.publishMessage(message);
      
      // Update agent last active timestamp
      const agent = this.agents.get(fromAgentId);
      agent.lastActive = new Date();
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to send message from ${fromAgentId} to ${toAgentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send a request from one agent to another and wait for response
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} toAgentId - Recipient agent ID
   * @param {string} action - Request action
   * @param {Object} params - Request parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Response object
   */
  async sendRequest(fromAgentId, toAgentId, action, params, options = {}) {
    try {
      this.logger.debug(`Sending request from ${fromAgentId} to ${toAgentId}: ${action}`);
      
      // Check if sender is registered
      if (!this.agents.has(fromAgentId)) {
        throw new Error(`Sender agent ${fromAgentId} not registered`);
      }
      
      // Create request message
      const message = this.messageProtocol.createRequestMessage(fromAgentId, toAgentId, action, params, options);
      
      // Create promise for response
      const responsePromise = new Promise((resolve, reject) => {
        // Set timeout
        const timeout = options.timeout || this.config.communication.requestTimeout || 30000;
        const timeoutId = setTimeout(() => {
          // Remove from pending requests
          this.pendingRequests.delete(message.id);
          
          reject(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);
        
        // Store pending request
        this.pendingRequests.set(message.id, {
          resolve,
          reject,
          timeoutId,
          timestamp: new Date()
        });
      });
      
      // Publish message
      await this.messageBroker.publishMessage(message);
      
      // Update agent last active timestamp
      const agent = this.agents.get(fromAgentId);
      agent.lastActive = new Date();
      
      // Wait for response
      return responsePromise;
    } catch (error) {
      this.logger.error(`Failed to send request from ${fromAgentId} to ${toAgentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Broadcast a message to all agents
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Message object
   */
  async broadcastMessage(fromAgentId, type, content, options = {}) {
    try {
      this.logger.debug(`Broadcasting message from ${fromAgentId}`);
      
      // Check if sender is registered
      if (!this.agents.has(fromAgentId)) {
        throw new Error(`Sender agent ${fromAgentId} not registered`);
      }
      
      // Create message
      const message = this.messageProtocol.createMessage(fromAgentId, 'topic:broadcast', type, content, options);
      
      // Publish message
      await this.messageBroker.publishMessage(message);
      
      // Update agent last active timestamp
      const agent = this.agents.get(fromAgentId);
      agent.lastActive = new Date();
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to broadcast message from ${fromAgentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all registered agents
   * @returns {Array<Object>} - List of agents
   */
  getAgents() {
    const agents = [];
    
    for (const [agentId, agent] of this.agents.entries()) {
      agents.push({
        id: agent.id,
        status: agent.status,
        registeredAt: agent.registeredAt,
        lastActive: agent.lastActive
      });
    }
    
    return agents;
  }

  /**
   * Get agent information
   * @param {string} agentId - Agent ID
   * @returns {Object} - Agent information
   */
  getAgentInfo(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    return {
      id: agent.id,
      info: agent.info,
      status: agent.status,
      registeredAt: agent.registeredAt,
      lastActive: agent.lastActive
    };
  }

  /**
   * Handle agent message
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} message - Message object
   */
  _handleAgentMessage(agentId, message) {
    try {
      // Update agent last active timestamp
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.lastActive = new Date();
      }
      
      // Handle message based on type
      switch (message.type) {
        case 'response':
          this._handleResponseMessage(message);
          break;
        
        case 'error':
          this._handleErrorMessage(message);
          break;
        
        default:
          // Other message types are handled by the agent
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle message for agent ${agentId}: ${error.message}`, error);
    }
  }

  /**
   * Handle response message
   * @private
   * @param {Object} message - Response message
   */
  _handleResponseMessage(message) {
    try {
      const requestId = message.content.requestId;
      
      // Check if request is pending
      if (!this.pendingRequests.has(requestId)) {
        this.logger.warn(`No pending request found for ${requestId}`);
        return;
      }
      
      // Get pending request
      const pendingRequest = this.pendingRequests.get(requestId);
      
      // Clear timeout
      clearTimeout(pendingRequest.timeoutId);
      
      // Resolve promise
      pendingRequest.resolve(message.content.result);
      
      // Remove from pending requests
      this.pendingRequests.delete(requestId);
    } catch (error) {
      this.logger.error(`Failed to handle response message: ${error.message}`, error);
    }
  }

  /**
   * Handle error message
   * @private
   * @param {Object} message - Error message
   */
  _handleErrorMessage(message) {
    try {
      const requestId = message.content.requestId;
      
      // Check if request is pending
      if (!this.pendingRequests.has(requestId)) {
        this.logger.warn(`No pending request found for ${requestId}`);
        return;
      }
      
      // Get pending request
      const pendingRequest = this.pendingRequests.get(requestId);
      
      // Clear timeout
      clearTimeout(pendingRequest.timeoutId);
      
      // Create error object
      const error = new Error(message.content.error);
      error.details = message.content.details;
      
      // Reject promise
      pendingRequest.reject(error);
      
      // Remove from pending requests
      this.pendingRequests.delete(requestId);
    } catch (error) {
      this.logger.error(`Failed to handle error message: ${error.message}`, error);
    }
  }
}

module.exports = AgentCommunication;
