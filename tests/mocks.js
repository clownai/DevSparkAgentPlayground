/**
 * Mock implementation for testing without Docker dependencies
 * 
 * This file provides mock implementations of the Docker-dependent components
 * to allow testing without installing external dependencies.
 */

// Mock ContainerManager
class MockContainerManager {
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.containers = new Map();
  }

  async initialize() {
    this.initialized = true;
    return true;
  }

  async createContainer(containerId, options = {}) {
    if (this.containers.has(containerId)) {
      return false;
    }
    
    this.containers.set(containerId, {
      id: containerId,
      status: 'running',
      created: new Date(),
      options: options,
      memoryUsage: 0,
      cpuUsage: 0
    });
    
    return true;
  }

  async removeContainer(containerId) {
    if (!this.containers.has(containerId)) {
      return false;
    }
    
    this.containers.delete(containerId);
    return true;
  }

  async containerExists(containerId) {
    return this.containers.has(containerId);
  }

  async getContainerStatus(containerId) {
    if (!this.containers.has(containerId)) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    return this.containers.get(containerId);
  }

  async listContainers() {
    return Array.from(this.containers.values());
  }

  async startContainer(containerId) {
    if (!this.containers.has(containerId)) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    const container = this.containers.get(containerId);
    container.status = 'running';
    
    return true;
  }

  async stopContainer(containerId) {
    if (!this.containers.has(containerId)) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    const container = this.containers.get(containerId);
    container.status = 'stopped';
    
    return true;
  }

  async restartContainer(containerId) {
    if (!this.containers.has(containerId)) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    const container = this.containers.get(containerId);
    container.status = 'running';
    
    return true;
  }

  async pauseContainer(containerId) {
    if (!this.containers.has(containerId)) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    const container = this.containers.get(containerId);
    container.status = 'paused';
    
    return true;
  }

  async unpauseContainer(containerId) {
    if (!this.containers.has(containerId)) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    const container = this.containers.get(containerId);
    container.status = 'running';
    
    return true;
  }
}

// Mock ExecutionEngine
class MockExecutionEngine {
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.executions = new Map();
  }

  async initialize() {
    this.initialized = true;
    return true;
  }

  async executeCode(containerId, code, language, timeoutSeconds = 30) {
    if (language !== 'javascript' && language !== 'python' && language !== 'bash') {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    if (code.includes('while(true)') || code.includes('while (true)') || code.includes('while True')) {
      throw new Error('Execution timed out');
    }
    
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const result = {
      id: executionId,
      containerId,
      language,
      code,
      success: true,
      output: `Executed ${language} code in container ${containerId}\nOutput: Hello, world!`,
      error: null,
      startTime: new Date(),
      endTime: new Date(Date.now() + 100),
      exitCode: 0
    };
    
    this.executions.set(executionId, result);
    
    return result;
  }

  async getExecutionResult(executionId) {
    if (!this.executions.has(executionId)) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    return this.executions.get(executionId);
  }

  async listExecutions(containerId = null) {
    if (containerId) {
      return Array.from(this.executions.values()).filter(execution => execution.containerId === containerId);
    }
    
    return Array.from(this.executions.values());
  }
}

// Mock SecurityManager
class MockSecurityManager {
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.securityPolicies = new Map();
  }

  async initialize() {
    this.initialized = true;
    return true;
  }

  validatePolicy(policy) {
    const requiredFields = ['allowNetwork', 'allowFileSystem', 'allowSubprocesses'];
    
    for (const field of requiredFields) {
      if (typeof policy[field] !== 'boolean') {
        return {
          valid: false,
          error: `Invalid value for ${field}: expected boolean, got ${typeof policy[field]}`
        };
      }
    }
    
    return {
      valid: true,
      error: null
    };
  }

  async setSecurityPolicy(containerId, policy) {
    const validationResult = this.validatePolicy(policy);
    
    if (!validationResult.valid) {
      throw new Error(`Invalid security policy: ${validationResult.error}`);
    }
    
    this.securityPolicies.set(containerId, policy);
    
    return true;
  }

  async getSecurityPolicy(containerId) {
    if (!this.securityPolicies.has(containerId)) {
      return this.config.securityOptions;
    }
    
    return this.securityPolicies.get(containerId);
  }

  checkCodeSecurity(code, language) {
    const dangerousPatterns = {
      javascript: [
        'require("fs")',
        'require("child_process")',
        'process.exit',
        'eval(',
        'Function('
      ],
      python: [
        'import os',
        'import subprocess',
        'import sys',
        'exec(',
        'eval('
      ],
      bash: [
        'rm -rf',
        '/etc/passwd',
        'sudo',
        '> /dev/'
      ]
    };
    
    if (!dangerousPatterns[language]) {
      return {
        safe: false,
        error: `Unsupported language: ${language}`
      };
    }
    
    for (const pattern of dangerousPatterns[language]) {
      if (code.includes(pattern)) {
        return {
          safe: false,
          error: `Code contains dangerous pattern: ${pattern}`
        };
      }
    }
    
    return {
      safe: true,
      error: null
    };
  }

  async enforceSecurityPolicy(containerId, code, language) {
    const policy = await this.getSecurityPolicy(containerId);
    const securityCheck = this.checkCodeSecurity(code, language);
    
    if (!securityCheck.safe) {
      if (
        (securityCheck.error.includes('fs') && !policy.allowFileSystem) ||
        (securityCheck.error.includes('child_process') && !policy.allowSubprocesses) ||
        (securityCheck.error.includes('http') && !policy.allowNetwork)
      ) {
        throw new Error(`Security policy violation: ${securityCheck.error}`);
      }
    }
    
    return true;
  }
}

// Mock ResourceMonitor
class MockResourceMonitor {
  constructor(config) {
    this.config = config;
    this.initialized = false;
    this.resourceUsage = new Map();
  }

  async initialize() {
    this.initialized = true;
    return true;
  }

  async getResourceUsage(containerId) {
    if (!this.resourceUsage.has(containerId)) {
      this.resourceUsage.set(containerId, {
        containerId,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 0.5,
        timestamp: new Date()
      });
    }
    
    return this.resourceUsage.get(containerId);
  }

  async monitorResources(containerId) {
    return this.getResourceUsage(containerId);
  }

  checkResourceLimits(containerId, resources) {
    const limits = this.config.containerOptions;
    
    const memoryLimit = parseInt(limits.memoryLimit);
    const cpuLimit = parseFloat(limits.cpuLimit);
    
    return resources.memoryUsage <= memoryLimit && resources.cpuUsage <= cpuLimit;
  }

  async setResourceLimits(containerId, limits) {
    // In a real implementation, this would set resource limits on the container
    return true;
  }
}

module.exports = {
  MockContainerManager,
  MockExecutionEngine,
  MockSecurityManager,
  MockResourceMonitor
};
