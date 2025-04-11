/**
 * ChallengeScenarios.js
 * Implementation of challenge scenarios for agent evaluation
 */

class ChallengeScenarios {
  /**
   * Create a new ChallengeScenarios instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      categoriesEnabled: true,
      randomSeed: null,
      ...options
    };
    
    this.scenarios = new Map();
    this.categories = new Map();
    this.results = new Map();
    
    this.logger = options.logger || console;
    
    // Initialize random generator
    this.random = this.createRandomGenerator(this.options.randomSeed);
    
    // Initialize default categories
    this.initializeDefaultCategories();
  }
  
  /**
   * Initialize default categories
   */
  initializeDefaultCategories() {
    this.registerCategory('navigation', {
      name: 'Navigation',
      description: 'Scenarios focused on navigating through environments',
      tags: ['movement', 'pathfinding', 'exploration']
    });
    
    this.registerCategory('problem-solving', {
      name: 'Problem Solving',
      description: 'Scenarios requiring logical reasoning and problem-solving skills',
      tags: ['logic', 'reasoning', 'planning']
    });
    
    this.registerCategory('learning', {
      name: 'Learning',
      description: 'Scenarios testing learning capabilities and adaptation',
      tags: ['adaptation', 'transfer', 'generalization']
    });
    
    this.registerCategory('cooperation', {
      name: 'Cooperation',
      description: 'Scenarios requiring cooperation with other agents',
      tags: ['multi-agent', 'teamwork', 'communication']
    });
    
    this.registerCategory('adversarial', {
      name: 'Adversarial',
      description: 'Scenarios with competing objectives or adversaries',
      tags: ['competition', 'zero-sum', 'strategy']
    });
  }
  
  /**
   * Create a deterministic random number generator
   * @param {number} seed - Random seed
   * @returns {function} Random number generator
   */
  createRandomGenerator(seed) {
    // Simple deterministic random number generator
    const generator = {
      seed: seed || Math.floor(Math.random() * 1000000),
      
      // Generate random number between 0 and 1
      random: function() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
      },
      
      // Generate random integer between min and max (inclusive)
      randomInt: function(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
      },
      
      // Generate random element from array
      randomElement: function(array) {
        return array[this.randomInt(0, array.length - 1)];
      },
      
      // Shuffle array
      shuffle: function(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      }
    };
    
    return generator;
  }
  
  /**
   * Register a new category
   * @param {string} id - Category ID
   * @param {object} definition - Category definition
   * @returns {boolean} Registration success
   */
  registerCategory(id, definition) {
    if (!this.options.categoriesEnabled) {
      return false;
    }
    
    if (this.categories.has(id)) {
      this.logger.warn(`Category ${id} already exists, overwriting`);
    }
    
    this.categories.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      tags: definition.tags || [],
      metadata: definition.metadata || {}
    });
    
    return true;
  }
  
  /**
   * Register a new scenario
   * @param {string} id - Scenario ID
   * @param {object} definition - Scenario definition
   * @returns {boolean} Registration success
   */
  registerScenario(id, definition) {
    if (this.scenarios.has(id)) {
      this.logger.warn(`Scenario ${id} already exists, overwriting`);
    }
    
    // Validate difficulty level
    const difficulty = definition.difficulty || 'medium';
    if (!this.options.difficultyLevels.includes(difficulty)) {
      this.logger.warn(`Invalid difficulty level: ${difficulty}, defaulting to medium`);
      definition.difficulty = 'medium';
    }
    
    // Validate category
    if (definition.category && !this.categories.has(definition.category)) {
      if (this.options.categoriesEnabled) {
        this.logger.warn(`Unknown category: ${definition.category}`);
      }
    }
    
    this.scenarios.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      difficulty: definition.difficulty || 'medium',
      category: definition.category || null,
      tags: definition.tags || [],
      parameters: definition.parameters || {},
      setup: definition.setup || (() => ({})),
      evaluate: definition.evaluate || (() => ({ score: 0 })),
      cleanup: definition.cleanup || (() => {}),
      metadata: definition.metadata || {}
    });
    
    return true;
  }
  
  /**
   * Get scenario definition
   * @param {string} id - Scenario ID
   * @returns {object|null} Scenario definition
   */
  getScenario(id) {
    return this.scenarios.get(id) || null;
  }
  
  /**
   * Get all scenario definitions
   * @param {object} filters - Filters to apply
   * @returns {Array<object>} Scenario definitions
   */
  getAllScenarios(filters = {}) {
    let scenarios = Array.from(this.scenarios.values());
    
    // Apply filters
    if (filters.difficulty) {
      scenarios = scenarios.filter(scenario => scenario.difficulty === filters.difficulty);
    }
    
    if (filters.category) {
      scenarios = scenarios.filter(scenario => scenario.category === filters.category);
    }
    
    if (filters.tag) {
      scenarios = scenarios.filter(scenario => scenario.tags.includes(filters.tag));
    }
    
    return scenarios;
  }
  
  /**
   * Get category definition
   * @param {string} id - Category ID
   * @returns {object|null} Category definition
   */
  getCategory(id) {
    return this.categories.get(id) || null;
  }
  
  /**
   * Get all category definitions
   * @returns {Array<object>} Category definitions
   */
  getAllCategories() {
    return Array.from(this.categories.values());
  }
  
  /**
   * Run a scenario
   * @param {string} id - Scenario ID
   * @param {object} agent - Agent to evaluate
   * @param {object} options - Run options
   * @returns {Promise<object>} Scenario result
   */
  async runScenario(id, agent, options = {}) {
    const scenario = this.scenarios.get(id);
    
    if (!scenario) {
      throw new Error(`Unknown scenario: ${id}`);
    }
    
    try {
      // Setup scenario
      const startTime = Date.now();
      const context = await scenario.setup({
        agent,
        options,
        random: this.random
      });
      
      // Run evaluation
      const result = await scenario.evaluate({
        agent,
        context,
        options,
        random: this.random
      });
      
      // Add metadata
      const endTime = Date.now();
      result.scenarioId = id;
      result.agentId = agent.id || 'unknown';
      result.startTime = startTime;
      result.endTime = endTime;
      result.duration = endTime - startTime;
      
      // Store result
      this.recordResult(id, agent, result);
      
      // Cleanup
      await scenario.cleanup({
        agent,
        context,
        result,
        options,
        random: this.random
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Error running scenario ${id}: ${error.message}`, error);
      
      // Record failure
      const result = {
        scenarioId: id,
        agentId: agent.id || 'unknown',
        success: false,
        error: error.message,
        score: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0
      };
      
      this.recordResult(id, agent, result);
      
      return result;
    }
  }
  
  /**
   * Run multiple scenarios
   * @param {Array<string>} ids - Scenario IDs
   * @param {object} agent - Agent to evaluate
   * @param {object} options - Run options
   * @returns {Promise<object>} Aggregated results
   */
  async runScenarios(ids, agent, options = {}) {
    const results = [];
    let totalScore = 0;
    let successCount = 0;
    
    for (const id of ids) {
      const result = await this.runScenario(id, agent, options);
      results.push(result);
      
      if (result.success) {
        successCount++;
        totalScore += result.score || 0;
      }
    }
    
    return {
      agent: agent.id || 'unknown',
      totalScenarios: ids.length,
      successfulScenarios: successCount,
      successRate: ids.length > 0 ? successCount / ids.length : 0,
      totalScore,
      averageScore: successCount > 0 ? totalScore / successCount : 0,
      results
    };
  }
  
  /**
   * Run scenarios by category
   * @param {string} categoryId - Category ID
   * @param {object} agent - Agent to evaluate
   * @param {object} options - Run options
   * @returns {Promise<object>} Aggregated results
   */
  async runScenariosByCategory(categoryId, agent, options = {}) {
    const category = this.categories.get(categoryId);
    
    if (!category) {
      throw new Error(`Unknown category: ${categoryId}`);
    }
    
    // Get scenarios in this category
    const scenarios = Array.from(this.scenarios.values())
      .filter(scenario => scenario.category === categoryId)
      .map(scenario => scenario.id);
    
    if (scenarios.length === 0) {
      return {
        agent: agent.id || 'unknown',
        category: categoryId,
        totalScenarios: 0,
        successfulScenarios: 0,
        successRate: 0,
        totalScore: 0,
        averageScore: 0,
        results: []
      };
    }
    
    // Run scenarios
    const result = await this.runScenarios(scenarios, agent, options);
    result.category = categoryId;
    
    return result;
  }
  
  /**
   * Run scenarios by difficulty
   * @param {string} difficulty - Difficulty level
   * @param {object} agent - Agent to evaluate
   * @param {object} options - Run options
   * @returns {Promise<object>} Aggregated results
   */
  async runScenariosByDifficulty(difficulty, agent, options = {}) {
    if (!this.options.difficultyLevels.includes(difficulty)) {
      throw new Error(`Invalid difficulty level: ${difficulty}`);
    }
    
    // Get scenarios with this difficulty
    const scenarios = Array.from(this.scenarios.values())
      .filter(scenario => scenario.difficulty === difficulty)
      .map(scenario => scenario.id);
    
    if (scenarios.length === 0) {
      return {
        agent: agent.id || 'unknown',
        difficulty,
        totalScenarios: 0,
        successfulScenarios: 0,
        successRate: 0,
        totalScore: 0,
        averageScore: 0,
        results: []
      };
    }
    
    // Run scenarios
    const result = await this.runScenarios(scenarios, agent, options);
    result.difficulty = difficulty;
    
    return result;
  }
  
  /**
   * Generate a challenge set
   * @param {object} options - Generation options
   * @returns {Array<string>} Scenario IDs
   */
  generateChallengeSet(options = {}) {
    const count = options.count || 5;
    const difficulty = options.difficulty || null;
    const category = options.category || null;
    const tag = options.tag || null;
    const balanced = options.balanced !== false;
    
    // Get all scenarios
    let scenarios = Array.from(this.scenarios.values());
    
    // Apply filters
    if (difficulty) {
      scenarios = scenarios.filter(scenario => scenario.difficulty === difficulty);
    }
    
    if (category) {
      scenarios = scenarios.filter(scenario => scenario.category === category);
    }
    
    if (tag) {
      scenarios = scenarios.filter(scenario => scenario.tags.includes(tag));
    }
    
    if (scenarios.length === 0) {
      return [];
    }
    
    // Generate challenge set
    if (balanced && this.options.categoriesEnabled) {
      // Try to balance across categories
      const categoryCounts = new Map();
      const result = [];
      
      // Count scenarios per category
      for (const scenario of scenarios) {
        const cat = scenario.category || 'uncategorized';
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }
      
      // Calculate scenarios per category
      const categories = Array.from(categoryCounts.keys());
      const scenariosPerCategory = Math.max(1, Math.floor(count / categories.length));
      
      // Select scenarios from each category
      for (const cat of categories) {
        const categoryScenarios = scenarios.filter(s => (s.category || 'uncategorized') === cat);
        const shuffled = this.random.shuffle(categoryScenarios);
        const selected = shuffled.slice(0, scenariosPerCategory);
        
        for (const scenario of selected) {
          result.push(scenario.id);
          
          if (result.length >= count) {
            return result;
          }
        }
      }
      
      // If we still need more scenarios, add randomly
      const remaining = count - result.length;
      if (remaining > 0) {
        const remainingScenarios = scenarios.filter(s => !result.includes(s.id));
        const shuffled = this.random.shuffle(remainingScenarios);
        const selected = shuffled.slice(0, remaining);
        
        for (const scenario of selected) {
          result.push(scenario.id);
        }
      }
      
      return result;
    } else {
      // Simple random selection
      const shuffled = this.random.shuffle(scenarios);
      return shuffled.slice(0, count).map(s => s.id);
    }
  }
  
  /**
   * Record scenario result
   * @param {string} scenarioId - Scenario ID
   * @param {object} agent - Agent
   * @param {object} result - Scenario result
   */
  recordResult(scenarioId, agent, result) {
    const agentId = agent.id || 'unknown';
    
    if (!this.results.has(scenarioId)) {
      this.results.set(scenarioId, new Map());
    }
    
    const scenarioResults = this.results.get(scenarioId);
    
    if (!scenarioResults.has(agentId)) {
      scenarioResults.set(agentId, []);
    }
    
    const agentResults = scenarioResults.get(agentId);
    agentResults.push(result);
    
    // Limit history size
    const maxHistory = this.options.maxResultHistory || 100;
    if (agentResults.length > maxHistory) {
      agentResults.shift();
    }
  }
  
  /**
   * Get scenario results
   * @param {string} scenarioId - Scenario ID
   * @param {string} agentId - Agent ID
   * @returns {Array<object>} Scenario results
   */
  getResults(scenarioId, agentId) {
    if (!this.results.has(scenarioId)) {
      return [];
    }
    
    const scenarioResults = this.results.get(scenarioId);
    
    if (!scenarioResults.has(agentId)) {
      return [];
    }
    
    return scenarioResults.get(agentId);
  }
  
  /**
   * Get all results for a scenario
   * @param {string} scenarioId - Scenario ID
   * @returns {object} Scenario results by agent
   */
  getAllResultsForScenario(scenarioId) {
    if (!this.results.has(scenarioId)) {
      return {};
    }
    
    const scenarioResults = this.results.get(scenarioId);
    const result = {};
    
    for (const [agentId, results] of scenarioResults.entries()) {
      result[agentId] = results;
    }
    
    return result;
  }
  
  /**
   * Get all results for an agent
   * @param {string} agentId - Agent ID
   * @returns {object} Agent results by scenario
   */
  getAllResultsForAgent(agentId) {
    const result = {};
    
    for (const [scenarioId, scenarioResults] of this.results.entries()) {
      if (scenarioResults.has(agentId)) {
        result[scenarioId] = scenarioResults.get(agentId);
      }
    }
    
    return result;
  }
  
  /**
   * Calculate agent performance across scenarios
   * @param {string} agentId - Agent ID
   * @returns {object} Performance statistics
   */
  calculateAgentPerformance(agentId) {
    const allResults = this.getAllResultsForAgent(agentId);
    const scenarios = Object.keys(allResults);
    
    if (scenarios.length === 0) {
      return {
        agentId,
        totalScenarios: 0,
        successfulScenarios: 0,
        successRate: 0,
        totalScore: 0,
        averageScore: 0,
        scenarioResults: {}
      };
    }
    
    let totalRuns = 0;
    let successfulRuns = 0;
    let totalScore = 0;
    const scenarioStats = {};
    
    for (const scenarioId of scenarios) {
      const results = allResults[scenarioId];
      totalRuns += results.length;
      
      let scenarioSuccesses = 0;
      let scenarioTotalScore = 0;
      
      for (const result of results) {
        if (result.success) {
          successfulRuns++;
          scenarioSuccesses++;
          totalScore += result.score || 0;
          scenarioTotalScore += result.score || 0;
        }
      }
      
      scenarioStats[scenarioId] = {
        runs: results.length,
        successes: scenarioSuccesses,
        successRate: results.length > 0 ? scenarioSuccesses / results.length : 0,
        totalScore: scenarioTotalScore,
        averageScore: scenarioSuccesses > 0 ? scenarioTotalScore / scenarioSuccesses : 0,
        lastResult: results[results.length - 1]
      };
    }
    
    return {
      agentId,
      totalScenarios: scenarios.length,
      totalRuns,
      successfulRuns,
      successRate: totalRuns > 0 ? successfulRuns / totalRuns : 0,
      totalScore,
      averageScore: successfulRuns > 0 ? totalScore / successfulRuns : 0,
      scenarioResults: scenarioStats
    };
  }
  
  /**
   * Compare agents across scenarios
   * @param {Array<string>} agentIds - Agent IDs to compare
   * @returns {object} Comparison results
   */
  compareAgents(agentIds) {
    const agentPerformance = {};
    const scenarioComparisons = {};
    
    // Calculate performance for each agent
    for (const agentId of agentIds) {
      agentPerformance[agentId] = this.calculateAgentPerformance(agentId);
    }
    
    // Compare agents on each scenario
    for (const [scenarioId, scenarioResults] of this.results.entries()) {
      const scenarioComparison = {
        scenarioId,
        agents: {}
      };
      
      for (const agentId of agentIds) {
        if (scenarioResults.has(agentId)) {
          const results = scenarioResults.get(agentId);
          const lastResult = results[results.length - 1];
          
          scenarioComparison.agents[agentId] = {
            runs: results.length,
            lastScore: lastResult.score || 0,
            lastSuccess: lastResult.success || false,
            bestScore: Math.max(...results.filter(r => r.success).map(r => r.score || 0), 0)
          };
        } else {
          scenarioComparison.agents[agentId] = {
            runs: 0,
            lastScore: 0,
            lastSuccess: false,
            bestScore: 0
          };
        }
      }
      
      scenarioComparisons[scenarioId] = scenarioComparison;
    }
    
    // Calculate overall ranking
    const ranking = agentIds
      .map(agentId => ({
        agentId,
        performance: agentPerformance[agentId]
      }))
      .sort((a, b) => b.performance.averageScore - a.performance.averageScore);
    
    return {
      agents: agentPerformance,
      scenarios: scenarioComparisons,
      ranking: ranking.map((entry, index) => ({
        rank: index + 1,
        agentId: entry.agentId,
        averageScore: entry.performance.averageScore,
        successRate: entry.performance.successRate
      }))
    };
  }
  
  /**
   * Clear all results
   * @returns {number} Number of results cleared
   */
  clearAllResults() {
    let count = 0;
    
    for (const scenarioResults of this.results.values()) {
      for (const agentResults of scenarioResults.values()) {
        count += agentResults.length;
        agentResults.length = 0;
      }
    }
    
    this.results.clear();
    return count;
  }
  
  /**
   * Clear results for a scenario
   * @param {string} scenarioId - Scenario ID
   * @returns {number} Number of results cleared
   */
  clearScenarioResults(scenarioId) {
    if (!this.results.has(scenarioId)) {
      return 0;
    }
    
    let count = 0;
    const scenarioResults = this.results.get(scenarioId);
    
    for (const agentResults of scenarioResults.values()) {
      count += agentResults.length;
      agentResults.length = 0;
    }
    
    this.results.delete(scenarioId);
    return count;
  }
  
  /**
   * Clear results for an agent
   * @param {string} agentId - Agent ID
   * @returns {number} Number of results cleared
   */
  clearAgentResults(agentId) {
    let count = 0;
    
    for (const scenarioResults of this.results.values()) {
      if (scenarioResults.has(agentId)) {
        count += scenarioResults.get(agentId).length;
        scenarioResults.delete(agentId);
      }
    }
    
    return count;
  }
}

module.exports = ChallengeScenarios;
