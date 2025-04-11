/**
 * Security Manager for DevSparkAgent Playground
 * 
 * Enforces security policies and monitors for violations.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

class SecurityManager {
  /**
   * Create a new SecurityManager instance
   * @param {Object} config - Configuration options
   * @param {ContainerManager} containerManager - Container manager instance
   */
  constructor(config, containerManager) {
    this.config = config;
    this.containerManager = containerManager;
    this.securityPolicies = new Map();
    this.violations = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the security manager
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing SecurityManager...');
      
      // Load default security policies
      await this._loadDefaultPolicies();
      
      // Start monitoring interval
      this._startMonitoring();
      
      this.logger.info('SecurityManager initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`SecurityManager initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Apply security policy to an agent
   * @param {string} agentId - Agent ID
   * @param {Object} policy - Security policy
   * @returns {Promise<boolean>} - Resolves to true if policy is applied successfully
   */
  async applySecurityPolicy(agentId, policy) {
    try {
      this.logger.info(`Applying security policy to agent ${agentId}`);
      
      // Merge with default policy
      const defaultPolicy = this._getDefaultPolicy();
      const mergedPolicy = {
        ...defaultPolicy,
        ...policy,
        capabilities: [...(defaultPolicy.capabilities || []), ...(policy.capabilities || [])]
      };
      
      // Store policy
      this.securityPolicies.set(agentId, mergedPolicy);
      
      // Apply policy to container if running
      try {
        const containerStatus = await this.containerManager.getContainerStatus(agentId);
        if (containerStatus.status === 'running') {
          await this._applyPolicyToContainer(agentId, mergedPolicy);
        }
      } catch (error) {
        // Container might not exist yet, that's okay
        this.logger.warn(`Container for agent ${agentId} not found, policy will be applied when created`);
      }
      
      this.logger.info(`Security policy applied to agent ${agentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to apply security policy to agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Monitor security violations for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Array<Object>>} - List of security violations
   */
  async monitorSecurityViolations(agentId) {
    try {
      // Check if agent exists
      if (!this.securityPolicies.has(agentId)) {
        throw new Error(`No security policy found for agent ${agentId}`);
      }
      
      // Get container status
      let containerStatus;
      try {
        containerStatus = await this.containerManager.getContainerStatus(agentId);
      } catch (error) {
        // Container might not exist
        return [];
      }
      
      if (containerStatus.status !== 'running') {
        // Container not running, no violations
        return [];
      }
      
      // Get security policy
      const policy = this.securityPolicies.get(agentId);
      
      // Check for violations
      const violations = await this._checkViolations(agentId, policy);
      
      // Store violations
      if (violations.length > 0) {
        if (!this.violations.has(agentId)) {
          this.violations.set(agentId, []);
        }
        
        const agentViolations = this.violations.get(agentId);
        agentViolations.push(...violations);
        
        // Limit violations history
        const maxViolations = 100;
        if (agentViolations.length > maxViolations) {
          agentViolations.splice(0, agentViolations.length - maxViolations);
        }
      }
      
      return violations;
    } catch (error) {
      this.logger.error(`Failed to monitor security violations for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Handle security violation
   * @param {string} agentId - Agent ID
   * @param {Object} violation - Violation details
   * @returns {Promise<Object>} - Action taken
   */
  async handleSecurityViolation(agentId, violation) {
    try {
      this.logger.warn(`Handling security violation for agent ${agentId}: ${violation.type}`);
      
      // Get security policy
      const policy = this.securityPolicies.get(agentId);
      if (!policy) {
        throw new Error(`No security policy found for agent ${agentId}`);
      }
      
      // Determine action based on violation type and policy
      let action;
      switch (violation.type) {
        case 'resource_limit':
          action = policy.resourceViolationAction || 'warn';
          break;
        case 'network_access':
          action = policy.networkViolationAction || 'block';
          break;
        case 'file_access':
          action = policy.fileViolationAction || 'block';
          break;
        case 'process_spawn':
          action = policy.processViolationAction || 'block';
          break;
        default:
          action = 'warn';
      }
      
      // Take action
      const result = await this._takeAction(agentId, violation, action);
      
      // Log violation and action
      this.logger.warn(`Security violation for agent ${agentId}: ${violation.type}, action: ${action}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to handle security violation for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get security status for an agent
   * @param {string} agentId - Agent ID
   * @returns {Object} - Security status
   */
  getSecurityStatus(agentId) {
    // Check if agent exists
    if (!this.securityPolicies.has(agentId)) {
      throw new Error(`No security policy found for agent ${agentId}`);
    }
    
    // Get policy and violations
    const policy = this.securityPolicies.get(agentId);
    const violations = this.violations.get(agentId) || [];
    
    return {
      agentId,
      policy: {
        isolationLevel: policy.isolationLevel,
        capabilities: policy.capabilities,
        resourceLimits: policy.resourceLimits
      },
      violations: violations.slice(-10), // Return last 10 violations
      violationCount: violations.length,
      status: violations.length > 0 ? 'violations_detected' : 'secure'
    };
  }

  /**
   * Load default security policies
   * @private
   * @returns {Promise<void>}
   */
  async _loadDefaultPolicies() {
    // In a real implementation, this would load policies from a file or database
    // For now, we'll use the config
    this.logger.info('Loading default security policies');
  }

  /**
   * Get default security policy
   * @private
   * @returns {Object} - Default security policy
   */
  _getDefaultPolicy() {
    return {
      isolationLevel: this.config.security.isolationLevel,
      capabilities: this.config.security.capabilities,
      resourceLimits: this.config.container.resourceLimits,
      resourceViolationAction: 'warn',
      networkViolationAction: 'block',
      fileViolationAction: 'block',
      processViolationAction: 'block'
    };
  }

  /**
   * Apply security policy to container
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} policy - Security policy
   * @returns {Promise<void>}
   */
  async _applyPolicyToContainer(agentId, policy) {
    try {
      // In a real implementation, this would update the container's security settings
      // For now, we'll just log it
      this.logger.info(`Applying security policy to container for agent ${agentId}`);
      
      // Apply seccomp profile
      const seccompProfile = this._getSeccompProfile(policy.isolationLevel);
      
      // Apply capabilities
      const capabilities = policy.capabilities || [];
      
      // Apply resource limits
      const resourceLimits = policy.resourceLimits || {};
      
      // In a real implementation, this would update the container
      this.logger.info(`Applied security policy to container for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Failed to apply security policy to container for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get seccomp profile based on isolation level
   * @private
   * @param {string} isolationLevel - Isolation level
   * @returns {Object} - Seccomp profile
   */
  _getSeccompProfile(isolationLevel) {
    // In a real implementation, this would return a seccomp profile
    // For now, we'll return a placeholder
    switch (isolationLevel) {
      case 'high':
        return { defaultAction: 'SCMP_ACT_ERRNO' };
      case 'medium':
        return { defaultAction: 'SCMP_ACT_ERRNO' };
      case 'low':
        return { defaultAction: 'SCMP_ACT_TRACE' };
      default:
        return { defaultAction: 'SCMP_ACT_ERRNO' };
    }
  }

  /**
   * Start monitoring for security violations
   * @private
   * @returns {void}
   */
  _startMonitoring() {
    const interval = this.config.security.monitoringInterval || 1000;
    
    // Start monitoring interval
    setInterval(async () => {
      try {
        // Monitor all agents
        for (const [agentId, policy] of this.securityPolicies.entries()) {
          try {
            const violations = await this.monitorSecurityViolations(agentId);
            
            // Handle violations
            for (const violation of violations) {
              await this.handleSecurityViolation(agentId, violation);
            }
          } catch (error) {
            // Ignore errors for individual agents
            this.logger.error(`Error monitoring agent ${agentId}: ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error in security monitoring: ${error.message}`);
      }
    }, interval);
    
    this.logger.info(`Started security monitoring with interval ${interval}ms`);
  }

  /**
   * Check for security violations
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} policy - Security policy
   * @returns {Promise<Array<Object>>} - List of violations
   */
  async _checkViolations(agentId, policy) {
    try {
      const violations = [];
      
      // Check resource usage
      try {
        const stats = await this.containerManager.getContainerStats(agentId);
        
        // Check CPU usage
        const cpuLimit = policy.resourceLimits.cpu * 100;
        if (stats.cpu.percentage > cpuLimit) {
          violations.push({
            type: 'resource_limit',
            resource: 'cpu',
            limit: cpuLimit,
            actual: stats.cpu.percentage,
            timestamp: new Date()
          });
        }
        
        // Check memory usage
        const memoryLimit = policy.resourceLimits.memory;
        if (stats.memory.usage > memoryLimit) {
          violations.push({
            type: 'resource_limit',
            resource: 'memory',
            limit: memoryLimit,
            actual: stats.memory.usage,
            timestamp: new Date()
          });
        }
      } catch (error) {
        // Ignore errors getting stats
        this.logger.error(`Error getting stats for agent ${agentId}: ${error.message}`);
      }
      
      // In a real implementation, we would check for other violations:
      // - Network access violations
      // - File access violations
      // - Process spawn violations
      
      return violations;
    } catch (error) {
      this.logger.error(`Failed to check violations for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Take action for a security violation
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} violation - Violation details
   * @param {string} action - Action to take
   * @returns {Promise<Object>} - Action result
   */
  async _takeAction(agentId, violation, action) {
    try {
      switch (action) {
        case 'warn':
          // Just log a warning
          this.logger.warn(`Security violation warning for agent ${agentId}: ${violation.type}`);
          return { action, success: true };
        
        case 'block':
          // Block the operation
          this.logger.warn(`Blocking operation for agent ${agentId} due to ${violation.type} violation`);
          return { action, success: true };
        
        case 'throttle':
          // Throttle the resource
          this.logger.warn(`Throttling resources for agent ${agentId} due to ${violation.type} violation`);
          return { action, success: true };
        
        case 'terminate':
          // Terminate the container
          this.logger.warn(`Terminating container for agent ${agentId} due to ${violation.type} violation`);
          await this.containerManager.stopContainer(agentId);
          return { action, success: true };
        
        default:
          this.logger.warn(`Unknown action ${action} for violation ${violation.type}`);
          return { action: 'warn', success: true };
      }
    } catch (error) {
      this.logger.error(`Failed to take action for violation: ${error.message}`, error);
      return { action, success: false, error: error.message };
    }
  }
}

module.exports = SecurityManager;
