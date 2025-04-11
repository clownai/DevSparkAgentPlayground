/**
 * GridWorldEnvironment.js
 * A simple grid world environment for multi-agent scenarios
 * 
 * This environment provides a 2D grid where multiple agents can move,
 * interact with objects, and communicate with each other.
 */

const MultiAgentEnvironment = require('./MultiAgentEnvironment');

class GridWorldEnvironment extends MultiAgentEnvironment {
  /**
   * Create a new grid world environment
   * @param {Object} config - Environment configuration
   */
  constructor(config = {}) {
    super(config);
    this.config = this._validateConfig(config);
    this.grid = [];
    this.objects = new Map();
    this.agentPositions = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize the environment
   * @returns {Object} - Initial state
   */
  initialize() {
    // Create empty grid
    this.grid = Array(this.config.height).fill().map(() => 
      Array(this.config.width).fill(null)
    );
    
    // Place objects
    if (this.config.objects) {
      for (const [objectId, objectConfig] of Object.entries(this.config.objects)) {
        this._placeObject(objectId, objectConfig);
      }
    }
    
    // Initialize agent positions
    for (const [agentId, agentData] of this.agents.entries()) {
      // Find random empty position
      const position = this._findEmptyPosition();
      
      // Place agent
      this.agentPositions.set(agentId, position);
      this.grid[position.y][position.x] = { type: 'agent', id: agentId };
      
      // Initialize agent
      const envInfo = this.getEnvironmentInfo();
      agentData.instance.initialize(envInfo);
    }
    
    this.step_count = 0;
    this.episode_count = 0;
    this.initialized = true;
    
    return this.getState();
  }
  
  /**
   * Reset the environment to initial state
   * @returns {Object} - Initial state
   */
  reset() {
    // Clear grid
    this.grid = Array(this.config.height).fill().map(() => 
      Array(this.config.width).fill(null)
    );
    
    // Reset objects
    this.objects.clear();
    
    // Place objects
    if (this.config.objects) {
      for (const [objectId, objectConfig] of Object.entries(this.config.objects)) {
        this._placeObject(objectId, objectConfig);
      }
    }
    
    // Reset agent positions
    this.agentPositions.clear();
    
    // Reset agent status
    for (const [agentId, agentData] of this.agents.entries()) {
      // Find random empty position
      const position = this._findEmptyPosition();
      
      // Place agent
      this.agentPositions.set(agentId, position);
      this.grid[position.y][position.x] = { type: 'agent', id: agentId };
      
      // Reset agent status
      agentData.active = true;
      agentData.lastAction = null;
      agentData.lastObservation = null;
      agentData.lastReward = 0;
    }
    
    this.step_count = 0;
    this.episode_count += 1;
    
    return this.getState();
  }
  
  /**
   * Step the environment forward with agent actions
   * @param {Map<String, *>} actions - Map of agent IDs to actions
   * @returns {Object} - Step result with observations, rewards, dones, and info
   */
  step(actions) {
    if (!this.initialized) {
      throw new Error('Environment must be initialized before stepping');
    }
    
    const observations = new Map();
    const rewards = new Map();
    const dones = new Map();
    const info = new Map();
    
    // Process agent actions in random order
    const agentIds = Array.from(this.agents.keys());
    this._shuffle(agentIds);
    
    for (const agentId of agentIds) {
      const agentData = this.agents.get(agentId);
      
      // Skip inactive agents
      if (!agentData.active) {
        continue;
      }
      
      const action = actions.get(agentId);
      
      // Process action
      const result = this._processAgentAction(agentId, action);
      
      // Update agent data
      agentData.lastAction = action;
      agentData.lastObservation = result.observation;
      agentData.lastReward = result.reward;
      agentData.active = !result.done;
      
      // Store results
      observations.set(agentId, result.observation);
      rewards.set(agentId, result.reward);
      dones.set(agentId, result.done);
      info.set(agentId, result.info);
    }
    
    // Process environment dynamics
    this._updateEnvironment();
    
    // Check for episode termination
    const allDone = Array.from(this.agents.values()).every(a => !a.active);
    
    // Update step count
    this.step_count += 1;
    
    return {
      observations,
      rewards,
      dones,
      info,
      done: allDone
    };
  }
  
  /**
   * Get observations for all agents
   * @returns {Map<String, Object>} - Map of agent IDs to observations
   */
  getObservations() {
    const observations = new Map();
    
    for (const [agentId, agentData] of this.agents.entries()) {
      if (agentData.active) {
        observations.set(agentId, this._getAgentObservation(agentId));
      }
    }
    
    return observations;
  }
  
  /**
   * Get observation for a specific agent
   * @param {String} agentId - Agent ID
   * @returns {Object} - Agent observation
   */
  getObservation(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Unknown agent ID: ${agentId}`);
    }
    
    return this._getAgentObservation(agentId);
  }
  
  /**
   * Get environment information for agent initialization
   * @returns {Object} - Environment information
   */
  getEnvironmentInfo() {
    return {
      type: 'gridworld',
      actionSpace: {
        discrete: true,
        n: 6 // up, down, left, right, stay, interact
      },
      observationSpace: {
        type: 'dict',
        spaces: {
          position: {
            type: 'box',
            shape: [2],
            low: [0, 0],
            high: [this.config.width - 1, this.config.height - 1]
          },
          vision: {
            type: 'box',
            shape: [this.config.visionRange * 2 + 1, this.config.visionRange * 2 + 1, 3],
            low: 0,
            high: 1
          },
          inventory: {
            type: 'dict',
            spaces: {}
          },
          messages: {
            type: 'list',
            maxLength: 10
          }
        }
      },
      gridSize: [this.config.width, this.config.height],
      visionRange: this.config.visionRange,
      communicationEnabled: this.config.communicationEnabled,
      teamBased: this.config.teamBased
    };
  }
  
  /**
   * Get current environment state
   * @returns {Object} - Environment state
   */
  getState() {
    return {
      grid: this.grid.map(row => [...row]),
      objects: new Map(this.objects),
      agentPositions: new Map(this.agentPositions),
      step: this.step_count,
      episode: this.episode_count
    };
  }
  
  /**
   * Render the environment
   * @param {String} mode - Render mode ('human', 'rgb_array', etc.)
   * @returns {*} - Render result, depends on mode
   */
  render(mode = 'human') {
    if (mode === 'human') {
      // Simple ASCII rendering
      const renderGrid = Array(this.config.height).fill().map(() => 
        Array(this.config.width).fill('.')
      );
      
      // Render objects
      for (const [objectId, objectData] of this.objects.entries()) {
        const { position, type } = objectData;
        
        let symbol = 'O';
        if (type === 'goal') symbol = 'G';
        else if (type === 'obstacle') symbol = '#';
        else if (type === 'resource') symbol = 'R';
        
        renderGrid[position.y][position.x] = symbol;
      }
      
      // Render agents
      for (const [agentId, position] of this.agentPositions.entries()) {
        renderGrid[position.y][position.x] = 'A';
      }
      
      // Print grid
      console.log('-'.repeat(this.config.width + 2));
      for (const row of renderGrid) {
        console.log('|' + row.join('') + '|');
      }
      console.log('-'.repeat(this.config.width + 2));
      console.log(`Step: ${this.step_count}, Episode: ${this.episode_count}`);
      
      return null;
    } else if (mode === 'rgb_array') {
      // Return RGB array representation
      // This would be implemented for visual rendering
      return null;
    }
    
    return null;
  }
  
  /**
   * Close the environment and release resources
   * @returns {Boolean} - Success status
   */
  close() {
    // Nothing to close in this simple environment
    return true;
  }
  
  /**
   * Process agent action
   * @param {String} agentId - Agent ID
   * @param {Number} action - Action to process
   * @returns {Object} - Result with observation, reward, done, and info
   * @private
   */
  _processAgentAction(agentId, action) {
    const position = this.agentPositions.get(agentId);
    let newPosition = { ...position };
    let reward = 0;
    let done = false;
    let info = {};
    
    // Process action
    switch (action) {
      case 0: // Up
        newPosition.y = Math.max(0, position.y - 1);
        break;
      case 1: // Down
        newPosition.y = Math.min(this.config.height - 1, position.y + 1);
        break;
      case 2: // Left
        newPosition.x = Math.max(0, position.x - 1);
        break;
      case 3: // Right
        newPosition.x = Math.min(this.config.width - 1, position.x + 1);
        break;
      case 4: // Stay
        // No position change
        break;
      case 5: // Interact
        // Interact with objects at current position
        reward += this._interactWithObjects(agentId, position);
        break;
      default:
        // Invalid action
        reward -= 0.1;
        break;
    }
    
    // Check if new position is valid
    if (action < 4) { // Movement action
      const cell = this.grid[newPosition.y][newPosition.x];
      
      if (cell === null) {
        // Move to empty cell
        this.grid[position.y][position.x] = null;
        this.grid[newPosition.y][newPosition.x] = { type: 'agent', id: agentId };
        this.agentPositions.set(agentId, newPosition);
      } else if (cell.type === 'obstacle') {
        // Cannot move to obstacle
        newPosition = position;
        reward -= 0.1;
      } else if (cell.type === 'agent') {
        // Cannot move to occupied cell
        newPosition = position;
        reward -= 0.1;
      } else {
        // Move to cell with object
        this.grid[position.y][position.x] = null;
        this.grid[newPosition.y][newPosition.x] = { type: 'agent', id: agentId };
        this.agentPositions.set(agentId, newPosition);
        
        // Interact with object
        reward += this._interactWithObjects(agentId, newPosition);
      }
    }
    
    // Check for goal
    for (const [objectId, objectData] of this.objects.entries()) {
      if (objectData.type === 'goal' && 
          objectData.position.x === newPosition.x && 
          objectData.position.y === newPosition.y) {
        reward += 1.0;
        done = true;
        info.goal = true;
        break;
      }
    }
    
    // Small penalty for each step to encourage efficiency
    reward -= 0.01;
    
    // Get observation
    const observation = this._getAgentObservation(agentId);
    
    return {
      observation,
      reward,
      done,
      info
    };
  }
  
  /**
   * Interact with objects at a position
   * @param {String} agentId - Agent ID
   * @param {Object} position - Position to interact with
   * @returns {Number} - Reward from interaction
   * @private
   */
  _interactWithObjects(agentId, position) {
    let reward = 0;
    
    for (const [objectId, objectData] of this.objects.entries()) {
      if (objectData.position.x === position.x && 
          objectData.position.y === position.y) {
        
        if (objectData.type === 'resource') {
          // Collect resource
          reward += 0.5;
          this.objects.delete(objectId);
          
          // Update grid
          this.grid[position.y][position.x] = { type: 'agent', id: agentId };
        } else if (objectData.type === 'goal') {
          // Reach goal
          reward += 1.0;
        }
      }
    }
    
    return reward;
  }
  
  /**
   * Update environment dynamics
   * @private
   */
  _updateEnvironment() {
    // This method would implement any environment dynamics
    // that occur independently of agent actions
    
    // For example, resource regeneration, moving obstacles, etc.
    
    // In this simple implementation, we don't have any such dynamics
  }
  
  /**
   * Get observation for an agent
   * @param {String} agentId - Agent ID
   * @returns {Object} - Agent observation
   * @private
   */
  _getAgentObservation(agentId) {
    const position = this.agentPositions.get(agentId);
    
    // Create vision grid
    const visionRange = this.config.visionRange;
    const vision = Array(visionRange * 2 + 1).fill().map(() => 
      Array(visionRange * 2 + 1).fill().map(() => [0, 0, 0])
    );
    
    // Fill vision grid
    for (let dy = -visionRange; dy <= visionRange; dy++) {
      for (let dx = -visionRange; dx <= visionRange; dx++) {
        const x = position.x + dx;
        const y = position.y + dy;
        const vx = dx + visionRange;
        const vy = dy + visionRange;
        
        // Check if position is within grid
        if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
          const cell = this.grid[y][x];
          
          if (cell === null) {
            // Empty cell
            vision[vy][vx] = [0, 0, 0];
          } else if (cell.type === 'agent') {
            // Agent
            vision[vy][vx] = [1, 0, 0];
          } else if (cell.type === 'obstacle') {
            // Obstacle
            vision[vy][vx] = [0, 0, 1];
          } else {
            // Object
            const objectData = this.objects.get(cell.id);
            
            if (objectData.type === 'goal') {
              vision[vy][vx] = [0, 1, 0];
            } else if (objectData.type === 'resource') {
              vision[vy][vx] = [0, 1, 1];
            }
          }
        }
      }
    }
    
    // Get messages for agent
    const messages = [];
    if (this.config.communicationEnabled) {
      const agent = this.agents.get(agentId).instance;
      messages.push(...agent.incomingMessages);
    }
    
    return {
      position: [position.x, position.y],
      vision,
      inventory: {},
      messages
    };
  }
  
  /**
   * Place an object in the environment
   * @param {String} objectId - Object ID
   * @param {Object} objectConfig - Object configuration
   * @private
   */
  _placeObject(objectId, objectConfig) {
    let position;
    
    if (objectConfig.position) {
      // Use specified position
      position = objectConfig.position;
    } else {
      // Find random empty position
      position = this._findEmptyPosition();
    }
    
    // Create object
    const object = {
      id: objectId,
      type: objectConfig.type,
      position,
      properties: objectConfig.properties || {}
    };
    
    // Add to objects
    this.objects.set(objectId, object);
    
    // Update grid
    this.grid[position.y][position.x] = { type: objectConfig.type, id: objectId };
  }
  
  /**
   * Find an empty position in the grid
   * @returns {Object} - Empty position {x, y}
   * @private
   */
  _findEmptyPosition() {
    const emptyPositions = [];
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.grid[y][x] === null) {
          emptyPositions.push({ x, y });
        }
      }
    }
    
    if (emptyPositions.length === 0) {
      throw new Error('No empty positions available in grid');
    }
    
    // Return random empty position
    return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  }
  
  /**
   * Shuffle an array in place
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   * @private
   */
  _shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    const parentConfig = super._validateConfig(config);
    
    const defaultConfig = {
      width: 10,
      height: 10,
      visionRange: 2,
      objects: {}
    };
    
    return { ...parentConfig, ...defaultConfig, ...config };
  }
}

module.exports = GridWorldEnvironment;
