/**
 * ProceduralEnvironment.js
 * Base class for procedurally generated environments
 * 
 * This class provides the foundation for environments that
 * are generated procedurally with configurable parameters.
 */

const BaseEnvironment = require('./BaseEnvironment');

class ProceduralEnvironment extends BaseEnvironment {
  /**
   * Create a new procedurally generated environment
   * @param {Object} config - Environment configuration
   */
  constructor(config = {}) {
    super(config);
    
    this.generator = null;
    this.generationParams = {};
    this.generatedElements = new Map();
    this.seed = config.seed || Math.floor(Math.random() * 1000000);
    this.rng = this._createRNG(this.seed);
    
    this.metadata = {
      ...this.metadata,
      type: 'procedural',
      version: '1.0.0',
      render_modes: ['human', 'rgb_array'],
      generator_type: this.config.generatorType || 'default'
    };
  }
  
  /**
   * Initialize the procedural environment
   * @returns {Object} - Initial state
   */
  initialize() {
    // Initialize generator
    this._initializeGenerator();
    
    // Initialize generation parameters
    this._initializeGenerationParams();
    
    // Generate initial environment
    this._generateEnvironment();
    
    this.state = {
      elements: new Map(this.generatedElements),
      playerPosition: this.config.initialPlayerPosition || [0, 0, 0],
      step: 0,
      seed: this.seed
    };
    
    this.stepCount = 0;
    this.episodeCount = 0;
    this.initialized = true;
    
    return this._getObservation();
  }
  
  /**
   * Reset the environment to initial state
   * @returns {Object} - Initial state
   */
  reset() {
    // Update seed for new episode
    if (this.config.newSeedOnReset) {
      this.seed = this.config.seed || Math.floor(Math.random() * 1000000);
      this.rng = this._createRNG(this.seed);
    }
    
    // Regenerate environment
    this._generateEnvironment();
    
    this.state = {
      elements: new Map(this.generatedElements),
      playerPosition: this.config.initialPlayerPosition || [0, 0, 0],
      step: 0,
      seed: this.seed
    };
    
    this.stepCount = 0;
    this.episodeCount += 1;
    
    return this._getObservation();
  }
  
  /**
   * Step the environment forward with an action
   * @param {*} action - Action to take
   * @returns {Object} - Step result with observation, reward, done, and info
   */
  step(action) {
    if (!this.initialized) {
      throw new Error('Environment must be initialized before stepping');
    }
    
    // Process action
    const result = this._processAction(action);
    
    // Update state
    this.state = {
      ...this.state,
      ...result.nextState,
      step: this.stepCount
    };
    
    // Update step count
    this.stepCount += 1;
    
    // Check for episode termination
    const done = result.done || this.stepCount >= this.config.maxStepsPerEpisode;
    
    return {
      observation: this._getObservation(),
      reward: result.reward,
      done,
      info: result.info
    };
  }
  
  /**
   * Get environment information
   * @returns {Object} - Environment information
   */
  getInfo() {
    return {
      generator_type: this.config.generatorType || 'default',
      generation_params: { ...this.generationParams },
      element_types: Array.from(new Set(
        Array.from(this.generatedElements.values()).map(e => e.type)
      )),
      seed: this.seed,
      dimensions: this.config.dimensions || [100, 100, 100]
    };
  }
  
  /**
   * Render the environment
   * @param {String} mode - Render mode ('human', 'rgb_array')
   * @returns {*} - Render result, depends on mode
   */
  render(mode = 'human') {
    if (mode === 'human') {
      // Simple ASCII rendering for console
      console.log('\n=== Procedural Environment ===');
      console.log(`Seed: ${this.seed}`);
      console.log(`Player position: ${this.state.playerPosition.join(', ')}`);
      console.log(`Elements: ${this.generatedElements.size}`);
      
      // Render a simple 2D slice of the environment
      const size = 20;
      const grid = Array(size).fill().map(() => Array(size).fill(' '));
      
      // Center on player
      const centerX = Math.floor(this.state.playerPosition[0]);
      const centerY = Math.floor(this.state.playerPosition[2]); // Using Z as second dimension for top-down view
      
      // Place elements in grid
      for (const [id, element] of this.generatedElements.entries()) {
        const x = Math.floor(element.position[0]) - centerX + Math.floor(size / 2);
        const y = Math.floor(element.position[2]) - centerY + Math.floor(size / 2);
        
        if (x >= 0 && x < size && y >= 0 && y < size) {
          let symbol = '?';
          
          switch (element.type) {
            case 'terrain':
              symbol = '#';
              break;
            case 'obstacle':
              symbol = 'O';
              break;
            case 'collectible':
              symbol = '*';
              break;
            case 'goal':
              symbol = 'G';
              break;
            case 'enemy':
              symbol = 'E';
              break;
          }
          
          grid[y][x] = symbol;
        }
      }
      
      // Place player
      const playerX = Math.floor(size / 2);
      const playerY = Math.floor(size / 2);
      grid[playerY][playerX] = 'P';
      
      // Print grid
      console.log('+' + '-'.repeat(size) + '+');
      for (const row of grid) {
        console.log('|' + row.join('') + '|');
      }
      console.log('+' + '-'.repeat(size) + '+');
      
      console.log('===============================\n');
      return null;
    } else if (mode === 'rgb_array') {
      // This would return a proper image in a real implementation
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
   * Get action space information
   * @returns {Object} - Action space information
   */
  getActionSpace() {
    return {
      type: 'discrete',
      n: 6 // move in 6 directions (±x, ±y, ±z)
    };
  }
  
  /**
   * Get observation space information
   * @returns {Object} - Observation space information
   */
  getObservationSpace() {
    return {
      type: 'dict',
      spaces: {
        position: {
          type: 'box',
          shape: [3],
          low: [0, 0, 0],
          high: this.config.dimensions || [100, 100, 100]
        },
        nearby_elements: {
          type: 'list',
          max_length: 100
        }
      }
    };
  }
  
  /**
   * Sample a random action from the action space
   * @returns {Number} - Random action
   */
  sampleAction() {
    return Math.floor(this.rng() * 6);
  }
  
  /**
   * Check if an action is valid
   * @param {Number} action - Action to check
   * @returns {Boolean} - Whether the action is valid
   */
  isActionValid(action) {
    return Number.isInteger(action) && action >= 0 && action < 6;
  }
  
  /**
   * Set random seed
   * @param {Number} seed - Random seed
   * @returns {Boolean} - Success status
   */
  setSeed(seed) {
    this.seed = seed;
    this.rng = this._createRNG(seed);
    return true;
  }
  
  /**
   * Generate a new section of the environment
   * @param {Array<Number>} center - Center position [x, y, z]
   * @param {Number} radius - Generation radius
   * @returns {Map<String, Object>} - Generated elements
   */
  generateSection(center, radius) {
    if (!this.generator) {
      throw new Error('Generator must be initialized before generating sections');
    }
    
    const newElements = this.generator.generateSection(
      center,
      radius,
      this.generationParams,
      this.rng
    );
    
    // Add new elements to environment
    for (const [id, element] of newElements.entries()) {
      this.generatedElements.set(id, element);
    }
    
    return newElements;
  }
  
  /**
   * Get observation from current state
   * @returns {Object} - Observation
   * @private
   */
  _getObservation() {
    // Get nearby elements
    const nearbyElements = this._getNearbyElements(
      this.state.playerPosition,
      this.config.observationRadius || 10
    );
    
    return {
      position: [...this.state.playerPosition],
      nearby_elements: Array.from(nearbyElements.entries()).map(([id, element]) => ({
        id,
        type: element.type,
        position: element.position,
        properties: element.properties || {}
      }))
    };
  }
  
  /**
   * Initialize procedural generator
   * @private
   */
  _initializeGenerator() {
    // This is a placeholder for actual generator initialization
    // In a real implementation, this would initialize the chosen generator
    
    this.generator = {
      generateEnvironment: (params, rng) => {
        return this._defaultGenerateEnvironment(params, rng);
      },
      
      generateSection: (center, radius, params, rng) => {
        return this._defaultGenerateSection(center, radius, params, rng);
      }
    };
  }
  
  /**
   * Initialize generation parameters
   * @private
   */
  _initializeGenerationParams() {
    // Set default parameters
    const defaultParams = {
      terrain: {
        scale: 0.1,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        amplitude: 10.0,
        offset: [0, 0, 0]
      },
      obstacles: {
        density: 0.1,
        minSize: 1.0,
        maxSize: 3.0,
        clustering: 0.5
      },
      collectibles: {
        density: 0.05,
        minValue: 1,
        maxValue: 10,
        clustering: 0.7
      },
      goals: {
        count: 1,
        minDistance: 50.0
      },
      enemies: {
        density: 0.02,
        minStrength: 1,
        maxStrength: 5,
        patrolRadius: 10.0
      }
    };
    
    // Merge with config parameters
    this.generationParams = {
      ...defaultParams,
      ...(this.config.generationParams || {})
    };
  }
  
  /**
   * Generate environment
   * @private
   */
  _generateEnvironment() {
    // Clear existing elements
    this.generatedElements.clear();
    
    // Generate environment
    const newElements = this.generator.generateEnvironment(
      this.generationParams,
      this.rng
    );
    
    // Add elements to environment
    for (const [id, element] of newElements.entries()) {
      this.generatedElements.set(id, element);
    }
  }
  
  /**
   * Default environment generation implementation
   * @param {Object} params - Generation parameters
   * @param {Function} rng - Random number generator
   * @returns {Map<String, Object>} - Generated elements
   * @private
   */
  _defaultGenerateEnvironment(params, rng) {
    const elements = new Map();
    const dimensions = this.config.dimensions || [100, 100, 100];
    
    // Generate terrain
    const terrainCount = Math.floor(dimensions[0] * dimensions[2] / 100);
    for (let i = 0; i < terrainCount; i++) {
      const id = `terrain_${i}`;
      elements.set(id, {
        id,
        type: 'terrain',
        position: [
          rng() * dimensions[0],
          0, // Terrain at ground level
          rng() * dimensions[2]
        ],
        properties: {
          height: params.terrain.amplitude * (0.5 + 0.5 * this._noise(i, 0, params.terrain))
        }
      });
    }
    
    // Generate obstacles
    const obstacleCount = Math.floor(dimensions[0] * dimensions[2] * params.obstacles.density);
    for (let i = 0; i < obstacleCount; i++) {
      const id = `obstacle_${i}`;
      elements.set(id, {
        id,
        type: 'obstacle',
        position: [
          rng() * dimensions[0],
          rng() * dimensions[1] * 0.5, // Obstacles in lower half of height
          rng() * dimensions[2]
        ],
        properties: {
          size: params.obstacles.minSize + rng() * (params.obstacles.maxSize - params.obstacles.minSize),
          solid: true
        }
      });
    }
    
    // Generate collectibles
    const collectibleCount = Math.floor(dimensions[0] * dimensions[2] * params.collectibles.density);
    for (let i = 0; i < collectibleCount; i++) {
      const id = `collectible_${i}`;
      elements.set(id, {
        id,
        type: 'collectible',
        position: [
          rng() * dimensions[0],
          1 + rng() * 2, // Collectibles slightly above ground
          rng() * dimensions[2]
        ],
        properties: {
          value: Math.floor(params.collectibles.minValue + rng() * (params.collectibles.maxValue - params.collectibles.minValue)),
          collected: false
        }
      });
    }
    
    // Generate goals
    for (let i = 0; i < params.goals.count; i++) {
      const id = `goal_${i}`;
      
      // Place goals far from start
      let position;
      let attempts = 0;
      do {
        position = [
          rng() * dimensions[0],
          1, // Goals at ground level
          rng() * dimensions[2]
        ];
        
        // Calculate distance from start
        const dx = position[0] - (this.config.initialPlayerPosition?.[0] || 0);
        const dz = position[2] - (this.config.initialPlayerPosition?.[2] || 0);
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        if (distance >= params.goals.minDistance) {
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      elements.set(id, {
        id,
        type: 'goal',
        position,
        properties: {
          reached: false
        }
      });
    }
    
    // Generate enemies
    const enemyCount = Math.floor(dimensions[0] * dimensions[2] * params.enemies.density);
    for (let i = 0; i < enemyCount; i++) {
      const id = `enemy_${i}`;
      const position = [
        rng() * dimensions[0],
        1, // Enemies at ground level
        rng() * dimensions[2]
      ];
      
      elements.set(id, {
        id,
        type: 'enemy',
        position,
        properties: {
          strength: Math.floor(params.enemies.minStrength + rng() * (params.enemies.maxStrength - params.enemies.minStrength)),
          patrolCenter: [...position],
          patrolRadius: params.enemies.patrolRadius,
          patrolAngle: rng() * Math.PI * 2
        }
      });
    }
    
    return elements;
  }
  
  /**
   * Default section generation implementation
   * @param {Array<Number>} center - Center position [x, y, z]
   * @param {Number} radius - Generation radius
   * @param {Object} params - Generation parameters
   * @param {Function} rng - Random number generator
   * @returns {Map<String, Object>} - Generated elements
   * @private
   */
  _defaultGenerateSection(center, radius, params, rng) {
    const elements = new Map();
    const sectionId = `section_${center.join('_')}_${radius}`;
    
    // Generate terrain
    const terrainCount = Math.floor(Math.PI * radius * radius / 10);
    for (let i = 0; i < terrainCount; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = rng() * radius;
      
      const id = `${sectionId}_terrain_${i}`;
      elements.set(id, {
        id,
        type: 'terrain',
        position: [
          center[0] + Math.cos(angle) * distance,
          0, // Terrain at ground level
          center[2] + Math.sin(angle) * distance
        ],
        properties: {
          height: params.terrain.amplitude * (0.5 + 0.5 * this._noise(center[0] + i, center[2], params.terrain))
        }
      });
    }
    
    // Generate obstacles
    const obstacleCount = Math.floor(Math.PI * radius * radius * params.obstacles.density);
    for (let i = 0; i < obstacleCount; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = rng() * radius;
      
      const id = `${sectionId}_obstacle_${i}`;
      elements.set(id, {
        id,
        type: 'obstacle',
        position: [
          center[0] + Math.cos(angle) * distance,
          rng() * center[1] * 0.5, // Obstacles in lower half of height
          center[2] + Math.sin(angle) * distance
        ],
        properties: {
          size: params.obstacles.minSize + rng() * (params.obstacles.maxSize - params.obstacles.minSize),
          solid: true
        }
      });
    }
    
    // Generate collectibles
    const collectibleCount = Math.floor(Math.PI * radius * radius * params.collectibles.density);
    for (let i = 0; i < collectibleCount; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = rng() * radius;
      
      const id = `${sectionId}_collectible_${i}`;
      elements.set(id, {
        id,
        type: 'collectible',
        position: [
          center[0] + Math.cos(angle) * distance,
          1 + rng() * 2, // Collectibles slightly above ground
          center[2] + Math.sin(angle) * distance
        ],
        properties: {
          value: Math.floor(params.collectibles.minValue + rng() * (params.collectibles.maxValue - params.collectibles.minValue)),
          collected: false
        }
      });
    }
    
    // Generate enemies
    const enemyCount = Math.floor(Math.PI * radius * radius * params.enemies.density);
    for (let i = 0; i < enemyCount; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = rng() * radius;
      
      const position = [
        center[0] + Math.cos(angle) * distance,
        1, // Enemies at ground level
        center[2] + Math.sin(angle) * distance
      ];
      
      const id = `${sectionId}_enemy_${i}`;
      elements.set(id, {
        id,
        type: 'enemy',
        position,
        properties: {
          strength: Math.floor(params.enemies.minStrength + rng() * (params.enemies.maxStrength - params.enemies.minStrength)),
          patrolCenter: [...position],
          patrolRadius: params.enemies.patrolRadius,
          patrolAngle: rng() * Math.PI * 2
        }
      });
    }
    
    return elements;
  }
  
  /**
   * Process action
   * @param {Number} action - Action to process
   * @returns {Object} - Result with next state, reward, done, and info
   * @private
   */
  _processAction(action) {
    const nextState = {
      elements: new Map(this.state.elements),
      playerPosition: [...this.state.playerPosition]
    };
    
    let reward = 0;
    let done = false;
    const info = {};
    
    // Process movement action
    const moveDistance = 1.0;
    
    switch (action) {
      case 0: // +X
        nextState.playerPosition[0] += moveDistance;
        break;
      case 1: // -X
        nextState.playerPosition[0] -= moveDistance;
        break;
      case 2: // +Y
        nextState.playerPosition[1] += moveDistance;
        break;
      case 3: // -Y
        nextState.playerPosition[1] -= moveDistance;
        break;
      case 4: // +Z
        nextState.playerPosition[2] += moveDistance;
        break;
      case 5: // -Z
        nextState.playerPosition[2] -= moveDistance;
        break;
      default:
        // Invalid action
        reward -= 0.1;
        info.error = 'invalid_action';
        break;
    }
    
    // Check boundaries
    const dimensions = this.config.dimensions || [100, 100, 100];
    for (let i = 0; i < 3; i++) {
      if (nextState.playerPosition[i] < 0) {
        nextState.playerPosition[i] = 0;
        reward -= 0.1;
      } else if (nextState.playerPosition[i] >= dimensions[i]) {
        nextState.playerPosition[i] = dimensions[i] - 0.1;
        reward -= 0.1;
      }
    }
    
    // Check collisions with obstacles
    const playerRadius = 0.5;
    for (const [id, element] of this.generatedElements.entries()) {
      if (element.type === 'obstacle' && element.properties?.solid) {
        const dx = nextState.playerPosition[0] - element.position[0];
        const dy = nextState.playerPosition[1] - element.position[1];
        const dz = nextState.playerPosition[2] - element.position[2];
        
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const minDistance = playerRadius + (element.properties.size || 1);
        
        if (distance < minDistance) {
          // Collision detected, revert movement
          nextState.playerPosition = [...this.state.playerPosition];
          reward -= 0.1;
          info.collision = true;
          break;
        }
      }
    }
    
    // Check interactions with collectibles
    for (const [id, element] of this.generatedElements.entries()) {
      if (element.type === 'collectible' && !element.properties.collected) {
        const dx = nextState.playerPosition[0] - element.position[0];
        const dy = nextState.playerPosition[1] - element.position[1];
        const dz = nextState.playerPosition[2] - element.position[2];
        
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < playerRadius + 0.5) {
          // Collect item
          this.generatedElements.set(id, {
            ...element,
            properties: {
              ...element.properties,
              collected: true
            }
          });
          
          reward += element.properties.value || 1;
          info.collected = id;
        }
      }
    }
    
    // Check interactions with goals
    for (const [id, element] of this.generatedElements.entries()) {
      if (element.type === 'goal' && !element.properties.reached) {
        const dx = nextState.playerPosition[0] - element.position[0];
        const dy = nextState.playerPosition[1] - element.position[1];
        const dz = nextState.playerPosition[2] - element.position[2];
        
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < playerRadius + 1.0) {
          // Reach goal
          this.generatedElements.set(id, {
            ...element,
            properties: {
              ...element.properties,
              reached: true
            }
          });
          
          reward += 10;
          done = true;
          info.goal = id;
        }
      }
    }
    
    // Check interactions with enemies
    for (const [id, element] of this.generatedElements.entries()) {
      if (element.type === 'enemy') {
        const dx = nextState.playerPosition[0] - element.position[0];
        const dy = nextState.playerPosition[1] - element.position[1];
        const dz = nextState.playerPosition[2] - element.position[2];
        
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < playerRadius + 0.5) {
          // Enemy encounter
          reward -= element.properties.strength || 1;
          info.enemy = id;
          
          // If enemy is too strong, end episode
          if ((element.properties.strength || 1) > 3) {
            done = true;
          }
        }
      }
    }
    
    // Update enemy positions
    for (const [id, element] of this.generatedElements.entries()) {
      if (element.type === 'enemy') {
        // Simple patrol behavior
        const patrolSpeed = 0.1;
        element.properties.patrolAngle += 0.05;
        
        const newPosition = [
          element.properties.patrolCenter[0] + Math.cos(element.properties.patrolAngle) * element.properties.patrolRadius,
          element.position[1],
          element.properties.patrolCenter[2] + Math.sin(element.properties.patrolAngle) * element.properties.patrolRadius
        ];
        
        this.generatedElements.set(id, {
          ...element,
          position: newPosition
        });
      }
    }
    
    // Generate new sections if needed
    if (this.config.continuousGeneration) {
      const generationThreshold = this.config.generationThreshold || 10;
      const nearbyElements = this._getNearbyElements(
        nextState.playerPosition,
        generationThreshold
      );
      
      if (nearbyElements.size < this.config.minElementsNearby || 20) {
        this.generateSection(
          nextState.playerPosition,
          this.config.generationRadius || 20
        );
      }
    }
    
    // Small penalty for each step to encourage efficiency
    reward -= 0.01;
    
    return {
      nextState,
      reward,
      done,
      info
    };
  }
  
  /**
   * Get nearby elements
   * @param {Array<Number>} position - Center position [x, y, z]
   * @param {Number} radius - Search radius
   * @returns {Map<String, Object>} - Nearby elements
   * @private
   */
  _getNearbyElements(position, radius) {
    const nearbyElements = new Map();
    
    for (const [id, element] of this.generatedElements.entries()) {
      const dx = position[0] - element.position[0];
      const dy = position[1] - element.position[1];
      const dz = position[2] - element.position[2];
      
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (distance <= radius) {
        nearbyElements.set(id, element);
      }
    }
    
    return nearbyElements;
  }
  
  /**
   * Create a seeded random number generator
   * @param {Number} seed - Random seed
   * @returns {Function} - Random number generator
   * @private
   */
  _createRNG(seed) {
    // Simple xorshift128+ implementation
    let state0 = seed || 1;
    let state1 = seed ? ~seed : 2;
    
    // Warm up the RNG
    for (let i = 0; i < 20; i++) {
      _next();
    }
    
    return _next;
    
    function _next() {
      let s1 = state0;
      let s0 = state1;
      
      state0 = s0;
      
      s1 ^= s1 << 23;
      s1 ^= s1 >> 17;
      s1 ^= s0;
      s1 ^= s0 >> 26;
      
      state1 = s1;
      
      return (state0 + state1) / 4294967296 + 0.5;
    }
  }
  
  /**
   * Simple noise function for procedural generation
   * @param {Number} x - X coordinate
   * @param {Number} y - Y coordinate
   * @param {Object} params - Noise parameters
   * @returns {Number} - Noise value
   * @private
   */
  _noise(x, y, params) {
    // This is a very simple noise implementation
    // In a real implementation, this would use Perlin or Simplex noise
    
    x = (x + params.offset[0]) * params.scale;
    y = (y + params.offset[2]) * params.scale;
    
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < params.octaves; i++) {
      value += amplitude * this._simpleNoise(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= params.persistence;
      frequency *= params.lacunarity;
    }
    
    // Normalize
    return value / maxValue;
  }
  
  /**
   * Simple noise function
   * @param {Number} x - X coordinate
   * @param {Number} y - Y coordinate
   * @returns {Number} - Noise value
   * @private
   */
  _simpleNoise(x, y) {
    // Very simple noise function for demonstration
    // Not suitable for actual procedural generation
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
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
      generatorType: 'default',
      dimensions: [100, 100, 100],
      initialPlayerPosition: [50, 1, 50],
      observationRadius: 10,
      seed: null,
      newSeedOnReset: true,
      continuousGeneration: false,
      generationThreshold: 10,
      generationRadius: 20,
      minElementsNearby: 20,
      generationParams: {}
    };
    
    return { ...defaultConfig, ...parentConfig };
  }
}

module.exports = ProceduralEnvironment;
