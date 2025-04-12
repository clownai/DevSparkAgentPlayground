/**
 * Multi-Agent Environment Interface
 * 
 * This module defines the interface for multi-agent environments in the DevSparkAgentPlayground.
 * It extends the base Environment interface to support multiple agents interacting within
 * the same environment.
 */

import { ActionSpace, ObservationSpace } from '../types/environment';

/**
 * Agent observation type for multi-agent environments
 */
export interface AgentObservation {
  // The agent's own state
  state: any;
  
  // Optional position information if the environment has spatial properties
  position?: [number, number, number?]; // x, y, z (optional)
  
  // Optional orientation information
  orientation?: number;
  
  // Information about other agents that this agent can observe
  others?: {
    [agentId: string]: {
      // Basic information about the other agent
      id: string;
      
      // Whether this agent is visible to the observing agent
      visible: boolean;
      
      // Optional position of the other agent if visible
      position?: [number, number, number?];
      
      // Optional orientation of the other agent if visible
      orientation?: number;
      
      // Optional distance to the other agent
      distance?: number;
      
      // Optional additional information about the other agent
      info?: any;
    }
  };
  
  // Global environment state that is visible to this agent
  environment: any;
  
  // Optional communication messages received by this agent
  messages?: Array<{
    from: string;
    content: any;
    timestamp: number;
  }>;
}

/**
 * Agent action type for multi-agent environments
 */
export interface AgentAction {
  // The primary action to take (depends on the environment's action space)
  action: any;
  
  // Optional communication message to send to other agents
  message?: {
    to: string | 'broadcast'; // Target agent ID or 'broadcast' for all agents
    content: any;
  };
  
  // Optional additional parameters for the action
  params?: any;
}

/**
 * Step result for a single agent in a multi-agent environment
 */
export interface AgentStepResult {
  // The next observation for this agent
  observation: AgentObservation;
  
  // The reward received by this agent
  reward: number;
  
  // Whether the episode is done for this agent
  done: boolean;
  
  // Additional information about the step
  info: any;
}

/**
 * Multi-agent environment interface
 */
export interface MultiAgentEnvironment {
  /**
   * Reset the environment and return initial observations for all agents
   * @returns Record of agent IDs to initial observations
   */
  reset(): Record<string, AgentObservation>;
  
  /**
   * Execute a step in the environment with actions from all agents
   * @param actions Record of agent IDs to actions
   * @returns Record of agent IDs to step results
   */
  step(actions: Record<string, AgentAction>): Record<string, AgentStepResult>;
  
  /**
   * Render the environment
   * @param mode Rendering mode ('human', 'rgb_array', etc.)
   * @returns Rendering result (depends on mode)
   */
  render(mode?: string): any;
  
  /**
   * Get the observation space for each agent
   * @returns Record of agent IDs to observation spaces
   */
  getObservationSpaces(): Record<string, ObservationSpace>;
  
  /**
   * Get the action space for each agent
   * @returns Record of agent IDs to action spaces
   */
  getActionSpaces(): Record<string, ActionSpace>;
  
  /**
   * Get the IDs of all agents in the environment
   * @returns Array of agent IDs
   */
  getAgentIds(): string[];
  
  /**
   * Get the maximum number of steps per episode
   * @returns Maximum steps or undefined if no limit
   */
  getMaxStepsPerEpisode(): number | undefined;
  
  /**
   * Check if the environment supports simultaneous actions
   * @returns True if simultaneous actions are supported, false for turn-based
   */
  supportsSimultaneousActions(): boolean;
  
  /**
   * Get the current step number in the episode
   * @returns Current step number
   */
  getCurrentStep(): number;
  
  /**
   * Get the current state of the environment
   * @returns Environment state
   */
  getState(): any;
  
  /**
   * Set the state of the environment (for resetting to a specific state)
   * @param state Environment state
   */
  setState(state: any): void;
  
  /**
   * Get the current state of a specific agent
   * @param agentId Agent ID
   * @returns Agent state
   */
  getAgentState(agentId: string): any;
  
  /**
   * Set the state of a specific agent
   * @param agentId Agent ID
   * @param state Agent state
   */
  setAgentState(agentId: string, state: any): void;
  
  /**
   * Add a new agent to the environment
   * @param agentId Agent ID
   * @param config Agent configuration
   * @returns True if agent was added successfully
   */
  addAgent(agentId: string, config: any): boolean;
  
  /**
   * Remove an agent from the environment
   * @param agentId Agent ID
   * @returns True if agent was removed successfully
   */
  removeAgent(agentId: string): boolean;
  
  /**
   * Get the reward structure of the environment
   * @returns Reward structure information
   */
  getRewardStructure(): {
    type: 'individual' | 'team' | 'mixed' | 'zero-sum';
    teams?: Record<string, string[]>; // Team ID to array of agent IDs
    weights?: {
      individual?: number;
      team?: number;
    };
  };
  
  /**
   * Close the environment and free resources
   */
  close(): void;
}

/**
 * Base class for multi-agent environments
 */
export abstract class BaseMultiAgentEnvironment implements MultiAgentEnvironment {
  // Agent IDs
  protected agentIds: string[] = [];
  
  // Current step in the episode
  protected currentStep: number = 0;
  
  // Maximum steps per episode
  protected maxStepsPerEpisode?: number;
  
  // Whether the environment supports simultaneous actions
  protected simultaneousActions: boolean = true;
  
  // Environment state
  protected state: any = {};
  
  // Agent states
  protected agentStates: Record<string, any> = {};
  
  // Observation spaces for each agent
  protected observationSpaces: Record<string, ObservationSpace> = {};
  
  // Action spaces for each agent
  protected actionSpaces: Record<string, ActionSpace> = {};
  
  // Reward structure
  protected rewardStructure: {
    type: 'individual' | 'team' | 'mixed' | 'zero-sum';
    teams?: Record<string, string[]>;
    weights?: {
      individual?: number;
      team?: number;
    };
  } = { type: 'individual' };
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    this.maxStepsPerEpisode = config.maxStepsPerEpisode;
    this.simultaneousActions = config.simultaneousActions !== false;
    
    if (config.rewardStructure) {
      this.rewardStructure = config.rewardStructure;
    }
    
    // Initialize environment-specific state
    this.initializeState(config);
    
    // Initialize agents if provided in config
    if (config.agents) {
      for (const agentConfig of config.agents) {
        this.addAgent(agentConfig.id, agentConfig);
      }
    }
  }
  
  /**
   * Initialize environment state
   * @param config Environment configuration
   */
  protected abstract initializeState(config: any): void;
  
  /**
   * Reset the environment and return initial observations for all agents
   */
  public reset(): Record<string, AgentObservation> {
    this.currentStep = 0;
    
    // Reset environment state
    this.resetState();
    
    // Reset agent states and generate initial observations
    const initialObservations: Record<string, AgentObservation> = {};
    
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
      initialObservations[agentId] = this.generateObservation(agentId);
    }
    
    return initialObservations;
  }
  
  /**
   * Reset environment state
   */
  protected abstract resetState(): void;
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected abstract resetAgentState(agentId: string): void;
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected abstract generateObservation(agentId: string): AgentObservation;
  
  /**
   * Execute a step in the environment with actions from all agents
   * @param actions Record of agent IDs to actions
   * @returns Record of agent IDs to step results
   */
  public step(actions: Record<string, AgentAction>): Record<string, AgentStepResult> {
    // Increment step counter
    this.currentStep++;
    
    // Process actions and update environment state
    this.processActions(actions);
    
    // Generate step results for each agent
    const results: Record<string, AgentStepResult> = {};
    
    for (const agentId of this.agentIds) {
      const observation = this.generateObservation(agentId);
      const reward = this.calculateReward(agentId, actions);
      const done = this.isAgentDone(agentId) || 
                  (this.maxStepsPerEpisode !== undefined && 
                   this.currentStep >= this.maxStepsPerEpisode);
      const info = this.getAgentInfo(agentId);
      
      results[agentId] = {
        observation,
        reward,
        done,
        info
      };
    }
    
    return results;
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected abstract processActions(actions: Record<string, AgentAction>): void;
  
  /**
   * Calculate reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected abstract calculateReward(agentId: string, actions: Record<string, AgentAction>): number;
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected abstract isAgentDone(agentId: string): boolean;
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected abstract getAgentInfo(agentId: string): any;
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public abstract render(mode?: string): any;
  
  /**
   * Get the observation space for each agent
   */
  public getObservationSpaces(): Record<string, ObservationSpace> {
    return this.observationSpaces;
  }
  
  /**
   * Get the action space for each agent
   */
  public getActionSpaces(): Record<string, ActionSpace> {
    return this.actionSpaces;
  }
  
  /**
   * Get the IDs of all agents in the environment
   */
  public getAgentIds(): string[] {
    return this.agentIds;
  }
  
  /**
   * Get the maximum number of steps per episode
   */
  public getMaxStepsPerEpisode(): number | undefined {
    return this.maxStepsPerEpisode;
  }
  
  /**
   * Check if the environment supports simultaneous actions
   */
  public supportsSimultaneousActions(): boolean {
    return this.simultaneousActions;
  }
  
  /**
   * Get the current step number in the episode
   */
  public getCurrentStep(): number {
    return this.currentStep;
  }
  
  /**
   * Get the current state of the environment
   */
  public getState(): any {
    return this.state;
  }
  
  /**
   * Set the state of the environment
   * @param state Environment state
   */
  public setState(state: any): void {
    this.state = state;
  }
  
  /**
   * Get the current state of a specific agent
   * @param agentId Agent ID
   */
  public getAgentState(agentId: string): any {
    return this.agentStates[agentId];
  }
  
  /**
   * Set the state of a specific agent
   * @param agentId Agent ID
   * @param state Agent state
   */
  public setAgentState(agentId: string, state: any): void {
    this.agentStates[agentId] = state;
  }
  
  /**
   * Add a new agent to the environment
   * @param agentId Agent ID
   * @param config Agent configuration
   */
  public abstract addAgent(agentId: string, config: any): boolean;
  
  /**
   * Remove an agent from the environment
   * @param agentId Agent ID
   */
  public abstract removeAgent(agentId: string): boolean;
  
  /**
   * Get the reward structure of the environment
   */
  public getRewardStructure(): {
    type: 'individual' | 'team' | 'mixed' | 'zero-sum';
    teams?: Record<string, string[]>;
    weights?: {
      individual?: number;
      team?: number;
    };
  } {
    return this.rewardStructure;
  }
  
  /**
   * Close the environment and free resources
   */
  public close(): void {
    // Default implementation does nothing
  }
}

export default {
  MultiAgentEnvironment,
  BaseMultiAgentEnvironment
};
