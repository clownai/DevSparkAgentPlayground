/**
 * Reward Structure Examples: Resource Allocation Scenarios
 * 
 * A set of similar environments with different reward structures to demonstrate
 * how reward design affects agent behavior and cooperation patterns.
 */

import { 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction 
} from '../../environments/MultiAgentEnvironment';
import { DiscreteActionSpace, ObservationSpace } from '../../types/environment';

// Reward structure types
export enum RewardType {
  INDIVIDUAL = 'individual',
  TEAM = 'team',
  MIXED = 'mixed',
  ZERO_SUM = 'zero-sum'
}

// Resource types
enum ResourceType {
  COMMON = 'common',
  RARE = 'rare',
  VALUABLE = 'valuable'
}

// Resource interface
interface Resource {
  id: string;
  type: ResourceType;
  position: [number, number];
  value: number;
  carriedBy: string | null; // ID of agent carrying this resource
}

// Goal interface
interface Goal {
  id: string;
  position: [number, number];
  resourcesAllocated: number;
  capacity: number;
  value: number; // Multiplier for resources allocated to this goal
}

// Team assignment
interface Team {
  id: string;
  members: string[]; // Agent IDs
  score: number;
}

// Agent state in the environment
interface ResourceAllocationAgentState {
  position: [number, number];
  carryingResource: string | null; // ID of resource being carried
  team: string | null; // Team ID or null if no team
  lastAction: string | null;
  score: {
    individual: number;
    team: number;
  };
  resourcesCollected: number;
  resourcesAllocated: number;
}

// Environment state
interface ResourceAllocationState {
  grid: number[][]; // 0 = empty, 1 = obstacle
  resources: Record<string, Resource>;
  goals: Record<string, Goal>;
  teams: Record<string, Team>;
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
  PICK_UP_RESOURCE = 4,
  ALLOCATE_RESOURCE = 5
}

/**
 * Resource Allocation Environment implementation
 */
export class ResourceAllocationEnvironment extends BaseMultiAgentEnvironment {
  // Environment-specific properties
  private gridSize: number;
  private viewDistance: number;
  private maxResources: number;
  private resourceSpawnProbability: number;
  private resourceDistribution: Record<ResourceType, number>;
  private numGoals: number;
  private teamAssignments: Record<string, string | null>; // Agent ID to Team ID
  private rewardType: RewardType;
  private resourceIdCounter: number = 0;
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    // Set reward structure based on reward type
    const rewardType = config.rewardType || RewardType.INDIVIDUAL;
    let rewardStructure: any = { type: 'individual' };
    
    switch (rewardType) {
      case RewardType.INDIVIDUAL:
        rewardStructure = { type: 'individual' };
        break;
      case RewardType.TEAM:
        rewardStructure = { type: 'team' };
        break;
      case RewardType.MIXED:
        rewardStructure = { 
          type: 'mixed',
          weights: {
            individual: 0.5,
            team: 0.5
          }
        };
        break;
      case RewardType.ZERO_SUM:
        rewardStructure = { type: 'zero-sum' };
        break;
    }
    
    const fullConfig = {
      ...config,
      rewardStructure
    };
    
    super(fullConfig);
    
    // Store reward type
    this.rewardType = rewardType;
    
    // Set environment-specific properties
    this.gridSize = config.gridSize || 8;
    this.viewDistance = config.viewDistance || 3;
    this.maxResources = config.maxResources || 15;
    this.resourceSpawnProbability = config.resourceSpawnProbability || 0.1;
    this.numGoals = config.numGoals || 3;
    
    this.resourceDistribution = config.resourceDistribution || {
      [ResourceType.COMMON]: 0.6,
      [ResourceType.RARE]: 0.3,
      [ResourceType.VALUABLE]: 0.1
    };
    
    // Set default max steps if not provided
    if (!this.maxStepsPerEpisode) {
      this.maxStepsPerEpisode = 100;
    }
    
    // Assign teams to agents
    this.teamAssignments = {};
    this.assignTeams(config.teamAssignments, config.teams);
    
    // Initialize action and observation spaces
    for (const agentId of this.agentIds) {
      // Action space: move (4 directions), pick up resource, allocate resource
      this.actionSpaces[agentId] = {
        type: 'discrete',
        n: 6
      } as DiscreteActionSpace;
      
      // Observation space: grid view, agent state, etc.
      this.observationSpaces[agentId] = {
        type: 'dict',
        spaces: {
          grid: {
            type: 'box',
            shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 3], // 3 channels: empty/obstacle, agents, resources/goals
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
            n: 4 // null, common, rare, valuable
          },
          team: {
            type: 'discrete',
            n: Object.keys(this.teamAssignments).length + 1 // +1 for null
          },
          score: {
            type: 'dict',
            spaces: {
              individual: {
                type: 'box',
                shape: [1],
                low: 0,
                high: 100
              },
              team: {
                type: 'box',
                shape: [1],
                low: 0,
                high: 100
              }
            }
          },
          nearbyAgents: {
            type: 'box',
            shape: [this.agentIds.length, 4], // agentId, x, y, team
            low: 0,
            high: Math.max(this.gridSize - 1, Object.keys(this.teamAssignments).length)
          },
          nearbyResources: {
            type: 'box',
            shape: [this.maxResources, 4], // resourceId, x, y, type
            low: 0,
            high: Math.max(this.gridSize - 1, 3) // 3 resource types
          },
          nearbyGoals: {
            type: 'box',
            shape: [this.numGoals, 4], // goalId, x, y, capacity
            low: 0,
            high: Math.max(this.gridSize - 1, 10) // Max capacity 10
          }
        }
      };
    }
  }
  
  /**
   * Assign teams to agents
   * @param teamAssignments Optional explicit team assignments
   * @param teams Optional team configurations
   */
  private assignTeams(teamAssignments?: Record<string, string>, teams?: Array<{ id: string, members: string[] }>): void {
    // If explicit assignments are provided, use them
    if (teamAssignments) {
      this.teamAssignments = { ...teamAssignments };
      return;
    }
    
    // If teams are provided, use them
    if (teams) {
      for (const team of teams) {
        for (const agentId of team.members) {
          this.teamAssignments[agentId] = team.id;
        }
      }
      return;
    }
    
    // Otherwise, assign based on reward type
    switch (this.rewardType) {
      case RewardType.INDIVIDUAL:
      case RewardType.ZERO_SUM:
        // No teams for individual or zero-sum rewards
        for (const agentId of this.agentIds) {
          this.teamAssignments[agentId] = null;
        }
        break;
      
      case RewardType.TEAM:
      case RewardType.MIXED:
        // Single team for team or mixed rewards
        for (const agentId of this.agentIds) {
          this.teamAssignments[agentId] = 'team1';
        }
        break;
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
    const obstacles = config.obstacles || this.generateDefaultObstacles();
    for (const [x, y] of obstacles) {
      if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
        grid[y][x] = 1;
      }
    }
    
    // Initialize teams
    const teams: Record<string, Team> = {};
    const teamIds = new Set<string | null>(Object.values(this.teamAssignments));
    
    for (const teamId of teamIds) {
      if (teamId !== null) {
        teams[teamId] = {
          id: teamId,
          members: this.agentIds.filter(id => this.teamAssignments[id] === teamId),
          score: 0
        };
      }
    }
    
    // Initialize environment state
    this.state = {
      grid,
      resources: {},
      goals: {},
      teams,
      resourceSpawnProbability: this.resourceSpawnProbability,
      maxResources: this.maxResources,
      resourceIdCounter: 0
    } as ResourceAllocationState;
    
    // Initialize agent states
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
    }
    
    // Generate goals
    this.generateGoals();
    
    // Spawn initial resources
    this.spawnResources(Math.floor(this.maxResources / 2));
  }
  
  /**
   * Generate default obstacles for the environment
   * @returns Array of obstacle positions
   */
  private generateDefaultObstacles(): [number, number][] {
    const obstacles: [number, number][] = [];
    
    // Add some random obstacles
    const numRandomObstacles = Math.floor(this.gridSize * this.gridSize * 0.1); // 10% of grid
    for (let i = 0; i < numRandomObstacles; i++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      
      obstacles.push([x, y]);
    }
    
    return obstacles;
  }
  
  /**
   * Generate goals for the environment
   */
  private generateGoals(): void {
    const state = this.state as ResourceAllocationState;
    
    // Clear existing goals
    state.goals = {};
    
    // Generate new goals
    for (let i = 0; i < this.numGoals; i++) {
      // Find a valid position
      const position = this.findEmptyPosition();
      if (!position) continue;
      
      // Create goal
      const goalId = `goal_${i}`;
      const capacity = Math.floor(Math.random() * 5) + 3; // 3-7 capacity
      const value = Math.floor(Math.random() * 3) + 1; // 1-3 value multiplier
      
      state.goals[goalId] = {
        id: goalId,
        position,
        resourcesAllocated: 0,
        capacity,
        value
      };
    }
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    const state = this.state as ResourceAllocationState;
    
    // Reset resources
    state.resources = {};
    state.resourceIdCounter = 0;
    
    // Reset goals
    for (const goalId in state.goals) {
      state.goals[goalId].resourcesAllocated = 0;
    }
    
    // Reset team scores
    for (const teamId in state.teams) {
      state.teams[teamId].score = 0;
    }
    
    // Spawn initial resources
    this.spawnResources(Math.floor(this.maxResources / 2));
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    const state = this.state as ResourceAllocationState;
    
    // Place agent at random position
    let position = this.findEmptyPosition();
    if (!position) {
      // Fallback if no empty position found
      position = [0, 0];
    }
    
    // Initialize agent state
    this.agentStates[agentId] = {
      position,
      carryingResource: null,
      team: this.teamAssignments[agentId],
      lastAction: null,
      score: {
        individual: 0,
        team: 0
      },
      resourcesCollected: 0,
      resourcesAllocated: 0
    } as ResourceAllocationAgentState;
    
    // If agent was carrying a resource, return it to the grid
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      if (resource.carriedBy === agentId) {
        resource.carriedBy = null;
        resource.position = this.findEmptyPosition() || [0, 0];
      }
    }
  }
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    const [x, y] = agentState.position;
    
    // Create grid view centered on agent
    const gridView = this.getLocalGridView(agentId);
    
    // Get nearby agents
    const nearbyAgents: Record<string, any> = {};
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as ResourceAllocationAgentState;
      const [ox, oy] = otherState.position;
      
      // Check if other agent is within view distance
      if (Math.abs(ox - x) <= this.viewDistance && Math.abs(oy - y) <= this.viewDistance) {
        nearbyAgents[otherId] = {
          id: otherId,
          visible: true,
          position: [ox, oy],
          distance: Math.sqrt(Math.pow(ox - x, 2) + Math.pow(oy - y, 2)),
          info: {
            team: otherState.team,
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
          type: resource.type,
          value: resource.value
        });
      }
    }
    
    // Get nearby goals
    const nearbyGoals: any[] = [];
    for (const goalId in state.goals) {
      const goal = state.goals[goalId];
      const [gx, gy] = goal.position;
      
      // Check if goal is within view distance
      if (Math.abs(gx - x) <= this.viewDistance && Math.abs(gy - y) <= this.viewDistance) {
        nearbyGoals.push({
          id: goalId,
          position: [gx, gy],
          resourcesAllocated: goal.resourcesAllocated,
          capacity: goal.capacity,
          value: goal.value
        });
      }
    }
    
    // Get team information
    const teamInfo = agentState.team ? {
      id: agentState.team,
      members: state.teams[agentState.team].members,
      score: state.teams[agentState.team].score
    } : null;
    
    // Create observation
    return {
      state: {
        position: agentState.position,
        carryingResource: agentState.carryingResource ? {
          id: agentState.carryingResource,
          type: state.resources[agentState.carryingResource]?.type,
          value: state.resources[agentState.carryingResource]?.value
        } : null,
        team: agentState.team,
        score: agentState.score,
        gridView,
        nearbyResources,
        nearbyGoals,
        teamInfo,
        resourcesCollected: agentState.resourcesCollected,
        resourcesAllocated: agentState.resourcesAllocated
      },
      position: [x, y],
      others: nearbyAgents,
      environment: {
        gridSize: this.gridSize,
        currentStep: this.currentStep,
        maxSteps: this.maxStepsPerEpisode,
        rewardType: this.rewardType
      }
    };
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    const state = this.state as ResourceAllocationState;
    
    // Process movement actions first
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
      
      // Store last action
      agentState.lastAction = Action[action];
      
      // Process movement
      if (action >= Action.MOVE_UP && action <= Action.MOVE_RIGHT) {
        this.processMovementAction(agentId, action);
      }
    }
    
    // Process resource pickup and allocation actions
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      
      switch (action) {
        case Action.PICK_UP_RESOURCE:
          this.processPickUpResourceAction(agentId);
          break;
        case Action.ALLOCATE_RESOURCE:
          this.processAllocateResourceAction(agentId);
          break;
      }
    }
    
    // Spawn new resources with probability
    if (Object.keys(state.resources).length < state.maxResources && 
        Math.random() < state.resourceSpawnProbability) {
      this.spawnResources(1);
    }
  }
  
  /**
   * Process movement action for an agent
   * @param agentId Agent ID
   * @param action Movement action
   */
  private processMovementAction(agentId: string, action: number): void {
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
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
   * Process pick up resource action for an agent
   * @param agentId Agent ID
   */
  private processPickUpResourceAction(agentId: string): void {
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    
    // Check if agent is already carrying a resource
    if (agentState.carryingResource) {
      return;
    }
    
    // Find a resource at the agent's position
    const [x, y] = agentState.position;
    let resourceToPickUp: string | null = null;
    
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      
      // Skip resources being carried
      if (resource.carriedBy !== null) continue;
      
      const [rx, ry] = resource.position;
      
      if (rx === x && ry === y) {
        resourceToPickUp = resourceId;
        break;
      }
    }
    
    // If a resource was found, pick it up
    if (resourceToPickUp) {
      const resource = state.resources[resourceToPickUp];
      
      // Update resource
      resource.carriedBy = agentId;
      
      // Update agent state
      agentState.carryingResource = resourceToPickUp;
      agentState.resourcesCollected++;
      
      // Add individual reward for collection
      this.applyReward(agentId, 1, 'collection');
    }
  }
  
  /**
   * Process allocate resource action for an agent
   * @param agentId Agent ID
   */
  private processAllocateResourceAction(agentId: string): void {
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    
    // Check if agent is carrying a resource
    if (!agentState.carryingResource) {
      return;
    }
    
    // Find a goal at the agent's position
    const [x, y] = agentState.position;
    let goalToAllocateTo: string | null = null;
    
    for (const goalId in state.goals) {
      const goal = state.goals[goalId];
      const [gx, gy] = goal.position;
      
      if (gx === x && gy === y && goal.resourcesAllocated < goal.capacity) {
        goalToAllocateTo = goalId;
        break;
      }
    }
    
    // If a goal was found, allocate the resource
    if (goalToAllocateTo) {
      const goal = state.goals[goalToAllocateTo];
      const resource = state.resources[agentState.carryingResource];
      
      // Update goal
      goal.resourcesAllocated++;
      
      // Remove resource
      delete state.resources[agentState.carryingResource];
      
      // Update agent state
      agentState.carryingResource = null;
      agentState.resourcesAllocated++;
      
      // Calculate reward based on resource value and goal multiplier
      const baseReward = resource.value * goal.value;
      
      // Apply reward based on reward type
      this.applyReward(agentId, baseReward * 2, 'allocation');
    }
  }
  
  /**
   * Apply reward to agent based on reward type
   * @param agentId Agent ID
   * @param amount Reward amount
   * @param action Action that generated the reward
   */
  private applyReward(agentId: string, amount: number, action: 'collection' | 'allocation'): void {
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    
    switch (this.rewardType) {
      case RewardType.INDIVIDUAL:
        // Only individual gets reward
        agentState.score.individual += amount;
        break;
      
      case RewardType.TEAM:
        // All team members get reward
        if (agentState.team) {
          const team = state.teams[agentState.team];
          team.score += amount;
          
          for (const memberId of team.members) {
            const memberState = this.agentStates[memberId] as ResourceAllocationAgentState;
            memberState.score.team += amount;
          }
        } else {
          // If no team, treat as individual
          agentState.score.individual += amount;
        }
        break;
      
      case RewardType.MIXED:
        // Split between individual and team
        agentState.score.individual += amount * 0.5;
        
        if (agentState.team) {
          const team = state.teams[agentState.team];
          team.score += amount * 0.5;
          
          for (const memberId of team.members) {
            const memberState = this.agentStates[memberId] as ResourceAllocationAgentState;
            memberState.score.team += amount * 0.5;
          }
        } else {
          // If no team, give other half to individual too
          agentState.score.individual += amount * 0.5;
        }
        break;
      
      case RewardType.ZERO_SUM:
        // Agent gets reward, others lose
        agentState.score.individual += amount;
        
        // Others lose a portion of the reward
        const penalty = amount / (this.agentIds.length - 1);
        for (const otherId of this.agentIds) {
          if (otherId !== agentId) {
            const otherState = this.agentStates[otherId] as ResourceAllocationAgentState;
            otherState.score.individual -= penalty;
          }
        }
        break;
    }
  }
  
  /**
   * Calculate reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    
    // Base reward is -0.01 per step to encourage efficiency
    let reward = -0.01;
    
    // Add individual and team rewards (already applied in action processing)
    switch (this.rewardType) {
      case RewardType.INDIVIDUAL:
      case RewardType.ZERO_SUM:
        reward += agentState.score.individual;
        break;
      
      case RewardType.TEAM:
        reward += agentState.score.team;
        break;
      
      case RewardType.MIXED:
        reward += (agentState.score.individual + agentState.score.team);
        break;
    }
    
    return reward;
  }
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected isAgentDone(agentId: string): boolean {
    const state = this.state as ResourceAllocationState;
    
    // Check if all goals are filled
    let allGoalsFilled = true;
    for (const goalId in state.goals) {
      const goal = state.goals[goalId];
      if (goal.resourcesAllocated < goal.capacity) {
        allGoalsFilled = false;
        break;
      }
    }
    
    return allGoalsFilled;
  }
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected getAgentInfo(agentId: string): any {
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    
    return {
      position: agentState.position,
      carryingResource: agentState.carryingResource,
      team: agentState.team,
      score: agentState.score,
      resourcesCollected: agentState.resourcesCollected,
      resourcesAllocated: agentState.resourcesAllocated,
      rewardType: this.rewardType
    };
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    const state = this.state as ResourceAllocationState;
    
    if (mode === 'human') {
      // Create a string representation of the grid
      let output = `Step: ${this.currentStep}/${this.maxStepsPerEpisode}\n`;
      output += `Reward Type: ${this.rewardType}\n\n`;
      
      // Show agent scores
      output += 'Agents:\n';
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
        const agentIndex = this.agentIds.indexOf(agentId);
        const teamStr = agentState.team ? `Team ${agentState.team}` : 'No Team';
        output += `  Agent ${agentIndex} (${teamStr}): Individual=${agentState.score.individual.toFixed(1)}, Team=${agentState.score.team.toFixed(1)}\n`;
      }
      output += '\n';
      
      // Show team scores
      if (Object.keys(state.teams).length > 0) {
        output += 'Teams:\n';
        for (const teamId in state.teams) {
          const team = state.teams[teamId];
          output += `  Team ${teamId}: Score=${team.score.toFixed(1)}, Members=${team.members.length}\n`;
        }
        output += '\n';
      }
      
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
      
      // Add goals
      for (const goalId in state.goals) {
        const goal = state.goals[goalId];
        const [gx, gy] = goal.position;
        
        grid[gy][gx] = `G${goal.value}`;
      }
      
      // Add resources
      for (const resourceId in state.resources) {
        const resource = state.resources[resourceId];
        
        // Skip resources being carried
        if (resource.carriedBy !== null) continue;
        
        const [rx, ry] = resource.position;
        
        switch (resource.type) {
          case ResourceType.COMMON:
            grid[ry][rx] = 'C';
            break;
          case ResourceType.RARE:
            grid[ry][rx] = 'R';
            break;
          case ResourceType.VALUABLE:
            grid[ry][rx] = 'V';
            break;
        }
      }
      
      // Add agents
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
        const [ax, ay] = agentState.position;
        
        // Use agent index as identifier
        const agentIndex = this.agentIds.indexOf(agentId);
        grid[ay][ax] = agentState.carryingResource ? `${agentIndex}*` : `${agentIndex}`;
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
          const agentState = this.agentStates[id] as ResourceAllocationAgentState;
          return {
            id,
            position: agentState.position,
            carryingResource: agentState.carryingResource,
            team: agentState.team,
            score: agentState.score
          };
        }),
        resources: Object.entries(state.resources).map(([id, resource]) => ({
          id,
          type: resource.type,
          position: resource.position,
          value: resource.value,
          carriedBy: resource.carriedBy
        })),
        goals: Object.entries(state.goals).map(([id, goal]) => ({
          id,
          position: goal.position,
          resourcesAllocated: goal.resourcesAllocated,
          capacity: goal.capacity,
          value: goal.value
        })),
        teams: Object.entries(state.teams).map(([id, team]) => ({
          id,
          members: team.members,
          score: team.score
        })),
        rewardType: this.rewardType
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
    
    // Assign team
    this.teamAssignments[agentId] = config.team || null;
    
    // Update team members if agent has a team
    if (config.team) {
      const state = this.state as ResourceAllocationState;
      if (!state.teams[config.team]) {
        state.teams[config.team] = {
          id: config.team,
          members: [agentId],
          score: 0
        };
      } else {
        state.teams[config.team].members.push(agentId);
      }
    }
    
    // Initialize agent state
    this.resetAgentState(agentId);
    
    // Initialize action and observation spaces
    this.actionSpaces[agentId] = {
      type: 'discrete',
      n: 6
    } as DiscreteActionSpace;
    
    this.observationSpaces[agentId] = {
      type: 'dict',
      spaces: {
        grid: {
          type: 'box',
          shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 3],
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
        team: {
          type: 'discrete',
          n: Object.keys(this.teamAssignments).length + 1
        },
        score: {
          type: 'dict',
          spaces: {
            individual: {
              type: 'box',
              shape: [1],
              low: 0,
              high: 100
            },
            team: {
              type: 'box',
              shape: [1],
              low: 0,
              high: 100
            }
          }
        },
        nearbyAgents: {
          type: 'box',
          shape: [this.agentIds.length, 4],
          low: 0,
          high: Math.max(this.gridSize - 1, Object.keys(this.teamAssignments).length)
        },
        nearbyResources: {
          type: 'box',
          shape: [this.maxResources, 4],
          low: 0,
          high: Math.max(this.gridSize - 1, 3)
        },
        nearbyGoals: {
          type: 'box',
          shape: [this.numGoals, 4],
          low: 0,
          high: Math.max(this.gridSize - 1, 10)
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
    
    // Get agent state
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    
    // Remove agent from team
    if (agentState.team) {
      const state = this.state as ResourceAllocationState;
      const team = state.teams[agentState.team];
      const memberIndex = team.members.indexOf(agentId);
      if (memberIndex !== -1) {
        team.members.splice(memberIndex, 1);
      }
      
      // Remove team if empty
      if (team.members.length === 0) {
        delete state.teams[agentState.team];
      }
    }
    
    // Remove agent ID
    this.agentIds.splice(index, 1);
    
    // Remove agent state
    delete this.agentStates[agentId];
    
    // Remove team assignment
    delete this.teamAssignments[agentId];
    
    // Remove action and observation spaces
    delete this.actionSpaces[agentId];
    delete this.observationSpaces[agentId];
    
    // If agent was carrying a resource, return it to the grid
    const state = this.state as ResourceAllocationState;
    for (const resourceId in state.resources) {
      const resource = state.resources[resourceId];
      if (resource.carriedBy === agentId) {
        resource.carriedBy = null;
        resource.position = this.findEmptyPosition() || [0, 0];
      }
    }
    
    return true;
  }
  
  /**
   * Spawn resources in the environment
   * @param count Number of resources to spawn
   */
  private spawnResources(count: number = 1): void {
    const state = this.state as ResourceAllocationState;
    
    for (let i = 0; i < count; i++) {
      // Find a valid position
      const position = this.findEmptyPosition();
      if (!position) continue;
      
      // Determine resource type based on distribution
      const rand = Math.random();
      let type: ResourceType;
      let value: number;
      
      if (rand < this.resourceDistribution[ResourceType.COMMON]) {
        type = ResourceType.COMMON;
        value = 1;
      } else if (rand < this.resourceDistribution[ResourceType.COMMON] + this.resourceDistribution[ResourceType.RARE]) {
        type = ResourceType.RARE;
        value = 2;
      } else {
        type = ResourceType.VALUABLE;
        value = 3;
      }
      
      // Create resource
      const resourceId = `resource_${state.resourceIdCounter++}`;
      state.resources[resourceId] = {
        id: resourceId,
        type,
        position,
        value,
        carriedBy: null
      };
    }
  }
  
  /**
   * Find an empty position in the grid
   * @returns Empty position or null if none found
   */
  private findEmptyPosition(): [number, number] | null {
    const state = this.state as ResourceAllocationState;
    
    // Try random positions
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      
      if (state.grid[y][x] === 0 && !this.isPositionOccupied([x, y]) && !this.isResourceAt([x, y]) && !this.isGoalAt([x, y])) {
        return [x, y];
      }
    }
    
    // If random attempts fail, try systematically
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (state.grid[y][x] === 0 && !this.isPositionOccupied([x, y]) && !this.isResourceAt([x, y]) && !this.isGoalAt([x, y])) {
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
      const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
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
    const state = this.state as ResourceAllocationState;
    
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
   * Check if a goal is at a position
   * @param position Position to check
   * @returns True if a goal is at the position
   */
  private isGoalAt(position: [number, number]): boolean {
    const [x, y] = position;
    const state = this.state as ResourceAllocationState;
    
    for (const goalId in state.goals) {
      const goal = state.goals[goalId];
      const [gx, gy] = goal.position;
      
      if (gx === x && gy === y) {
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
    const state = this.state as ResourceAllocationState;
    const agentState = this.agentStates[agentId] as ResourceAllocationAgentState;
    const [x, y] = agentState.position;
    
    // Create grid view with 3 channels
    const gridView = Array(this.viewDistance * 2 + 1)
      .fill(0)
      .map(() => Array(this.viewDistance * 2 + 1)
        .fill(0)
        .map(() => Array(3).fill(0)));
    
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
            const otherState = this.agentStates[otherId] as ResourceAllocationAgentState;
            const [ox, oy] = otherState.position;
            
            if (ox === gx && oy === gy) {
              // Encode agent team: Self (1), Same team (2), Different team (3)
              if (otherId === agentId) {
                gridView[vy][vx][1] = 1;
              } else if (otherState.team === agentState.team && otherState.team !== null) {
                gridView[vy][vx][1] = 2;
              } else {
                gridView[vy][vx][1] = 3;
              }
              break;
            }
          }
          
          // Channel 2: Resources (1-3) and Goals (4-6)
          // Check for resources
          for (const resourceId in state.resources) {
            const resource = state.resources[resourceId];
            
            // Skip resources being carried
            if (resource.carriedBy !== null) continue;
            
            const [rx, ry] = resource.position;
            
            if (rx === gx && ry === gy) {
              // Encode resource type: Common (1), Rare (2), Valuable (3)
              switch (resource.type) {
                case ResourceType.COMMON:
                  gridView[vy][vx][2] = 1;
                  break;
                case ResourceType.RARE:
                  gridView[vy][vx][2] = 2;
                  break;
                case ResourceType.VALUABLE:
                  gridView[vy][vx][2] = 3;
                  break;
              }
              break;
            }
          }
          
          // Check for goals
          for (const goalId in state.goals) {
            const goal = state.goals[goalId];
            const [gx, gy] = goal.position;
            
            if (gx === gx && gy === gy) {
              // Encode goal value: Value 1 (4), Value 2 (5), Value 3 (6)
              gridView[vy][vx][2] = 3 + goal.value;
              break;
            }
          }
        }
      }
    }
    
    return gridView;
  }
}

/**
 * Factory function to create a specific reward structure environment
 * @param rewardType Type of reward structure
 * @param config Environment configuration
 * @returns ResourceAllocationEnvironment with specified reward structure
 */
export function createRewardStructureEnvironment(
  rewardType: RewardType,
  config: any = {}
): ResourceAllocationEnvironment {
  return new ResourceAllocationEnvironment({
    ...config,
    rewardType
  });
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Create individual reward environment
 * const individualEnv = createRewardStructureEnvironment(RewardType.INDIVIDUAL, {
 *   gridSize: 8,
 *   maxStepsPerEpisode: 100,
 *   agents: [
 *     { id: 'agent1' },
 *     { id: 'agent2' },
 *     { id: 'agent3' },
 *     { id: 'agent4' }
 *   ]
 * });
 * 
 * // Create team reward environment
 * const teamEnv = createRewardStructureEnvironment(RewardType.TEAM, {
 *   gridSize: 8,
 *   maxStepsPerEpisode: 100,
 *   agents: [
 *     { id: 'agent1', team: 'team1' },
 *     { id: 'agent2', team: 'team1' },
 *     { id: 'agent3', team: 'team1' },
 *     { id: 'agent4', team: 'team1' }
 *   ]
 * });
 * 
 * // Create mixed reward environment
 * const mixedEnv = createRewardStructureEnvironment(RewardType.MIXED, {
 *   gridSize: 8,
 *   maxStepsPerEpisode: 100,
 *   agents: [
 *     { id: 'agent1', team: 'team1' },
 *     { id: 'agent2', team: 'team1' },
 *     { id: 'agent3', team: 'team1' },
 *     { id: 'agent4', team: 'team1' }
 *   ]
 * });
 * 
 * // Create zero-sum reward environment
 * const zeroSumEnv = createRewardStructureEnvironment(RewardType.ZERO_SUM, {
 *   gridSize: 8,
 *   maxStepsPerEpisode: 100,
 *   agents: [
 *     { id: 'agent1' },
 *     { id: 'agent2' },
 *     { id: 'agent3' },
 *     { id: 'agent4' }
 *   ]
 * });
 * 
 * // Run episode
 * const env = individualEnv; // Choose environment to run
 * const initialObservations = env.reset();
 * 
 * let done = false;
 * while (!done) {
 *   // Get actions from agents (in a real scenario, these would come from agent policies)
 *   const actions = {};
 *   for (const agentId of env.getAgentIds()) {
 *     actions[agentId] = {
 *       action: Math.floor(Math.random() * 6) // Random action
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
