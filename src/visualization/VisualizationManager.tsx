/**
 * Visualization Manager for integrating visualization components with experiments
 * 
 * This module provides a central manager for integrating visualization components
 * with the experiment system.
 */

import React from 'react';
import DataCollector from '../utils/DataCollector';
import AgentVisualizationHooks from '../utils/AgentVisualizationHooks';
import EnvironmentVisualizationHooks from '../utils/EnvironmentVisualizationHooks';
import ExperimentVisualizationHooks from '../utils/ExperimentVisualizationHooks';
import MetricsCharts from './components/MetricsCharts';
import SimulationViewers from './components/SimulationViewers';
import Dashboards from './components/Dashboards';
import logger from '../utils/logger';
import { Logger } from '../types/core';

/**
 * Configuration for the visualization manager
 */
export interface VisualizationManagerConfig {
  enabled: boolean;
  dataCollectionConfig?: {
    storageDirectory?: string;
    maxBufferSize?: number;
    flushInterval?: number;
    stateSubsampling?: number;
  };
  agentVisualizationConfig?: {
    collectPolicyInfo?: boolean;
    collectValueInfo?: boolean;
    collectGradients?: boolean;
    collectWeights?: boolean;
    collectFrequency?: number;
  };
  environmentVisualizationConfig?: {
    collectStateInfo?: boolean;
    collectRewardInfo?: boolean;
    collectRenderFrames?: boolean;
    renderFrequency?: number;
    maxFramesPerEpisode?: number;
  };
  experimentVisualizationConfig?: {
    collectExperimentMetrics?: boolean;
    collectComparisonData?: boolean;
    collectCheckpoints?: boolean;
    checkpointFrequency?: number;
  };
}

/**
 * Visualization Manager class
 * 
 * Manages visualization components and integrates them with experiments
 */
export class VisualizationManager {
  private config: VisualizationManagerConfig;
  private logger: Logger;
  private dataCollector: DataCollector | null = null;
  private agentHooks: AgentVisualizationHooks | null = null;
  private environmentHooks: EnvironmentVisualizationHooks | null = null;
  private experimentHooks: ExperimentVisualizationHooks | null = null;
  private experimentId: string = '';
  private visualizationData: {
    metrics: any[];
    states: any[];
    actions: any[];
    episodes: any[];
  } = {
    metrics: [],
    states: [],
    actions: [],
    episodes: []
  };
  
  /**
   * Create a new VisualizationManager
   * @param {VisualizationManagerConfig} config - Configuration options
   */
  constructor(config: Partial<VisualizationManagerConfig> = {}) {
    this.config = {
      enabled: true,
      ...config
    };
    
    this.logger = logger.createChildLogger({
      component: 'VisualizationManager'
    });
  }
  
  /**
   * Initialize the visualization manager for an experiment
   * @param {string} experimentId - Unique experiment identifier
   * @returns {boolean} - Success status
   */
  initialize(experimentId: string): boolean {
    if (!this.config.enabled) {
      this.logger.info('Visualization manager is disabled');
      return false;
    }
    
    try {
      this.experimentId = experimentId;
      
      // Initialize data collector
      this.dataCollector = new DataCollector(experimentId, {
        enabled: true,
        storageDirectory: this.config.dataCollectionConfig?.storageDirectory || './data',
        maxBufferSize: this.config.dataCollectionConfig?.maxBufferSize || 1000,
        flushInterval: this.config.dataCollectionConfig?.flushInterval || 10000,
        stateSubsampling: this.config.dataCollectionConfig?.stateSubsampling || 1,
        collectMetrics: true,
        collectStates: true,
        collectActions: true,
        collectEpisodes: true
      });
      
      // Initialize experiment hooks
      this.experimentHooks = new ExperimentVisualizationHooks(
        experimentId,
        this.dataCollector,
        {
          enabled: true,
          collectExperimentMetrics: this.config.experimentVisualizationConfig?.collectExperimentMetrics !== false,
          collectComparisonData: this.config.experimentVisualizationConfig?.collectComparisonData !== false,
          collectCheckpoints: this.config.experimentVisualizationConfig?.collectCheckpoints !== false,
          checkpointFrequency: this.config.experimentVisualizationConfig?.checkpointFrequency || 10000
        }
      );
      
      this.logger.info(`Visualization manager initialized for experiment ${experimentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize visualization manager: ${(error as Error).message}`, error);
      return false;
    }
  }
  
  /**
   * Register an agent for visualization
   * @param {any} agent - Agent to register
   * @returns {boolean} - Success status
   */
  registerAgent(agent: any): boolean {
    if (!this.config.enabled || !this.dataCollector) {
      return false;
    }
    
    try {
      this.agentHooks = new AgentVisualizationHooks(
        agent,
        this.dataCollector,
        {
          enabled: true,
          collectPolicyInfo: this.config.agentVisualizationConfig?.collectPolicyInfo !== false,
          collectValueInfo: this.config.agentVisualizationConfig?.collectValueInfo !== false,
          collectGradients: this.config.agentVisualizationConfig?.collectGradients || false,
          collectWeights: this.config.agentVisualizationConfig?.collectWeights || false,
          collectFrequency: this.config.agentVisualizationConfig?.collectFrequency || 10
        }
      );
      
      if (this.experimentHooks) {
        this.experimentHooks.registerAgent(agent);
      }
      
      this.logger.info(`Registered agent for visualization: ${agent.constructor.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to register agent: ${(error as Error).message}`, error);
      return false;
    }
  }
  
  /**
   * Register an environment for visualization
   * @param {any} environment - Environment to register
   * @returns {boolean} - Success status
   */
  registerEnvironment(environment: any): boolean {
    if (!this.config.enabled || !this.dataCollector) {
      return false;
    }
    
    try {
      this.environmentHooks = new EnvironmentVisualizationHooks(
        environment,
        this.dataCollector,
        {
          enabled: true,
          collectStateInfo: this.config.environmentVisualizationConfig?.collectStateInfo !== false,
          collectRewardInfo: this.config.environmentVisualizationConfig?.collectRewardInfo !== false,
          collectRenderFrames: this.config.environmentVisualizationConfig?.collectRenderFrames !== false,
          renderFrequency: this.config.environmentVisualizationConfig?.renderFrequency || 5,
          maxFramesPerEpisode: this.config.environmentVisualizationConfig?.maxFramesPerEpisode || 100
        }
      );
      
      if (this.experimentHooks) {
        this.experimentHooks.registerEnvironment(environment);
      }
      
      this.logger.info(`Registered environment for visualization: ${environment.constructor.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to register environment: ${(error as Error).message}`, error);
      return false;
    }
  }
  
  /**
   * Record experiment progress
   * @param {number} step - Current step
   * @param {number} episode - Current episode
   * @param {Record<string, any>} metrics - Current metrics
   */
  recordProgress(
    step: number,
    episode: number,
    metrics: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.experimentHooks) {
      return;
    }
    
    this.experimentHooks.recordExperimentProgress(step, episode, metrics);
  }
  
  /**
   * Record experiment end
   * @param {boolean} success - Whether experiment completed successfully
   * @param {Record<string, any>} finalMetrics - Final metrics
   */
  recordEnd(
    success: boolean,
    finalMetrics: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.experimentHooks) {
      return;
    }
    
    this.experimentHooks.recordExperimentEnd(success, finalMetrics);
  }
  
  /**
   * Load visualization data from storage
   * @param {string} experimentId - Experiment ID to load data for
   * @returns {Promise<boolean>} - Success status
   */
  async loadVisualizationData(experimentId: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }
    
    try {
      // In a real implementation, this would load data from storage
      // For now, we'll just use the data we've collected
      this.logger.info(`Loading visualization data for experiment ${experimentId}`);
      
      // This would be replaced with actual data loading
      this.visualizationData = {
        metrics: [],
        states: [],
        actions: [],
        episodes: []
      };
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to load visualization data: ${(error as Error).message}`, error);
      return false;
    }
  }
  
  /**
   * Create a metrics dashboard component
   * @param {any} data - Metrics data
   * @param {object} options - Dashboard options
   * @returns {React.ReactNode} - Dashboard component
   */
  createMetricsDashboard(
    data: any,
    options: {
      width?: number;
      height?: number;
      layout?: any;
    } = {}
  ): React.ReactNode {
    return (
      <Dashboards.MetricsDashboard
        metrics={data.metrics || this.visualizationData.metrics}
        width={options.width || 1200}
        height={options.height || 800}
        layout={options.layout}
      />
    );
  }
  
  /**
   * Create an agent dashboard component
   * @param {any} data - Agent data
   * @param {object} options - Dashboard options
   * @returns {React.ReactNode} - Dashboard component
   */
  createAgentDashboard(
    data: any,
    options: {
      width?: number;
      height?: number;
      layout?: any;
      renderState?: (state: any, action?: any) => React.ReactNode;
    } = {}
  ): React.ReactNode {
    return (
      <Dashboards.AgentDashboard
        metrics={data.metrics || this.visualizationData.metrics}
        episodeData={data.episodeData || {
          states: this.visualizationData.states,
          actions: this.visualizationData.actions
        }}
        width={options.width || 1200}
        height={options.height || 800}
        renderState={options.renderState || ((state) => <div>No renderer provided</div>)}
        layout={options.layout}
      />
    );
  }
  
  /**
   * Create an experiment dashboard component
   * @param {any[]} experiments - Experiment data
   * @param {object} options - Dashboard options
   * @returns {React.ReactNode} - Dashboard component
   */
  createExperimentDashboard(
    experiments: any[],
    options: {
      width?: number;
      height?: number;
      layout?: any;
    } = {}
  ): React.ReactNode {
    return (
      <Dashboards.ExperimentDashboard
        experiments={experiments}
        width={options.width || 1200}
        height={options.height || 800}
        layout={options.layout}
      />
    );
  }
  
  /**
   * Create a custom dashboard component
   * @param {string} title - Dashboard title
   * @param {any} data - Dashboard data
   * @param {object} options - Dashboard options
   * @returns {React.ReactNode} - Dashboard component
   */
  createCustomDashboard(
    title: string,
    data: any,
    options: {
      width?: number;
      height?: number;
      layout?: any;
      components?: Record<string, React.ComponentType<any>>;
    } = {}
  ): React.ReactNode {
    // Default components include all our visualization components
    const defaultComponents = {
      'line-chart': MetricsCharts.LineChart,
      'bar-chart': MetricsCharts.BarChart,
      'heat-map': MetricsCharts.HeatMap,
      'scatter-plot': MetricsCharts.ScatterPlot,
      'grid-world-viewer': SimulationViewers.GridWorldViewer,
      'continuous-space-viewer': SimulationViewers.ContinuousSpaceViewer,
      'episode-player': SimulationViewers.EpisodePlayer,
      'comparison-viewer': SimulationViewers.ComparisonViewer
    };
    
    return (
      <Dashboards.CustomDashboard
        title={title}
        data={data}
        width={options.width || 1200}
        height={options.height || 800}
        layout={options.layout || { columns: 2, rows: 2, panels: [] }}
        components={{ ...defaultComponents, ...options.components }}
      />
    );
  }
  
  /**
   * Create a line chart component
   * @param {any[]} data - Metrics data
   * @param {object} options - Chart options
   * @returns {React.ReactNode} - Chart component
   */
  createLineChart(
    data: any[],
    options: {
      width?: number;
      height?: number;
      title?: string;
      xAxis?: string;
      yAxis?: string;
      color?: string;
      smoothing?: number;
    } = {}
  ): React.ReactNode {
    return (
      <MetricsCharts.LineChart
        data={data}
        width={options.width || 600}
        height={options.height || 400}
        title={options.title || 'Metric Over Time'}
        xAxis={options.xAxis || 'Step'}
        yAxis={options.yAxis || 'Value'}
        color={options.color || 'steelblue'}
        smoothing={options.smoothing || 0}
      />
    );
  }
  
  /**
   * Create a bar chart component
   * @param {any[]} data - Metrics data
   * @param {object} options - Chart options
   * @returns {React.ReactNode} - Chart component
   */
  createBarChart(
    data: any[],
    options: {
      width?: number;
      height?: number;
      title?: string;
      xAxis?: string;
      yAxis?: string;
      color?: string;
    } = {}
  ): React.ReactNode {
    return (
      <MetricsCharts.BarChart
        data={data}
        width={options.width || 600}
        height={options.height || 400}
        title={options.title || 'Bar Chart'}
        xAxis={options.xAxis || 'Category'}
        yAxis={options.yAxis || 'Value'}
        color={options.color || 'steelblue'}
      />
    );
  }
  
  /**
   * Create a grid world viewer component
   * @param {any} state - Environment state
   * @param {object} options - Viewer options
   * @returns {React.ReactNode} - Viewer component
   */
  createGridWorldViewer(
    state: any,
    options: {
      width?: number;
      height?: number;
      cellSize?: number;
      colors?: Record<string, string>;
      agentPosition?: { x: number; y: number };
      goalPosition?: { x: number; y: number };
      obstacles?: Array<{ x: number; y: number }>;
    } = {}
  ): React.ReactNode {
    return (
      <SimulationViewers.GridWorldViewer
        state={state}
        width={options.width || 400}
        height={options.height || 400}
        cellSize={options.cellSize}
        colors={options.colors}
        agentPosition={options.agentPosition}
        goalPosition={options.goalPosition}
        obstacles={options.obstacles}
      />
    );
  }
  
  /**
   * Create a continuous space viewer component
   * @param {any} state - Environment state
   * @param {object} options - Viewer options
   * @returns {React.ReactNode} - Viewer component
   */
  createContinuousSpaceViewer(
    state: any,
    options: {
      width?: number;
      height?: number;
      xDomain?: [number, number];
      yDomain?: [number, number];
      agentPosition?: { x: number; y: number };
      goalPosition?: { x: number; y: number };
      obstacles?: Array<{ x: number; y: number; radius: number }>;
    } = {}
  ): React.ReactNode {
    return (
      <SimulationViewers.ContinuousSpaceViewer
        state={state}
        width={options.width || 400}
        height={options.height || 400}
        xDomain={options.xDomain || [-1, 1]}
        yDomain={options.yDomain || [-1, 1]}
        agentPosition={options.agentPosition}
        goalPosition={options.goalPosition}
        obstacles={options.obstacles}
      />
    );
  }
  
  /**
   * Create an episode player component
   * @param {any} episodeData - Episode data
   * @param {object} options - Player options
   * @returns {React.ReactNode} - Player component
   */
  createEpisodePlayer(
    episodeData: {
      states: any[];
      actions: any[];
    },
    options: {
      width?: number;
      height?: number;
      renderState: (state: any, action?: any) => React.ReactNode;
      autoPlay?: boolean;
      speed?: number;
    }
  ): React.ReactNode {
    return (
      <SimulationViewers.EpisodePlayer
        episodeData={episodeData}
        width={options.width || 600}
        height={options.height || 400}
        renderState={options.renderState}
        autoPlay={options.autoPlay || false}
        speed={options.speed || 1}
      />
    );
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
    
    if (this.experimentHooks) {
      this.experimentHooks.cleanup();
    }
    
    if (this.dataCollector) {
      this.dataCollector.cleanup();
    }
    
    this.logger.info('Visualization manager cleaned up');
  }
}

export default VisualizationManager;
