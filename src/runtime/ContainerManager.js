/**
 * Container Manager for DevSparkAgent Playground
 * 
 * Handles Docker container lifecycle management for agent isolation.
 */

const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirp = require('mkdirp');

class ContainerManager {
  /**
   * Create a new ContainerManager instance
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config;
    this.docker = new Docker();
    this.containers = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the container manager
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing ContainerManager...');
      
      // Check Docker connection
      const info = await this.docker.info();
      this.logger.info(`Connected to Docker daemon: ${info.Name}`);
      
      // Ensure base image is available
      await this._ensureBaseImage();
      
      this.logger.info('ContainerManager initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`ContainerManager initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new container for an agent
   * @param {string} agentId - Agent ID
   * @param {Object} options - Container options
   * @returns {Promise<Object>} - Container information
   */
  async createContainer(agentId, options = {}) {
    try {
      const containerName = `agent-${agentId}`;
      
      // Check if container already exists
      const existingContainer = await this._findContainer(containerName);
      if (existingContainer) {
        this.logger.warn(`Container for agent ${agentId} already exists, removing...`);
        await this.removeContainer(agentId);
      }
      
      // Prepare container options
      const containerOptions = this._prepareContainerOptions(agentId, options);
      
      // Create container
      this.logger.info(`Creating container for agent ${agentId}...`);
      const container = await this.docker.createContainer(containerOptions);
      
      // Store container reference
      this.containers.set(agentId, {
        id: container.id,
        agentId,
        container,
        status: 'created',
        createdAt: new Date(),
        options: containerOptions
      });
      
      this.logger.info(`Container created for agent ${agentId}: ${container.id}`);
      
      return {
        id: container.id,
        agentId,
        status: 'created'
      };
    } catch (error) {
      this.logger.error(`Failed to create container for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start a container for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Container information
   */
  async startContainer(agentId) {
    try {
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        throw new Error(`Container for agent ${agentId} not found`);
      }
      
      this.logger.info(`Starting container for agent ${agentId}...`);
      await containerInfo.container.start();
      
      // Update container status
      containerInfo.status = 'running';
      containerInfo.startedAt = new Date();
      
      this.logger.info(`Container started for agent ${agentId}`);
      
      return {
        id: containerInfo.id,
        agentId,
        status: 'running'
      };
    } catch (error) {
      this.logger.error(`Failed to start container for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop a container for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Container information
   */
  async stopContainer(agentId) {
    try {
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        throw new Error(`Container for agent ${agentId} not found`);
      }
      
      this.logger.info(`Stopping container for agent ${agentId}...`);
      await containerInfo.container.stop();
      
      // Update container status
      containerInfo.status = 'stopped';
      containerInfo.stoppedAt = new Date();
      
      this.logger.info(`Container stopped for agent ${agentId}`);
      
      return {
        id: containerInfo.id,
        agentId,
        status: 'stopped'
      };
    } catch (error) {
      if (error.statusCode === 304) {
        // Container already stopped
        const containerInfo = this.containers.get(agentId);
        containerInfo.status = 'stopped';
        containerInfo.stoppedAt = new Date();
        
        return {
          id: containerInfo.id,
          agentId,
          status: 'stopped'
        };
      }
      
      this.logger.error(`Failed to stop container for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Remove a container for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if removal is successful
   */
  async removeContainer(agentId) {
    try {
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        // Check if container exists in Docker but not in our map
        const containerName = `agent-${agentId}`;
        const existingContainer = await this._findContainer(containerName);
        
        if (existingContainer) {
          this.logger.warn(`Container for agent ${agentId} found in Docker but not in memory, removing...`);
          const container = this.docker.getContainer(existingContainer.Id);
          
          // Stop container if running
          if (existingContainer.State === 'running') {
            await container.stop();
          }
          
          // Remove container
          await container.remove({ force: true });
          this.logger.info(`Container removed for agent ${agentId}`);
          return true;
        }
        
        this.logger.warn(`Container for agent ${agentId} not found`);
        return false;
      }
      
      // Stop container if running
      if (containerInfo.status === 'running') {
        this.logger.info(`Stopping container for agent ${agentId} before removal...`);
        await containerInfo.container.stop();
      }
      
      // Remove container
      this.logger.info(`Removing container for agent ${agentId}...`);
      await containerInfo.container.remove({ force: true });
      
      // Remove from map
      this.containers.delete(agentId);
      
      this.logger.info(`Container removed for agent ${agentId}`);
      
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        // Container not found, remove from map
        this.containers.delete(agentId);
        this.logger.warn(`Container for agent ${agentId} not found in Docker, removed from memory`);
        return true;
      }
      
      this.logger.error(`Failed to remove container for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * List all containers
   * @returns {Promise<Array<Object>>} - List of container information
   */
  async listContainers() {
    try {
      const containers = [];
      
      for (const [agentId, containerInfo] of this.containers.entries()) {
        // Get latest container info from Docker
        const container = containerInfo.container;
        const inspectInfo = await container.inspect();
        
        containers.push({
          id: containerInfo.id,
          agentId,
          status: inspectInfo.State.Running ? 'running' : 'stopped',
          createdAt: containerInfo.createdAt,
          startedAt: containerInfo.startedAt,
          stoppedAt: containerInfo.stoppedAt
        });
      }
      
      return containers;
    } catch (error) {
      this.logger.error(`Failed to list containers: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get container logs
   * @param {string} agentId - Agent ID
   * @param {Object} options - Log options
   * @returns {Promise<string>} - Container logs
   */
  async getContainerLogs(agentId, options = {}) {
    try {
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        throw new Error(`Container for agent ${agentId} not found`);
      }
      
      const logOptions = {
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        ...options
      };
      
      const logs = await containerInfo.container.logs(logOptions);
      return logs.toString('utf8');
    } catch (error) {
      this.logger.error(`Failed to get logs for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get container stats
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Container stats
   */
  async getContainerStats(agentId) {
    try {
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        throw new Error(`Container for agent ${agentId} not found`);
      }
      
      const stats = await containerInfo.container.stats({ stream: false });
      
      // Calculate CPU usage percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercentage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
      
      // Calculate memory usage
      const memoryUsage = stats.memory_stats.usage;
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercentage = (memoryUsage / memoryLimit) * 100;
      
      // Calculate network usage
      let networkRx = 0;
      let networkTx = 0;
      
      if (stats.networks) {
        for (const [, network] of Object.entries(stats.networks)) {
          networkRx += network.rx_bytes;
          networkTx += network.tx_bytes;
        }
      }
      
      return {
        id: containerInfo.id,
        agentId,
        cpu: {
          percentage: cpuPercentage,
          usage: stats.cpu_stats.cpu_usage.total_usage
        },
        memory: {
          usage: memoryUsage,
          limit: memoryLimit,
          percentage: memoryPercentage
        },
        network: {
          rx: networkRx,
          tx: networkTx
        },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for agent ${agentId}: ${error.message}`, error);
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
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        throw new Error(`Container for agent ${agentId} not found`);
      }
      
      const inspectInfo = await containerInfo.container.inspect();
      
      return {
        id: containerInfo.id,
        agentId,
        status: inspectInfo.State.Running ? 'running' : 'stopped',
        createdAt: containerInfo.createdAt,
        startedAt: containerInfo.startedAt,
        stoppedAt: containerInfo.stoppedAt,
        exitCode: inspectInfo.State.ExitCode,
        error: inspectInfo.State.Error
      };
    } catch (error) {
      this.logger.error(`Failed to get status for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Execute a command in a container
   * @param {string} agentId - Agent ID
   * @param {Array<string>} command - Command to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeCommand(agentId, command, options = {}) {
    try {
      const containerInfo = this.containers.get(agentId);
      if (!containerInfo) {
        throw new Error(`Container for agent ${agentId} not found`);
      }
      
      // Check if container is running
      const status = await this.getContainerStatus(agentId);
      if (status.status !== 'running') {
        throw new Error(`Container for agent ${agentId} is not running`);
      }
      
      // Prepare execution options
      const execOptions = {
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        ...options
      };
      
      // Create exec instance
      const exec = await containerInfo.container.exec(execOptions);
      
      // Start execution
      const stream = await exec.start();
      
      // Collect output
      let output = '';
      let error = '';
      
      return new Promise((resolve, reject) => {
        // Handle output
        stream.on('data', (chunk) => {
          output += chunk.toString('utf8');
        });
        
        // Handle error
        stream.on('error', (err) => {
          error += err.toString();
          reject(err);
        });
        
        // Handle end
        stream.on('end', async () => {
          // Get execution info
          const execInfo = await exec.inspect();
          
          resolve({
            id: execInfo.ID,
            agentId,
            exitCode: execInfo.ExitCode,
            output,
            error,
            running: execInfo.Running,
            timestamp: new Date()
          });
        });
      });
    } catch (error) {
      this.logger.error(`Failed to execute command for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Ensure base image is available
   * @private
   * @returns {Promise<void>}
   */
  async _ensureBaseImage() {
    try {
      const baseImage = this.config.container.baseImage;
      this.logger.info(`Checking if base image ${baseImage} is available...`);
      
      // Check if image exists
      const images = await this.docker.listImages();
      const imageExists = images.some(image => 
        image.RepoTags && image.RepoTags.includes(baseImage)
      );
      
      if (!imageExists) {
        this.logger.info(`Base image ${baseImage} not found, pulling...`);
        
        // Pull image
        const stream = await this.docker.pull(baseImage);
        
        // Wait for pull to complete
        await new Promise((resolve, reject) => {
          this.docker.modem.followProgress(stream, (err, output) => {
            if (err) {
              reject(err);
            } else {
              resolve(output);
            }
          });
        });
        
        this.logger.info(`Base image ${baseImage} pulled successfully`);
      } else {
        this.logger.info(`Base image ${baseImage} is available`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure base image: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find container by name
   * @private
   * @param {string} containerName - Container name
   * @returns {Promise<Object|null>} - Container information or null if not found
   */
  async _findContainer(containerName) {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.find(container => 
        container.Names.includes(`/${containerName}`)
      );
    } catch (error) {
      this.logger.error(`Failed to find container ${containerName}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Prepare container options
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} options - Container options
   * @returns {Object} - Container options
   */
  _prepareContainerOptions(agentId, options) {
    const containerName = `agent-${agentId}`;
    
    // Prepare resource limits
    const resourceLimits = {
      ...this.config.container.resourceLimits,
      ...options.resourceLimits
    };
    
    // Prepare network policy
    const networkPolicy = options.networkPolicy || this.config.container.networkPolicy;
    
    // Prepare volumes
    const volumes = {};
    const binds = [];
    
    // Add agent data volume
    const agentDataDir = path.join(process.cwd(), 'data', 'agents', agentId);
    
    // Ensure agent data directory exists
    try {
      mkdirp.sync(agentDataDir);
    } catch (error) {
      this.logger.error(`Failed to create agent data directory: ${error.message}`, error);
    }
    
    volumes['/agent'] = {};
    binds.push(`${agentDataDir}:/agent:rw`);
    
    // Add additional volumes from options
    if (options.volumes) {
      for (const [hostPath, containerPath] of Object.entries(options.volumes)) {
        volumes[containerPath] = {};
        binds.push(`${hostPath}:${containerPath}:rw`);
      }
    }
    
    // Prepare container options
    return {
      Image: this.config.container.baseImage,
      name: containerName,
      Hostname: containerName,
      Domainname: 'devspark-playground',
      Env: [
        `AGENT_ID=${agentId}`,
        ...Object.entries(options.env || {}).map(([key, value]) => `${key}=${value}`)
      ],
      Cmd: options.cmd || ['/bin/bash'],
      WorkingDir: '/agent',
      Volumes: volumes,
      HostConfig: {
        Binds: binds,
        Memory: this._parseMemory(resourceLimits.memory),
        MemorySwap: this._parseMemory(resourceLimits.memory) * 2,
        NanoCpus: resourceLimits.cpu * 1e9,
        CpuPeriod: 100000,
        CpuQuota: resourceLimits.cpu * 100000,
        DiskQuota: this._parseDisk(resourceLimits.disk),
        NetworkMode: networkPolicy,
        SecurityOpt: [
          'no-new-privileges=true'
        ],
        CapDrop: ['ALL'],
        CapAdd: options.capabilities || []
      }
    };
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

  /**
   * Parse disk string to bytes
   * @private
   * @param {string|number} disk - Disk string (e.g., '10Gi', '500Mi') or number in bytes
   * @returns {number} - Disk in bytes
   */
  _parseDisk(disk) {
    return this._parseMemory(disk);
  }
}

module.exports = ContainerManager;
