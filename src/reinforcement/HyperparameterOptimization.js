/**
 * HyperparameterOptimization.js
 * Tools for optimizing reinforcement learning algorithm hyperparameters
 * 
 * This module provides methods for automatically tuning hyperparameters
 * of reinforcement learning algorithms to maximize performance.
 */

class HyperparameterOptimization {
  /**
   * Create a new hyperparameter optimization instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxIterations: 50,
      populationSize: 10,
      evaluationEpisodes: 5,
      optimizationMetric: 'averageReward',
      optimizationGoal: 'maximize',
      parallelEvaluations: 1,
      ...options
    };
    
    this.bestParameters = null;
    this.bestScore = this.options.optimizationGoal === 'maximize' ? -Infinity : Infinity;
    this.history = [];
    this.currentIteration = 0;
  }
  
  /**
   * Optimize hyperparameters for an algorithm
   * @param {Object} rlManager - Reinforcement learning manager
   * @param {String} algorithmType - Algorithm type to optimize
   * @param {String} environmentId - Environment ID to use for evaluation
   * @param {Object} parameterSpace - Parameter space to search
   * @param {Function} progressCallback - Callback for optimization progress
   * @returns {Promise<Object>} - Optimization results
   */
  async optimize(rlManager, algorithmType, environmentId, parameterSpace, progressCallback = null) {
    // Validate inputs
    if (!rlManager || !algorithmType || !environmentId || !parameterSpace) {
      throw new Error('Missing required parameters for optimization');
    }
    
    // Check if algorithm type is available
    const availableAlgorithms = rlManager.getAvailableAlgorithms();
    if (!availableAlgorithms.includes(algorithmType.toLowerCase())) {
      throw new Error(`Algorithm type ${algorithmType} not available. Available types: ${availableAlgorithms.join(', ')}`);
    }
    
    // Reset optimization state
    this.bestParameters = null;
    this.bestScore = this.options.optimizationGoal === 'maximize' ? -Infinity : Infinity;
    this.history = [];
    this.currentIteration = 0;
    
    // Choose optimization method based on parameter space
    let result;
    if (this._isGridSearchSpace(parameterSpace)) {
      result = await this._gridSearch(rlManager, algorithmType, environmentId, parameterSpace, progressCallback);
    } else {
      result = await this._evolutionarySearch(rlManager, algorithmType, environmentId, parameterSpace, progressCallback);
    }
    
    return result;
  }
  
  /**
   * Check if parameter space is suitable for grid search
   * @param {Object} parameterSpace - Parameter space
   * @returns {Boolean} - Whether grid search is suitable
   * @private
   */
  _isGridSearchSpace(parameterSpace) {
    // Check if all parameters have discrete values
    for (const param in parameterSpace) {
      const values = parameterSpace[param];
      if (!Array.isArray(values) || values.length > 10) {
        return false;
      }
    }
    
    // Calculate total combinations
    const totalCombinations = Object.values(parameterSpace)
      .reduce((total, values) => total * values.length, 1);
    
    // Use grid search if total combinations is manageable
    return totalCombinations <= this.options.maxIterations;
  }
  
  /**
   * Perform grid search for hyperparameter optimization
   * @param {Object} rlManager - Reinforcement learning manager
   * @param {String} algorithmType - Algorithm type to optimize
   * @param {String} environmentId - Environment ID to use for evaluation
   * @param {Object} parameterSpace - Parameter space to search
   * @param {Function} progressCallback - Callback for optimization progress
   * @returns {Promise<Object>} - Optimization results
   * @private
   */
  async _gridSearch(rlManager, algorithmType, environmentId, parameterSpace, progressCallback) {
    console.log('Using grid search for hyperparameter optimization');
    
    // Generate all parameter combinations
    const parameterCombinations = this._generateParameterCombinations(parameterSpace);
    const totalCombinations = parameterCombinations.length;
    
    console.log(`Generated ${totalCombinations} parameter combinations`);
    
    // Evaluate each combination
    for (let i = 0; i < totalCombinations; i++) {
      const parameters = parameterCombinations[i];
      this.currentIteration = i + 1;
      
      // Evaluate parameters
      const score = await this._evaluateParameters(
        rlManager, algorithmType, environmentId, parameters
      );
      
      // Update best parameters if better
      this._updateBestParameters(parameters, score);
      
      // Record history
      this.history.push({
        iteration: this.currentIteration,
        parameters,
        score
      });
      
      // Report progress
      if (progressCallback) {
        progressCallback({
          iteration: this.currentIteration,
          totalIterations: totalCombinations,
          parameters,
          score,
          bestParameters: this.bestParameters,
          bestScore: this.bestScore,
          progress: (i + 1) / totalCombinations
        });
      }
    }
    
    return {
      bestParameters: this.bestParameters,
      bestScore: this.bestScore,
      history: this.history,
      method: 'grid_search',
      iterations: this.currentIteration
    };
  }
  
  /**
   * Perform evolutionary search for hyperparameter optimization
   * @param {Object} rlManager - Reinforcement learning manager
   * @param {String} algorithmType - Algorithm type to optimize
   * @param {String} environmentId - Environment ID to use for evaluation
   * @param {Object} parameterSpace - Parameter space to search
   * @param {Function} progressCallback - Callback for optimization progress
   * @returns {Promise<Object>} - Optimization results
   * @private
   */
  async _evolutionarySearch(rlManager, algorithmType, environmentId, parameterSpace, progressCallback) {
    console.log('Using evolutionary search for hyperparameter optimization');
    
    // Initialize population
    let population = this._initializePopulation(parameterSpace, this.options.populationSize);
    
    // Main optimization loop
    for (let iteration = 0; iteration < this.options.maxIterations; iteration++) {
      this.currentIteration = iteration + 1;
      
      // Evaluate population
      const evaluations = await Promise.all(
        population.map(parameters => 
          this._evaluateParameters(rlManager, algorithmType, environmentId, parameters)
        )
      );
      
      // Update best parameters
      for (let i = 0; i < population.length; i++) {
        const parameters = population[i];
        const score = evaluations[i];
        
        this._updateBestParameters(parameters, score);
        
        // Record history
        this.history.push({
          iteration: this.currentIteration,
          parameters,
          score
        });
      }
      
      // Report progress
      if (progressCallback) {
        progressCallback({
          iteration: this.currentIteration,
          totalIterations: this.options.maxIterations,
          populationSize: population.length,
          bestParameters: this.bestParameters,
          bestScore: this.bestScore,
          progress: (iteration + 1) / this.options.maxIterations
        });
      }
      
      // Stop if reached max iterations
      if (iteration >= this.options.maxIterations - 1) {
        break;
      }
      
      // Create next generation
      population = this._createNextGeneration(population, evaluations, parameterSpace);
    }
    
    return {
      bestParameters: this.bestParameters,
      bestScore: this.bestScore,
      history: this.history,
      method: 'evolutionary_search',
      iterations: this.currentIteration
    };
  }
  
  /**
   * Generate all parameter combinations for grid search
   * @param {Object} parameterSpace - Parameter space
   * @returns {Array<Object>} - Parameter combinations
   * @private
   */
  _generateParameterCombinations(parameterSpace) {
    const paramNames = Object.keys(parameterSpace);
    const combinations = [];
    
    // Recursive function to generate combinations
    const generateCombinations = (index, current) => {
      if (index === paramNames.length) {
        combinations.push({ ...current });
        return;
      }
      
      const paramName = paramNames[index];
      const values = parameterSpace[paramName];
      
      for (const value of values) {
        current[paramName] = value;
        generateCombinations(index + 1, current);
      }
    };
    
    generateCombinations(0, {});
    return combinations;
  }
  
  /**
   * Initialize population for evolutionary search
   * @param {Object} parameterSpace - Parameter space
   * @param {Number} size - Population size
   * @returns {Array<Object>} - Initial population
   * @private
   */
  _initializePopulation(parameterSpace, size) {
    const population = [];
    
    for (let i = 0; i < size; i++) {
      const individual = {};
      
      // Generate random values for each parameter
      for (const param in parameterSpace) {
        const range = parameterSpace[param];
        
        if (Array.isArray(range)) {
          // Discrete values
          const index = Math.floor(Math.random() * range.length);
          individual[param] = range[index];
        } else if (typeof range === 'object' && range.min !== undefined && range.max !== undefined) {
          // Continuous range
          if (typeof range.min === 'number' && typeof range.max === 'number') {
            // Numeric parameter
            individual[param] = range.min + Math.random() * (range.max - range.min);
            
            // Round to precision if specified
            if (range.precision !== undefined) {
              const factor = Math.pow(10, range.precision);
              individual[param] = Math.round(individual[param] * factor) / factor;
            }
          } else {
            // Non-numeric parameter (shouldn't happen, but just in case)
            console.warn(`Parameter ${param} has non-numeric range, using min value`);
            individual[param] = range.min;
          }
        } else {
          throw new Error(`Invalid parameter space for ${param}`);
        }
      }
      
      population.push(individual);
    }
    
    return population;
  }
  
  /**
   * Create next generation for evolutionary search
   * @param {Array<Object>} population - Current population
   * @param {Array<Number>} scores - Evaluation scores
   * @param {Object} parameterSpace - Parameter space
   * @returns {Array<Object>} - Next generation
   * @private
   */
  _createNextGeneration(population, scores, parameterSpace) {
    const nextGeneration = [];
    const populationSize = population.length;
    
    // Sort population by score
    const sortedIndices = this._getSortedIndices(scores);
    
    // Elitism: keep best individuals
    const eliteCount = Math.max(1, Math.floor(populationSize * 0.2));
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push({ ...population[sortedIndices[i]] });
    }
    
    // Fill rest of population with crossover and mutation
    while (nextGeneration.length < populationSize) {
      // Select parents using tournament selection
      const parent1Index = this._tournamentSelection(sortedIndices, 3);
      const parent2Index = this._tournamentSelection(sortedIndices, 3, parent1Index);
      
      const parent1 = population[parent1Index];
      const parent2 = population[parent2Index];
      
      // Perform crossover
      const child = this._crossover(parent1, parent2);
      
      // Perform mutation
      this._mutate(child, parameterSpace);
      
      nextGeneration.push(child);
    }
    
    return nextGeneration;
  }
  
  /**
   * Get indices sorted by score
   * @param {Array<Number>} scores - Evaluation scores
   * @returns {Array<Number>} - Sorted indices
   * @private
   */
  _getSortedIndices(scores) {
    const indices = scores.map((_, i) => i);
    
    if (this.options.optimizationGoal === 'maximize') {
      indices.sort((a, b) => scores[b] - scores[a]);
    } else {
      indices.sort((a, b) => scores[a] - scores[b]);
    }
    
    return indices;
  }
  
  /**
   * Tournament selection
   * @param {Array<Number>} sortedIndices - Indices sorted by score
   * @param {Number} tournamentSize - Tournament size
   * @param {Number} excludeIndex - Index to exclude
   * @returns {Number} - Selected index
   * @private
   */
  _tournamentSelection(sortedIndices, tournamentSize, excludeIndex = -1) {
    const tournament = [];
    
    // Select random individuals for tournament
    while (tournament.length < tournamentSize) {
      const index = sortedIndices[Math.floor(Math.random() * sortedIndices.length)];
      if (index !== excludeIndex && !tournament.includes(index)) {
        tournament.push(index);
      }
    }
    
    // Return best individual from tournament
    return tournament[0];
  }
  
  /**
   * Perform crossover between two individuals
   * @param {Object} parent1 - First parent
   * @param {Object} parent2 - Second parent
   * @returns {Object} - Child
   * @private
   */
  _crossover(parent1, parent2) {
    const child = {};
    
    // Uniform crossover
    for (const param in parent1) {
      child[param] = Math.random() < 0.5 ? parent1[param] : parent2[param];
    }
    
    return child;
  }
  
  /**
   * Perform mutation on an individual
   * @param {Object} individual - Individual to mutate
   * @param {Object} parameterSpace - Parameter space
   * @private
   */
  _mutate(individual, parameterSpace) {
    // Mutate each parameter with probability 0.2
    for (const param in individual) {
      if (Math.random() < 0.2) {
        const range = parameterSpace[param];
        
        if (Array.isArray(range)) {
          // Discrete values
          const index = Math.floor(Math.random() * range.length);
          individual[param] = range[index];
        } else if (typeof range === 'object' && range.min !== undefined && range.max !== undefined) {
          // Continuous range
          if (typeof range.min === 'number' && typeof range.max === 'number') {
            // Numeric parameter
            // Perturb current value
            const perturbation = (range.max - range.min) * 0.1 * (Math.random() * 2 - 1);
            individual[param] += perturbation;
            
            // Clamp to range
            individual[param] = Math.max(range.min, Math.min(range.max, individual[param]));
            
            // Round to precision if specified
            if (range.precision !== undefined) {
              const factor = Math.pow(10, range.precision);
              individual[param] = Math.round(individual[param] * factor) / factor;
            }
          }
        }
      }
    }
  }
  
  /**
   * Evaluate parameters
   * @param {Object} rlManager - Reinforcement learning manager
   * @param {String} algorithmType - Algorithm type to optimize
   * @param {String} environmentId - Environment ID to use for evaluation
   * @param {Object} parameters - Parameters to evaluate
   * @returns {Promise<Number>} - Evaluation score
   * @private
   */
  async _evaluateParameters(rlManager, algorithmType, environmentId, parameters) {
    // Create algorithm with parameters
    const algorithmId = `optimization_${this.currentIteration}_${Date.now()}`;
    const algorithm = rlManager.createAlgorithm(algorithmType, algorithmId, parameters);
    
    // Initialize algorithm
    rlManager.initializeAlgorithm(algorithmId, environmentId);
    
    // Evaluate algorithm
    const result = await rlManager.evaluateAlgorithm(algorithmId, environmentId, {
      episodes: this.options.evaluationEpisodes,
      render: false
    });
    
    // Remove algorithm
    rlManager.removeAlgorithm(algorithmId);
    
    // Return score based on optimization metric
    return result[this.options.optimizationMetric];
  }
  
  /**
   * Update best parameters if better
   * @param {Object} parameters - Parameters to evaluate
   * @param {Number} score - Evaluation score
   * @private
   */
  _updateBestParameters(parameters, score) {
    let isBetter = false;
    
    if (this.options.optimizationGoal === 'maximize') {
      isBetter = score > this.bestScore;
    } else {
      isBetter = score < this.bestScore;
    }
    
    if (isBetter) {
      this.bestParameters = { ...parameters };
      this.bestScore = score;
    }
  }
}

module.exports = HyperparameterOptimization;
