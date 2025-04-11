/**
 * Resource Monitor for DevSparkAgent Playground
 * 
 * Tracks and limits resource usage by agent containers.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

class ResourceMonitor {
  /**
   * Create a new ResourceMonitor instance
   * @param {Object} config - Configuration options
   * @param {ContainerManager} containerManager - Container manager instance
   * @param {SecurityManager} securityManager - Security manager instance
   */
  constructor(config, containerManager, securityManager) {
    this.config = config;
    this.containerManager = containerManager;
    this.securityManager = securityManager;
    this.resourceUsage = new Map();
    this.monitoringIntervals = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the resource monitor
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing ResourceMonitor...');
      
      // Create resource usage directory
      const resourceDir = path.join(process.cwd(), 'data', 'resources');
      await promisify(fs.mkdir)(resourceDir, { recursive: true });
      
      this.logger.info('ResourceMonitor initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`ResourceMonitor initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start monitoring an agent's resource usage
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if monitoring started successfully
   */
  async startMonitoring(agentId) {
    try {
      // Check if already monitoring
      if (this.monitoringIntervals.has(agentId)) {
        this.logger.warn(`Already monitoring agent ${agentId}`);
        return true;
      }
      
      this.logger.info(`Starting resource monitoring for agent ${agentId}`);
      
      // Initialize resource usage tracking
      this.resourceUsage.set(agentId, {
        agentId,
        current: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: {
            rx: 0,
            tx: 0
          }
        },
        history: [],
        violations: [],
        startTime: new Date(),
        lastUpdated: new Date()
      });
      
      // Set monitoring interval
      const interval = setInterval(async () => {
        try {
          await this._updateResourceUsage(agentId);
        } catch (error) {
          this.logger.error(`Error updating resource usage for agent ${agentId}: ${error.message}`);
          
          // Check if container still exists
          try {
            await this.containerManager.getContainerStatus(agentId);
          } catch (containerError) {
            // Container doesn't exist, stop monitoring
            this.logger.warn(`Container for agent ${agentId} no longer exists, stopping monitoring`);
            await this.stopMonitoring(agentId);
          }
        }
      }, this.config.security.monitoringInterval || 1000);
      
      // Store interval
      this.monitoringIntervals.set(agentId, interval);
      
      this.logger.info(`Resource monitoring started for agent ${agentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to start monitoring for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop monitoring an agent's resource usage
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if monitoring stopped successfully
   */
  async stopMonitoring(agentId) {
    try {
      // Check if monitoring
      if (!this.monitoringIntervals.has(agentId)) {
        this.logger.warn(`Not monitoring agent ${agentId}`);
        return false;
      }
      
      this.logger.info(`Stopping resource monitoring for agent ${agentId}`);
      
      // Clear interval
      clearInterval(this.monitoringIntervals.get(agentId));
      this.monitoringIntervals.delete(agentId);
      
      // Save final resource usage
      await this._saveResourceUsage(agentId);
      
      this.logger.info(`Resource monitoring stopped for agent ${agentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to stop monitoring for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get resource usage for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Resource usage information
   */
  async getResourceUsage(agentId) {
    try {
      // Check if monitoring
      if (!this.resourceUsage.has(agentId)) {
        throw new Error(`Not monitoring agent ${agentId}`);
      }
      
      // Get latest resource usage
      await this._updateResourceUsage(agentId);
      
      const usage = this.resourceUsage.get(agentId);
      
      return {
        agentId,
        current: usage.current,
        history: usage.history.slice(-10), // Return last 10 data points
        violations: usage.violations.slice(-10), // Return last 10 violations
        startTime: usage.startTime,
        lastUpdated: usage.lastUpdated,
        duration: usage.lastUpdated - usage.startTime
      };
    } catch (error) {
      this.logger.error(`Failed to get resource usage for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Enforce resource limits for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Enforcement result
   */
  async enforceResourceLimits(agentId) {
    try {
      // Check if monitoring
      if (!this.resourceUsage.has(agentId)) {
        throw new Error(`Not monitoring agent ${agentId}`);
      }
      
      this.logger.info(`Enforcing resource limits for agent ${agentId}`);
      
      // Get latest resource usage
      await this._updateResourceUsage(agentId);
      
      const usage = this.resourceUsage.get(agentId);
      
      // Get security policy
      let policy;
      try {
        const securityStatus = this.securityManager.getSecurityStatus(agentId);
        policy = securityStatus.policy;
      } catch (error) {
        // No security policy, use default
        policy = {
          resourceLimits: this.config.container.resourceLimits
        };
      }
      
      // Check for violations
      const violations = [];
      
      // Check CPU usage
      const cpuLimit = policy.resourceLimits.cpu * 100;
      if (usage.current.cpu > cpuLimit) {
        violations.push({
          type: 'resource_limit',
          resource: 'cpu',
          limit: cpuLimit,
          actual: usage.current.cpu,
          timestamp: new Date()
        });
      }
      
      // Check memory usage
      const memoryLimit = this._parseMemory(policy.resourceLimits.memory);
      if (usage.current.memory > memoryLimit) {
        violations.push({
          type: 'resource_limit',
          resource: 'memory',
          limit: memoryLimit,
          actual: usage.current.memory,
          timestamp: new Date()
        });
      }
      
      // Check disk usage
      const diskLimit = this._parseMemory(policy.resourceLimits.disk);
      if (usage.current.disk > diskLimit) {
        violations.push({
          type: 'resource_limit',
          resource: 'disk',
          limit: diskLimit,
          actual: usage.current.disk,
          timestamp: new Date()
        });
      }
      
      // Handle violations
      const results = [];
      for (const violation of violations) {
        // Add to violations list
        usage.violations.push(violation);
        
        // Handle violation
        const result = await this.handleResourceViolation(agentId, violation);
        results.push(result);
      }
      
      // Limit violations history
      const maxViolations = 100;
      if (usage.violations.length > maxViolations) {
        usage.violations.splice(0, usage.violations.length - maxViolations);
      }
      
      return {
        agentId,
        violations,
        results
      };
    } catch (error) {
      this.logger.error(`Failed to enforce resource limits for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Handle resource violation
   * @param {string} agentId - Agent ID
   * @param {Object} violation - Violation details
   * @returns {Promise<Object>} - Action taken
   */
  async handleResourceViolation(agentId, violation) {
    try {
      this.logger.warn(`Handling resource violation for agent ${agentId}: ${violation.resource}`);
      
      // Get security policy
      let policy;
      try {
        const securityStatus = this.securityManager.getSecurityStatus(agentId);
        policy = securityStatus.policy;
      } catch (error) {
        // No security policy, use default
        policy = {
          resourceViolationAction: 'warn'
        };
      }
      
      // Determine action based on violation type and policy
      const action = policy.resourceViolationAction || 'warn';
      
      // Take action
      let result;
      switch (action) {
        case 'warn':
          // Just log a warning
          this.logger.warn(`Resource violation warning for agent ${agentId}: ${violation.resource}`);
          result = { action, success: true };
          break;
        
        case 'throttle':
          // Throttle the resource
          this.logger.warn(`Throttling ${violation.resource} for agent ${agentId}`);
          result = await this._throttleResource(agentId, violation.resource);
          break;
        
        case 'terminate':
          // Terminate the container
          this.logger.warn(`Terminating container for agent ${agentId} due to ${violation.resource} violation`);
          await this.containerManager.stopContainer(agentId);
          result = { action, success: true };
          break;
        
        default:
          this.logger.warn(`Unknown action ${action} for violation ${violation.resource}`);
          result = { action: 'warn', success: true };
      }
      
      return {
        violation,
        action,
        result
      };
    } catch (error) {
      this.logger.error(`Failed to handle resource violation for agent ${agentId}: ${error.message}`, error);
      return {
        violation,
        action: 'error',
        result: { success: false, error: error.message }
      };
    }
  }

  /**
   * Update resource usage for an agent
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _updateResourceUsage(agentId) {
    try {
      // Get container stats
      const stats = await this.containerManager.getContainerStats(agentId);
      
      // Get current usage
      const usage = this.resourceUsage.get(agentId);
      
      // Update current usage
      usage.current = {
        cpu: stats.cpu.percentage,
        memory: stats.memory.usage,
        disk: 0, // Not available from Docker stats
        network: {
          rx: stats.network.rx,
          tx: stats.network.tx
        }
      };
      
      // Add to history
      usage.history.push({
        timestamp: new Date(),
        cpu: usage.current.cpu,
        memory: usage.current.memory,
        disk: usage.current.disk,
        network: { ...usage.current.network }
      });
      
      // Limit history size
      const maxHistory = 100;
      if (usage.history.length > maxHistory) {
        usage.history.splice(0, usage.history.length - maxHistory);
      }
      
      // Update last updated timestamp
      usage.lastUpdated = new Date();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save resource usage to disk
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _saveResourceUsage(agentId) {
    try {
      // Check if monitoring
      if (!this.resourceUsage.has(agentId)) {
        return;
      }
      
      const usage = this.resourceUsage.get(agentId);
      
      // Save to file
      const resourceDir = path.join(process.cwd(), 'data', 'resources');
      const filePath = path.join(resourceDir, `${agentId}.json`);
      
      await promisify(fs.writeFile)(
        filePath,
        JSON.stringify(usage, null, 2),
        'utf8'
      );
      
      this.logger.info(`Resource usage saved for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Failed to save resource usage for agent ${agentId}: ${error.message}`, error);
    }
  }

  /**
   * Throttle a resource for an agent
   * @private
   * @param {string} agentId - Agent ID
   * @param {string} resource - Resource to throttle
   * @returns {Promise<Object>} - Throttle result
   */
  async _throttleResource(agentId, resource) {
    try {
      // In a real implementation, this would update the container's resource limits
      // For now, we'll just log it
      this.logger.info(`Throttling ${resource} for agent ${agentId}`);
      
      return { action: 'throttle', success: true };
    } catch (error) {
      this.logger.error(`Failed to throttle ${resource} for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Parse memory string to bytes
   * @private
   * @param {string|number} memory - Memory string (e.g., '1Gi', '512Mi') or number in bytes
   * @returns {number} - Memory in bytes
   */
  _parseMemory(memory) {
    if (typeof memory === 'number') {
      return memory;
    }
    
    const units = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
      t: 1024 * 1024 * 1024 * 1024
    };
    
    const match = memory.toLowerCase().match(/^(\d+)([kmgt]?i?)$/);
    if (!match) {
      return parseInt(memory, 10);
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2].charAt(0);
    
    return value * (units[unit] || 1);
  }
}

module.exports = ResourceMonitor;
