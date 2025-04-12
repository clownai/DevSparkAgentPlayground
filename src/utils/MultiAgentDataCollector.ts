/**
 * Multi-Agent Data Collection System for Visualizations
 * 
 * This module extends the base DataCollector to provide utilities for collecting,
 * processing, and storing data from multiple agents, teams, and their interactions
 * for visualization purposes.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import { Logger } from '../types/core';
import DataCollector, { 
  MetricType, 
  MetricDataPoint, 
  StateRecord, 
  ActionRecord, 
  EpisodeRecord,
  DataCollectorConfig
} from './DataCollector';

/**
 * Agent identity interface
 */
export interface AgentIdentity {
  id: string;
  name?: string;
  teamId?: string;
  role?: string;
  metadata?: Record<string, any>;
}

/**
 * Team identity interface
 */
export interface TeamIdentity {
  id: string;
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent-specific metric data point interface
 */
export interface AgentMetricDataPoint extends MetricDataPoint {
  agentId: string;
  teamId?: string;
}

/**
 * Team-specific metric data point interface
 */
export interface TeamMetricDataPoint extends MetricDataPoint {
  teamId: string;
  agentIds?: string[];
}

/**
 * Agent-specific state recording interface
 */
export interface AgentStateRecord extends StateRecord {
  agentId: string;
  teamId?: string;
  position?: { x: number; y: number; z?: number };
}

/**
 * Agent-specific action recording interface
 */
export interface AgentActionRecord extends ActionRecord {
  agentId: string;
  teamId?: string;
}

/**
 * Communication message interface
 */
export interface CommunicationRecord {
  messageId: string;
  senderId: string;
  senderTeamId?: string;
  receiverId?: string; // Undefined for broadcast messages
  receiverTeamId?: string;
  content: any;
  timestamp: number;
  step: number;
  episode: number;
  metadata?: Record<string, any>;
}

/**
 * Interaction record interface
 */
export interface InteractionRecord {
  interactionId: string;
  agentIds: string[];
  teamIds?: string[];
  type: string; // e.g., 'collision', 'cooperation', 'competition'
  outcome?: any;
  timestamp: number;
  step: number;
  episode: number;
  metadata?: Record<string, any>;
}

/**
 * Multi-agent episode recording interface
 */
export interface MultiAgentEpisodeRecord extends Omit<EpisodeRecord, 'states' | 'actions'> {
  agentIds: string[];
  teamIds?: string[];
  states: AgentStateRecord[];
  actions: AgentActionRecord[];
  communications: CommunicationRecord[];
  interactions: InteractionRecord[];
  teamRewards?: Record<string, number>;
  individualRewards?: Record<string, number>;
}

/**
 * Configuration for the multi-agent data collector
 */
export interface MultiAgentDataCollectorConfig extends DataCollectorConfig {
  collectCommunications?: boolean;
  collectInteractions?: boolean;
  collectTeamMetrics?: boolean;
  trackRelativePositions?: boolean;
  communicationSubsampling?: number;
}

/**
 * Main multi-agent data collector class
 */
export class MultiAgentDataCollector extends DataCollector {
  private multiAgentConfig: MultiAgentDataCollectorConfig;
  private agents: Map<string, AgentIdentity> = new Map();
  private teams: Map<string, TeamIdentity> = new Map();
  private agentMetricsBuffer: AgentMetricDataPoint[] = [];
  private teamMetricsBuffer: TeamMetricDataPoint[] = [];
  private agentStatesBuffer: AgentStateRecord[] = [];
  private agentActionsBuffer: AgentActionRecord[] = [];
  private communicationsBuffer: CommunicationRecord[] = [];
  private interactionsBuffer: InteractionRecord[] = [];
  private multiAgentEpisodes: MultiAgentEpisodeRecord[] = [];
  private currentMultiAgentEpisode: MultiAgentEpisodeRecord | null = null;

  /**
   * Create a new MultiAgentDataCollector
   * @param {string} experimentId - Unique identifier for the experiment
   * @param {MultiAgentDataCollectorConfig} config - Configuration options
   */
  constructor(experimentId: string, config: MultiAgentDataCollectorConfig) {
    super(experimentId, config);
    
    this.multiAgentConfig = {
      collectCommunications: true,
      collectInteractions: true,
      collectTeamMetrics: true,
      trackRelativePositions: true,
      communicationSubsampling: 1, // collect every communication
      ...config
    };
    
    this.logger = logger.createChildLogger({ 
      component: 'MultiAgentDataCollector',
      experimentId
    });
    
    this.logger.info(`Multi-agent data collector initialized for experiment ${experimentId}`);
  }
  
  /**
   * Register an agent with the data collector
   * @param {AgentIdentity} agent - Agent identity information
   */
  registerAgent(agent: AgentIdentity): void {
    this.agents.set(agent.id, agent);
    
    // Register agent's team if provided and not already registered
    if (agent.teamId && !this.teams.has(agent.teamId)) {
      this.teams.set(agent.teamId, { 
        id: agent.teamId,
        name: `Team ${agent.teamId}`,
        metadata: {}
      });
    }
    
    this.logger.debug(`Registered agent ${agent.id}${agent.teamId ? ` in team ${agent.teamId}` : ''}`);
  }
  
  /**
   * Register a team with the data collector
   * @param {TeamIdentity} team - Team identity information
   */
  registerTeam(team: TeamIdentity): void {
    this.teams.set(team.id, team);
    this.logger.debug(`Registered team ${team.id}`);
  }
  
  /**
   * Collect an agent-specific metric data point
   * @param {string} agentId - Agent identifier
   * @param {string} name - Metric name
   * @param {number | number[] | Record<string, number>} value - Metric value
   * @param {MetricType} type - Type of metric
   * @param {Record<string, any>} metadata - Additional metadata
   */
  collectAgentMetric(
    agentId: string,
    name: string,
    value: number | number[] | Record<string, number>,
    type: MetricType = MetricType.SCALAR,
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectMetrics) {
      return;
    }
    
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn(`Attempted to collect metric for unregistered agent ${agentId}`);
      return;
    }
    
    const dataPoint: AgentMetricDataPoint = {
      agentId,
      teamId: agent.teamId,
      name: `agent/${agentId}/${name}`,
      value,
      type,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata: {
        ...metadata,
        agentRole: agent.role
      }
    };
    
    this.agentMetricsBuffer.push(dataPoint);
    
    // Also collect as a regular metric for backward compatibility
    super.collectMetric(`agent/${agentId}/${name}`, value, type, {
      ...metadata,
      agentId,
      teamId: agent.teamId
    });
    
    // Auto-flush if buffer is full
    if (this.agentMetricsBuffer.length >= this.multiAgentConfig.maxBufferSize!) {
      this.flushAgentMetrics();
    }
  }
  
  /**
   * Collect a team-specific metric data point
   * @param {string} teamId - Team identifier
   * @param {string} name - Metric name
   * @param {number | number[] | Record<string, number>} value - Metric value
   * @param {MetricType} type - Type of metric
   * @param {string[]} agentIds - Optional list of agent IDs contributing to this metric
   * @param {Record<string, any>} metadata - Additional metadata
   */
  collectTeamMetric(
    teamId: string,
    name: string,
    value: number | number[] | Record<string, number>,
    type: MetricType = MetricType.SCALAR,
    agentIds?: string[],
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectTeamMetrics) {
      return;
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      this.logger.warn(`Attempted to collect metric for unregistered team ${teamId}`);
      return;
    }
    
    const dataPoint: TeamMetricDataPoint = {
      teamId,
      agentIds,
      name: `team/${teamId}/${name}`,
      value,
      type,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata
    };
    
    this.teamMetricsBuffer.push(dataPoint);
    
    // Also collect as a regular metric for backward compatibility
    super.collectMetric(`team/${teamId}/${name}`, value, type, {
      ...metadata,
      teamId,
      agentIds
    });
    
    // Auto-flush if buffer is full
    if (this.teamMetricsBuffer.length >= this.multiAgentConfig.maxBufferSize!) {
      this.flushTeamMetrics();
    }
  }
  
  /**
   * Record an agent-specific state
   * @param {string} agentId - Agent identifier
   * @param {any} state - Agent state
   * @param {{ x: number; y: number; z?: number }} position - Optional agent position
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordAgentState(
    agentId: string,
    state: any,
    position?: { x: number; y: number; z?: number },
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectStates) {
      return;
    }
    
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn(`Attempted to record state for unregistered agent ${agentId}`);
      return;
    }
    
    // Apply subsampling if configured
    if (this.multiAgentConfig.stateSubsampling! > 1 && 
        this.stepCounter % this.multiAgentConfig.stateSubsampling! !== 0) {
      return;
    }
    
    const stateRecord: AgentStateRecord = {
      agentId,
      teamId: agent.teamId,
      state,
      position,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata: {
        ...metadata,
        agentRole: agent.role
      }
    };
    
    this.agentStatesBuffer.push(stateRecord);
    
    // Add to current episode if tracking episodes
    if (this.currentMultiAgentEpisode && this.multiAgentConfig.collectEpisodes) {
      this.currentMultiAgentEpisode.states.push(stateRecord);
    }
    
    // Also record as a regular state for backward compatibility
    super.recordState(state, {
      ...metadata,
      agentId,
      teamId: agent.teamId,
      position
    });
    
    // Auto-flush if buffer is full
    if (this.agentStatesBuffer.length >= this.multiAgentConfig.maxBufferSize!) {
      this.flushAgentStates();
    }
  }
  
  /**
   * Record an agent-specific action
   * @param {string} agentId - Agent identifier
   * @param {any} action - Agent action
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordAgentAction(
    agentId: string,
    action: any,
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectActions) {
      return;
    }
    
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn(`Attempted to record action for unregistered agent ${agentId}`);
      return;
    }
    
    const actionRecord: AgentActionRecord = {
      agentId,
      teamId: agent.teamId,
      action,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata: {
        ...metadata,
        agentRole: agent.role
      }
    };
    
    this.agentActionsBuffer.push(actionRecord);
    
    // Add to current episode if tracking episodes
    if (this.currentMultiAgentEpisode && this.multiAgentConfig.collectEpisodes) {
      this.currentMultiAgentEpisode.actions.push(actionRecord);
    }
    
    // Also record as a regular action for backward compatibility
    super.recordAction(action, {
      ...metadata,
      agentId,
      teamId: agent.teamId
    });
    
    // Auto-flush if buffer is full
    if (this.agentActionsBuffer.length >= this.multiAgentConfig.maxBufferSize!) {
      this.flushAgentActions();
    }
  }
  
  /**
   * Record a communication message between agents
   * @param {string} senderId - Sender agent identifier
   * @param {string | undefined} receiverId - Receiver agent identifier (undefined for broadcast)
   * @param {any} content - Message content
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordCommunication(
    senderId: string,
    receiverId: string | undefined,
    content: any,
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectCommunications) {
      return;
    }
    
    const sender = this.agents.get(senderId);
    if (!sender) {
      this.logger.warn(`Attempted to record communication from unregistered agent ${senderId}`);
      return;
    }
    
    let receiver = undefined;
    if (receiverId) {
      receiver = this.agents.get(receiverId);
      if (!receiver) {
        this.logger.warn(`Attempted to record communication to unregistered agent ${receiverId}`);
        return;
      }
    }
    
    // Apply subsampling if configured
    if (this.multiAgentConfig.communicationSubsampling! > 1 && 
        this.stepCounter % this.multiAgentConfig.communicationSubsampling! !== 0) {
      return;
    }
    
    const communicationRecord: CommunicationRecord = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderTeamId: sender.teamId,
      receiverId,
      receiverTeamId: receiver?.teamId,
      content,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata
    };
    
    this.communicationsBuffer.push(communicationRecord);
    
    // Add to current episode if tracking episodes
    if (this.currentMultiAgentEpisode && this.multiAgentConfig.collectEpisodes) {
      this.currentMultiAgentEpisode.communications.push(communicationRecord);
    }
    
    // Auto-flush if buffer is full
    if (this.communicationsBuffer.length >= this.multiAgentConfig.maxBufferSize!) {
      this.flushCommunications();
    }
  }
  
  /**
   * Record an interaction between agents
   * @param {string[]} agentIds - Identifiers of agents involved in the interaction
   * @param {string} type - Type of interaction (e.g., 'collision', 'cooperation')
   * @param {any} outcome - Outcome of the interaction
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordInteraction(
    agentIds: string[],
    type: string,
    outcome?: any,
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectInteractions) {
      return;
    }
    
    // Verify all agents are registered
    const teamIds: string[] = [];
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        this.logger.warn(`Attempted to record interaction with unregistered agent ${agentId}`);
        return;
      }
      if (agent.teamId) {
        teamIds.push(agent.teamId);
      }
    }
    
    const interactionRecord: InteractionRecord = {
      interactionId: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentIds,
      teamIds: teamIds.length > 0 ? [...new Set(teamIds)] : undefined,
      type,
      outcome,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata
    };
    
    this.interactionsBuffer.push(interactionRecord);
    
    // Add to current episode if tracking episodes
    if (this.currentMultiAgentEpisode && this.multiAgentConfig.collectEpisodes) {
      this.currentMultiAgentEpisode.interactions.push(interactionRecord);
    }
    
    // Auto-flush if buffer is full
    if (this.interactionsBuffer.length >= this.multiAgentConfig.maxBufferSize!) {
      this.flushInteractions();
    }
  }
  
  /**
   * Start a new multi-agent episode
   * @param {string[]} agentIds - Identifiers of agents participating in the episode
   * @param {Record<string, any>} metadata - Additional metadata
   */
  startMultiAgentEpisode(agentIds: string[], metadata?: Record<string, any>): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectEpisodes) {
      return;
    }
    
    // End current episode if one is in progress
    if (this.currentMultiAgentEpisode) {
      this.endMultiAgentEpisode();
    }
    
    // Verify all agents are registered
    const teamIds: string[] = [];
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        this.logger.warn(`Attempted to start episode with unregistered agent ${agentId}`);
        return;
      }
      if (agent.teamId) {
        teamIds.push(agent.teamId);
      }
    }
    
    this.episodeCounter++;
    
    this.currentMultiAgentEpisode = {
      episode: this.episodeCounter,
      agentIds,
      teamIds: teamIds.length > 0 ? [...new Set(teamIds)] : undefined,
      startTimestamp: Date.now(),
      endTimestamp: 0,
      totalSteps: 0,
      totalReward: 0,
      states: [],
      actions: [],
      communications: [],
      interactions: [],
      teamRewards: {},
      individualRewards: {},
      metadata
    };
    
    // Also start a regular episode for backward compatibility
    super.startEpisode({
      ...metadata,
      agentIds,
      teamIds: this.currentMultiAgentEpisode.teamIds
    });
    
    this.logger.debug(`Started multi-agent episode ${this.episodeCounter} with ${agentIds.length} agents`);
  }
  
  /**
   * End the current multi-agent episode
   * @param {Record<string, number>} individualRewards - Rewards for individual agents
   * @param {Record<string, number>} teamRewards - Rewards for teams
   * @param {number} totalReward - Total reward for the episode
   * @param {Record<string, any>} metadata - Additional metadata
   */
  endMultiAgentEpisode(
    individualRewards?: Record<string, number>,
    teamRewards?: Record<string, number>,
    totalReward?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectEpisodes || !this.currentMultiAgentEpisode) {
      return;
    }
    
    this.currentMultiAgentEpisode.endTimestamp = Date.now();
    this.currentMultiAgentEpisode.totalSteps = this.stepCounter - this.currentMultiAgentEpisode.totalSteps;
    
    if (individualRewards) {
      this.currentMultiAgentEpisode.individualRewards = individualRewards;
    }
    
    if (teamRewards) {
      this.currentMultiAgentEpisode.teamRewards = teamRewards;
    }
    
    if (totalReward !== undefined) {
      this.currentMultiAgentEpisode.totalReward = totalReward;
    } else if (individualRewards) {
      // Calculate total reward as sum of individual rewards if not provided
      this.currentMultiAgentEpisode.totalReward = Object.values(individualRewards).reduce((a, b) => a + b, 0);
    }
    
    if (metadata) {
      this.currentMultiAgentEpisode.metadata = {
        ...this.currentMultiAgentEpisode.metadata,
        ...metadata
      };
    }
    
    this.multiAgentEpisodes.push(this.currentMultiAgentEpisode);
    
    // Also end the regular episode for backward compatibility
    super.endEpisode(this.currentMultiAgentEpisode.totalReward, {
      ...metadata,
      individualRewards,
      teamRewards
    });
    
    this.logger.debug(`Ended multi-agent episode ${this.episodeCounter} with reward ${this.currentMultiAgentEpisode.totalReward}`);
    
    // Save episode data
    this._saveMultiAgentEpisode(this.episodeCounter);
    
    this.currentMultiAgentEpisode = null;
  }
  
  /**
   * Flush all multi-agent data to storage
   */
  flushMultiAgentData(): void {
    this.flushAgentMetrics();
    this.flushTeamMetrics();
    this.flushAgentStates();
    this.flushAgentActions();
    this.flushCommunications();
    this.flushInteractions();
    
    // Also flush regular data for backward compatibility
    super.flush();
  }
  
  /**
   * Override the base flush method to include multi-agent data
   */
  flush(): void {
    this.flushMultiAgentData();
  }
  
  /**
   * Flush agent metrics data to storage
   */
  flushAgentMetrics(): void {
    if (!this.multiAgentConfig.enabled || this.agentMetricsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `agent_metrics_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.agentMetricsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.agentMetricsBuffer.length} agent metrics to ${filePath}`);
      this.agentMetricsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush agent metrics', error);
    }
  }
  
  /**
   * Flush team metrics data to storage
   */
  flushTeamMetrics(): void {
    if (!this.multiAgentConfig.enabled || this.teamMetricsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `team_metrics_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.teamMetricsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.teamMetricsBuffer.length} team metrics to ${filePath}`);
      this.teamMetricsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush team metrics', error);
    }
  }
  
  /**
   * Flush agent states data to storage
   */
  flushAgentStates(): void {
    if (!this.multiAgentConfig.enabled || this.agentStatesBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `agent_states_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.agentStatesBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.agentStatesBuffer.length} agent states to ${filePath}`);
      this.agentStatesBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush agent states', error);
    }
  }
  
  /**
   * Flush agent actions data to storage
   */
  flushAgentActions(): void {
    if (!this.multiAgentConfig.enabled || this.agentActionsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `agent_actions_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.agentActionsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.agentActionsBuffer.length} agent actions to ${filePath}`);
      this.agentActionsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush agent actions', error);
    }
  }
  
  /**
   * Flush communications data to storage
   */
  flushCommunications(): void {
    if (!this.multiAgentConfig.enabled || this.communicationsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `communications_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.communicationsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.communicationsBuffer.length} communications to ${filePath}`);
      this.communicationsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush communications', error);
    }
  }
  
  /**
   * Flush interactions data to storage
   */
  flushInteractions(): void {
    if (!this.multiAgentConfig.enabled || this.interactionsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `interactions_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.interactionsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.interactionsBuffer.length} interactions to ${filePath}`);
      this.interactionsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush interactions', error);
    }
  }
  
  /**
   * Save multi-agent episode data to storage
   * @param {number} episodeNumber - Episode number
   * @private
   */
  private _saveMultiAgentEpisode(episodeNumber: number): void {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.collectEpisodes) {
      return;
    }
    
    try {
      const episode = this.multiAgentEpisodes.find(ep => ep.episode === episodeNumber);
      
      if (!episode) {
        return;
      }
      
      const filePath = path.join(
        this.storageDirectory,
        `multi_agent_episode_${episodeNumber}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(episode),
        'utf8'
      );
      
      this.logger.debug(`Saved multi-agent episode ${episodeNumber} to ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save multi-agent episode ${episodeNumber}`, error);
    }
  }
  
  /**
   * Calculate relative positions between agents
   * @returns {Record<string, Record<string, { distance: number; direction: { x: number; y: number; z?: number } }>>}
   */
  calculateRelativePositions(): Record<string, Record<string, { 
    distance: number; 
    direction: { x: number; y: number; z?: number } 
  }>> {
    if (!this.multiAgentConfig.enabled || !this.multiAgentConfig.trackRelativePositions) {
      return {};
    }
    
    const result: Record<string, Record<string, { 
      distance: number; 
      direction: { x: number; y: number; z?: number } 
    }>> = {};
    
    // Get the latest state for each agent
    const latestStates = new Map<string, AgentStateRecord>();
    
    for (const stateRecord of this.agentStatesBuffer) {
      const existing = latestStates.get(stateRecord.agentId);
      if (!existing || stateRecord.step > existing.step) {
        latestStates.set(stateRecord.agentId, stateRecord);
      }
    }
    
    // Calculate relative positions for each pair of agents
    for (const [agentId1, state1] of latestStates.entries()) {
      if (!state1.position) continue;
      
      result[agentId1] = {};
      
      for (const [agentId2, state2] of latestStates.entries()) {
        if (agentId1 === agentId2 || !state2.position) continue;
        
        const direction = {
          x: state2.position.x - state1.position.x,
          y: state2.position.y - state1.position.y,
          ...(state1.position.z !== undefined && state2.position.z !== undefined 
              ? { z: state2.position.z - state1.position.z } 
              : {})
        };
        
        const distance = Math.sqrt(
          direction.x * direction.x + 
          direction.y * direction.y + 
          (direction.z !== undefined ? direction.z * direction.z : 0)
        );
        
        result[agentId1][agentId2] = {
          distance,
          direction
        };
      }
    }
    
    return result;
  }
  
  /**
   * Override the base cleanup method to include multi-agent data
   */
  cleanup(): void {
    // Flush all multi-agent data
    this.flushMultiAgentData();
    
    // End current multi-agent episode if one is in progress
    if (this.currentMultiAgentEpisode) {
      this.endMultiAgentEpisode();
    }
    
    // Call the base cleanup method
    super.cleanup();
    
    this.logger.info('Multi-agent data collector cleaned up');
  }
}

export default MultiAgentDataCollector;
