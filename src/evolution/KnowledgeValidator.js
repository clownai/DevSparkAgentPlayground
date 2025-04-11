/**
 * KnowledgeValidator.js
 * Utility for validating knowledge structures and compatibility
 */

class KnowledgeValidator {
  /**
   * Create a new KnowledgeValidator instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      strictValidation: false,
      compatibilityThreshold: 0.7,
      ...options
    };
    
    this.logger = options.logger || console;
    this.validationSchemas = this.initializeSchemas();
  }
  
  /**
   * Initialize validation schemas for different knowledge types
   * @returns {object} Validation schemas
   */
  initializeSchemas() {
    return {
      'reinforcement': {
        required: ['type', 'qTable', 'parameters'],
        parameters: ['learningRate', 'discountFactor', 'explorationRate']
      },
      'enhanced-q-learning': {
        required: ['type', 'qTable', 'parameters'],
        parameters: ['learningRate', 'discountFactor', 'explorationRate', 'useEligibilityTraces', 'useDoubleQLearning', 'useExperienceReplay']
      },
      'policy-gradient': {
        required: ['type', 'policy', 'parameters'],
        parameters: ['learningRate', 'discountFactor', 'entropyCoefficient', 'useBaseline']
      },
      'deep-q-learning': {
        required: ['type', 'architecture', 'weights', 'parameters'],
        parameters: ['learningRate', 'discountFactor', 'explorationRate', 'batchSize', 'targetUpdateFrequency']
      },
      'neuralnetwork': {
        required: ['type', 'weights', 'parameters'],
        parameters: ['learningRate']
      }
    };
  }
  
  /**
   * Validate knowledge structure
   * @param {object} knowledge - Knowledge to validate
   * @returns {object} Validation result
   */
  validateKnowledge(knowledge) {
    if (!knowledge || typeof knowledge !== 'object') {
      return {
        valid: false,
        message: 'Invalid knowledge: not an object'
      };
    }
    
    if (!knowledge.type) {
      return {
        valid: false,
        message: 'Invalid knowledge: missing type'
      };
    }
    
    // Get schema for this knowledge type
    const schema = this.validationSchemas[knowledge.type];
    if (!schema) {
      return {
        valid: false,
        message: `Unknown knowledge type: ${knowledge.type}`
      };
    }
    
    // Check required fields
    for (const field of schema.required) {
      if (!knowledge[field]) {
        return {
          valid: false,
          message: `Missing required field: ${field}`
        };
      }
    }
    
    // Check parameters if strict validation is enabled
    if (this.options.strictValidation && knowledge.parameters) {
      for (const param of schema.parameters) {
        if (knowledge.parameters[param] === undefined) {
          return {
            valid: false,
            message: `Missing parameter: ${param}`
          };
        }
      }
    }
    
    // Type-specific validation
    let typeValidation;
    switch (knowledge.type) {
      case 'reinforcement':
      case 'enhanced-q-learning':
        typeValidation = this.validateQLearningKnowledge(knowledge);
        break;
        
      case 'policy-gradient':
        typeValidation = this.validatePolicyGradientKnowledge(knowledge);
        break;
        
      case 'deep-q-learning':
        typeValidation = this.validateDeepQLearningKnowledge(knowledge);
        break;
        
      case 'neuralnetwork':
        typeValidation = this.validateNeuralNetworkKnowledge(knowledge);
        break;
        
      default:
        typeValidation = { valid: true };
    }
    
    if (!typeValidation.valid) {
      return typeValidation;
    }
    
    return {
      valid: true,
      type: knowledge.type,
      schema
    };
  }
  
  /**
   * Validate Q-learning knowledge
   * @param {object} knowledge - Knowledge to validate
   * @returns {object} Validation result
   */
  validateQLearningKnowledge(knowledge) {
    // Check if qTable is an object
    if (typeof knowledge.qTable !== 'object') {
      return {
        valid: false,
        message: 'Invalid Q-table: not an object'
      };
    }
    
    // Check if qTable has at least one state
    if (Object.keys(knowledge.qTable).length === 0) {
      return {
        valid: true, // Empty Q-table is valid but unusual
        warning: 'Q-table is empty'
      };
    }
    
    // Check if parameters are valid
    if (knowledge.parameters) {
      const params = knowledge.parameters;
      
      // Check learning rate
      if (params.learningRate !== undefined && (params.learningRate < 0 || params.learningRate > 1)) {
        return {
          valid: false,
          message: `Invalid learning rate: ${params.learningRate} (must be between 0 and 1)`
        };
      }
      
      // Check discount factor
      if (params.discountFactor !== undefined && (params.discountFactor < 0 || params.discountFactor > 1)) {
        return {
          valid: false,
          message: `Invalid discount factor: ${params.discountFactor} (must be between 0 and 1)`
        };
      }
      
      // Check exploration rate
      if (params.explorationRate !== undefined && (params.explorationRate < 0 || params.explorationRate > 1)) {
        return {
          valid: false,
          message: `Invalid exploration rate: ${params.explorationRate} (must be between 0 and 1)`
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate policy gradient knowledge
   * @param {object} knowledge - Knowledge to validate
   * @returns {object} Validation result
   */
  validatePolicyGradientKnowledge(knowledge) {
    // Check if policy is an object
    if (typeof knowledge.policy !== 'object') {
      return {
        valid: false,
        message: 'Invalid policy: not an object'
      };
    }
    
    // Check if policy has at least one state
    if (Object.keys(knowledge.policy).length === 0) {
      return {
        valid: true, // Empty policy is valid but unusual
        warning: 'Policy is empty'
      };
    }
    
    // Check if probabilities sum to approximately 1 for each state
    for (const state in knowledge.policy) {
      const actionProbs = knowledge.policy[state];
      let sum = 0;
      
      for (const action in actionProbs) {
        const prob = actionProbs[action];
        
        // Check if probability is valid
        if (prob < 0 || prob > 1) {
          return {
            valid: false,
            message: `Invalid probability for state ${state}, action ${action}: ${prob} (must be between 0 and 1)`
          };
        }
        
        sum += prob;
      }
      
      // Check if probabilities sum to approximately 1
      if (Math.abs(sum - 1) > 0.01) {
        return {
          valid: false,
          message: `Probabilities for state ${state} do not sum to 1: ${sum}`
        };
      }
    }
    
    // Check if parameters are valid
    if (knowledge.parameters) {
      const params = knowledge.parameters;
      
      // Check learning rate
      if (params.learningRate !== undefined && (params.learningRate < 0 || params.learningRate > 1)) {
        return {
          valid: false,
          message: `Invalid learning rate: ${params.learningRate} (must be between 0 and 1)`
        };
      }
      
      // Check discount factor
      if (params.discountFactor !== undefined && (params.discountFactor < 0 || params.discountFactor > 1)) {
        return {
          valid: false,
          message: `Invalid discount factor: ${params.discountFactor} (must be between 0 and 1)`
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate deep Q-learning knowledge
   * @param {object} knowledge - Knowledge to validate
   * @returns {object} Validation result
   */
  validateDeepQLearningKnowledge(knowledge) {
    // Check if architecture is valid
    if (!knowledge.architecture) {
      return {
        valid: false,
        message: 'Missing architecture'
      };
    }
    
    const arch = knowledge.architecture;
    
    // Check input/output dimensions
    if (arch.inputDimension === undefined || arch.inputDimension <= 0) {
      return {
        valid: false,
        message: `Invalid input dimension: ${arch.inputDimension}`
      };
    }
    
    if (arch.outputDimension === undefined || arch.outputDimension <= 0) {
      return {
        valid: false,
        message: `Invalid output dimension: ${arch.outputDimension}`
      };
    }
    
    // Check hidden layers
    if (arch.hiddenLayers) {
      if (!Array.isArray(arch.hiddenLayers)) {
        return {
          valid: false,
          message: 'Hidden layers must be an array'
        };
      }
      
      for (let i = 0; i < arch.hiddenLayers.length; i++) {
        if (arch.hiddenLayers[i] <= 0) {
          return {
            valid: false,
            message: `Invalid hidden layer size at index ${i}: ${arch.hiddenLayers[i]}`
          };
        }
      }
    }
    
    // Check weights
    if (knowledge.weights) {
      if (!Array.isArray(knowledge.weights)) {
        return {
          valid: false,
          message: 'Weights must be an array'
        };
      }
      
      for (let i = 0; i < knowledge.weights.length; i++) {
        const layer = knowledge.weights[i];
        
        if (!layer.shape || !Array.isArray(layer.shape)) {
          return {
            valid: false,
            message: `Invalid shape for layer ${i}`
          };
        }
        
        if (!layer.data || !Array.isArray(layer.data)) {
          return {
            valid: false,
            message: `Invalid data for layer ${i}`
          };
        }
        
        // Check if data length matches shape
        const expectedLength = layer.shape.reduce((a, b) => a * b, 1);
        if (layer.data.length !== expectedLength) {
          return {
            valid: false,
            message: `Data length (${layer.data.length}) does not match shape (${layer.shape}) for layer ${i}`
          };
        }
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate neural network knowledge
   * @param {object} knowledge - Knowledge to validate
   * @returns {object} Validation result
   */
  validateNeuralNetworkKnowledge(knowledge) {
    // Neural network validation is similar to deep Q-learning
    return this.validateDeepQLearningKnowledge(knowledge);
  }
  
  /**
   * Check compatibility between two knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkCompatibility(sourceKnowledge, targetKnowledge) {
    // Validate both knowledge objects
    const sourceValidation = this.validateKnowledge(sourceKnowledge);
    const targetValidation = this.validateKnowledge(targetKnowledge);
    
    if (!sourceValidation.valid) {
      return {
        compatible: false,
        score: 0,
        message: `Source knowledge is invalid: ${sourceValidation.message}`
      };
    }
    
    if (!targetValidation.valid) {
      return {
        compatible: false,
        score: 0,
        message: `Target knowledge is invalid: ${targetValidation.message}`
      };
    }
    
    // Check if types match
    if (sourceKnowledge.type !== targetKnowledge.type) {
      return {
        compatible: false,
        score: 0,
        message: `Knowledge types do not match: ${sourceKnowledge.type} vs ${targetKnowledge.type}`
      };
    }
    
    // Type-specific compatibility checks
    let compatibilityResult;
    switch (sourceKnowledge.type) {
      case 'reinforcement':
      case 'enhanced-q-learning':
        compatibilityResult = this.checkQLearningCompatibility(sourceKnowledge, targetKnowledge);
        break;
        
      case 'policy-gradient':
        compatibilityResult = this.checkPolicyGradientCompatibility(sourceKnowledge, targetKnowledge);
        break;
        
      case 'deep-q-learning':
        compatibilityResult = this.checkDeepQLearningCompatibility(sourceKnowledge, targetKnowledge);
        break;
        
      case 'neuralnetwork':
        compatibilityResult = this.checkNeuralNetworkCompatibility(sourceKnowledge, targetKnowledge);
        break;
        
      default:
        compatibilityResult = {
          score: 0.5,
          details: {
            reason: 'No specific compatibility check for this knowledge type'
          }
        };
    }
    
    // Determine compatibility based on score
    const compatible = compatibilityResult.score >= this.options.compatibilityThreshold;
    
    return {
      compatible,
      score: compatibilityResult.score,
      details: compatibilityResult.details,
      message: compatible ? 'Compatible' : `Compatibility score (${compatibilityResult.score.toFixed(2)}) below threshold (${this.options.compatibilityThreshold})`
    };
  }
  
  /**
   * Check compatibility between Q-learning knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkQLearningCompatibility(sourceKnowledge, targetKnowledge) {
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
      const learningRateSimilarity = 1 - Math.abs((sourceParams.learningRate || 0.1) - (targetParams.learningRate || 0.1));
      
      // Compare discount factor
      const discountFactorSimilarity = 1 - Math.abs((sourceParams.discountFactor || 0.9) - (targetParams.discountFactor || 0.9));
      
      parameterSimilarity = (learningRateSimilarity + discountFactorSimilarity) / 2;
    }
    
    // Calculate overall compatibility score
    const score = 0.5 * stateOverlap + 0.3 * avgActionOverlap + 0.2 * parameterSimilarity;
    
    return {
      score,
      details: {
        stateOverlap,
        actionOverlap: avgActionOverlap,
        parameterSimilarity,
        commonStates: commonStates.length,
        totalSourceStates: sourceStates.length,
        totalTargetStates: targetStates.length
      }
    };
  }
  
  /**
   * Check compatibility between policy gradient knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkPolicyGradientCompatibility(sourceKnowledge, targetKnowledge) {
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
    
    // Calculate policy similarity for common state-action pairs
    let totalPolicySimilarity = 0;
    let policyPairsCount = 0;
    
    for (const state of commonStates) {
      const sourcePolicy = sourceKnowledge.policy[state];
      const targetPolicy = targetKnowledge.policy[state];
      
      for (const action of Object.keys(sourcePolicy)) {
        if (targetPolicy[action] !== undefined) {
          const similarity = 1 - Math.abs(sourcePolicy[action] - targetPolicy[action]);
          totalPolicySimilarity += similarity;
          policyPairsCount++;
        }
      }
    }
    
    const avgPolicySimilarity = policyPairsCount > 0 ? totalPolicySimilarity / policyPairsCount : 0;
    
    // Calculate parameter similarity
    let parameterSimilarity = 0;
    
    if (sourceKnowledge.parameters && targetKnowledge.parameters) {
      const sourceParams = sourceKnowledge.parameters;
      const targetParams = targetKnowledge.parameters;
      
      // Compare learning rate
      const learningRateSimilarity = 1 - Math.abs((sourceParams.learningRate || 0.01) - (targetParams.learningRate || 0.01));
      
      // Compare discount factor
      const discountFactorSimilarity = 1 - Math.abs((sourceParams.discountFactor || 0.99) - (targetParams.discountFactor || 0.99));
      
      parameterSimilarity = (learningRateSimilarity + discountFactorSimilarity) / 2;
    }
    
    // Calculate overall compatibility score
    const score = 0.3 * stateOverlap + 0.2 * avgActionOverlap + 0.3 * avgPolicySimilarity + 0.2 * parameterSimilarity;
    
    return {
      score,
      details: {
        stateOverlap,
        actionOverlap: avgActionOverlap,
        policySimilarity: avgPolicySimilarity,
        parameterSimilarity,
        commonStates: commonStates.length,
        totalSourceStates: sourceStates.length,
        totalTargetStates: targetStates.length
      }
    };
  }
  
  /**
   * Check compatibility between deep Q-learning knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkDeepQLearningCompatibility(sourceKnowledge, targetKnowledge) {
    // Compare architectures
    const sourceArch = sourceKnowledge.architecture;
    const targetArch = targetKnowledge.architecture;
    
    if (!sourceArch || !targetArch) {
      return {
        score: 0.1,
        details: {
          reason: 'Missing architecture in one or both knowledge objects'
        }
      };
    }
    
    // Check input/output dimensions
    const dimensionMatch = 
      sourceArch.inputDimension === targetArch.inputDimension &&
      sourceArch.outputDimension === targetArch.outputDimension;
    
    if (!dimensionMatch) {
      return {
        score: 0.1,
        details: {
          reason: 'Input/output dimensions do not match',
          sourceInputDim: sourceArch.inputDimension,
          targetInputDim: targetArch.inputDimension,
          sourceOutputDim: sourceArch.outputDimension,
          targetOutputDim: targetArch.outputDimension
        }
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
      const learningRateSimilarity = 1 - Math.abs((sourceParams.learningRate || 0.001) - (targetParams.learningRate || 0.001));
      
      // Compare discount factor
      const discountFactorSimilarity = 1 - Math.abs((sourceParams.discountFactor || 0.99) - (targetParams.discountFactor || 0.99));
      
      parameterSimilarity = (learningRateSimilarity + discountFactorSimilarity) / 2;
    }
    
    // Calculate overall compatibility score
    const score = 0.4 * (dimensionMatch ? 1 : 0) + 0.3 * layerSimilarity + 0.1 * (activationMatch ? 1 : 0) + 0.2 * parameterSimilarity;
    
    return {
      score,
      details: {
        dimensionMatch,
        layerSimilarity,
        activationMatch,
        parameterSimilarity,
        sourceInputDim: sourceArch.inputDimension,
        targetInputDim: targetArch.inputDimension,
        sourceOutputDim: sourceArch.outputDimension,
        targetOutputDim: targetArch.outputDimension
      }
    };
  }
  
  /**
   * Check compatibility between neural network knowledge objects
   * @param {object} sourceKnowledge - Source knowledge
   * @param {object} targetKnowledge - Target knowledge
   * @returns {object} Compatibility result
   */
  checkNeuralNetworkCompatibility(sourceKnowledge, targetKnowledge) {
    // Neural network compatibility is similar to deep Q-learning
    return this.checkDeepQLearningCompatibility(sourceKnowledge, targetKnowledge);
  }
}

module.exports = KnowledgeValidator;
