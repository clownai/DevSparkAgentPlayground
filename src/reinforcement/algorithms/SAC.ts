/**
 * SAC.ts
 * Implementation of Soft Actor-Critic algorithm
 * 
 * SAC is an off-policy actor-critic deep RL algorithm based on the maximum entropy
 * reinforcement learning framework. It is particularly effective for continuous
 * action spaces and incorporates entropy regularization for improved exploration.
 */

import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';

import AlgorithmInterface from '../AlgorithmInterface';
import ReinforcementConfig, { SACConfig } from '../ReinforcementConfig';
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
  ContinuousActionSpace
} from '../../types/reinforcement';

// Replay buffer interface for SAC
interface ReplayBufferItem extends Experience {
  state: number[] | Record<string, number>;
  action: number[];
  reward: number;
  nextState: number[] | Record<string, number>;
  done: boolean;
}

interface ReplayBufferBatch {
  states: Array<number[] | Record<string, number>>;
  actions: number[][];
  rewards: number[];
  nextStates: Array<number[] | Record<string, number>>;
  dones: number[];
}

class SAC extends AlgorithmInterface {
  private policyNetwork: tf.LayersModel | null;
  private qNetwork1: tf.LayersModel | null;
  private qNetwork2: tf.LayersModel | null;
  private targetQNetwork1: tf.LayersModel | null;
  private targetQNetwork2: tf.LayersModel | null;
  
  private policyOptimizer: tf.Optimizer | null;
  private qOptimizer1: tf.Optimizer | null;
  private qOptimizer2: tf.Optimizer | null;
  private alphaOptimizer: tf.Optimizer | null;
  
  private actionSpace: ContinuousActionSpace | null;
  private stateSpace: StateSpace | null;
  private replayBuffer: ReplayBufferItem[];
  private bufferSize: number;
  
  // Entropy regularization coefficient
  private alpha: number;
  private logAlpha: number;
  private targetEntropy: number | null;
  
  private updateCounter: number;
  private config: SACConfig;

  /**
   * Create a new SAC algorithm instance
   * @param {Partial<SACConfig>} config - Algorithm configuration
   */
  constructor(config: Partial<SACConfig> = {}) {
    super(ReinforcementConfig.getConfig('sac', config) as SACConfig);
    
    this.config = this.getConfig() as SACConfig;
    this.policyNetwork = null;
    this.qNetwork1 = null;
    this.qNetwork2 = null;
    this.targetQNetwork1 = null;
    this.targetQNetwork2 = null;
    
    this.policyOptimizer = null;
    this.qOptimizer1 = null;
    this.qOptimizer2 = null;
    this.alphaOptimizer = null;
    
    this.actionSpace = null;
    this.stateSpace = null;
    this.replayBuffer = [];
    this.bufferSize = 0;
    
    // Entropy regularization coefficient
    this.alpha = this.config.alpha;
    this.logAlpha = Math.log(this.alpha);
    this.targetEntropy = null;
    
    this.updateCounter = 0;
  }
  
  /**
   * Initialize the algorithm with environment information
   * @param {EnvironmentInfo} envInfo - Environment information (state space, action space)
   * @returns {boolean} - Success status
   */
  initialize(envInfo: EnvironmentInfo): boolean {
    if (!envInfo || !envInfo.stateSpace || !envInfo.actionSpace) {
      throw new AlgorithmInitializationError('Environment info must contain stateSpace and actionSpace', {
        algorithm: 'SAC',
        context: { providedInfo: envInfo }
      });
    }
    
    if (envInfo.actionType === 'discrete') {
      throw new AlgorithmInitializationError('SAC is designed for continuous action spaces', {
        algorithm: 'SAC',
        context: { actionType: envInfo.actionType }
      });
    }
    
    this.stateSpace = envInfo.stateSpace;
    // Since we've verified this is a continuous action space, we can safely cast
    this.actionSpace = envInfo.actionSpace as ContinuousActionSpace;
    
    // Set target entropy to negative of action space dimension
    this.targetEntropy = -this.actionSpace.shape[0];
    
    // Create networks
    this.policyNetwork = this._createPolicyNetwork();
    this.qNetwork1 = this._createQNetwork();
    this.qNetwork2 = this._createQNetwork();
    
    // Create target networks
    this.targetQNetwork1 = this._createQNetwork();
    this.targetQNetwork2 = this._createQNetwork();
    
    // Copy weights to target networks
    this._updateTargetNetworks(1.0);
    
    // Create optimizers
    this.policyOptimizer = tf.train.adam(this.config.learningRate);
    this.qOptimizer1 = tf.train.adam(this.config.learningRate);
    this.qOptimizer2 = tf.train.adam(this.config.learningRate);
    
    if (this.config.autoAlpha) {
      this.alphaOptimizer = tf.train.adam(this.config.learningRate);
    }
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Select an action based on the current state
   * @param {number[] | Record<string, number>} state - Current environment state
   * @param {boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {number[]} - Selected action
   */
  selectAction(state: number[] | Record<string, number>, explore: boolean = true): number[] {
    if (!this.initialized || !this.policyNetwork) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before selecting actions', {
        algorithm: 'SAC',
        context: { initialized: this.initialized }
      });
    }
    
    // Convert state to tensor
    const stateTensor = this._preprocessState(state);
    
    // Get action from policy network
    const [meanAction, logStd] = this.policyNetwork.predict(stateTensor) as [tf.Tensor, tf.Tensor];
    
    let action: tf.Tensor;
    if (explore) {
      // Sample from Gaussian distribution
      const std = tf.exp(logStd);
      const noise = tf.randomNormal(meanAction.shape);
      action = tf.add(meanAction, tf.mul(std, noise));
      
      // Apply tanh squashing
      action = tf.tanh(action);
    } else {
      // Use mean action for exploitation
      action = tf.tanh(meanAction);
    }
    
    // Convert to array
    const actionArray = Array.from(action.dataSync());
    
    // Scale action to action space bounds if needed
    const scaledAction = this._scaleAction(actionArray);
    
    return scaledAction;
  }
  
  /**
   * Update the algorithm based on experience
   * @param {Experience} experience - Experience tuple (state, action, reward, nextState, done)
   * @returns {UpdateResult} - Update statistics
   */
  update(experience: Experience): UpdateResult {
    if (!this.initialized) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before updating', {
        algorithm: 'SAC',
        context: { initialized: this.initialized }
      });
    }
    
    // Add experience to replay buffer
    this._addToReplayBuffer(experience as ReplayBufferItem);
    
    // Update stats
    this._updateStats({ steps: 1, totalReward: experience.reward });
    
    // Perform update if buffer has enough samples
    if (this.replayBuffer.length >= this.config.batchSize) {
      // Update networks every N steps
      this.updateCounter += 1;
      
      if (this.updateCounter % this.config.targetUpdateInterval === 0) {
        return this._performUpdate();
      }
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
        algorithm: 'SAC',
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
   * @param {string} savePath - Path to save the model
   * @returns {boolean} - Success status
   */
  save(savePath: string): boolean {
    if (!this.initialized || !this.policyNetwork || !this.qNetwork1 || !this.qNetwork2 || 
        !this.targetQNetwork1 || !this.targetQNetwork2) {
      throw new AlgorithmInitializationError('Algorithm must be initialized before saving', {
        algorithm: 'SAC',
        context: { initialized: this.initialized }
      });
    }
    
    try {
      // Save networks
      this.policyNetwork.save(`${savePath}/policy`);
      this.qNetwork1.save(`${savePath}/q1`);
      this.qNetwork2.save(`${savePath}/q2`);
      this.targetQNetwork1.save(`${savePath}/target_q1`);
      this.targetQNetwork2.save(`${savePath}/target_q2`);
      
      // Save configuration and stats
      const metadata = {
        config: this.config,
        stats: this.trainingStats,
        actionSpace: this.actionSpace,
        stateSpace: this.stateSpace,
        alpha: this.alpha,
        logAlpha: this.logAlpha,
        targetEntropy: this.targetEntropy,
        updateCounter: this.updateCounter
      };
      
      // Save metadata as JSON
      fs.writeFileSync(`${savePath}/metadata.json`, JSON.stringify(metadata, null, 2));
      
      return true;
    } catch (error) {
      throw new ModelPersistenceError('Error saving SAC model', {
        operation: 'save',
        path: savePath,
        cause: error as Error
      });
    }
  }
  
  /**
   * Load the algorithm state
   * @param {string} loadPath - Path to load the model from
   * @returns {boolean} - Success status
   */
  load(loadPath: string): boolean {
    try {
      // Load metadata
      const metadata = JSON.parse(fs.readFileSync(`${loadPath}/metadata.json`, 'utf8'));
      
      // Restore configuration and stats
      this.config = metadata.config;
      this.trainingStats = metadata.stats;
      this.actionSpace = metadata.actionSpace as ContinuousActionSpace;
      this.stateSpace = metadata.stateSpace;
      this.alpha = metadata.alpha;
      this.logAlpha = metadata.logAlpha;
      this.targetEntropy = metadata.targetEntropy;
      this.updateCounter = metadata.updateCounter;
      
      // Load networks
      this.policyNetwork = tf.loadLayersModel(`${loadPath}/policy/model.json`);
      this.qNetwork1 = tf.loadLayersModel(`${loadPath}/q1/model.json`);
      this.qNetwork2 = tf.loadLayersModel(`${loadPath}/q2/model.json`);
      this.targetQNetwork1 = tf.loadLayersModel(`${loadPath}/target_q1/model.json`);
      this.targetQNetwork2 = tf.loadLayersModel(`${loadPath}/target_q2/model.json`);
      
      // Create optimizers
      this.policyOptimizer = tf.train.adam(this.config.learningRate);
      this.qOptimizer1 = tf.train.adam(this.config.learningRate);
      this.qOptimizer2 = tf.train.adam(this.config.learningRate);
      
      if (this.config.autoAlpha) {
        this.alphaOptimizer = tf.train.adam(this.config.learningRate);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      throw new ModelPersistenceError('Error loading SAC model', {
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
    
    // Clear replay buffer
    this.replayBuffer = [];
    this.bufferSize = 0;
    this.updateCounter = 0;
    
    return true;
  }
  
  /**
   * Validate configuration parameters
   * @param {Partial<SACConfig>} config - Configuration to validate
   * @returns {SACConfig} - Validated configuration
   * @protected
   */
  protected _validateConfig(config: Partial<SACConfig>): SACConfig {
    // Use ReinforcementConfig to validate
    return ReinforcementConfig.getConfig('sac', config) as SACConfig;
  }
  
  /**
   * Create policy network
   * @returns {tf.LayersModel} - Policy network
   * @private
   */
  private _createPolicyNetwork(): tf.LayersModel {
    if (!this.stateSpace || !this.actionSpace) {
      throw new Error('State space and action space must be defined before creating networks');
    }

    const input = tf.input({ shape: this.stateSpace.shape });
    let x = input;
    
    // Add hidden layers
    for (const size of this.config.hiddenSize) {
      x = tf.layers.dense({ 
        units: size, 
        activation: this.config.activationFn as any
      }).apply(x) as tf.SymbolicTensor;
    }
    
    // Output mean and log standard deviation
    const mean = tf.layers.dense({ 
      units: this.actionSpace.shape[0], 
      activation: 'linear',
      name: 'mean_output'
    }).apply(x) as tf.SymbolicTensor;
    
    const logStd = tf.layers.dense({ 
      units: this.actionSpace.shape[0], 
      activation: 'linear',
      name: 'logstd_output'
    }).apply(x) as tf.SymbolicTensor;
    
    // Constrain log standard deviation
    const clippedLogStd = tf.layers.activation({
      activation: (x: tf.Tensor) => tf.clipByValue(x, -20, 2)
    }).apply(logStd) as tf.SymbolicTensor;
    
    return tf.model({ inputs: input, outputs: [mean, clippedLogStd] });
  }
  
  /**
   * Create Q-network
   * @returns {tf.LayersModel} - Q-network
   * @private
   */
  private _createQNetwork(): tf.LayersModel {
    if (!this.stateSpace || !this.actionSpace) {
      throw new Error('State space and action space must be defined before creating networks');
    }

    const stateInput = tf.input({ shape: this.stateSpace.shape });
    const actionInput = tf.input({ shape: this.actionSpace.shape });
    
    // Concatenate state and action
    let x = tf.layers.concatenate().apply([stateInput, actionInput]) as tf.SymbolicTensor;
    
    // Add hidden layers
    for (const size of this.config.hiddenSize) {
      x = tf.layers.dense({ 
        units: size, 
        activation: this.config.activationFn as any
      }).apply(x) as tf.SymbolicTensor;
    }
    
    // Output Q-value
    const qValue = tf.layers.dense({ 
      units: 1, 
      activation: 'linear',
      name: 'q_output'
    }).apply(x) as tf.SymbolicTensor;
    
    return tf.model({ inputs: [stateInput, actionInput], outputs: qValue });
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
   * Scale action to action space bounds
   * @param {number[]} action - Action to scale
   * @returns {number[]} - Scaled action
   * @private
   */
  private _scaleAction(action: number[]): number[] {
    if (!this.actionSpace) {
      throw new Error('Action space must be defined before scaling actions');
    }

    // Scale action from [-1, 1] to [low, high]
    return action.map((a, i) => {
      // Action is in [-1, 1] from tanh, scale to [low, high]
      return this.actionSpace!.low[i] + (a + 1) * 0.5 * (this.actionSpace!.high[i] - this.actionSpace!.low[i]);
    });
  }
  
  /**
   * Unscale action from action space bounds to [-1, 1]
   * @param {number[]} action - Action to unscale
   * @returns {number[]} - Unscaled action
   * @private
   */
  private _unscaleAction(action: number[]): number[] {
    if (!this.actionSpace) {
      throw new Error('Action space must be defined before unscaling actions');
    }

    // Unscale action from [low, high] to [-1, 1]
    return action.map((a, i) => {
      return 2.0 * (a - this.actionSpace!.low[i]) / (this.actionSpace!.high[i] - this.actionSpace!.low[i]) - 1.0;
    });
  }
  
  /**
   * Add experience to replay buffer
   * @param {ReplayBufferItem} experience - Experience to add
   * @private
   */
  private _addToReplayBuffer(experience: ReplayBufferItem): void {
    // Add to buffer
    this.replayBuffer.push(experience);
    this.bufferSize = this.replayBuffer.length;
    
    // Limit buffer size
    if (this.bufferSize > this.config.bufferSize!) {
      this.replayBuffer.shift();
      this.bufferSize = this.replayBuffer.length;
    }
  }
  
  /**
   * Sample batch from replay buffer
   * @param {number} batchSize - Batch size
   * @returns {ReplayBufferBatch} - Batch of experiences
   * @private
   */
  private _sampleFromReplayBuffer(batchSize: number): ReplayBufferBatch {
    const batch: ReplayBufferBatch = {
      states: [],
      actions: [],
      rewards: [],
      nextStates: [],
      dones: []
    };
    
    // Sample random indices
    const indices = [];
    for (let i = 0; i < batchSize; i++) {
      indices.push(Math.floor(Math.random() * this.bufferSize));
    }
    
    // Get experiences
    for (const idx of indices) {
      const exp = this.replayBuffer[idx];
      batch.states.push(exp.state);
      batch.actions.push(exp.action as number[]);
      batch.rewards.push(exp.reward);
      batch.nextStates.push(exp.nextState);
      batch.dones.push(exp.done ? 1 : 0);
    }
    
    return batch;
  }
  
  /**
   * Update target networks with soft update
   * @param {number} tau - Update rate (1.0 for hard update, < 1.0 for soft update)
   * @private
   */
  private _updateTargetNetworks(tau: number = this.config.tau): void {
    if (!this.qNetwork1 || !this.qNetwork2 || !this.targetQNetwork1 || !this.targetQNetwork2) {
      throw new Error('Networks must be initialized before updating target networks');
    }

    // Get weights
    const q1Weights = this.qNetwork1.getWeights();
    const q2Weights = this.qNetwork2.getWeights();
    const targetQ1Weights = this.targetQNetwork1.getWeights();
    const targetQ2Weights = this.targetQNetwork2.getWeights();
    
    // Update target weights
    const updatedTargetQ1Weights = q1Weights.map((w, i) => {
      return tf.tidy(() => {
        const oldWeight = targetQ1Weights[i];
        return tf.add(tf.mul(w, tau), tf.mul(oldWeight, 1 - tau));
      });
    });
    
    const updatedTargetQ2Weights = q2Weights.map((w, i) => {
      return tf.tidy(() => {
        const oldWeight = targetQ2Weights[i];
        return tf.add(tf.mul(w, tau), tf.mul(oldWeight, 1 - tau));
      });
    });
    
    // Set weights
    this.targetQNetwork1.setWeights(updatedTargetQ1Weights);
    this.targetQNetwork2.setWeights(updatedTargetQ2Weights);
  }
  
  /**
   * Perform update with batch of experiences
   * @returns {UpdateResult} - Update statistics
   * @private
   */
  private _performUpdate(): UpdateResult {
    if (!this.initialized || !this.policyNetwork || !this.qNetwork1 || !this.qNetwork2 || 
        !this.targetQNetwork1 || !this.targetQNetwork2 || !this.policyOptimizer || 
        !this.qOptimizer1 || !this.qOptimizer2) {
      throw new Error('Algorithm must be initialized before performing update');
    }

    // Sample batch
    const batch = this._sampleFromReplayBuffer(this.config.batchSize);
    
    // Convert to tensors
    const states = tf.tensor(batch.states.map(s => Array.isArray(s) ? s : Object.values(s)));
    const actions = tf.tensor(batch.actions);
    const rewards = tf.tensor1d(batch.rewards);
    const nextStates = tf.tensor(batch.nextStates.map(s => Array.isArray(s) ? s : Object.values(s)));
    const dones = tf.tensor1d(batch.dones);
    
    // Update Q-networks
    const q1Loss = this._updateQNetwork(
      this.qNetwork1,
      this.qOptimizer1,
      states,
      actions,
      rewards,
      nextStates,
      dones
    );
    
    const q2Loss = this._updateQNetwork(
      this.qNetwork2,
      this.qOptimizer2,
      states,
      actions,
      rewards,
      nextStates,
      dones
    );
    
    // Update policy network
    const policyLoss = this._updatePolicyNetwork(states);
    
    // Update alpha if auto-tuning
    let alphaLoss = 0;
    if (this.config.autoAlpha && this.alphaOptimizer) {
      alphaLoss = this._updateAlpha(states);
    }
    
    // Update target networks
    this._updateTargetNetworks();
    
    // Clean up tensors
    states.dispose();
    actions.dispose();
    rewards.dispose();
    nextStates.dispose();
    dones.dispose();
    
    return {
      loss: (q1Loss + q2Loss) / 2,
      qLoss: (q1Loss + q2Loss) / 2,
      policyLoss,
      alphaLoss
    };
  }
  
  /**
   * Update Q-network
   * @param {tf.LayersModel} qNetwork - Q-network to update
   * @param {tf.Optimizer} optimizer - Optimizer for Q-network
   * @param {tf.Tensor} states - Batch of states
   * @param {tf.Tensor} actions - Batch of actions
   * @param {tf.Tensor} rewards - Batch of rewards
   * @param {tf.Tensor} nextStates - Batch of next states
   * @param {tf.Tensor} dones - Batch of done flags
   * @returns {number} - Loss value
   * @private
   */
  private _updateQNetwork(
    qNetwork: tf.LayersModel,
    optimizer: tf.Optimizer,
    states: tf.Tensor,
    actions: tf.Tensor,
    rewards: tf.Tensor,
    nextStates: tf.Tensor,
    dones: tf.Tensor
  ): number {
    if (!this.policyNetwork || !this.targetQNetwork1 || !this.targetQNetwork2) {
      throw new Error('Networks must be initialized before updating Q-network');
    }

    return tf.tidy(() => {
      // Get next actions and log probs from policy
      const [nextMeans, nextLogStds] = this.policyNetwork!.predict(nextStates) as [tf.Tensor, tf.Tensor];
      const nextStds = tf.exp(nextLogStds);
      const nextNoise = tf.randomNormal(nextMeans.shape);
      const nextActions = tf.tanh(tf.add(nextMeans, tf.mul(nextStds, nextNoise)));
      const nextLogProbs = this._calculateLogProbs(nextMeans, nextLogStds, nextActions);
      
      // Get Q-values for next state-action pairs
      const nextQ1 = this.targetQNetwork1!.predict([nextStates, nextActions]) as tf.Tensor;
      const nextQ2 = this.targetQNetwork2!.predict([nextStates, nextActions]) as tf.Tensor;
      
      // Take minimum of Q-values
      const nextQ = tf.minimum(nextQ1, nextQ2);
      
      // Subtract entropy term
      const entropyTerm = tf.mul(tf.exp(tf.scalar(this.logAlpha)), nextLogProbs);
      const nextValues = tf.sub(nextQ, entropyTerm);
      
      // Calculate target Q-values
      const targetQ = tf.add(
        rewards,
        tf.mul(
          tf.scalar(this.config.gamma),
          tf.mul(tf.sub(tf.scalar(1), dones), nextValues)
        )
      );
      
      // Calculate loss
      let loss = 0;
      optimizer.minimize(() => {
        const currentQ = qNetwork.predict([states, actions]) as tf.Tensor;
        const qLoss = tf.losses.meanSquaredError(targetQ, currentQ);
        loss = qLoss.dataSync()[0];
        return qLoss;
      });
      
      return loss;
    });
  }
  
  /**
   * Update policy network
   * @param {tf.Tensor} states - Batch of states
   * @returns {number} - Loss value
   * @private
   */
  private _updatePolicyNetwork(states: tf.Tensor): number {
    if (!this.policyNetwork || !this.qNetwork1 || !this.qNetwork2 || !this.policyOptimizer) {
      throw new Error('Networks must be initialized before updating policy network');
    }

    return tf.tidy(() => {
      let loss = 0;
      
      this.policyOptimizer!.minimize(() => {
        // Get actions and log probs from policy
        const [means, logStds] = this.policyNetwork!.predict(states) as [tf.Tensor, tf.Tensor];
        const stds = tf.exp(logStds);
        const noise = tf.randomNormal(means.shape);
        const actions = tf.tanh(tf.add(means, tf.mul(stds, noise)));
        const logProbs = this._calculateLogProbs(means, logStds, actions);
        
        // Get Q-values
        const q1 = this.qNetwork1!.predict([states, actions]) as tf.Tensor;
        const q2 = this.qNetwork2!.predict([states, actions]) as tf.Tensor;
        const q = tf.minimum(q1, q2);
        
        // Calculate policy loss
        const entropyTerm = tf.mul(tf.exp(tf.scalar(this.logAlpha)), logProbs);
        const policyLoss = tf.mean(tf.sub(entropyTerm, q));
        
        loss = policyLoss.dataSync()[0];
        return policyLoss;
      });
      
      return loss;
    });
  }
  
  /**
   * Update alpha parameter
   * @param {tf.Tensor} states - Batch of states
   * @returns {number} - Loss value
   * @private
   */
  private _updateAlpha(states: tf.Tensor): number {
    if (!this.policyNetwork || !this.alphaOptimizer || this.targetEntropy === null) {
      throw new Error('Policy network and alpha optimizer must be initialized before updating alpha');
    }

    return tf.tidy(() => {
      let loss = 0;
      
      this.alphaOptimizer!.minimize(() => {
        // Get actions and log probs from policy
        const [means, logStds] = this.policyNetwork!.predict(states) as [tf.Tensor, tf.Tensor];
        const stds = tf.exp(logStds);
        const noise = tf.randomNormal(means.shape);
        const actions = tf.tanh(tf.add(means, tf.mul(stds, noise)));
        const logProbs = this._calculateLogProbs(means, logStds, actions);
        
        // Calculate alpha loss
        const alphaLoss = tf.mean(
          tf.mul(
            tf.neg(tf.exp(tf.scalar(this.logAlpha))),
            tf.add(logProbs, tf.scalar(this.targetEntropy!))
          )
        );
        
        loss = alphaLoss.dataSync()[0];
        
        // Update alpha
        this.logAlpha -= this.config.learningRate * loss;
        this.alpha = Math.exp(this.logAlpha);
        
        return alphaLoss;
      });
      
      return loss;
    });
  }
  
  /**
   * Calculate log probabilities of actions
   * @param {tf.Tensor} means - Mean actions
   * @param {tf.Tensor} logStds - Log standard deviations
   * @param {tf.Tensor} actions - Actions
   * @returns {tf.Tensor} - Log probabilities
   * @private
   */
  private _calculateLogProbs(means: tf.Tensor, logStds: tf.Tensor, actions: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Convert tanh-squashed actions back to Gaussian space
      const unsquashedActions = tf.atanh(actions);
      
      // Calculate log probs of unsquashed actions
      const stds = tf.exp(logStds);
      const variance = tf.square(stds);
      const logProbs = tf.sub(
        tf.neg(
          tf.div(
            tf.square(tf.sub(unsquashedActions, means)),
            tf.mul(tf.scalar(2), variance)
          )
        ),
        tf.add(
          logStds,
          tf.scalar(Math.log(Math.sqrt(2 * Math.PI)))
        )
      );
      
      // Sum across action dimensions
      let logProb = tf.sum(logProbs, -1);
      
      // Account for tanh squashing
      const correction = tf.sum(
        tf.log(tf.sub(tf.scalar(1), tf.square(actions))),
        -1
      );
      
      logProb = tf.sub(logProb, correction);
      
      return logProb;
    });
  }
}

export default SAC;
