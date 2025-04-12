/**
 * Competitive Environment: Territory Control
 * 
 * A grid-world environment where agents compete to control territory and collect resources.
 * Agents can claim territory and steal resources from opponents in a zero-sum game.
 */

import { 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction 
} from '../../environments/MultiAgentEnvironment';
import { DiscreteActionSpace, ObservationSpace } from '../../types/environment';

// Resource types with their properties
enum ResourceValue {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// Resource interface
interface Resource {
  id: string;
  position: [number, number];
  value: ResourceValue;
  reward: number;
  carriedBy: string | null; // ID of agent carrying this resource, if any
}

// Territory cell interface
interface TerritoryCell {
  owner: string | null;
  claimStrength: number;
  resourceGenerator: boolean;
  lastClaimed: number; // Step when last claimed
}

// Agent state in the environment
interface CompetitiveAgentState {
  position: [number, number];
  carryingResource: string | null; // ID of resource being carried, if any
  health: number;
  strength: number;
  score: number;
  territoryCells: number; // Number of territory cells owned
  lastAction: string | null;
}

// Environment state
interface CompetitiveState {
  grid: number[][]; // 0 = empty, 1 = obstacle
  territory: TerritoryCell[][];
  resources: Record<string, Resource>;
  resourceSpawnProbability: number;
  maxResources: number;
  resourceIdCounter: number;
}

// Action enumeration
enum Action {
  MOVE_UP = 0,
  MOVE_DOWN = 1,
  MOVE_LEFT = 2,
  MOVE_RIGHT = 3,
  CLAIM_TERRITORY = 4,
  COLLECT_RESOURCE = 5,
  ATTACK = 6
}

/**
 * Competitive Environment implementation
 */
export class CompetitiveEnvironment extends BaseMultiAgentEnvironment {
  // Environment-specific properties
  private gridSize: number;
  private viewDistance: number;
  private maxResources: number;
  private resourceSpawnProbability: number;
  private resourceDistribution: Record<ResourceValue, number>;
  private maxHealth: number;
  private baseStrength: number;
  private territoryIncomeInterval: number;
  private resourceIdCounter: number = 0;
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    // Set default reward structure to zero-sum
    const fullConfig = {
      ...config,
      rewardStructure: {
        type: 'zero-sum',
        ...config.rewardStructure
      }
    };
    
    super(fullConfig);
    
    // Set environment-specific properties
    this.gridSize = config.gridSize || 12;
    this.viewDistance = config.viewDistance || 3;
    this.maxResources = config.maxResources || 20;
    this.resourceSpawnProbability = config.resourceSpawnProbability || 0.1;
    this.maxHealth = config.maxHealth || 100;
    this.baseStrength = config.baseStrength || 10;
    this.territoryIncomeInterval = config.territoryIncomeInterval || 10;
    
    this.resourceDistribution = config.resourceDistribution || {
      [ResourceValue.LOW]: 0.6,
      [ResourceValue.MEDIUM]: 0.3,
      [ResourceValue.HIGH]: 0.1
    };
    
    // Set default max steps if not provided
    if (!this.maxStepsPerEpisode) {
      this.maxStepsPerEpisode = 200;
    }
    
    // Initialize action and observation spaces
    for (const agentId of this.agentIds) {
      // Action space: move (4 directions), claim territory, collect resource, attack
      this.actionSpaces[agentId] = {
        type: 'discrete',
        n: 7
      } as DiscreteActionSpace;
      
      // Observation space: grid view, agent state, etc.
      this.observationSpaces[agentId] = {
        type: 'dict',
        spaces: {
          grid: {
            type: 'box',
            shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 4], // 4 channels: empty/obstacle, agents, resources, territory
            low: 0,
            high: 1
          },
          position: {
            type: 'box',
            shape: [2],
            low: 0,
            high: this.gridSize - 1
          },
          health: {
            type: 'box',
            shape: [1],
            low: 0,
            high: this.maxHealth
          },
          strength: {
            type: 'box',
            shape: [1],
            low: 0,
            high: this.baseStrength * 2
          },
          carryingResource: {
            type: 'discrete',
            n: 4 // null, low, medium, high
          },
          territoryCells: {
            type: 'box',
            shape: [1],
            low: 0,
            high: this.gridSize * this.gridSize
          },
          nearbyAgents: {
            type: 'box',
            shape: [this.agentIds.length, 5], // agentId, x, y, health, strength
            low: 0,
            high: Math.max(this.gridSize - 1, this.maxHealth, this.baseStrength * 2)
          },
          nearbyResources: {
            type: 'box',
            shape: [this.maxResources, 4], // resourceId, x, y, value
            low: 0,
            high: Math.max(this.gridSize - 1, 3) // 3 resource values
          }
        }
      };
    }
  }
  
  /**
   * Initialize environment state
   * @param config Environment configuration
   */
  protected initializeState(config: any): void {
    // Initialize grid with empty cells
    const grid: number[][] = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0));
    
    // Add obstacles (if specified in config)
    const obstacles = config.obstacles || [];
    for (const [x, y] of obstacles) {
      if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
        grid[y][x] = 1;
      }
    }
    
    // Initialize territory grid
    const territory: TerritoryCell[][] = Array(this.gridSize).fill(0).map(() => 
      Array(this.gridSize).fill(0).map(() => ({
        owner: null,
        claimStrength: 0,
        resourceGenerator: Math.random() < 0.1, // 10% chance of being a resource generator
        lastClaimed: 0
      }))
    );
    
    // Initialize environment state
    this.state = {
      grid,
      territory,
      resources: {},
      resourceSpawnProbability: this.resourceSpawnProbability,
      maxResources: this.maxResources,
      resourceIdCounter: 0
    } as CompetitiveState;
    
    // Initialize agent states
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
    }
    
    // Spawn initial resources
    this.spawnResources(Math.floor(this.maxResources / 2));
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    const state = this.state as CompetitiveState;
    
    // Reset territory
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        state.territory[y][x].owner = null;
        state.territory[y][x].claimStrength = 0;
        state.territory[y][x].lastClaimed = 0;
      }
    }
    
    // Reset resources
    state.resources = {};
    state.resourceIdCounter = 0;
    
    // Spawn initial resources
    this.spawnResources(Math.floor(this.maxResources / 2));
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    const state = this.state as CompetitiveState;
    
    // Place agent at random position that's not an obstacle
    let x, y;
    do {
      x = Math.floor(Math.random() * this.gridSize);
      y = Math.floor(Math.random() * this.gridSize);
    } while (state.grid[y][x] !== 0 || this.isPositionOccupied([x, y]));
    
    // Initialize agent state
    this.agentStates[agentId] = {
      position: [x, y],
      carryingResource: null,
      health: this.maxHealth,
      strength: this.baseStrength,
      score: 0,
      territoryCells: 0,
      lastAction: null
    } as CompetitiveAgentState;
  }
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    const state = this.state as CompetitiveState;
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    const [x, y] = agentState.position;
    
    // Create grid view centered on agent
    const gridView = this.getLocalGridView(agentId);
    
    // Get nearby agents
    const nearbyAgents: Record<string, any> = {};
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as CompetitiveAgentState;
      const [ox, oy] = otherState.position;
      
      // Check if other agent is within view distance
      if (Math.abs(ox - x) <= this.viewDistance && Math.abs(oy - y) <= this.viewDistance) {
        nearbyAgents[otherId] = {
          id: otherId,
          visible: true,
          position: [ox, oy],
          distance: Math.sqrt(Math.pow(ox - x, 2) + Math.pow(oy - y, 2)),
          info: {
            health: otherState.health,
            strength: otherState.strength,
            carryingResource: otherState.carryingResource
          }
        };
      }
    }
    
    // Get nearby resources
    const nearbyResources: any[] = [];
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      
      // Skip resources being carried
      if (resource.carriedBy !== null) continue;
      
      const [rx, ry] = resource.position;
      
      // Check if resource is within view distance
      if (Math.abs(rx - x) <= this.viewDistance && Math.abs(ry - y) <= this.viewDistance) {
        nearbyResources.push({
          id: resourceId,
          position: [rx, ry],
          value: resource.value
        });
      }
    }
    
    // Get territory information
    const territoryInfo = {
      owned: agentState.territoryCells,
      nearby: [] as Array<{ position: [number, number]; owner: string | null; strength: number }>
    };
    
    for (let dy = -this.viewDistance; dy <= this.viewDistance; dy++) {
      for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        
        if (tx >= 0 && tx < this.gridSize && ty >= 0 && ty < this.gridSize) {
          const cell = state.territory[ty][tx];
          territoryInfo.nearby.push({
            position: [tx, ty],
            owner: cell.owner,
            strength: cell.claimStrength
          });
        }
      }
    }
    
    // Create observation
    return {
      state: {
        position: agentState.position,
        health: agentState.health,
        strength: agentState.strength,
        carryingResource: agentState.carryingResource ? {
          id: agentState.carryingResource,
          value: state.resources[agentState.carryingResource]?.value
        } : null,
        territoryCells: agentState.territoryCells,
        gridView,
        nearbyResources,
        territoryInfo
      },
      position: [x, y],
      others: nearbyAgents,
      environment: {
        gridSize: this.gridSize,
        currentStep: this.currentStep,
        maxSteps: this.maxStepsPerEpisode
      }
    };
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    const state = this.state as CompetitiveState;
    
    // Process movement actions first
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      const agentState = this.agentStates[agentId] as CompetitiveAgentState;
      
      // Store last action
      agentState.lastAction = Action[action];
      
      // Process movement
      if (action >= Action.MOVE_UP && action <= Action.MOVE_RIGHT) {
        this.processMovementAction(agentId, action);
      }
    }
    
    // Process territory claim, resource collection, and attack actions
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      
      switch (action) {
        case Action.CLAIM_TERRITORY:
          this.processClaimTerritoryAction(agentId);
          break;
        case Action.COLLECT_RESOURCE:
          this.processCollectResourceAction(agentId);
          break;
        case Action.ATTACK:
          this.processAttackAction(agentId);
          break;
      }
    }
    
    // Process territory income if it's time
    if (this.currentStep % this.territoryIncomeInterval === 0) {
      this.processTerritoryIncome();
    }
    
    // Spawn new resources with probability
    if (Object.keys(state.resources).length < state.maxResources && 
        Math.random() < state.resourceSpawnProbability) {
      this.spawnResources(1);
    }
    
    // Update territory cell counts for each agent
    this.updateTerritoryCellCounts();
  }
  
  /**
   * Process movement action for an agent
   * @param agentId Agent ID
   * @param action Movement action
   */
  private processMovementAction(agentId: string, action: number): void {
    const state = this.state as CompetitiveState;
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    const [x, y] = agentState.position;
    
    // Calculate new position based on action
    let newX = x;
    let newY = y;
    
    switch (action) {
      case Action.MOVE_UP:
        newY = Math.max(0, y - 1);
        break;
      case Action.MOVE_DOWN:
        newY = Math.min(this.gridSize - 1, y + 1);
        break;
      case Action.MOVE_LEFT:
        newX = Math.max(0, x - 1);
        break;
      case Action.MOVE_RIGHT:
        newX = Math.min(this.gridSize - 1, x + 1);
        break;
    }
    
    // Check if new position is valid (not an obstacle and not occupied by another agent)
    if (state.grid[newY][newX] !== 1 && !this.isPositionOccupied([newX, newY])) {
      // If agent is carrying a resource, move the resource too
      if (agentState.carryingResource) {
        const resource = state.resources[agentState.carryingResource];
        resource.position = [newX, newY];
      }
      
      // Move the agent
      agentState.position = [newX, newY];
    }
  }
  
  /**
   * Process claim territory action for an agent
   * @param agentId Agent ID
   */
  private processClaimTerritoryAction(agentId: string): void {
    const state = this.state as CompetitiveState;
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    const [x, y] = agentState.position;
    
    // Get territory cell
    const cell = state.territory[y][x];
    
    // Calculate claim strength based on agent's strength
    const claimStrength = agentState.strength;
    
    // If cell is unclaimed or claimed by this agent, add claim strength
    if (cell.owner === null || cell.owner === agentId) {
      cell.owner = agentId;
      cell.claimStrength += claimStrength;
      cell.lastClaimed = this.currentStep;
    } 
    // If cell is claimed by another agent, contest it
    else {
      // If agent's claim strength is greater than current claim, take over
      if (claimStrength > cell.claimStrength) {
        // Calculate reward transfer (zero-sum)
        const previousOwner = cell.owner;
        const previousOwnerState = this.agentStates[previousOwner] as CompetitiveAgentState;
        
        // Transfer territory
        cell.owner = agentId;
        cell.claimStrength = claimStrength - cell.claimStrength;
        cell.lastClaimed = this.currentStep;
        
        // Apply reward transfer in calculateReward
      } 
      // Otherwise, reduce claim strength
      else {
        cell.claimStrength -= claimStrength;
      }
    }
  }
  
  /**
   * Process collect resource action for an agent
   * @param agentId Agent ID
   */
  private processCollectResourceAction(agentId: string): void {
    const state = this.state as CompetitiveState;
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    
    // Check if agent is already carrying a resource
    if (agentState.carryingResource) {
      return;
    }
    
    // Find a resource at the agent's position
    const [x, y] = agentState.position;
    let resourceToCollect: string | null = null;
    
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      
      // Skip resources being carried
      if (resource.carriedBy !== null) continue;
      
      const [rx, ry] = resource.position;
      
      if (rx === x && ry === y) {
        resourceToCollect = resourceId;
        break;
      }
    }
    
    // If a resource was found, collect it
    if (resourceToCollect) {
      const resource = state.resources[resourceToCollect];
      
      // Update resource
      resource.carriedBy = agentId;
      
      // Update agent state
      agentState.carryingResource = resourceToCollect;
      
      // Add reward (will be applied in calculateReward)
      agentState.score += resource.reward;
    }
  }
  
  /**
   * Process attack action for an agent
   * @param agentId Agent ID
   */
  private processAttackAction(agentId: string): void {
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    const [x, y] = agentState.position;
    
    // Find nearby agents to attack
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as CompetitiveAgentState;
      const [ox, oy] = otherState.position;
      
      // Check if other agent is adjacent
      if (Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1) {
        // Calculate attack damage based on strength
        const damage = Math.floor(agentState.strength * 0.5);
        
        // Apply damage
        otherState.health = Math.max(0, otherState.health - damage);
        
        // If other agent is defeated, steal their resource if they have one
        if (otherState.health === 0 && otherState.carryingResource) {
          const state = this.state as CompetitiveState;
          const resource = state.resources[otherState.carryingResource];
          
          // If attacker isn't carrying a resource, steal it
          if (!agentState.carryingResource) {
            resource.carriedBy = agentId;
            agentState.carryingResource = otherState.carryingResource;
            otherState.carryingResource = null;
            
            // Add reward (will be applied in calculateReward)
            agentState.score += resource.reward * 2; // Double reward for stealing
          }
          
          // Reset defeated agent
          this.resetAgentState(otherId);
        }
        
        // Only attack one agent at a time
        break;
      }
    }
  }
  
  /**
   * Process territory income for all agents
   */
  private processTerritoryIncome(): void {
    const state = this.state as CompetitiveState;
    
    // Count territory cells for each agent
    const territoryCounts: Record<string, number> = {};
    for (const agentId of this.agentIds) {
      territoryCounts[agentId] = 0;
    }
    
    // Count territory cells and process resource generation
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = state.territory[y][x];
        
        if (cell.owner !== null) {
          territoryCounts[cell.owner]++;
          
          // Generate resources on resource generator cells
          if (cell.resourceGenerator && 
              Object.keys(state.resources).length < state.maxResources && 
              Math.random() < state.resourceSpawnProbability * 2) {
            this.spawnResourceAt([x, y]);
          }
        }
      }
    }
    
    // Apply territory income for each agent
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as CompetitiveAgentState;
      
      // Income is 0.1 per territory cell
      const income = territoryCounts[agentId] * 0.1;
      agentState.score += income;
      
      // Update territory cell count
      agentState.territoryCells = territoryCounts[agentId];
    }
  }
  
  /**
   * Update territory cell counts for each agent
   */
  private updateTerritoryCellCounts(): void {
    const state = this.state as CompetitiveState;
    
    // Reset territory counts
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as CompetitiveAgentState;
      agentState.territoryCells = 0;
    }
    
    // Count territory cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = state.territory[y][x];
        
        if (cell.owner !== null) {
          const agentState = this.agentStates[cell.owner] as CompetitiveAgentState;
          agentState.territoryCells++;
        }
      }
    }
  }
  
  /**
   * Calculate reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    
    // Base reward is -0.01 per step to encourage efficiency
    let reward = -0.01;
    
    // Add reward for territory (0.1 per territory cell per territory income interval)
    if (this.currentStep % this.territoryIncomeInterval === 0) {
      reward += agentState.territoryCells * 0.1;
    }
    
    // Add reward for collecting resources (already added to score in processCollectResourceAction)
    // and for stealing resources (already added to score in processAttackAction)
    
    // Calculate change in score
    const scoreDelta = agentState.score - (agentState.score - reward);
    reward = scoreDelta;
    
    return reward;
  }
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected isAgentDone(agentId: string): boolean {
    // Episode is done when max steps reached (handled by parent class)
    return false;
  }
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected getAgentInfo(agentId: string): any {
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    
    return {
      position: agentState.position,
      health: agentState.health,
      strength: agentState.strength,
      carryingResource: agentState.carryingResource,
      territoryCells: agentState.territoryCells,
      score: agentState.score
    };
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    const state = this.state as CompetitiveState;
    
    if (mode === 'human') {
      // Create a string representation of the grid
      let output = `Step: ${this.currentStep}/${this.maxStepsPerEpisode}\n`;
      
      // Show agent scores and territory
      output += 'Agents:\n';
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as CompetitiveAgentState;
        const agentIndex = this.agentIds.indexOf(agentId);
        output += `  Agent ${agentIndex}: Score=${agentState.score.toFixed(1)}, Territory=${agentState.territoryCells}, Health=${agentState.health}\n`;
      }
      output += '\n';
      
      // Create a grid representation
      const grid = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(' '));
      
      // Add obstacles
      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          if (state.grid[y][x] === 1) {
            grid[y][x] = '#';
          }
        }
      }
      
      // Add territory
      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          const cell = state.territory[y][x];
          
          if (cell.owner !== null) {
            const agentIndex = this.agentIds.indexOf(cell.owner);
            grid[y][x] = `${agentIndex}`;
          }
          
          if (cell.resourceGenerator) {
            grid[y][x] = grid[y][x] === ' ' ? '*' : grid[y][x] + '*';
          }
        }
      }
      
      // Add resources
      for (const resourceId in state.resources) {
        const resource = state.resources[resourceId];
        
        // Skip resources being carried
        if (resource.carriedBy !== null) continue;
        
        const [rx, ry] = resource.position;
        
        switch (resource.value) {
          case ResourceValue.LOW:
            grid[ry][rx] = 'L';
            break;
          case ResourceValue.MEDIUM:
            grid[ry][rx] = 'M';
            break;
          case ResourceValue.HIGH:
            grid[ry][rx] = 'H';
            break;
        }
      }
      
      // Add agents
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as CompetitiveAgentState;
        const [ax, ay] = agentState.position;
        
        // Use agent index as identifier
        const agentIndex = this.agentIds.indexOf(agentId);
        grid[ay][ax] = agentState.carryingResource ? `${agentIndex}c` : `${agentIndex}A`;
      }
      
      // Render the grid
      for (let y = 0; y < this.gridSize; y++) {
        output += '+' + '---+'.repeat(this.gridSize) + '\n';
        output += '|';
        for (let x = 0; x < this.gridSize; x++) {
          output += ` ${grid[y][x]} |`;
        }
        output += '\n';
      }
      output += '+' + '---+'.repeat(this.gridSize) + '\n';
      
      console.log(output);
      return output;
    } else if (mode === 'rgb_array') {
      // Return a representation that could be used for visualization
      return {
        grid: state.grid,
        territory: state.territory,
        agents: this.agentIds.map(id => {
          const agentState = this.agentStates[id] as CompetitiveAgentState;
          return {
            id,
            position: agentState.position,
            health: agentState.health,
            strength: agentState.strength,
            carryingResource: agentState.carryingResource,
            territoryCells: agentState.territoryCells,
            score: agentState.score
          };
        }),
        resources: Object.entries(state.resources).map(([id, resource]) => ({
          id,
          value: resource.value,
          position: resource.position,
          carriedBy: resource.carriedBy
        }))
      };
    }
    
    return null;
  }
  
  /**
   * Add a new agent to the environment
   * @param agentId Agent ID
   * @param config Agent configuration
   * @returns True if agent was added successfully
   */
  public addAgent(agentId: string, config: any): boolean {
    // Check if agent already exists
    if (this.agentIds.includes(agentId)) {
      return false;
    }
    
    // Add agent ID
    this.agentIds.push(agentId);
    
    // Initialize agent state
    this.resetAgentState(agentId);
    
    // Initialize action and observation spaces
    this.actionSpaces[agentId] = {
      type: 'discrete',
      n: 7
    } as DiscreteActionSpace;
    
    this.observationSpaces[agentId] = {
      type: 'dict',
      spaces: {
        grid: {
          type: 'box',
          shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 4],
          low: 0,
          high: 1
        },
        position: {
          type: 'box',
          shape: [2],
          low: 0,
          high: this.gridSize - 1
        },
        health: {
          type: 'box',
          shape: [1],
          low: 0,
          high: this.maxHealth
        },
        strength: {
          type: 'box',
          shape: [1],
          low: 0,
          high: this.baseStrength * 2
        },
        carryingResource: {
          type: 'discrete',
          n: 4
        },
        territoryCells: {
          type: 'box',
          shape: [1],
          low: 0,
          high: this.gridSize * this.gridSize
        },
        nearbyAgents: {
          type: 'box',
          shape: [this.agentIds.length, 5],
          low: 0,
          high: Math.max(this.gridSize - 1, this.maxHealth, this.baseStrength * 2)
        },
        nearbyResources: {
          type: 'box',
          shape: [this.maxResources, 4],
          low: 0,
          high: Math.max(this.gridSize - 1, 3)
        }
      }
    };
    
    return true;
  }
  
  /**
   * Remove an agent from the environment
   * @param agentId Agent ID
   * @returns True if agent was removed successfully
   */
  public removeAgent(agentId: string): boolean {
    // Check if agent exists
    const index = this.agentIds.indexOf(agentId);
    if (index === -1) {
      return false;
    }
    
    // Remove agent ID
    this.agentIds.splice(index, 1);
    
    // Remove agent state
    delete this.agentStates[agentId];
    
    // Remove action and observation spaces
    delete this.actionSpaces[agentId];
    delete this.observationSpaces[agentId];
    
    // Remove agent from any resources it's carrying
    const state = this.state as CompetitiveState;
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      if (resource.carriedBy === agentId) {
        resource.carriedBy = null;
      }
    }
    
    // Remove agent from territory
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (state.territory[y][x].owner === agentId) {
          state.territory[y][x].owner = null;
          state.territory[y][x].claimStrength = 0;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Spawn resources in the environment
   * @param count Number of resources to spawn
   */
  private spawnResources(count: number = 1): void {
    const state = this.state as CompetitiveState;
    
    for (let i = 0; i < count; i++) {
      // Find a valid position for the resource
      let position = this.findEmptyPosition();
      
      // If no valid position found, skip
      if (!position) {
        continue;
      }
      
      // Spawn resource at position
      this.spawnResourceAt(position);
    }
  }
  
  /**
   * Spawn a resource at a specific position
   * @param position Position to spawn resource
   * @returns Resource ID if spawned, null otherwise
   */
  private spawnResourceAt(position: [number, number]): string | null {
    const state = this.state as CompetitiveState;
    const [x, y] = position;
    
    // Check if position is valid
    if (state.grid[y][x] !== 0 || this.isPositionOccupied(position) || this.isResourceAt(position)) {
      return null;
    }
    
    // Determine resource value based on distribution
    const rand = Math.random();
    let value: ResourceValue;
    let reward: number;
    
    if (rand < this.resourceDistribution[ResourceValue.LOW]) {
      value = ResourceValue.LOW;
      reward = 1;
    } else if (rand < this.resourceDistribution[ResourceValue.LOW] + this.resourceDistribution[ResourceValue.MEDIUM]) {
      value = ResourceValue.MEDIUM;
      reward = 2;
    } else {
      value = ResourceValue.HIGH;
      reward = 3;
    }
    
    // Create resource
    const resourceId = `resource_${state.resourceIdCounter++}`;
    state.resources[resourceId] = {
      id: resourceId,
      position: [x, y],
      value,
      reward,
      carriedBy: null
    };
    
    return resourceId;
  }
  
  /**
   * Find an empty position in the grid
   * @returns Empty position or null if none found
   */
  private findEmptyPosition(): [number, number] | null {
    const state = this.state as CompetitiveState;
    
    // Try random positions
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      
      if (state.grid[y][x] === 0 && !this.isPositionOccupied([x, y]) && !this.isResourceAt([x, y])) {
        return [x, y];
      }
    }
    
    // If random attempts fail, try systematically
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (state.grid[y][x] === 0 && !this.isPositionOccupied([x, y]) && !this.isResourceAt([x, y])) {
          return [x, y];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if a position is occupied by an agent
   * @param position Position to check
   * @returns True if position is occupied
   */
  private isPositionOccupied(position: [number, number]): boolean {
    const [x, y] = position;
    
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as CompetitiveAgentState;
      const [ax, ay] = agentState.position;
      
      if (ax === x && ay === y) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a resource is at a position
   * @param position Position to check
   * @returns True if a resource is at the position
   */
  private isResourceAt(position: [number, number]): boolean {
    const [x, y] = position;
    const state = this.state as CompetitiveState;
    
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      
      // Skip resources being carried
      if (resource.carriedBy !== null) continue;
      
      const [rx, ry] = resource.position;
      
      if (rx === x && ry === y) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get the local grid view for an agent
   * @param agentId Agent ID
   * @returns Grid view centered on agent
   */
  private getLocalGridView(agentId: string): number[][][] {
    const state = this.state as CompetitiveState;
    const agentState = this.agentStates[agentId] as CompetitiveAgentState;
    const [x, y] = agentState.position;
    
    // Create grid view with 4 channels
    const gridView = Array(this.viewDistance * 2 + 1)
      .fill(0)
      .map(() => Array(this.viewDistance * 2 + 1)
        .fill(0)
        .map(() => Array(4).fill(0)));
    
    // Fill grid view
    for (let dy = -this.viewDistance; dy <= this.viewDistance; dy++) {
      for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
        const gx = x + dx;
        const gy = y + dy;
        const vx = dx + this.viewDistance;
        const vy = dy + this.viewDistance;
        
        // Check if position is within grid
        if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
          // Channel 0: Empty (0), Obstacle (1)
          gridView[vy][vx][0] = state.grid[gy][gx];
          
          // Channel 1: Agents
          for (const otherId of this.agentIds) {
            const otherState = this.agentStates[otherId] as CompetitiveAgentState;
            const [ox, oy] = otherState.position;
            
            if (ox === gx && oy === gy) {
              gridView[vy][vx][1] = 1;
              break;
            }
          }
          
          // Channel 2: Resources
          for (const resourceId in state.resources) {
            const resource = state.resources[resourceId];
            
            // Skip resources being carried
            if (resource.carriedBy !== null) continue;
            
            const [rx, ry] = resource.position;
            
            if (rx === gx && ry === gy) {
              // Encode resource value: Low (1), Medium (2), High (3)
              switch (resource.value) {
                case ResourceValue.LOW:
                  gridView[vy][vx][2] = 1;
                  break;
                case ResourceValue.MEDIUM:
                  gridView[vy][vx][2] = 2;
                  break;
                case ResourceValue.HIGH:
                  gridView[vy][vx][2] = 3;
                  break;
              }
              break;
            }
          }
          
          // Channel 3: Territory
          const cell = state.territory[gy][gx];
          if (cell.owner !== null) {
            // Encode territory ownership: Self (1), Others (2-N)
            if (cell.owner === agentId) {
              gridView[vy][vx][3] = 1;
            } else {
              // Use agent index + 2 to ensure different values for different agents
              const ownerIndex = this.agentIds.indexOf(cell.owner);
              gridView[vy][vx][3] = ownerIndex + 2;
            }
          }
        }
      }
    }
    
    return gridView;
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Create environment
 * const env = new CompetitiveEnvironment({
 *   gridSize: 12,
 *   maxStepsPerEpisode: 200,
 *   maxResources: 20,
 *   agents: [
 *     { id: 'agent1' },
 *     { id: 'agent2' },
 *     { id: 'agent3' },
 *     { id: 'agent4' }
 *   ]
 * });
 * 
 * // Reset environment
 * const initialObservations = env.reset();
 * 
 * // Run episode
 * let done = false;
 * while (!done) {
 *   // Get actions from agents (in a real scenario, these would come from agent policies)
 *   const actions = {};
 *   for (const agentId of env.getAgentIds()) {
 *     actions[agentId] = {
 *       action: Math.floor(Math.random() * 7) // Random action
 *     };
 *   }
 *   
 *   // Step environment
 *   const results = env.step(actions);
 *   
 *   // Render environment
 *   env.render();
 *   
 *   // Check if episode is done
 *   done = Object.values(results).some(result => result.done) || env.getCurrentStep() >= env.getMaxStepsPerEpisode();
 * }
 * ```
 */
