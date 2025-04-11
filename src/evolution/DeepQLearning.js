/**
 * DeepQLearning.js
 * Implementation of Deep Q-Learning for reinforcement learning
 */

class DeepQLearning {
  /**
   * Create a new DeepQLearning instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      learningRate: 0.001,
      discountFactor: 0.99,
      explorationRate: 0.1,
      explorationDecay: 0.995,
      minExplorationRate: 0.01,
      batchSize: 32,
      replayBufferSize: 10000,
      targetUpdateFrequency: 100,
      hiddenLayers: [64, 64],
      activationFunction: 'relu',
      ...options
    };
    
    this.replayBuffer = [];
    this.qNetwork = null;
    this.targetNetwork = null;
    this.updateCounter = 0;
    this.stepCounter = 0;
    
    this.logger = options.logger || console;
    
    // Initialize TensorFlow.js if available
    this.tf = null;
    try {
      this.tf = require('@tensorflow/tfjs-node');
      this.logger.info('TensorFlow.js loaded successfully');
    } catch (error) {
      this.logger.warn('TensorFlow.js not available, using placeholder implementation');
    }
  }
  
  /**
   * Initialize the networks
   * @param {number} inputDimension - Input state dimension
   * @param {number} outputDimension - Number of possible actions
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(inputDimension, outputDimension) {
    this.inputDimension = inputDimension;
    this.outputDimension = outputDimension;
    
    if (this.tf) {
      // Create Q-Network
      this.qNetwork = this.createNetwork(inputDimension, outputDimension);
      
      // Create target network (initially a copy of Q-network)
      this.targetNetwork = this.createNetwork(inputDimension, outputDimension);
      await this.updateTargetNetwork();
      
      return true;
    } else {
      // Placeholder implementation when TensorFlow is not available
      this.qNetwork = {
        predict: (state) => {
          return Array(outputDimension).fill(0).map(() => Math.random());
        }
      };
      
      this.targetNetwork = {
        predict: (state) => {
          return Array(outputDimension).fill(0).map(() => Math.random());
        }
      };
      
      this.logger.warn('Using placeholder implementation for Deep Q-Learning');
      return false;
    }
  }
  
  /**
   * Create a neural network model
   * @param {number} inputDimension - Input state dimension
   * @param {number} outputDimension - Number of possible actions
   * @returns {object} Neural network model
   */
  createNetwork(inputDimension, outputDimension) {
    if (!this.tf) {
      return null;
    }
    
    const model = this.tf.sequential();
    
    // Input layer
    model.add(this.tf.layers.dense({
      units: this.options.hiddenLayers[0],
      activation: this.options.activationFunction,
      inputShape: [inputDimension]
    }));
    
    // Hidden layers
    for (let i = 1; i < this.options.hiddenLayers.length; i++) {
      model.add(this.tf.layers.dense({
        units: this.options.hiddenLayers[i],
        activation: this.options.activationFunction
      }));
    }
    
    // Output layer
    model.add(this.tf.layers.dense({
      units: outputDimension,
      activation: 'linear'
    }));
    
    // Compile model
    model.compile({
      optimizer: this.tf.train.adam(this.options.learningRate),
      loss: 'meanSquaredError'
    });
    
    return model;
  }
  
  /**
   * Select an action using epsilon-greedy policy
   * @param {Array<number>} state - Current state vector
   * @returns {Promise<number>} Selected action index
   */
  async selectAction(state) {
    // Epsilon-greedy exploration
    if (Math.random() < this.getCurrentExplorationRate()) {
      // Random action
      return Math.floor(Math.random() * this.outputDimension);
    } else {
      // Best action according to Q-network
      const stateTensor = this.createStateTensor(state);
      const qValues = await this.predictQValues(stateTensor);
      return this.argmax(qValues);
    }
  }
  
  /**
   * Add experience to replay buffer
   * @param {Array<number>} state - Current state
   * @param {number} action - Action taken
   * @param {number} reward - Reward received
   * @param {Array<number>} nextState - Next state
   * @param {boolean} done - Whether episode is done
   */
  addExperience(state, action, reward, nextState, done) {
    // Add to replay buffer
    this.replayBuffer.push({
      state,
      action,
      reward,
      nextState,
      done
    });
    
    // Limit buffer size
    if (this.replayBuffer.length > this.options.replayBufferSize) {
      this.replayBuffer.shift();
    }
    
    // Increment step counter
    this.stepCounter++;
    
    // Decay exploration rate
    if (this.stepCounter % 100 === 0) {
      this.decayExplorationRate();
    }
  }
  
  /**
   * Train the network using a batch from replay buffer
   * @returns {Promise<object>} Training statistics
   */
  async trainNetwork() {
    // Check if enough experiences are collected
    if (this.replayBuffer.length < this.options.batchSize) {
      return {
        success: false,
        message: `Not enough experiences for training (${this.replayBuffer.length}/${this.options.batchSize})`,
        loss: null
      };
    }
    
    if (!this.tf) {
      return {
        success: false,
        message: 'TensorFlow.js not available',
        loss: null
      };
    }
    
    try {
      // Sample batch from replay buffer
      const batch = this.sampleBatch();
      
      // Prepare tensors
      const stateTensor = this.tf.tensor2d(
        batch.map(exp => exp.state),
        [batch.length, this.inputDimension]
      );
      
      const nextStateTensor = this.tf.tensor2d(
        batch.map(exp => exp.nextState),
        [batch.length, this.inputDimension]
      );
      
      // Get current Q-values for all actions
      const currentQTensor = await this.qNetwork.predict(stateTensor);
      const currentQ = await currentQTensor.array();
      
      // Get next Q-values from target network
      const nextQTensor = await this.targetNetwork.predict(nextStateTensor);
      const nextQ = await nextQTensor.array();
      
      // Calculate target Q-values
      const targetQ = [...currentQ];
      
      for (let i = 0; i < batch.length; i++) {
        const { action, reward, done } = batch[i];
        
        if (done) {
          // Terminal state
          targetQ[i][action] = reward;
        } else {
          // Non-terminal state
          const maxNextQ = Math.max(...nextQ[i]);
          targetQ[i][action] = reward + this.options.discountFactor * maxNextQ;
        }
      }
      
      // Train network
      const targetQTensor = this.tf.tensor2d(targetQ);
      const result = await this.qNetwork.fit(stateTensor, targetQTensor, {
        epochs: 1,
        batchSize: batch.length,
        verbose: 0
      });
      
      // Update target network if needed
      this.updateCounter++;
      if (this.updateCounter >= this.options.targetUpdateFrequency) {
        await this.updateTargetNetwork();
        this.updateCounter = 0;
      }
      
      // Clean up tensors
      stateTensor.dispose();
      nextStateTensor.dispose();
      currentQTensor.dispose();
      nextQTensor.dispose();
      targetQTensor.dispose();
      
      return {
        success: true,
        loss: result.history.loss[0],
        batchSize: batch.length
      };
    } catch (error) {
      this.logger.error(`Training error: ${error.message}`, error);
      return {
        success: false,
        message: error.message,
        loss: null
      };
    }
  }
  
  /**
   * Update target network with weights from Q-network
   * @returns {Promise<boolean>} Update success
   */
  async updateTargetNetwork() {
    if (!this.tf || !this.qNetwork || !this.targetNetwork) {
      return false;
    }
    
    try {
      const weights = this.qNetwork.getWeights();
      this.targetNetwork.setWeights(weights);
      return true;
    } catch (error) {
      this.logger.error(`Target network update error: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Sample a batch from replay buffer
   * @returns {Array<object>} Batch of experiences
   */
  sampleBatch() {
    const batch = [];
    const bufferSize = this.replayBuffer.length;
    
    // Sample without replacement
    const indices = new Set();
    while (indices.size < Math.min(this.options.batchSize, bufferSize)) {
      indices.add(Math.floor(Math.random() * bufferSize));
    }
    
    // Create batch
    for (const index of indices) {
      batch.push(this.replayBuffer[index]);
    }
    
    return batch;
  }
  
  /**
   * Create a tensor from state
   * @param {Array<number>} state - State vector
   * @returns {object} State tensor
   */
  createStateTensor(state) {
    if (!this.tf) {
      return state;
    }
    
    return this.tf.tensor2d([state], [1, this.inputDimension]);
  }
  
  /**
   * Predict Q-values for a state
   * @param {object} stateTensor - State tensor
   * @returns {Promise<Array<number>>} Q-values
   */
  async predictQValues(stateTensor) {
    if (!this.tf) {
      return Array(this.outputDimension).fill(0).map(() => Math.random());
    }
    
    try {
      const qValuesTensor = await this.qNetwork.predict(stateTensor);
      const qValues = await qValuesTensor.array();
      qValuesTensor.dispose();
      return qValues[0];
    } catch (error) {
      this.logger.error(`Prediction error: ${error.message}`, error);
      return Array(this.outputDimension).fill(0);
    }
  }
  
  /**
   * Get current exploration rate
   * @returns {number} Current exploration rate
   */
  getCurrentExplorationRate() {
    return Math.max(
      this.options.minExplorationRate,
      this.options.explorationRate * Math.pow(this.options.explorationDecay, this.stepCounter / 1000)
    );
  }
  
  /**
   * Decay exploration rate
   * @returns {number} New exploration rate
   */
  decayExplorationRate() {
    this.options.explorationRate = Math.max(
      this.options.minExplorationRate,
      this.options.explorationRate * this.options.explorationDecay
    );
    
    return this.options.explorationRate;
  }
  
  /**
   * Find index of maximum value in array
   * @param {Array<number>} array - Input array
   * @returns {number} Index of maximum value
   */
  argmax(array) {
    return array.indexOf(Math.max(...array));
  }
  
  /**
   * Export model as a serializable object
   * @returns {Promise<object>} Exported model
   */
  async exportModel() {
    if (!this.tf || !this.qNetwork) {
      return {
        type: 'deep-q-learning',
        message: 'Model not available for export',
        parameters: this.options
      };
    }
    
    try {
      // Export weights
      const weights = this.qNetwork.getWeights();
      const serializedWeights = weights.map(w => {
        const data = w.dataSync();
        return {
          shape: w.shape,
          data: Array.from(data)
        };
      });
      
      return {
        type: 'deep-q-learning',
        architecture: {
          inputDimension: this.inputDimension,
          outputDimension: this.outputDimension,
          hiddenLayers: this.options.hiddenLayers,
          activationFunction: this.options.activationFunction
        },
        weights: serializedWeights,
        parameters: {
          learningRate: this.options.learningRate,
          discountFactor: this.options.discountFactor,
          explorationRate: this.options.explorationRate,
          batchSize: this.options.batchSize,
          targetUpdateFrequency: this.options.targetUpdateFrequency
        }
      };
    } catch (error) {
      this.logger.error(`Export error: ${error.message}`, error);
      return {
        type: 'deep-q-learning',
        message: `Export failed: ${error.message}`,
        parameters: this.options
      };
    }
  }
  
  /**
   * Import model from a serialized object
   * @param {object} data - Imported model data
   * @returns {Promise<boolean>} Import success
   */
  async importModel(data) {
    if (data.type !== 'deep-q-learning') {
      throw new Error(`Incompatible model type: ${data.type}`);
    }
    
    if (!this.tf) {
      this.logger.warn('TensorFlow.js not available, cannot import model');
      return false;
    }
    
    try {
      // Import architecture
      if (data.architecture) {
        this.inputDimension = data.architecture.inputDimension;
        this.outputDimension = data.architecture.outputDimension;
        this.options.hiddenLayers = data.architecture.hiddenLayers;
        this.options.activationFunction = data.architecture.activationFunction;
      }
      
      // Create networks if they don't exist
      if (!this.qNetwork || !this.targetNetwork) {
        this.qNetwork = this.createNetwork(this.inputDimension, this.outputDimension);
        this.targetNetwork = this.createNetwork(this.inputDimension, this.outputDimension);
      }
      
      // Import weights
      if (data.weights) {
        const weights = data.weights.map(w => {
          return this.tf.tensor(w.data, w.shape);
        });
        
        this.qNetwork.setWeights(weights);
        await this.updateTargetNetwork();
      }
      
      // Import parameters
      if (data.parameters) {
        this.options = {
          ...this.options,
          ...data.parameters
        };
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Import error: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Clear replay buffer
   * @returns {number} Number of experiences cleared
   */
  clearReplayBuffer() {
    const count = this.replayBuffer.length;
    this.replayBuffer = [];
    return count;
  }
  
  /**
   * Get replay buffer statistics
   * @returns {object} Buffer statistics
   */
  getBufferStats() {
    return {
      size: this.replayBuffer.length,
      capacity: this.options.replayBufferSize,
      usage: this.replayBuffer.length / this.options.replayBufferSize
    };
  }
}

module.exports = DeepQLearning;
