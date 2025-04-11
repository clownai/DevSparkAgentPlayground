/**
 * SAC.js
 * Implementation of Soft Actor-Critic algorithm
 * 
 * SAC is an off-policy actor-critic deep RL algorithm based on the maximum entropy
 * reinforcement learning framework. It is particularly effective for continuous
 * action spaces and incorporates entropy regularization for improved exploration.
 */

const AlgorithmInterface = require('../AlgorithmInterface');
const ReinforcementConfig = require('../ReinforcementConfig');
const tf = require('tensorflow.js');

class SAC extends AlgorithmInterface {
  /**
   * Create a new SAC algorithm instance
   * @param {Object} config - Algorithm configuration
   */
  constructor(config = {}) {
    super(ReinforcementConfig.getConfig('sac', config));
    
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
   * @param {Object} envInfo - Environment information (state space, action space)
   * @returns {Boolean} - Success status
   */
  initialize(envInfo) {
    if (!envInfo || !envInfo.stateSpace || !envInfo.actionSpace) {
      throw new Error('Environment info must contain stateSpace and actionSpace');
    }
    
    if (envInfo.actionType === 'discrete') {
      throw new Error('SAC is designed for continuous action spaces');
    }
    
    this.stateSpace = envInfo.stateSpace;
    this.actionSpace = envInfo.actionSpace;
    
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
   * @param {Array|Object} state - Current environment state
   * @param {Boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {Array} - Selected action
   */
  selectAction(state, explore = true) {
    if (!this.initialized) {
      throw new Error('Algorithm must be initialized before selecting actions');
    }
    
    // Convert state to tensor
    const stateTensor = this._preprocessState(state);
    
    // Get action from policy network
    const [meanAction, logStd] = this.policyNetwork.predict(stateTensor);
    
    let action;
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
    const actionArray = action.dataSync();
    
    // Scale action to action space bounds if needed
    const scaledAction = this._scaleAction(actionArray);
    
    return scaledAction;
  }
  
  /**
   * Update the algorithm based on experience
   * @param {Object} experience - Experience tuple (state, action, reward, nextState, done)
   * @returns {Object} - Update statistics
   */
  update(experience) {
    if (!this.initialized) {
      throw new Error('Algorithm must be initialized before updating');
    }
    
    // Add experience to replay buffer
    this._addToReplayBuffer(experience);
    
    // Update stats
    this._updateStats({ steps: 1, reward: experience.reward });
    
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
   * @param {Array<Object>} experiences - Array of experience tuples
   * @returns {Object} - Update statistics
   */
  batchUpdate(experiences) {
    if (!this.initialized) {
      throw new Error('Algorithm must be initialized before updating');
    }
    
    // Process each experience
    for (const exp of experiences) {
      this.update(exp);
    }
    
    return this.getStats();
  }
  
  /**
   * Save the algorithm state
   * @param {String} path - Path to save the model
   * @returns {Boolean} - Success status
   */
  save(path) {
    if (!this.initialized) {
      throw new Error('Algorithm must be initialized before saving');
    }
    
    try {
      // Save networks
      this.policyNetwork.save(`${path}/policy`);
      this.qNetwork1.save(`${path}/q1`);
      this.qNetwork2.save(`${path}/q2`);
      this.targetQNetwork1.save(`${path}/target_q1`);
      this.targetQNetwork2.save(`${path}/target_q2`);
      
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
      const fs = require('fs');
      fs.writeFileSync(`${path}/metadata.json`, JSON.stringify(metadata, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error saving SAC model:', error);
      return false;
    }
  }
  
  /**
   * Load the algorithm state
   * @param {String} path - Path to load the model from
   * @returns {Boolean} - Success status
   */
  load(path) {
    try {
      // Load metadata
      const fs = require('fs');
      const metadata = JSON.parse(fs.readFileSync(`${path}/metadata.json`, 'utf8'));
      
      // Restore configuration and stats
      this.config = metadata.config;
      this.trainingStats = metadata.stats;
      this.actionSpace = metadata.actionSpace;
      this.stateSpace = metadata.stateSpace;
      this.alpha = metadata.alpha;
      this.logAlpha = metadata.logAlpha;
      this.targetEntropy = metadata.targetEntropy;
      this.updateCounter = metadata.updateCounter;
      
      // Load networks
      this.policyNetwork = tf.loadLayersModel(`${path}/policy/model.json`);
      this.qNetwork1 = tf.loadLayersModel(`${path}/q1/model.json`);
      this.qNetwork2 = tf.loadLayersModel(`${path}/q2/model.json`);
      this.targetQNetwork1 = tf.loadLayersModel(`${path}/target_q1/model.json`);
      this.targetQNetwork2 = tf.loadLayersModel(`${path}/target_q2/model.json`);
      
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
      console.error('Error loading SAC model:', error);
      return false;
    }
  }
  
  /**
   * Reset the algorithm state
   * @returns {Boolean} - Success status
   */
  reset() {
    super.reset();
    
    // Clear replay buffer
    this.replayBuffer = [];
    this.bufferSize = 0;
    this.updateCounter = 0;
    
    return true;
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    // Use ReinforcementConfig to validate
    return ReinforcementConfig.getConfig('sac', config);
  }
  
  /**
   * Create policy network
   * @returns {tf.LayersModel} - Policy network
   * @private
   */
  _createPolicyNetwork() {
    const input = tf.input({ shape: this.stateSpace.shape });
    let x = input;
    
    // Add hidden layers
    for (const size of this.config.hiddenSize) {
      x = tf.layers.dense({ 
        units: size, 
        activation: this.config.activationFn 
      }).apply(x);
    }
    
    // Output mean and log standard deviation
    const mean = tf.layers.dense({ 
      units: this.actionSpace.shape[0], 
      activation: 'linear',
      name: 'mean_output'
    }).apply(x);
    
    const logStd = tf.layers.dense({ 
      units: this.actionSpace.shape[0], 
      activation: 'linear',
      name: 'logstd_output'
    }).apply(x);
    
    // Constrain log standard deviation
    const clippedLogStd = tf.layers.activation({
      activation: (x) => tf.clipByValue(x, -20, 2)
    }).apply(logStd);
    
    return tf.model({ inputs: input, outputs: [mean, clippedLogStd] });
  }
  
  /**
   * Create Q-network
   * @returns {tf.LayersModel} - Q-network
   * @private
   */
  _createQNetwork() {
    const stateInput = tf.input({ shape: this.stateSpace.shape });
    const actionInput = tf.input({ shape: this.actionSpace.shape });
    
    // Concatenate state and action
    let x = tf.layers.concatenate().apply([stateInput, actionInput]);
    
    // Add hidden layers
    for (const size of this.config.hiddenSize) {
      x = tf.layers.dense({ 
        units: size, 
        activation: this.config.activationFn 
      }).apply(x);
    }
    
    // Output Q-value
    const qValue = tf.layers.dense({ 
      units: 1, 
      activation: 'linear',
      name: 'q_output'
    }).apply(x);
    
    return tf.model({ inputs: [stateInput, actionInput], outputs: qValue });
  }
  
  /**
   * Preprocess state for network input
   * @param {Array|Object} state - State to preprocess
   * @returns {tf.Tensor} - Preprocessed state tensor
   * @private
   */
  _preprocessState(state) {
    // Convert state to tensor
    let stateTensor;
    
    if (Array.isArray(state)) {
      stateTensor = tf.tensor(state);
    } else if (typeof state === 'object') {
      stateTensor = tf.tensor(Object.values(state));
    } else {
      stateTensor = tf.scalar(state);
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
   * @param {Array} action - Action to scale
   * @returns {Array} - Scaled action
   * @private
   */
  _scaleAction(action) {
    // If action space has bounds, scale action
    if (this.actionSpace.low !== undefined && this.actionSpace.high !== undefined) {
      const low = this.actionSpace.low;
      const high = this.actionSpace.high;
      
      return action.map((a, i) => {
        // Action is in [-1, 1] from tanh, scale to [low, high]
        return low[i] + (a + 1) * 0.5 * (high[i] - low[i]);
      });
    }
    
    return action;
  }
  
  /**
   * Unscale action from action space bounds to [-1, 1]
   * @param {Array} action - Action to unscale
   * @returns {Array} - Unscaled action
   * @private
   */
  _unscaleAction(action) {
    // If action space has bounds, unscale action
    if (this.actionSpace.low !== undefined && this.actionSpace.high !== undefined) {
      const low = this.actionSpace.low;
      const high = this.actionSpace.high;
      
      return action.map((a, i) => {
        // Unscale from [low, high] to [-1, 1]
        return 2 * (a - low[i]) / (high[i] - low[i]) - 1;
      });
    }
    
    return action;
  }
  
  /**
   * Add experience to replay buffer
   * @param {Object} experience - Experience tuple
   * @private
   */
  _addToReplayBuffer(experience) {
    // Add to buffer
    this.replayBuffer.push(experience);
    this.bufferSize = this.replayBuffer.length;
    
    // Limit buffer size
    if (this.bufferSize > this.config.bufferSize) {
      this.replayBuffer.shift();
      this.bufferSize = this.replayBuffer.length;
    }
  }
  
  /**
   * Sample batch from replay buffer
   * @param {Number} batchSize - Batch size
   * @returns {Object} - Batch of experiences
   * @private
   */
  _sampleFromReplayBuffer(batchSize) {
    const batch = {
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
      batch.actions.push(exp.action);
      batch.rewards.push(exp.reward);
      batch.nextStates.push(exp.nextState);
      batch.dones.push(exp.done ? 1 : 0);
    }
    
    return batch;
  }
  
  /**
   * Update target networks
   * @param {Number} tau - Update rate (1.0 for hard update, < 1.0 for soft update)
   * @private
   */
  _updateTargetNetworks(tau = null) {
    const updateRate = tau !== null ? tau : this.config.tau;
    
    // Get weights
    const q1Weights = this.qNetwork1.getWeights();
    const q2Weights = this.qNetwork2.getWeights();
    const targetQ1Weights = this.targetQNetwork1.getWeights();
    const targetQ2Weights = this.targetQNetwork2.getWeights();
    
    // Update target weights
    const newTargetQ1Weights = q1Weights.map((w, i) => {
      return tf.add(
        tf.mul(w, updateRate),
        tf.mul(targetQ1Weights[i], 1 - updateRate)
      );
    });
    
    const newTargetQ2Weights = q2Weights.map((w, i) => {
      return tf.add(
        tf.mul(w, updateRate),
        tf.mul(targetQ2Weights[i], 1 - updateRate)
      );
    });
    
    // Set new weights
    this.targetQNetwork1.setWeights(newTargetQ1Weights);
    this.targetQNetwork2.setWeights(newTargetQ2Weights);
  }
  
  /**
   * Perform update of all networks
   * @returns {Object} - Update statistics
   * @private
   */
  _performUpdate() {
    // Sample batch from replay buffer
    const batch = this._sampleFromReplayBuffer(this.config.batchSize);
    
    // Convert to tensors
    const statesTensor = tf.stack(batch.states.map(s => this._preprocessState(s).squeeze()));
    const actionsTensor = tf.tensor(batch.actions.map(a => this._unscaleAction(a)));
    const rewardsTensor = tf.tensor1d(batch.rewards);
    const nextStatesTensor = tf.stack(batch.nextStates.map(s => this._preprocessState(s).squeeze()));
    const donesTensor = tf.tensor1d(batch.dones);
    
    // Update Q-networks
    const qLoss1 = this._updateQNetwork(
      this.qNetwork1, 
      this.qOptimizer1, 
      statesTensor, 
      actionsTensor, 
      rewardsTensor, 
      nextStatesTensor, 
      donesTensor
    );
    
    const qLoss2 = this._updateQNetwork(
      this.qNetwork2, 
      this.qOptimizer2, 
      statesTensor, 
      actionsTensor, 
      rewardsTensor, 
      nextStatesTensor, 
      donesTensor
    );
    
    // Update policy network
    const policyLoss = this._updatePolicyNetwork(statesTensor);
    
    // Update alpha if auto-tuning
    let alphaLoss = 0;
    if (this.config.autoAlpha) {
      alphaLoss = this._updateAlpha(statesTensor);
    }
    
    // Update target networks
    this._updateTargetNetworks();
    
    // Clean up tensors
    statesTensor.dispose();
    actionsTensor.dispose();
    rewardsTensor.dispose();
    nextStatesTensor.dispose();
    donesTensor.dispose();
    
    // Calculate total loss
    const totalLoss = qLoss1 + qLoss2 + policyLoss + alphaLoss;
    
    // Update stats
    this._updateStats({ loss: totalLoss });
    
    return {
      loss: totalLoss,
      qLoss1,
      qLoss2,
      policyLoss,
      alphaLoss
    };
  }
  
  /**
   * Update Q-network
   * @param {tf.LayersModel} qNetwork - Q-network to update
   * @param {tf.Optimizer} optimizer - Optimizer for Q-network
   * @param {tf.Tensor} states - Batch states
   * @param {tf.Tensor} actions - Batch actions
   * @param {tf.Tensor} rewards - Batch rewards
   * @param {tf.Tensor} nextStates - Batch next states
   * @param {tf.Tensor} dones - Batch done flags
   * @returns {Number} - Q-network loss
   * @private
   */
  _updateQNetwork(qNetwork, optimizer, states, actions, rewards, nextStates, dones) {
    // Calculate target Q-values
    const targetQValues = tf.tidy(() => {
      // Get next actions and log probs from policy
      const [nextMeans, nextLogStds] = this.policyNetwork.predict(nextStates);
      const nextStds = tf.exp(nextLogStds);
      const nextNoises = tf.randomNormal(nextMeans.shape);
      const nextActions = tf.tanh(tf.add(nextMeans, tf.mul(nextStds, nextNoises)));
      
      // Calculate log probs of next actions
      const nextLogProbs = this._calculateLogProbs(nextMeans, nextLogStds, nextActions);
      
      // Get Q-values for next states and actions
      const nextQ1 = this.targetQNetwork1.predict([nextStates, nextActions]).squeeze();
      const nextQ2 = this.targetQNetwork2.predict([nextStates, nextActions]).squeeze();
      
      // Take minimum of Q-values
      const nextQ = tf.minimum(nextQ1, nextQ2);
      
      // Subtract entropy term
      const entropyTerm = tf.mul(this.alpha, nextLogProbs);
      const nextStateValues = tf.sub(nextQ, entropyTerm);
      
      // Calculate target Q-values
      const targetQValues = tf.add(
        rewards,
        tf.mul(
          tf.mul(this.config.gamma, tf.sub(1, dones)),
          nextStateValues
        )
      );
      
      return targetQValues;
    });
    
    // Update Q-network
    const qLoss = optimizer.minimize(() => {
      // Get current Q-values
      const qValues = qNetwork.predict([states, actions]).squeeze();
      
      // Calculate MSE loss
      const loss = tf.losses.meanSquaredError(targetQValues, qValues);
      
      return loss;
    });
    
    // Get loss value
    const lossValue = qLoss.dataSync()[0];
    
    // Clean up tensors
    qLoss.dispose();
    targetQValues.dispose();
    
    return lossValue;
  }
  
  /**
   * Update policy network
   * @param {tf.Tensor} states - Batch states
   * @returns {Number} - Policy loss
   * @private
   */
  _updatePolicyNetwork(states) {
    // Update policy network
    const policyLoss = this.policyOptimizer.minimize(() => {
      // Get actions and log probs from policy
      const [means, logStds] = this.policyNetwork.predict(states);
      const stds = tf.exp(logStds);
      const noises = tf.randomNormal(means.shape);
      const actions = tf.tanh(tf.add(means, tf.mul(stds, noises)));
      
      // Calculate log probs of actions
      const logProbs = this._calculateLogProbs(means, logStds, actions);
      
      // Get Q-values for states and actions
      const q1Values = this.qNetwork1.predict([states, actions]).squeeze();
      const q2Values = this.qNetwork2.predict([states, actions]).squeeze();
      
      // Take minimum of Q-values
      const qValues = tf.minimum(q1Values, q2Values);
      
      // Calculate policy loss
      const entropyTerm = tf.mul(this.alpha, logProbs);
      const loss = tf.mean(tf.sub(entropyTerm, qValues));
      
      return loss;
    });
    
    // Get loss value
    const lossValue = policyLoss.dataSync()[0];
    
    // Clean up tensors
    policyLoss.dispose();
    
    return lossValue;
  }
  
  /**
   * Update alpha parameter
   * @param {tf.Tensor} states - Batch states
   * @returns {Number} - Alpha loss
   * @private
   */
  _updateAlpha(states) {
    // Update alpha
    const alphaLoss = this.alphaOptimizer.minimize(() => {
      // Get actions and log probs from policy
      const [means, logStds] = this.policyNetwork.predict(states);
      const stds = tf.exp(logStds);
      const noises = tf.randomNormal(means.shape);
      const actions = tf.tanh(tf.add(means, tf.mul(stds, noises)));
      
      // Calculate log probs of actions
      const logProbs = this._calculateLogProbs(means, logStds, actions);
      
      // Calculate alpha loss
      const alphaLoss = tf.mul(
        tf.exp(tf.scalar(this.logAlpha)),
        tf.mean(tf.add(tf.neg(logProbs), this.targetEntropy))
      );
      
      return alphaLoss;
    });
    
    // Get loss value
    const lossValue = alphaLoss.dataSync()[0];
    
    // Update alpha value
    this.alpha = Math.exp(this.logAlpha);
    
    // Clean up tensors
    alphaLoss.dispose();
    
    return lossValue;
  }
  
  /**
   * Calculate log probabilities of actions
   * @param {tf.Tensor} means - Mean actions
   * @param {tf.Tensor} logStds - Log standard deviations
   * @param {tf.Tensor} actions - Actions
   * @returns {tf.Tensor} - Log probabilities
   * @private
   */
  _calculateLogProbs(means, logStds, actions) {
    return tf.tidy(() => {
      const stds = tf.exp(logStds);
      
      // Inverse of tanh
      const actionsUnsquashed = tf.atanh(tf.clipByValue(actions, -0.99999, 0.99999));
      
      // Calculate log probs of unsquashed actions (Gaussian)
      const logProbsUnsquashed = tf.sub(
        tf.neg(tf.mul(0.5, tf.log(tf.mul(2 * Math.PI, tf.square(stds))))),
        tf.mul(0.5, tf.square(tf.div(tf.sub(actionsUnsquashed, means), stds)))
      );
      
      // Sum across action dimensions
      const logProbsUnsquashedSum = tf.sum(logProbsUnsquashed, -1);
      
      // Correction for tanh squashing
      const correction = tf.sum(
        tf.log(tf.sub(1, tf.square(actions))).mul(-1),
        -1
      );
      
      // Final log probs
      return tf.add(logProbsUnsquashedSum, correction);
    });
  }
}

module.exports = SAC;
