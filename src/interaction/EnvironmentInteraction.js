/**
 * Environment Interaction for DevSparkAgent Playground
 * 
 * Handles interaction between agents and the environment.
 */

class EnvironmentInteraction {
  /**
   * Create a new EnvironmentInteraction instance
   * @param {Object} config - Configuration options
   * @param {MessageProtocol} messageProtocol - Message protocol instance
   * @param {MessageBroker} messageBroker - Message broker instance
   * @param {RuntimeEnvironment} runtimeEnvironment - Runtime environment instance
   */
  constructor(config, messageProtocol, messageBroker, runtimeEnvironment) {
    this.config = config;
    this.messageProtocol = messageProtocol;
    this.messageBroker = messageBroker;
    this.runtimeEnvironment = runtimeEnvironment;
    this.environmentId = 'environment';
    this.resources = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the environment interaction
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing EnvironmentInteraction...');
      
      // Subscribe to environment messages
      await this.messageBroker.subscribe(this.environmentId, this.environmentId, (message) => {
        this._handleEnvironmentMessage(message);
      });
      
      // Initialize resources
      await this._initializeResources();
      
      this.logger.info('EnvironmentInteraction initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`EnvironmentInteraction initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register a resource
   * @param {string} resourceId - Resource ID
   * @param {Object} resource - Resource object
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerResource(resourceId, resource) {
    try {
      this.logger.info(`Registering resource ${resourceId}`);
      
      // Store resource
      this.resources.set(resourceId, {
        id: resourceId,
        resource,
        registeredAt: new Date()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register resource ${resourceId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister a resource
   * @param {string} resourceId - Resource ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterResource(resourceId) {
    try {
      this.logger.info(`Unregistering resource ${resourceId}`);
      
      // Check if resource exists
      if (!this.resources.has(resourceId)) {
        this.logger.warn(`Resource ${resourceId} not found`);
        return false;
      }
      
      // Remove resource
      this.resources.delete(resourceId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister resource ${resourceId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a resource
   * @param {string} resourceId - Resource ID
   * @returns {Object} - Resource object
   */
  getResource(resourceId) {
    const resourceEntry = this.resources.get(resourceId);
    if (!resourceEntry) {
      throw new Error(`Resource ${resourceId} not found`);
    }
    
    return resourceEntry.resource;
  }

  /**
   * List all resources
   * @returns {Array<Object>} - List of resources
   */
  listResources() {
    const resources = [];
    
    for (const [resourceId, resourceEntry] of this.resources.entries()) {
      resources.push({
        id: resourceId,
        type: resourceEntry.resource.type,
        registeredAt: resourceEntry.registeredAt
      });
    }
    
    return resources;
  }

  /**
   * Handle agent request to the environment
   * @param {string} agentId - Agent ID
   * @param {string} action - Request action
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} - Response object
   */
  async handleAgentRequest(agentId, action, params) {
    try {
      this.logger.debug(`Handling agent request from ${agentId}: ${action}`);
      
      // Handle request based on action
      switch (action) {
        case 'getResource':
          return this._handleGetResourceRequest(params);
        
        case 'listResources':
          return this._handleListResourcesRequest();
        
        case 'executeCode':
          return this._handleExecuteCodeRequest(agentId, params);
        
        case 'getContainerStatus':
          return this._handleGetContainerStatusRequest(agentId);
        
        case 'getResourceUsage':
          return this._handleGetResourceUsageRequest(agentId);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle agent request from ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send notification to an agent
   * @param {string} agentId - Agent ID
   * @param {string} event - Notification event
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Message object
   */
  async sendNotification(agentId, event, data) {
    try {
      this.logger.debug(`Sending notification to ${agentId}: ${event}`);
      
      // Create notification message
      const message = this.messageProtocol.createNotificationMessage(
        this.environmentId,
        agentId,
        event,
        data
      );
      
      // Publish message
      await this.messageBroker.publishMessage(message);
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to send notification to ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Broadcast notification to all agents
   * @param {string} event - Notification event
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Message object
   */
  async broadcastNotification(event, data) {
    try {
      this.logger.debug(`Broadcasting notification: ${event}`);
      
      // Create notification message
      const message = this.messageProtocol.createNotificationMessage(
        this.environmentId,
        'topic:broadcast',
        event,
        data
      );
      
      // Publish message
      await this.messageBroker.publishMessage(message);
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Initialize resources
   * @private
   * @returns {Promise<void>}
   */
  async _initializeResources() {
    try {
      // Register built-in resources
      await this.registerResource('system', {
        type: 'system',
        name: 'System',
        description: 'System information and utilities',
        getInfo: () => ({
          version: this.config.version,
          startTime: new Date(),
          environment: process.env.NODE_ENV || 'development'
        })
      });
      
      await this.registerResource('filesystem', {
        type: 'filesystem',
        name: 'File System',
        description: 'File system access',
        readFile: (path) => {
          // In a real implementation, this would read a file
          return `Content of ${path}`;
        },
        writeFile: (path, content) => {
          // In a real implementation, this would write a file
          return true;
        }
      });
      
      await this.registerResource('network', {
        type: 'network',
        name: 'Network',
        description: 'Network access',
        httpGet: (url) => {
          // In a real implementation, this would make an HTTP GET request
          return { status: 200, body: `Response from ${url}` };
        },
        httpPost: (url, data) => {
          // In a real implementation, this would make an HTTP POST request
          return { status: 200, body: `Response from ${url}` };
        }
      });
    } catch (error) {
      this.logger.error(`Failed to initialize resources: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Handle environment message
   * @private
   * @param {Object} message - Message object
   */
  async _handleEnvironmentMessage(message) {
    try {
      // Handle message based on type
      switch (message.type) {
        case 'request':
          await this._handleRequestMessage(message);
          break;
        
        default:
          this.logger.warn(`Unsupported message type: ${message.type}`);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle environment message: ${error.message}`, error);
    }
  }

  /**
   * Handle request message
   * @private
   * @param {Object} message - Request message
   */
  async _handleRequestMessage(message) {
    try {
      const { action, params } = message.content;
      const senderId = message.sender;
      
      // Handle request
      try {
        const result = await this.handleAgentRequest(senderId, action, params);
        
        // Send response
        const responseMessage = this.messageProtocol.createResponseMessage(
          this.environmentId,
          senderId,
          message.id,
          result
        );
        
        await this.messageBroker.publishMessage(responseMessage);
      } catch (error) {
        // Send error
        const errorMessage = this.messageProtocol.createErrorMessage(
          this.environmentId,
          senderId,
          message.id,
          error.message,
          { stack: error.stack }
        );
        
        await this.messageBroker.publishMessage(errorMessage);
      }
    } catch (error) {
      this.logger.error(`Failed to handle request message: ${error.message}`, error);
    }
  }

  /**
   * Handle get resource request
   * @private
   * @param {Object} params - Request parameters
   * @returns {Object} - Resource object
   */
  _handleGetResourceRequest(params) {
    const { resourceId } = params;
    
    if (!resourceId) {
      throw new Error('Resource ID is required');
    }
    
    return this.getResource(resourceId);
  }

  /**
   * Handle list resources request
   * @private
   * @returns {Array<Object>} - List of resources
   */
  _handleListResourcesRequest() {
    return this.listResources();
  }

  /**
   * Handle execute code request
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} - Execution result
   */
  async _handleExecuteCodeRequest(agentId, params) {
    const { code, language, timeout } = params;
    
    if (!code) {
      throw new Error('Code is required');
    }
    
    if (!language) {
      throw new Error('Language is required');
    }
    
    return this.runtimeEnvironment.executeCode(agentId, code, language, timeout);
  }

  /**
   * Handle get container status request
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Container status
   */
  async _handleGetContainerStatusRequest(agentId) {
    return this.runtimeEnvironment.getContainerStatus(agentId);
  }

  /**
   * Handle get resource usage request
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Resource usage
   */
  async _handleGetResourceUsageRequest(agentId) {
    return this.runtimeEnvironment.monitorResources(agentId);
  }
}

module.exports = EnvironmentInteraction;
