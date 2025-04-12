/**
 * Data collection system for visualizations
 * 
 * This module provides utilities for collecting, processing, and storing
 * data from agents, environments, and experiments for visualization purposes.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import { Logger } from '../types/core';

/**
 * Types of metrics that can be collected
 */
export enum MetricType {
  SCALAR = 'scalar',
  VECTOR = 'vector',
  HISTOGRAM = 'histogram',
  IMAGE = 'image'
}

/**
 * Metric data point interface
 */
export interface MetricDataPoint {
  name: string;
  value: number | number[] | Record<string, number>;
  type: MetricType;
  timestamp: number;
  step: number;
  episode?: number;
  metadata?: Record<string, any>;
}

/**
 * State recording interface
 */
export interface StateRecord {
  state: any;
  timestamp: number;
  step: number;
  episode: number;
  metadata?: Record<string, any>;
}

/**
 * Action recording interface
 */
export interface ActionRecord {
  action: any;
  timestamp: number;
  step: number;
  episode: number;
  metadata?: Record<string, any>;
}

/**
 * Episode recording interface
 */
export interface EpisodeRecord {
  episode: number;
  startTimestamp: number;
  endTimestamp: number;
  totalSteps: number;
  totalReward: number;
  states: StateRecord[];
  actions: ActionRecord[];
  metadata?: Record<string, any>;
}

/**
 * Configuration for the data collector
 */
export interface DataCollectorConfig {
  enabled: boolean;
  storageDirectory?: string;
  maxBufferSize?: number;
  flushInterval?: number;
  collectMetrics?: boolean;
  collectStates?: boolean;
  collectActions?: boolean;
  collectEpisodes?: boolean;
  stateSubsampling?: number;
  compressData?: boolean;
}

/**
 * Main data collector class
 */
export class DataCollector {
  private config: DataCollectorConfig;
  private logger: Logger;
  private metricsBuffer: MetricDataPoint[] = [];
  private statesBuffer: StateRecord[] = [];
  private actionsBuffer: StateRecord[] = [];
  private episodes: EpisodeRecord[] = [];
  private currentEpisode: EpisodeRecord | null = null;
  private stepCounter: number = 0;
  private episodeCounter: number = 0;
  private flushIntervalId: NodeJS.Timeout | null = null;
  private experimentId: string;
  private storageDirectory: string;

  /**
   * Create a new DataCollector
   * @param {string} experimentId - Unique identifier for the experiment
   * @param {DataCollectorConfig} config - Configuration options
   */
  constructor(experimentId: string, config: DataCollectorConfig) {
    this.experimentId = experimentId;
    this.config = {
      enabled: true,
      storageDirectory: './data',
      maxBufferSize: 1000,
      flushInterval: 10000, // 10 seconds
      collectMetrics: true,
      collectStates: true,
      collectActions: true,
      collectEpisodes: true,
      stateSubsampling: 1, // collect every state
      compressData: false,
      ...config
    };
    
    this.logger = logger.createChildLogger({ 
      component: 'DataCollector',
      experimentId
    });
    
    this.storageDirectory = path.join(
      this.config.storageDirectory!,
      'experiments',
      experimentId
    );
    
    this._initialize();
  }
  
  /**
   * Initialize the data collector
   * @private
   */
  private _initialize(): void {
    if (!this.config.enabled) {
      this.logger.info('Data collector is disabled');
      return;
    }
    
    // Create storage directory if it doesn't exist
    if (!fs.existsSync(this.storageDirectory)) {
      fs.mkdirSync(this.storageDirectory, { recursive: true });
    }
    
    // Set up automatic flushing
    if (this.config.flushInterval && this.config.flushInterval > 0) {
      this.flushIntervalId = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
    
    this.logger.info(`Data collector initialized for experiment ${this.experimentId}`);
  }
  
  /**
   * Collect a metric data point
   * @param {string} name - Metric name
   * @param {number | number[] | Record<string, number>} value - Metric value
   * @param {MetricType} type - Type of metric
   * @param {Record<string, any>} metadata - Additional metadata
   */
  collectMetric(
    name: string,
    value: number | number[] | Record<string, number>,
    type: MetricType = MetricType.SCALAR,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled || !this.config.collectMetrics) {
      return;
    }
    
    const dataPoint: MetricDataPoint = {
      name,
      value,
      type,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata
    };
    
    this.metricsBuffer.push(dataPoint);
    
    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.config.maxBufferSize!) {
      this.flushMetrics();
    }
  }
  
  /**
   * Record an environment state
   * @param {any} state - Environment state
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordState(state: any, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.collectStates) {
      return;
    }
    
    // Apply subsampling if configured
    if (this.config.stateSubsampling! > 1 && 
        this.stepCounter % this.config.stateSubsampling! !== 0) {
      return;
    }
    
    const stateRecord: StateRecord = {
      state,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata
    };
    
    this.statesBuffer.push(stateRecord);
    
    // Add to current episode if tracking episodes
    if (this.currentEpisode && this.config.collectEpisodes) {
      this.currentEpisode.states.push(stateRecord);
    }
    
    // Auto-flush if buffer is full
    if (this.statesBuffer.length >= this.config.maxBufferSize!) {
      this.flushStates();
    }
  }
  
  /**
   * Record an agent action
   * @param {any} action - Agent action
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordAction(action: any, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.collectActions) {
      return;
    }
    
    const actionRecord: ActionRecord = {
      action,
      timestamp: Date.now(),
      step: this.stepCounter,
      episode: this.episodeCounter,
      metadata
    };
    
    this.actionsBuffer.push(actionRecord);
    
    // Add to current episode if tracking episodes
    if (this.currentEpisode && this.config.collectEpisodes) {
      this.currentEpisode.actions.push(actionRecord);
    }
    
    // Auto-flush if buffer is full
    if (this.actionsBuffer.length >= this.config.maxBufferSize!) {
      this.flushActions();
    }
  }
  
  /**
   * Start a new episode
   * @param {Record<string, any>} metadata - Additional metadata
   */
  startEpisode(metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.collectEpisodes) {
      return;
    }
    
    // End current episode if one is in progress
    if (this.currentEpisode) {
      this.endEpisode();
    }
    
    this.episodeCounter++;
    
    this.currentEpisode = {
      episode: this.episodeCounter,
      startTimestamp: Date.now(),
      endTimestamp: 0,
      totalSteps: 0,
      totalReward: 0,
      states: [],
      actions: [],
      metadata
    };
    
    this.logger.debug(`Started episode ${this.episodeCounter}`);
  }
  
  /**
   * End the current episode
   * @param {number} totalReward - Total reward for the episode
   * @param {Record<string, any>} metadata - Additional metadata
   */
  endEpisode(totalReward?: number, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.collectEpisodes || !this.currentEpisode) {
      return;
    }
    
    this.currentEpisode.endTimestamp = Date.now();
    this.currentEpisode.totalSteps = this.stepCounter - this.currentEpisode.totalSteps;
    
    if (totalReward !== undefined) {
      this.currentEpisode.totalReward = totalReward;
    }
    
    if (metadata) {
      this.currentEpisode.metadata = {
        ...this.currentEpisode.metadata,
        ...metadata
      };
    }
    
    this.episodes.push(this.currentEpisode);
    this.currentEpisode = null;
    
    this.logger.debug(`Ended episode ${this.episodeCounter} with reward ${totalReward}`);
    
    // Save episode data
    this._saveEpisode(this.episodeCounter);
  }
  
  /**
   * Increment the step counter
   * @param {number} steps - Number of steps to increment (default: 1)
   */
  incrementStep(steps: number = 1): void {
    this.stepCounter += steps;
  }
  
  /**
   * Flush all data to storage
   */
  flush(): void {
    this.flushMetrics();
    this.flushStates();
    this.flushActions();
  }
  
  /**
   * Flush metrics data to storage
   */
  flushMetrics(): void {
    if (!this.config.enabled || this.metricsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `metrics_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.metricsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.metricsBuffer.length} metrics to ${filePath}`);
      this.metricsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush metrics', error);
    }
  }
  
  /**
   * Flush states data to storage
   */
  flushStates(): void {
    if (!this.config.enabled || this.statesBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `states_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.statesBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.statesBuffer.length} states to ${filePath}`);
      this.statesBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush states', error);
    }
  }
  
  /**
   * Flush actions data to storage
   */
  flushActions(): void {
    if (!this.config.enabled || this.actionsBuffer.length === 0) {
      return;
    }
    
    try {
      const filePath = path.join(
        this.storageDirectory,
        `actions_${Date.now()}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.actionsBuffer),
        'utf8'
      );
      
      this.logger.debug(`Flushed ${this.actionsBuffer.length} actions to ${filePath}`);
      this.actionsBuffer = [];
    } catch (error) {
      this.logger.error('Failed to flush actions', error);
    }
  }
  
  /**
   * Save episode data to storage
   * @param {number} episodeNumber - Episode number
   * @private
   */
  private _saveEpisode(episodeNumber: number): void {
    if (!this.config.enabled || !this.config.collectEpisodes) {
      return;
    }
    
    try {
      const episode = this.episodes.find(ep => ep.episode === episodeNumber);
      
      if (!episode) {
        return;
      }
      
      const filePath = path.join(
        this.storageDirectory,
        `episode_${episodeNumber}.json`
      );
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(episode),
        'utf8'
      );
      
      this.logger.debug(`Saved episode ${episodeNumber} to ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save episode ${episodeNumber}`, error);
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    
    // Flush any remaining data
    this.flush();
    
    // End current episode if one is in progress
    if (this.currentEpisode) {
      this.endEpisode();
    }
    
    this.logger.info('Data collector cleaned up');
  }
}

export default DataCollector;
