/**
 * Interaction Framework for DevSparkAgent Playground
 * 
 * Main class responsible for managing agent interactions.
 */

const MessageProtocol = require('./MessageProtocol');
const MessageBroker = require('./MessageBroker');
const AgentCommunication = require('./AgentCommunication');
const EnvironmentInteraction = require('./EnvironmentInteraction');

class InteractionFramework {
  /**
   * Create a new InteractionFramework instance
   * @param {Object} config - Configuration options
   * @param {RuntimeEnvironment} runtimeEnvironment - Runtime environment instance
   */
  constructor(config, runtimeEnvironment) {
    this.config = config;
    this.runtimeEnvironment = runtimeEnvironment;
    this.initialized = false;
    this.logger = console; // Will be replaced with proper logger
    
    // Create components
    this.messageProtocol = new MessageProtocol(config);
    this.messageBroker = new MessageBroker(config, this.messageProtocol);
    this.agentCommunication = new AgentCommunication(config, this.messageProtocol, this.messageBroker);
    this.environmentInteraction = new EnvironmentInteraction(
      config,
      this.messageProtocol,
      this.messageBroker,
      runtimeEnvironment
    );
  }

  /**
   * Initialize the interaction framework
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing InteractionFramework...');
      
      // Initialize components
      await this.messageBroker.initialize();
      await this.agentCommunication.initialize();
      await this.environmentInteraction.initialize();
      
      this.initialized = true;
      this.logger.info('InteractionFramework initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`InteractionFramework initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start the interaction framework
   * @returns {Promise<boolean>} - Resolves to true if startup is successful
   */
  async start() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      this.logger.info('Starting InteractionFramework...');
      
      // Nothing specific to start, components are already initialized
      
      this.logger.info('InteractionFramework started successfully');
      return true;
    } catch (error) {
      this.logger.error(`InteractionFramework startup failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the interaction framework
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      if (!this.initialized) {
        this.logger.warn('InteractionFramework not initialized, nothing to stop');
        return false;
      }
      
      this.logger.info('Stopping InteractionFramework...');
      
      // Nothing specific to stop
      
      this.initialized = false;
      this.logger.info('InteractionFramework stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`InteractionFramework shutdown failed: ${error.message}`, error);
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
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      this.logger.info(`Registering agent ${agentId}`);
      
      // Register agent with communication system
      await this.agentCommunication.registerAgent(agentId, agentInfo);
      
      // Notify environment of new agent
      await this.environmentInteraction.broadcastNotification('agent:registered', {
        agentId,
        timestamp: new Date()
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
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      this.logger.info(`Unregistering agent ${agentId}`);
      
      // Unregister agent from communication system
      await this.agentCommunication.unregisterAgent(agentId);
      
      // Notify environment of agent removal
      await this.environmentInteraction.broadcastNotification('agent:unregistered', {
        agentId,
        timestamp: new Date()
      });
      
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
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      return this.agentCommunication.sendMessage(fromAgentId, toAgentId, type, content, options);
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
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      return this.agentCommunication.sendRequest(fromAgentId, toAgentId, action, params, options);
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
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      return this.agentCommunication.broadcastMessage(fromAgentId, type, content, options);
    } catch (error) {
      this.logger.error(`Failed to broadcast message from ${fromAgentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send a request to the environment
   * @param {string} agentId - Agent ID
   * @param {string} action - Request action
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} - Response object
   */
  async sendEnvironmentRequest(agentId, action, params) {
    try {
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      // Create request message
      const message = this.messageProtocol.createRequestMessage(
        agentId,
        'environment',
        action,
        params
      );
      
      // Publish message
      await this.messageBroker.publishMessage(message);
      
      // Create promise for response
      return new Promise((resolve, reject) => {
        // Set timeout
        const timeout = this.config.communication.requestTimeout || 30000;
        const timeoutId = setTimeout(() => {
          reject(new Error(`Environment request timed out after ${timeout}ms`));
        }, timeout);
        
        // Subscribe to response
        const responseHandler = (responseMessage) => {
          if (responseMessage.content.requestId === message.id) {
            // Unsubscribe
            this.messageBroker.unsubscribe(agentId, agentId);
            
            // Clear timeout
            clearTimeout(timeoutId);
            
            // Check if error
            if (responseMessage.type === 'error') {
              const error = new Error(responseMessage.content.error);
              error.details = responseMessage.content.details;
              reject(error);
            } else {
              resolve(responseMessage.content.result);
            }
          }
        };
        
        // Subscribe to response
        this.messageBroker.subscribe(agentId, agentId, responseHandler);
      });
    } catch (error) {
      this.logger.error(`Failed to send environment request from ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Execute code in an agent container
   * @param {string} agentId - Agent ID
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @param {number} timeout - Execution timeout in milliseconds
   * @returns {Promise<Object>} - Execution result
   */
  async executeCode(agentId, code, language, timeout) {
    try {
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      return this.sendEnvironmentRequest(agentId, 'executeCode', {
        code,
        language,
        timeout
      });
    } catch (error) {
      this.logger.error(`Failed to execute code for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get container status
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Container status
   */
  async getContainerStatus(agentId) {
    try {
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      return this.sendEnvironmentRequest(agentId, 'getContainerStatus', {});
    } catch (error) {
      this.logger.error(`Failed to get container status for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get resource usage
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Resource usage
   */
  async getResourceUsage(agentId) {
    try {
      if (!this.initialized) {
        throw new Error('InteractionFramework not initialized');
      }
      
      return this.sendEnvironmentRequest(agentId, 'getResourceUsage', {});
    } catch (error) {
      this.logger.error(`Failed to get resource usage for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all registered agents
   * @returns {Array<Object>} - List of agents
   */
  getAgents() {
    if (!this.initialized) {
      throw new Error('InteractionFramework not initialized');
    }
    
    return this.agentCommunication.getAgents();
  }

  /**
   * Get agent information
   * @param {string} agentId - Agent ID
   * @returns {Object} - Agent information
   */
  getAgentInfo(agentId) {
    if (!this.initialized) {
      throw new Error('InteractionFramework not initialized');
    }
    
    return this.agentCommunication.getAgentInfo(agentId);
  }

  /**
   * List all environment resources
   * @returns {Array<Object>} - List of resources
   */
  listResources() {
    if (!this.initialized) {
      throw new Error('InteractionFramework not initialized');
    }
    
    return this.environmentInteraction.listResources();
  }

  /**
   * Get an environment resource
   * @param {string} resourceId - Resource ID
   * @returns {Object} - Resource object
   */
  getResource(resourceId) {
    if (!this.initialized) {
      throw new Error('InteractionFramework not initialized');
    }
    
    return this.environmentInteraction.getResource(resourceId);
  }
}

module.exports = InteractionFramework;
