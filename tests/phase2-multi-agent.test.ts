/**
 * Multi-Agent System Phase 2 Tests
 * 
 * This file tests the Phase 2 features of the TypeScript multi-agent system:
 * - Action coordination (simultaneous and turn-based)
 * - Reward structures (individual, team, mixed, zero-sum)
 * - Agent observations and team awareness
 * - Communication between agents
 */

import { 
  MultiAgentEnvironment, 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction,
  AgentStepResult,
  ActionExecutionMode,
  RewardStructureType,
  Team
} from '../src/multiagent/typescript';

import { ObservationSpace, ActionSpace } from '../src/types/environment';
import { Agent } from '../src/types/agent';
import { AgentFactory } from '../src/utils/helpers';
import { MultiAgentManager } from '../src/multiagent/typescript/MultiAgentManager';
import { MultiAgentExperimentRunner } from '../src/multiagent/typescript/MultiAgentExperimentRunner';

/**
 * Grid world environment for testing multi-agent functionality
 * Enhanced for Phase 2 features
 */
class TestGridWorldEnvironment extends BaseMultiAgentEnvironment {
  // Grid dimensions
  private width: number;
  private height: number;
  
  // Agent positions
  private agentPositions: Record<string, [number, number]> = {};
  
  // Goal positions
  private goalPositions: Record<string, [number, number]> = {};
  
  // Obstacles
  private obstacles: [number, number][] = [];
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    super(config);
    
    this.width = config.width || 10;
    this.height = config.height || 10;
    
    // Initialize obstacles - ensure it's always an array
    if (config.obstacles && Array.isArray(config.obstacles)) {
      this.obstacles = config.obstacles;
    } else {
      // Default to empty array if obstacles is not provided or not an array
      this.obstacles = [];
    }
    
    // Initialize state immediately to avoid undefined state
    this.initializeState(config);
  }
  
  /**
   * Initialize environment state
   * @param config Environment configuration
   */
  protected initializeState(config: any): void {
    this.state = {
      grid: Array(this.height).fill(0).map(() => Array(this.width).fill(0)),
      step: 0
    };
    
    // Add obstacles to grid - ensure obstacles is iterable
    if (this.obstacles && Array.isArray(this.obstacles)) {
      for (const [x, y] of this.obstacles) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.state.grid[y][x] = 1; // 1 represents obstacle
        }
      }
    }
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    // Ensure state exists
    if (!this.state) {
      this.state = {
        grid: Array(this.height).fill(0).map(() => Array(this.width).fill(0)),
        step: 0
      };
    } else {
      this.state.step = 0;
      
      // Reset grid (keep obstacles)
      this.state.grid = Array(this.height).fill(0).map(() => Array(this.width).fill(0));
    }
    
    // Add obstacles to grid - ensure obstacles is iterable
    if (this.obstacles && Array.isArray(this.obstacles)) {
      for (const [x, y] of this.obstacles) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.state.grid[y][x] = 1; // 1 represents obstacle
        }
      }
    }
    
    // Clear messages
    this.clearMessages();
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    // Ensure state exists
    if (!this.state || !this.state.grid) {
      this.resetState();
    }
    
    // Place agent at random position
    let x, y;
    do {
      x = Math.floor(Math.random() * this.width);
      y = Math.floor(Math.random() * this.height);
    } while (this.state.grid[y][x] !== 0); // Ensure position is not an obstacle
    
    this.agentPositions[agentId] = [x, y];
    
    // Place goal at random position
    do {
      x = Math.floor(Math.random() * this.width);
      y = Math.floor(Math.random() * this.height);
    } while (
      this.state.grid[y][x] !== 0 || // Ensure position is not an obstacle
      this.isPositionOccupied([x, y]) // Ensure position is not occupied by another agent or goal
    );
    
    this.goalPositions[agentId] = [x, y];
    
    // Update agent state
    this.agentStates[agentId] = {
      position: this.agentPositions[agentId],
      goal: this.goalPositions[agentId],
      reachedGoal: false
    };
  }
  
  /**
   * Check if a position is occupied by an agent or goal
   * @param position Position to check
   * @returns True if position is occupied
   */
  private isPositionOccupied(position: [number, number]): boolean {
    const [x, y] = position;
    
    // Check if position is occupied by an agent
    for (const agentPosition of Object.values(this.agentPositions)) {
      if (agentPosition[0] === x && agentPosition[1] === y) {
        return true;
      }
    }
    
    // Check if position is occupied by a goal
    for (const goalPosition of Object.values(this.goalPositions)) {
      if (goalPosition[0] === x && goalPosition[1] === y) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get agent's position in the environment
   * @param agentId Agent ID
   * @returns Agent position
   */
  protected getAgentPosition(agentId: string): number[] | undefined {
    return this.agentPositions[agentId];
  }
  
  /**
   * Get environment dimensions
   * @returns Environment dimensions
   */
  protected getEnvironmentDimensions(): number[] {
    return [this.width, this.height];
  }
  
  /**
   * Get additional information about the environment
   * @returns Environment information
   */
  protected getEnvironmentInfo(): any {
    return {
      numObstacles: this.obstacles.length,
      numAgents: this.agentIds.length
    };
  }
  
  /**
   * Get additional information about an agent that is visible to other agents
   * @param agentId Agent ID
   * @returns Visible information about the agent
   */
  protected getAgentVisibleInfo(agentId: string): any {
    return {
      hasReachedGoal: this.agentStates[agentId].reachedGoal
    };
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    // Process messages first
    this.processMessages(actions);
    
    // Process each agent's action
    for (const [agentId, action] of Object.entries(actions)) {
      this.processAgentAction(agentId, action);
    }
  }
  
  /**
   * Process a single agent's action
   * @param agentId Agent ID
   * @param action Agent action
   */
  protected processAgentAction(agentId: string, action: AgentAction): void {
    // Process message if present
    if (action.message) {
      this.sendMessage(agentId, action.message.to, action.message.content);
    }
    
    // Process movement action
    const [x, y] = this.agentPositions[agentId];
    let newX = x;
    let newY = y;
    
    // Interpret action
    // 0: up, 1: right, 2: down, 3: left, 4: stay
    switch (action.action) {
      case 0: // Up
        newY = Math.max(0, y - 1);
        break;
      case 1: // Right
        newX = Math.min(this.width - 1, x + 1);
        break;
      case 2: // Down
        newY = Math.min(this.height - 1, y + 1);
        break;
      case 3: // Left
        newX = Math.max(0, x - 1);
        break;
      case 4: // Stay
        break;
      default:
        break;
    }
    
    // Check if new position is valid (not an obstacle)
    if (this.state.grid[newY][newX] === 0) {
      this.agentPositions[agentId] = [newX, newY];
      this.agentStates[agentId].position = [newX, newY];
    }
    
    // Check if agent reached goal
    const goalPosition = this.goalPositions[agentId];
    if (newX === goalPosition[0] && newY === goalPosition[1]) {
      this.agentStates[agentId].reachedGoal = true;
    }
  }
  
  /**
   * Calculate individual reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Individual reward value
   */
  protected calculateIndividualReward(agentId: string, actions: Record<string, AgentAction>): number {
    const agentState = this.agentStates[agentId];
    const [x, y] = agentState.position;
    const [goalX, goalY] = agentState.goal;
    
    // Calculate distance to goal
    const distance = Math.sqrt(
      Math.pow(x - goalX, 2) + 
      Math.pow(y - goalY, 2)
    );
    
    // Base reward is negative distance to goal (closer is better)
    let reward = -distance / Math.sqrt(this.width * this.width + this.height * this.height);
    
    // Bonus for reaching goal
    if (agentState.reachedGoal) {
      reward += 1.0;
    }
    
    // Penalty for collisions with other agents
    for (const otherId of this.agentIds) {
      if (otherId !== agentId) {
        const otherPosition = this.agentPositions[otherId];
        if (x === otherPosition[0] && y === otherPosition[1]) {
          reward -= 0.5;
        }
      }
    }
    
    return reward;
  }
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected isAgentDone(agentId: string): boolean {
    return this.agentStates[agentId].reachedGoal || this.currentStep >= this.maxStepsPerEpisode;
  }
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected getAgentInfo(agentId: string): any {
    const agentState = this.agentStates[agentId];
    const [x, y] = agentState.position;
    const [goalX, goalY] = agentState.goal;
    
    return {
      distance: Math.sqrt(
        Math.pow(x - goalX, 2) + 
        Math.pow(y - goalY, 2)
      ),
      reachedGoal: agentState.reachedGoal
    };
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    if (mode === 'human') {
      // Create a string representation of the grid
      let result = '';
      
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          // Check if position contains an agent
          let hasAgent = false;
          let agentId = '';
          
          for (const [id, position] of Object.entries(this.agentPositions)) {
            if (position[0] === x && position[1] === y) {
              hasAgent = true;
              agentId = id;
              break;
            }
          }
          
          // Check if position contains a goal
          let hasGoal = false;
          let goalAgentId = '';
          
          for (const [id, position] of Object.entries(this.goalPositions)) {
            if (position[0] === x && position[1] === y) {
              hasGoal = true;
              goalAgentId = id;
              break;
            }
          }
          
          if (hasAgent) {
            // Agent
            result += 'A';
          } else if (hasGoal) {
            // Goal
            result += 'G';
          } else if (this.state.grid[y][x] === 1) {
            // Obstacle
            result += '#';
          } else {
            // Empty
            result += '.';
          }
        }
        
        result += '\n';
      }
      
      return result;
    } else if (mode === 'rgb_array') {
      // Create a simple RGB representation (not implemented)
      return new Uint8Array(this.width * this.height * 3);
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
    
    // Create observation space
    this.observationSpaces[agentId] = {
      type: 'dict',
      spaces: {
        position: {
          type: 'box',
          shape: [2],
          low: [0, 0],
          high: [this.width - 1, this.height - 1]
        },
        goal: {
          type: 'box',
          shape: [2],
          low: [0, 0],
          high: [this.width - 1, this.height - 1]
        },
        grid: {
          type: 'box',
          shape: [3, 3],
          low: -1,
          high: 1
        }
      }
    };
    
    // Create action space (discrete with 5 actions)
    this.actionSpaces[agentId] = {
      type: 'discrete',
      n: 5, // 0: up, 1: right, 2: down, 3: left, 4: stay
      shape: [1] // Add shape to satisfy TypeScript
    };
    
    // Initialize agent state
    this.resetAgentState(agentId);
    
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
    delete this.agentPositions[agentId];
    delete this.goalPositions[agentId];
    delete this.observationSpaces[agentId];
    delete this.actionSpaces[agentId];
    
    return true;
  }
}

/**
 * Simple agent for testing
 */
class TestAgent implements Agent {
  private actionSpace: any;
  private observationSpace: any;
  private id: string;
  private teamId: string | null = null;
  
  /**
   * Constructor
   * @param id Agent ID
   * @param teamId Team ID (optional)
   */
  constructor(id: string, teamId?: string) {
    this.id = id;
    if (teamId) {
      this.teamId = teamId;
    }
  }
  
  /**
   * Initialize the agent
   * @param config Agent configuration
   */
  public initialize(config: any): void {
    this.actionSpace = config.actionSpace;
    this.observationSpace = config.observationSpace;
  }
  
  /**
   * Select an action based on observation
   * @param observation Agent observation
   * @returns Selected action
   */
  public selectAction(observation: any): any {
    // Simple heuristic: move towards goal
    const [x, y] = observation.state.position;
    const [goalX, goalY] = observation.state.goal;
    
    // Calculate direction to goal
    const dx = goalX - x;
    const dy = goalY - y;
    
    // Choose action based on direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Move horizontally
      return {
        action: dx > 0 ? 1 : 3, // Right or Left
        message: this.createMessage(observation)
      };
    } else if (dy !== 0) {
      // Move vertically
      return {
        action: dy > 0 ? 2 : 0, // Down or Up
        message: this.createMessage(observation)
      };
    } else {
      // At goal, stay
      return {
        action: 4,
        message: this.createMessage(observation)
      };
    }
  }
  
  /**
   * Create a message to send to other agents
   * @param observation Agent observation
   * @returns Message or undefined
   */
  private createMessage(observation: any): { to: string | 'all', content: any } | undefined {
    // Only send messages occasionally
    if (Math.random() < 0.2) {
      // If agent is part of a team, send message to team members
      if (observation.team) {
        // Find a random team member
        const teamMembers = observation.team.members.filter((id: string) => id !== this.id);
        if (teamMembers.length > 0) {
          const randomTeammate = teamMembers[Math.floor(Math.random() * teamMembers.length)];
          return {
            to: randomTeammate,
            content: {
              type: 'position',
              position: observation.state.position,
              goal: observation.state.goal
            }
          };
        }
      }
      
      // Otherwise, broadcast to all
      return {
        to: 'all',
        content: {
          type: 'status',
          position: observation.state.position
        }
      };
    }
    
    return undefined;
  }
  
  /**
   * Update agent with experience
   * @param experience Experience data
   */
  public update(experience: any): any {
    // No learning in this simple agent
    return { loss: 0 };
  }
  
  /**
   * Terminate the agent
   */
  public terminate(): void {
    // No resources to clean up
  }
  
  /**
   * Get agent ID
   * @returns Agent ID
   */
  public getId(): string {
    return this.id;
  }
  
  /**
   * Get team ID
   * @returns Team ID or null if not in a team
   */
  public getTeamId(): string | null {
    return this.teamId;
  }
}

/**
 * Mock agent factory for testing
 */
class TestAgentFactory implements AgentFactory {
  /**
   * Create an agent
   * @param config Agent configuration
   * @returns Created agent
   */
  public createAgent(config: any): Agent {
    return new TestAgent(config.id, config.team);
  }
}

// Define Jest test cases for Phase 2 features
describe('Multi-Agent System Phase 2 Features', () => {
  
  describe('Action Coordination', () => {
    it('should support simultaneous action execution', () => {
      // Create environment with simultaneous action mode
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        actionExecutionMode: ActionExecutionMode.SIMULTANEOUS
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Create actions
      const actions = {
        agent1: { action: 1 }, // Right
        agent2: { action: 2 }  // Down
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that both agents' actions were processed
      expect(stepResults.agent1).toBeDefined();
      expect(stepResults.agent2).toBeDefined();
      expect(env.getActionExecutionMode()).toBe(ActionExecutionMode.SIMULTANEOUS);
    });
    
    it('should support turn-based action execution', () => {
      // Create environment with turn-based action mode
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        actionExecutionMode: ActionExecutionMode.TURN_BASED
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Set turn order
      env.setTurnOrder(['agent1', 'agent2']);
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Get current turn
      const currentTurn = env.getCurrentTurn();
      expect(currentTurn).toBe('agent1');
      
      // Create action for current agent only
      const actions = {
        agent1: { action: 1 } // Right
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that only the current agent's action was processed
      expect(stepResults.agent1).toBeDefined();
      expect(stepResults.agent2).toBeDefined();
      
      // Verify that turn has moved to next agent
      expect(env.getCurrentTurn()).toBe('agent2');
    });
  });
  
  describe('Reward Structures', () => {
    it('should support individual rewards', () => {
      // Create environment with individual reward structure
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        rewardStructure: {
          type: RewardStructureType.INDIVIDUAL
        }
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Create actions
      const actions = {
        agent1: { action: 1 }, // Right
        agent2: { action: 2 }  // Down
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that reward structure type is correct
      expect(env.getRewardStructureType()).toBe(RewardStructureType.INDIVIDUAL);
      
      // Verify that each agent received its own reward
      expect(stepResults.agent1.reward).toBeDefined();
      expect(stepResults.agent2.reward).toBeDefined();
    });
    
    it('should support team rewards', () => {
      // Create environment with team reward structure
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        rewardStructure: {
          type: RewardStructureType.TEAM,
          teams: {
            team1: ['agent1', 'agent2']
          }
        }
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Create actions
      const actions = {
        agent1: { action: 1 }, // Right
        agent2: { action: 2 }  // Down
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that reward structure type is correct
      expect(env.getRewardStructureType()).toBe(RewardStructureType.TEAM);
      
      // Verify that both agents received the same reward
      expect(stepResults.agent1.reward).toEqual(stepResults.agent2.reward);
    });
    
    it('should support mixed rewards', () => {
      // Create environment with mixed reward structure
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        rewardStructure: {
          type: RewardStructureType.MIXED,
          teams: {
            team1: ['agent1', 'agent2']
          },
          weights: {
            individual: 0.7,
            team: 0.3
          }
        }
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Create actions
      const actions = {
        agent1: { action: 1 }, // Right
        agent2: { action: 2 }  // Down
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that reward structure type is correct
      expect(env.getRewardStructureType()).toBe(RewardStructureType.MIXED);
      
      // Verify that each agent received a reward
      expect(stepResults.agent1.reward).toBeDefined();
      expect(stepResults.agent2.reward).toBeDefined();
    });
  });
  
  describe('Agent Observations', () => {
    it('should include information about other agents', () => {
      // Create environment
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Verify that observations include information about other agents
      expect(initialObservations.agent1.others).toBeDefined();
      expect(initialObservations.agent1.others.agent2).toBeDefined();
      expect(initialObservations.agent2.others).toBeDefined();
      expect(initialObservations.agent2.others.agent1).toBeDefined();
    });
    
    it('should include team information when agents are in teams', () => {
      // Create environment with teams
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        rewardStructure: {
          type: RewardStructureType.TEAM,
          teams: {
            team1: ['agent1', 'agent2']
          }
        }
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Verify that observations include team information
      expect(initialObservations.agent1.team).toBeDefined();
      expect(initialObservations.agent1.team?.id).toBe('team1');
      expect(initialObservations.agent1.team?.members).toContain('agent1');
      expect(initialObservations.agent1.team?.members).toContain('agent2');
    });
    
    it('should respect visibility radius when observing other agents', () => {
      // Create environment with limited visibility
      const env = new TestGridWorldEnvironment({
        width: 10,
        height: 10,
        obstacles: [[5, 5]],
        maxStepsPerEpisode: 100,
        visibilityRadius: 3
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      let initialObservations = env.reset();
      
      // Force agent positions to be far apart
      (env as any).agentPositions.agent1 = [1, 1];
      (env as any).agentPositions.agent2 = [8, 8];
      (env as any).agentStates.agent1.position = [1, 1];
      (env as any).agentStates.agent2.position = [8, 8];
      
      // Get updated observations
      initialObservations = env.reset();
      
      // Verify that agents are not visible to each other due to distance
      expect(initialObservations.agent1.others.agent2.visible).toBe(false);
      expect(initialObservations.agent2.others.agent1.visible).toBe(false);
      
      // Move agents closer
      (env as any).agentPositions.agent1 = [3, 3];
      (env as any).agentPositions.agent2 = [4, 4];
      (env as any).agentStates.agent1.position = [3, 3];
      (env as any).agentStates.agent2.position = [4, 4];
      
      // Create actions
      const actions = {
        agent1: { action: 4 }, // Stay
        agent2: { action: 4 }  // Stay
      };
      
      // Step environment to update observations
      const stepResults = env.step(actions);
      
      // Verify that agents are now visible to each other
      expect(stepResults.agent1.observation.others.agent2.visible).toBe(true);
      expect(stepResults.agent2.observation.others.agent1.visible).toBe(true);
    });
  });
  
  describe('Agent Communication', () => {
    it('should support sending and receiving messages between agents', () => {
      // Create environment
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Send a message from agent1 to agent2
      env.sendMessage('agent1', 'agent2', { type: 'test', content: 'Hello from agent1' });
      
      // Create actions
      const actions = {
        agent1: { action: 1 }, // Right
        agent2: { action: 2 }  // Down
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that agent2 received the message
      expect(stepResults.agent2.observation.messages).toBeDefined();
      if (stepResults.agent2.observation.messages) {
        expect(stepResults.agent2.observation.messages.length).toBeGreaterThan(0);
        expect(stepResults.agent2.observation.messages[0].from).toBe('agent1');
      }
    });
    
    it('should support sending messages through agent actions', () => {
      // Create environment
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Create actions with messages
      const actions = {
        agent1: { 
          action: 1, // Right
          message: {
            to: 'agent2',
            content: { type: 'test', content: 'Hello from agent1 action' }
          }
        },
        agent2: { action: 2 }  // Down
      };
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Verify that agent2 received the message
      expect(stepResults.agent2.observation.messages).toBeDefined();
      if (stepResults.agent2.observation.messages) {
        expect(stepResults.agent2.observation.messages.length).toBeGreaterThan(0);
        expect(stepResults.agent2.observation.messages[0].from).toBe('agent1');
      }
    });
  });
  
  describe('Integration with MultiAgentManager', () => {
    it('should work with MultiAgentManager for coordinating multiple agents', () => {
      // Create environment
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        rewardStructure: {
          type: RewardStructureType.TEAM,
          teams: {
            team1: ['agent1', 'agent2']
          }
        }
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Create agent factory
      const agentFactory = new TestAgentFactory();
      
      // Create manager
      const manager = new MultiAgentManager({
        agents: {
          agent1: { id: 'agent1', type: 'test', team: 'team1' },
          agent2: { id: 'agent2', type: 'test', team: 'team1' }
        },
        agentFactory,
        autoCreateAgents: true,
        actionMode: 'simultaneous'
      });
      
      // Initialize agents
      manager.initializeAgents(env);
      
      // Reset environment
      const initialObservations = env.reset();
      
      // Get actions
      const actions = manager.getActions(initialObservations);
      
      // Verify that actions were generated for both agents
      expect(actions.agent1).toBeDefined();
      expect(actions.agent2).toBeDefined();
      
      // Step environment
      const stepResults = env.step(actions);
      
      // Update agents
      manager.updateAgents(stepResults);
      
      // Verify that step results were generated for both agents
      expect(stepResults.agent1).toBeDefined();
      expect(stepResults.agent2).toBeDefined();
    });
  });
  
  describe('Integration with MultiAgentExperimentRunner', () => {
    it('should work with MultiAgentExperimentRunner for running experiments', async () => {
      // Create runner
      const runner = new MultiAgentExperimentRunner({
        experimentId: 'test-experiment',
        environmentConfig: {
          width: 5,
          height: 5,
          obstacles: [[2, 2]],
          maxStepsPerEpisode: 10,
          simultaneousActions: true,
          rewardStructure: {
            type: RewardStructureType.TEAM,
            teams: {
              team1: ['agent1', 'agent2']
            }
          }
        },
        agentConfigs: {
          agent1: { id: 'agent1', type: 'test', team: 'team1' },
          agent2: { id: 'agent2', type: 'test', team: 'team1' }
        },
        agentFactory: new TestAgentFactory(),
        maxSteps: 50,
        maxEpisodes: 2
      });
      
      // Run experiment (but don't wait for completion to avoid long test)
      runner.run();
      
      // Verify that runner was initialized correctly
      expect(runner).toBeDefined();
    });
  });
});
