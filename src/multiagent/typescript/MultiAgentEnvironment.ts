/**
 * MultiAgentEnvironment interface and base implementation
 */

import { ObservationSpace, ActionSpace } from '../../types/environment';
import { Logger } from '../../types/core';
import logger from '../../utils/logger';

/**
 * Agent observation in a multi-agent environment
 */
export interface AgentObservation {
  // Agent's own state
  state: any;
  
  // Agent's position in the environment (if applicable)
  position?: number[];
  
  // Information about other agents
  others: Record<string, {
    // Agent ID
    id: string;
    
    // Whether the agent is visible to this agent
    visible: boolean;
    
    // Distance to the agent (if applicable)
    distance?: number;
    
    // Position of the agent (if visible)
    position?: number[];
    
    // Team ID of the agent (if applicable)
    team?: string;
    
    // Additional information about the agent
    info?: any;
  }>;
  
  // Team information (if agent is part of a team)
  team?: {
    // Team ID
    id: string;
    
    // Team members (agent IDs)
    members: string[];
    
    // Additional team information
    info?: any;
  };
  
  // Messages received from other agents
  messages?: Array<{
    // Sender agent ID
    from: string;
    
    // Message content
    content: any;
    
    // Message timestamp
    timestamp: number;
  }>;
  
  // Environment information
  environment: {
    // Environment dimensions (if applicable)
    dimensions?: number[];
    
    // Current step
    step: number;
    
    // Current turn (if in turn-based mode)
    currentTurn?: string;
    
    // Action execution mode
    actionMode: string;
    
    // Reward structure type
    rewardType: string;
    
    // Additional environment information
    info?: any;
  };
}

/**
 * Agent action in a multi-agent environment
 */
export interface AgentAction {
  // Primary action
  action: any;
  
  // Optional message to send to other agents
  message?: {
    // Recipient agent ID (or 'all' for broadcast)
    to: string | 'all';
    
    // Message content
    content: any;
  };
  
  // Additional metadata
  metadata?: any;
}

/**
 * Result of an agent step in a multi-agent environment
 */
export interface AgentStepResult {
  observation: AgentObservation;
  reward: number;
  done: boolean;
  info: any;
}

/**
 * Action execution mode for multi-agent environments
 */
export enum ActionExecutionMode {
  SIMULTANEOUS = 'simultaneous',
  TURN_BASED = 'turn-based'
}

/**
 * Reward structure type for multi-agent environments
 */
export enum RewardStructureType {
  INDIVIDUAL = 'individual',
  TEAM = 'team',
  MIXED = 'mixed',
  ZERO_SUM = 'zero-sum'
}

/**
 * Team definition for multi-agent environments
 */
export interface Team {
  id: string;
  name?: string;
  agentIds: string[];
  config?: any;
}

/**
 * Reward structure configuration for multi-agent environments
 */
export interface RewardStructureConfig {
  type: RewardStructureType;
  teams?: Record<string, string[]>;
  weights?: {
    individual?: number;
    team?: number;
  };
}

/**
 * Agent message in a multi-agent environment
 */
export interface AgentMessage {
  from: string;
  to: string | 'all';
  content: any;
  timestamp: number;
}

/**
 * Multi-agent environment interface
 */
export interface MultiAgentEnvironment {
  /**
   * Get observation spaces for all agents
   * @returns Record of agent IDs to observation spaces
   */
  getObservationSpaces(): Record<string, ObservationSpace>;
  
  /**
   * Get action spaces for all agents
   * @returns Record of agent IDs to action spaces
   */
  getActionSpaces(): Record<string, ActionSpace>;
  
  /**
   * Get observation space for a specific agent
   * @param agentId Agent ID
   * @returns Observation space for the agent
   */
  getObservationSpace(agentId: string): ObservationSpace;
  
  /**
   * Get action space for a specific agent
   * @param agentId Agent ID
   * @returns Action space for the agent
   */
  getActionSpace(agentId: string): ActionSpace;
  
  /**
   * Reset the environment
   * @returns Initial observations for all agents
   */
  reset(): Record<string, AgentObservation>;
  
  /**
   * Step the environment
   * @param actions Actions for all agents
   * @returns Step results for all agents
   */
  step(actions: Record<string, AgentAction>): Record<string, AgentStepResult>;
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  render(mode?: string): any;
  
  /**
   * Close the environment
   */
  close(): void;
  
  /**
   * Get all agent IDs
   * @returns Array of agent IDs
   */
  getAgentIds(): string[];
  
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
   * Get the action execution mode
   * @returns Action execution mode
   */
  getActionExecutionMode(): ActionExecutionMode;
  
  /**
   * Get the turn order for turn-based action execution
   * @returns Array of agent IDs in turn order
   */
  getTurnOrder(): string[];
  
  /**
   * Get the current agent's turn in turn-based mode
   * @returns Agent ID of the current turn, or null if not in turn-based mode
   */
  getCurrentTurn(): string | null;
  
  /**
   * Get the reward structure type
   * @returns Reward structure type
   */
  getRewardStructureType(): RewardStructureType;
  
  /**
   * Get the teams in the environment
   * @returns Record of team IDs to teams
   */
  getTeams(): Record<string, Team>;
  
  /**
   * Get the team for a specific agent
   * @param agentId Agent ID
   * @returns Team ID or null if agent is not in a team
   */
  getAgentTeam(agentId: string): string | null;
}

/**
 * Base implementation of a multi-agent environment
 */
export class BaseMultiAgentEnvironment implements MultiAgentEnvironment {
  // Agent IDs
  protected agentIds: string[] = [];
  
  // Agent states
  protected agentStates: Record<string, any> = {};
  
  // Observation spaces
  protected observationSpaces: Record<string, ObservationSpace> = {};
  
  // Action spaces
  protected actionSpaces: Record<string, ActionSpace> = {};
  
  // Environment state
  protected state: any = {};
  
  // Current step
  protected currentStep: number = 0;
  
  // Maximum steps per episode
  protected maxStepsPerEpisode: number;
  
  // Action execution mode
  protected actionExecutionMode: ActionExecutionMode;
  
  // Turn order for turn-based action execution
  protected turnOrder: string[] = [];
  
  // Current turn index for turn-based action execution
  protected currentTurnIndex: number = 0;
  
  // Reward structure type
  protected rewardStructureType: RewardStructureType;
  
  // Teams
  protected teams: Record<string, Team> = {};
  
  // Agent team mapping
  protected agentTeams: Record<string, string> = {};
  
  // Reward weights for mixed reward structure
  protected rewardWeights: {
    individual: number;
    team: number;
  };
  
  // Agent messages
  protected messages: AgentMessage[] = [];
  
  // Agent visibility configuration
  protected visibilityRadius: number = Infinity;
  
  // Logger
  protected logger: Logger;
  
  /**
   * Constructor
   * @param config Environment configuration
   */
  constructor(config: any) {
    this.maxStepsPerEpisode = config.maxStepsPerEpisode || 1000;
    
    // Set action execution mode
    if (config.actionExecutionMode === ActionExecutionMode.TURN_BASED) {
      this.actionExecutionMode = ActionExecutionMode.TURN_BASED;
    } else {
      this.actionExecutionMode = ActionExecutionMode.SIMULTANEOUS;
    }
    
    // Set reward structure type
    if (config.rewardStructure && config.rewardStructure.type) {
      this.rewardStructureType = config.rewardStructure.type as RewardStructureType;
    } else {
      this.rewardStructureType = RewardStructureType.INDIVIDUAL;
    }
    
    // Set reward weights for mixed reward structure
    this.rewardWeights = {
      individual: config.rewardStructure?.weights?.individual || 0.5,
      team: config.rewardStructure?.weights?.team || 0.5
    };
    
    // Set visibility radius if provided
    if (config.visibilityRadius !== undefined) {
      this.visibilityRadius = config.visibilityRadius;
    }
    
    // Initialize teams if provided
    if (config.rewardStructure?.teams) {
      for (const [teamId, agentIds] of Object.entries(config.rewardStructure.teams)) {
        this.teams[teamId] = {
          id: teamId,
          agentIds: agentIds as string[]
        };
        
        // Map agents to teams
        for (const agentId of agentIds as string[]) {
          this.agentTeams[agentId] = teamId;
        }
      }
    }
    
    // Initialize logger
    this.logger = logger.createChildLogger({
      component: 'MultiAgentEnvironment',
      experimentId: config.experimentId
    });
    
    // Log configuration
    this.logger.info(`Action execution mode: ${this.actionExecutionMode}`);
    this.logger.info(`Reward structure type: ${this.rewardStructureType}`);
    
    // Initialize state
    this.initializeState(config);
  }
  
  /**
   * Initialize environment state
   * @param config Environment configuration
   */
  protected initializeState(config: any): void {
    this.state = {};
  }
  
  /**
   * Reset environment state
   */
  protected resetState(): void {
    this.state = {};
    this.messages = [];
  }
  
  /**
   * Reset agent state
   * @param agentId Agent ID
   */
  protected resetAgentState(agentId: string): void {
    this.agentStates[agentId] = {};
  }
  
  /**
   * Generate observation for an agent
   * @param agentId Agent ID
   * @returns Agent observation
   */
  protected generateObservation(agentId: string): AgentObservation {
    // Get agent's own state
    const agentState = this.agentStates[agentId];
    
    // Get agent's position (if available)
    const position = this.getAgentPosition(agentId);
    
    // Get information about other agents
    const others: Record<string, {
      id: string;
      visible: boolean;
      distance?: number;
      position?: number[];
      team?: string;
      info?: any;
    }> = {};
    
    for (const otherId of this.agentIds) {
      if (otherId !== agentId) {
        const otherPosition = this.getAgentPosition(otherId);
        const distance = this.calculateDistance(position, otherPosition);
        const visible = this.isAgentVisible(agentId, otherId, distance);
        const teamId = this.getAgentTeam(otherId);
        
        others[otherId] = {
          id: otherId,
          visible,
          distance,
          team: teamId || undefined,
          // Only include position if agent is visible
          position: visible ? otherPosition : undefined,
          // Include additional info if agent is visible
          info: visible ? this.getAgentVisibleInfo(otherId) : undefined
        };
      }
    }
    
    // Get team information (if agent is part of a team)
    const teamId = this.getAgentTeam(agentId);
    let team: {
      id: string;
      members: string[];
      info?: any;
    } | undefined = undefined;
    
    if (teamId) {
      const teamData = this.teams[teamId];
      team = {
        id: teamId,
        members: teamData.agentIds,
        info: teamData.config
      };
    }
    
    // Get messages for this agent
    const agentMessages = this.getMessagesForAgent(agentId);
    
    // Create observation
    const observation: AgentObservation = {
      state: agentState,
      position,
      others,
      environment: {
        dimensions: this.getEnvironmentDimensions(),
        step: this.currentStep,
        currentTurn: this.getCurrentTurn() || undefined,
        actionMode: this.actionExecutionMode,
        rewardType: this.rewardStructureType,
        info: this.getEnvironmentInfo()
      }
    };
    
    // Add team information if available
    if (team) {
      observation.team = team;
    }
    
    // Add messages if available
    if (agentMessages.length > 0) {
      observation.messages = agentMessages;
    }
    
    return observation;
  }
  
  /**
   * Get agent's position in the environment
   * @param agentId Agent ID
   * @returns Agent position or undefined if not applicable
   */
  protected getAgentPosition(agentId: string): number[] | undefined {
    // To be implemented by subclasses
    return undefined;
  }
  
  /**
   * Calculate distance between two positions
   * @param pos1 First position
   * @param pos2 Second position
   * @returns Distance between positions or Infinity if positions are undefined
   */
  protected calculateDistance(pos1?: number[], pos2?: number[]): number {
    if (!pos1 || !pos2 || pos1.length !== pos2.length) {
      return Infinity;
    }
    
    let sumSquared = 0;
    for (let i = 0; i < pos1.length; i++) {
      sumSquared += Math.pow(pos1[i] - pos2[i], 2);
    }
    
    return Math.sqrt(sumSquared);
  }
  
  /**
   * Check if an agent is visible to another agent
   * @param observerId Observer agent ID
   * @param targetId Target agent ID
   * @param distance Distance between agents
   * @returns True if target agent is visible to observer agent
   */
  protected isAgentVisible(observerId: string, targetId: string, distance: number): boolean {
    // Check if agents are on the same team (team members are always visible to each other)
    const observerTeam = this.getAgentTeam(observerId);
    const targetTeam = this.getAgentTeam(targetId);
    
    if (observerTeam && targetTeam && observerTeam === targetTeam) {
      return true;
    }
    
    // Check if target is within visibility radius
    return distance <= this.visibilityRadius;
  }
  
  /**
   * Get additional information about an agent that is visible to other agents
   * @param agentId Agent ID
   * @returns Visible information about the agent
   */
  protected getAgentVisibleInfo(agentId: string): any {
    // To be implemented by subclasses
    return {};
  }
  
  /**
   * Get environment dimensions
   * @returns Environment dimensions or undefined if not applicable
   */
  protected getEnvironmentDimensions(): number[] | undefined {
    // To be implemented by subclasses
    return undefined;
  }
  
  /**
   * Get additional information about the environment
   * @returns Environment information
   */
  protected getEnvironmentInfo(): any {
    // To be implemented by subclasses
    return {};
  }
  
  /**
   * Get messages for an agent
   * @param agentId Agent ID
   * @returns Array of messages for the agent
   */
  protected getMessagesForAgent(agentId: string): Array<{
    from: string;
    content: any;
    timestamp: number;
  }> {
    return this.messages
      .filter(msg => msg.to === agentId || msg.to === 'all')
      .map(msg => ({
        from: msg.from,
        content: msg.content,
        timestamp: msg.timestamp
      }));
  }
  
  /**
   * Process actions from all agents and update environment state
   * @param actions Record of agent IDs to actions
   */
  protected processActions(actions: Record<string, AgentAction>): void {
    // Process messages first
    this.processMessages(actions);
    
    // Process primary actions (to be implemented by subclasses)
  }
  
  /**
   * Process messages from agent actions
   * @param actions Record of agent IDs to actions
   */
  protected processMessages(actions: Record<string, AgentAction>): void {
    for (const [agentId, action] of Object.entries(actions)) {
      if (action.message) {
        this.messages.push({
          from: agentId,
          to: action.message.to,
          content: action.message.content,
          timestamp: this.currentStep
        });
        
        this.logger.debug(`Agent ${agentId} sent message to ${action.message.to}`);
      }
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
      this.messages.push({
        from: agentId,
        to: action.message.to,
        content: action.message.content,
        timestamp: this.currentStep
      });
      
      this.logger.debug(`Agent ${agentId} sent message to ${action.message.to}`);
    }
    
    // Process primary action (to be implemented by subclasses)
  }
  
  /**
   * Calculate individual reward for an agent
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Individual reward value
   */
  protected calculateIndividualReward(agentId: string, actions: Record<string, AgentAction>): number {
    // To be implemented by subclasses - default implementation returns 0
    return 0;
  }
  
  /**
   * Calculate team reward for a team
   * @param teamId Team ID
   * @param actions Actions taken by all agents
   * @returns Team reward value
   */
  protected calculateTeamReward(teamId: string, actions: Record<string, AgentAction>): number {
    // Default implementation: average of individual rewards for team members
    const team = this.teams[teamId];
    if (!team || team.agentIds.length === 0) {
      return 0;
    }
    
    let totalReward = 0;
    for (const agentId of team.agentIds) {
      totalReward += this.calculateIndividualReward(agentId, actions);
    }
    
    return totalReward / team.agentIds.length;
  }
  
  /**
   * Calculate reward for an agent based on the reward structure
   * @param agentId Agent ID
   * @param actions Actions taken by all agents
   * @returns Reward value
   */
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
    switch (this.rewardStructureType) {
      case RewardStructureType.INDIVIDUAL:
        return this.calculateIndividualReward(agentId, actions);
        
      case RewardStructureType.TEAM: {
        const teamId = this.getAgentTeam(agentId);
        if (!teamId) {
          // If agent is not in a team, fall back to individual reward
          return this.calculateIndividualReward(agentId, actions);
        }
        return this.calculateTeamReward(teamId, actions);
      }
        
      case RewardStructureType.MIXED: {
        const individualReward = this.calculateIndividualReward(agentId, actions);
        const teamId = this.getAgentTeam(agentId);
        
        if (!teamId) {
          // If agent is not in a team, use only individual reward
          return individualReward;
        }
        
        const teamReward = this.calculateTeamReward(teamId, actions);
        
        // Apply weights
        return (
          this.rewardWeights.individual * individualReward +
          this.rewardWeights.team * teamReward
        );
      }
        
      case RewardStructureType.ZERO_SUM: {
        // In zero-sum games, the sum of all rewards is zero
        // Calculate individual rewards for all agents
        const individualRewards: Record<string, number> = {};
        let totalReward = 0;
        
        for (const id of this.agentIds) {
          const reward = this.calculateIndividualReward(id, actions);
          individualRewards[id] = reward;
          totalReward += reward;
        }
        
        // Adjust rewards to make sum zero
        const adjustment = totalReward / this.agentIds.length;
        
        return individualRewards[agentId] - adjustment;
      }
        
      default:
        return this.calculateIndividualReward(agentId, actions);
    }
  }
  
  /**
   * Check if an agent is done
   * @param agentId Agent ID
   * @returns True if agent is done
   */
  protected isAgentDone(agentId: string): boolean {
    return this.currentStep >= this.maxStepsPerEpisode;
  }
  
  /**
   * Get additional information for an agent
   * @param agentId Agent ID
   * @returns Additional information
   */
  protected getAgentInfo(agentId: string): any {
    return {};
  }
  
  /**
   * Get observation spaces for all agents
   * @returns Record of agent IDs to observation spaces
   */
  public getObservationSpaces(): Record<string, ObservationSpace> {
    return this.observationSpaces;
  }
  
  /**
   * Get action spaces for all agents
   * @returns Record of agent IDs to action spaces
   */
  public getActionSpaces(): Record<string, ActionSpace> {
    return this.actionSpaces;
  }
  
  /**
   * Get observation space for a specific agent
   * @param agentId Agent ID
   * @returns Observation space for the agent
   */
  public getObservationSpace(agentId: string): ObservationSpace {
    return this.observationSpaces[agentId];
  }
  
  /**
   * Get action space for a specific agent
   * @param agentId Agent ID
   * @returns Action space for the agent
   */
  public getActionSpace(agentId: string): ActionSpace {
    return this.actionSpaces[agentId];
  }
  
  /**
   * Reset the environment
   * @returns Initial observations for all agents
   */
  public reset(): Record<string, AgentObservation> {
    this.currentStep = 0;
    this.currentTurnIndex = 0;
    this.resetState();
    
    // Reset all agent states
    for (const agentId of this.agentIds) {
      this.resetAgentState(agentId);
    }
    
    // Generate observations for all agents
    const observations: Record<string, AgentObservation> = {};
    
    for (const agentId of this.agentIds) {
      observations[agentId] = this.generateObservation(agentId);
    }
    
    return observations;
  }
  
  /**
   * Step the environment
   * @param actions Actions for all agents
   * @returns Step results for all agents
   */
  public step(actions: Record<string, AgentAction>): Record<string, AgentStepResult> {
    // Handle different action execution modes
    if (this.actionExecutionMode === ActionExecutionMode.SIMULTANEOUS) {
      return this.stepSimultaneous(actions);
    } else {
      return this.stepTurnBased(actions);
    }
  }
  
  /**
   * Step the environment in simultaneous mode
   * @param actions Actions for all agents
   * @returns Step results for all agents
   */
  protected stepSimultaneous(actions: Record<string, AgentAction>): Record<string, AgentStepResult> {
    // Increment step counter
    this.currentStep++;
    
    // Process all actions at once
    this.processActions(actions);
    
    // Generate step results for all agents
    const results: Record<string, AgentStepResult> = {};
    
    for (const agentId of this.agentIds) {
      const observation = this.generateObservation(agentId);
      const reward = this.calculateReward(agentId, actions);
      const done = this.isAgentDone(agentId);
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
   * Step the environment in turn-based mode
   * @param actions Actions for all agents
   * @returns Step results for all agents
   */
  protected stepTurnBased(actions: Record<string, AgentAction>): Record<string, AgentStepResult> {
    // Validate that we have a turn order
    if (this.turnOrder.length === 0) {
      this.turnOrder = [...this.agentIds];
      this.logger.warn('No turn order specified, using agent IDs order');
    }
    
    // Get the current agent's turn
    const currentAgentId = this.getCurrentTurn();
    
    if (!currentAgentId) {
      this.logger.error('No current turn available');
      return {};
    }
    
    // Validate that we have an action for the current agent
    if (!actions[currentAgentId]) {
      this.logger.error(`No action provided for current turn agent: ${currentAgentId}`);
      return {};
    }
    
    // Process only the current agent's action
    this.processAgentAction(currentAgentId, actions[currentAgentId]);
    
    // Generate step results for all agents
    const results: Record<string, AgentStepResult> = {};
    
    for (const agentId of this.agentIds) {
      const observation = this.generateObservation(agentId);
      const reward = this.calculateReward(agentId, { [currentAgentId]: actions[currentAgentId] });
      const done = this.isAgentDone(agentId);
      const info = this.getAgentInfo(agentId);
      
      results[agentId] = {
        observation,
        reward,
        done,
        info
      };
    }
    
    // Move to the next turn
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    
    // If we've completed a full cycle of turns, increment the step counter
    if (this.currentTurnIndex === 0) {
      this.currentStep++;
    }
    
    return results;
  }
  
  /**
   * Render the environment
   * @param mode Rendering mode
   * @returns Rendering result
   */
  public render(mode: string = 'human'): any {
    return null;
  }
  
  /**
   * Close the environment
   */
  public close(): void {
    // Clean up resources
  }
  
  /**
   * Get all agent IDs
   * @returns Array of agent IDs
   */
  public getAgentIds(): string[] {
    return this.agentIds;
  }
  
  /**
   * Add a new agent to the environment
   * @param agentId Agent ID
   * @param config Agent configuration
   * @returns True if agent was added successfully
   */
  public addAgent(agentId: string, config: any): boolean {
    // To be implemented by subclasses
    return false;
  }
  
  /**
   * Remove an agent from the environment
   * @param agentId Agent ID
   * @returns True if agent was removed successfully
   */
  public removeAgent(agentId: string): boolean {
    // To be implemented by subclasses
    return false;
  }
  
  /**
   * Get the action execution mode
   * @returns Action execution mode
   */
  public getActionExecutionMode(): ActionExecutionMode {
    return this.actionExecutionMode;
  }
  
  /**
   * Set the action execution mode
   * @param mode Action execution mode
   */
  public setActionExecutionMode(mode: ActionExecutionMode): void {
    this.actionExecutionMode = mode;
    this.logger.info(`Action execution mode set to: ${mode}`);
  }
  
  /**
   * Get the turn order for turn-based action execution
   * @returns Array of agent IDs in turn order
   */
  public getTurnOrder(): string[] {
    return this.turnOrder;
  }
  
  /**
   * Set the turn order for turn-based action execution
   * @param turnOrder Array of agent IDs in turn order
   * @returns True if turn order was set successfully
   */
  public setTurnOrder(turnOrder: string[]): boolean {
    // Validate that all agents in turn order exist
    for (const agentId of turnOrder) {
      if (!this.agentIds.includes(agentId)) {
        this.logger.error(`Agent ${agentId} in turn order does not exist`);
        return false;
      }
    }
    
    // Validate that all agents are included in turn order
    for (const agentId of this.agentIds) {
      if (!turnOrder.includes(agentId)) {
        this.logger.error(`Agent ${agentId} is missing from turn order`);
        return false;
      }
    }
    
    this.turnOrder = turnOrder;
    this.currentTurnIndex = 0;
    this.logger.info(`Turn order set to: ${turnOrder.join(', ')}`);
    return true;
  }
  
  /**
   * Get the current agent's turn in turn-based mode
   * @returns Agent ID of the current turn, or null if not in turn-based mode
   */
  public getCurrentTurn(): string | null {
    if (this.actionExecutionMode !== ActionExecutionMode.TURN_BASED) {
      return null;
    }
    
    if (this.turnOrder.length === 0) {
      return null;
    }
    
    return this.turnOrder[this.currentTurnIndex];
  }
  
  /**
   * Get the reward structure type
   * @returns Reward structure type
   */
  public getRewardStructureType(): RewardStructureType {
    return this.rewardStructureType;
  }
  
  /**
   * Set the reward structure type
   * @param type Reward structure type
   */
  public setRewardStructureType(type: RewardStructureType): void {
    this.rewardStructureType = type;
    this.logger.info(`Reward structure type set to: ${type}`);
  }
  
  /**
   * Get the teams in the environment
   * @returns Record of team IDs to teams
   */
  public getTeams(): Record<string, Team> {
    return this.teams;
  }
  
  /**
   * Get the team for a specific agent
   * @param agentId Agent ID
   * @returns Team ID or null if agent is not in a team
   */
  public getAgentTeam(agentId: string): string | null {
    return this.agentTeams[agentId] || null;
  }
  
  /**
   * Add a team to the environment
   * @param teamId Team ID
   * @param agentIds Agent IDs in the team
   * @param config Team configuration
   * @returns True if team was added successfully
   */
  public addTeam(teamId: string, agentIds: string[], config?: any): boolean {
    // Validate that all agents exist
    for (const agentId of agentIds) {
      if (!this.agentIds.includes(agentId)) {
        this.logger.error(`Agent ${agentId} does not exist`);
        return false;
      }
    }
    
    // Add team
    this.teams[teamId] = {
      id: teamId,
      agentIds,
      config
    };
    
    // Map agents to team
    for (const agentId of agentIds) {
      this.agentTeams[agentId] = teamId;
    }
    
    this.logger.info(`Added team ${teamId} with agents: ${agentIds.join(', ')}`);
    return true;
  }
  
  /**
   * Remove a team from the environment
   * @param teamId Team ID
   * @returns True if team was removed successfully
   */
  public removeTeam(teamId: string): boolean {
    if (!this.teams[teamId]) {
      this.logger.error(`Team ${teamId} does not exist`);
      return false;
    }
    
    // Remove agent-team mappings
    for (const agentId of this.teams[teamId].agentIds) {
      delete this.agentTeams[agentId];
    }
    
    // Remove team
    delete this.teams[teamId];
    
    this.logger.info(`Removed team ${teamId}`);
    return true;
  }
  
  /**
   * Set reward weights for mixed reward structure
   * @param individualWeight Weight for individual rewards
   * @param teamWeight Weight for team rewards
   */
  public setRewardWeights(individualWeight: number, teamWeight: number): void {
    // Normalize weights
    const sum = individualWeight + teamWeight;
    this.rewardWeights = {
      individual: individualWeight / sum,
      team: teamWeight / sum
    };
    
    this.logger.info(`Set reward weights: individual=${this.rewardWeights.individual}, team=${this.rewardWeights.team}`);
  }
  
  /**
   * Set visibility radius for agent observations
   * @param radius Visibility radius (Infinity for unlimited visibility)
   */
  public setVisibilityRadius(radius: number): void {
    this.visibilityRadius = radius;
    this.logger.info(`Set visibility radius to: ${radius}`);
  }
  
  /**
   * Send a message from one agent to another
   * @param fromAgentId Sender agent ID
   * @param toAgentId Recipient agent ID (or 'all' for broadcast)
   * @param content Message content
   * @returns True if message was sent successfully
   */
  public sendMessage(fromAgentId: string, toAgentId: string | 'all', content: any): boolean {
    // Validate sender agent
    if (!this.agentIds.includes(fromAgentId)) {
      this.logger.error(`Sender agent ${fromAgentId} does not exist`);
      return false;
    }
    
    // Validate recipient agent if not broadcasting
    if (toAgentId !== 'all' && !this.agentIds.includes(toAgentId)) {
      this.logger.error(`Recipient agent ${toAgentId} does not exist`);
      return false;
    }
    
    // Add message
    this.messages.push({
      from: fromAgentId,
      to: toAgentId,
      content,
      timestamp: this.currentStep
    });
    
    this.logger.debug(`Agent ${fromAgentId} sent message to ${toAgentId}`);
    return true;
  }
  
  /**
   * Clear all messages
   */
  public clearMessages(): void {
    this.messages = [];
    this.logger.debug('Cleared all messages');
  }
}

// Removed duplicate export to fix redeclaration error
