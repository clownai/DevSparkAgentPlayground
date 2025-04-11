/**
 * EnhancedQLearning.js
 * Enhanced implementation of Q-Learning with additional features
 */

class EnhancedQLearning {
  /**
   * Create a new EnhancedQLearning instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      learningRate: 0.1,
      discountFactor: 0.9,
      explorationRate: 0.1,
      explorationDecay: 0.995,
      minExplorationRate: 0.01,
      eligibilityTraceDecay: 0.9,
      useEligibilityTraces: false,
      useDoubleQLearning: false,
      useExperienceReplay: false,
      replayBufferSize: 1000,
      batchSize: 10,
      ...options
    };
    
    this.qTable = new Map(); // State -> (Action -> Value)
    this.qTable2 = new Map(); // For double Q-learning
    this.eligibilityTraces = new Map(); // State -> (Action -> Trace)
    this.replayBuffer = []; // For experience replay
    this.stepCounter = 0;
    
    this.logger = options.logger || console;
  }
  
  /**
   * Select an action using epsilon-greedy policy
   * @param {string} state - Current state representation
   * @param {Array<string>} availableActions - Available actions
   * @returns {string} Selected action
   */
  selectAction(state, availableActions) {
    // Epsilon-greedy exploration
    if (Math.random() < this.getCurrentExplorationRate()) {
      // Random action (exploration)
      const randomIndex = Math.floor(Math.random() * availableActions.length);
      return availableActions[randomIndex];
    } else {
      // Best action (exploitation)
      return this.getBestAction(state, availableActions);
    }
  }
  
  /**
   * Get the best action for a state
   * @param {string} state - Current state
   * @param {Array<string>} availableActions - Available actions
   * @returns {string} Best action
   */
  getBestAction(state, availableActions) {
    // Get Q-values for this state
    const qValues = this.getStateActionValues(state);
    
    // Find best action among available actions
    let bestAction = availableActions[0];
    let bestValue = qValues.get(bestAction) || 0;
    
    for (const action of availableActions) {
      const value = qValues.get(action) || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }
    
    return bestAction;
  }
  
  /**
   * Get Q-values for a state
   * @param {string} state - State to get values for
   * @returns {Map<string, number>} Action-value map
   */
  getStateActionValues(state) {
    // Get or create action-value map for this state
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map());
    }
    
    return this.qTable.get(state);
  }
  
  /**
   * Update Q-value for a state-action pair
   * @param {string} state - Current state
   * @param {string} action - Action taken
   * @param {number} reward - Reward received
   * @param {string} nextState - Next state
   * @param {Array<string>} nextAvailableActions - Available actions in next state
   * @returns {object} Update result
   */
  updateQValue(state, action, reward, nextState, nextAvailableActions) {
    // Get current Q-value
    const qValues = this.getStateActionValues(state);
    const currentValue = qValues.get(action) || 0;
    
    // Calculate target value based on algorithm variant
    let targetValue;
    
    if (this.options.useDoubleQLearning) {
      targetValue = this.calculateDoubleQTarget(state, action, reward, nextState, nextAvailableActions);
    } else {
      targetValue = this.calculateQTarget(state, action, reward, nextState, nextAvailableActions);
    }
    
    // Update Q-value
    const learningRate = this.options.learningRate;
    const newValue = currentValue + learningRate * (targetValue - currentValue);
    
    // Store updated Q-value
    qValues.set(action, newValue);
    
    // Update eligibility traces if enabled
    if (this.options.useEligibilityTraces) {
      this.updateEligibilityTraces(state, action);
    }
    
    // Add to experience replay buffer if enabled
    if (this.options.useExperienceReplay) {
      this.addToReplayBuffer(state, action, reward, nextState, nextAvailableActions);
    }
    
    // Increment step counter
    this.stepCounter++;
    
    // Decay exploration rate periodically
    if (this.stepCounter % 100 === 0) {
      this.decayExplorationRate();
    }
    
    return {
      oldValue: currentValue,
      newValue,
      difference: newValue - currentValue
    };
  }
  
  /**
   * Calculate target value for standard Q-learning
   * @param {string} state - Current state
   * @param {string} action - Action taken
   * @param {number} reward - Reward received
   * @param {string} nextState - Next state
   * @param {Array<string>} nextAvailableActions - Available actions in next state
   * @returns {number} Target value
   */
  calculateQTarget(state, action, reward, nextState, nextAvailableActions) {
    // Get maximum Q-value for next state
    const maxNextValue = this.getMaxQValue(nextState, nextAvailableActions);
    
    // Calculate target using Q-learning formula
    return reward + this.options.discountFactor * maxNextValue;
  }
  
  /**
   * Calculate target value for double Q-learning
   * @param {string} state - Current state
   * @param {string} action - Action taken
   * @param {number} reward - Reward received
   * @param {string} nextState - Next state
   * @param {Array<string>} nextAvailableActions - Available actions in next state
   * @returns {number} Target value
   */
  calculateDoubleQTarget(state, action, reward, nextState, nextAvailableActions) {
    // Randomly choose which Q-table to update
    const updateFirstTable = Math.random() < 0.5;
    
    if (updateFirstTable) {
      // Use first table to select action, second table to evaluate
      const bestAction = this.getBestActionFromTable(this.qTable, nextState, nextAvailableActions);
      const nextValue = this.getQValueFromTable(this.qTable2, nextState, bestAction);
      
      return reward + this.options.discountFactor * nextValue;
    } else {
      // Use second table to select action, first table to evaluate
      const bestAction = this.getBestActionFromTable(this.qTable2, nextState, nextAvailableActions);
      const nextValue = this.getQValueFromTable(this.qTable, nextState, bestAction);
      
      return reward + this.options.discountFactor * nextValue;
    }
  }
  
  /**
   * Get maximum Q-value for a state
   * @param {string} state - State to evaluate
   * @param {Array<string>} availableActions - Available actions
   * @returns {number} Maximum Q-value
   */
  getMaxQValue(state, availableActions) {
    if (!availableActions || availableActions.length === 0) {
      return 0;
    }
    
    const qValues = this.getStateActionValues(state);
    let maxValue = Number.NEGATIVE_INFINITY;
    
    for (const action of availableActions) {
      const value = qValues.get(action) || 0;
      maxValue = Math.max(maxValue, value);
    }
    
    return maxValue === Number.NEGATIVE_INFINITY ? 0 : maxValue;
  }
  
  /**
   * Get best action from a specific Q-table
   * @param {Map<string, Map<string, number>>} qTable - Q-table to use
   * @param {string} state - State to evaluate
   * @param {Array<string>} availableActions - Available actions
   * @returns {string} Best action
   */
  getBestActionFromTable(qTable, state, availableActions) {
    if (!availableActions || availableActions.length === 0) {
      return null;
    }
    
    // Get or create action-value map for this state
    if (!qTable.has(state)) {
      qTable.set(state, new Map());
    }
    
    const qValues = qTable.get(state);
    let bestAction = availableActions[0];
    let bestValue = qValues.get(bestAction) || 0;
    
    for (const action of availableActions) {
      const value = qValues.get(action) || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }
    
    return bestAction;
  }
  
  /**
   * Get Q-value from a specific Q-table
   * @param {Map<string, Map<string, number>>} qTable - Q-table to use
   * @param {string} state - State to evaluate
   * @param {string} action - Action to evaluate
   * @returns {number} Q-value
   */
  getQValueFromTable(qTable, state, action) {
    if (!action) {
      return 0;
    }
    
    // Get or create action-value map for this state
    if (!qTable.has(state)) {
      qTable.set(state, new Map());
    }
    
    return qTable.get(state).get(action) || 0;
  }
  
  /**
   * Update eligibility traces
   * @param {string} state - Current state
   * @param {string} action - Action taken
   */
  updateEligibilityTraces(state, action) {
    // Decay all traces
    for (const [traceState, actionTraces] of this.eligibilityTraces.entries()) {
      for (const [traceAction, traceValue] of actionTraces.entries()) {
        actionTraces.set(traceAction, traceValue * this.options.eligibilityTraceDecay);
      }
    }
    
    // Set trace for current state-action pair to 1
    if (!this.eligibilityTraces.has(state)) {
      this.eligibilityTraces.set(state, new Map());
    }
    
    this.eligibilityTraces.get(state).set(action, 1);
  }
  
  /**
   * Add experience to replay buffer
   * @param {string} state - Current state
   * @param {string} action - Action taken
   * @param {number} reward - Reward received
   * @param {string} nextState - Next state
   * @param {Array<string>} nextAvailableActions - Available actions in next state
   */
  addToReplayBuffer(state, action, reward, nextState, nextAvailableActions) {
    this.replayBuffer.push({
      state,
      action,
      reward,
      nextState,
      nextAvailableActions
    });
    
    // Limit buffer size
    if (this.replayBuffer.length > this.options.replayBufferSize) {
      this.replayBuffer.shift();
    }
  }
  
  /**
   * Learn from replay buffer
   * @returns {object} Learning statistics
   */
  learnFromReplayBuffer() {
    if (!this.options.useExperienceReplay || this.replayBuffer.length < this.options.batchSize) {
      return {
        success: false,
        message: `Not enough experiences for replay (${this.replayBuffer.length}/${this.options.batchSize})`,
        updatesPerformed: 0
      };
    }
    
    // Sample batch from replay buffer
    const batch = this.sampleBatch();
    let totalDifference = 0;
    
    // Update Q-values for each experience in batch
    for (const experience of batch) {
      const { state, action, reward, nextState, nextAvailableActions } = experience;
      
      // Get current Q-value
      const qValues = this.getStateActionValues(state);
      const currentValue = qValues.get(action) || 0;
      
      // Calculate target value
      let targetValue;
      
      if (this.options.useDoubleQLearning) {
        targetValue = this.calculateDoubleQTarget(state, action, reward, nextState, nextAvailableActions);
      } else {
        targetValue = this.calculateQTarget(state, action, reward, nextState, nextAvailableActions);
      }
      
      // Update Q-value
      const learningRate = this.options.learningRate;
      const newValue = currentValue + learningRate * (targetValue - currentValue);
      
      // Store updated Q-value
      qValues.set(action, newValue);
      
      // Track difference
      totalDifference += Math.abs(newValue - currentValue);
    }
    
    return {
      success: true,
      batchSize: batch.length,
      averageDifference: totalDifference / batch.length,
      updatesPerformed: batch.length
    };
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
   * Export Q-table as a serializable object
   * @returns {object} Exported Q-table
   */
  exportQTable() {
    const exportedQTable = {};
    
    for (const [state, actionValues] of this.qTable.entries()) {
      exportedQTable[state] = {};
      
      for (const [action, value] of actionValues.entries()) {
        exportedQTable[state][action] = value;
      }
    }
    
    const exportedQTable2 = {};
    
    if (this.options.useDoubleQLearning) {
      for (const [state, actionValues] of this.qTable2.entries()) {
        exportedQTable2[state] = {};
        
        for (const [action, value] of actionValues.entries()) {
          exportedQTable2[state][action] = value;
        }
      }
    }
    
    return {
      type: 'enhanced-q-learning',
      qTable: exportedQTable,
      qTable2: this.options.useDoubleQLearning ? exportedQTable2 : null,
      parameters: {
        learningRate: this.options.learningRate,
        discountFactor: this.options.discountFactor,
        explorationRate: this.options.explorationRate,
        useEligibilityTraces: this.options.useEligibilityTraces,
        useDoubleQLearning: this.options.useDoubleQLearning,
        useExperienceReplay: this.options.useExperienceReplay
      },
      stats: {
        stateCount: this.qTable.size,
        stepCount: this.stepCounter
      }
    };
  }
  
  /**
   * Import Q-table from a serialized object
   * @param {object} data - Imported Q-table data
   * @returns {boolean} Import success
   */
  importQTable(data) {
    if (data.type !== 'enhanced-q-learning') {
      throw new Error(`Incompatible Q-table type: ${data.type}`);
    }
    
    // Import Q-table
    this.qTable = new Map();
    
    for (const [state, actionValues] of Object.entries(data.qTable)) {
      const stateActionValues = new Map();
      
      for (const [action, value] of Object.entries(actionValues)) {
        stateActionValues.set(action, value);
      }
      
      this.qTable.set(state, stateActionValues);
    }
    
    // Import second Q-table if available
    if (data.qTable2) {
      this.qTable2 = new Map();
      
      for (const [state, actionValues] of Object.entries(data.qTable2)) {
        const stateActionValues = new Map();
        
        for (const [action, value] of Object.entries(actionValues)) {
          stateActionValues.set(action, value);
        }
        
        this.qTable2.set(state, stateActionValues);
      }
    }
    
    // Import parameters
    if (data.parameters) {
      this.options = {
        ...this.options,
        ...data.parameters
      };
    }
    
    return true;
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
   * Reset eligibility traces
   * @returns {number} Number of traces cleared
   */
  resetEligibilityTraces() {
    const count = this.eligibilityTraces.size;
    this.eligibilityTraces = new Map();
    return count;
  }
  
  /**
   * Get statistics about the Q-table
   * @returns {object} Q-table statistics
   */
  getQTableStats() {
    let totalStateActionPairs = 0;
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    let sumValues = 0;
    
    for (const actionValues of this.qTable.values()) {
      for (const value of actionValues.values()) {
        totalStateActionPairs++;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
        sumValues += value;
      }
    }
    
    const avgValue = totalStateActionPairs > 0 ? sumValues / totalStateActionPairs : 0;
    
    return {
      stateCount: this.qTable.size,
      stateActionPairCount: totalStateActionPairs,
      minValue: minValue === Number.POSITIVE_INFINITY ? 0 : minValue,
      maxValue: maxValue === Number.NEGATIVE_INFINITY ? 0 : maxValue,
      avgValue
    };
  }
}

module.exports = EnhancedQLearning;
