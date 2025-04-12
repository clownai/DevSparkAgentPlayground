/**
 * AlgorithmInterface.ts
 * Defines the interface for reinforcement learning algorithms
 * 
 * This interface ensures all RL algorithms implement a consistent API
 * for training, prediction, and configuration.
 */

import { 
  EnvironmentInfo, 
  Experience, 
  TrainingStats, 
  UpdateResult 
} from '../types/reinforcement';

abstract class AlgorithmInterface {
  protected config: Record<string, any>;
  protected initialized: boolean;
  protected trainingStats: TrainingStats;

  /**
   * Create a new reinforcement learning algorithm instance
   * @param {Record<string, any>} config - Algorithm configuration
   */
  constructor(config: Record<string, any> = {}) {
    if (this.constructor === AlgorithmInterface) {
      throw new Error('AlgorithmInterface is an abstract class and cannot be instantiated directly');
    }
    
    this.config = this._validateConfig(config);
    this.initialized = false;
    this.trainingStats = {
      episodes: 0,
      steps: 0,
      totalReward: 0,
      averageReward: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      losses: []
    };
  }
  
  /**
   * Initialize the algorithm with environment information
   * @param {EnvironmentInfo} envInfo - Environment information (state space, action space)
   * @returns {Promise<boolean>} - Success status
   */
  abstract initialize(envInfo: EnvironmentInfo): Promise<boolean> | boolean;
  
  /**
   * Select an action based on the current state
   * @param {number[] | Record<string, number>} state - Current environment state
   * @param {boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {number | number[]} - Selected action
   */
  abstract selectAction(state: number[] | Record<string, number>, explore?: boolean): number | number[];
  
  /**
   * Update the algorithm based on experience
   * @param {Experience} experience - Experience tuple (state, action, reward, nextState, done)
   * @returns {UpdateResult} - Update statistics
   */
  abstract update(experience: Experience): UpdateResult;
  
  /**
   * Perform batch update with multiple experiences
   * @param {Experience[]} experiences - Array of experience tuples
   * @returns {UpdateResult} - Update statistics
   */
  abstract batchUpdate(experiences: Experience[]): UpdateResult;
  
  /**
   * Save the algorithm state
   * @param {string} path - Path to save the model
   * @returns {Promise<boolean> | boolean} - Success status
   */
  abstract save(path: string): Promise<boolean> | boolean;
  
  /**
   * Load the algorithm state
   * @param {string} path - Path to load the model from
   * @returns {Promise<boolean> | boolean} - Success status
   */
  abstract load(path: string): Promise<boolean> | boolean;
  
  /**
   * Get algorithm configuration
   * @returns {Record<string, any>} - Current configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }
  
  /**
   * Update algorithm configuration
   * @param {Record<string, any>} config - New configuration parameters
   * @returns {Record<string, any>} - Updated configuration
   */
  updateConfig(config: Record<string, any>): Record<string, any> {
    this.config = { ...this.config, ...this._validateConfig(config) };
    return this.getConfig();
  }
  
  /**
   * Get training statistics
   * @returns {TrainingStats} - Training statistics
   */
  getStats(): TrainingStats {
    return { ...this.trainingStats };
  }
  
  /**
   * Reset the algorithm state
   * @returns {boolean} - Success status
   */
  reset(): boolean {
    this.trainingStats = {
      episodes: 0,
      steps: 0,
      totalReward: 0,
      averageReward: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      losses: []
    };
    return true;
  }
  
  /**
   * Validate configuration parameters
   * @param {Record<string, any>} config - Configuration to validate
   * @returns {Record<string, any>} - Validated configuration
   * @protected
   */
  protected _validateConfig(config: Record<string, any>): Record<string, any> {
    // Base implementation returns the config as is
    // Subclasses should override this to provide validation
    return { ...config };
  }
  
  /**
   * Update training statistics
   * @param {Partial<TrainingStats>} stats - Statistics to update
   * @protected
   */
  protected _updateStats(stats: Partial<TrainingStats>): void {
    if (stats.steps) this.trainingStats.steps += stats.steps;
    if (stats.episodes) this.trainingStats.episodes += stats.episodes;
    if (stats.totalReward) this.trainingStats.totalReward += stats.totalReward;
    
    // Update average reward
    if (this.trainingStats.episodes > 0) {
      this.trainingStats.averageReward = this.trainingStats.totalReward / this.trainingStats.episodes;
    }
    
    // Update last update time
    this.trainingStats.lastUpdateTime = new Date();
    
    // Add loss if provided
    if (stats.loss !== undefined) {
      if (!this.trainingStats.losses) {
        this.trainingStats.losses = [];
      }
      this.trainingStats.losses.push(stats.loss);
      
      // Keep only the last 100 loss values
      if (this.trainingStats.losses.length > 100) {
        this.trainingStats.losses = this.trainingStats.losses.slice(-100);
      }
    }
  }
}

export default AlgorithmInterface;
