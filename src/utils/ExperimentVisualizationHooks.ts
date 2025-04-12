/**
 * Experiment visualization hooks for data collection
 * 
 * This module provides hooks for collecting visualization data from experiments
 * during training and evaluation.
 */

import DataCollector, { MetricType } from './DataCollector';
import AgentVisualizationHooks from './AgentVisualizationHooks';
import EnvironmentVisualizationHooks from './EnvironmentVisualizationHooks';
import logger from './logger';
import { Logger } from '../types/core';

/**
 * Configuration for experiment visualization hooks
 */
export interface ExperimentVisualizationConfig {
  enabled: boolean;
  collectExperimentMetrics: boolean;
  collectComparisonData: boolean;
  collectCheckpoints: boolean;
  checkpointFrequency: number;
  experimentDataDirectory?: string;
}

/**
 * Experiment visualization hooks class
 * 
 * Coordinates data collection from agents and environments during experiments
 */
export class ExperimentVisualizationHooks {
  private config: ExperimentVisualizationConfig;
  private dataCollector: DataCollector;
  private logger: Logger;
  private experimentId: string;
  private agentHooks: AgentVisualizationHooks | null = null;
  private environmentHooks: EnvironmentVisualizationHooks | null = null;
  private startTime: number;
  private checkpointCounter: number = 0;
  
  /**
   * Create new experiment visualization hooks
   * @param {string} experimentId - Unique experiment identifier
   * @param {DataCollector} dataCollector - Data collector instance
   * @param {ExperimentVisualizationConfig} config - Configuration options
   */
  constructor(
    experimentId: string,
    dataCollector: DataCollector,
    config: Partial<ExperimentVisualizationConfig> = {}
  ) {
    this.experimentId = experimentId;
    this.dataCollector = dataCollector;
    this.config = {
      enabled: true,
      collectExperimentMetrics: true,
      collectComparisonData: true,
      collectCheckpoints: true,
      checkpointFrequency: 10000, // Checkpoint every 10000 steps
      experimentDataDirectory: './data/experiments',
      ...config
    };
    
    this.logger = logger.createChildLogger({
      component: 'ExperimentVisualizationHooks',
      experimentId
    });
    
    this.startTime = Date.now();
    
    this._initialize();
  }
  
  /**
   * Initialize hooks
   * @private
   */
  private _initialize(): void {
    if (!this.config.enabled) {
      this.logger.info('Experiment visualization hooks are disabled');
      return;
    }
    
    this.logger.info(`Experiment visualization hooks initialized for experiment ${this.experimentId}`);
    
    // Record experiment start
    this._recordExperimentStart();
  }
  
  /**
   * Register an agent for visualization
   * @param {any} agent - Agent to register
   * @param {Partial<import('./AgentVisualizationHooks').AgentVisualizationConfig>} config - Agent visualization config
   */
  registerAgent(agent: any, config: any = {}): void {
    if (!this.config.enabled) {
      return;
    }
    
    this.agentHooks = new AgentVisualizationHooks(
      agent,
      this.dataCollector,
      config
    );
    
    this.logger.info(`Registered agent for visualization: ${agent.constructor.name}`);
  }
  
  /**
   * Register an environment for visualization
   * @param {any} environment - Environment to register
   * @param {Partial<import('./EnvironmentVisualizationHooks').EnvironmentVisualizationConfig>} config - Environment visualization config
   */
  registerEnvironment(environment: any, config: any = {}): void {
    if (!this.config.enabled) {
      return;
    }
    
    this.environmentHooks = new EnvironmentVisualizationHooks(
      environment,
      this.dataCollector,
      config
    );
    
    this.logger.info(`Registered environment for visualization: ${environment.constructor.name}`);
  }
  
  /**
   * Record experiment start
   * @private
   */
  private _recordExperimentStart(): void {
    if (!this.config.collectExperimentMetrics) {
      return;
    }
    
    // Record experiment metadata
    this.dataCollector.collectMetric(
      'experiment/start_time',
      this.startTime,
      MetricType.SCALAR,
      { experimentId: this.experimentId }
    );
  }
  
  /**
   * Record experiment progress
   * @param {number} step - Current step
   * @param {number} episode - Current episode
   * @param {Record<string, any>} metrics - Current metrics
   */
  recordExperimentProgress(
    step: number,
    episode: number,
    metrics: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.config.collectExperimentMetrics) {
      return;
    }
    
    // Record step and episode
    this.dataCollector.collectMetric(
      'experiment/step',
      step,
      MetricType.SCALAR
    );
    
    this.dataCollector.collectMetric(
      'experiment/episode',
      episode,
      MetricType.SCALAR
    );
    
    // Record elapsed time
    const elapsedTime = Date.now() - this.startTime;
    this.dataCollector.collectMetric(
      'experiment/elapsed_time',
      elapsedTime,
      MetricType.SCALAR
    );
    
    // Record custom metrics
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.dataCollector.collectMetric(
          `experiment/${key}`,
          value,
          MetricType.SCALAR
        );
      }
    });
    
    // Check if checkpoint should be created
    if (this.config.collectCheckpoints && 
        step % this.config.checkpointFrequency === 0) {
      this._recordCheckpoint(step, episode, metrics);
    }
  }
  
  /**
   * Record experiment checkpoint
   * @param {number} step - Current step
   * @param {number} episode - Current episode
   * @param {Record<string, any>} metrics - Current metrics
   * @private
   */
  private _recordCheckpoint(
    step: number,
    episode: number,
    metrics: Record<string, any> = {}
  ): void {
    this.checkpointCounter++;
    
    // Record checkpoint metadata
    this.dataCollector.collectMetric(
      'experiment/checkpoint',
      this.checkpointCounter,
      MetricType.SCALAR,
      {
        step,
        episode,
        timestamp: Date.now(),
        metrics
      }
    );
    
    this.logger.debug(`Recorded checkpoint ${this.checkpointCounter} at step ${step}`);
  }
  
  /**
   * Record experiment end
   * @param {boolean} success - Whether experiment completed successfully
   * @param {Record<string, any>} finalMetrics - Final metrics
   */
  recordExperimentEnd(
    success: boolean,
    finalMetrics: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.config.collectExperimentMetrics) {
      return;
    }
    
    // Record end time and duration
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.dataCollector.collectMetric(
      'experiment/end_time',
      endTime,
      MetricType.SCALAR
    );
    
    this.dataCollector.collectMetric(
      'experiment/duration',
      duration,
      MetricType.SCALAR
    );
    
    this.dataCollector.collectMetric(
      'experiment/success',
      success ? 1 : 0,
      MetricType.SCALAR
    );
    
    // Record final metrics
    Object.entries(finalMetrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.dataCollector.collectMetric(
          `experiment/final_${key}`,
          value,
          MetricType.SCALAR
        );
      }
    });
    
    // Flush all data
    this.dataCollector.flush();
    
    this.logger.info(`Recorded experiment end. Duration: ${duration}ms, Success: ${success}`);
  }
  
  /**
   * Record comparison data between experiments
   * @param {string} otherExperimentId - ID of experiment to compare with
   * @param {Record<string, any>} comparisonData - Comparison data
   */
  recordComparisonData(
    otherExperimentId: string,
    comparisonData: Record<string, any>
  ): void {
    if (!this.config.enabled || !this.config.collectComparisonData) {
      return;
    }
    
    // Record comparison metadata
    this.dataCollector.collectMetric(
      'experiment/comparison',
      1,
      MetricType.SCALAR,
      {
        experimentId: this.experimentId,
        otherExperimentId,
        timestamp: Date.now(),
        comparisonData
      }
    );
    
    this.logger.debug(`Recorded comparison data with experiment ${otherExperimentId}`);
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.agentHooks) {
      this.agentHooks.cleanup();
    }
    
    if (this.environmentHooks) {
      this.environmentHooks.cleanup();
    }
    
    // Flush all data
    this.dataCollector.flush();
    
    this.logger.info('Experiment visualization hooks cleaned up');
  }
}

export default ExperimentVisualizationHooks;
