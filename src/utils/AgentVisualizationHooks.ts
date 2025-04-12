/**
 * Agent hooks for visualization data collection
 * 
 * This module provides hooks for collecting visualization data from agents
 * during training and evaluation.
 */

import * as tf from '@tensorflow/tfjs-node';
import DataCollector, { MetricType } from './DataCollector';
import logger from './logger';
import { Logger } from '../types/core';
import AlgorithmInterface from '../reinforcement/AlgorithmInterface';

/**
 * Configuration for agent visualization hooks
 */
export interface AgentVisualizationConfig {
  enabled: boolean;
  collectPolicyInfo: boolean;
  collectValueInfo: boolean;
  collectGradients: boolean;
  collectWeights: boolean;
  collectFrequency: number;
}

/**
 * Agent visualization hooks class
 * 
 * Attaches to agents to collect visualization data during training and evaluation
 */
export class AgentVisualizationHooks {
  private config: AgentVisualizationConfig;
  private dataCollector: DataCollector;
  private logger: Logger;
  private agent: AlgorithmInterface;
  private stepCounter: number = 0;
  
  /**
   * Create new agent visualization hooks
   * @param {AlgorithmInterface} agent - Agent to hook into
   * @param {DataCollector} dataCollector - Data collector instance
   * @param {AgentVisualizationConfig} config - Configuration options
   */
  constructor(
    agent: AlgorithmInterface,
    dataCollector: DataCollector,
    config: Partial<AgentVisualizationConfig> = {}
  ) {
    this.agent = agent;
    this.dataCollector = dataCollector;
    this.config = {
      enabled: true,
      collectPolicyInfo: true,
      collectValueInfo: true,
      collectGradients: false, // Can be expensive to collect
      collectWeights: false,   // Can be expensive to collect
      collectFrequency: 10,    // Collect every 10 steps
      ...config
    };
    
    this.logger = logger.createChildLogger({
      component: 'AgentVisualizationHooks',
      agentType: agent.constructor.name
    });
    
    this._initialize();
  }
  
  /**
   * Initialize hooks
   * @private
   */
  private _initialize(): void {
    if (!this.config.enabled) {
      this.logger.info('Agent visualization hooks are disabled');
      return;
    }
    
    // Monkey patch agent methods to collect data
    this._patchAgentMethods();
    
    this.logger.info('Agent visualization hooks initialized');
  }
  
  /**
   * Patch agent methods to collect visualization data
   * @private
   */
  private _patchAgentMethods(): void {
    // Store original methods
    const originalUpdate = this.agent.update;
    const originalSelectAction = this.agent.selectAction;
    
    // Patch update method
    this.agent.update = (params: any) => {
      // Call original method
      const result = originalUpdate.call(this.agent, params);
      
      // Collect data
      this.stepCounter++;
      
      // Only collect on specified frequency
      if (this.stepCounter % this.config.collectFrequency === 0) {
        this._collectAgentData(params);
      }
      
      return result;
    };
    
    // Patch selectAction method
    this.agent.selectAction = (state: any) => {
      // Call original method
      const action = originalSelectAction.call(this.agent, state);
      
      // Collect policy data if available
      if (this.config.collectPolicyInfo && 
          this.stepCounter % this.config.collectFrequency === 0) {
        this._collectPolicyData(state, action);
      }
      
      return action;
    };
  }
  
  /**
   * Collect agent data during update
   * @param {any} params - Update parameters
   * @private
   */
  private _collectAgentData(params: any): void {
    try {
      // Collect loss metrics if available
      if (this.agent.getLastTrainingMetrics) {
        const metrics = this.agent.getLastTrainingMetrics();
        
        if (metrics) {
          Object.entries(metrics).forEach(([key, value]) => {
            this.dataCollector.collectMetric(
              `agent/${key}`,
              value as number,
              MetricType.SCALAR
            );
          });
        }
      }
      
      // Collect value function data if available and enabled
      if (this.config.collectValueInfo && this.agent.estimateValue) {
        const state = params.state;
        const valueEstimate = this.agent.estimateValue(state);
        
        if (valueEstimate !== undefined) {
          this.dataCollector.collectMetric(
            'agent/value_estimate',
            valueEstimate,
            MetricType.SCALAR
          );
        }
      }
      
      // Collect gradient information if available and enabled
      if (this.config.collectGradients && this.agent.getGradients) {
        const gradients = this.agent.getGradients();
        
        if (gradients) {
          // For each gradient, compute statistics
          gradients.forEach((gradient: tf.Tensor, i: number) => {
            // Get gradient as array
            const gradArray = gradient.dataSync();
            
            // Compute statistics
            const mean = this._calculateMean(gradArray);
            const variance = this._calculateVariance(gradArray, mean);
            const max = Math.max(...gradArray);
            const min = Math.min(...gradArray);
            
            // Collect metrics
            this.dataCollector.collectMetric(
              `agent/gradient_${i}_mean`,
              mean,
              MetricType.SCALAR
            );
            
            this.dataCollector.collectMetric(
              `agent/gradient_${i}_variance`,
              variance,
              MetricType.SCALAR
            );
            
            this.dataCollector.collectMetric(
              `agent/gradient_${i}_max`,
              max,
              MetricType.SCALAR
            );
            
            this.dataCollector.collectMetric(
              `agent/gradient_${i}_min`,
              min,
              MetricType.SCALAR
            );
            
            // Optionally collect histogram
            if (gradArray.length <= 100) { // Only for reasonably sized gradients
              this.dataCollector.collectMetric(
                `agent/gradient_${i}_histogram`,
                gradArray,
                MetricType.HISTOGRAM
              );
            }
          });
        }
      }
      
      // Collect weight information if available and enabled
      if (this.config.collectWeights && this.agent.getWeights) {
        const weights = this.agent.getWeights();
        
        if (weights) {
          // For each weight matrix, compute statistics
          weights.forEach((weight: tf.Tensor, i: number) => {
            // Get weight as array
            const weightArray = weight.dataSync();
            
            // Compute statistics
            const mean = this._calculateMean(weightArray);
            const variance = this._calculateVariance(weightArray, mean);
            const max = Math.max(...weightArray);
            const min = Math.min(...weightArray);
            
            // Collect metrics
            this.dataCollector.collectMetric(
              `agent/weight_${i}_mean`,
              mean,
              MetricType.SCALAR
            );
            
            this.dataCollector.collectMetric(
              `agent/weight_${i}_variance`,
              variance,
              MetricType.SCALAR
            );
            
            this.dataCollector.collectMetric(
              `agent/weight_${i}_max`,
              max,
              MetricType.SCALAR
            );
            
            this.dataCollector.collectMetric(
              `agent/weight_${i}_min`,
              min,
              MetricType.SCALAR
            );
          });
        }
      }
    } catch (error) {
      this.logger.error('Error collecting agent data', error);
    }
  }
  
  /**
   * Collect policy data during action selection
   * @param {any} state - Environment state
   * @param {any} action - Selected action
   * @private
   */
  private _collectPolicyData(state: any, action: any): void {
    try {
      // Collect action probabilities if available
      if (this.agent.getActionProbabilities) {
        const actionProbs = this.agent.getActionProbabilities(state);
        
        if (actionProbs) {
          // If discrete action space
          if (Array.isArray(actionProbs)) {
            this.dataCollector.collectMetric(
              'agent/action_probabilities',
              actionProbs,
              MetricType.VECTOR
            );
            
            // Calculate entropy
            const entropy = this._calculateEntropy(actionProbs);
            this.dataCollector.collectMetric(
              'agent/policy_entropy',
              entropy,
              MetricType.SCALAR
            );
          }
          // If continuous action space
          else if (actionProbs.mean && actionProbs.stdDev) {
            this.dataCollector.collectMetric(
              'agent/action_mean',
              actionProbs.mean,
              MetricType.VECTOR
            );
            
            this.dataCollector.collectMetric(
              'agent/action_stddev',
              actionProbs.stdDev,
              MetricType.VECTOR
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error collecting policy data', error);
    }
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
   * Calculate entropy of a probability distribution
   * @param {number[]} probs - Probability distribution
   * @returns {number} - Entropy value
   * @private
   */
  private _calculateEntropy(probs: number[]): number {
    return -probs.reduce((sum, p) => {
      if (p <= 0) return sum; // Avoid log(0)
      return sum + p * Math.log(p);
    }, 0);
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    // Nothing to clean up currently
    this.logger.info('Agent visualization hooks cleaned up');
  }
}

export default AgentVisualizationHooks;
