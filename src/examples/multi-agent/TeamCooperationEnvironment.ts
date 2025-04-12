/**
 * Team Cooperation Environment: Resource Collection
 * 
 * A grid-world environment where agents must work together to collect resources
 * and deliver them to a central depot. The task requires coordination as some
 * resources are too heavy for a single agent to carry.
 */

import { 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction 
} from '../../environments/MultiAgentEnvironment';
import { DiscreteActionSpace, ObservationSpace } from '../../types/environment';

// Resource types with their properties
enum ResourceType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy'
}

// Resource properties
interface Resource {
  type: ResourceType;
  position: [number, number];
  agentsRequired: number;
  reward: number;
  carriedBy: string[]; // IDs of agents carrying this resource
}

// Agent state in the environment
interface TeamCooperationAgentState {
  position: [number, number];
  carryingResource: string | null; // ID of resource being carried, if any
  helpRequested: boolean;
  lastAction: string | null;
  score: number;
}

// Environment state
interface TeamCooperationState {
  grid: number[][]; // 0 = empty, 1 = obstacle, 2 = depot
  resources: Record<string, Resource>;
  depot: [number, number];
  resourcesDelivered: {
    [ResourceType.LIGHT]: number;
    [ResourceType.MEDIUM]: number;
    [ResourceType.HEAVY]: number;
  };
  totalScore: number;
  requiredResources: number; // Number of resources to deliver for success
}

// Action enumeration
enum Action {
  MOVE_UP = 0,
  MOVE_DOWN = 1,
  MOVE_LEFT = 2,
  MOVE_RIGHT = 3,
  PICKUP = 4,
  DROP = 5,
  HELP = 6
}

/**
 * Team Cooperation Environment implementation
 */
export class TeamCooperationEnvironment extends BaseMultiAgentEnvironment {
  // Environment-specific properties
  private gridSize: number;
  private viewDistance: number;
  private numResources: number;
  private resourceDistribution: Record<ResourceType, number>;
  private requiredResources: number;
  private resourceIdCounter: number = 0;
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    // Set default reward structure to team
    const fullConfig = {
      ...config,
      rewardStructure: {
        type: 'team',
        ...config.rewardStructure
      }
    };
    
    super(fullConfig);
    
    // Set environment-specific properties
    this.gridSize = config.gridSize || 10;
    this.viewDistance = config.viewDistance || 2;
    this.numResources = config.numResources || 10;
    this.requiredResources = config.requiredResources || 5;
    this.resourceDistribution = config.resourceDistribution || {
      [ResourceType.LIGHT]: 0.5,
      [ResourceType.MEDIUM]: 0.3,
      [ResourceType.HEAVY]: 0.2
    };
    
    // Set default max steps if not provided
    if (!this.maxStepsPerEpisode) {
      this.maxStepsPerEpisode = 100;
    }
    
    // Initialize action and observation spaces
    for (const agentId of this.agentIds) {
      // Action space: move (4 directions), pickup, drop, help
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
            shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 4], // 4 channels: empty/obstacle/depot, agents, resources, carrying
            low: 0,
            high: 1
          },
          position: {
            type: 'box',
            shape: [2],
            low: 0,
            high: this.gridSize - 1
          },
          carryingResource: {
            type: 'discrete',
            n: 4 // null, light, medium, heavy
          },
          helpRequested: {
            type: 'discrete',
            n: 2 // boolean
          },
          nearbyAgents: {
            type: 'box',
            shape: [this.agentIds.length, 3], // agentId, x, y
            low: 0,
            high: this.gridSize - 1
          },
          nearbyResources: {
            type: 'box',
            shape: [this.numResources, 4], // resourceId, x, y, type
            low: 0,
            high: this.gridSize - 1
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
    
    // Add depot at center if not specified
    const depot = config.depot || [Math.floor(this.gridSize / 2), Math.floor(this.gridSize / 2)];
    grid[depot[1]][depot[0]] = 2;
    
    // Initialize environment state
    this.state = {
      grid,
      resources: {},
      depot,
      resourcesDelivered: {
        [ResourceType.LIGHT]: 0,
        [ResourceType.MEDIUM]: 0,
        [ResourceType.HEAVY]: 0
      },
      totalScore: 0,
      requiredResources: this.requiredResources
    } as TeamCooperationState;
    
    // Initialize agent states
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
    }
    
    // Spawn initial resources
    this.spawnResources();
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    // Reset resources delivered and score
    const state = this.state as TeamCooperationState;
    state.resourcesDelivered = {
      [ResourceType.LIGHT]: 0,
      [ResourceType.MEDIUM]: 0,
      [ResourceType.HEAVY]: 0
    };
    state.totalScore = 0;
    state.resources = {};
    
    // Respawn resources
    this.resourceIdCounter = 0;
    this.spawnResources();
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    // Place agent at random position that's not an obstacle or depot
    const state = this.state as TeamCooperationState;
    let x, y;
    do {
      x = Math.floor(Math.random() * this.gridSize);
      y = Math.floor(Math.random() * this.gridSize);
    } while (state.grid[y][x] !== 0 || this.isPositionOccupied([x, y]));
    
    // Initialize agent state
    this.agentStates[agentId] = {
      position: [x, y],
      carryingResource: null,
      helpRequested: false,
      lastAction: null,
      score: 0
    } as TeamCooperationAgentState;
  }
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    const [x, y] = agentState.position;
    
    // Create grid view centered on agent
    const gridView = this.getLocalGridView(agentId);
    
    // Get nearby agents
    const nearbyAgents: Record<string, any> = {};
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as TeamCooperationAgentState;
      const [ox, oy] = otherState.position;
      
      // Check if other agent is within view distance
      if (Math.abs(ox - x) <= this.viewDistance && Math.abs(oy - y) <= this.viewDistance) {
        nearbyAgents[otherId] = {
          id: otherId,
          visible: true,
          position: [ox, oy],
          distance: Math.sqrt(Math.pow(ox - x, 2) + Math.pow(oy - y, 2)),
          info: {
            carryingResource: otherState.carryingResource,
            helpRequested: otherState.helpRequested
          }
        };
      }
    }
    
    // Get nearby resources
    const nearbyResources: any[] = [];
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      const [rx, ry] = resource.position;
      
      // Check if resource is within view distance
      if (Math.abs(rx - x) <= this.viewDistance && Math.abs(ry - y) <= this.viewDistance) {
        nearbyResources.push({
          id: resourceId,
          position: [rx, ry],
          type: resource.type,
          agentsRequired: resource.agentsRequired,
          carriedBy: resource.carriedBy
        });
      }
    }
    
    // Create messages array for help requests
    const messages: Array<{ from: string; content: any; timestamp: number }> = [];
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as TeamCooperationAgentState;
      const [ox, oy] = otherState.position;
      
      // Add help request messages from nearby agents
      if (otherState.helpRequested && 
          Math.abs(ox - x) <= this.viewDistance && 
          Math.abs(oy - y) <= this.viewDistance) {
        messages.push({
          from: otherId,
          content: {
            type: 'help_request',
            position: [ox, oy],
            resourceId: otherState.carryingResource
          },
          timestamp: this.currentStep
        });
      }
    }
    
    // Create observation
    return {
      state: {
        position: agentState.position,
        carryingResource: agentState.carryingResource ? {
          id: agentState.carryingResource,
          type: state.resources[agentState.carryingResource]?.type
        } : null,
        helpRequested: agentState.helpRequested,
        gridView,
        nearbyResources,
        depot: state.depot,
        resourcesDelivered: state.resourcesDelivered,
        requiredResources: state.requiredResources
      },
      position: [x, y],
      others: nearbyAgents,
      environment: {
        gridSize: this.gridSize,
        currentStep: this.currentStep,
        maxSteps: this.maxStepsPerEpisode
      },
      messages
    };
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    const state = this.state as TeamCooperationState;
    
    // Reset help requested flags
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
      agentState.helpRequested = false;
    }
    
    // Process movement actions first
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
      
      // Store last action
      agentState.lastAction = Action[action];
      
      // Process movement
      if (action >= Action.MOVE_UP && action <= Action.MOVE_RIGHT) {
        this.processMovementAction(agentId, action);
      }
    }
    
    // Process pickup, drop, and help actions
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
      
      // Process non-movement actions
      switch (action) {
        case Action.PICKUP:
          this.processPickupAction(agentId);
          break;
        case Action.DROP:
          this.processDropAction(agentId);
          break;
        case Action.HELP:
          this.processHelpAction(agentId);
          break;
      }
    }
    
    // Process communication messages
    for (const agentId in actions) {
      const actionObj = actions[agentId];
      if (actionObj.message) {
        this.processMessage(agentId, actionObj.message);
      }
    }
    
    // Check if we need to spawn more resources
    if (Object.keys(state.resources).length < this.numResources) {
      this.spawnResources(this.numResources - Object.keys(state.resources).length);
    }
  }
  
  /**
   * Process movement action for an agent
   * @param agentId Agent ID
   * @param action Movement action
   */
  private processMovementAction(agentId: string, action: number): void {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
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
        
        // Check if all carriers can move
        let allCarriersCanMove = true;
        for (const carrierId of resource.carriedBy) {
          if (carrierId === agentId) continue;
          
          const carrierState = this.agentStates[carrierId] as TeamCooperationAgentState;
          const [cx, cy] = carrierState.position;
          
          // Calculate carrier's new position
          let carrierNewX = cx + (newX - x);
          let carrierNewY = cy + (newY - y);
          
          // Check if new position is valid
          if (carrierNewX < 0 || carrierNewX >= this.gridSize || 
              carrierNewY < 0 || carrierNewY >= this.gridSize || 
              state.grid[carrierNewY][carrierNewX] === 1 || 
              this.isPositionOccupied([carrierNewX, carrierNewY], [agentId, ...resource.carriedBy])) {
            allCarriersCanMove = false;
            break;
          }
        }
        
        if (allCarriersCanMove) {
          // Move all carriers and the resource
          for (const carrierId of resource.carriedBy) {
            if (carrierId === agentId) continue;
            
            const carrierState = this.agentStates[carrierId] as TeamCooperationAgentState;
            const [cx, cy] = carrierState.position;
            
            // Calculate and set carrier's new position
            carrierState.position = [
              cx + (newX - x),
              cy + (newY - y)
            ];
          }
          
          // Move the resource
          resource.position = [newX, newY];
          
          // Move the agent
          agentState.position = [newX, newY];
        }
      } else {
        // Agent is not carrying a resource, just move
        agentState.position = [newX, newY];
      }
    }
  }
  
  /**
   * Process pickup action for an agent
   * @param agentId Agent ID
   */
  private processPickupAction(agentId: string): void {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    // Check if agent is already carrying a resource
    if (agentState.carryingResource) {
      return;
    }
    
    // Find a resource at the agent's position
    const [x, y] = agentState.position;
    let resourceToPickup: string | null = null;
    
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      const [rx, ry] = resource.position;
      
      if (rx === x && ry === y && resource.carriedBy.length < resource.agentsRequired) {
        resourceToPickup = resourceId;
        break;
      }
    }
    
    // If a resource was found, pick it up
    if (resourceToPickup) {
      const resource = state.resources[resourceToPickup];
      
      // Add agent to carriers
      resource.carriedBy.push(agentId);
      
      // Update agent state
      agentState.carryingResource = resourceToPickup;
      
      // If resource requires more carriers, request help
      if (resource.carriedBy.length < resource.agentsRequired) {
        agentState.helpRequested = true;
      }
    }
  }
  
  /**
   * Process drop action for an agent
   * @param agentId Agent ID
   */
  private processDropAction(agentId: string): void {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    // Check if agent is carrying a resource
    if (!agentState.carryingResource) {
      return;
    }
    
    const resource = state.resources[agentState.carryingResource];
    const [x, y] = agentState.position;
    const [dx, dy] = state.depot;
    
    // Check if all carriers of the resource are at the depot
    if (x === dx && y === dy) {
      // Check if all carriers are present
      if (resource.carriedBy.length >= resource.agentsRequired) {
        // Deliver the resource
        state.resourcesDelivered[resource.type]++;
        state.totalScore += resource.reward;
        
        // Update agent scores
        for (const carrierId of resource.carriedBy) {
          const carrierState = this.agentStates[carrierId] as TeamCooperationAgentState;
          carrierState.score += resource.reward / resource.carriedBy.length;
          carrierState.carryingResource = null;
        }
        
        // Remove the resource
        delete state.resources[agentState.carryingResource];
      }
    } else {
      // Drop the resource at the current position
      const index = resource.carriedBy.indexOf(agentId);
      if (index !== -1) {
        resource.carriedBy.splice(index, 1);
      }
      
      // Update agent state
      agentState.carryingResource = null;
    }
  }
  
  /**
   * Process help action for an agent
   * @param agentId Agent ID
   */
  private processHelpAction(agentId: string): void {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    // Check if agent is already carrying a resource
    if (agentState.carryingResource) {
      return;
    }
    
    // Find a nearby agent requesting help
    const [x, y] = agentState.position;
    let agentToHelp: string | null = null;
    
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as TeamCooperationAgentState;
      if (otherState.helpRequested && otherState.carryingResource) {
        const [ox, oy] = otherState.position;
        
        // Check if other agent is adjacent
        if (Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1) {
          agentToHelp = otherId;
          break;
        }
      }
    }
    
    // If an agent was found, help them
    if (agentToHelp) {
      const otherState = this.agentStates[agentToHelp] as TeamCooperationAgentState;
      const resourceId = otherState.carryingResource;
      
      if (resourceId) {
        const resource = state.resources[resourceId];
        
        // Add agent to carriers
        resource.carriedBy.push(agentId);
        
        // Update agent state
        agentState.carryingResource = resourceId;
        
        // If resource has enough carriers, stop requesting help
        if (resource.carriedBy.length >= resource.agentsRequired) {
          for (const carrierId of resource.carriedBy) {
            const carrierState = this.agentStates[carrierId] as TeamCooperationAgentState;
            carrierState.helpRequested = false;
          }
        }
      }
    }
  }
  
  /**
   * Process communication message from an agent
   * @param agentId Agent ID
   * @param message Message object
   */
  private processMessage(agentId: string, message: { to: string | 'broadcast'; content: any }): void {
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    // Process help request messages
    if (message.content && message.content.type === 'help_request') {
      agentState.helpRequested = true;
    }
  }
  
  /**
   * Calculate reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    // Base reward is -0.01 per step to encourage efficiency
    let reward = -0.01;
    
    // Add reward for delivered resources (team reward)
    if (this.rewardStructure.type === 'team') {
      // Calculate change in total score
      const prevScore = state.totalScore - this.calculateResourceReward(state.resourcesDelivered);
      const currentScore = state.totalScore;
      reward += currentScore - prevScore;
    } else {
      // Individual reward based on agent's contribution
      const prevScore = agentState.score;
      reward += agentState.score - prevScore;
    }
    
    // Penalty for invalid actions
    const action = actions[agentId]?.action as number;
    if (action === Action.PICKUP && !this.canPickupResource(agentId)) {
      reward -= 0.5;
    }
    
    return reward;
  }
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected isAgentDone(agentId: string): boolean {
    const state = this.state as TeamCooperationState;
    
    // Episode is done when required resources are delivered or max steps reached
    const totalDelivered = 
      state.resourcesDelivered[ResourceType.LIGHT] + 
      state.resourcesDelivered[ResourceType.MEDIUM] + 
      state.resourcesDelivered[ResourceType.HEAVY];
    
    return totalDelivered >= state.requiredResources;
  }
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected getAgentInfo(agentId: string): any {
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    return {
      position: agentState.position,
      carryingResource: agentState.carryingResource,
      helpRequested: agentState.helpRequested,
      score: agentState.score,
      resourcesDelivered: state.resourcesDelivered,
      totalScore: state.totalScore,
      requiredResources: state.requiredResources
    };
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    const state = this.state as TeamCooperationState;
    
    if (mode === 'human') {
      // Create a string representation of the grid
      let output = `Step: ${this.currentStep}/${this.maxStepsPerEpisode}\n`;
      output += `Resources Delivered: ${state.resourcesDelivered[ResourceType.LIGHT]} light, ${state.resourcesDelivered[ResourceType.MEDIUM]} medium, ${state.resourcesDelivered[ResourceType.HEAVY]} heavy\n`;
      output += `Total Score: ${state.totalScore}\n\n`;
      
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
      
      // Add depot
      const [dx, dy] = state.depot;
      grid[dy][dx] = 'D';
      
      // Add resources
      for (const resourceId in state.resources) {
        const resource = state.resources[resourceId];
        const [rx, ry] = resource.position;
        
        // Skip resources being carried
        if (resource.carriedBy.length > 0) continue;
        
        switch (resource.type) {
          case ResourceType.LIGHT:
            grid[ry][rx] = 'L';
            break;
          case ResourceType.MEDIUM:
            grid[ry][rx] = 'M';
            break;
          case ResourceType.HEAVY:
            grid[ry][rx] = 'H';
            break;
        }
      }
      
      // Add agents
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
        const [ax, ay] = agentState.position;
        
        // Use agent index as identifier
        const agentIndex = this.agentIds.indexOf(agentId);
        grid[ay][ax] = agentState.carryingResource ? `${agentIndex}c` : `${agentIndex}`;
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
        agents: this.agentIds.map(id => {
          const agentState = this.agentStates[id] as TeamCooperationAgentState;
          return {
            id,
            position: agentState.position,
            carryingResource: agentState.carryingResource,
            helpRequested: agentState.helpRequested
          };
        }),
        resources: Object.entries(state.resources).map(([id, resource]) => ({
          id,
          type: resource.type,
          position: resource.position,
          carriedBy: resource.carriedBy
        })),
        depot: state.depot,
        resourcesDelivered: state.resourcesDelivered,
        totalScore: state.totalScore
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
        carryingResource: {
          type: 'discrete',
          n: 4
        },
        helpRequested: {
          type: 'discrete',
          n: 2
        },
        nearbyAgents: {
          type: 'box',
          shape: [this.agentIds.length, 3],
          low: 0,
          high: this.gridSize - 1
        },
        nearbyResources: {
          type: 'box',
          shape: [this.numResources, 4],
          low: 0,
          high: this.gridSize - 1
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
    const state = this.state as TeamCooperationState;
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      const index = resource.carriedBy.indexOf(agentId);
      if (index !== -1) {
        resource.carriedBy.splice(index, 1);
      }
    }
    
    return true;
  }
  
  /**
   * Spawn resources in the environment
   * @param count Number of resources to spawn
   */
  private spawnResources(count: number = this.numResources): void {
    const state = this.state as TeamCooperationState;
    
    for (let i = 0; i < count; i++) {
      // Determine resource type based on distribution
      const rand = Math.random();
      let type: ResourceType;
      let agentsRequired: number;
      let reward: number;
      
      if (rand < this.resourceDistribution[ResourceType.LIGHT]) {
        type = ResourceType.LIGHT;
        agentsRequired = 1;
        reward = 1;
      } else if (rand < this.resourceDistribution[ResourceType.LIGHT] + this.resourceDistribution[ResourceType.MEDIUM]) {
        type = ResourceType.MEDIUM;
        agentsRequired = 2;
        reward = 3;
      } else {
        type = ResourceType.HEAVY;
        agentsRequired = 3;
        reward = 5;
      }
      
      // Find a valid position for the resource
      let x, y;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
        attempts++;
        
        // Prevent infinite loop
        if (attempts > 100) {
          return;
        }
      } while (
        state.grid[y][x] !== 0 || // Not empty
        this.isPositionOccupied([x, y]) || // Occupied by agent
        this.isResourceAt([x, y]) // Occupied by another resource
      );
      
      // Create resource
      const resourceId = `resource_${this.resourceIdCounter++}`;
      state.resources[resourceId] = {
        type,
        position: [x, y],
        agentsRequired,
        reward,
        carriedBy: []
      };
    }
  }
  
  /**
   * Check if a position is occupied by an agent
   * @param position Position to check
   * @param excludeAgents Agent IDs to exclude from check
   * @returns True if position is occupied
   */
  private isPositionOccupied(position: [number, number], excludeAgents: string[] = []): boolean {
    const [x, y] = position;
    
    for (const agentId of this.agentIds) {
      if (excludeAgents.includes(agentId)) continue;
      
      const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
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
    const state = this.state as TeamCooperationState;
    
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      const [rx, ry] = resource.position;
      
      if (rx === x && ry === y && resource.carriedBy.length === 0) {
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
    const state = this.state as TeamCooperationState;
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
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
          // Channel 0: Empty (0), Obstacle (1), Depot (2)
          gridView[vy][vx][0] = state.grid[gy][gx];
          
          // Channel 1: Agents
          for (const otherId of this.agentIds) {
            const otherState = this.agentStates[otherId] as TeamCooperationAgentState;
            const [ox, oy] = otherState.position;
            
            if (ox === gx && oy === gy) {
              gridView[vy][vx][1] = 1;
              break;
            }
          }
          
          // Channel 2: Resources
          for (const resourceId in state.resources) {
            const resource = state.resources[resourceId];
            const [rx, ry] = resource.position;
            
            if (rx === gx && ry === gy && resource.carriedBy.length === 0) {
              // Encode resource type: Light (1), Medium (2), Heavy (3)
              switch (resource.type) {
                case ResourceType.LIGHT:
                  gridView[vy][vx][2] = 1;
                  break;
                case ResourceType.MEDIUM:
                  gridView[vy][vx][2] = 2;
                  break;
                case ResourceType.HEAVY:
                  gridView[vy][vx][2] = 3;
                  break;
              }
              break;
            }
          }
          
          // Channel 3: Carrying (agent carrying a resource)
          for (const otherId of this.agentIds) {
            const otherState = this.agentStates[otherId] as TeamCooperationAgentState;
            const [ox, oy] = otherState.position;
            
            if (ox === gx && oy === gy && otherState.carryingResource) {
              gridView[vy][vx][3] = 1;
              break;
            }
          }
        }
      }
    }
    
    return gridView;
  }
  
  /**
   * Check if an agent can pickup a resource
   * @param agentId Agent ID
   * @returns True if agent can pickup a resource
   */
  private canPickupResource(agentId: string): boolean {
    const agentState = this.agentStates[agentId] as TeamCooperationAgentState;
    
    // Check if agent is already carrying a resource
    if (agentState.carryingResource) {
      return false;
    }
    
    // Check if there's a resource at the agent's position
    const [x, y] = agentState.position;
    const state = this.state as TeamCooperationState;
    
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      const [rx, ry] = resource.position;
      
      if (rx === x && ry === y && resource.carriedBy.length < resource.agentsRequired) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate the reward for delivered resources
   * @param resourcesDelivered Record of resource types to counts
   * @returns Total reward
   */
  private calculateResourceReward(resourcesDelivered: Record<ResourceType, number>): number {
    return (
      resourcesDelivered[ResourceType.LIGHT] * 1 +
      resourcesDelivered[ResourceType.MEDIUM] * 3 +
      resourcesDelivered[ResourceType.HEAVY] * 5
    );
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Create environment
 * const env = new TeamCooperationEnvironment({
 *   gridSize: 10,
 *   maxStepsPerEpisode: 100,
 *   numResources: 10,
 *   requiredResources: 5,
 *   agents: [
 *     { id: 'agent1' },
 *     { id: 'agent2' },
 *     { id: 'agent3' }
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
 *   done = Object.values(results).some(result => result.done);
 * }
 * ```
 */
