/**
 * Integration of visualization system with experiment runner
 * 
 * This module extends the ExperimentRunner to integrate visualization capabilities.
 */

import ExperimentRunner from '../utils/ExperimentRunner';
import VisualizationManager from '../visualization/VisualizationManager';
import logger from '../utils/logger';
import { Logger } from '../types/core';

/**
 * Configuration for visualization-enabled experiment runner
 */
export interface VisualizedExperimentRunnerConfig {
  experimentId: string;
  agentConfig: any;
  environmentConfig: any;
  visualizationConfig?: {
    enabled: boolean;
    dataCollection?: {
      storageDirectory?: string;
      maxBufferSize?: number;
      flushInterval?: number;
      stateSubsampling?: number;
    };
    agentVisualization?: {
      collectPolicyInfo?: boolean;
      collectValueInfo?: boolean;
      collectGradients?: boolean;
      collectWeights?: boolean;
      collectFrequency?: number;
    };
    environmentVisualization?: {
      collectStateInfo?: boolean;
      collectRewardInfo?: boolean;
      collectRenderFrames?: boolean;
      renderFrequency?: number;
      maxFramesPerEpisode?: number;
    };
    experimentVisualization?: {
      collectExperimentMetrics?: boolean;
      collectComparisonData?: boolean;
      collectCheckpoints?: boolean;
      checkpointFrequency?: number;
    };
  };
  maxSteps: number;
  maxEpisodes: number;
  evaluationFrequency?: number;
  checkpointFrequency?: number;
  logFrequency?: number;
}

/**
 * Experiment runner with integrated visualization capabilities
 */
export class VisualizedExperimentRunner extends ExperimentRunner {
  private visualizationManager: VisualizationManager | null = null;
  private visualizationConfig: any;
  private logger: Logger;
  
  /**
   * Create a new visualized experiment runner
   * @param {VisualizedExperimentRunnerConfig} config - Configuration options
   */
  constructor(config: VisualizedExperimentRunnerConfig) {
    super(config);
    
    this.visualizationConfig = config.visualizationConfig || { enabled: false };
    
    this.logger = logger.createChildLogger({
      component: 'VisualizedExperimentRunner',
      experimentId: config.experimentId
    });
    
    // Initialize visualization manager if enabled
    if (this.visualizationConfig.enabled) {
      this.initializeVisualization(config.experimentId);
    }
  }
  
  /**
   * Initialize visualization system
   * @param {string} experimentId - Experiment identifier
   * @private
   */
  private initializeVisualization(experimentId: string): void {
    try {
      this.visualizationManager = new VisualizationManager({
        enabled: true,
        dataCollectionConfig: this.visualizationConfig.dataCollection,
        agentVisualizationConfig: this.visualizationConfig.agentVisualization,
        environmentVisualizationConfig: this.visualizationConfig.environmentVisualization,
        experimentVisualizationConfig: this.visualizationConfig.experimentVisualization
      });
      
      const success = this.visualizationManager.initialize(experimentId);
      
      if (success) {
        this.logger.info('Visualization system initialized successfully');
      } else {
        this.logger.warn('Failed to initialize visualization system');
        this.visualizationManager = null;
      }
    } catch (error) {
      this.logger.error(`Error initializing visualization system: ${(error as Error).message}`, error);
      this.visualizationManager = null;
    }
  }
  
  /**
   * Override setup method to register agent and environment with visualization
   * @returns {Promise<boolean>} - Success status
   */
  async setup(): Promise<boolean> {
    // Call parent setup method
    const success = await super.setup();
    
    if (!success) {
      return false;
    }
    
    // Register agent and environment with visualization manager
    if (this.visualizationManager && this.agent && this.environment) {
      this.visualizationManager.registerAgent(this.agent);
      this.visualizationManager.registerEnvironment(this.environment);
      this.logger.info('Registered agent and environment with visualization system');
    }
    
    return true;
  }
  
  /**
   * Override step method to record progress in visualization
   * @returns {Promise<boolean>} - Success status
   */
  async step(): Promise<boolean> {
    // Call parent step method
    const success = await super.step();
    
    // Record progress in visualization manager
    if (this.visualizationManager) {
      this.visualizationManager.recordProgress(
        this.currentStep,
        this.currentEpisode,
        {
          reward: this.lastReward,
          episodeReward: this.episodeReward,
          averageReward: this.getAverageReward()
        }
      );
    }
    
    return success;
  }
  
  /**
   * Override run method to record experiment end in visualization
   * @returns {Promise<boolean>} - Success status
   */
  async run(): Promise<boolean> {
    // Call parent run method
    const success = await super.run();
    
    // Record experiment end in visualization manager
    if (this.visualizationManager) {
      this.visualizationManager.recordEnd(
        success,
        {
          totalSteps: this.currentStep,
          totalEpisodes: this.currentEpisode,
          finalAverageReward: this.getAverageReward(),
          trainingTime: this.getTrainingTime()
        }
      );
    }
    
    return success;
  }
  
  /**
   * Get visualization manager
   * @returns {VisualizationManager | null} - Visualization manager instance
   */
  getVisualizationManager(): VisualizationManager | null {
    return this.visualizationManager;
  }
  
  /**
   * Create a metrics dashboard for the experiment
   * @param {object} options - Dashboard options
   * @returns {React.ReactNode | null} - Dashboard component or null if visualization is disabled
   */
  createMetricsDashboard(options: any = {}): React.ReactNode | null {
    if (!this.visualizationManager) {
      return null;
    }
    
    return this.visualizationManager.createMetricsDashboard(
      { metrics: [] }, // This would be populated with actual metrics in a real implementation
      options
    );
  }
  
  /**
   * Create an agent dashboard for the experiment
   * @param {object} options - Dashboard options
   * @returns {React.ReactNode | null} - Dashboard component or null if visualization is disabled
   */
  createAgentDashboard(options: any = {}): React.ReactNode | null {
    if (!this.visualizationManager) {
      return null;
    }
    
    return this.visualizationManager.createAgentDashboard(
      { metrics: [], episodeData: { states: [], actions: [] } }, // This would be populated with actual data
      options
    );
  }
  
  /**
   * Override cleanup method to clean up visualization resources
   */
  cleanup(): void {
    // Call parent cleanup method
    super.cleanup();
    
    // Clean up visualization resources
    if (this.visualizationManager) {
      this.visualizationManager.cleanup();
      this.visualizationManager = null;
    }
  }
}

export default VisualizedExperimentRunner;
