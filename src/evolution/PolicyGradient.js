/**
 * PolicyGradient.js
 * Implementation of policy gradient methods for reinforcement learning
 */

class PolicyGradient {
  /**
   * Create a new PolicyGradient instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      learningRate: 0.01,
      discountFactor: 0.99,
      entropyCoefficient: 0.01,
      useBaseline: true,
      ...options
    };
    
    this.policy = new Map(); // State -> Action probabilities
    this.baseline = new Map(); // State -> Value estimate
    this.episodes = []; // Store episode data for batch updates
    this.currentEpisode = null;
    
    this.logger = options.logger || console;
  }
  
  /**
   * Initialize a new episode
   * @returns {object} Episode information
   */
  initializeEpisode() {
    this.currentEpisode = {
      steps: [],
      totalReward: 0
    };
    
    return this.currentEpisode;
  }
  
  /**
   * Select an action based on the current policy
   * @param {string} state - Current state representation
   * @param {Array<string>} availableActions - Available actions
   * @returns {object} Selected action and probability
   */
  selectAction(state, availableActions) {
    // Get action probabilities for this state
    let actionProbs = this.policy.get(state);
    
    // If no policy exists for this state, initialize with uniform distribution
    if (!actionProbs) {
      actionProbs = new Map();
      const uniformProb = 1.0 / availableActions.length;
      
      for (const action of availableActions) {
        actionProbs.set(action, uniformProb);
      }
      
      this.policy.set(state, actionProbs);
    }
    
    // Ensure all available actions have a probability
    for (const action of availableActions) {
      if (!actionProbs.has(action)) {
        // Add new action with small probability
        const existingActionsCount = actionProbs.size;
        const newProb = 0.1;
        const remainingProb = 1.0 - newProb;
        
        // Redistribute probabilities
        for (const [existingAction, prob] of actionProbs.entries()) {
          actionProbs.set(existingAction, prob * remainingProb);
        }
        
        actionProbs.set(action, newProb);
      }
    }
    
    // Sample action based on probabilities
    const random = Math.random();
    let cumulativeProb = 0;
    let selectedAction = availableActions[0]; // Default to first action
    let selectedProb = 0;
    
    for (const [action, prob] of actionProbs.entries()) {
      if (availableActions.includes(action)) {
        cumulativeProb += prob;
        
        if (random < cumulativeProb) {
          selectedAction = action;
          selectedProb = prob;
          break;
        }
      }
    }
    
    // Record action in current episode
    if (this.currentEpisode) {
      this.currentEpisode.steps.push({
        state,
        action: selectedAction,
        probability: selectedProb,
        reward: null, // Will be filled in later
        nextState: null // Will be filled in later
      });
    }
    
    return {
      action: selectedAction,
      probability: selectedProb
    };
  }
  
  /**
   * Record a step in the current episode
   * @param {string} state - Current state
   * @param {string} action - Selected action
   * @param {number} reward - Received reward
   * @param {string} nextState - Next state
   * @param {boolean} done - Whether episode is done
   * @returns {object} Updated episode information
   */
  recordStep(state, action, reward, nextState, done) {
    if (!this.currentEpisode) {
      this.initializeEpisode();
    }
    
    // Find the last step with matching state and action
    const stepIndex = this.currentEpisode.steps.findIndex(step => 
      step.state === state && step.action === action && step.reward === null
    );
    
    if (stepIndex >= 0) {
      // Update the step
      this.currentEpisode.steps[stepIndex].reward = reward;
      this.currentEpisode.steps[stepIndex].nextState = nextState;
      this.currentEpisode.steps[stepIndex].done = done;
      
      // Update episode total reward
      this.currentEpisode.totalReward += reward;
    } else {
      // If step not found, add a new one
      this.currentEpisode.steps.push({
        state,
        action,
        probability: 0.5, // Default probability
        reward,
        nextState,
        done
      });
      
      this.currentEpisode.totalReward += reward;
    }
    
    // If episode is done, store it for batch update
    if (done) {
      this.episodes.push(this.currentEpisode);
      this.currentEpisode = null;
    }
    
    return this.currentEpisode;
  }
  
  /**
   * Calculate returns for each step in an episode
   * @param {Array<object>} steps - Episode steps
   * @returns {Array<number>} Returns for each step
   */
  calculateReturns(steps) {
    const returns = new Array(steps.length).fill(0);
    let cumulativeReturn = 0;
    
    // Calculate returns in reverse order
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      cumulativeReturn = step.reward + this.options.discountFactor * cumulativeReturn;
      returns[i] = cumulativeReturn;
    }
    
    return returns;
  }
  
  /**
   * Calculate baseline values for each state
   * @param {Array<object>} episodes - Episodes data
   * @returns {Map<string, number>} Updated baseline values
   */
  updateBaseline(episodes) {
    const stateReturns = new Map(); // State -> [returns]
    
    // Collect returns for each state
    for (const episode of episodes) {
      const returns = this.calculateReturns(episode.steps);
      
      for (let i = 0; i < episode.steps.length; i++) {
        const state = episode.steps[i].state;
        const returnValue = returns[i];
        
        if (!stateReturns.has(state)) {
          stateReturns.set(state, []);
        }
        
        stateReturns.get(state).push(returnValue);
      }
    }
    
    // Calculate average return for each state
    for (const [state, returns] of stateReturns.entries()) {
      const averageReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
      
      // Update baseline with exponential moving average
      if (this.baseline.has(state)) {
        const currentBaseline = this.baseline.get(state);
        this.baseline.set(state, 0.9 * currentBaseline + 0.1 * averageReturn);
      } else {
        this.baseline.set(state, averageReturn);
      }
    }
    
    return this.baseline;
  }
  
  /**
   * Update policy based on collected episodes
   * @param {number} batchSize - Number of episodes to use for update
   * @returns {object} Update statistics
   */
  updatePolicy(batchSize = 1) {
    // Check if we have enough episodes
    if (this.episodes.length < batchSize) {
      return {
        success: false,
        message: `Not enough episodes for update (${this.episodes.length}/${batchSize})`,
        episodesProcessed: 0
      };
    }
    
    // Take the most recent episodes
    const episodesToProcess = this.episodes.slice(-batchSize);
    
    // Update baseline if using it
    if (this.options.useBaseline) {
      this.updateBaseline(episodesToProcess);
    }
    
    // Process each episode
    const gradients = new Map(); // State -> Action -> Gradient
    let totalSteps = 0;
    
    for (const episode of episodesToProcess) {
      const returns = this.calculateReturns(episode.steps);
      
      // Process each step
      for (let i = 0; i < episode.steps.length; i++) {
        const step = episode.steps[i];
        const state = step.state;
        const action = step.action;
        const returnValue = returns[i];
        
        // Calculate advantage
        let advantage = returnValue;
        if (this.options.useBaseline && this.baseline.has(state)) {
          advantage = returnValue - this.baseline.get(state);
        }
        
        // Initialize gradients for this state if needed
        if (!gradients.has(state)) {
          gradients.set(state, new Map());
        }
        
        // Initialize gradient for this action if needed
        if (!gradients.get(state).has(action)) {
          gradients.get(state).set(action, 0);
        }
        
        // Accumulate gradient
        // For policy gradient, gradient is proportional to advantage / probability
        const actionProb = step.probability;
        const gradient = advantage / actionProb;
        
        gradients.get(state).set(
          action, 
          gradients.get(state).get(action) + gradient
        );
        
        totalSteps++;
      }
    }
    
    // Apply gradients to policy
    let totalPolicyChange = 0;
    
    for (const [state, actionGradients] of gradients.entries()) {
      // Get current policy for this state
      let actionProbs = this.policy.get(state);
      
      if (!actionProbs) {
        actionProbs = new Map();
        this.policy.set(state, actionProbs);
      }
      
      // Apply gradients
      for (const [action, gradient] of actionGradients.entries()) {
        // Get current probability
        const currentProb = actionProbs.get(action) || 0.1;
        
        // Calculate new probability using soft update
        const learningRate = this.options.learningRate;
        const newProb = currentProb + learningRate * gradient;
        
        // Store policy change for statistics
        totalPolicyChange += Math.abs(newProb - currentProb);
        
        // Update action probability
        actionProbs.set(action, newProb);
      }
      
      // Normalize probabilities
      this.normalizeActionProbabilities(state);
    }
    
    // Remove processed episodes
    this.episodes = this.episodes.slice(0, -batchSize);
    
    return {
      success: true,
      episodesProcessed: episodesToProcess.length,
      totalSteps,
      averagePolicyChange: totalPolicyChange / totalSteps,
      remainingEpisodes: this.episodes.length
    };
  }
  
  /**
   * Normalize action probabilities for a state
   * @param {string} state - State to normalize
   * @returns {Map<string, number>} Normalized probabilities
   */
  normalizeActionProbabilities(state) {
    const actionProbs = this.policy.get(state);
    
    if (!actionProbs || actionProbs.size === 0) {
      return actionProbs;
    }
    
    // Calculate sum of probabilities
    let sum = 0;
    for (const prob of actionProbs.values()) {
      sum += Math.max(0, prob); // Ensure non-negative
    }
    
    // Normalize
    if (sum > 0) {
      for (const [action, prob] of actionProbs.entries()) {
        actionProbs.set(action, Math.max(0, prob) / sum);
      }
    } else {
      // If all probabilities are negative or zero, reset to uniform
      const uniformProb = 1.0 / actionProbs.size;
      for (const action of actionProbs.keys()) {
        actionProbs.set(action, uniformProb);
      }
    }
    
    return actionProbs;
  }
  
  /**
   * Calculate policy entropy for a state
   * @param {string} state - State to calculate entropy for
   * @returns {number} Entropy value
   */
  calculateEntropy(state) {
    const actionProbs = this.policy.get(state);
    
    if (!actionProbs || actionProbs.size === 0) {
      return 0;
    }
    
    let entropy = 0;
    for (const prob of actionProbs.values()) {
      if (prob > 0) {
        entropy -= prob * Math.log(prob);
      }
    }
    
    return entropy;
  }
  
  /**
   * Export policy as a serializable object
   * @returns {object} Exported policy
   */
  exportPolicy() {
    const exportedPolicy = {};
    
    for (const [state, actionProbs] of this.policy.entries()) {
      exportedPolicy[state] = {};
      
      for (const [action, prob] of actionProbs.entries()) {
        exportedPolicy[state][action] = prob;
      }
    }
    
    return {
      type: 'policy-gradient',
      policy: exportedPolicy,
      baseline: Object.fromEntries(this.baseline),
      parameters: {
        learningRate: this.options.learningRate,
        discountFactor: this.options.discountFactor,
        entropyCoefficient: this.options.entropyCoefficient,
        useBaseline: this.options.useBaseline
      }
    };
  }
  
  /**
   * Import policy from a serialized object
   * @param {object} data - Imported policy data
   * @returns {boolean} Success status
   */
  importPolicy(data) {
    if (data.type !== 'policy-gradient') {
      throw new Error(`Incompatible policy type: ${data.type}`);
    }
    
    // Import policy
    this.policy = new Map();
    
    for (const [state, actionProbs] of Object.entries(data.policy)) {
      const stateActionProbs = new Map();
      
      for (const [action, prob] of Object.entries(actionProbs)) {
        stateActionProbs.set(action, prob);
      }
      
      this.policy.set(state, stateActionProbs);
    }
    
    // Import baseline
    this.baseline = new Map();
    
    if (data.baseline) {
      for (const [state, value] of Object.entries(data.baseline)) {
        this.baseline.set(state, value);
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
   * Clear all episodes
   * @returns {number} Number of episodes cleared
   */
  clearEpisodes() {
    const count = this.episodes.length;
    this.episodes = [];
    this.currentEpisode = null;
    return count;
  }
}

module.exports = PolicyGradient;
