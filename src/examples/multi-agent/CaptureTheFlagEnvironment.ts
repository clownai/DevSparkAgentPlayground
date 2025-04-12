/**
 * Mixed Cooperative-Competitive Environment: Team Capture the Flag
 * 
 * A team-based competitive environment where two teams of agents compete to capture
 * the opposing team's flag while defending their own.
 */

import { 
  BaseMultiAgentEnvironment, 
  AgentObservation, 
  AgentAction 
} from '../../environments/MultiAgentEnvironment';
import { DiscreteActionSpace, ObservationSpace } from '../../types/environment';

// Team affiliation
enum Team {
  TEAM_A = 'team_a',
  TEAM_B = 'team_b'
}

// Agent state in the environment
interface CaptureTheFlagAgentState {
  position: [number, number];
  team: Team;
  hasFlag: boolean;
  tagCooldown: number;
  wasTagged: boolean;
  lastAction: string | null;
  score: {
    individual: number;
    team: number;
  };
}

// Flag state
interface Flag {
  team: Team;
  position: [number, number];
  basePosition: [number, number];
  carriedBy: string | null;
  captured: boolean;
}

// Environment state
interface CaptureTheFlagState {
  grid: number[][]; // 0 = empty, 1 = obstacle
  flags: Record<Team, Flag>;
  teamTerritories: Record<Team, boolean[][]>; // Grid of team territories
  teamScores: Record<Team, number>;
  tagEvents: Array<{
    tagger: string;
    tagged: string;
    position: [number, number];
    step: number;
  }>;
  flagCaptureEvents: Array<{
    capturer: string;
    team: Team;
    step: number;
  }>;
  passEvents: Array<{
    from: string;
    to: string;
    position: [number, number];
    step: number;
  }>;
}

// Action enumeration
enum Action {
  MOVE_UP = 0,
  MOVE_DOWN = 1,
  MOVE_LEFT = 2,
  MOVE_RIGHT = 3,
  PICK_UP_FLAG = 4,
  DROP_FLAG = 5,
  TAG = 6,
  PASS_FLAG = 7
}

/**
 * Team Capture the Flag Environment implementation
 */
export class CaptureTheFlagEnvironment extends BaseMultiAgentEnvironment {
  // Environment-specific properties
  private gridWidth: number;
  private gridHeight: number;
  private viewDistance: number;
  private tagCooldown: number;
  private respawnDelay: number;
  private teamAssignments: Record<string, Team>;
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    // Set default reward structure to mixed
    const fullConfig = {
      ...config,
      rewardStructure: {
        type: 'mixed',
        weights: {
          individual: 0.4,
          team: 0.6
        },
        ...config.rewardStructure
      }
    };
    
    super(fullConfig);
    
    // Set environment-specific properties
    this.gridWidth = config.gridWidth || 20;
    this.gridHeight = config.gridHeight || 10;
    this.viewDistance = config.viewDistance || 3;
    this.tagCooldown = config.tagCooldown || 5;
    this.respawnDelay = config.respawnDelay || 3;
    
    // Set default max steps if not provided
    if (!this.maxStepsPerEpisode) {
      this.maxStepsPerEpisode = 300;
    }
    
    // Assign teams to agents
    this.teamAssignments = {};
    this.assignTeams(config.teamAssignments);
    
    // Initialize action and observation spaces
    for (const agentId of this.agentIds) {
      // Action space: move (4 directions), pick up flag, drop flag, tag, pass flag
      this.actionSpaces[agentId] = {
        type: 'discrete',
        n: 8
      } as DiscreteActionSpace;
      
      // Observation space: grid view, agent state, etc.
      this.observationSpaces[agentId] = {
        type: 'dict',
        spaces: {
          grid: {
            type: 'box',
            shape: [this.viewDistance * 2 + 1, this.viewDistance * 2 + 1, 4], // 4 channels: empty/obstacle, agents, flags, territory
            low: 0,
            high: 1
          },
          position: {
            type: 'box',
            shape: [2],
            low: 0,
            high: Math.max(this.gridWidth - 1, this.gridHeight - 1)
          },
          team: {
            type: 'discrete',
            n: 2 // Team A or Team B
          },
          hasFlag: {
            type: 'discrete',
            n: 2 // boolean
          },
          tagCooldown: {
            type: 'discrete',
            n: this.tagCooldown + 1
          },
          inOwnTerritory: {
            type: 'discrete',
            n: 2 // boolean
          },
          flagsState: {
            type: 'dict',
            spaces: {
              ownFlag: {
                type: 'dict',
                spaces: {
                  position: {
                    type: 'box',
                    shape: [2],
                    low: 0,
                    high: Math.max(this.gridWidth - 1, this.gridHeight - 1)
                  },
                  carriedBy: {
                    type: 'discrete',
                    n: this.agentIds.length + 1 // +1 for null
                  },
                  captured: {
                    type: 'discrete',
                    n: 2 // boolean
                  }
                }
              },
              enemyFlag: {
                type: 'dict',
                spaces: {
                  position: {
                    type: 'box',
                    shape: [2],
                    low: 0,
                    high: Math.max(this.gridWidth - 1, this.gridHeight - 1)
                  },
                  carriedBy: {
                    type: 'discrete',
                    n: this.agentIds.length + 1 // +1 for null
                  },
                  captured: {
                    type: 'discrete',
                    n: 2 // boolean
                  }
                }
              }
            }
          },
          teamScores: {
            type: 'dict',
            spaces: {
              ownTeam: {
                type: 'box',
                shape: [1],
                low: 0,
                high: 100
              },
              enemyTeam: {
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
            high: Math.max(this.gridWidth - 1, this.gridHeight - 1, 1) // 1 for team
          }
        }
      };
    }
  }
  
  /**
   * Assign teams to agents
   * @param teamAssignments Optional explicit team assignments
   */
  private assignTeams(teamAssignments?: Record<string, Team>): void {
    // If explicit assignments are provided, use them
    if (teamAssignments) {
      this.teamAssignments = { ...teamAssignments };
      return;
    }
    
    // Otherwise, divide agents evenly between teams
    const numAgents = this.agentIds.length;
    const halfNumAgents = Math.ceil(numAgents / 2);
    
    for (let i = 0; i < numAgents; i++) {
      const agentId = this.agentIds[i];
      this.teamAssignments[agentId] = i < halfNumAgents ? Team.TEAM_A : Team.TEAM_B;
    }
  }
  
  /**
   * Initialize environment state
   * @param config Environment configuration
   */
  protected initializeState(config: any): void {
    // Initialize grid with empty cells
    const grid: number[][] = Array(this.gridHeight).fill(0).map(() => Array(this.gridWidth).fill(0));
    
    // Add obstacles (if specified in config)
    const obstacles = config.obstacles || this.generateDefaultObstacles();
    for (const [x, y] of obstacles) {
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        grid[y][x] = 1;
      }
    }
    
    // Initialize team territories (left half for Team A, right half for Team B)
    const teamTerritories: Record<Team, boolean[][]> = {
      [Team.TEAM_A]: Array(this.gridHeight).fill(0).map(() => Array(this.gridWidth).fill(false)),
      [Team.TEAM_B]: Array(this.gridHeight).fill(0).map(() => Array(this.gridWidth).fill(false))
    };
    
    // Set team territories
    const midpoint = Math.floor(this.gridWidth / 2);
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (x < midpoint) {
          teamTerritories[Team.TEAM_A][y][x] = true;
        } else {
          teamTerritories[Team.TEAM_B][y][x] = true;
        }
      }
    }
    
    // Initialize flags
    const flags: Record<Team, Flag> = {
      [Team.TEAM_A]: {
        team: Team.TEAM_A,
        position: [1, Math.floor(this.gridHeight / 2)],
        basePosition: [1, Math.floor(this.gridHeight / 2)],
        carriedBy: null,
        captured: false
      },
      [Team.TEAM_B]: {
        team: Team.TEAM_B,
        position: [this.gridWidth - 2, Math.floor(this.gridHeight / 2)],
        basePosition: [this.gridWidth - 2, Math.floor(this.gridHeight / 2)],
        carriedBy: null,
        captured: false
      }
    };
    
    // Initialize environment state
    this.state = {
      grid,
      flags,
      teamTerritories,
      teamScores: {
        [Team.TEAM_A]: 0,
        [Team.TEAM_B]: 0
      },
      tagEvents: [],
      flagCaptureEvents: [],
      passEvents: []
    } as CaptureTheFlagState;
    
    // Initialize agent states
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
    }
  }
  
  /**
   * Generate default obstacles for the environment
   * @returns Array of obstacle positions
   */
  private generateDefaultObstacles(): [number, number][] {
    const obstacles: [number, number][] = [];
    const midpoint = Math.floor(this.gridWidth / 2);
    
    // Add some obstacles in the middle
    for (let y = 2; y < this.gridHeight - 2; y += 2) {
      obstacles.push([midpoint, y]);
    }
    
    // Add some random obstacles
    const numRandomObstacles = Math.floor(this.gridWidth * this.gridHeight * 0.05); // 5% of grid
    for (let i = 0; i < numRandomObstacles; i++) {
      const x = Math.floor(Math.random() * this.gridWidth);
      const y = Math.floor(Math.random() * this.gridHeight);
      
      // Don't place obstacles on flag positions or too close to them
      const flagPositions = [
        [1, Math.floor(this.gridHeight / 2)],
        [this.gridWidth - 2, Math.floor(this.gridHeight / 2)]
      ];
      
      let tooCloseToFlag = false;
      for (const [fx, fy] of flagPositions) {
        if (Math.abs(x - fx) <= 1 && Math.abs(y - fy) <= 1) {
          tooCloseToFlag = true;
          break;
        }
      }
      
      if (!tooCloseToFlag) {
        obstacles.push([x, y]);
      }
    }
    
    return obstacles;
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    const state = this.state as CaptureTheFlagState;
    
    // Reset flags
    state.flags[Team.TEAM_A].position = [...state.flags[Team.TEAM_A].basePosition];
    state.flags[Team.TEAM_A].carriedBy = null;
    state.flags[Team.TEAM_A].captured = false;
    
    state.flags[Team.TEAM_B].position = [...state.flags[Team.TEAM_B].basePosition];
    state.flags[Team.TEAM_B].carriedBy = null;
    state.flags[Team.TEAM_B].captured = false;
    
    // Reset team scores
    state.teamScores[Team.TEAM_A] = 0;
    state.teamScores[Team.TEAM_B] = 0;
    
    // Reset events
    state.tagEvents = [];
    state.flagCaptureEvents = [];
    state.passEvents = [];
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    const state = this.state as CaptureTheFlagState;
    const team = this.teamAssignments[agentId];
    
    // Place agent in their team's territory
    let x, y;
    do {
      if (team === Team.TEAM_A) {
        x = Math.floor(Math.random() * (this.gridWidth / 2 - 2)) + 1;
      } else {
        x = Math.floor(Math.random() * (this.gridWidth / 2 - 2)) + (this.gridWidth / 2 + 1);
      }
      y = Math.floor(Math.random() * (this.gridHeight - 2)) + 1;
    } while (state.grid[y][x] !== 0 || this.isPositionOccupied([x, y]));
    
    // Initialize agent state
    this.agentStates[agentId] = {
      position: [x, y],
      team,
      hasFlag: false,
      tagCooldown: 0,
      wasTagged: false,
      lastAction: null,
      score: {
        individual: 0,
        team: 0
      }
    } as CaptureTheFlagAgentState;
    
    // If agent was carrying a flag, return it to base
    for (const teamKey in state.flags) {
      const flag = state.flags[teamKey as Team];
      if (flag.carriedBy === agentId) {
        flag.carriedBy = null;
        flag.position = [...flag.basePosition];
      }
    }
  }
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    const [x, y] = agentState.position;
    const team = agentState.team;
    
    // Create grid view centered on agent
    const gridView = this.getLocalGridView(agentId);
    
    // Get nearby agents
    const nearbyAgents: Record<string, any> = {};
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as CaptureTheFlagAgentState;
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
            hasFlag: otherState.hasFlag,
            tagCooldown: otherState.tagCooldown
          }
        };
      }
    }
    
    // Determine if agent is in own territory
    const inOwnTerritory = state.teamTerritories[team][y][x];
    
    // Get flag states from agent's perspective
    const ownTeam = team;
    const enemyTeam = team === Team.TEAM_A ? Team.TEAM_B : Team.TEAM_A;
    
    const ownFlag = state.flags[ownTeam];
    const enemyFlag = state.flags[enemyTeam];
    
    // Create messages array for team communication
    const messages: Array<{ from: string; content: any; timestamp: number }> = [];
    
    // Add recent tag events as messages
    for (const event of state.tagEvents) {
      if (this.currentStep - event.step <= 5) { // Only recent events
        const taggerState = this.agentStates[event.tagger] as CaptureTheFlagAgentState;
        const taggedState = this.agentStates[event.tagged] as CaptureTheFlagAgentState;
        
        // Only add if relevant to this agent's team
        if (taggerState.team === team || taggedState.team === team) {
          messages.push({
            from: event.tagger,
            content: {
              type: 'tag_event',
              tagged: event.tagged,
              position: event.position
            },
            timestamp: event.step
          });
        }
      }
    }
    
    // Add recent flag capture events as messages
    for (const event of state.flagCaptureEvents) {
      if (this.currentStep - event.step <= 5) { // Only recent events
        const capturerState = this.agentStates[event.capturer] as CaptureTheFlagAgentState;
        
        // Only add if relevant to this agent's team
        if (capturerState.team === team || event.team === team) {
          messages.push({
            from: event.capturer,
            content: {
              type: 'flag_capture',
              team: event.team
            },
            timestamp: event.step
          });
        }
      }
    }
    
    // Add recent pass events as messages
    for (const event of state.passEvents) {
      if (this.currentStep - event.step <= 5) { // Only recent events
        const fromState = this.agentStates[event.from] as CaptureTheFlagAgentState;
        
        // Only add if relevant to this agent's team
        if (fromState.team === team) {
          messages.push({
            from: event.from,
            content: {
              type: 'flag_pass',
              to: event.to,
              position: event.position
            },
            timestamp: event.step
          });
        }
      }
    }
    
    // Add custom messages from other agents
    if (actions[agentId]?.message) {
      const message = actions[agentId].message;
      
      // Only add messages from teammates
      if (message.to === 'team') {
        for (const otherId of this.agentIds) {
          if (otherId !== agentId) {
            const otherState = this.agentStates[otherId] as CaptureTheFlagAgentState;
            
            if (otherState.team === team) {
              messages.push({
                from: agentId,
                content: message.content,
                timestamp: this.currentStep
              });
            }
          }
        }
      }
    }
    
    // Create observation
    return {
      state: {
        position: agentState.position,
        team: agentState.team,
        hasFlag: agentState.hasFlag,
        tagCooldown: agentState.tagCooldown,
        inOwnTerritory,
        gridView,
        flagsState: {
          ownFlag: {
            position: ownFlag.position,
            carriedBy: ownFlag.carriedBy,
            captured: ownFlag.captured
          },
          enemyFlag: {
            position: enemyFlag.position,
            carriedBy: enemyFlag.carriedBy,
            captured: enemyFlag.captured
          }
        },
        teamScores: {
          ownTeam: state.teamScores[ownTeam],
          enemyTeam: state.teamScores[enemyTeam]
        }
      },
      position: [x, y],
      others: nearbyAgents,
      environment: {
        gridSize: [this.gridWidth, this.gridHeight],
        currentStep: this.currentStep,
        maxSteps: this.maxStepsPerEpisode
      },
      messages
    };
  }
  
  // Store actions for message processing
  private actions: Record<string, AgentAction> = {};
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    const state = this.state as CaptureTheFlagState;
    
    // Store actions for message processing
    this.actions = actions;
    
    // Decrement tag cooldowns
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
      if (agentState.tagCooldown > 0) {
        agentState.tagCooldown--;
      }
      agentState.wasTagged = false;
    }
    
    // Process movement actions first
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
      
      // Store last action
      agentState.lastAction = Action[action];
      
      // Process movement
      if (action >= Action.MOVE_UP && action <= Action.MOVE_RIGHT) {
        this.processMovementAction(agentId, action);
      }
    }
    
    // Process flag pickup, drop, tag, and pass actions
    for (const agentId in actions) {
      const action = actions[agentId].action as number;
      
      switch (action) {
        case Action.PICK_UP_FLAG:
          this.processPickUpFlagAction(agentId);
          break;
        case Action.DROP_FLAG:
          this.processDropFlagAction(agentId);
          break;
        case Action.TAG:
          this.processTagAction(agentId);
          break;
        case Action.PASS_FLAG:
          this.processPassFlagAction(agentId, actions[agentId]);
          break;
      }
    }
    
    // Check for flag captures
    this.checkFlagCaptures();
  }
  
  /**
   * Process movement action for an agent
   * @param agentId Agent ID
   * @param action Movement action
   */
  private processMovementAction(agentId: string, action: number): void {
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    const [x, y] = agentState.position;
    
    // Calculate new position based on action
    let newX = x;
    let newY = y;
    
    switch (action) {
      case Action.MOVE_UP:
        newY = Math.max(0, y - 1);
        break;
      case Action.MOVE_DOWN:
        newY = Math.min(this.gridHeight - 1, y + 1);
        break;
      case Action.MOVE_LEFT:
        newX = Math.max(0, x - 1);
        break;
      case Action.MOVE_RIGHT:
        newX = Math.min(this.gridWidth - 1, x + 1);
        break;
    }
    
    // Check if new position is valid (not an obstacle and not occupied by another agent)
    if (state.grid[newY][newX] !== 1 && !this.isPositionOccupied([newX, newY])) {
      // Move the agent
      agentState.position = [newX, newY];
      
      // If agent is carrying a flag, move the flag too
      if (agentState.hasFlag) {
        for (const teamKey in state.flags) {
          const flag = state.flags[teamKey as Team];
          if (flag.carriedBy === agentId) {
            flag.position = [newX, newY];
            break;
          }
        }
      }
    }
  }
  
  /**
   * Process pick up flag action for an agent
   * @param agentId Agent ID
   */
  private processPickUpFlagAction(agentId: string): void {
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    
    // Check if agent is already carrying a flag
    if (agentState.hasFlag) {
      return;
    }
    
    // Find a flag at the agent's position
    const [x, y] = agentState.position;
    let flagToPickUp: Team | null = null;
    
    for (const teamKey in state.flags) {
      const team = teamKey as Team;
      const flag = state.flags[team];
      
      // Skip flags that are already carried or captured
      if (flag.carriedBy !== null || flag.captured) continue;
      
      const [fx, fy] = flag.position;
      
      if (fx === x && fy === y) {
        // Can only pick up enemy flag
        if (team !== agentState.team) {
          flagToPickUp = team;
          break;
        }
      }
    }
    
    // If a flag was found, pick it up
    if (flagToPickUp) {
      const flag = state.flags[flagToPickUp];
      
      // Update flag
      flag.carriedBy = agentId;
      
      // Update agent state
      agentState.hasFlag = true;
    }
  }
  
  /**
   * Process drop flag action for an agent
   * @param agentId Agent ID
   */
  private processDropFlagAction(agentId: string): void {
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    
    // Check if agent is carrying a flag
    if (!agentState.hasFlag) {
      return;
    }
    
    // Find the flag the agent is carrying
    for (const teamKey in state.flags) {
      const team = teamKey as Team;
      const flag = state.flags[team];
      
      if (flag.carriedBy === agentId) {
        // Drop the flag at the current position
        flag.carriedBy = null;
        
        // Update agent state
        agentState.hasFlag = false;
        break;
      }
    }
  }
  
  /**
   * Process tag action for an agent
   * @param agentId Agent ID
   */
  private processTagAction(agentId: string): void {
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    
    // Check if agent is on cooldown
    if (agentState.tagCooldown > 0) {
      return;
    }
    
    // Check if agent is in own territory
    const [x, y] = agentState.position;
    const inOwnTerritory = state.teamTerritories[agentState.team][y][x];
    
    if (!inOwnTerritory) {
      return;
    }
    
    // Find nearby enemy agents to tag
    for (const otherId of this.agentIds) {
      if (otherId === agentId) continue;
      
      const otherState = this.agentStates[otherId] as CaptureTheFlagAgentState;
      
      // Can only tag enemy agents
      if (otherState.team === agentState.team) continue;
      
      const [ox, oy] = otherState.position;
      
      // Check if other agent is adjacent
      if (Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1) {
        // Tag the agent
        otherState.wasTagged = true;
        
        // Set cooldown for tagger
        agentState.tagCooldown = this.tagCooldown;
        
        // Record tag event
        state.tagEvents.push({
          tagger: agentId,
          tagged: otherId,
          position: [ox, oy],
          step: this.currentStep
        });
        
        // If tagged agent was carrying a flag, drop it
        if (otherState.hasFlag) {
          for (const teamKey in state.flags) {
            const team = teamKey as Team;
            const flag = state.flags[team];
            
            if (flag.carriedBy === otherId) {
              flag.carriedBy = null;
              otherState.hasFlag = false;
              break;
            }
          }
        }
        
        // Reset tagged agent to their spawn point
        this.resetAgentState(otherId);
        
        // Add team reward for successful tag
        const tagReward = 1;
        for (const teammateId of this.agentIds) {
          const teammateState = this.agentStates[teammateId] as CaptureTheFlagAgentState;
          if (teammateState.team === agentState.team) {
            teammateState.score.team += tagReward;
          }
        }
        
        // Add individual reward for tagger
        agentState.score.individual += 0.5;
        
        // Only tag one agent at a time
        break;
      }
    }
  }
  
  /**
   * Process pass flag action for an agent
   * @param agentId Agent ID
   * @param action Agent action
   */
  private processPassFlagAction(agentId: string, action: AgentAction): void {
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    
    // Check if agent is carrying a flag
    if (!agentState.hasFlag) {
      return;
    }
    
    // Check if pass target is specified in message
    if (!action.message || !action.message.content || !action.message.content.target) {
      return;
    }
    
    const targetId = action.message.content.target;
    
    // Check if target is valid
    if (!this.agentIds.includes(targetId) || targetId === agentId) {
      return;
    }
    
    const targetState = this.agentStates[targetId] as CaptureTheFlagAgentState;
    
    // Check if target is on same team
    if (targetState.team !== agentState.team) {
      return;
    }
    
    // Check if target is already carrying a flag
    if (targetState.hasFlag) {
      return;
    }
    
    const [x, y] = agentState.position;
    const [tx, ty] = targetState.position;
    
    // Check if target is nearby
    if (Math.abs(tx - x) <= 1 && Math.abs(ty - y) <= 1) {
      // Find the flag the agent is carrying
      for (const teamKey in state.flags) {
        const team = teamKey as Team;
        const flag = state.flags[team];
        
        if (flag.carriedBy === agentId) {
          // Pass the flag
          flag.carriedBy = targetId;
          flag.position = [tx, ty];
          
          // Update agent states
          agentState.hasFlag = false;
          targetState.hasFlag = true;
          
          // Record pass event
          state.passEvents.push({
            from: agentId,
            to: targetId,
            position: [x, y],
            step: this.currentStep
          });
          
          // Add individual reward for successful pass
          agentState.score.individual += 0.2;
          
          break;
        }
      }
    }
  }
  
  /**
   * Check for flag captures
   */
  private checkFlagCaptures(): void {
    const state = this.state as CaptureTheFlagState;
    
    // Check each agent carrying a flag
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
      
      // Skip agents not carrying a flag
      if (!agentState.hasFlag) continue;
      
      // Find the flag the agent is carrying
      for (const teamKey in state.flags) {
        const team = teamKey as Team;
        const flag = state.flags[team];
        
        if (flag.carriedBy === agentId) {
          // Skip own team's flag
          if (team === agentState.team) continue;
          
          // Check if agent is at their own flag base
          const [x, y] = agentState.position;
          const ownFlag = state.flags[agentState.team];
          const [bx, by] = ownFlag.basePosition;
          
          if (x === bx && y === by) {
            // Capture the flag
            flag.captured = true;
            flag.carriedBy = null;
            agentState.hasFlag = false;
            
            // Reset flag to base
            flag.position = [...flag.basePosition];
            
            // Add team score
            state.teamScores[agentState.team] += 10;
            
            // Add team reward
            for (const teammateId of this.agentIds) {
              const teammateState = this.agentStates[teammateId] as CaptureTheFlagAgentState;
              if (teammateState.team === agentState.team) {
                teammateState.score.team += 10;
              }
            }
            
            // Add individual reward for capturer
            agentState.score.individual += 5;
            
            // Record capture event
            state.flagCaptureEvents.push({
              capturer: agentId,
              team,
              step: this.currentStep
            });
            
            break;
          }
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
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    
    // Base reward is -0.01 per step to encourage efficiency
    let reward = -0.01;
    
    // Calculate individual and team components
    const individualReward = agentState.score.individual;
    const teamReward = agentState.score.team;
    
    // Apply weights from reward structure
    const weights = this.rewardStructure.weights || { individual: 0.4, team: 0.6 };
    reward += (individualReward * weights.individual!) + (teamReward * weights.team!);
    
    // Penalty for being tagged
    if (agentState.wasTagged) {
      reward -= 1;
    }
    
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
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    
    return {
      position: agentState.position,
      team: agentState.team,
      hasFlag: agentState.hasFlag,
      tagCooldown: agentState.tagCooldown,
      score: agentState.score,
      teamScore: state.teamScores[agentState.team]
    };
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    const state = this.state as CaptureTheFlagState;
    
    if (mode === 'human') {
      // Create a string representation of the grid
      let output = `Step: ${this.currentStep}/${this.maxStepsPerEpisode}\n`;
      output += `Team A Score: ${state.teamScores[Team.TEAM_A]}, Team B Score: ${state.teamScores[Team.TEAM_B]}\n\n`;
      
      // Create a grid representation
      const grid = Array(this.gridHeight).fill(0).map(() => Array(this.gridWidth).fill(' '));
      
      // Add obstacles
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          if (state.grid[y][x] === 1) {
            grid[y][x] = '#';
          }
        }
      }
      
      // Add territory markers
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          if (state.teamTerritories[Team.TEAM_A][y][x]) {
            grid[y][x] = grid[y][x] === ' ' ? '.' : grid[y][x];
          } else if (state.teamTerritories[Team.TEAM_B][y][x]) {
            grid[y][x] = grid[y][x] === ' ' ? ',' : grid[y][x];
          }
        }
      }
      
      // Add flags
      for (const teamKey in state.flags) {
        const team = teamKey as Team;
        const flag = state.flags[team];
        
        // Skip flags being carried
        if (flag.carriedBy !== null) continue;
        
        const [fx, fy] = flag.position;
        grid[fy][fx] = team === Team.TEAM_A ? 'F' : 'f';
      }
      
      // Add flag bases
      for (const teamKey in state.flags) {
        const team = teamKey as Team;
        const flag = state.flags[team];
        const [bx, by] = flag.basePosition;
        
        grid[by][bx] = team === Team.TEAM_A ? 'B' : 'b';
      }
      
      // Add agents
      for (const agentId of this.agentIds) {
        const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
        const [ax, ay] = agentState.position;
        
        // Use agent index as identifier
        const agentIndex = this.agentIds.indexOf(agentId);
        const teamMarker = agentState.team === Team.TEAM_A ? 'A' : 'B';
        grid[ay][ax] = agentState.hasFlag ? `${teamMarker}${agentIndex}*` : `${teamMarker}${agentIndex}`;
      }
      
      // Render the grid
      for (let y = 0; y < this.gridHeight; y++) {
        output += '+' + '---+'.repeat(this.gridWidth) + '\n';
        output += '|';
        for (let x = 0; x < this.gridWidth; x++) {
          output += ` ${grid[y][x]} |`;
        }
        output += '\n';
      }
      output += '+' + '---+'.repeat(this.gridWidth) + '\n';
      
      console.log(output);
      return output;
    } else if (mode === 'rgb_array') {
      // Return a representation that could be used for visualization
      return {
        grid: state.grid,
        teamTerritories: state.teamTerritories,
        flags: state.flags,
        agents: this.agentIds.map(id => {
          const agentState = this.agentStates[id] as CaptureTheFlagAgentState;
          return {
            id,
            position: agentState.position,
            team: agentState.team,
            hasFlag: agentState.hasFlag,
            tagCooldown: agentState.tagCooldown
          };
        }),
        teamScores: state.teamScores,
        events: {
          tags: state.tagEvents,
          captures: state.flagCaptureEvents,
          passes: state.passEvents
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
    
    // Assign team
    this.teamAssignments[agentId] = config.team || (Math.random() < 0.5 ? Team.TEAM_A : Team.TEAM_B);
    
    // Initialize agent state
    this.resetAgentState(agentId);
    
    // Initialize action and observation spaces
    this.actionSpaces[agentId] = {
      type: 'discrete',
      n: 8
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
          high: Math.max(this.gridWidth - 1, this.gridHeight - 1)
        },
        team: {
          type: 'discrete',
          n: 2
        },
        hasFlag: {
          type: 'discrete',
          n: 2
        },
        tagCooldown: {
          type: 'discrete',
          n: this.tagCooldown + 1
        },
        inOwnTerritory: {
          type: 'discrete',
          n: 2
        },
        flagsState: {
          type: 'dict',
          spaces: {
            ownFlag: {
              type: 'dict',
              spaces: {
                position: {
                  type: 'box',
                  shape: [2],
                  low: 0,
                  high: Math.max(this.gridWidth - 1, this.gridHeight - 1)
                },
                carriedBy: {
                  type: 'discrete',
                  n: this.agentIds.length + 1
                },
                captured: {
                  type: 'discrete',
                  n: 2
                }
              }
            },
            enemyFlag: {
              type: 'dict',
              spaces: {
                position: {
                  type: 'box',
                  shape: [2],
                  low: 0,
                  high: Math.max(this.gridWidth - 1, this.gridHeight - 1)
                },
                carriedBy: {
                  type: 'discrete',
                  n: this.agentIds.length + 1
                },
                captured: {
                  type: 'discrete',
                  n: 2
                }
              }
            }
          }
        },
        teamScores: {
          type: 'dict',
          spaces: {
            ownTeam: {
              type: 'box',
              shape: [1],
              low: 0,
              high: 100
            },
            enemyTeam: {
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
          high: Math.max(this.gridWidth - 1, this.gridHeight - 1, 1)
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
    
    // Remove team assignment
    delete this.teamAssignments[agentId];
    
    // Remove action and observation spaces
    delete this.actionSpaces[agentId];
    delete this.observationSpaces[agentId];
    
    // If agent was carrying a flag, return it to base
    const state = this.state as CaptureTheFlagState;
    for (const teamKey in state.flags) {
      const team = teamKey as Team;
      const flag = state.flags[team];
      
      if (flag.carriedBy === agentId) {
        flag.carriedBy = null;
        flag.position = [...flag.basePosition];
      }
    }
    
    return true;
  }
  
  /**
   * Check if a position is occupied by an agent
   * @param position Position to check
   * @returns True if position is occupied
   */
  private isPositionOccupied(position: [number, number]): boolean {
    const [x, y] = position;
    
    for (const agentId of this.agentIds) {
      const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
      const [ax, ay] = agentState.position;
      
      if (ax === x && ay === y) {
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
    const state = this.state as CaptureTheFlagState;
    const agentState = this.agentStates[agentId] as CaptureTheFlagAgentState;
    const [x, y] = agentState.position;
    const team = agentState.team;
    
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
        if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
          // Channel 0: Empty (0), Obstacle (1)
          gridView[vy][vx][0] = state.grid[gy][gx];
          
          // Channel 1: Agents
          for (const otherId of this.agentIds) {
            const otherState = this.agentStates[otherId] as CaptureTheFlagAgentState;
            const [ox, oy] = otherState.position;
            
            if (ox === gx && oy === gy) {
              // Encode agent team: Own team (1), Enemy team (2)
              gridView[vy][vx][1] = otherState.team === team ? 1 : 2;
              break;
            }
          }
          
          // Channel 2: Flags
          for (const teamKey in state.flags) {
            const flagTeam = teamKey as Team;
            const flag = state.flags[flagTeam];
            
            // Skip flags being carried
            if (flag.carriedBy !== null) continue;
            
            const [fx, fy] = flag.position;
            
            if (fx === gx && fy === gy) {
              // Encode flag team: Own team (1), Enemy team (2)
              gridView[vy][vx][2] = flagTeam === team ? 1 : 2;
              break;
            }
          }
          
          // Channel 3: Territory
          if (state.teamTerritories[Team.TEAM_A][gy][gx]) {
            gridView[vy][vx][3] = team === Team.TEAM_A ? 1 : 2;
          } else if (state.teamTerritories[Team.TEAM_B][gy][gx]) {
            gridView[vy][vx][3] = team === Team.TEAM_B ? 1 : 2;
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
 * const env = new CaptureTheFlagEnvironment({
 *   gridWidth: 20,
 *   gridHeight: 10,
 *   maxStepsPerEpisode: 300,
 *   agents: [
 *     { id: 'agent1', team: Team.TEAM_A },
 *     { id: 'agent2', team: Team.TEAM_A },
 *     { id: 'agent3', team: Team.TEAM_A },
 *     { id: 'agent4', team: Team.TEAM_B },
 *     { id: 'agent5', team: Team.TEAM_B },
 *     { id: 'agent6', team: Team.TEAM_B }
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
 *       action: Math.floor(Math.random() * 8) // Random action
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
