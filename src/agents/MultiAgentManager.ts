/**
 * Multi-Agent Manager
 * 
 * This module provides a manager for handling multiple agents in a multi-agent environment.
 * It manages agent lifecycles, creation, initialization, and termination.
 */

import { Agent } from '../types/agent';
import { MultiAgentEnvironment, AgentObservation, AgentAction } from '../environments/MultiAgentEnvironment';
import logger from '../utils/logger';
import { AgentFactory } from '../utils/AgentFactory';

/**
 * Configuration for the MultiAgentManager
 */
export interface MultiAgentManagerConfig {
  // Agent configurations by ID
  agents?: Record<string, any>;
  
  // Whether to automatically create agents from configuration
  autoCreateAgents?: boolean;
  
  // Agent factory to use for creating agents
  agentFactory?: AgentFactory;
  
  // Team configurations
  teams?: Record<string, {
    // Agent IDs in this team
    agentIds: string[];
    
    // Team-specific configuration
    config?: any;
  }>;
  
  // Action mode: 'simultaneous' or 'turn-based'
  actionMode?: 'simultaneous' | 'turn-based';
  
  // Turn order for turn-based action mode
  turnOrder?: string[];
}

/**
 * Agent wrapper for multi-agent systems
 */
export interface AgentWrapper {
  // The agent instance
  agent: Agent;
  
  // Agent ID
  id: string;
  
  // Agent configuration
  config: any;
  
  // Team ID if the agent belongs to a team
  teamId?: string;
  
  // Whether the agent is active
  active: boolean;
  
  // Last observation received by the agent
  lastObservation?: AgentObservation;
  
  // Last action taken by the agent
  lastAction?: AgentAction;
  
  // Cumulative reward for the current episode
  episodeReward: number;
  
  // Total reward across all episodes
  totalReward: number;
  
  // Number of steps taken by the agent
  steps: number;
  
  // Number of episodes completed by the agent
  episodes: number;
}

/**
 * Manager for multi-agent systems
 */
export class MultiAgentManager {
  // Agent wrappers by ID
  private agents: Map<string, AgentWrapper> = new Map();
  
  // Team configurations
  private teams: Record<string, {
    agentIds: string[];
    config?: any;
  }> = {};
  
  // Agent factory for creating agents
  private agentFactory: AgentFactory;
  
  // Action mode
  private actionMode: 'simultaneous' | 'turn-based';
  
  // Turn order for turn-based action mode
  private turnOrder: string[] = [];
  
  // Current turn index for turn-based action mode
  private currentTurnIndex: number = 0;
  
  // Logger
  private logger = logger.createChildLogger({ component: 'MultiAgentManager' });
  
  /**
   * Constructor
   * @param config Manager configuration
   */
  constructor(config: MultiAgentManagerConfig) {
    // Set action mode
    this.actionMode = config.actionMode || 'simultaneous';
    
    // Set agent factory
    this.agentFactory = config.agentFactory || new AgentFactory();
    
    // Set team configurations
    if (config.teams) {
      this.teams = config.teams;
    }
    
    // Set turn order
    if (config.turnOrder) {
      this.turnOrder = config.turnOrder;
    }
    
    // Create agents if auto-create is enabled
    if (config.autoCreateAgents && config.agents) {
      for (const [agentId, agentConfig] of Object.entries(config.agents)) {
        this.createAgent(agentId, agentConfig);
      }
    }
    
    this.logger.info(`MultiAgentManager initialized with action mode: ${this.actionMode}`);
    this.logger.info(`Number of agents: ${this.agents.size}`);
    this.logger.info(`Number of teams: ${Object.keys(this.teams).length}`);
  }
  
  /**
   * Create a new agent
   * @param agentId Agent ID
   * @param config Agent configuration
   * @returns The created agent wrapper or null if creation failed
   */
  public createAgent(agentId: string, config: any): AgentWrapper | null {
    try {
      // Check if agent already exists
      if (this.agents.has(agentId)) {
        this.logger.warn(`Agent with ID ${agentId} already exists`);
        return null;
      }
      
      // Create agent using factory
      const agent = this.agentFactory.createAgent(config);
      
      if (!agent) {
        this.logger.error(`Failed to create agent with ID ${agentId}`);
        return null;
      }
      
      // Determine team ID
      let teamId: string | undefined = undefined;
      
      for (const [id, team] of Object.entries(this.teams)) {
        if (team.agentIds.includes(agentId)) {
          teamId = id;
          break;
        }
      }
      
      // Create agent wrapper
      const wrapper: AgentWrapper = {
        agent,
        id: agentId,
        config,
        teamId,
        active: true,
        episodeReward: 0,
        totalReward: 0,
        steps: 0,
        episodes: 0
      };
      
      // Add to agents map
      this.agents.set(agentId, wrapper);
      
      // Add to turn order if not already present
      if (this.actionMode === 'turn-based' && !this.turnOrder.includes(agentId)) {
        this.turnOrder.push(agentId);
      }
      
      this.logger.info(`Created agent with ID ${agentId}`);
      
      return wrapper;
    } catch (error) {
      this.logger.error(`Error creating agent with ID ${agentId}: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Get an agent by ID
   * @param agentId Agent ID
   * @returns Agent wrapper or null if not found
   */
  public getAgent(agentId: string): AgentWrapper | null {
    return this.agents.get(agentId) || null;
  }
  
  /**
   * Get all agents
   * @returns Map of agent IDs to agent wrappers
   */
  public getAllAgents(): Map<string, AgentWrapper> {
    return this.agents;
  }
  
  /**
   * Get active agents
   * @returns Map of agent IDs to active agent wrappers
   */
  public getActiveAgents(): Map<string, AgentWrapper> {
    const activeAgents = new Map<string, AgentWrapper>();
    
    for (const [agentId, wrapper] of this.agents.entries()) {
      if (wrapper.active) {
        activeAgents.set(agentId, wrapper);
      }
    }
    
    return activeAgents;
  }
  
  /**
   * Remove an agent
   * @param agentId Agent ID
   * @returns True if agent was removed, false otherwise
   */
  public removeAgent(agentId: string): boolean {
    // Check if agent exists
    if (!this.agents.has(agentId)) {
      this.logger.warn(`Agent with ID ${agentId} does not exist`);
      return false;
    }
    
    // Remove from agents map
    this.agents.delete(agentId);
    
    // Remove from turn order
    const turnIndex = this.turnOrder.indexOf(agentId);
    if (turnIndex !== -1) {
      this.turnOrder.splice(turnIndex, 1);
      
      // Adjust current turn index if necessary
      if (this.currentTurnIndex > turnIndex) {
        this.currentTurnIndex--;
      } else if (this.currentTurnIndex >= this.turnOrder.length) {
        this.currentTurnIndex = 0;
      }
    }
    
    // Remove from teams
    for (const [teamId, team] of Object.entries(this.teams)) {
      const agentIndex = team.agentIds.indexOf(agentId);
      if (agentIndex !== -1) {
        team.agentIds.splice(agentIndex, 1);
      }
    }
    
    this.logger.info(`Removed agent with ID ${agentId}`);
    
    return true;
  }
  
  /**
   * Initialize agents with an environment
   * @param environment Multi-agent environment
   * @returns True if initialization was successful, false otherwise
   */
  public initializeAgents(environment: MultiAgentEnvironment): boolean {
    try {
      // Get observation and action spaces
      const observationSpaces = environment.getObservationSpaces();
      const actionSpaces = environment.getActionSpaces();
      
      // Initialize each agent
      for (const [agentId, wrapper] of this.agents.entries()) {
        const observationSpace = observationSpaces[agentId];
        const actionSpace = actionSpaces[agentId];
        
        if (!observationSpace || !actionSpace) {
          this.logger.error(`Missing observation or action space for agent ${agentId}`);
          return false;
        }
        
        // Initialize agent with spaces
        wrapper.agent.initialize({
          observationSpace,
          actionSpace,
          ...wrapper.config
        });
        
        // Reset agent state
        wrapper.active = true;
        wrapper.episodeReward = 0;
        wrapper.lastObservation = undefined;
        wrapper.lastAction = undefined;
      }
      
      // Reset turn-based action state
      this.currentTurnIndex = 0;
      
      this.logger.info(`Initialized ${this.agents.size} agents with environment`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error initializing agents: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Get actions from agents based on observations
   * @param observations Observations for each agent
   * @returns Actions from each agent
   */
  public getActions(observations: Record<string, AgentObservation>): Record<string, AgentAction> {
    const actions: Record<string, AgentAction> = {};
    
    if (this.actionMode === 'simultaneous') {
      // Simultaneous action mode: get actions from all active agents
      for (const [agentId, wrapper] of this.getActiveAgents().entries()) {
        const observation = observations[agentId];
        
        if (observation) {
          try {
            // Get action from agent
            const action = wrapper.agent.selectAction(observation);
            
            // Store action
            actions[agentId] = { action };
            
            // Update agent wrapper
            wrapper.lastObservation = observation;
            wrapper.lastAction = { action };
            wrapper.steps++;
          } catch (error) {
            this.logger.error(`Error getting action from agent ${agentId}: ${(error as Error).message}`);
          }
        }
      }
    } else {
      // Turn-based action mode: get action from current agent
      if (this.turnOrder.length > 0) {
        const agentId = this.turnOrder[this.currentTurnIndex];
        const wrapper = this.agents.get(agentId);
        
        if (wrapper && wrapper.active) {
          const observation = observations[agentId];
          
          if (observation) {
            try {
              // Get action from agent
              const action = wrapper.agent.selectAction(observation);
              
              // Store action
              actions[agentId] = { action };
              
              // Update agent wrapper
              wrapper.lastObservation = observation;
              wrapper.lastAction = { action };
              wrapper.steps++;
            } catch (error) {
              this.logger.error(`Error getting action from agent ${agentId}: ${(error as Error).message}`);
            }
          }
        }
        
        // Advance to next turn
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      }
    }
    
    return actions;
  }
  
  /**
   * Update agents with step results
   * @param stepResults Step results for each agent
   */
  public updateAgents(stepResults: Record<string, { observation: AgentObservation, reward: number, done: boolean, info: any }>): void {
    for (const [agentId, result] of Object.entries(stepResults)) {
      const wrapper = this.agents.get(agentId);
      
      if (wrapper && wrapper.active) {
        try {
          // Update agent with result
          if (wrapper.lastObservation && wrapper.lastAction) {
            wrapper.agent.update({
              observation: wrapper.lastObservation,
              action: wrapper.lastAction.action,
              nextObservation: result.observation,
              reward: result.reward,
              done: result.done,
              info: result.info
            });
          }
          
          // Update agent wrapper
          wrapper.lastObservation = result.observation;
          wrapper.episodeReward += result.reward;
          wrapper.totalReward += result.reward;
          
          // Handle episode completion
          if (result.done) {
            wrapper.episodes++;
            wrapper.episodeReward = 0;
            
            this.logger.debug(`Agent ${agentId} completed episode ${wrapper.episodes} with total reward ${wrapper.totalReward}`);
          }
        } catch (error) {
          this.logger.error(`Error updating agent ${agentId}: ${(error as Error).message}`);
        }
      }
    }
  }
  
  /**
   * Get the current agent for turn-based action mode
   * @returns Current agent ID or null if no agents
   */
  public getCurrentAgent(): string | null {
    if (this.actionMode === 'turn-based' && this.turnOrder.length > 0) {
      return this.turnOrder[this.currentTurnIndex];
    }
    
    return null;
  }
  
  /**
   * Set the action mode
   * @param mode Action mode
   */
  public setActionMode(mode: 'simultaneous' | 'turn-based'): void {
    this.actionMode = mode;
    this.logger.info(`Set action mode to ${mode}`);
  }
  
  /**
   * Set the turn order for turn-based action mode
   * @param turnOrder Turn order
   */
  public setTurnOrder(turnOrder: string[]): void {
    // Validate turn order
    for (const agentId of turnOrder) {
      if (!this.agents.has(agentId)) {
        this.logger.warn(`Turn order includes unknown agent ID ${agentId}`);
      }
    }
    
    this.turnOrder = turnOrder;
    this.currentTurnIndex = 0;
    
    this.logger.info(`Set turn order: ${turnOrder.join(', ')}`);
  }
  
  /**
   * Create a team
   * @param teamId Team ID
   * @param agentIds Agent IDs in the team
   * @param config Team configuration
   * @returns True if team was created, false otherwise
   */
  public createTeam(teamId: string, agentIds: string[], config?: any): boolean {
    // Check if team already exists
    if (this.teams[teamId]) {
      this.logger.warn(`Team with ID ${teamId} already exists`);
      return false;
    }
    
    // Validate agent IDs
    for (const agentId of agentIds) {
      if (!this.agents.has(agentId)) {
        this.logger.warn(`Team includes unknown agent ID ${agentId}`);
      }
    }
    
    // Create team
    this.teams[teamId] = {
      agentIds,
      config
    };
    
    // Update agent wrappers
    for (const agentId of agentIds) {
      const wrapper = this.agents.get(agentId);
      if (wrapper) {
        wrapper.teamId = teamId;
      }
    }
    
    this.logger.info(`Created team ${teamId} with ${agentIds.length} agents`);
    
    return true;
  }
  
  /**
   * Get a team by ID
   * @param teamId Team ID
   * @returns Team or null if not found
   */
  public getTeam(teamId: string): { agentIds: string[], config?: any } | null {
    return this.teams[teamId] || null;
  }
  
  /**
   * Get all teams
   * @returns Record of team IDs to teams
   */
  public getAllTeams(): Record<string, { agentIds: string[], config?: any }> {
    return this.teams;
  }
  
  /**
   * Get agents in a team
   * @param teamId Team ID
   * @returns Map of agent IDs to agent wrappers
   */
  public getTeamAgents(teamId: string): Map<string, AgentWrapper> {
    const team = this.teams[teamId];
    
    if (!team) {
      return new Map();
    }
    
    const teamAgents = new Map<string, AgentWrapper>();
    
    for (const agentId of team.agentIds) {
      const wrapper = this.agents.get(agentId);
      if (wrapper) {
        teamAgents.set(agentId, wrapper);
      }
    }
    
    return teamAgents;
  }
  
  /**
   * Remove a team
   * @param teamId Team ID
   * @returns True if team was removed, false otherwise
   */
  public removeTeam(teamId: string): boolean {
    // Check if team exists
    if (!this.teams[teamId]) {
      this.logger.warn(`Team with ID ${teamId} does not exist`);
      return false;
    }
    
    // Get agent IDs in team
    const agentIds = this.teams[teamId].agentIds;
    
    // Remove team
    delete this.teams[teamId];
    
    // Update agent wrappers
    for (const agentId of agentIds) {
      const wrapper = this.agents.get(agentId);
      if (wrapper && wrapper.teamId === teamId) {
        wrapper.teamId = undefined;
      }
    }
    
    this.logger.info(`Removed team ${teamId}`);
    
    return true;
  }
  
  /**
   * Reset all agents for a new episode
   */
  public resetAgents(): void {
    for (const wrapper of this.agents.values()) {
      wrapper.episodeReward = 0;
      wrapper.lastObservation = undefined;
      wrapper.lastAction = undefined;
    }
    
    this.currentTurnIndex = 0;
    
    this.logger.debug('Reset all agents for new episode');
  }
  
  /**
   * Terminate all agents
   */
  public terminateAgents(): void {
    for (const wrapper of this.agents.values()) {
      try {
        wrapper.agent.terminate();
      } catch (error) {
        this.logger.error(`Error terminating agent ${wrapper.id}: ${(error as Error).message}`);
      }
    }
    
    this.logger.info('Terminated all agents');
  }
}

export default MultiAgentManager;
