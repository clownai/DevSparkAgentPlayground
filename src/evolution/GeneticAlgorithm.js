/**
 * Genetic Algorithm for DevSparkAgent Playground
 * 
 * Implements genetic algorithm for agent evolution.
 */

class GeneticAlgorithm {
  /**
   * Create a new GeneticAlgorithm instance
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config;
    this.population = [];
    this.generation = 0;
    this.bestIndividual = null;
    this.fitnessHistory = [];
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the genetic algorithm
   * @param {Array<Object>} initialPopulation - Initial population
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize(initialPopulation = []) {
    try {
      this.logger.info('Initializing GeneticAlgorithm...');
      
      // Set initial population
      if (initialPopulation.length > 0) {
        this.population = initialPopulation;
      } else {
        // Generate random population
        this.population = await this._generateRandomPopulation();
      }
      
      // Reset generation counter
      this.generation = 0;
      
      // Reset fitness history
      this.fitnessHistory = [];
      
      this.logger.info(`GeneticAlgorithm initialized with population size ${this.population.length}`);
      return true;
    } catch (error) {
      this.logger.error(`GeneticAlgorithm initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Evolve the population for one generation
   * @returns {Promise<Object>} - Evolution results
   */
  async evolve() {
    try {
      this.logger.info(`Evolving population for generation ${this.generation + 1}`);
      
      // Evaluate fitness
      await this._evaluateFitness();
      
      // Select parents
      const parents = await this._selectParents();
      
      // Create offspring
      const offspring = await this._createOffspring(parents);
      
      // Apply mutation
      await this._applyMutation(offspring);
      
      // Select survivors
      this.population = await this._selectSurvivors(this.population, offspring);
      
      // Increment generation counter
      this.generation++;
      
      // Update best individual
      this._updateBestIndividual();
      
      // Update fitness history
      this._updateFitnessHistory();
      
      this.logger.info(`Evolution completed for generation ${this.generation}`);
      
      return {
        generation: this.generation,
        populationSize: this.population.length,
        bestFitness: this.bestIndividual ? this.bestIndividual.fitness : 0,
        averageFitness: this._calculateAverageFitness()
      };
    } catch (error) {
      this.logger.error(`Evolution failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Evolve the population for multiple generations
   * @param {number} generations - Number of generations to evolve
   * @returns {Promise<Object>} - Evolution results
   */
  async evolveMultiple(generations) {
    try {
      this.logger.info(`Evolving population for ${generations} generations`);
      
      const results = [];
      
      for (let i = 0; i < generations; i++) {
        const result = await this.evolve();
        results.push(result);
        
        // Log progress
        if ((i + 1) % 10 === 0 || i === generations - 1) {
          this.logger.info(`Completed ${i + 1}/${generations} generations`);
        }
      }
      
      return {
        generations: this.generation,
        results,
        bestIndividual: this.bestIndividual,
        fitnessHistory: this.fitnessHistory
      };
    } catch (error) {
      this.logger.error(`Multiple evolution failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get the best individual
   * @returns {Object} - Best individual
   */
  getBestIndividual() {
    return this.bestIndividual;
  }

  /**
   * Get the current population
   * @returns {Array<Object>} - Current population
   */
  getPopulation() {
    return this.population;
  }

  /**
   * Get the fitness history
   * @returns {Array<Object>} - Fitness history
   */
  getFitnessHistory() {
    return this.fitnessHistory;
  }

  /**
   * Generate random population
   * @private
   * @returns {Promise<Array<Object>>} - Random population
   */
  async _generateRandomPopulation() {
    try {
      const populationSize = this.config.evolution.populationSize || 100;
      const population = [];
      
      for (let i = 0; i < populationSize; i++) {
        population.push(await this._generateRandomIndividual());
      }
      
      return population;
    } catch (error) {
      this.logger.error(`Failed to generate random population: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate random individual
   * @private
   * @returns {Promise<Object>} - Random individual
   */
  async _generateRandomIndividual() {
    try {
      // In a real implementation, this would generate a random agent
      // For now, we'll create a placeholder
      
      const genomeSize = this.config.evolution.genomeSize || 100;
      const genome = [];
      
      // Generate random genome
      for (let i = 0; i < genomeSize; i++) {
        genome.push(Math.random());
      }
      
      return {
        id: `agent-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        genome,
        fitness: 0,
        metadata: {
          created: new Date(),
          generation: this.generation
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate random individual: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Evaluate fitness of all individuals
   * @private
   * @returns {Promise<void>}
   */
  async _evaluateFitness() {
    try {
      // In a real implementation, this would evaluate fitness using the evaluation system
      // For now, we'll use a simple function
      
      for (const individual of this.population) {
        individual.fitness = await this._calculateFitness(individual);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate fitness: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Calculate fitness of an individual
   * @private
   * @param {Object} individual - Individual to evaluate
   * @returns {Promise<number>} - Fitness value
   */
  async _calculateFitness(individual) {
    try {
      // In a real implementation, this would calculate fitness based on performance
      // For now, we'll use a simple function
      
      // Sum of genome values
      const sum = individual.genome.reduce((acc, val) => acc + val, 0);
      
      // Normalize to 0-100
      return (sum / individual.genome.length) * 100;
    } catch (error) {
      this.logger.error(`Failed to calculate fitness: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Select parents for reproduction
   * @private
   * @returns {Promise<Array<Object>>} - Selected parents
   */
  async _selectParents() {
    try {
      const selectionMethod = this.config.evolution.selectionMethod || 'tournament';
      
      switch (selectionMethod) {
        case 'tournament':
          return this._tournamentSelection();
        
        case 'roulette':
          return this._rouletteSelection();
        
        case 'rank':
          return this._rankSelection();
        
        default:
          return this._tournamentSelection();
      }
    } catch (error) {
      this.logger.error(`Failed to select parents: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Tournament selection
   * @private
   * @returns {Array<Object>} - Selected parents
   */
  _tournamentSelection() {
    try {
      const tournamentSize = this.config.evolution.tournamentSize || 5;
      const numParents = this.config.evolution.numParents || this.population.length;
      const parents = [];
      
      for (let i = 0; i < numParents; i++) {
        // Select random individuals for tournament
        const tournament = [];
        for (let j = 0; j < tournamentSize; j++) {
          const randomIndex = Math.floor(Math.random() * this.population.length);
          tournament.push(this.population[randomIndex]);
        }
        
        // Select best individual from tournament
        const winner = tournament.reduce((best, current) => {
          return current.fitness > best.fitness ? current : best;
        }, tournament[0]);
        
        parents.push(winner);
      }
      
      return parents;
    } catch (error) {
      this.logger.error(`Failed to perform tournament selection: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Roulette wheel selection
   * @private
   * @returns {Array<Object>} - Selected parents
   */
  _rouletteSelection() {
    try {
      const numParents = this.config.evolution.numParents || this.population.length;
      const parents = [];
      
      // Calculate total fitness
      const totalFitness = this.population.reduce((sum, individual) => sum + individual.fitness, 0);
      
      // Select parents
      for (let i = 0; i < numParents; i++) {
        // Generate random value between 0 and total fitness
        const randomValue = Math.random() * totalFitness;
        
        // Find individual that corresponds to random value
        let sum = 0;
        for (const individual of this.population) {
          sum += individual.fitness;
          if (sum >= randomValue) {
            parents.push(individual);
            break;
          }
        }
        
        // If no individual found (due to floating point errors), add last individual
        if (parents.length <= i) {
          parents.push(this.population[this.population.length - 1]);
        }
      }
      
      return parents;
    } catch (error) {
      this.logger.error(`Failed to perform roulette selection: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Rank selection
   * @private
   * @returns {Array<Object>} - Selected parents
   */
  _rankSelection() {
    try {
      const numParents = this.config.evolution.numParents || this.population.length;
      const parents = [];
      
      // Sort population by fitness
      const sortedPopulation = [...this.population].sort((a, b) => b.fitness - a.fitness);
      
      // Assign ranks
      const ranks = [];
      for (let i = 0; i < sortedPopulation.length; i++) {
        ranks.push(sortedPopulation.length - i);
      }
      
      // Calculate total rank
      const totalRank = ranks.reduce((sum, rank) => sum + rank, 0);
      
      // Select parents
      for (let i = 0; i < numParents; i++) {
        // Generate random value between 0 and total rank
        const randomValue = Math.random() * totalRank;
        
        // Find individual that corresponds to random value
        let sum = 0;
        for (let j = 0; j < sortedPopulation.length; j++) {
          sum += ranks[j];
          if (sum >= randomValue) {
            parents.push(sortedPopulation[j]);
            break;
          }
        }
        
        // If no individual found (due to floating point errors), add last individual
        if (parents.length <= i) {
          parents.push(sortedPopulation[sortedPopulation.length - 1]);
        }
      }
      
      return parents;
    } catch (error) {
      this.logger.error(`Failed to perform rank selection: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create offspring from parents
   * @private
   * @param {Array<Object>} parents - Parent individuals
   * @returns {Promise<Array<Object>>} - Offspring individuals
   */
  async _createOffspring(parents) {
    try {
      const crossoverMethod = this.config.evolution.crossoverMethod || 'uniform';
      const numOffspring = this.config.evolution.numOffspring || this.population.length;
      const offspring = [];
      
      for (let i = 0; i < numOffspring; i++) {
        // Select two random parents
        const parentA = parents[Math.floor(Math.random() * parents.length)];
        const parentB = parents[Math.floor(Math.random() * parents.length)];
        
        // Create offspring
        const child = await this._crossover(parentA, parentB, crossoverMethod);
        
        offspring.push(child);
      }
      
      return offspring;
    } catch (error) {
      this.logger.error(`Failed to create offspring: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Perform crossover between two parents
   * @private
   * @param {Object} parentA - First parent
   * @param {Object} parentB - Second parent
   * @param {string} method - Crossover method
   * @returns {Promise<Object>} - Child individual
   */
  async _crossover(parentA, parentB, method) {
    try {
      switch (method) {
        case 'uniform':
          return this._uniformCrossover(parentA, parentB);
        
        case 'onepoint':
          return this._onePointCrossover(parentA, parentB);
        
        case 'twopoint':
          return this._twoPointCrossover(parentA, parentB);
        
        default:
          return this._uniformCrossover(parentA, parentB);
      }
    } catch (error) {
      this.logger.error(`Failed to perform crossover: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Perform uniform crossover
   * @private
   * @param {Object} parentA - First parent
   * @param {Object} parentB - Second parent
   * @returns {Object} - Child individual
   */
  _uniformCrossover(parentA, parentB) {
    try {
      const childGenome = [];
      
      // For each gene, randomly select from either parent
      for (let i = 0; i < parentA.genome.length; i++) {
        childGenome.push(Math.random() < 0.5 ? parentA.genome[i] : parentB.genome[i]);
      }
      
      return {
        id: `agent-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        genome: childGenome,
        fitness: 0,
        metadata: {
          created: new Date(),
          generation: this.generation + 1,
          parents: [parentA.id, parentB.id]
        }
      };
    } catch (error) {
      this.logger.error(`Failed to perform uniform crossover: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Perform one-point crossover
   * @private
   * @param {Object} parentA - First parent
   * @param {Object} parentB - Second parent
   * @returns {Object} - Child individual
   */
  _onePointCrossover(parentA, parentB) {
    try {
      const childGenome = [];
      
      // Select random crossover point
      const crossoverPoint = Math.floor(Math.random() * parentA.genome.length);
      
      // Create child genome
      for (let i = 0; i < parentA.genome.length; i++) {
        if (i < crossoverPoint) {
          childGenome.push(parentA.genome[i]);
        } else {
          childGenome.push(parentB.genome[i]);
        }
      }
      
      return {
        id: `agent-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        genome: childGenome,
        fitness: 0,
        metadata: {
          created: new Date(),
          generation: this.generation + 1,
          parents: [parentA.id, parentB.id]
        }
      };
    } catch (error) {
      this.logger.error(`Failed to perform one-point crossover: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Perform two-point crossover
   * @private
   * @param {Object} parentA - First parent
   * @param {Object} parentB - Second parent
   * @returns {Object} - Child individual
   */
  _twoPointCrossover(parentA, parentB) {
    try {
      const childGenome = [];
      
      // Select two random crossover points
      let crossoverPoint1 = Math.floor(Math.random() * parentA.genome.length);
      let crossoverPoint2 = Math.floor(Math.random() * parentA.genome.length);
      
      // Ensure crossoverPoint1 < crossoverPoint2
      if (crossoverPoint1 > crossoverPoint2) {
        [crossoverPoint1, crossoverPoint2] = [crossoverPoint2, crossoverPoint1];
      }
      
      // Create child genome
      for (let i = 0; i < parentA.genome.length; i++) {
        if (i < crossoverPoint1 || i >= crossoverPoint2) {
          childGenome.push(parentA.genome[i]);
        } else {
          childGenome.push(parentB.genome[i]);
        }
      }
      
      return {
        id: `agent-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        genome: childGenome,
        fitness: 0,
        metadata: {
          created: new Date(),
          generation: this.generation + 1,
          parents: [parentA.id, parentB.id]
        }
      };
    } catch (error) {
      this.logger.error(`Failed to perform two-point crossover: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Apply mutation to offspring
   * @private
   * @param {Array<Object>} offspring - Offspring individuals
   * @returns {Promise<void>}
   */
  async _applyMutation(offspring) {
    try {
      const mutationRate = this.config.evolution.mutationRate || 0.01;
      const mutationAmount = this.config.evolution.mutationAmount || 0.1;
      
      for (const individual of offspring) {
        for (let i = 0; i < individual.genome.length; i++) {
          // Apply mutation with probability mutationRate
          if (Math.random() < mutationRate) {
            // Apply mutation
            individual.genome[i] += (Math.random() * 2 - 1) * mutationAmount;
            
            // Ensure value is between 0 and 1
            individual.genome[i] = Math.max(0, Math.min(1, individual.genome[i]));
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to apply mutation: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Select survivors for next generation
   * @private
   * @param {Array<Object>} currentPopulation - Current population
   * @param {Array<Object>} offspring - Offspring individuals
   * @returns {Promise<Array<Object>>} - Survivors
   */
  async _selectSurvivors(currentPopulation, offspring) {
    try {
      const survivorSelectionMethod = this.config.evolution.survivorSelectionMethod || 'elitism';
      const populationSize = this.config.evolution.populationSize || 100;
      
      switch (survivorSelectionMethod) {
        case 'elitism':
          return this._elitismSelection(currentPopulation, offspring, populationSize);
        
        case 'replacement':
          return this._replacementSelection(currentPopulation, offspring, populationSize);
        
        case 'mixed':
          return this._mixedSelection(currentPopulation, offspring, populationSize);
        
        default:
          return this._elitismSelection(currentPopulation, offspring, populationSize);
      }
    } catch (error) {
      this.logger.error(`Failed to select survivors: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Elitism selection
   * @private
   * @param {Array<Object>} currentPopulation - Current population
   * @param {Array<Object>} offspring - Offspring individuals
   * @param {number} populationSize - Target population size
   * @returns {Array<Object>} - Survivors
   */
  _elitismSelection(currentPopulation, offspring, populationSize) {
    try {
      const elitismRate = this.config.evolution.elitismRate || 0.1;
      const numElites = Math.floor(populationSize * elitismRate);
      
      // Sort current population by fitness
      const sortedPopulation = [...currentPopulation].sort((a, b) => b.fitness - a.fitness);
      
      // Select elites from current population
      const elites = sortedPopulation.slice(0, numElites);
      
      // Sort offspring by fitness
      const sortedOffspring = [...offspring].sort((a, b) => b.fitness - a.fitness);
      
      // Select remaining individuals from offspring
      const remainingIndividuals = sortedOffspring.slice(0, populationSize - numElites);
      
      // Combine elites and remaining individuals
      return [...elites, ...remainingIndividuals];
    } catch (error) {
      this.logger.error(`Failed to perform elitism selection: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Replacement selection
   * @private
   * @param {Array<Object>} currentPopulation - Current population
   * @param {Array<Object>} offspring - Offspring individuals
   * @param {number} populationSize - Target population size
   * @returns {Array<Object>} - Survivors
   */
  _replacementSelection(currentPopulation, offspring, populationSize) {
    try {
      // Sort offspring by fitness
      const sortedOffspring = [...offspring].sort((a, b) => b.fitness - a.fitness);
      
      // Select top individuals from offspring
      return sortedOffspring.slice(0, populationSize);
    } catch (error) {
      this.logger.error(`Failed to perform replacement selection: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Mixed selection
   * @private
   * @param {Array<Object>} currentPopulation - Current population
   * @param {Array<Object>} offspring - Offspring individuals
   * @param {number} populationSize - Target population size
   * @returns {Array<Object>} - Survivors
   */
  _mixedSelection(currentPopulation, offspring, populationSize) {
    try {
      // Combine current population and offspring
      const combinedPopulation = [...currentPopulation, ...offspring];
      
      // Sort by fitness
      const sortedPopulation = combinedPopulation.sort((a, b) => b.fitness - a.fitness);
      
      // Select top individuals
      return sortedPopulation.slice(0, populationSize);
    } catch (error) {
      this.logger.error(`Failed to perform mixed selection: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update best individual
   * @private
   * @returns {void}
   */
  _updateBestIndividual() {
    try {
      // Find individual with highest fitness
      const bestIndividual = this.population.reduce((best, current) => {
        return current.fitness > best.fitness ? current : best;
      }, this.population[0]);
      
      // Update best individual if better than current best
      if (!this.bestIndividual || bestIndividual.fitness > this.bestIndividual.fitness) {
        this.bestIndividual = { ...bestIndividual };
      }
    } catch (error) {
      this.logger.error(`Failed to update best individual: ${error.message}`, error);
    }
  }

  /**
   * Update fitness history
   * @private
   * @returns {void}
   */
  _updateFitnessHistory() {
    try {
      // Calculate statistics
      const fitnesses = this.population.map(individual => individual.fitness);
      const min = Math.min(...fitnesses);
      const max = Math.max(...fitnesses);
      const avg = fitnesses.reduce((sum, fitness) => sum + fitness, 0) / fitnesses.length;
      
      // Add to history
      this.fitnessHistory.push({
        generation: this.generation,
        min,
        max,
        avg
      });
      
      // Limit history size
      const maxHistorySize = this.config.evolution.maxHistorySize || 100;
      if (this.fitnessHistory.length > maxHistorySize) {
        this.fitnessHistory.shift();
      }
    } catch (error) {
      this.logger.error(`Failed to update fitness history: ${error.message}`, error);
    }
  }

  /**
   * Calculate average fitness
   * @private
   * @returns {number} - Average fitness
   */
  _calculateAverageFitness() {
    try {
      const fitnesses = this.population.map(individual => individual.fitness);
      return fitnesses.reduce((sum, fitness) => sum + fitness, 0) / fitnesses.length;
    } catch (error) {
      this.logger.error(`Failed to calculate average fitness: ${error.message}`, error);
      return 0;
    }
  }
}

module.exports = GeneticAlgorithm;
