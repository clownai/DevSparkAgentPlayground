/**
 * KnowledgeTransfer.js
 * Implementation of knowledge transfer mechanisms between agents
 */

class KnowledgeTransfer {
  /**
   * Create a new KnowledgeTransfer instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      validateKnowledge: true,
      mergeStrategy: 'weighted', // 'replace', 'weighted', 'max'
      mergeWeight: 0.5, // Weight for target knowledge when merging (0-1)
      compatibilityThreshold: 0.7, // Minimum compatibility score to allow transfer
      ...options
    };
    
    this.transferHistory = [];
    this.knowledgeRegistry = new Map(); // agentId -> knowledge
    
    this.logger = options.logger || console;
  }
  
  /**
   * Register an agent's knowledge
   * @param {string} agentId - Agent ID
   * @param {object} knowledge - Knowledge object
   * @param {object} metadata - Additional metadata
   * @returns {boolean} Registration success
   */
  registerKnowledge(agentId, knowledge, metadata = {}) {
    if (!knowledge || !knowledge.type) {
      this.logger.error(`Invalid knowledge format for agent ${agentId}`);
      return false;
    }
    
    this.knowledgeRegistry.set(agentId, {
      agentId,
      knowledge,
      metadata: {
        registeredAt: Date.now(),
        lastUpdated: Date.now(),
        ...metadata
      }
    });
    
    this.logger.info(`Registered knowledge for agent ${agentId} of type ${knowledge.type}`);
    return true;
  }
  
  /**
   * Update an agent's knowledge
   * @param {string} agentId - Agent ID
   * @param {object} knowledge - Knowledge object
   * @param {object} metadata - Additional metadata
   * @returns {boolean} Update success
   */
  updateKnowledge(agentId, knowledge, metadata = {}) {
    if (!this.knowledgeRegistry.has(agentId)) {
      return this.registerKnowledge(agentId, knowledge, metadata);
    }
    
    const entry = this.knowledgeRegistry.get(agentId);
    
    // Check if knowledge type matches
    if (entry.knowledge.type !== knowledge.type) {
      this.logger.error(`Knowledge type mismatch for agent ${agentId}: ${entry.knowledge.type} vs ${knowledge.type}`);
      return false;
    }
    
    // Update knowledge
    entry.knowledge = knowledge;
    entry.metadata = {
      ...entry.metadata,
      lastUpdated: Date.now(),
      ...metadata
    };
    
    this.logger.info(`Updated knowledge for agent ${agentId} of type ${knowledge.type}`);
    return true;
  }
  
  /**
   * Get an agent's knowledge
   * @param {string} agentId - Agent ID
   * @returns {object|null} Knowledge object or null if not found
   */
  getKnowledge(agentId) {
    if (!this.knowledgeRegistry.has(agentId)) {
      return null;
    }
    
    return this.knowledgeRegistry.get(agentId);
  }
  
  /**
   * Transfer knowledge from one agent to another
   * @param {string} sourceAgentId - Source agent ID
   * @param {string} targetAgentId - Target agent ID
   * @param {object} options - Transfer options
   * @returns {object} Transfer result
   */
  transferKnowledge(sourceAgentId, targetAgentId, options = {}) {
    // Get source knowledge
    const sourceEntry = this.knowledgeRegistry.get(sourceAgentId);
    if (!sourceEntry) {
      return {
        success: false,
        message: `Source agent ${sourceAgentId} not found in knowledge registry`
      };
    }
    
    // Get target knowledge
    const targetEntry = this.knowledgeRegistry.get(targetAgentId);
    if (!targetEntry) {
      return {
        success: false,
        message: `Target agent ${targetAgentId} not found in knowledge registry`
      };
    }
    
    // Check compatibility
    const compatibility = this.checkCompatibility(sourceEntry.knowledge, targetEntry.knowledge);
    if (compatibility.score < this.options.compatibilityThreshold) {
      return {
        success: false,
        message: `Knowledge compatibility below threshold: ${compatibility.score.toFixed(2)} < ${this.options.compatibilityThreshold}`,
        compatibility
      };
    }
    
    // Merge knowledge
    const mergeOptions = {
      strategy: options.mergeStrategy || this.options.mergeStrategy,
      weight: options.mergeWeight || this.options.mergeWeight,
      ...options
    };
    
    const mergeResult = this.mergeKnowledge(
      sourceEntry.knowledge,
      targetEntry.knowledge,
      mergeOptions
    );
    
    if (!mergeResult.success) {
      return {
        success: false,
        message: `Failed to merge knowledge: ${mergeResult.message}`,
        compatibility
      };
    }
    
    // Update target knowledge
    targetEntry.knowledge = mergeResult.knowledge;
    targetEntry.metadata.lastUpdated = Date.now();
    targetEntry.metadata.lastTransferFrom = sourceAgentId;
    
    // Record transfer in history
    const transferRecord = {
      timestamp: Date.now(),
      sourceAgentId,
      targetAgentId,
      knowledgeType: sourceEntry.knowledge.type,
      compatibility: compatibility.score,
      mergeStrategy: mergeOptions.strategy,
      mergeWeight: mergeOptions.weight,
      result: mergeResult.stats
    };
    
    this.transferHistory.push(transferRecord);
    
    return {
      success: true,
      sourceAgentId,
      targetAgentId,
      knowledgeType: sourceEntry.knowledge.type,
      compatibility: compatibility.score,
      mergeStats: mergeResult.stats,
      transferRecord
    };
  }
  
  /**
   * Check compatibility between two knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkCompatibility(sourceKnowledge, targetKnowledge) {
    // Basic compatibility check
    if (sourceKnowledge.type !== targetKnowledge.type) {
      return {
        score: 0,
        compatible: false,
        reason: 'Knowledge types do not match'
      };
    }
    
    // Type-specific compatibility checks
    switch (sourceKnowledge.type) {
      case 'reinforcement':
      case 'enhanced-q-learning':
        return this.checkQLearningCompatibility(sourceKnowledge, targetKnowledge);
        
      case 'policy-gradient':
        return this.checkPolicyGradientCompatibility(sourceKnowledge, targetKnowledge);
        
      case 'deep-q-learning':
        return this.checkDeepQLearningCompatibility(sourceKnowledge, targetKnowledge);
        
      case 'neuralnetwork':
        return this.checkNeuralNetworkCompatibility(sourceKnowledge, targetKnowledge);
        
      default:
        return {
          score: 0.5, // Default moderate compatibility
          compatible: true,
          reason: 'No specific compatibility check for this knowledge type'
        };
    }
  }
  
  /**
   * Check compatibility between Q-learning knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkQLearningCompatibility(sourceKnowledge, targetKnowledge) {
    // Check if Q-tables exist
    if (!sourceKnowledge.qTable || !targetKnowledge.qTable) {
      return {
        score: 0.3,
        compatible: true,
        reason: 'Missing Q-table in one or both knowledge objects'
      };
    }
    
    // Calculate state overlap
    const sourceStates = Object.keys(sourceKnowledge.qTable);
    const targetStates = Object.keys(targetKnowledge.qTable);
    
    const commonStates = sourceStates.filter(state => targetStates.includes(state));
    const stateOverlap = commonStates.length / Math.max(1, Math.max(sourceStates.length, targetStates.length));
    
    // Calculate action overlap for common states
    let totalActionOverlap = 0;
    
    for (const state of commonStates) {
      const sourceActions = Object.keys(sourceKnowledge.qTable[state]);
      const targetActions = Object.keys(targetKnowledge.qTable[state]);
      
      const commonActions = sourceActions.filter(action => targetActions.includes(action));
      const actionOverlap = commonActions.length / Math.max(1, Math.max(sourceActions.length, targetActions.length));
      
      totalActionOverlap += actionOverlap;
    }
    
    const avgActionOverlap = commonStates.length > 0 ? totalActionOverlap / commonStates.length : 0;
    
    // Calculate parameter similarity
    let parameterSimilarity = 0;
    
    if (sourceKnowledge.parameters && targetKnowledge.parameters) {
      const sourceParams = sourceKnowledge.parameters;
      const targetParams = targetKnowledge.parameters;
      
      // Compare learning rate
      const learningRateSimilarity = 1 - Math.abs(sourceParams.learningRate - targetParams.learningRate);
      
      // Compare discount factor
      const discountFactorSimilarity = 1 - Math.abs(sourceParams.discountFactor - targetParams.discountFactor);
      
      parameterSimilarity = (learningRateSimilarity + discountFactorSimilarity) / 2;
    }
    
    // Calculate overall compatibility score
    const score = 0.5 * stateOverlap + 0.3 * avgActionOverlap + 0.2 * parameterSimilarity;
    
    return {
      score,
      compatible: score >= this.options.compatibilityThreshold,
      stateOverlap,
      actionOverlap: avgActionOverlap,
      parameterSimilarity,
      reason: score >= this.options.compatibilityThreshold ? 'Compatible' : 'Compatibility score below threshold'
    };
  }
  
  /**
   * Check compatibility between policy gradient knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkPolicyGradientCompatibility(sourceKnowledge, targetKnowledge) {
    // Check if policies exist
    if (!sourceKnowledge.policy || !targetKnowledge.policy) {
      return {
        score: 0.3,
        compatible: true,
        reason: 'Missing policy in one or both knowledge objects'
      };
    }
    
    // Calculate state overlap
    const sourceStates = Object.keys(sourceKnowledge.policy);
    const targetStates = Object.keys(targetKnowledge.policy);
    
    const commonStates = sourceStates.filter(state => targetStates.includes(state));
    const stateOverlap = commonStates.length / Math.max(1, Math.max(sourceStates.length, targetStates.length));
    
    // Calculate action overlap for common states
    let totalActionOverlap = 0;
    
    for (const state of commonStates) {
      const sourceActions = Object.keys(sourceKnowledge.policy[state]);
      const targetActions = Object.keys(targetKnowledge.policy[state]);
      
      const commonActions = sourceActions.filter(action => targetActions.includes(action));
      const actionOverlap = commonActions.length / Math.max(1, Math.max(sourceActions.length, targetActions.length));
      
      totalActionOverlap += actionOverlap;
    }
    
    const avgActionOverlap = commonStates.length > 0 ? totalActionOverlap / commonStates.length : 0;
    
    // Calculate parameter similarity
    let parameterSimilarity = 0;
    
    if (sourceKnowledge.parameters && targetKnowledge.parameters) {
      const sourceParams = sourceKnowledge.parameters;
      const targetParams = targetKnowledge.parameters;
      
      // Compare learning rate
      const learningRateSimilarity = 1 - Math.abs(sourceParams.learningRate - targetParams.learningRate);
      
      // Compare discount factor
      const discountFactorSimilarity = 1 - Math.abs(sourceParams.discountFactor - targetParams.discountFactor);
      
      parameterSimilarity = (learningRateSimilarity + discountFactorSimilarity) / 2;
    }
    
    // Calculate overall compatibility score
    const score = 0.5 * stateOverlap + 0.3 * avgActionOverlap + 0.2 * parameterSimilarity;
    
    return {
      score,
      compatible: score >= this.options.compatibilityThreshold,
      stateOverlap,
      actionOverlap: avgActionOverlap,
      parameterSimilarity,
      reason: score >= this.options.compatibilityThreshold ? 'Compatible' : 'Compatibility score below threshold'
    };
  }
  
  /**
   * Check compatibility between deep Q-learning knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkDeepQLearningCompatibility(sourceKnowledge, targetKnowledge) {
    // Check if architecture exists
    if (!sourceKnowledge.architecture || !targetKnowledge.architecture) {
      return {
        score: 0.3,
        compatible: true,
        reason: 'Missing architecture in one or both knowledge objects'
      };
    }
    
    // Compare architectures
    const sourceArch = sourceKnowledge.architecture;
    const targetArch = targetKnowledge.architecture;
    
    // Check input/output dimensions
    const dimensionMatch = 
      sourceArch.inputDimension === targetArch.inputDimension &&
      sourceArch.outputDimension === targetArch.outputDimension;
    
    if (!dimensionMatch) {
      return {
        score: 0.1,
        compatible: false,
        reason: 'Input/output dimensions do not match'
      };
    }
    
    // Compare hidden layers
    let layerSimilarity = 0;
    
    if (sourceArch.hiddenLayers && targetArch.hiddenLayers) {
      const sourceLayers = sourceArch.hiddenLayers;
      const targetLayers = targetArch.hiddenLayers;
      
      // Check if number of layers match
      if (sourceLayers.length === targetLayers.length) {
        // Calculate average layer size similarity
        let totalSimilarity = 0;
        
        for (let i = 0; i < sourceLayers.length; i++) {
          const sourceSize = sourceLayers[i];
          const targetSize = targetLayers[i];
          
          const sizeSimilarity = Math.min(sourceSize, targetSize) / Math.max(sourceSize, targetSize);
          totalSimilarity += sizeSimilarity;
        }
        
        layerSimilarity = totalSimilarity / sourceLayers.length;
      } else {
        // Different number of layers
        layerSimilarity = 0.5; // Partial similarity
      }
    }
    
    // Compare activation functions
    const activationMatch = sourceArch.activationFunction === targetArch.activationFunction;
    
    // Calculate parameter similarity
    let parameterSimilarity = 0;
    
    if (sourceKnowledge.parameters && targetKnowledge.parameters) {
      const sourceParams = sourceKnowledge.parameters;
      const targetParams = targetKnowledge.parameters;
      
      // Compare learning rate
      const learningRateSimilarity = 1 - Math.abs(sourceParams.learningRate - targetParams.learningRate);
      
      // Compare discount factor
      const discountFactorSimilarity = 1 - Math.abs(sourceParams.discountFactor - targetParams.discountFactor);
      
      parameterSimilarity = (learningRateSimilarity + discountFactorSimilarity) / 2;
    }
    
    // Calculate overall compatibility score
    const score = 0.4 * (dimensionMatch ? 1 : 0) + 0.3 * layerSimilarity + 0.1 * (activationMatch ? 1 : 0) + 0.2 * parameterSimilarity;
    
    return {
      score,
      compatible: score >= this.options.compatibilityThreshold,
      dimensionMatch,
      layerSimilarity,
      activationMatch,
      parameterSimilarity,
      reason: score >= this.options.compatibilityThreshold ? 'Compatible' : 'Compatibility score below threshold'
    };
  }
  
  /**
   * Check compatibility between neural network knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkNeuralNetworkCompatibility(sourceKnowledge, targetKnowledge) {
    // Check if weights exist
    if (!sourceKnowledge.weights || !targetKnowledge.weights) {
      return {
        score: 0.3,
        compatible: true,
        reason: 'Missing weights in one or both knowledge objects'
      };
    }
    
    // Compare weights structure
    const sourceWeights = sourceKnowledge.weights;
    const targetWeights = targetKnowledge.weights;
    
    // Check if number of layers match
    if (sourceWeights.length !== targetWeights.length) {
      return {
        score: 0.2,
        compatible: false,
        reason: 'Number of layers do not match'
      };
    }
    
    // Check if layer shapes match
    let shapesMatch = true;
    
    for (let i = 0; i < sourceWeights.length; i++) {
      const sourceShape = sourceWeights[i].shape;
      const targetShape = targetWeights[i].shape;
      
      if (!this.arraysEqual(sourceShape, targetShape)) {
        shapesMatch = false;
        break;
      }
    }
    
    if (!shapesMatch) {
      return {
        score: 0.3,
        compatible: false,
        reason: 'Layer shapes do not match'
      };
    }
    
    // Calculate parameter similarity
    let parameterSimilarity = 0;
    
    if (sourceKnowledge.parameters && targetKnowledge.parameters) {
      const sourceParams = sourceKnowledge.parameters;
      const targetParams = targetKnowledge.parameters;
      
      // Compare learning rate
      parameterSimilarity = 1 - Math.abs(sourceParams.learningRate - targetParams.learningRate);
    }
    
    // Calculate overall compatibility score
    const score = 0.7 * (shapesMatch ? 1 : 0) + 0.3 * parameterSimilarity;
    
    return {
      score,
      compatible: score >= this.options.compatibilityThreshold,
      shapesMatch,
      parameterSimilarity,
      reason: score >= this.options.compatibilityThreshold ? 'Compatible' : 'Compatibility score below threshold'
    };
  }
  
  /**
   * Merge two knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @param {object} options - Merge options
   * @returns {object} Merge result
   */
  mergeKnowledge(sourceKnowledge, targetKnowledge, options = {}) {
    // Check if knowledge types match
    if (sourceKnowledge.type !== targetKnowledge.type) {
      return {
        success: false,
        message: `Knowledge types do not match: ${sourceKnowledge.type} vs ${targetKnowledge.type}`
      };
    }
    
    // Type-specific merge
    switch (sourceKnowledge.type) {
      case 'reinforcement':
      case 'enhanced-q-learning':
        return this.mergeQLearningKnowledge(sourceKnowledge, targetKnowledge, options);
        
      case 'policy-gradient':
        return this.mergePolicyGradientKnowledge(sourceKnowledge, targetKnowledge, options);
        
      case 'deep-q-learning':
        return this.mergeDeepQLearningKnowledge(sourceKnowledge, targetKnowledge, options);
        
      case 'neuralnetwork':
        return this.mergeNeuralNetworkKnowledge(sourceKnowledge, targetKnowledge, options);
        
      default:
        return {
          success: false,
          message: `Unsupported knowledge type for merging: ${sourceKnowledge.type}`
        };
    }
  }
  
  /**
   * Merge Q-learning knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @param {object} options - Merge options
   * @returns {object} Merge result
   */
  mergeQLearningKnowledge(sourceKnowledge, targetKnowledge, options = {}) {
    const strategy = options.strategy || this.options.mergeStrategy;
    const weight = options.weight || this.options.mergeWeight;
    
    // Create a copy of target knowledge
    const mergedKnowledge = JSON.parse(JSON.stringify(targetKnowledge));
    
    // Merge Q-tables
    const sourceQTable = sourceKnowledge.qTable || {};
    const targetQTable = targetKnowledge.qTable || {};
    
    // Track statistics
    const stats = {
      totalStates: 0,
      newStates: 0,
      updatedStates: 0,
      totalActions: 0,
      newActions: 0,
      updatedActions: 0,
      valueChanges: []
    };
    
    // Process all states from source
    for (const state of Object.keys(sourceQTable)) {
      stats.totalStates++;
      
      // Check if state exists in target
      if (!targetQTable[state]) {
        // New state, add it
        mergedKnowledge.qTable[state] = { ...sourceQTable[state] };
        stats.newStates++;
        
        // Count actions
        const actionCount = Object.keys(sourceQTable[state]).length;
        stats.totalActions += actionCount;
        stats.newActions += actionCount;
      } else {
        // Existing state, merge actions
        stats.updatedStates++;
        
        // Process all actions for this state
        for (const action of Object.keys(sourceQTable[state])) {
          stats.totalActions++;
          
          // Check if action exists in target
          if (!targetQTable[state][action]) {
            // New action, add it
            mergedKnowledge.qTable[state][action] = sourceQTable[state][action];
            stats.newActions++;
          } else {
            // Existing action, merge values based on strategy
            stats.updatedActions++;
            
            const sourceValue = sourceQTable[state][action];
            const targetValue = targetQTable[state][action];
            let mergedValue;
            
            switch (strategy) {
              case 'replace':
                mergedValue = sourceValue;
                break;
                
              case 'weighted':
                mergedValue = (1 - weight) * targetValue + weight * sourceValue;
                break;
                
              case 'max':
                mergedValue = Math.max(targetValue, sourceValue);
                break;
                
              default:
                mergedValue = (targetValue + sourceValue) / 2; // Average
            }
            
            // Record value change
            stats.valueChanges.push({
              state,
              action,
              sourceValue,
              targetValue,
              mergedValue,
              difference: mergedValue - targetValue
            });
            
            // Update value
            mergedKnowledge.qTable[state][action] = mergedValue;
          }
        }
      }
    }
    
    // Optionally merge parameters
    if (options.mergeParameters && sourceKnowledge.parameters && targetKnowledge.parameters) {
      mergedKnowledge.parameters = {
        ...targetKnowledge.parameters,
        ...sourceKnowledge.parameters
      };
    }
    
    // Calculate average value change
    const avgValueChange = stats.valueChanges.length > 0
      ? stats.valueChanges.reduce((sum, change) => sum + Math.abs(change.difference), 0) / stats.valueChanges.length
      : 0;
    
    return {
      success: true,
      knowledge: mergedKnowledge,
      stats: {
        ...stats,
        avgValueChange
      }
    };
  }
  
  /**
   * Merge policy gradient knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @param {object} options - Merge options
   * @returns {object} Merge result
   */
  mergePolicyGradientKnowledge(sourceKnowledge, targetKnowledge, options = {}) {
    const strategy = options.strategy || this.options.mergeStrategy;
    const weight = options.weight || this.options.mergeWeight;
    
    // Create a copy of target knowledge
    const mergedKnowledge = JSON.parse(JSON.stringify(targetKnowledge));
    
    // Merge policies
    const sourcePolicy = sourceKnowledge.policy || {};
    const targetPolicy = targetKnowledge.policy || {};
    
    // Track statistics
    const stats = {
      totalStates: 0,
      newStates: 0,
      updatedStates: 0,
      totalActions: 0,
      newActions: 0,
      updatedActions: 0,
      probabilityChanges: []
    };
    
    // Process all states from source
    for (const state of Object.keys(sourcePolicy)) {
      stats.totalStates++;
      
      // Check if state exists in target
      if (!targetPolicy[state]) {
        // New state, add it
        mergedKnowledge.policy[state] = { ...sourcePolicy[state] };
        stats.newStates++;
        
        // Count actions
        const actionCount = Object.keys(sourcePolicy[state]).length;
        stats.totalActions += actionCount;
        stats.newActions += actionCount;
      } else {
        // Existing state, merge actions
        stats.updatedStates++;
        
        // Process all actions for this state
        for (const action of Object.keys(sourcePolicy[state])) {
          stats.totalActions++;
          
          // Check if action exists in target
          if (!targetPolicy[state][action]) {
            // New action, add it
            mergedKnowledge.policy[state][action] = sourcePolicy[state][action];
            stats.newActions++;
          } else {
            // Existing action, merge probabilities based on strategy
            stats.updatedActions++;
            
            const sourceProb = sourcePolicy[state][action];
            const targetProb = targetPolicy[state][action];
            let mergedProb;
            
            switch (strategy) {
              case 'replace':
                mergedProb = sourceProb;
                break;
                
              case 'weighted':
                mergedProb = (1 - weight) * targetProb + weight * sourceProb;
                break;
                
              case 'max':
                mergedProb = Math.max(targetProb, sourceProb);
                break;
                
              default:
                mergedProb = (targetProb + sourceProb) / 2; // Average
            }
            
            // Record probability change
            stats.probabilityChanges.push({
              state,
              action,
              sourceProb,
              targetProb,
              mergedProb,
              difference: mergedProb - targetProb
            });
            
            // Update probability
            mergedKnowledge.policy[state][action] = mergedProb;
          }
        }
        
        // Normalize probabilities for this state
        this.normalizeProbabilities(mergedKnowledge.policy[state]);
      }
    }
    
    // Optionally merge parameters
    if (options.mergeParameters && sourceKnowledge.parameters && targetKnowledge.parameters) {
      mergedKnowledge.parameters = {
        ...targetKnowledge.parameters,
        ...sourceKnowledge.parameters
      };
    }
    
    // Optionally merge baseline
    if (options.mergeBaseline && sourceKnowledge.baseline && targetKnowledge.baseline) {
      mergedKnowledge.baseline = { ...targetKnowledge.baseline };
      
      // Merge baseline values
      for (const state of Object.keys(sourceKnowledge.baseline)) {
        if (!mergedKnowledge.baseline[state]) {
          mergedKnowledge.baseline[state] = sourceKnowledge.baseline[state];
        } else {
          mergedKnowledge.baseline[state] = 
            (1 - weight) * mergedKnowledge.baseline[state] + 
            weight * sourceKnowledge.baseline[state];
        }
      }
    }
    
    // Calculate average probability change
    const avgProbChange = stats.probabilityChanges.length > 0
      ? stats.probabilityChanges.reduce((sum, change) => sum + Math.abs(change.difference), 0) / stats.probabilityChanges.length
      : 0;
    
    return {
      success: true,
      knowledge: mergedKnowledge,
      stats: {
        ...stats,
        avgProbChange
      }
    };
  }
  
  /**
   * Merge deep Q-learning knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @param {object} options - Merge options
   * @returns {object} Merge result
   */
  mergeDeepQLearningKnowledge(sourceKnowledge, targetKnowledge, options = {}) {
    const strategy = options.strategy || this.options.mergeStrategy;
    const weight = options.weight || this.options.mergeWeight;
    
    // Check if architectures match
    if (!this.architecturesMatch(sourceKnowledge.architecture, targetKnowledge.architecture)) {
      return {
        success: false,
        message: 'Architectures do not match, cannot merge deep Q-learning knowledge'
      };
    }
    
    // Create a copy of target knowledge
    const mergedKnowledge = JSON.parse(JSON.stringify(targetKnowledge));
    
    // Merge weights
    if (sourceKnowledge.weights && targetKnowledge.weights) {
      const sourceWeights = sourceKnowledge.weights;
      const targetWeights = targetKnowledge.weights;
      
      // Check if weights have the same structure
      if (sourceWeights.length !== targetWeights.length) {
        return {
          success: false,
          message: 'Weight structures do not match'
        };
      }
      
      // Merge weights based on strategy
      mergedKnowledge.weights = [];
      
      for (let i = 0; i < sourceWeights.length; i++) {
        const sourceLayerWeights = sourceWeights[i];
        const targetLayerWeights = targetWeights[i];
        
        // Check if shapes match
        if (!this.arraysEqual(sourceLayerWeights.shape, targetLayerWeights.shape)) {
          return {
            success: false,
            message: `Weight shapes do not match for layer ${i}`
          };
        }
        
        // Merge weights
        const mergedLayerWeights = {
          shape: sourceLayerWeights.shape,
          data: []
        };
        
        for (let j = 0; j < sourceLayerWeights.data.length; j++) {
          const sourceWeight = sourceLayerWeights.data[j];
          const targetWeight = targetLayerWeights.data[j];
          let mergedWeight;
          
          switch (strategy) {
            case 'replace':
              mergedWeight = sourceWeight;
              break;
              
            case 'weighted':
              mergedWeight = (1 - weight) * targetWeight + weight * sourceWeight;
              break;
              
            case 'max':
              mergedWeight = Math.max(targetWeight, sourceWeight);
              break;
              
            default:
              mergedWeight = (targetWeight + sourceWeight) / 2; // Average
          }
          
          mergedLayerWeights.data.push(mergedWeight);
        }
        
        mergedKnowledge.weights.push(mergedLayerWeights);
      }
    }
    
    // Optionally merge parameters
    if (options.mergeParameters && sourceKnowledge.parameters && targetKnowledge.parameters) {
      mergedKnowledge.parameters = {
        ...targetKnowledge.parameters,
        ...sourceKnowledge.parameters
      };
    }
    
    return {
      success: true,
      knowledge: mergedKnowledge,
      stats: {
        layerCount: mergedKnowledge.weights ? mergedKnowledge.weights.length : 0,
        weightCount: mergedKnowledge.weights ? 
          mergedKnowledge.weights.reduce((sum, layer) => sum + layer.data.length, 0) : 0,
        mergeStrategy: strategy,
        mergeWeight: weight
      }
    };
  }
  
  /**
   * Merge neural network knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @param {object} options - Merge options
   * @returns {object} Merge result
   */
  mergeNeuralNetworkKnowledge(sourceKnowledge, targetKnowledge, options = {}) {
    // Neural network merging is similar to deep Q-learning
    return this.mergeDeepQLearningKnowledge(sourceKnowledge, targetKnowledge, options);
  }
  
  /**
   * Check if two architectures match
   * @param {object} arch1 - First architecture
   * @param {object} arch2 - Second architecture
   * @returns {boolean} Whether architectures match
   */
  architecturesMatch(arch1, arch2) {
    if (!arch1 || !arch2) {
      return false;
    }
    
    // Check input/output dimensions
    if (arch1.inputDimension !== arch2.inputDimension || 
        arch1.outputDimension !== arch2.outputDimension) {
      return false;
    }
    
    // Check hidden layers
    if (arch1.hiddenLayers && arch2.hiddenLayers) {
      if (arch1.hiddenLayers.length !== arch2.hiddenLayers.length) {
        return false;
      }
      
      for (let i = 0; i < arch1.hiddenLayers.length; i++) {
        if (arch1.hiddenLayers[i] !== arch2.hiddenLayers[i]) {
          return false;
        }
      }
    } else if (arch1.hiddenLayers || arch2.hiddenLayers) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if two arrays are equal
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @returns {boolean} Whether arrays are equal
   */
  arraysEqual(arr1, arr2) {
    if (!arr1 || !arr2) {
      return false;
    }
    
    if (arr1.length !== arr2.length) {
      return false;
    }
    
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Normalize probabilities to sum to 1
   * @param {object} actionProbs - Action probabilities
   * @returns {object} Normalized probabilities
   */
  normalizeProbabilities(actionProbs) {
    // Calculate sum
    let sum = 0;
    for (const action of Object.keys(actionProbs)) {
      sum += Math.max(0, actionProbs[action]); // Ensure non-negative
    }
    
    // Normalize
    if (sum > 0) {
      for (const action of Object.keys(actionProbs)) {
        actionProbs[action] = Math.max(0, actionProbs[action]) / sum;
      }
    } else {
      // If all probabilities are negative or zero, reset to uniform
      const uniformProb = 1.0 / Object.keys(actionProbs).length;
      for (const action of Object.keys(actionProbs)) {
        actionProbs[action] = uniformProb;
      }
    }
    
    return actionProbs;
  }
  
  /**
   * Get transfer history
   * @param {number} limit - Maximum number of records to return
   * @returns {Array<object>} Transfer history records
   */
  getTransferHistory(limit = 100) {
    return this.transferHistory.slice(-limit);
  }
  
  /**
   * Get transfer statistics
   * @returns {object} Transfer statistics
   */
  getTransferStats() {
    const stats = {
      totalTransfers: this.transferHistory.length,
      successfulTransfers: 0,
      failedTransfers: 0,
      knowledgeTypes: {},
      avgCompatibility: 0,
      transfersByStrategy: {}
    };
    
    // Calculate statistics
    for (const record of this.transferHistory) {
      if (record.result && record.result.success) {
        stats.successfulTransfers++;
      } else {
        stats.failedTransfers++;
      }
      
      // Count by knowledge type
      if (!stats.knowledgeTypes[record.knowledgeType]) {
        stats.knowledgeTypes[record.knowledgeType] = 0;
      }
      stats.knowledgeTypes[record.knowledgeType]++;
      
      // Count by strategy
      if (!stats.transfersByStrategy[record.mergeStrategy]) {
        stats.transfersByStrategy[record.mergeStrategy] = 0;
      }
      stats.transfersByStrategy[record.mergeStrategy]++;
      
      // Sum compatibility
      stats.avgCompatibility += record.compatibility || 0;
    }
    
    // Calculate average compatibility
    if (this.transferHistory.length > 0) {
      stats.avgCompatibility /= this.transferHistory.length;
    }
    
    return stats;
  }
  
  /**
   * Clear transfer history
   * @returns {number} Number of records cleared
   */
  clearTransferHistory() {
    const count = this.transferHistory.length;
    this.transferHistory = [];
    return count;
  }
}

module.exports = KnowledgeTransfer;
