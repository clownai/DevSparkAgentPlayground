/**
 * Evolution System for DevSparkAgent Playground
 * 
 * Main class responsible for managing agent evolution.
 */

const GeneticAlgorithm = require('./GeneticAlgorithm');
const LearningMechanisms = require('./LearningMechanisms');
const AgentEvolution = require('./AgentEvolution');
const PerformanceTracking = require('./PerformanceTracking');

class EvolutionSystem {
  /**
   * Create a new EvolutionSystem instance
   * @param {Object} config - Configuration options
   * @param {InteractionFramework} interactionFramework - Interaction framework instance
   */
  constructor(config, interactionFramework) {
    this.config = config;
    this.interactionFramework = interactionFramework;
    this.initialized = false;
    this.logger = console; // Will be replaced with proper logger
    
    // Create components
    this.geneticAlgorithm = new GeneticAlgorithm(config);
    this.learningMechanisms = new LearningMechanisms(config);
    this.agentEvolution = new AgentEvolution(config, this.geneticAlgorithm, this.learningMechanisms);
    this.performanceTracking = new PerformanceTracking(config);
  }

  /**
   * Initialize the evolution system
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing EvolutionSystem...');
      
      // Initialize components
      await this.geneticAlgorithm.initialize();
      await this.learningMechanisms.initialize();
      await this.agentEvolution.initialize();
      await this.performanceTracking.initialize();
      
      // Set up event listeners
      this._setupEventListeners();
      
      this.initialized = true;
      this.logger.info('EvolutionSystem initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`EvolutionSystem initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start the evolution system
   * @returns {Promise<boolean>} - Resolves to true if startup is successful
   */
  async start() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      this.logger.info('Starting EvolutionSystem...');
      
      // Nothing specific to start, components are already initialized
      
      this.logger.info('EvolutionSystem started successfully');
      return true;
    } catch (error) {
      this.logger.error(`EvolutionSystem startup failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the evolution system
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      if (!this.initialized) {
        this.logger.warn('EvolutionSystem not initialized, nothing to stop');
        return false;
      }
      
      this.logger.info('Stopping EvolutionSystem...');
      
      // Nothing specific to stop
      
      this.initialized = false;
      this.logger.info('EvolutionSystem stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`EvolutionSystem shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register an agent
   * @param {string} agentId - Agent ID
   * @param {Object} agent - Agent object
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerAgent(agentId, agent) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      this.logger.info(`Registering agent ${agentId}`);
      
      // Register agent with evolution system
      await this.agentEvolution.registerAgent(agentId, agent);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterAgent(agentId) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      this.logger.info(`Unregistering agent ${agentId}`);
      
      // Unregister agent from evolution system
      await this.agentEvolution.unregisterAgent(agentId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a population
   * @param {string} populationId - Population ID
   * @param {Object} options - Population options
   * @returns {Promise<Object>} - Population object
   */
  async createPopulation(populationId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.agentEvolution.createPopulation(populationId, options);
    } catch (error) {
      this.logger.error(`Failed to create population ${populationId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete a population
   * @param {string} populationId - Population ID
   * @returns {Promise<boolean>} - Resolves to true if deletion is successful
   */
  async deletePopulation(populationId) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.agentEvolution.deletePopulation(populationId);
    } catch (error) {
      this.logger.error(`Failed to delete population ${populationId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Add agent to population
   * @param {string} populationId - Population ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if addition is successful
   */
  async addAgentToPopulation(populationId, agentId) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.agentEvolution.addAgentToPopulation(populationId, agentId);
    } catch (error) {
      this.logger.error(`Failed to add agent ${agentId} to population ${populationId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Remove agent from population
   * @param {string} populationId - Population ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if removal is successful
   */
  async removeAgentFromPopulation(populationId, agentId) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.agentEvolution.removeAgentFromPopulation(populationId, agentId);
    } catch (error) {
      this.logger.error(`Failed to remove agent ${agentId} from population ${populationId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Evolve a population
   * @param {string} populationId - Population ID
   * @param {Object} options - Evolution options
   * @returns {Promise<Object>} - Evolution results
   */
  async evolvePopulation(populationId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      const results = await this.agentEvolution.evolvePopulation(populationId, options);
      
      // Track performance
      await this._trackEvolutionPerformance(populationId, results);
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to evolve population ${populationId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Apply learning to an agent
   * @param {string} agentId - Agent ID
   * @param {string} modelId - Learning model ID
   * @param {Object} trainingData - Training data
   * @param {Object} options - Learning options
   * @returns {Promise<Object>} - Learning results
   */
  async applyLearning(agentId, modelId, trainingData, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      const results = await this.agentEvolution.applyLearning(agentId, modelId, trainingData, options);
      
      // Track performance
      await this._trackLearningPerformance(agentId, modelId, results);
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to apply learning to agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Apply reinforcement learning to an agent
   * @param {string} agentId - Agent ID
   * @param {string} modelId - Learning model ID
   * @param {Object} state - Current state
   * @param {Object} action - Action taken
   * @param {number} reward - Reward received
   * @param {Object} nextState - Next state
   * @param {Object} options - Learning options
   * @returns {Promise<Object>} - Learning results
   */
  async applyReinforcementLearning(agentId, modelId, state, action, reward, nextState, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.agentEvolution.applyReinforcementLearning(
        agentId,
        modelId,
        state,
        action,
        reward,
        nextState,
        options
      );
    } catch (error) {
      this.logger.error(`Failed to apply reinforcement learning to agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Transfer knowledge between agents
   * @param {string} sourceAgentId - Source agent ID
   * @param {string} targetAgentId - Target agent ID
   * @param {string} modelId - Learning model ID
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} - Transfer results
   */
  async transferKnowledge(sourceAgentId, targetAgentId, modelId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.agentEvolution.transferKnowledge(sourceAgentId, targetAgentId, modelId, options);
    } catch (error) {
      this.logger.error(`Failed to transfer knowledge from agent ${sourceAgentId} to agent ${targetAgentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Track agent performance
   * @param {string} agentId - Agent ID
   * @param {string} metricId - Metric ID
   * @param {*} value - Metric value
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Performance record
   */
  async trackPerformance(agentId, metricId, value, context = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.performanceTracking.trackPerformance(agentId, metricId, value, context);
    } catch (error) {
      this.logger.error(`Failed to track performance for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Run benchmark for an agent
   * @param {string} agentId - Agent ID
   * @param {string} benchmarkId - Benchmark ID
   * @param {Object} options - Benchmark options
   * @returns {Promise<Object>} - Benchmark results
   */
  async runBenchmark(agentId, benchmarkId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('EvolutionSystem not initialized');
      }
      
      return this.performanceTracking.runBenchmark(agentId, benchmarkId, options);
    } catch (error) {
      this.logger.error(`Failed to run benchmark ${benchmarkId} for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent performance
   * @param {string} agentId - Agent ID
   * @param {string} metricId - Metric ID (optional)
   * @param {Object} options - Query options
   * @returns {Array<Object>} - Performance records
   */
  getAgentPerformance(agentId, metricId = null, options = {}) {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.performanceTracking.getAgentPerformance(agentId, metricId, options);
  }

  /**
   * Compare agent performance
   * @param {Array<string>} agentIds - Agent IDs to compare
   * @param {string} metricId - Metric ID
   * @param {Object} options - Comparison options
   * @returns {Object} - Comparison results
   */
  compareAgentPerformance(agentIds, metricId, options = {}) {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.performanceTracking.compareAgentPerformance(agentIds, metricId, options);
  }

  /**
   * Get agent information
   * @param {string} agentId - Agent ID
   * @returns {Object} - Agent information
   */
  getAgentInfo(agentId) {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.agentEvolution.getAgentInfo(agentId);
  }

  /**
   * Get population information
   * @param {string} populationId - Population ID
   * @returns {Object} - Population information
   */
  getPopulationInfo(populationId) {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.agentEvolution.getPopulationInfo(populationId);
  }

  /**
   * List all agents
   * @returns {Array<Object>} - List of agents
   */
  listAgents() {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.agentEvolution.listAgents();
  }

  /**
   * List all populations
   * @returns {Array<Object>} - List of populations
   */
  listPopulations() {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.agentEvolution.listPopulations();
  }

  /**
   * List all metrics
   * @returns {Array<Object>} - List of metrics
   */
  listMetrics() {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.performanceTracking.listMetrics();
  }

  /**
   * List all benchmarks
   * @returns {Array<Object>} - List of benchmarks
   */
  listBenchmarks() {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.performanceTracking.listBenchmarks();
  }

  /**
   * Get evolution history
   * @returns {Array<Object>} - Evolution history
   */
  getEvolutionHistory() {
    if (!this.initialized) {
      throw new Error('EvolutionSystem not initialized');
    }
    
    return this.agentEvolution.getEvolutionHistory();
  }

  /**
   * Set up event listeners
   * @private
   * @returns {void}
   */
  _setupEventListeners() {
    try {
      // In a real implementation, this would set up event listeners
      // for interaction with other components
      
      // For example, listen for agent registration events
      // this.interactionFramework.on('agent:registered', (agentId, agentInfo) => {
      //   this.registerAgent(agentId, agentInfo);
      // });
    } catch (error) {
      this.logger.error(`Failed to set up event listeners: ${error.message}`, error);
    }
  }

  /**
   * Track evolution performance
   * @private
   * @param {string} populationId - Population ID
   * @param {Object} results - Evolution results
   * @returns {Promise<void>}
   */
  async _trackEvolutionPerformance(populationId, results) {
    try {
      // Get population
      const population = this.agentEvolution.getPopulationInfo(populationId);
      
      // Track performance for each agent
      for (const agentId of population.agentIds) {
        await this.performanceTracking.trackPerformance(agentId, 'evolutionFitness', results.bestFitness, {
          populationId,
          generations: results.generations,
          timestamp: results.timestamp
        });
      }
    } catch (error) {
      this.logger.error(`Failed to track evolution performance: ${error.message}`, error);
    }
  }

  /**
   * Track learning performance
   * @private
   * @param {string} agentId - Agent ID
   * @param {string} modelId - Learning model ID
   * @param {Object} results - Learning results
   * @returns {Promise<void>}
   */
  async _trackLearningPerformance(agentId, modelId, results) {
    try {
      // Track performance
      await this.performanceTracking.trackPerformance(agentId, 'learningError', results.trainingResults.error, {
        modelId,
        iterations: results.trainingResults.iterations,
        timestamp: results.timestamp
      });
    } catch (error) {
      this.logger.error(`Failed to track learning performance: ${error.message}`, error);
    }
  }
}

module.exports = EvolutionSystem;
