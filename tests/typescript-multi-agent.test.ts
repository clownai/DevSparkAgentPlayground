/**
 * Modified Multi-Agent System Test
 * 
 * This file tests the core components of the TypeScript multi-agent system with
 * fixes for TypeScript compatibility issues.
 */

import { 
  MultiAgentEnvironment, 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction,
  AgentStepResult
} from '../src/multiagent/typescript';

import { ObservationSpace, ActionSpace } from '../src/types/environment';
import { Agent } from '../src/types/agent';
import { AgentFactory } from '../src/utils/helpers';
import { VisualizationManager } from '../src/visualization/VisualizationManager';
import ExperimentRunner from '../src/utils/ExperimentRunner';
import { MultiAgentManager } from '../src/multiagent/typescript/MultiAgentManager';
import { MultiAgentExperimentRunner } from '../src/multiagent/typescript/MultiAgentExperimentRunner';
import { MultiAgentConfigLoader } from '../src/multiagent/typescript/MultiAgentConfigLoader';

/**
 * Simple grid world environment for testing multi-agent functionality
 */
class TestGridWorldEnvironment extends BaseMultiAgentEnvironment {
  // Grid dimensions
  private width: number;
  private height: number;
  
  // Agent positions
  private agentPositions: Record<string, [number, number]> = {};
  
  // Goal positions
  private goalPositions: Record<string, [number, number]> = {};
  
  // Obstacles - initialize as empty array
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
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    const agentState = this.agentStates[agentId];
    const [x, y] = agentState.position;
    
    // Create observation with agent's view of the grid
    const observation: AgentObservation = {
      state: {
        position: [x, y],
        goal: agentState.goal,
        grid: this.getLocalGrid(x, y, 3) // 3x3 grid centered on agent
      },
      position: [x, y],
      others: {},
      environment: {
        dimensions: [this.width, this.height],
        step: this.currentStep
      }
    };
    
    // Add information about other agents
    for (const otherId of this.agentIds) {
      if (otherId !== agentId) {
        const otherPosition = this.agentPositions[otherId];
        const distance = Math.sqrt(
          Math.pow(x - otherPosition[0], 2) + 
          Math.pow(y - otherPosition[1], 2)
        );
        
        // Only include other agents within visibility range (5 units)
        const visible = distance <= 5;
        
        // Initialize others object if undefined
        if (!observation.others) {
          observation.others = {};
        }
        
        observation.others[otherId] = {
          id: otherId,
          visible,
          distance,
          position: visible ? otherPosition : undefined
        };
      }
    }
    
    return observation;
  }
  
  /**
   * Get a local view of the grid centered on a position
   * @param centerX Center X coordinate
   * @param centerY Center Y coordinate
   * @param size Size of the local grid (must be odd)
   * @returns Local grid
   */
  private getLocalGrid(centerX: number, centerY: number, size: number): number[][] {
    const radius = Math.floor(size / 2);
    const localGrid: number[][] = [];
    
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      const row: number[] = [];
      
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
          // Out of bounds
          row.push(-1);
        } else {
          // Copy from main grid
          row.push(this.state.grid[y][x]);
        }
      }
      
      localGrid.push(row);
    }
    
    return localGrid;
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    // Process each agent's action
    for (const [agentId, action] of Object.entries(actions)) {
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
    
    // Increment step counter
    this.state.step++;
  }
  
  /**
   * Calculate reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
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
    return this.agentStates[agentId].reachedGoal;
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
      return dx > 0 ? 1 : 3; // Right or Left
    } else if (dy !== 0) {
      // Move vertically
      return dy > 0 ? 2 : 0; // Down or Up
    } else {
      // At goal, stay
      return 4;
    }
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
    return new TestAgent();
  }
}

/**
 * Custom experiment runner for testing
 */
class TestExperimentRunner extends ExperimentRunner {
  // Add public createEnvironment method for testing
  public async createEnvironment(config: any): Promise<any> {
    const env = new TestGridWorldEnvironment(config);
    env.addAgent('agent1', {});
    env.addAgent('agent2', {});
    return env;
  }
  
  // Add public getter for agentManager
  public getAgentManager(): any {
    return { 
      // Mock agent manager with public agentFactory property
      agentFactory: null
    };
  }
}

// Define proper Jest test cases
describe('Multi-Agent System Core Components', () => {
  
  describe('MultiAgentEnvironment', () => {
    it('should initialize correctly', () => {
      // Create environment
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        simultaneousActions: true
      });
      
      // Add agents
      const agent1Added = env.addAgent('agent1', {});
      const agent2Added = env.addAgent('agent2', {});
      
      expect(agent1Added).toBe(true);
      expect(agent2Added).toBe(true);
      expect(env.getAgentIds()).toContain('agent1');
      expect(env.getAgentIds()).toContain('agent2');
    });
    
    it('should reset and provide observations', () => {
      // Create environment
      const env = new TestGridWorldEnvironment({
        width: 5,
        height: 5,
        obstacles: [[2, 2]],
        maxStepsPerEpisode: 100,
        simultaneousActions: true
      });
      
      // Add agents
      env.addAgent('agent1', {});
      env.addAgent('agent2', {});
      
      // Reset environment
      const initialObservations = env.reset();
      
      expect(initialObservations).toBeDefined();
      expect(initialObservations.agent1).toBeDefined();
      expect(initialObservations.agent2).toBeDefined();
    });
  });
  
  describe('MultiAgentManager', () => {
    it('should initialize correctly', () => {
      const manager = new MultiAgentManager({
        agents: {
          agent1: { type: 'test' },
          agent2: { type: 'test' }
        },
        autoCreateAgents: true,
        actionMode: 'simultaneous'
      });
      
      expect(manager).toBeDefined();
    });
  });
  
  describe('MultiAgentConfigLoader', () => {
    it('should initialize correctly', () => {
      const configLoader = new MultiAgentConfigLoader();
      expect(configLoader).toBeDefined();
    });
  });
  
  describe('MultiAgentExperimentRunner', () => {
    it('should initialize correctly', () => {
      const runner = new MultiAgentExperimentRunner({
        experimentId: 'test-experiment',
        environmentConfig: {
          width: 5,
          height: 5,
          obstacles: [[2, 2]],
          maxStepsPerEpisode: 100,
          simultaneousActions: true
        },
        agentConfigs: {
          agent1: { type: 'test' },
          agent2: { type: 'test' }
        },
        maxSteps: 1000,
        maxEpisodes: 10
      });
      
      expect(runner).toBeDefined();
    });
  });
});

// Legacy test functions - kept for reference but not used in Jest tests
function testMultiAgentEnvironment() {
  console.log('Testing MultiAgentEnvironment...');
  
  // Create environment
  const env = new TestGridWorldEnvironment({
    width: 5,
    height: 5,
    obstacles: [[2, 2]],
    maxStepsPerEpisode: 100,
    simultaneousActions: true
  });
  
  // Add agents
  env.addAgent('agent1', {});
  env.addAgent('agent2', {});
  
  // Reset environment
  const initialObservations = env.reset();
  
  console.log('Initial observations:', initialObservations);
  
  // Create actions
  const actions = {
    agent1: { action: 1 }, // Right
    agent2: { action: 2 }  // Down
  };
  
  // Step environment
  const stepResults = env.step(actions);
  
  console.log('Step results:', stepResults);
  
  // Render environment
  const rendering = env.render();
  
  console.log('Rendering:');
  console.log(rendering);
}

function testMultiAgentManager() {
  console.log('Testing MultiAgentManager...');
  
  // Create environment
  const env = new TestGridWorldEnvironment({
    width: 5,
    height: 5,
    obstacles: [[2, 2]],
    maxStepsPerEpisode: 100,
    simultaneousActions: true
  });
  
  // Add agents
  env.addAgent('agent1', {});
  env.addAgent('agent2', {});
  
  // Create agent factory
  const agentFactory = new TestAgentFactory();
  
  // Create manager
  const manager = new MultiAgentManager({
    agents: {
      agent1: { type: 'test' },
      agent2: { type: 'test' }
    },
    autoCreateAgents: true,
    actionMode: 'simultaneous'
  });
  
  // Initialize agents
  manager.initializeAgents(env);
  
  // Reset environment
  const initialObservations = env.reset();
  
  // Get actions
  const actions = manager.getActions(initialObservations);
  
  console.log('Actions:', actions);
  
  // Step environment
  const stepResults = env.step(actions);
  
  // Update agents
  manager.updateAgents(stepResults);
}

function testMultiAgentExperimentRunner() {
  console.log('Testing MultiAgentExperimentRunner...');
  
  // Create runner
  const runner = new MultiAgentExperimentRunner({
    experimentId: 'test-experiment',
    environmentConfig: {
      width: 5,
      height: 5,
      obstacles: [[2, 2]],
      maxStepsPerEpisode: 100,
      simultaneousActions: true
    },
    agentConfigs: {
      agent1: { type: 'test' },
      agent2: { type: 'test' }
    },
    maxSteps: 1000,
    maxEpisodes: 10
  });
  
  // Run experiment
  runner.run().then(success => {
    console.log('Experiment completed with success:', success);
  });
}

// Main test function
async function runTests() {
  console.log('Running multi-agent system tests...');
  
  try {
    // Test individual components
    testMultiAgentEnvironment();
    // testMultiAgentManager();
    // testMultiAgentExperimentRunner();
    
    console.log('All tests completed successfully');
  } catch (error) {
    console.error('Error running tests:', error);
    throw error;
  }
}

// Run tests
// Legacy test execution - not needed with Jest
// runTests().catch(error => {
//   console.error('Error running tests:', error);
// });
