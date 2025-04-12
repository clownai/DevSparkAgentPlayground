/**
 * Environment hooks for visualization data collection
 * 
 * This module provides hooks for collecting visualization data from environments
 * during training and evaluation.
 */

import DataCollector, { MetricType } from './DataCollector';
import logger from './logger';
import { Logger } from '../types/core';

/**
 * Configuration for environment visualization hooks
 */
export interface EnvironmentVisualizationConfig {
  enabled: boolean;
  collectStateInfo: boolean;
  collectRewardInfo: boolean;
  collectRenderFrames: boolean;
  renderFrequency: number;
  maxFramesPerEpisode: number;
  renderQuality: number; // 0-100 for image quality
}

/**
 * Environment visualization hooks class
 * 
 * Attaches to environments to collect visualization data during training and evaluation
 */
export class EnvironmentVisualizationHooks {
  private config: EnvironmentVisualizationConfig;
  private dataCollector: DataCollector;
  private logger: Logger;
  private environment: any;
  private stepCounter: number = 0;
  private frameCounter: number = 0;
  private episodeFrameCounter: number = 0;
  
  /**
   * Create new environment visualization hooks
   * @param {any} environment - Environment to hook into
   * @param {DataCollector} dataCollector - Data collector instance
   * @param {EnvironmentVisualizationConfig} config - Configuration options
   */
  constructor(
    environment: any,
    dataCollector: DataCollector,
    config: Partial<EnvironmentVisualizationConfig> = {}
  ) {
    this.environment = environment;
    this.dataCollector = dataCollector;
    this.config = {
      enabled: true,
      collectStateInfo: true,
      collectRewardInfo: true,
      collectRenderFrames: true,
      renderFrequency: 5,     // Render every 5 steps
      maxFramesPerEpisode: 100, // Maximum frames to collect per episode
      renderQuality: 80,      // Image quality (0-100)
      ...config
    };
    
    this.logger = logger.createChildLogger({
      component: 'EnvironmentVisualizationHooks',
      environmentType: environment.constructor.name
    });
    
    this._initialize();
  }
  
  /**
   * Initialize hooks
   * @private
   */
  private _initialize(): void {
    if (!this.config.enabled) {
      this.logger.info('Environment visualization hooks are disabled');
      return;
    }
    
    // Monkey patch environment methods to collect data
    this._patchEnvironmentMethods();
    
    this.logger.info('Environment visualization hooks initialized');
  }
  
  /**
   * Patch environment methods to collect visualization data
   * @private
   */
  private _patchEnvironmentMethods(): void {
    // Store original methods
    const originalStep = this.environment.step;
    const originalReset = this.environment.reset;
    
    // Patch step method
    this.environment.step = (action: any) => {
      // Call original method
      const result = originalStep.call(this.environment, action);
      
      // Collect data
      this.stepCounter++;
      
      // Extract state, reward, done from result
      // Note: Different environments might have different result formats
      let state, reward, done;
      
      if (Array.isArray(result)) {
        [state, reward, done] = result;
      } else {
        state = result.nextState || result.observation || result.state;
        reward = result.reward;
        done = result.done || result.terminal;
      }
      
      // Collect state information
      if (this.config.collectStateInfo) {
        this._collectStateInfo(state);
      }
      
      // Collect reward information
      if (this.config.collectRewardInfo) {
        this._collectRewardInfo(reward);
      }
      
      // Collect render frames
      if (this.config.collectRenderFrames && 
          this.stepCounter % this.config.renderFrequency === 0 &&
          this.episodeFrameCounter < this.config.maxFramesPerEpisode) {
        this._collectRenderFrame();
        this.episodeFrameCounter++;
      }
      
      // Handle episode end
      if (done) {
        this.episodeFrameCounter = 0;
      }
      
      return result;
    };
    
    // Patch reset method
    this.environment.reset = () => {
      // Call original method
      const state = originalReset.call(this.environment);
      
      // Reset counters
      this.episodeFrameCounter = 0;
      
      // Collect initial state
      if (this.config.collectStateInfo) {
        this._collectStateInfo(state);
      }
      
      // Collect initial render frame
      if (this.config.collectRenderFrames) {
        this._collectRenderFrame();
        this.episodeFrameCounter++;
      }
      
      return state;
    };
  }
  
  /**
   * Collect state information
   * @param {any} state - Environment state
   * @private
   */
  private _collectStateInfo(state: any): void {
    try {
      // Record the state
      this.dataCollector.recordState(state);
      
      // If state is an array or object with numerical values, collect statistics
      if (this._isNumericalData(state)) {
        const stateArray = this._flattenState(state);
        
        // Compute statistics
        const mean = this._calculateMean(stateArray);
        const variance = this._calculateVariance(stateArray, mean);
        const max = Math.max(...stateArray);
        const min = Math.min(...stateArray);
        
        // Collect metrics
        this.dataCollector.collectMetric(
          'environment/state_mean',
          mean,
          MetricType.SCALAR
        );
        
        this.dataCollector.collectMetric(
          'environment/state_variance',
          variance,
          MetricType.SCALAR
        );
        
        this.dataCollector.collectMetric(
          'environment/state_max',
          max,
          MetricType.SCALAR
        );
        
        this.dataCollector.collectMetric(
          'environment/state_min',
          min,
          MetricType.SCALAR
        );
      }
    } catch (error) {
      this.logger.error('Error collecting state information', error);
    }
  }
  
  /**
   * Collect reward information
   * @param {number} reward - Reward value
   * @private
   */
  private _collectRewardInfo(reward: number): void {
    try {
      // Collect reward metric
      this.dataCollector.collectMetric(
        'environment/reward',
        reward,
        MetricType.SCALAR
      );
    } catch (error) {
      this.logger.error('Error collecting reward information', error);
    }
  }
  
  /**
   * Collect render frame
   * @private
   */
  private _collectRenderFrame(): void {
    try {
      // Check if environment has render method
      if (!this.environment.render) {
        return;
      }
      
      // Render the environment
      // Note: Different environments might have different render methods
      let frame;
      
      try {
        // Try rgb_array mode first
        frame = this.environment.render('rgb_array');
      } catch (e) {
        try {
          // Try human mode as fallback
          frame = this.environment.render('human');
        } catch (e2) {
          // If both fail, try without mode
          frame = this.environment.render();
        }
      }
      
      // If frame is available, collect it
      if (frame) {
        this.frameCounter++;
        
        // Store frame metadata
        const metadata = {
          frameNumber: this.frameCounter,
          episodeFrameNumber: this.episodeFrameCounter,
          step: this.stepCounter,
          quality: this.config.renderQuality
        };
        
        // Collect frame as image metric
        this.dataCollector.collectMetric(
          'environment/frame',
          frame,
          MetricType.IMAGE,
          metadata
        );
      }
    } catch (error) {
      this.logger.error('Error collecting render frame', error);
    }
  }
  
  /**
   * Check if data is numerical (array or object with numerical values)
   * @param {any} data - Data to check
   * @returns {boolean} - True if data is numerical
   * @private
   */
  private _isNumericalData(data: any): boolean {
    if (typeof data === 'number') {
      return true;
    }
    
    if (Array.isArray(data)) {
      return data.every(item => 
        typeof item === 'number' || this._isNumericalData(item)
      );
    }
    
    if (data instanceof Float32Array || data instanceof Float64Array) {
      return true;
    }
    
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).every(value => 
        typeof value === 'number' || this._isNumericalData(value)
      );
    }
    
    return false;
  }
  
  /**
   * Flatten state into array of numbers
   * @param {any} state - State to flatten
   * @returns {number[]} - Flattened state
   * @private
   */
  private _flattenState(state: any): number[] {
    if (typeof state === 'number') {
      return [state];
    }
    
    if (Array.isArray(state)) {
      return state.flatMap(item => this._flattenState(item));
    }
    
    if (state instanceof Float32Array || state instanceof Float64Array) {
      return Array.from(state);
    }
    
    if (typeof state === 'object' && state !== null) {
      return Object.values(state).flatMap(value => this._flattenState(value));
    }
    
    return [];
  }
  
  /**
   * Calculate mean of an array
   * @param {number[]} array - Input array
   * @returns {number} - Mean value
   * @private
   */
  private _calculateMean(array: number[]): number {
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }
  
  /**
   * Calculate variance of an array
   * @param {number[]} array - Input array
   * @param {number} mean - Mean value
   * @returns {number} - Variance
   * @private
   */
  private _calculateVariance(array: number[], mean: number): number {
    return array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    // Nothing to clean up currently
    this.logger.info('Environment visualization hooks cleaned up');
  }
}

export default EnvironmentVisualizationHooks;
