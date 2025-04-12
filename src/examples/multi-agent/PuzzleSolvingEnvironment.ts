/**
 * Communication-Dependent Environment: Collaborative Puzzle Solving
 * 
 * A grid-world environment where agents must solve a puzzle that requires sharing information.
 * Each agent can only see part of the solution, and they must communicate to solve the complete puzzle.
 */

import { 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction 
} from '../../environments/MultiAgentEnvironment';
import { DiscreteActionSpace, ObservationSpace } from '../../types/environment';

// Puzzle element types
enum PuzzleElementType {
  SYMBOL = 'symbol',
  PATTERN = 'pattern',
  COLOR = 'color',
  NUMBER = 'number'
}

// Puzzle element interface
interface PuzzleElement {
  id: string;
  type: PuzzleElementType;
  value: string | number;
  position: [number, number];
  visibleTo: Set<string>; // Agent IDs that can interpret this element
}

// Solution node interface
interface SolutionNode {
  id: string;
  position: [number, number];
  requiredElements: string[]; // IDs of puzzle elements required for solution
  solution: string; // Correct solution string
  solved: boolean;
  attempts: number;
}

// Agent state in the environment
interface PuzzleSolvingAgentState {
  position: [number, number];
  specialization: PuzzleElementType;
  observedElements: Set<string>; // IDs of puzzle elements observed
  lastAction: string | null;
  score: number;
}

// Environment state
interface PuzzleSolvingState {
  grid: number[][]; // 0 = empty, 1 = obstacle
  puzzleElements: Record<string, PuzzleElement>;
  solutionNodes: Record<string, SolutionNode>;
  messages: Array<{
    from: string;
    to: string | 'broadcast';
    content: any;
    timestamp: number;
  }>;
  solvedNodes: number;
  totalNodes: number;
  puzzleSolved: boolean;
}

// Action enumeration
enum Action {
  MOVE_UP = 0,
  MOVE_DOWN = 1,
  MOVE_LEFT = 2,
  MOVE_RIGHT = 3,
  OBSERVE_ELEMENT = 4,
  INPUT_SOLUTION = 5,
  SEND_MESSAGE = 6
}

/**
 * Collaborative Puzzle Solving Environment implementation
 */
export class PuzzleSolvingEnvironment extends BaseMultiAgentEnvironment {
  // Environment-specific properties
  private gridSize: number;
  private viewDistance: number;
  private numPuzzleElements: number;
  private numSolutionNodes: number;
  private specializations: Record<string, PuzzleElementType>;
  private puzzleElementIdCounter: number = 0;
  private solutionNodeIdCounter: number = 0;
  
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
    this.gridSize = config.gridSize || 15;
    this.viewDistance = config.viewDistance || 2;
    this.numPuzzleElements = config.numPuzzleElements || 20;
    this.numSolutionNodes = config.numSolutionNodes || 4;
    
    // Set default max steps if not provided
    if (!this.maxStepsPerEpisode) {
      this.maxStepsPerEpisode = 150;
    }
    
    // Assign specializations to agents
    this.specializations = {};
    this.assignSpecializations(config.specializations);
    
    // Initialize action and observation spaces
    for (const agentId of this.agentIds) {
      // Action space: move (4 directions), observe element, input solution, send message
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
            shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 3], // 3 channels: empty/obstacle, agents, puzzle elements/nodes
            low: 0,
            high: 1
          },
          position: {
            type: 'box',
            shape: [2],
            low: 0,
            high: this.gridSize - 1
          },
          specialization: {
            type: 'discrete',
            n: Object.keys(PuzzleElementType).length
          },
          observedElements: {
            type: 'box',
            shape: [this.numPuzzleElements],
            low: 0,
            high: 1
          },
          nearbyAgents: {
            type: 'box',
            shape: [this.agentIds.length, 3], // agentId, x, y
            low: 0,
            high: this.gridSize - 1
          },
          nearbyElements: {
            type: 'box',
            shape: [this.numPuzzleElements, 3], // elementId, x, y
            low: 0,
            high: this.gridSize - 1
          },
          nearbySolutionNodes: {
            type: 'box',
            shape: [this.numSolutionNodes, 3], // nodeId, x, y
            low: 0,
            high: this.gridSize - 1
          },
          progress: {
            type: 'box',
            shape: [1],
            low: 0,
            high: 1
          }
        }
      };
    }
  }
  
  /**
   * Assign specializations to agents
   * @param specializations Optional explicit specialization assignments
   */
  private assignSpecializations(specializations?: Record<string, PuzzleElementType>): void {
    // If explicit assignments are provided, use them
    if (specializations) {
      this.specializations = { ...specializations };
      return;
    }
    
    // Otherwise, distribute specializations evenly
    const types = Object.values(PuzzleElementType);
    
    for (let i = 0; i < this.agentIds.length; i++) {
      const agentId = this.agentIds[i];
      this.specializations[agentId] = types[i % types.length];
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
    
    // Initialize environment state
    this.state = {
      grid,
      puzzleElements: {},
      solutionNodes: {},
      messages: [],
      solvedNodes: 0,
      totalNodes: this.numSolutionNodes,
      puzzleSolved: false
    } as PuzzleSolvingState;
    
    // Initialize agent states
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
    }
    
    // Generate puzzle elements and solution nodes
    this.generatePuzzle();
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
   * Generate puzzle elements and solution nodes
   */
  private generatePuzzle(): void {
    const state = this.state as PuzzleSolvingState;
    
    // Reset counters
    this.puzzleElementIdCounter = 0;
    this.solutionNodeIdCounter = 0;
    
    // Generate puzzle elements
    for (let i = 0; i < this.numPuzzleElements; i++) {
      this.generatePuzzleElement();
    }
    
    // Generate solution nodes
    for (let i = 0; i < this.numSolutionNodes; i++) {
      this.generateSolutionNode();
    }
  }
  
  /**
   * Generate a puzzle element
   * @returns Element ID
   */
  private generatePuzzleElement(): string {
    const state = this.state as PuzzleSolvingState;
    
    // Find a valid position
    const position = this.findEmptyPosition();
    if (!position) return '';
    
    // Determine element type
    const types = Object.values(PuzzleElementType);
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Generate value based on type
    let value: string | number;
    switch (type) {
      case PuzzleElementType.SYMBOL:
        value = ['@', '#', '$', '%', '&', '*', '+', '='][Math.floor(Math.random() * 8)];
        break;
      case PuzzleElementType.PATTERN:
        value = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'heart', 'moon'][Math.floor(Math.random() * 8)];
        break;
      case PuzzleElementType.COLOR:
        value = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'magenta'][Math.floor(Math.random() * 8)];
        break;
      case PuzzleElementType.NUMBER:
        value = Math.floor(Math.random() * 100);
        break;
      default:
        value = '?';
    }
    
    // Determine which agents can interpret this element
    const visibleTo = new Set<string>();
    for (const agentId of this.agentIds) {
      if (this.specializations[agentId] === type) {
        visibleTo.add(agentId);
      }
    }
    
    // Create element
    const elementId = `element_${this.puzzleElementIdCounter++}`;
    state.puzzleElements[elementId] = {
      id: elementId,
      type,
      value,
      position,
      visibleTo
    };
    
    return elementId;
  }
  
  /**
   * Generate a solution node
   * @returns Node ID
   */
  private generateSolutionNode(): string {
    const state = this.state as PuzzleSolvingState;
    
    // Find a valid position
    const position = this.findEmptyPosition();
    if (!position) return '';
    
    // Select random puzzle elements for this node
    const elementIds = Object.keys(state.puzzleElements);
    const requiredElements: string[] = [];
    
    // Each node requires 3-4 elements
    const numRequired = Math.floor(Math.random() * 2) + 3;
    
    // Ensure we have elements of each type
    const typeMap: Record<PuzzleElementType, string[]> = {
      [PuzzleElementType.SYMBOL]: [],
      [PuzzleElementType.PATTERN]: [],
      [PuzzleElementType.COLOR]: [],
      [PuzzleElementType.NUMBER]: []
    };
    
    // Group elements by type
    for (const elementId of elementIds) {
      const element = state.puzzleElements[elementId];
      typeMap[element.type].push(elementId);
    }
    
    // Select at least one element of each type
    for (const type of Object.values(PuzzleElementType)) {
      if (typeMap[type].length > 0) {
        const randomIndex = Math.floor(Math.random() * typeMap[type].length);
        requiredElements.push(typeMap[type][randomIndex]);
      }
    }
    
    // Fill remaining slots randomly
    while (requiredElements.length < numRequired && elementIds.length > 0) {
      const randomIndex = Math.floor(Math.random() * elementIds.length);
      const elementId = elementIds[randomIndex];
      
      if (!requiredElements.includes(elementId)) {
        requiredElements.push(elementId);
      }
    }
    
    // Generate solution string (concatenation of element values)
    let solution = '';
    for (const elementId of requiredElements) {
      const element = state.puzzleElements[elementId];
      solution += element.value.toString();
    }
    
    // Create node
    const nodeId = `node_${this.solutionNodeIdCounter++}`;
    state.solutionNodes[nodeId] = {
      id: nodeId,
      position,
      requiredElements,
      solution,
      solved: false,
      attempts: 0
    };
    
    return nodeId;
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    const state = this.state as PuzzleSolvingState;
    
    // Reset puzzle elements and solution nodes
    state.puzzleElements = {};
    state.solutionNodes = {};
    
    // Reset messages
    state.messages = [];
    
    // Reset solved state
    state.solvedNodes = 0;
    state.puzzleSolved = false;
    
    // Generate new puzzle
    this.generatePuzzle();
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    const state = this.state as PuzzleSolvingState;
    
    // Place agent at random position
    let position = this.findEmptyPosition();
    if (!position) {
      // Fallback if no empty position found
      position = [0, 0];
    }
    
    // Initialize agent state
    this.agentStates[agentId] = {
      position,
      specialization: this.specializations[agentId],
      observedElements: new Set<string>(),
      lastAction: null,
      score: 0
    } as PuzzleSolvingAgentState;
  }
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
    const [x, y] = agentState.position;
    
    // Create grid view centered on agent
    const gridView = this.getLocalGridView(agentId);
    
    // Get nearby agents
    const nearbyAgents: Record<string, any> = {};
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as PuzzleSolvingAgentState;
      const [ox, oy] = otherState.position;
      
      // Check if other agent is within view distance
      if (Math.abs(ox - x) <= this.viewDistance && Math.abs(oy - y) <= this.viewDistance) {
        nearbyAgents[otherId] = {
          id: otherId,
          visible: true,
          position: [ox, oy],
          distance: Math.sqrt(Math.pow(ox - x, 2) + Math.pow(oy - y, 2)),
          info: {
            specialization: otherState.specialization
          }
        };
      }
    }
    
    // Get nearby puzzle elements
    const nearbyElements: any[] = [];
    for (const elementId in state.puzzleElements) {
      const element = state.puzzleElements[elementId];
      const [ex, ey] = element.position;
      
      // Check if element is within view distance
      if (Math.abs(ex - x) <= this.viewDistance && Math.abs(ey - y) <= this.viewDistance) {
        nearbyElements.push({
          id: elementId,
          position: [ex, ey],
          type: element.type,
          // Only include value if agent can interpret this element type
          value: element.visibleTo.has(agentId) ? element.value : null,
          observed: agentState.observedElements.has(elementId)
        });
      }
    }
    
    // Get nearby solution nodes
    const nearbySolutionNodes: any[] = [];
    for (const nodeId in state.solutionNodes) {
      const node = state.solutionNodes[nodeId];
      const [nx, ny] = node.position;
      
      // Check if node is within view distance
      if (Math.abs(nx - x) <= this.viewDistance && Math.abs(ny - y) <= this.viewDistance) {
        nearbySolutionNodes.push({
          id: nodeId,
          position: [nx, ny],
          solved: node.solved,
          attempts: node.attempts
        });
      }
    }
    
    // Create observed elements array
    const observedElements = new Array(this.numPuzzleElements).fill(0);
    for (const elementId of agentState.observedElements) {
      const index = parseInt(elementId.split('_')[1]);
      if (index < observedElements.length) {
        observedElements[index] = 1;
      }
    }
    
    // Get recent messages
    const messages: Array<{ from: string; content: any; timestamp: number }> = [];
    for (const message of state.messages) {
      // Only include messages to this agent or broadcast messages
      if (message.to === agentId || message.to === 'broadcast') {
        // Only include recent messages (last 20 steps)
        if (this.currentStep - message.timestamp <= 20) {
          messages.push({
            from: message.from,
            content: message.content,
            timestamp: message.timestamp
          });
        }
      }
    }
    
    // Create observation
    return {
      state: {
        position: agentState.position,
        specialization: agentState.specialization,
        observedElements,
        gridView,
        nearbyElements,
        nearbySolutionNodes,
        progress: state.solvedNodes / state.totalNodes
      },
      position: [x, y],
      others: nearbyAgents,
      environment: {
        gridSize: this.gridSize,
        currentStep: this.currentStep,
        maxSteps: this.maxStepsPerEpisode,
        puzzleSolved: state.puzzleSolved
      },
      messages
    };
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    const state = this.state as PuzzleSolvingState;
    
    // Process movement actions first
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
      
      // Store last action
      agentState.lastAction = Action[action];
      
      // Process movement
      if (action >= Action.MOVE_UP && action <= Action.MOVE_RIGHT) {
        this.processMovementAction(agentId, action);
      }
    }
    
    // Process observe, input solution, and send message actions
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      
      switch (action) {
        case Action.OBSERVE_ELEMENT:
          this.processObserveElementAction(agentId);
          break;
        case Action.INPUT_SOLUTION:
          this.processInputSolutionAction(agentId, actions[agentId]);
          break;
        case Action.SEND_MESSAGE:
          this.processSendMessageAction(agentId, actions[agentId]);
          break;
      }
    }
    
    // Check if puzzle is solved
    state.puzzleSolved = state.solvedNodes === state.totalNodes;
  }
  
  /**
   * Process movement action for an agent
   * @param agentId Agent ID
   * @param action Movement action
   */
  private processMovementAction(agentId: string, action: number): void {
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
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
      // Move the agent
      agentState.position = [newX, newY];
    }
  }
  
  /**
   * Process observe element action for an agent
   * @param agentId Agent ID
   */
  private processObserveElementAction(agentId: string): void {
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
    const [x, y] = agentState.position;
    
    // Find a puzzle element at the agent's position
    for (const elementId in state.puzzleElements) {
      const element = state.puzzleElements[elementId];
      const [ex, ey] = element.position;
      
      if (ex === x && ey === y) {
        // Add element to observed elements
        agentState.observedElements.add(elementId);
        break;
      }
    }
  }
  
  /**
   * Process input solution action for an agent
   * @param agentId Agent ID
   * @param action Agent action
   */
  private processInputSolutionAction(agentId: string, action: AgentAction): void {
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
    const [x, y] = agentState.position;
    
    // Check if solution is provided in message
    if (!action.message || !action.message.content || !action.message.content.solution) {
      return;
    }
    
    const inputSolution = action.message.content.solution;
    
    // Find a solution node at the agent's position
    for (const nodeId in state.solutionNodes) {
      const node = state.solutionNodes[nodeId];
      const [nx, ny] = node.position;
      
      if (nx === x && ny === y && !node.solved) {
        // Increment attempts
        node.attempts++;
        
        // Check if solution is correct
        if (inputSolution === node.solution) {
          // Mark node as solved
          node.solved = true;
          state.solvedNodes++;
          
          // Add team reward
          const solveReward = 5;
          for (const agentId of this.agentIds) {
            const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
            agentState.score += solveReward;
          }
          
          // Check if all nodes are solved
          if (state.solvedNodes === state.totalNodes) {
            // Add bonus reward for solving the complete puzzle
            const puzzleSolvedReward = 20;
            for (const agentId of this.agentIds) {
              const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
              agentState.score += puzzleSolvedReward;
            }
            
            state.puzzleSolved = true;
          }
        } else {
          // Penalty for incorrect solution
          const incorrectPenalty = -5;
          for (const agentId of this.agentIds) {
            const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
            agentState.score += incorrectPenalty;
          }
        }
        
        break;
      }
    }
  }
  
  /**
   * Process send message action for an agent
   * @param agentId Agent ID
   * @param action Agent action
   */
  private processSendMessageAction(agentId: string, action: AgentAction): void {
    const state = this.state as PuzzleSolvingState;
    
    // Check if message is provided
    if (!action.message || !action.message.to || !action.message.content) {
      return;
    }
    
    // Add message to state
    state.messages.push({
      from: agentId,
      to: action.message.to,
      content: action.message.content,
      timestamp: this.currentStep
    });
  }
  
  /**
   * Calculate reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
    
    // Base reward is -0.01 per step to encourage efficiency
    let reward = -0.01;
    
    // Add reward for observed elements (small reward for information gathering)
    const prevObservedCount = agentState.observedElements.size - (agentState.lastAction === 'OBSERVE_ELEMENT' ? 1 : 0);
    const newObservedCount = agentState.observedElements.size;
    
    if (newObservedCount > prevObservedCount) {
      reward += 0.1;
    }
    
    // Add reward for solved nodes and puzzle completion (already added to score in processInputSolutionAction)
    
    return reward;
  }
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected isAgentDone(agentId: string): boolean {
    const state = this.state as PuzzleSolvingState;
    
    // Episode is done when puzzle is solved
    return state.puzzleSolved;
  }
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected getAgentInfo(agentId: string): any {
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
    
    return {
      position: agentState.position,
      specialization: agentState.specialization,
      observedElements: Array.from(agentState.observedElements),
      score: agentState.score,
      solvedNodes: state.solvedNodes,
      totalNodes: state.totalNodes,
      puzzleSolved: state.puzzleSolved
    };
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    const state = this.state as PuzzleSolvingState;
    
    if (mode === 'human') {
      // Create a string representation of the grid
      let output = `Step: ${this.currentStep}/${this.maxStepsPerEpisode}\n`;
      output += `Puzzle Progress: ${state.solvedNodes}/${state.totalNodes} nodes solved\n\n`;
      
      // Show agent specializations
      output += 'Agents:\n';
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
        const agentIndex = this.agentIds.indexOf(agentId);
        output += `  Agent ${agentIndex}: Specialization=${agentState.specialization}, Observed=${agentState.observedElements.size} elements\n`;
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
      
      // Add puzzle elements
      for (const elementId in state.puzzleElements) {
        const element = state.puzzleElements[elementId];
        const [ex, ey] = element.position;
        
        switch (element.type) {
          case PuzzleElementType.SYMBOL:
            grid[ey][ex] = 'S';
            break;
          case PuzzleElementType.PATTERN:
            grid[ey][ex] = 'P';
            break;
          case PuzzleElementType.COLOR:
            grid[ey][ex] = 'C';
            break;
          case PuzzleElementType.NUMBER:
            grid[ey][ex] = 'N';
            break;
        }
      }
      
      // Add solution nodes
      for (const nodeId in state.solutionNodes) {
        const node = state.solutionNodes[nodeId];
        const [nx, ny] = node.position;
        
        grid[ny][nx] = node.solved ? 'X' : 'O';
      }
      
      // Add agents
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
        const [ax, ay] = agentState.position;
        
        // Use agent index as identifier
        const agentIndex = this.agentIds.indexOf(agentId);
        grid[ay][ax] = `${agentIndex}`;
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
      
      // Show recent messages
      output += '\nRecent Messages:\n';
      const recentMessages = state.messages
        .filter(msg => this.currentStep - msg.timestamp <= 5)
        .slice(-5);
      
      for (const msg of recentMessages) {
        const fromIndex = this.agentIds.indexOf(msg.from);
        const toStr = msg.to === 'broadcast' ? 'all' : `Agent ${this.agentIds.indexOf(msg.to)}`;
        output += `  Agent ${fromIndex} to ${toStr}: ${JSON.stringify(msg.content)}\n`;
      }
      
      console.log(output);
      return output;
    } else if (mode === 'rgb_array') {
      // Return a representation that could be used for visualization
      return {
        grid: state.grid,
        agents: this.agentIds.map(id => {
          const agentState = this.agentStates[id] as PuzzleSolvingAgentState;
          return {
            id,
            position: agentState.position,
            specialization: agentState.specialization,
            observedElements: Array.from(agentState.observedElements)
          };
        }),
        puzzleElements: Object.entries(state.puzzleElements).map(([id, element]) => ({
          id,
          type: element.type,
          position: element.position,
          visibleTo: Array.from(element.visibleTo)
        })),
        solutionNodes: Object.entries(state.solutionNodes).map(([id, node]) => ({
          id,
          position: node.position,
          solved: node.solved,
          attempts: node.attempts
        })),
        progress: {
          solvedNodes: state.solvedNodes,
          totalNodes: state.totalNodes,
          puzzleSolved: state.puzzleSolved
        }
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
    
    // Assign specialization
    this.specializations[agentId] = config.specialization || PuzzleElementType.SYMBOL;
    
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
        specialization: {
          type: 'discrete',
          n: Object.keys(PuzzleElementType).length
        },
        observedElements: {
          type: 'box',
          shape: [this.numPuzzleElements],
          low: 0,
          high: 1
        },
        nearbyAgents: {
          type: 'box',
          shape: [this.agentIds.length, 3],
          low: 0,
          high: this.gridSize - 1
        },
        nearbyElements: {
          type: 'box',
          shape: [this.numPuzzleElements, 3],
          low: 0,
          high: this.gridSize - 1
        },
        nearbySolutionNodes: {
          type: 'box',
          shape: [this.numSolutionNodes, 3],
          low: 0,
          high: this.gridSize - 1
        },
        progress: {
          type: 'box',
          shape: [1],
          low: 0,
          high: 1
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
    
    // Remove specialization
    delete this.specializations[agentId];
    
    // Remove action and observation spaces
    delete this.actionSpaces[agentId];
    delete this.observationSpaces[agentId];
    
    return true;
  }
  
  /**
   * Find an empty position in the grid
   * @returns Empty position or null if none found
   */
  private findEmptyPosition(): [number, number] | null {
    const state = this.state as PuzzleSolvingState;
    
    // Try random positions
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      
      if (state.grid[y][x] === 0 && !this.isPositionOccupied([x, y]) && !this.isPuzzleElementAt([x, y]) && !this.isSolutionNodeAt([x, y])) {
        return [x, y];
      }
    }
    
    // If random attempts fail, try systematically
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (state.grid[y][x] === 0 && !this.isPositionOccupied([x, y]) && !this.isPuzzleElementAt([x, y]) && !this.isSolutionNodeAt([x, y])) {
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
      const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
      const [ax, ay] = agentState.position;
      
      if (ax === x && ay === y) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a puzzle element is at a position
   * @param position Position to check
   * @returns True if a puzzle element is at the position
   */
  private isPuzzleElementAt(position: [number, number]): boolean {
    const [x, y] = position;
    const state = this.state as PuzzleSolvingState;
    
    for (const elementId in state.puzzleElements) {
      const element = state.puzzleElements[elementId];
      const [ex, ey] = element.position;
      
      if (ex === x && ey === y) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a solution node is at a position
   * @param position Position to check
   * @returns True if a solution node is at the position
   */
  private isSolutionNodeAt(position: [number, number]): boolean {
    const [x, y] = position;
    const state = this.state as PuzzleSolvingState;
    
    for (const nodeId in state.solutionNodes) {
      const node = state.solutionNodes[nodeId];
      const [nx, ny] = node.position;
      
      if (nx === x && ny === y) {
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
    const state = this.state as PuzzleSolvingState;
    const agentState = this.agentStates[agentId] as PuzzleSolvingAgentState;
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
            const otherState = this.agentStates[otherId] as PuzzleSolvingAgentState;
            const [ox, oy] = otherState.position;
            
            if (ox === gx && oy === gy) {
              gridView[vy][vx][1] = 1;
              break;
            }
          }
          
          // Channel 2: Puzzle elements (1-4) and solution nodes (5-6)
          // Check for puzzle elements
          for (const elementId in state.puzzleElements) {
            const element = state.puzzleElements[elementId];
            const [ex, ey] = element.position;
            
            if (ex === gx && ey === gy) {
              // Encode element type: Symbol (1), Pattern (2), Color (3), Number (4)
              switch (element.type) {
                case PuzzleElementType.SYMBOL:
                  gridView[vy][vx][2] = 1;
                  break;
                case PuzzleElementType.PATTERN:
                  gridView[vy][vx][2] = 2;
                  break;
                case PuzzleElementType.COLOR:
                  gridView[vy][vx][2] = 3;
                  break;
                case PuzzleElementType.NUMBER:
                  gridView[vy][vx][2] = 4;
                  break;
              }
              break;
            }
          }
          
          // Check for solution nodes
          for (const nodeId in state.solutionNodes) {
            const node = state.solutionNodes[nodeId];
            const [nx, ny] = node.position;
            
            if (nx === gx && ny === gy) {
              // Encode node status: Unsolved (5), Solved (6)
              gridView[vy][vx][2] = node.solved ? 6 : 5;
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
 * Example usage:
 * 
 * ```typescript
 * // Create environment
 * const env = new PuzzleSolvingEnvironment({
 *   gridSize: 15,
 *   maxStepsPerEpisode: 150,
 *   numPuzzleElements: 20,
 *   numSolutionNodes: 4,
 *   agents: [
 *     { id: 'agent1', specialization: PuzzleElementType.SYMBOL },
 *     { id: 'agent2', specialization: PuzzleElementType.PATTERN },
 *     { id: 'agent3', specialization: PuzzleElementType.COLOR },
 *     { id: 'agent4', specialization: PuzzleElementType.NUMBER }
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
 *       action: Math.floor(Math.random() * 7), // Random action
 *       message: {
 *         to: 'broadcast',
 *         content: { type: 'info', data: 'random message' }
 *       }
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
