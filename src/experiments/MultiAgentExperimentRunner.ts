/**
 * Multi-Agent Experiment Runner
 * 
 * This module provides an experiment runner for multi-agent reinforcement learning experiments.
 * It extends the base ExperimentRunner to support multiple agents interacting in a shared environment.
 */

import ExperimentRunner from '../utils/ExperimentRunner';
import { MultiAgentEnvironment, AgentObservation, AgentAction } from '../environments/MultiAgentEnvironment';
import MultiAgentManager from '../agents/MultiAgentManager';
import logger from '../utils/logger';
import { Logger } from '../types/core';
import { VisualizationManager } from '../visualization/VisualizationManager';

/**
 * Configuration for multi-agent experiment runner
 */
export interface MultiAgentExperimentConfig {
  // Experiment identifier
  experimentId: string;
  
  // Environment configuration
  environmentConfig: any;
  
  // Agent configurations by ID
  agentConfigs: Record<string, any>;
  
  // Team configurations
  teamConfigs?: Record<string, {
    // Agent IDs in this team
    agentIds: string[];
    
    // Team-specific configuration
    config?: any;
  }>;
  
  // Action mode: 'simultaneous' or 'turn-based'
  actionMode?: 'simultaneous' | 'turn-based';
  
  // Turn order for turn-based action mode
  turnOrder?: string[];
  
  // Maximum number of steps per experiment
  maxSteps: number;
  
  // Maximum number of episodes per experiment
  maxEpisodes: number;
  
  // Frequency of evaluation episodes
  evaluationFrequency?: number;
  
  // Number of evaluation episodes
  evaluationEpisodes?: number;
  
  // Frequency of checkpoints
  checkpointFrequency?: number;
  
  // Frequency of logging
  logFrequency?: number;
  
  // Visualization configuration
  visualizationConfig?: {
    enabled: boolean;
    // Additional visualization configuration...
  };
}

/**
 * Experiment runner for multi-agent reinforcement learning
 */
export class MultiAgentExperimentRunner extends ExperimentRunner {
  // Multi-agent environment
  protected multiAgentEnvironment: MultiAgentEnvironment | null = null;
  
  // Multi-agent manager
  protected agentManager: MultiAgentManager | null = null;
  
  // Current observations for each agent
  protected currentObservations: Record<string, AgentObservation> = {};
  
  // Current rewards for each agent
  protected currentRewards: Record<string, number> = {};
  
  // Cumulative rewards for each agent in the current episode
  protected episodeRewards: Record<string, number> = {};
  
  // Total rewards for each agent across all episodes
  protected totalRewards: Record<string, number> = {};
  
  // Whether each agent is done
  protected agentDones: Record<string, boolean> = {};
  
  // Action mode
  protected actionMode: 'simultaneous' | 'turn-based';
  
  // Visualization manager
  protected visualizationManager: VisualizationManager | null = null;
  
  // Logger
  protected logger: Logger;
  
  /**
   * Constructor
   * @param config Experiment configuration
   */
  constructor(config: MultiAgentExperimentConfig) {
    super({
      experimentId: config.experimentId,
      environmentConfig: config.environmentConfig,
      agentConfig: {}, // Not used in multi-agent setup
      maxSteps: config.maxSteps,
      maxEpisodes: config.maxEpisodes,
      evaluationFrequency: config.evaluationFrequency,
      evaluationEpisodes: config.evaluationEpisodes,
      checkpointFrequency: config.checkpointFrequency,
      logFrequency: config.logFrequency
    });
    
    // Set action mode
    this.actionMode = config.actionMode || 'simultaneous';
    
    // Create logger
    this.logger = logger.createChildLogger({
      component: 'MultiAgentExperimentRunner',
      experimentId: config.experimentId
    });
    
    // Create agent manager
    this.agentManager = new MultiAgentManager({
      agents: config.agentConfigs,
      autoCreateAgents: true,
      teams: config.teamConfigs,
      actionMode: this.actionMode,
      turnOrder: config.turnOrder
    });
    
    // Initialize visualization if enabled
    if (config.visualizationConfig?.enabled) {
      this.initializeVisualization(config.experimentId, config.visualizationConfig);
    }
    
    this.logger.info(`MultiAgentExperimentRunner initialized with ID: ${config.experimentId}`);
    this.logger.info(`Action mode: ${this.actionMode}`);
    this.logger.info(`Number of agents: ${Object.keys(config.agentConfigs).length}`);
    this.logger.info(`Number of teams: ${config.teamConfigs ? Object.keys(config.teamConfigs).length : 0}`);
  }
  
  /**
   * Initialize visualization
   * @param experimentId Experiment ID
   * @param config Visualization configuration
   */
  protected initializeVisualization(experimentId: string, config: any): void {
    try {
      this.visualizationManager = new VisualizationManager({
        enabled: true,
        // Additional configuration...
      });
      
      const success = this.visualizationManager.initialize(experimentId);
      
      if (success) {
        this.logger.info('Visualization system initialized successfully');
      } else {
        this.logger.warn('Failed to initialize visualization system');
        this.visualizationManager = null;
      }
    } catch (error) {
      this.logger.error(`Error initializing visualization system: ${(error as Error).message}`);
      this.visualizationManager = null;
    }
  }
  
  /**
   * Set up the experiment
   * @returns Promise resolving to true if setup was successful, false otherwise
   */
  public async setup(): Promise<boolean> {
    try {
      this.logger.info('Setting up multi-agent experiment');
      
      // Create environment
      this.environment = await this.createEnvironment(this.environmentConfig);
      
      if (!this.environment) {
        this.logger.error('Failed to create environment');
        return false;
      }
      
      // Ensure environment is a multi-agent environment
      if (!this.isMultiAgentEnvironment(this.environment)) {
        this.logger.error('Environment is not a multi-agent environment');
        return false;
      }
      
      this.multiAgentEnvironment = this.environment;
      
      // Initialize agents
      if (!this.agentManager) {
        this.logger.error('Agent manager is not initialized');
        return false;
      }
      
      const initSuccess = this.agentManager.initializeAgents(this.multiAgentEnvironment);
      
      if (!initSuccess) {
        this.logger.error('Failed to initialize agents');
        return false;
      }
      
      // Register with visualization manager
      if (this.visualizationManager) {
        // Register environment
        this.visualizationManager.registerEnvironment(this.multiAgentEnvironment);
        
        // Register agents
        for (const [agentId, wrapper] of this.agentManager.getAllAgents().entries()) {
          this.visualizationManager.registerAgent(wrapper.agent, agentId);
        }
      }
      
      this.logger.info('Multi-agent experiment setup completed successfully');
      
      return true;
    } catch (error) {
      this.logger.error(`Error setting up experiment: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Type guard to check if an environment is a multi-agent environment
   * @param environment Environment to check
   * @returns True if environment is a multi-agent environment
   */
  protected isMultiAgentEnvironment(environment: any): environment is MultiAgentEnvironment {
    return (
      typeof environment.getAgentIds === 'function' &&
      typeof environment.getObservationSpaces === 'function' &&
      typeof environment.getActionSpaces === 'function'
    );
  }
  
  /**
   * Reset the experiment for a new episode
   * @returns Promise resolving to true if reset was successful, false otherwise
   */
  public async reset(): Promise<boolean> {
    try {
      if (!this.multiAgentEnvironment || !this.agentManager) {
        this.logger.error('Environment or agent manager is not initialized');
        return false;
      }
      
      // Reset environment
      this.currentObservations = this.multiAgentEnvironment.reset();
      
      // Reset agent manager
      this.agentManager.resetAgents();
      
      // Reset episode state
      this.episodeRewards = {};
      this.agentDones = {};
      
      for (const agentId of this.multiAgentEnvironment.getAgentIds()) {
        this.episodeRewards[agentId] = 0;
        this.agentDones[agentId] = false;
      }
      
      // Reset episode counter if needed
      if (this.currentEpisode >= this.maxEpisodes) {
        this.currentEpisode = 0;
      }
      
      this.logger.debug('Reset experiment for new episode');
      
      return true;
    } catch (error) {
      this.logger.error(`Error resetting experiment: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Execute a single step of the experiment
   * @returns Promise resolving to true if step was successful, false otherwise
   */
  public async step(): Promise<boolean> {
    try {
      if (!this.multiAgentEnvironment || !this.agentManager) {
        this.logger.error('Environment or agent manager is not initialized');
        return false;
      }
      
      // Get actions from agents
      const actions = this.agentManager.getActions(this.currentObservations);
      
      // Execute step in environment
      const stepResults = this.multiAgentEnvironment.step(actions);
      
      // Update agent manager with results
      this.agentManager.updateAgents(stepResults);
      
      // Update experiment state
      this.currentObservations = {};
      this.currentRewards = {};
      
      for (const [agentId, result] of Object.entries(stepResults)) {
        this.currentObservations[agentId] = result.observation;
        this.currentRewards[agentId] = result.reward;
        this.episodeRewards[agentId] = (this.episodeRewards[agentId] || 0) + result.reward;
        this.totalRewards[agentId] = (this.totalRewards[agentId] || 0) + result.reward;
        this.agentDones[agentId] = result.done;
      }
      
      // Increment step counter
      this.currentStep++;
      
      // Record progress in visualization manager
      if (this.visualizationManager) {
        this.visualizationManager.recordProgress(
          this.currentStep,
          this.currentEpisode,
          {
            rewards: this.currentRewards,
            episodeRewards: this.episodeRewards,
            totalRewards: this.totalRewards
          }
        );
      }
      
      // Log progress
      if (this.logFrequency && this.currentStep % this.logFrequency === 0) {
        this.logProgress();
      }
      
      // Check if episode is done
      const episodeDone = this.isEpisodeDone();
      
      if (episodeDone) {
        // Increment episode counter
        this.currentEpisode++;
        
        // Log episode completion
        this.logger.info(`Episode ${this.currentEpisode} completed after ${this.currentStep} steps`);
        this.logEpisodeResults();
        
        // Reset for next episode
        await this.reset();
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error executing step: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Check if the current episode is done
   * @returns True if episode is done
   */
  protected isEpisodeDone(): boolean {
    if (!this.multiAgentEnvironment) {
      return true;
    }
    
    // Check if all agents are done
    const allAgentsDone = Object.values(this.agentDones).every(done => done);
    
    // Check if maximum steps per episode is reached
    const maxStepsReached = this.multiAgentEnvironment.getMaxStepsPerEpisode() !== undefined &&
                           this.multiAgentEnvironment.getCurrentStep() >= (this.multiAgentEnvironment.getMaxStepsPerEpisode() || 0);
    
    return allAgentsDone || maxStepsReached;
  }
  
  /**
   * Log progress information
   */
  protected logProgress(): void {
    if (!this.multiAgentEnvironment) {
      return;
    }
    
    const agentIds = this.multiAgentEnvironment.getAgentIds();
    
    this.logger.info(`Step ${this.currentStep}, Episode ${this.currentEpisode}`);
    
    for (const agentId of agentIds) {
      this.logger.info(`Agent ${agentId}: Episode Reward: ${this.episodeRewards[agentId]?.toFixed(2)}, Total Reward: ${this.totalRewards[agentId]?.toFixed(2)}`);
    }
  }
  
  /**
   * Log episode results
   */
  protected logEpisodeResults(): void {
    if (!this.multiAgentEnvironment) {
      return;
    }
    
    const agentIds = this.multiAgentEnvironment.getAgentIds();
    
    this.logger.info(`Episode ${this.currentEpisode} Results:`);
    
    for (const agentId of agentIds) {
      this.logger.info(`Agent ${agentId}: Episode Reward: ${this.episodeRewards[agentId]?.toFixed(2)}, Total Reward: ${this.totalRewards[agentId]?.toFixed(2)}`);
    }
  }
  
  /**
   * Run the experiment
   * @returns Promise resolving to true if run was successful, false otherwise
   */
  public async run(): Promise<boolean> {
    try {
      this.logger.info('Starting multi-agent experiment');
      
      // Set up experiment
      const setupSuccess = await this.setup();
      
      if (!setupSuccess) {
        this.logger.error('Failed to set up experiment');
        return false;
      }
      
      // Reset for first episode
      await this.reset();
      
      // Run until max steps or max episodes
      while (this.currentStep < this.maxSteps && this.currentEpisode < this.maxEpisodes) {
        const stepSuccess = await this.step();
        
        if (!stepSuccess) {
          this.logger.error('Failed to execute step');
          return false;
        }
      }
      
      // Record experiment end in visualization manager
      if (this.visualizationManager) {
        this.visualizationManager.recordEnd(
          true,
          {
            totalSteps: this.currentStep,
            totalEpisodes: this.currentEpisode,
            finalRewards: this.totalRewards
          }
        );
      }
      
      this.logger.info(`Experiment completed after ${this.currentStep} steps and ${this.currentEpisode} episodes`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error running experiment: ${(error as Error).message}`);
      return false;
    } finally {
      // Clean up
      this.cleanup();
    }
  }
  
  /**
   * Clean up resources
   */
  public cleanup(): void {
    try {
      // Terminate agents
      if (this.agentManager) {
        this.agentManager.terminateAgents();
      }
      
      // Close environment
      if (this.multiAgentEnvironment) {
        this.multiAgentEnvironment.close();
      }
      
      // Clean up visualization
      if (this.visualizationManager) {
        this.visualizationManager.cleanup();
      }
      
      this.logger.info('Cleaned up experiment resources');
    } catch (error) {
      this.logger.error(`Error cleaning up: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get the multi-agent environment
   * @returns Multi-agent environment or null if not initialized
   */
  public getMultiAgentEnvironment(): MultiAgentEnvironment | null {
    return this.multiAgentEnvironment;
  }
  
  /**
   * Get the agent manager
   * @returns Agent manager or null if not initialized
   */
  public getAgentManager(): MultiAgentManager | null {
    return this.agentManager;
  }
  
  /**
   * Get the visualization manager
   * @returns Visualization manager or null if not initialized
   */
  public getVisualizationManager(): VisualizationManager | null {
    return this.visualizationManager;
  }
  
  /**
   * Create a metrics dashboard for the experiment
   * @param options Dashboard options
   * @returns Dashboard component or null if visualization is disabled
   */
  public createMetricsDashboard(options: any = {}): React.ReactNode | null {
    if (!this.visualizationManager) {
      return null;
    }
    
    return this.visualizationManager.createMetricsDashboard(
      { metrics: [] }, // This would be populated with actual metrics in a real implementation
      options
    );
  }
  
  /**
   * Create an agent dashboard for a specific agent
   * @param agentId Agent ID
   * @param options Dashboard options
   * @returns Dashboard component or null if visualization is disabled or agent not found
   */
  public createAgentDashboard(agentId: string, options: any = {}): React.ReactNode | null {
    if (!this.visualizationManager || !this.agentManager) {
      return null;
    }
    
    const wrapper = this.agentManager.getAgent(agentId);
    
    if (!wrapper) {
      return null;
    }
    
    return this.visualizationManager.createAgentDashboard(
      { metrics: [], episodeData: { states: [], actions: [] } }, // This would be populated with actual data
      options
    );
  }
  
  /**
   * Create a multi-agent dashboard for the experiment
   * @param options Dashboard options
   * @returns Dashboard component or null if visualization is disabled
   */
  public createMultiAgentDashboard(options: any = {}): React.ReactNode | null {
    if (!this.visualizationManager || !this.agentManager || !this.multiAgentEnvironment) {
      return null;
    }
    
    // This would be implemented in the visualization system
    // For now, return null as a placeholder
    return null;
  }
}

export default MultiAgentExperimentRunner;
