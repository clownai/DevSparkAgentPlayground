/**
 * PPO.ts
 * Implementation of Proximal Policy Optimization algorithm
 * 
 * PPO is a policy gradient method for reinforcement learning, which
 * alternates between sampling data through interaction with the environment,
 * and optimizing a "surrogate" objective function using stochastic gradient ascent.
 */

import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';

import AlgorithmInterface from '../AlgorithmInterface';
import ReinforcementConfig, { PPOConfig } from '../ReinforcementConfig';
import logger from '../../utils/logger';
import { 
  AlgorithmInitializationError, 
  ModelPersistenceError 
} from '../errors';
import {
  EnvironmentInfo,
  Experience,
  UpdateResult,
  StateSpace,
  ActionSpace,
  DiscreteActionSpace,
  ContinuousActionSpace
} from '../../types/reinforcement';

// Buffer interface for PPO
interface PPOBuffer {
  states: Array<number[] | Record<string, number>>;
  actions: Array<number | number[]>;
  oldLogProbs: number[];
  values: number[];
  rewards: number[];
  dones: boolean[];
  advantages: number[];
}

class PPO extends AlgorithmInterface {
  private actorNetwork: tf.LayersModel | null;
  private criticNetwork: tf.LayersModel | null;
  private optimizer: tf.Optimizer | null;
  private actionSpace: ActionSpace | null;
  private stateSpace: StateSpace | null;
  private isDiscrete: boolean;
  private buffer: PPOBuffer;
  private config: PPOConfig;

  /**
   * Create a new PPO algorithm instance
   * @param {Partial<PPOConfig>} config - Algorithm configuration
   */
  constructor(config: Partial<PPOConfig> = {}) {
    super(ReinforcementConfig.getConfig('ppo', config) as PPOConfig);
    
    this.config = this.getConfig() as PPOConfig;
    this.actorNetwork = null;
    this.criticNetwork = null;
    this.optimizer = null;
    this.actionSpace = null;
    this.stateSpace = null;
    this.isDiscrete = false;
    this.buffer = {
      states: [],
      actions: [],
      oldLogProbs: [],
      values: [],
      rewards: [],
      dones: [],
      advantages: []
    };
  }
  
  /**
   * Initialize the algorithm with environment information
   * @param {EnvironmentInfo} envInfo - Environment information (state space, action space)
   * @returns {boolean} - Success status
   */
  initialize(envInfo: EnvironmentInfo): boolean {
    if (!envInfo || !envInfo.stateSpace || !envInfo.actionSpace) {
      throw new AlgorithmInitializationError('Environment info must contain stateSpace and actionSpace', {
        algorithm: 'PPO',
        context: { providedInfo: envInfo }
      });
    }
    
    this.stateSpace = envInfo.stateSpace;
    this.actionSpace = envInfo.actionSpace;
    this.isDiscrete = envInfo.actionType === 'discrete';
    
    // Create actor network
    this.actorNetwork = this._createActorNetwork();
    
    // Create critic network
    if (this.config.useCritic) {
      this.criticNetwork = this._createCriticNetwork();
    }
    
    // Create optimizer
    this.optimizer = tf.train.adam(this.config.learningRate);
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Select an action based on the current state
   * @param {number[] | Record<string, number>} state - Current environment state
   * @param {boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {number | number[]} - Selected action
   */
  selectAction(state: number[] | Record<string, number>, explore: boolean = true): number | number[] {
    if (!this.initialized) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before selecting actions', {
        algorithm: 'PPO',
        context: { initialized: this.initialized }
      });
    }
    
    // Convert state to tensor
    const stateTensor = this._preprocessState(state);
    
    // Get action distribution from actor network
    const actionDistribution = this._getActionDistribution(stateTensor);
    
    // Sample action from distribution
    let action: number | number[];
    let logProb: number;
    
    if (this.isDiscrete) {
      // For discrete action spaces
      const probs = (actionDistribution as tf.Tensor).dataSync();
      action = explore ? this._sampleDiscrete(probs) : this._argmax(probs);
      logProb = Math.log(probs[action as number] + 1e-10);
    } else {
      // For continuous action spaces
      const [mean, stdDev] = actionDistribution as [tf.Tensor, tf.Tensor];
      const meanArray = mean.dataSync();
      const stdDevArray = stdDev.dataSync();
      
      if (explore) {
        // Sample from normal distribution
        action = Array.from(meanArray).map((m, i) => {
          const noise = this._randomNormal() * stdDevArray[i];
          return m + noise;
        });
        
        // Calculate log probability
        logProb = this._logProbContinuous(action as number[], Array.from(meanArray), Array.from(stdDevArray));
      } else {
        // Use mean for exploitation
        action = Array.from(meanArray);
        logProb = 0;
      }
    }
    
    // Get value estimate if using critic
    let value = 0;
    if (this.config.useCritic && this.criticNetwork) {
      value = (this.criticNetwork.predict(stateTensor) as tf.Tensor).dataSync()[0];
    }
    
    // Store experience in buffer
    if (explore) {
      this.buffer.states.push(state);
      this.buffer.actions.push(action);
      this.buffer.oldLogProbs.push(logProb);
      this.buffer.values.push(value);
    }
    
    return action;
  }
  
  /**
   * Update the algorithm based on experience
   * @param {Experience} experience - Experience tuple (state, action, reward, nextState, done)
   * @returns {UpdateResult} - Update statistics
   */
  update(experience: Experience): UpdateResult {
    if (!this.initialized) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before updating', {
        algorithm: 'PPO',
        context: { initialized: this.initialized }
      });
    }
    
    const { reward, done } = experience;
    
    // Store reward and done flag
    this.buffer.rewards.push(reward);
    this.buffer.dones.push(done);
    
    // Update stats
    this._updateStats({ steps: 1, totalReward: reward });
    
    // If episode is done or buffer is full, perform batch update
    if (done || this.buffer.states.length >= this.config.batchSize) {
      return this._performBatchUpdate();
    }
    
    return { loss: null };
  }
  
  /**
   * Perform batch update with multiple experiences
   * @param {Experience[]} experiences - Array of experience tuples
   * @returns {UpdateResult} - Update statistics
   */
  batchUpdate(experiences: Experience[]): UpdateResult {
    if (!this.initialized) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before updating', {
        algorithm: 'PPO',
        context: { initialized: this.initialized }
      });
    }
    
    // Process each experience
    for (const exp of experiences) {
      this.update(exp);
    }
    
    return this.getStats();
  }
  
  /**
   * Save the algorithm state
   * @param {string} path - Path to save the model
   * @returns {boolean} - Success status
   */
  save(savePath: string): boolean {
    if (!this.initialized) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before saving', {
        algorithm: 'PPO',
        context: { initialized: this.initialized }
      });
    }
    
    try {
      // Save actor network
      if (this.actorNetwork) {
        this.actorNetwork.save(`${savePath}/actor`);
      }
      
      // Save critic network if using
      if (this.config.useCritic && this.criticNetwork) {
        this.criticNetwork.save(`${savePath}/critic`);
      }
      
      // Save configuration and stats
      const metadata = {
        config: this.config,
        stats: this.trainingStats,
        actionSpace: this.actionSpace,
        stateSpace: this.stateSpace,
        isDiscrete: this.isDiscrete
      };
      
      // Save metadata as JSON
      fs.writeFileSync(`${savePath}/metadata.json`, JSON.stringify(metadata, null, 2));
      
      return true;
    } catch (error) {
      throw new ModelPersistenceError('Error saving PPO model', {
        operation: 'save',
        path: savePath,
        cause: error as Error
      });
    }
  }
  
  /**
   * Load the algorithm state
   * @param {string} path - Path to load the model from
   * @returns {boolean} - Success status
   */
  load(loadPath: string): boolean {
    try {
      // Load metadata
      const metadata = JSON.parse(fs.readFileSync(`${loadPath}/metadata.json`, 'utf8'));
      
      // Restore configuration and stats
      this.config = metadata.config;
      this.trainingStats = metadata.stats;
      this.actionSpace = metadata.actionSpace;
      this.stateSpace = metadata.stateSpace;
      this.isDiscrete = metadata.isDiscrete;
      
      // Load actor network
      this.actorNetwork = tf.loadLayersModel(`${loadPath}/actor/model.json`);
      
      // Load critic network if using
      if (this.config.useCritic) {
        this.criticNetwork = tf.loadLayersModel(`${loadPath}/critic/model.json`);
      }
      
      // Create optimizer
      this.optimizer = tf.train.adam(this.config.learningRate);
      
      this.initialized = true;
      return true;
    } catch (error) {
      throw new ModelPersistenceError('Error loading PPO model', {
        operation: 'load',
        path: loadPath,
        cause: error as Error
      });
    }
  }
  
  /**
   * Reset the algorithm state
   * @returns {boolean} - Success status
   */
  reset(): boolean {
    super.reset();
    
    // Clear buffer
    this.buffer = {
      states: [],
      actions: [],
      oldLogProbs: [],
      values: [],
      rewards: [],
      dones: [],
      advantages: []
    };
    
    return true;
  }
  
  /**
   * Validate configuration parameters
   * @param {Partial<PPOConfig>} config - Configuration to validate
   * @returns {PPOConfig} - Validated configuration
   * @protected
   */
  protected _validateConfig(config: Partial<PPOConfig>): PPOConfig {
    // Use ReinforcementConfig to validate
    return ReinforcementConfig.getConfig('ppo', config) as PPOConfig;
  }
  
  /**
   * Create actor network
   * @returns {tf.LayersModel} - Actor network
   * @private
   */
  private _createActorNetwork(): tf.LayersModel {
    if (!this.stateSpace || !this.actionSpace) {
      throw new Error('State space and action space must be defined before creating networks');
    }

    const input = tf.input({ shape: this.stateSpace.shape });
    let x = input;
    
    // Add hidden layers
    x = tf.layers.dense({ units: 64, activation: 'relu' as any }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dense({ units: 64, activation: 'relu' as any }).apply(x) as tf.SymbolicTensor;
    
    // Output layer depends on action space
    let output: tf.SymbolicTensor | [tf.SymbolicTensor, tf.SymbolicTensor];
    if (this.isDiscrete) {
      // For discrete actions, output probabilities
      const discreteActionSpace = this.actionSpace as DiscreteActionSpace;
      output = tf.layers.dense({ 
        units: discreteActionSpace.n, 
        activation: 'softmax' as any,
        name: 'policy_output'
      }).apply(x) as tf.SymbolicTensor;
    } else {
      // For continuous actions, output mean and standard deviation
      const continuousActionSpace = this.actionSpace as ContinuousActionSpace;
      const mean = tf.layers.dense({ 
        units: continuousActionSpace.shape[0], 
        activation: 'tanh' as any,
        name: 'mean_output'
      }).apply(x) as tf.SymbolicTensor;
      
      const stdDev = tf.layers.dense({ 
        units: continuousActionSpace.shape[0], 
        activation: 'softplus' as any,
        name: 'stddev_output'
      }).apply(x) as tf.SymbolicTensor;
      
      output = [mean, stdDev];
    }
    
    return tf.model({ inputs: input, outputs: output });
  }
  
  /**
   * Create critic network
   * @returns {tf.LayersModel} - Critic network
   * @private
   */
  private _createCriticNetwork(): tf.LayersModel {
    if (!this.stateSpace) {
      throw new Error('State space must be defined before creating networks');
    }

    const input = tf.input({ shape: this.stateSpace.shape });
    let x = input;
    
    // Add hidden layers
    x = tf.layers.dense({ units: 64, activation: 'relu' as any }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dense({ units: 64, activation: 'relu' as any }).apply(x) as tf.SymbolicTensor;
    
    // Output layer (value function)
    const output = tf.layers.dense({ 
      units: 1, 
      activation: 'linear' as any,
      name: 'value_output'
    }).apply(x) as tf.SymbolicTensor;
    
    return tf.model({ inputs: input, outputs: output });
  }
  
  /**
   * Preprocess state for network input
   * @param {number[] | Record<string, number>} state - State to preprocess
   * @returns {tf.Tensor} - Preprocessed state tensor
   * @private
   */
  private _preprocessState(state: number[] | Record<string, number>): tf.Tensor {
    if (!this.stateSpace) {
      throw new Error('State space must be defined before preprocessing states');
    }

    // Convert state to tensor
    let stateTensor: tf.Tensor;
    
    if (Array.isArray(state)) {
      stateTensor = tf.tensor(state);
    } else if (typeof state === 'object') {
      stateTensor = tf.tensor(Object.values(state));
    } else {
      throw new Error('State must be an array or object');
    }
    
    // Reshape if needed
    if (stateTensor.shape.length === 1 && this.stateSpace.shape.length > 1) {
      stateTensor = stateTensor.reshape(this.stateSpace.shape);
    }
    
    // Add batch dimension if needed
    if (stateTensor.shape.length === this.stateSpace.shape.length) {
      stateTensor = stateTensor.expandDims(0);
    }
    
    return stateTensor;
  }
  
  /**
   * Get action distribution from actor network
   * @param {tf.Tensor} stateTensor - State tensor
   * @returns {tf.Tensor | [tf.Tensor, tf.Tensor]} - Action distribution
   * @private
   */
  private _getActionDistribution(stateTensor: tf.Tensor): tf.Tensor | [tf.Tensor, tf.Tensor] {
    if (!this.actorNetwork) {
      throw new Error('Actor network must be defined before getting action distribution');
    }
    return this.actorNetwork.predict(stateTensor) as tf.Tensor | [tf.Tensor, tf.Tensor];
  }
  
  /**
   * Sample discrete action from probabilities
   * @param {Float32Array | Int32Array | Uint8Array} probs - Action probabilities
   * @returns {number} - Sampled action
   * @private
   */
  private _sampleDiscrete(probs: Float32Array | Int32Array | Uint8Array): number {
    const cumSum: number[] = [];
    let sum = 0;
    
    for (let i = 0; i < probs.length; i++) {
      sum += probs[i];
      cumSum.push(sum);
    }
    
    const rand = Math.random() * sum;
    return cumSum.findIndex(cs => cs >= rand);
  }
  
  /**
   * Get index of maximum value
   * @param {Float32Array | Int32Array | Uint8Array} values - Array of values
   * @returns {number} - Index of maximum value
   * @private
   */
  private _argmax(values: Float32Array | Int32Array | Uint8Array): number {
    let maxIndex = 0;
    let maxValue = values[0];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > maxValue) {
        maxValue = values[i];
        maxIndex = i;
      }
    }
    
    return maxIndex;
  }
  
  /**
   * Generate random sample from standard normal distribution
   * @returns {number} - Random sample
   * @private
   */
  private _randomNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  
  /**
   * Calculate log probability for continuous action
   * @param {number[]} action - Action values
   * @param {number[]} mean - Mean values
   * @param {number[]} stdDev - Standard deviation values
   * @returns {number} - Log probability
   * @private
   */
  private _logProbContinuous(action: number[], mean: number[], stdDev: number[]): number {
    let logProb = 0;
    const n = action.length;
    
    for (let i = 0; i < n; i++) {
      const diff = action[i] - mean[i];
      const variance = stdDev[i] * stdDev[i];
      logProb += -0.5 * Math.log(2 * Math.PI * variance) - 0.5 * diff * diff / variance;
    }
    
    return logProb;
  }
  
  /**
   * Calculate advantages and returns
   * @private
   */
  private _calculateAdvantages(): void {
    const { rewards, values, dones } = this.buffer;
    const lastValue = values[values.length - 1];
    const advantages: number[] = [];
    
    let lastAdvantage = 0;
    let lastReturn = lastValue;
    
    // Calculate advantages and returns in reverse order
    for (let i = rewards.length - 1; i >= 0; i--) {
      const mask = dones[i] ? 0 : 1;
      const delta = rewards[i] + this.config.gamma * lastReturn * mask - values[i];
      lastAdvantage = delta + this.config.gamma * this.config.lambda * lastAdvantage * mask;
      lastReturn = rewards[i] + this.config.gamma * lastReturn * mask;
      
      advantages.unshift(lastAdvantage);
    }
    
    this.buffer.advantages = advantages;
  }
  
  /**
   * Perform batch update with experiences in buffer
   * @returns {UpdateResult} - Update statistics
   * @private
   */
  private _performBatchUpdate(): UpdateResult {
    if (!this.initialized || !this.actorNetwork || !this.optimizer) {
      throw new Error('Algorithm must be initialized before performing batch update');
    }

    // Calculate advantages
    this._calculateAdvantages();
    
    // Get data from buffer
    const { states, actions, oldLogProbs, advantages } = this.buffer;
    
    // Normalize advantages
    const meanAdvantage = advantages.reduce((a, b) => a + b, 0) / advantages.length;
    const stdAdvantage = Math.sqrt(
      advantages.reduce((a, b) => a + Math.pow(b - meanAdvantage, 2), 0) / advantages.length
    );
    const normalizedAdvantages = advantages.map(adv => (adv - meanAdvantage) / (stdAdvantage + 1e-8));
    
    // Prepare for training
    const batchSize = states.length;
    const epochs = this.config.epochs;
    const miniBatchSize = this.config.miniBatchSize || batchSize;
    
    let totalLoss = 0;
    
    // Train for multiple epochs
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle data
      const indices = this._shuffle(batchSize);
      
      // Process mini-batches
      for (let start = 0; start < batchSize; start += miniBatchSize) {
        const end = Math.min(start + miniBatchSize, batchSize);
        const batchIndices = indices.slice(start, end);
        
        // Get mini-batch data
        const batchStates = batchIndices.map(i => states[i]);
        const batchActions = batchIndices.map(i => actions[i]);
        const batchOldLogProbs = batchIndices.map(i => oldLogProbs[i]);
        const batchAdvantages = batchIndices.map(i => normalizedAdvantages[i]);
        
        // Convert to tensors
        const statesTensor = tf.tensor(batchStates.map(s => Array.isArray(s) ? s : Object.values(s)));
        
        // Update policy
        const loss = this._updatePolicy(
          statesTensor,
          batchActions,
          batchOldLogProbs,
          batchAdvantages
        );
        
        totalLoss += loss;
        
        // Clean up tensors
        statesTensor.dispose();
      }
    }
    
    // Update episode counter if any episode ended
    if (this.buffer.dones.some(done => done)) {
      this._updateStats({ episodes: 1 });
    }
    
    // Clear buffer
    this.buffer = {
      states: [],
      actions: [],
      oldLogProbs: [],
      values: [],
      rewards: [],
      dones: [],
      advantages: []
    };
    
    return {
      loss: totalLoss / (epochs * Math.ceil(batchSize / miniBatchSize))
    };
  }
  
  /**
   * Update policy network
   * @param {tf.Tensor} states - Batch of states
   * @param {Array<number | number[]>} actions - Batch of actions
   * @param {number[]} oldLogProbs - Batch of old log probabilities
   * @param {number[]} advantages - Batch of advantages
   * @returns {number} - Loss value
   * @private
   */
  private _updatePolicy(
    states: tf.Tensor,
    actions: Array<number | number[]>,
    oldLogProbs: number[],
    advantages: number[]
  ): number {
    if (!this.actorNetwork || !this.optimizer) {
      throw new Error('Actor network and optimizer must be initialized before updating policy');
    }

    return tf.tidy(() => {
      let loss = 0;
      
      this.optimizer!.minimize(() => {
        // Get action distribution
        const actionDistribution = this._getActionDistribution(states);
        
        // Calculate log probabilities
        const logProbs: number[] = [];
        
        if (this.isDiscrete) {
          // For discrete actions
          const probs = (actionDistribution as tf.Tensor).arraySync() as number[][];
          
          for (let i = 0; i < probs.length; i++) {
            const action = actions[i] as number;
            logProbs.push(Math.log(probs[i][action] + 1e-10));
          }
        } else {
          // For continuous actions
          const [means, stdDevs] = actionDistribution as [tf.Tensor, tf.Tensor];
          const meansArray = means.arraySync() as number[][];
          const stdDevsArray = stdDevs.arraySync() as number[][];
          
          for (let i = 0; i < meansArray.length; i++) {
            const action = actions[i] as number[];
            logProbs.push(this._logProbContinuous(
              action,
              meansArray[i],
              stdDevsArray[i]
            ));
          }
        }
        
        // Calculate ratio
        const ratios = logProbs.map((logProb, i) => Math.exp(logProb - oldLogProbs[i]));
        
        // Calculate surrogate losses
        const surr1 = ratios.map((ratio, i) => ratio * advantages[i]);
        const surr2 = ratios.map((ratio, i) => 
          Math.max(
            Math.min(ratio, 1 + this.config.epsilon),
            1 - this.config.epsilon
          ) * advantages[i]
        );
        
        // Calculate policy loss
        const policyLoss = -surr1.map((s1, i) => Math.min(s1, surr2[i])).reduce((a, b) => a + b, 0) / surr1.length;
        
        loss = policyLoss;
        return tf.scalar(policyLoss);
      });
      
      return loss;
    });
  }
  
  /**
   * Shuffle indices
   * @param {number} length - Number of indices to shuffle
   * @returns {number[]} - Shuffled indices
   * @private
   */
  private _shuffle(length: number): number[] {
    const indices = Array.from({ length }, (_, i) => i);
    
    for (let i = length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    return indices;
  }
}

export default PPO;
