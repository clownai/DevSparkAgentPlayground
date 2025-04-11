/**
 * Execution Engine for DevSparkAgent Playground
 * 
 * Manages code execution within containers.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

class ExecutionEngine {
  /**
   * Create a new ExecutionEngine instance
   * @param {Object} config - Configuration options
   * @param {ContainerManager} containerManager - Container manager instance
   */
  constructor(config, containerManager) {
    this.config = config;
    this.containerManager = containerManager;
    this.executions = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the execution engine
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing ExecutionEngine...');
      
      // Ensure execution directory exists
      const executionDir = path.join(process.cwd(), 'data', 'executions');
      await mkdir(executionDir, { recursive: true });
      
      this.logger.info('ExecutionEngine initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`ExecutionEngine initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Execute code in a container
   * @param {string} agentId - Agent ID
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeCode(agentId, code, language, options = {}) {
    try {
      // Generate execution ID
      const executionId = uuidv4();
      
      // Set default timeout
      const timeout = options.timeout || this.config.execution.timeoutDefault;
      
      // Create execution record
      const execution = {
        id: executionId,
        agentId,
        language,
        status: 'pending',
        startTime: new Date(),
        endTime: null,
        duration: null,
        exitCode: null,
        output: '',
        error: '',
        options
      };
      
      // Store execution record
      this.executions.set(executionId, execution);
      
      // Log execution start
      this.logger.info(`Starting execution ${executionId} for agent ${agentId} (language: ${language})`);
      
      // Check if container is running
      const containerStatus = await this.containerManager.getContainerStatus(agentId);
      if (containerStatus.status !== 'running') {
        throw new Error(`Container for agent ${agentId} is not running`);
      }
      
      // Prepare execution
      await this._prepareExecution(agentId, executionId, code, language, options);
      
      // Execute code
      execution.status = 'running';
      const result = await this._executeCode(agentId, executionId, language, timeout);
      
      // Update execution record
      execution.status = result.exitCode === 0 ? 'completed' : 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      execution.exitCode = result.exitCode;
      execution.output = result.output;
      execution.error = result.error;
      
      // Log execution end
      this.logger.info(`Execution ${executionId} for agent ${agentId} ${execution.status} (exit code: ${execution.exitCode})`);
      
      return {
        id: executionId,
        agentId,
        language,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        exitCode: execution.exitCode,
        output: execution.output,
        error: execution.error
      };
    } catch (error) {
      this.logger.error(`Failed to execute code for agent ${agentId}: ${error.message}`, error);
      
      // Create failed execution record if not already created
      const executionId = uuidv4();
      const execution = {
        id: executionId,
        agentId,
        language,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        exitCode: 1,
        output: '',
        error: error.message,
        options
      };
      
      // Store execution record
      this.executions.set(executionId, execution);
      
      return {
        id: executionId,
        agentId,
        language,
        status: 'failed',
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        exitCode: execution.exitCode,
        output: execution.output,
        error: execution.error
      };
    }
  }

  /**
   * Get execution result
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object>} - Execution result
   */
  async getExecutionResult(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    return {
      id: execution.id,
      agentId: execution.agentId,
      language: execution.language,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration,
      exitCode: execution.exitCode,
      output: execution.output,
      error: execution.error
    };
  }

  /**
   * Terminate execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} - Resolves to true if termination is successful
   */
  async terminateExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (execution.status !== 'running') {
      this.logger.warn(`Execution ${executionId} is not running, cannot terminate`);
      return false;
    }
    
    try {
      // Terminate execution
      this.logger.info(`Terminating execution ${executionId} for agent ${execution.agentId}`);
      
      // In a real implementation, this would terminate the process
      // For now, we'll just update the execution record
      execution.status = 'terminated';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      execution.exitCode = -1;
      execution.error = 'Execution terminated';
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to terminate execution ${executionId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Setup language runtime in container
   * @param {string} agentId - Agent ID
   * @param {string} language - Programming language
   * @returns {Promise<boolean>} - Resolves to true if setup is successful
   */
  async setupLanguageRuntime(agentId, language) {
    try {
      this.logger.info(`Setting up ${language} runtime for agent ${agentId}`);
      
      // Check if container is running
      const containerStatus = await this.containerManager.getContainerStatus(agentId);
      if (containerStatus.status !== 'running') {
        throw new Error(`Container for agent ${agentId} is not running`);
      }
      
      // Setup language runtime based on language
      switch (language.toLowerCase()) {
        case 'python':
          await this._setupPythonRuntime(agentId);
          break;
        case 'javascript':
        case 'js':
          await this._setupJavaScriptRuntime(agentId);
          break;
        case 'typescript':
        case 'ts':
          await this._setupTypeScriptRuntime(agentId);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
      
      this.logger.info(`${language} runtime setup completed for agent ${agentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to setup ${language} runtime for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Prepare execution
   * @private
   * @param {string} agentId - Agent ID
   * @param {string} executionId - Execution ID
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @param {Object} options - Execution options
   * @returns {Promise<void>}
   */
  async _prepareExecution(agentId, executionId, code, language, options) {
    try {
      // Create execution directory in container
      const execDir = `/agent/executions/${executionId}`;
      await this.containerManager.executeCommand(agentId, ['mkdir', '-p', execDir]);
      
      // Write code file
      const codeFile = this._getCodeFileName(language);
      const codeFilePath = `${execDir}/${codeFile}`;
      
      // Write code to file in container
      await this.containerManager.executeCommand(agentId, ['bash', '-c', `cat > ${codeFilePath} << 'EOF'
${code}
EOF`]);
      
      // Write any additional files
      if (options.files) {
        for (const [fileName, fileContent] of Object.entries(options.files)) {
          const filePath = `${execDir}/${fileName}`;
          await this.containerManager.executeCommand(agentId, ['bash', '-c', `cat > ${filePath} << 'EOF'
${fileContent}
EOF`]);
        }
      }
      
      // Setup language runtime if needed
      if (options.setupRuntime) {
        await this.setupLanguageRuntime(agentId, language);
      }
    } catch (error) {
      this.logger.error(`Failed to prepare execution ${executionId} for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Execute code
   * @private
   * @param {string} agentId - Agent ID
   * @param {string} executionId - Execution ID
   * @param {string} language - Programming language
   * @param {number} timeout - Execution timeout in milliseconds
   * @returns {Promise<Object>} - Execution result
   */
  async _executeCode(agentId, executionId, language, timeout) {
    try {
      // Get execution command
      const execDir = `/agent/executions/${executionId}`;
      const codeFile = this._getCodeFileName(language);
      const command = this._getExecutionCommand(language, `${execDir}/${codeFile}`);
      
      // Execute command with timeout
      const result = await Promise.race([
        this.containerManager.executeCommand(agentId, command, { WorkingDir: execDir }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Execution timed out after ${timeout}ms`)), timeout);
        })
      ]);
      
      return result;
    } catch (error) {
      if (error.message.includes('timed out')) {
        // Execution timed out
        this.logger.warn(`Execution ${executionId} for agent ${agentId} timed out after ${timeout}ms`);
        
        return {
          exitCode: 1,
          output: '',
          error: `Execution timed out after ${timeout}ms`
        };
      }
      
      this.logger.error(`Failed to execute code for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get code file name based on language
   * @private
   * @param {string} language - Programming language
   * @returns {string} - Code file name
   */
  _getCodeFileName(language) {
    switch (language.toLowerCase()) {
      case 'python':
        return 'code.py';
      case 'javascript':
      case 'js':
        return 'code.js';
      case 'typescript':
      case 'ts':
        return 'code.ts';
      default:
        return 'code.txt';
    }
  }

  /**
   * Get execution command based on language
   * @private
   * @param {string} language - Programming language
   * @param {string} filePath - Code file path
   * @returns {Array<string>} - Execution command
   */
  _getExecutionCommand(language, filePath) {
    switch (language.toLowerCase()) {
      case 'python':
        return ['python3', filePath];
      case 'javascript':
      case 'js':
        return ['node', filePath];
      case 'typescript':
      case 'ts':
        return ['npx', 'ts-node', filePath];
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Setup Python runtime
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _setupPythonRuntime(agentId) {
    try {
      // Check if Python is installed
      const result = await this.containerManager.executeCommand(agentId, ['which', 'python3']);
      
      if (result.exitCode !== 0) {
        // Install Python
        await this.containerManager.executeCommand(agentId, ['apt-get', 'update']);
        await this.containerManager.executeCommand(agentId, ['apt-get', 'install', '-y', 'python3', 'python3-pip']);
      }
      
      // Install common packages
      await this.containerManager.executeCommand(agentId, ['pip3', 'install', 'numpy', 'pandas', 'matplotlib', 'scikit-learn', 'tensorflow']);
    } catch (error) {
      this.logger.error(`Failed to setup Python runtime for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Setup JavaScript runtime
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _setupJavaScriptRuntime(agentId) {
    try {
      // Check if Node.js is installed
      const result = await this.containerManager.executeCommand(agentId, ['which', 'node']);
      
      if (result.exitCode !== 0) {
        // Install Node.js
        await this.containerManager.executeCommand(agentId, ['apt-get', 'update']);
        await this.containerManager.executeCommand(agentId, ['apt-get', 'install', '-y', 'nodejs', 'npm']);
      }
      
      // Install common packages
      await this.containerManager.executeCommand(agentId, ['npm', 'install', '-g', 'lodash', 'axios', 'express']);
    } catch (error) {
      this.logger.error(`Failed to setup JavaScript runtime for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Setup TypeScript runtime
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _setupTypeScriptRuntime(agentId) {
    try {
      // Setup JavaScript runtime first
      await this._setupJavaScriptRuntime(agentId);
      
      // Install TypeScript
      await this.containerManager.executeCommand(agentId, ['npm', 'install', '-g', 'typescript', 'ts-node']);
    } catch (error) {
      this.logger.error(`Failed to setup TypeScript runtime for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = ExecutionEngine;
