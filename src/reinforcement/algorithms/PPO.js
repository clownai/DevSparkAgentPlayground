/**
 * PPO.js
 * Implementation of Proximal Policy Optimization algorithm
 * 
 * PPO is a policy gradient method for reinforcement learning, which
 * alternates between sampling data through interaction with the environment,
 * and optimizing a "surrogate" objective function using stochastic gradient ascent.
 */

const AlgorithmInterface = require('../AlgorithmInterface');
const ReinforcementConfig = require('../ReinforcementConfig');
const tf = require('tensorflow.js');

class PPO extends AlgorithmInterface {
  /**
   * Create a new PPO algorithm instance
   * @param {Object} config - Algorithm configuration
   */
  constructor(config = {}) {
    super(ReinforcementConfig.getConfig('ppo', config));
    
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
   * @param {Object} envInfo - Environment information (state space, action space)
   * @returns {Boolean} - Success status
   */
  initialize(envInfo) {
    if (!envInfo || !envInfo.stateSpace || !envInfo.actionSpace) {
      throw new Error('Environment info must contain stateSpace and actionSpace');
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
   * @param {Array|Object} state - Current environment state
   * @param {Boolean} explore - Whether to use exploration (true) or exploitation (false)
   * @returns {Number|Array} - Selected action
   */
  selectAction(state, explore = true) {
    if (!this.initialized) {
      throw new Error('Algorithm must be initialized before selecting actions');
    }
    
    // Convert state to tensor
    const stateTensor = this._preprocessState(state);
    
    // Get action distribution from actor network
    const actionDistribution = this._getActionDistribution(stateTensor);
    
    // Sample action from distribution
    let action, logProb;
    
    if (this.isDiscrete) {
      // For discrete action spaces
      const probs = actionDistribution.dataSync();
      action = explore ? this._sampleDiscrete(probs) : this._argmax(probs);
      logProb = Math.log(probs[action] + 1e-10);
    } else {
      // For continuous action spaces
      const [mean, stdDev] = actionDistribution;
      const meanArray = mean.dataSync();
      const stdDevArray = stdDev.dataSync();
      
      if (explore) {
        // Sample from normal distribution
        action = meanArray.map((m, i) => {
          const noise = this._randomNormal() * stdDevArray[i];
          return m + noise;
        });
        
        // Calculate log probability
        logProb = this._logProbContinuous(action, meanArray, stdDevArray);
      } else {
        // Use mean for exploitation
        action = meanArray;
        logProb = 0;
      }
    }
    
    // Get value estimate if using critic
    let value = 0;
    if (this.config.useCritic) {
      value = this.criticNetwork.predict(stateTensor).dataSync()[0];
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
   * @param {Object} experience - Experience tuple (state, action, reward, nextState, done)
   * @returns {Object} - Update statistics
   */
  update(experience) {
    if (!this.initialized) {
      throw new Error('Algorithm must be initialized before updating');
    }
    
    const { reward, done } = experience;
    
    // Store reward and done flag
    this.buffer.rewards.push(reward);
    this.buffer.dones.push(done);
    
    // Update stats
    this._updateStats({ steps: 1, reward });
    
    // If episode is done or buffer is full, perform batch update
    if (done || this.buffer.states.length >= this.config.batchSize) {
      return this._performBatchUpdate();
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
      // Save actor network
      this.actorNetwork.save(`${path}/actor`);
      
      // Save critic network if using
      if (this.config.useCritic) {
        this.criticNetwork.save(`${path}/critic`);
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
      const fs = require('fs');
      fs.writeFileSync(`${path}/metadata.json`, JSON.stringify(metadata, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error saving PPO model:', error);
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
      this.isDiscrete = metadata.isDiscrete;
      
      // Load actor network
      this.actorNetwork = tf.loadLayersModel(`${path}/actor/model.json`);
      
      // Load critic network if using
      if (this.config.useCritic) {
        this.criticNetwork = tf.loadLayersModel(`${path}/critic/model.json`);
      }
      
      // Create optimizer
      this.optimizer = tf.train.adam(this.config.learningRate);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error loading PPO model:', error);
      return false;
    }
  }
  
  /**
   * Reset the algorithm state
   * @returns {Boolean} - Success status
   */
  reset() {
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
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    // Use ReinforcementConfig to validate
    return ReinforcementConfig.getConfig('ppo', config);
  }
  
  /**
   * Create actor network
   * @returns {tf.LayersModel} - Actor network
   * @private
   */
  _createActorNetwork() {
    const input = tf.input({ shape: this.stateSpace.shape });
    let x = input;
    
    // Add hidden layers
    x = tf.layers.dense({ units: 64, activation: 'relu' }).apply(x);
    x = tf.layers.dense({ units: 64, activation: 'relu' }).apply(x);
    
    // Output layer depends on action space
    let output;
    if (this.isDiscrete) {
      // For discrete actions, output probabilities
      output = tf.layers.dense({ 
        units: this.actionSpace.n, 
        activation: 'softmax',
        name: 'policy_output'
      }).apply(x);
    } else {
      // For continuous actions, output mean and standard deviation
      const mean = tf.layers.dense({ 
        units: this.actionSpace.shape[0], 
        activation: 'tanh',
        name: 'mean_output'
      }).apply(x);
      
      const stdDev = tf.layers.dense({ 
        units: this.actionSpace.shape[0], 
        activation: 'softplus',
        name: 'stddev_output'
      }).apply(x);
      
      output = [mean, stdDev];
    }
    
    return tf.model({ inputs: input, outputs: output });
  }
  
  /**
   * Create critic network
   * @returns {tf.LayersModel} - Critic network
   * @private
   */
  _createCriticNetwork() {
    const input = tf.input({ shape: this.stateSpace.shape });
    let x = input;
    
    // Add hidden layers
    x = tf.layers.dense({ units: 64, activation: 'relu' }).apply(x);
    x = tf.layers.dense({ units: 64, activation: 'relu' }).apply(x);
    
    // Output layer (value function)
    const output = tf.layers.dense({ 
      units: 1, 
      activation: 'linear',
      name: 'value_output'
    }).apply(x);
    
    return tf.model({ inputs: input, outputs: output });
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
   * Get action distribution from actor network
   * @param {tf.Tensor} stateTensor - State tensor
   * @returns {tf.Tensor|Array<tf.Tensor>} - Action distribution
   * @private
   */
  _getActionDistribution(stateTensor) {
    return this.actorNetwork.predict(stateTensor);
  }
  
  /**
   * Sample discrete action from probabilities
   * @param {Array} probs - Action probabilities
   * @returns {Number} - Sampled action
   * @private
   */
  _sampleDiscrete(probs) {
    const cumSum = [];
    let sum = 0;
    
    for (const p of probs) {
      sum += p;
      cumSum.push(sum);
    }
    
    const rand = Math.random() * sum;
    return cumSum.findIndex(cs => cs >= rand);
  }
  
  /**
   * Get index of maximum value
   * @param {Array} values - Array of values
   * @returns {Number} - Index of maximum value
   * @private
   */
  _argmax(values) {
    return values.indexOf(Math.max(...values));
  }
  
  /**
   * Generate random sample from standard normal distribution
   * @returns {Number} - Random sample
   * @private
   */
  _randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  
  /**
   * Calculate log probability for continuous action
   * @param {Array} action - Action values
   * @param {Array} mean - Mean values
   * @param {Array} stdDev - Standard deviation values
   * @returns {Number} - Log probability
   * @private
   */
  _logProbContinuous(action, mean, stdDev) {
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
   * Perform batch update
   * @returns {Object} - Update statistics
   * @private
   */
  _performBatchUpdate() {
    if (this.buffer.states.length === 0) {
      return { loss: null };
    }
    
    // Calculate advantages
    this._calculateAdvantages();
    
    // Perform multiple epochs of training
    let totalLoss = 0;
    let totalPolicyLoss = 0;
    let totalValueLoss = 0;
    let totalEntropyLoss = 0;
    
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      // Shuffle data
      const indices = this._shuffle(this.buffer.states.length);
      
      // Train in mini-batches
      for (let i = 0; i < indices.length; i += this.config.batchSize) {
        const batchIndices = indices.slice(i, i + this.config.batchSize);
        const batchSize = batchIndices.length;
        
        if (batchSize === 0) continue;
        
        // Get batch data
        const batchStates = batchIndices.map(idx => this.buffer.states[idx]);
        const batchActions = batchIndices.map(idx => this.buffer.actions[idx]);
        const batchOldLogProbs = batchIndices.map(idx => this.buffer.oldLogProbs[idx]);
        const batchAdvantages = batchIndices.map(idx => this.buffer.advantages[idx]);
        const batchReturns = batchIndices.map(idx => {
          const advantage = this.buffer.advantages[idx];
          const value = this.buffer.values[idx];
          return advantage + value;
        });
        
        // Normalize advantages
        if (this.config.normalizeAdvantage) {
          const mean = batchAdvantages.reduce((a, b) => a + b, 0) / batchSize;
          const std = Math.sqrt(
            batchAdvantages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / batchSize
          );
          
          for (let j = 0; j < batchSize; j++) {
            batchAdvantages[j] = (batchAdvantages[j] - mean) / (std + 1e-8);
          }
        }
        
        // Perform gradient update
        const { loss, policyLoss, valueLoss, entropyLoss } = this._updateNetworks(
          batchStates, batchActions, batchOldLogProbs, batchAdvantages, batchReturns
        );
        
        totalLoss += loss;
        totalPolicyLoss += policyLoss;
        totalValueLoss += valueLoss;
        totalEntropyLoss += entropyLoss;
      }
    }
    
    // Calculate average losses
    const numUpdates = this.config.epochs;
    const avgLoss = totalLoss / numUpdates;
    const avgPolicyLoss = totalPolicyLoss / numUpdates;
    const avgValueLoss = totalValueLoss / numUpdates;
    const avgEntropyLoss = totalEntropyLoss / numUpdates;
    
    // Clear buffer
    this.reset();
    
    // Update episode count if last experience was terminal
    if (this.buffer.dones.length > 0 && this.buffer.dones[this.buffer.dones.length - 1]) {
      this._updateStats({ episodes: 1 });
    }
    
    return {
      loss: avgLoss,
      policyLoss: avgPolicyLoss,
      valueLoss: avgValueLoss,
      entropyLoss: avgEntropyLoss
    };
  }
  
  /**
   * Calculate advantages for experiences in buffer
   * @private
   */
  _calculateAdvantages() {
    const n = this.buffer.rewards.length;
    if (n === 0) return;
    
    // Initialize advantages array
    this.buffer.advantages = new Array(n).fill(0);
    
    if (this.config.useGAE) {
      // Generalized Advantage Estimation
      let lastGAE = 0;
      
      for (let t = n - 1; t >= 0; t--) {
        const nextValue = t === n - 1 ? 0 : this.buffer.values[t + 1];
        const nextNonTerminal = t === n - 1 ? 0 : 1 - this.buffer.dones[t];
        
        const delta = this.buffer.rewards[t] + this.config.gamma * nextValue * nextNonTerminal - this.buffer.values[t];
        lastGAE = delta + this.config.gamma * this.config.gaeParam * nextNonTerminal * lastGAE;
        
        this.buffer.advantages[t] = lastGAE;
      }
    } else {
      // Regular advantage calculation
      for (let t = n - 1; t >= 0; t--) {
        const nextValue = t === n - 1 ? 0 : this.buffer.values[t + 1];
        const nextNonTerminal = t === n - 1 ? 0 : 1 - this.buffer.dones[t];
        
        const delta = this.buffer.rewards[t] + this.config.gamma * nextValue * nextNonTerminal - this.buffer.values[t];
        this.buffer.advantages[t] = delta;
      }
    }
  }
  
  /**
   * Update networks with batch data
   * @param {Array} states - Batch states
   * @param {Array} actions - Batch actions
   * @param {Array} oldLogProbs - Batch old log probabilities
   * @param {Array} advantages - Batch advantages
   * @param {Array} returns - Batch returns
   * @returns {Object} - Loss values
   * @private
   */
  _updateNetworks(states, actions, oldLogProbs, advantages, returns) {
    // Convert to tensors
    const statesTensor = tf.stack(states.map(s => this._preprocessState(s).squeeze()));
    const actionsTensor = tf.tensor(actions);
    const oldLogProbsTensor = tf.tensor(oldLogProbs);
    const advantagesTensor = tf.tensor(advantages);
    const returnsTensor = tf.tensor(returns);
    
    // Perform gradient update
    const { loss, policyLoss, valueLoss, entropyLoss } = tf.tidy(() => {
      // Forward pass
      const actionDistribution = this.actorNetwork.predict(statesTensor);
      let logProbs, entropy;
      
      if (this.isDiscrete) {
        // For discrete actions
        const probs = actionDistribution;
        const actionMask = tf.oneHot(actionsTensor.cast('int32'), this.actionSpace.n);
        const selectedProbs = tf.sum(tf.mul(probs, actionMask), 1);
        logProbs = tf.log(tf.add(selectedProbs, 1e-10));
        entropy = tf.neg(tf.sum(tf.mul(probs, tf.log(tf.add(probs, 1e-10))), 1));
      } else {
        // For continuous actions
        const [mean, stdDev] = actionDistribution;
        const variance = tf.square(stdDev);
        const diff = tf.sub(actionsTensor, mean);
        const squaredDiff = tf.square(diff);
        
        logProbs = tf.neg(
          tf.add(
            tf.mul(0.5, tf.log(tf.mul(2 * Math.PI, variance))),
            tf.mul(0.5, tf.div(squaredDiff, variance))
          )
        );
        
        logProbs = tf.sum(logProbs, 1);
        entropy = tf.sum(tf.add(tf.log(stdDev), 0.5 * Math.log(2 * Math.PI * Math.E)), 1);
      }
      
      // Calculate ratio and clipped ratio
      const ratio = tf.exp(tf.sub(logProbs, oldLogProbsTensor));
      const clippedRatio = tf.clipByValue(ratio, 1 - this.config.epsilon, 1 + this.config.epsilon);
      
      // Calculate surrogate objectives
      const surrogate1 = tf.mul(ratio, advantagesTensor);
      const surrogate2 = tf.mul(clippedRatio, advantagesTensor);
      
      // Calculate policy loss (negative because we want to maximize)
      const policyLoss = tf.neg(tf.mean(tf.minimum(surrogate1, surrogate2)));
      
      // Calculate value loss if using critic
      let valueLoss = tf.scalar(0);
      if (this.config.useCritic) {
        const valuesPredicted = this.criticNetwork.predict(statesTensor).squeeze();
        valueLoss = tf.mean(tf.square(tf.sub(valuesPredicted, returnsTensor)));
      }
      
      // Calculate entropy loss (negative because we want to maximize)
      const entropyLoss = tf.neg(tf.mean(entropy));
      
      // Calculate total loss
      const totalLoss = tf.add(
        policyLoss,
        tf.add(
          tf.mul(this.config.valueCoef, valueLoss),
          tf.mul(this.config.entropyCoef, entropyLoss)
        )
      );
      
      return {
        loss: totalLoss.dataSync()[0],
        policyLoss: policyLoss.dataSync()[0],
        valueLoss: valueLoss.dataSync()[0],
        entropyLoss: entropyLoss.dataSync()[0],
        totalLoss
      };
    });
    
    // Perform gradient update
    this.optimizer.minimize(() => {
      // Forward pass
      const actionDistribution = this.actorNetwork.predict(statesTensor);
      let logProbs, entropy;
      
      if (this.isDiscrete) {
        // For discrete actions
        const probs = actionDistribution;
        const actionMask = tf.oneHot(actionsTensor.cast('int32'), this.actionSpace.n);
        const selectedProbs = tf.sum(tf.mul(probs, actionMask), 1);
        logProbs = tf.log(tf.add(selectedProbs, 1e-10));
        entropy = tf.neg(tf.sum(tf.mul(probs, tf.log(tf.add(probs, 1e-10))), 1));
      } else {
        // For continuous actions
        const [mean, stdDev] = actionDistribution;
        const variance = tf.square(stdDev);
        const diff = tf.sub(actionsTensor, mean);
        const squaredDiff = tf.square(diff);
        
        logProbs = tf.neg(
          tf.add(
            tf.mul(0.5, tf.log(tf.mul(2 * Math.PI, variance))),
            tf.mul(0.5, tf.div(squaredDiff, variance))
          )
        );
        
        logProbs = tf.sum(logProbs, 1);
        entropy = tf.sum(tf.add(tf.log(stdDev), 0.5 * Math.log(2 * Math.PI * Math.E)), 1);
      }
      
      // Calculate ratio and clipped ratio
      const ratio = tf.exp(tf.sub(logProbs, oldLogProbsTensor));
      const clippedRatio = tf.clipByValue(ratio, 1 - this.config.epsilon, 1 + this.config.epsilon);
      
      // Calculate surrogate objectives
      const surrogate1 = tf.mul(ratio, advantagesTensor);
      const surrogate2 = tf.mul(clippedRatio, advantagesTensor);
      
      // Calculate policy loss (negative because we want to maximize)
      const policyLoss = tf.neg(tf.mean(tf.minimum(surrogate1, surrogate2)));
      
      // Calculate value loss if using critic
      let valueLoss = tf.scalar(0);
      if (this.config.useCritic) {
        const valuesPredicted = this.criticNetwork.predict(statesTensor).squeeze();
        valueLoss = tf.mean(tf.square(tf.sub(valuesPredicted, returnsTensor)));
      }
      
      // Calculate entropy loss (negative because we want to maximize)
      const entropyLoss = tf.neg(tf.mean(entropy));
      
      // Calculate total loss
      const totalLoss = tf.add(
        policyLoss,
        tf.add(
          tf.mul(this.config.valueCoef, valueLoss),
          tf.mul(this.config.entropyCoef, entropyLoss)
        )
      );
      
      return totalLoss;
    });
    
    // Clean up tensors
    statesTensor.dispose();
    actionsTensor.dispose();
    oldLogProbsTensor.dispose();
    advantagesTensor.dispose();
    returnsTensor.dispose();
    
    return { loss, policyLoss, valueLoss, entropyLoss };
  }
  
  /**
   * Shuffle array indices
   * @param {Number} length - Array length
   * @returns {Array} - Shuffled indices
   * @private
   */
  _shuffle(length) {
    const indices = Array.from({ length }, (_, i) => i);
    
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    return indices;
  }
}

module.exports = PPO;
