/**
 * Agent Evolution for DevSparkAgent Playground
 * 
 * Manages the evolution of agents over time.
 */

class AgentEvolution {
  /**
   * Create a new AgentEvolution instance
   * @param {Object} config - Configuration options
   * @param {GeneticAlgorithm} geneticAlgorithm - Genetic algorithm instance
   * @param {LearningMechanisms} learningMechanisms - Learning mechanisms instance
   */
  constructor(config, geneticAlgorithm, learningMechanisms) {
    this.config = config;
    this.geneticAlgorithm = geneticAlgorithm;
    this.learningMechanisms = learningMechanisms;
    this.agents = new Map();
    this.populations = new Map();
    this.evolutionHistory = [];
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the agent evolution
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing AgentEvolution...');
      
      // Initialize default populations
      await this._initializeDefaultPopulations();
      
      this.logger.info('AgentEvolution initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`AgentEvolution initialization failed: ${error.message}`, error);
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
      this.logger.info(`Registering agent ${agentId}`);
      
      // Store agent
      this.agents.set(agentId, {
        id: agentId,
        agent,
        registeredAt: new Date(),
        lastEvolved: null,
        evolutionHistory: []
      });
      
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
      this.logger.info(`Unregistering agent ${agentId}`);
      
      // Check if agent exists
      if (!this.agents.has(agentId)) {
        this.logger.warn(`Agent ${agentId} not found`);
        return false;
      }
      
      // Remove agent
      this.agents.delete(agentId);
      
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
      this.logger.info(`Creating population ${populationId}`);
      
      // Check if population already exists
      if (this.populations.has(populationId)) {
        throw new Error(`Population ${populationId} already exists`);
      }
      
      // Create population
      const population = {
        id: populationId,
        name: options.name || populationId,
        description: options.description || '',
        agentIds: options.agentIds || [],
        createdAt: new Date(),
        lastEvolved: null,
        evolutionHistory: [],
        options: {
          ...this.config.evolution.defaultPopulationOptions,
          ...options
        }
      };
      
      // Store population
      this.populations.set(populationId, population);
      
      return population;
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
      this.logger.info(`Deleting population ${populationId}`);
      
      // Check if population exists
      if (!this.populations.has(populationId)) {
        this.logger.warn(`Population ${populationId} not found`);
        return false;
      }
      
      // Remove population
      this.populations.delete(populationId);
      
      return true;
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
      this.logger.info(`Adding agent ${agentId} to population ${populationId}`);
      
      // Check if population exists
      if (!this.populations.has(populationId)) {
        throw new Error(`Population ${populationId} not found`);
      }
      
      // Check if agent exists
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Get population
      const population = this.populations.get(populationId);
      
      // Check if agent is already in population
      if (population.agentIds.includes(agentId)) {
        this.logger.warn(`Agent ${agentId} is already in population ${populationId}`);
        return false;
      }
      
      // Add agent to population
      population.agentIds.push(agentId);
      
      return true;
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
      this.logger.info(`Removing agent ${agentId} from population ${populationId}`);
      
      // Check if population exists
      if (!this.populations.has(populationId)) {
        throw new Error(`Population ${populationId} not found`);
      }
      
      // Get population
      const population = this.populations.get(populationId);
      
      // Check if agent is in population
      const index = population.agentIds.indexOf(agentId);
      if (index === -1) {
        this.logger.warn(`Agent ${agentId} is not in population ${populationId}`);
        return false;
      }
      
      // Remove agent from population
      population.agentIds.splice(index, 1);
      
      return true;
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
      this.logger.info(`Evolving population ${populationId}`);
      
      // Check if population exists
      if (!this.populations.has(populationId)) {
        throw new Error(`Population ${populationId} not found`);
      }
      
      // Get population
      const population = this.populations.get(populationId);
      
      // Check if population has agents
      if (population.agentIds.length === 0) {
        throw new Error(`Population ${populationId} has no agents`);
      }
      
      // Get agents
      const agents = population.agentIds.map(agentId => {
        const agentEntry = this.agents.get(agentId);
        if (!agentEntry) {
          throw new Error(`Agent ${agentId} not found`);
        }
        return agentEntry.agent;
      });
      
      // Initialize genetic algorithm
      await this.geneticAlgorithm.initialize(agents);
      
      // Evolve population
      const generations = options.generations || population.options.generations || 1;
      const evolutionResults = await this.geneticAlgorithm.evolveMultiple(generations);
      
      // Update population
      population.lastEvolved = new Date();
      population.evolutionHistory.push({
        timestamp: new Date(),
        generations: evolutionResults.generations,
        bestFitness: evolutionResults.bestIndividual ? evolutionResults.bestIndividual.fitness : 0,
        options
      });
      
      // Update agents
      const evolvedAgents = this.geneticAlgorithm.getPopulation();
      for (let i = 0; i < evolvedAgents.length && i < population.agentIds.length; i++) {
        const agentId = population.agentIds[i];
        const agentEntry = this.agents.get(agentId);
        
        // Update agent
        agentEntry.agent = evolvedAgents[i];
        agentEntry.lastEvolved = new Date();
        agentEntry.evolutionHistory.push({
          timestamp: new Date(),
          populationId,
          generations: evolutionResults.generations,
          fitness: evolvedAgents[i].fitness
        });
      }
      
      // Add to global evolution history
      this.evolutionHistory.push({
        timestamp: new Date(),
        populationId,
        generations: evolutionResults.generations,
        bestFitness: evolutionResults.bestIndividual ? evolutionResults.bestIndividual.fitness : 0,
        options
      });
      
      return {
        populationId,
        generations: evolutionResults.generations,
        bestFitness: evolutionResults.bestIndividual ? evolutionResults.bestIndividual.fitness : 0,
        averageFitness: evolutionResults.results[evolutionResults.results.length - 1].averageFitness,
        timestamp: new Date()
      };
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
      this.logger.info(`Applying learning to agent ${agentId} using model ${modelId}`);
      
      // Check if agent exists
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Get agent
      const agentEntry = this.agents.get(agentId);
      
      // Train model
      const trainingResults = await this.learningMechanisms.trainModel(modelId, trainingData, options);
      
      // Update agent
      agentEntry.lastEvolved = new Date();
      agentEntry.evolutionHistory.push({
        timestamp: new Date(),
        modelId,
        trainingResults,
        options
      });
      
      return {
        agentId,
        modelId,
        trainingResults,
        timestamp: new Date()
      };
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
      // Check if agent exists
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Get agent
      const agentEntry = this.agents.get(agentId);
      
      // Apply reinforcement learning
      const results = await this.learningMechanisms.applyReinforcementLearning(
        modelId,
        state,
        action,
        reward,
        nextState,
        options
      );
      
      // Update agent
      agentEntry.lastEvolved = new Date();
      agentEntry.evolutionHistory.push({
        timestamp: new Date(),
        modelId,
        reinforcementResults: results,
        options
      });
      
      return {
        agentId,
        modelId,
        results,
        timestamp: new Date()
      };
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
      this.logger.info(`Transferring knowledge from agent ${sourceAgentId} to agent ${targetAgentId} using model ${modelId}`);
      
      // Check if source agent exists
      if (!this.agents.has(sourceAgentId)) {
        throw new Error(`Source agent ${sourceAgentId} not found`);
      }
      
      // Check if target agent exists
      if (!this.agents.has(targetAgentId)) {
        throw new Error(`Target agent ${targetAgentId} not found`);
      }
      
      // Get source agent
      const sourceAgentEntry = this.agents.get(sourceAgentId);
      
      // Get target agent
      const targetAgentEntry = this.agents.get(targetAgentId);
      
      // Export knowledge from source agent
      const knowledge = await this.learningMechanisms.getModel(modelId).exportKnowledge(options);
      
      // Import knowledge to target agent
      const results = await this.learningMechanisms.getModel(modelId).importKnowledge(knowledge, options);
      
      // Update target agent
      targetAgentEntry.lastEvolved = new Date();
      targetAgentEntry.evolutionHistory.push({
        timestamp: new Date(),
        sourceAgentId,
        modelId,
        transferResults: results,
        options
      });
      
      return {
        sourceAgentId,
        targetAgentId,
        modelId,
        results,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to transfer knowledge from agent ${sourceAgentId} to agent ${targetAgentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent information
   * @param {string} agentId - Agent ID
   * @returns {Object} - Agent information
   */
  getAgentInfo(agentId) {
    const agentEntry = this.agents.get(agentId);
    if (!agentEntry) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    return {
      id: agentEntry.id,
      registeredAt: agentEntry.registeredAt,
      lastEvolved: agentEntry.lastEvolved,
      evolutionHistory: agentEntry.evolutionHistory
    };
  }

  /**
   * Get population information
   * @param {string} populationId - Population ID
   * @returns {Object} - Population information
   */
  getPopulationInfo(populationId) {
    const population = this.populations.get(populationId);
    if (!population) {
      throw new Error(`Population ${populationId} not found`);
    }
    
    return {
      id: population.id,
      name: population.name,
      description: population.description,
      agentIds: population.agentIds,
      createdAt: population.createdAt,
      lastEvolved: population.lastEvolved,
      evolutionHistory: population.evolutionHistory,
      options: population.options
    };
  }

  /**
   * List all agents
   * @returns {Array<Object>} - List of agents
   */
  listAgents() {
    const agents = [];
    
    for (const [agentId, agentEntry] of this.agents.entries()) {
      agents.push({
        id: agentId,
        registeredAt: agentEntry.registeredAt,
        lastEvolved: agentEntry.lastEvolved
      });
    }
    
    return agents;
  }

  /**
   * List all populations
   * @returns {Array<Object>} - List of populations
   */
  listPopulations() {
    const populations = [];
    
    for (const [populationId, population] of this.populations.entries()) {
      populations.push({
        id: populationId,
        name: population.name,
        description: population.description,
        agentCount: population.agentIds.length,
        createdAt: population.createdAt,
        lastEvolved: population.lastEvolved
      });
    }
    
    return populations;
  }

  /**
   * Get evolution history
   * @returns {Array<Object>} - Evolution history
   */
  getEvolutionHistory() {
    return this.evolutionHistory;
  }

  /**
   * Initialize default populations
   * @private
   * @returns {Promise<void>}
   */
  async _initializeDefaultPopulations() {
    try {
      // Create default population
      await this.createPopulation('default', {
        name: 'Default Population',
        description: 'Default population for agent evolution',
        options: {
          generations: 10,
          populationSize: 20,
          selectionMethod: 'tournament',
          crossoverMethod: 'uniform',
          mutationRate: 0.01,
          elitismRate: 0.1
        }
      });
    } catch (error) {
      this.logger.error(`Failed to initialize default populations: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = AgentEvolution;
