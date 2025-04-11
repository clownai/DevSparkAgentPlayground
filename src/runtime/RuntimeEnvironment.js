/**
 * Runtime Environment for DevSparkAgent Playground
 * 
 * Main class responsible for managing the runtime environment.
 */

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const ContainerManager = require('./ContainerManager');
const ExecutionEngine = require('./ExecutionEngine');
const SecurityManager = require('./SecurityManager');
const ResourceMonitor = require('./ResourceMonitor');

class RuntimeEnvironment {
  /**
   * Create a new RuntimeEnvironment instance
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.logger = console; // Will be replaced with proper logger
    this.containerManager = new ContainerManager(config);
    this.executionEngine = new ExecutionEngine(config, this.containerManager);
    this.securityManager = new SecurityManager(config, this.containerManager);
    this.resourceMonitor = new ResourceMonitor(config, this.containerManager, this.securityManager);
  }

  /**
   * Initialize the runtime environment
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing RuntimeEnvironment...');
      
      // Initialize components
      await this.containerManager.initialize();
      await this.executionEngine.initialize();
      await this.securityManager.initialize();
      await this.resourceMonitor.initialize();
      
      this.initialized = true;
      this.logger.info('RuntimeEnvironment initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`RuntimeEnvironment initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start the runtime environment
   * @returns {Promise<boolean>} - Resolves to true if startup is successful
   */
  async start() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      this.logger.info('Starting RuntimeEnvironment...');
      
      // Nothing specific to start, components are already initialized
      
      this.logger.info('RuntimeEnvironment started successfully');
      return true;
    } catch (error) {
      this.logger.error(`RuntimeEnvironment startup failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the runtime environment
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      if (!this.initialized) {
        this.logger.warn('RuntimeEnvironment not initialized, nothing to stop');
        return false;
      }
      
      this.logger.info('Stopping RuntimeEnvironment...');
      
      // Stop all agent containers
      const containers = await this.containerManager.listContainers();
      for (const container of containers) {
        try {
          await this.containerManager.stopContainer(container.agentId);
        } catch (error) {
          this.logger.error(`Failed to stop container for agent ${container.agentId}: ${error.message}`);
        }
      }
      
      this.initialized = false;
      this.logger.info('RuntimeEnvironment stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`RuntimeEnvironment shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new agent container
   * @param {string} agentId - Agent ID
   * @param {Object} options - Container options
   * @returns {Promise<Object>} - Container information
   */
  async createAgentContainer(agentId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('RuntimeEnvironment not initialized');
      }
      
      this.logger.info(`Creating container for agent ${agentId}`);
      
      // Create container
      const container = await this.containerManager.createContainer(agentId, options);
      
      // Apply security policy
      await this.securityManager.applySecurityPolicy(agentId, options.securityPolicy || {});
      
      // Start container
      await this.containerManager.startContainer(agentId);
      
      // Start monitoring
      await this.resourceMonitor.startMonitoring(agentId);
      
      return container;
    } catch (error) {
      this.logger.error(`Failed to create container for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Destroy an agent container
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if destruction is successful
   */
  async destroyAgentContainer(agentId) {
    try {
      if (!this.initialized) {
        throw new Error('RuntimeEnvironment not initialized');
      }
      
      this.logger.info(`Destroying container for agent ${agentId}`);
      
      // Stop monitoring
      await this.resourceMonitor.stopMonitoring(agentId);
      
      // Remove container
      const result = await this.containerManager.removeContainer(agentId);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to destroy container for agent ${agentId}: ${error.message}`, error);
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
        throw new Error('RuntimeEnvironment not initialized');
      }
      
      this.logger.info(`Executing ${language} code for agent ${agentId}`);
      
      // Execute code
      const result = await this.executionEngine.executeCode(agentId, code, language, { timeout });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to execute code for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Monitor resource usage for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Resource usage information
   */
  async monitorResources(agentId) {
    try {
      if (!this.initialized) {
        throw new Error('RuntimeEnvironment not initialized');
      }
      
      // Get resource usage
      const usage = await this.resourceMonitor.getResourceUsage(agentId);
      
      // Enforce resource limits
      await this.resourceMonitor.enforceResourceLimits(agentId);
      
      return usage;
    } catch (error) {
      this.logger.error(`Failed to monitor resources for agent ${agentId}: ${error.message}`, error);
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
        throw new Error('RuntimeEnvironment not initialized');
      }
      
      // Get container status
      const status = await this.containerManager.getContainerStatus(agentId);
      
      // Get security status
      let securityStatus;
      try {
        securityStatus = this.securityManager.getSecurityStatus(agentId);
      } catch (error) {
        securityStatus = { status: 'unknown' };
      }
      
      // Get resource usage
      let resourceUsage;
      try {
        resourceUsage = await this.resourceMonitor.getResourceUsage(agentId);
      } catch (error) {
        resourceUsage = { current: {} };
      }
      
      return {
        ...status,
        security: securityStatus,
        resources: resourceUsage.current
      };
    } catch (error) {
      this.logger.error(`Failed to get container status for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = RuntimeEnvironment;
