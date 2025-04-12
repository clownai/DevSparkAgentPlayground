/**
 * Experiment runner for DevSparkAgentPlayground
 * 
 * This class handles running experiments with configured agents and environments
 */

import * as path from 'path';
import { ExperimentConfig } from './ConfigLoader';
import AgentFactory from './AgentFactory';
import EnvironmentFactory from './EnvironmentFactory';
import logger from './logger';
import { Logger } from '../types/core';
import AlgorithmInterface from '../reinforcement/AlgorithmInterface';

/**
 * Class for running experiments with configured agents and environments
 */
export class ExperimentRunner {
  private config: ExperimentConfig;
  private agent: AlgorithmInterface;
  private environment: any; // Using any for now, would be a proper Environment type
  private logger: Logger;
  private results: any[] = [];
  
  /**
   * Create a new ExperimentRunner
   * @param {ExperimentConfig} config - Experiment configuration
   */
  constructor(config: ExperimentConfig) {
    this.config = config;
    this.logger = logger.createChildLogger({ 
      component: 'ExperimentRunner',
      experiment: config.name
    });
    
    // Create agent and environment from resolved configurations
    this.agent = AgentFactory.createFromConfig(config._resolvedAgent);
    this.environment = EnvironmentFactory.createFromConfig(config._resolvedEnvironment);
  }
  
  /**
   * Run the experiment
   * @returns {Promise<any>} - Experiment results
   */
  async run(): Promise<any> {
    this.logger.info(`Starting experiment: ${this.config.name}`);
    
    const { parameters } = this.config;
    const { seed, num_runs, parallel } = parameters;
    
    // Set random seed
    this.setSeed(seed);
    
    // Run the experiment for the specified number of runs
    if (parallel && num_runs > 1) {
      await this.runParallel(num_runs);
    } else {
      await this.runSequential(num_runs);
    }
    
    // Process and return results
    const processedResults = this.processResults();
    
    this.logger.info(`Experiment completed: ${this.config.name}`);
    
    return processedResults;
  }
  
  /**
   * Run the experiment sequentially
   * @param {number} numRuns - Number of runs
   * @private
   */
  private async runSequential(numRuns: number): Promise<void> {
    for (let i = 0; i < numRuns; i++) {
      this.logger.info(`Starting run ${i + 1}/${numRuns}`);
      const result = await this.runSingleExperiment(i);
      this.results.push(result);
    }
  }
  
  /**
   * Run the experiment in parallel
   * @param {number} numRuns - Number of runs
   * @private
   */
  private async runParallel(numRuns: number): Promise<void> {
    const promises = [];
    
    for (let i = 0; i < numRuns; i++) {
      this.logger.info(`Starting parallel run ${i + 1}/${numRuns}`);
      promises.push(this.runSingleExperiment(i));
    }
    
    this.results = await Promise.all(promises);
  }
  
  /**
   * Run a single experiment
   * @param {number} runIndex - Index of the run
   * @returns {Promise<any>} - Run results
   * @private
   */
  private async runSingleExperiment(runIndex: number): Promise<any> {
    // Initialize agent and environment for this run
    this.agent.reset();
    
    // Get training parameters
    const trainingConfig = this.config._resolvedAgent.training;
    const { max_steps, max_episodes } = trainingConfig;
    
    // Training loop
    let totalSteps = 0;
    let episode = 0;
    let done = false;
    let state = this.environment.reset();
    
    const episodeRewards: number[] = [];
    let episodeReward = 0;
    
    while (totalSteps < max_steps && episode < max_episodes) {
      // Select action
      const action = this.agent.selectAction(state);
      
      // Take action in environment
      const { nextState, reward, done } = this.environment.step(action);
      
      // Update agent
      this.agent.update({
        state,
        action,
        reward,
        nextState,
        done
      });
      
      // Update state and counters
      state = nextState;
      totalSteps++;
      episodeReward += reward;
      
      // Handle episode end
      if (done) {
        episodeRewards.push(episodeReward);
        episodeReward = 0;
        episode++;
        state = this.environment.reset();
        done = false;
        
        // Log progress
        if (episode % 10 === 0) {
          this.logger.info(`Run ${runIndex + 1}, Episode ${episode}, Average Reward: ${this.getAverageReward(episodeRewards, 10)}`);
        }
      }
    }
    
    // Return results for this run
    return {
      runIndex,
      totalSteps,
      episodes: episode,
      episodeRewards,
      averageReward: this.getAverageReward(episodeRewards),
      // Add more metrics as needed
    };
  }
  
  /**
   * Process experiment results
   * @returns {any} - Processed results
   * @private
   */
  private processResults(): any {
    // Calculate aggregate statistics
    const allEpisodeRewards = this.results.flatMap(result => result.episodeRewards);
    const averageReward = this.getAverageReward(allEpisodeRewards);
    
    // Process metrics based on configuration
    const metrics = this.config.metrics.map(metric => {
      return {
        name: metric.name,
        value: this.calculateMetric(metric.name, metric.type)
      };
    });
    
    return {
      experimentName: this.config.name,
      numRuns: this.results.length,
      averageReward,
      metrics,
      runs: this.results,
    };
  }
  
  /**
   * Calculate a metric value
   * @param {string} name - Metric name
   * @param {string} type - Metric type (mean, sum, etc.)
   * @returns {number} - Calculated metric value
   * @private
   */
  private calculateMetric(name: string, type: string): number {
    // Extract metric values from results
    let values: number[] = [];
    
    switch (name) {
      case 'episode_reward':
        values = this.results.map(result => result.averageReward);
        break;
      case 'episode_length':
        values = this.results.map(result => result.totalSteps / result.episodes);
        break;
      // Add more metrics as needed
      default:
        return 0;
    }
    
    // Calculate based on type
    switch (type) {
      case 'mean':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return 0;
    }
  }
  
  /**
   * Get average reward over the last N episodes
   * @param {number[]} rewards - Array of episode rewards
   * @param {number} n - Number of episodes to average over (default: all)
   * @returns {number} - Average reward
   * @private
   */
  private getAverageReward(rewards: number[], n?: number): number {
    if (rewards.length === 0) return 0;
    
    const count = n ? Math.min(n, rewards.length) : rewards.length;
    const recentRewards = rewards.slice(-count);
    
    return recentRewards.reduce((sum, reward) => sum + reward, 0) / count;
  }
  
  /**
   * Set random seed for reproducibility
   * @param {number} seed - Random seed
   * @private
   */
  private setSeed(seed: number): void {
    // Set seed for JavaScript's Math.random
    // This is a simple implementation, not cryptographically secure
    Math.random = (() => {
      let s = seed;
      return () => {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
    })();
    
    this.logger.debug(`Set random seed to ${seed}`);
  }
}

export default ExperimentRunner;
