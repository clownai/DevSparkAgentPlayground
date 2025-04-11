# Evaluation System in DevSparkAgent Playground

## Overview

This document provides a comprehensive guide to the evaluation system in the DevSparkAgent Playground. It covers the implementation details, performance metrics, challenge scenarios, leaderboards, and best practices for implementing and using the evaluation system to assess agent performance.

## Evaluation System Framework

The evaluation system in DevSparkAgent Playground provides a standardized way to measure, compare, and track agent performance across various tasks and scenarios. It is designed to be flexible, extensible, and fair, enabling meaningful comparisons between different agent implementations.

### Core Components

#### Performance Metrics

Performance metrics quantify different aspects of agent behavior and outcomes:

- **Task Completion**: Measures of task success and completion rate
- **Efficiency**: Metrics related to resource usage and time efficiency
- **Learning Speed**: Measures of how quickly agents learn
- **Adaptability**: Metrics for performance in changing environments
- **Robustness**: Measures of performance stability across conditions

#### Challenge Scenarios

Challenge scenarios provide standardized environments for evaluation:

- **Difficulty Levels**: Progressive difficulty for measuring skill development
- **Domain Coverage**: Scenarios covering different problem domains
- **Randomization**: Controlled randomness for robust evaluation
- **Reproducibility**: Mechanisms for consistent scenario generation

#### Leaderboards

Leaderboards track and compare agent performance:

- **Global Rankings**: Overall performance across all challenges
- **Domain-Specific**: Rankings for specific problem domains
- **Metric-Specific**: Rankings for individual performance metrics
- **Historical Tracking**: Performance evolution over time

#### Statistical Analysis

Statistical tools for rigorous performance comparison:

- **Significance Testing**: Statistical tests for performance differences
- **Confidence Intervals**: Uncertainty quantification for metrics
- **Effect Size**: Measures of performance difference magnitude
- **Variance Analysis**: Understanding performance variability

### Integration with Other Components

The evaluation system integrates with other playground components:

- **Runtime Environment**: For executing evaluation scenarios
- **Agent Interaction**: For standardized agent-environment interaction
- **Evolution System**: For using evaluation results in selection
- **User Interface**: For visualizing evaluation results

## Implementation Details

### Performance Metrics

The performance metrics implementation includes:

```javascript
/**
 * Base class for performance metrics
 */
class PerformanceMetric {
  constructor(id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
  }
  
  /**
   * Calculate metric value from evaluation data
   * @param {object} evaluationData - Data from evaluation run
   * @returns {number} Metric value
   */
  calculate(evaluationData) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Compare two metric values
   * @param {number} value1 - First metric value
   * @param {number} value2 - Second metric value
   * @returns {number} Comparison result (-1, 0, 1)
   */
  compare(value1, value2) {
    // Default implementation for higher-is-better metrics
    if (value1 > value2) return 1;
    if (value1 < value2) return -1;
    return 0;
  }
  
  /**
   * Check if the metric is better than a threshold
   * @param {number} value - Metric value
   * @param {number} threshold - Threshold value
   * @returns {boolean} True if better than threshold
   */
  isBetterThan(value, threshold) {
    return this.compare(value, threshold) > 0;
  }
}

/**
 * Task completion rate metric
 */
class CompletionRateMetric extends PerformanceMetric {
  constructor() {
    super(
      'completion-rate',
      'Completion Rate',
      'Percentage of tasks successfully completed'
    );
  }
  
  calculate(evaluationData) {
    const { completedTasks, totalTasks } = evaluationData;
    return (completedTasks / totalTasks) * 100;
  }
}

/**
 * Time efficiency metric
 */
class TimeEfficiencyMetric extends PerformanceMetric {
  constructor() {
    super(
      'time-efficiency',
      'Time Efficiency',
      'Average time to complete tasks (lower is better)'
    );
  }
  
  calculate(evaluationData) {
    const { taskTimes } = evaluationData;
    const totalTime = taskTimes.reduce((sum, time) => sum + time, 0);
    return totalTime / taskTimes.length;
  }
  
  compare(value1, value2) {
    // Lower is better for time metrics
    if (value1 < value2) return 1;
    if (value1 > value2) return -1;
    return 0;
  }
}

/**
 * Resource efficiency metric
 */
class ResourceEfficiencyMetric extends PerformanceMetric {
  constructor() {
    super(
      'resource-efficiency',
      'Resource Efficiency',
      'Average resources used per task (lower is better)'
    );
  }
  
  calculate(evaluationData) {
    const { resourceUsage, completedTasks } = evaluationData;
    return resourceUsage / completedTasks;
  }
  
  compare(value1, value2) {
    // Lower is better for resource metrics
    if (value1 < value2) return 1;
    if (value1 > value2) return -1;
    return 0;
  }
}

/**
 * Learning speed metric
 */
class LearningSpeedMetric extends PerformanceMetric {
  constructor() {
    super(
      'learning-speed',
      'Learning Speed',
      'Rate of performance improvement over time'
    );
  }
  
  calculate(evaluationData) {
    const { performanceHistory } = evaluationData;
    
    // Calculate slope of performance over time
    const n = performanceHistory.length;
    
    if (n < 2) {
      return 0; // Not enough data points
    }
    
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = performanceHistory[i];
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    
    // Linear regression slope
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
}
```

### Challenge Scenarios

The challenge scenario implementation includes:

```javascript
/**
 * Base class for challenge scenarios
 */
class ChallengeScenario {
  constructor(id, name, description, difficulty) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.difficulty = difficulty; // 1-10 scale
  }
  
  /**
   * Initialize the scenario
   * @param {object} options - Initialization options
   * @returns {Promise<object>} Initialization result
   */
  async initialize(options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Run the scenario with an agent
   * @param {string} agentId - Agent ID
   * @param {object} options - Run options
   * @returns {Promise<object>} Evaluation results
   */
  async run(agentId, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Clean up resources after scenario run
   * @returns {Promise<boolean>} True if cleanup successful
   */
  async cleanup() {
    throw new Error('Method not implemented');
  }
}

/**
 * Maze navigation challenge
 */
class MazeNavigationChallenge extends ChallengeScenario {
  constructor(difficulty = 5) {
    super(
      'maze-navigation',
      'Maze Navigation',
      'Navigate through a maze to reach the goal',
      difficulty
    );
  }
  
  async initialize(options = {}) {
    // Generate maze based on difficulty
    const size = 5 + (this.difficulty * 2);
    this.maze = this.generateMaze(size, size, options.seed);
    
    // Set start and goal positions
    this.startPosition = { x: 0, y: 0 };
    this.goalPosition = { x: size - 1, y: size - 1 };
    
    // Initialize metrics
    this.steps = 0;
    this.maxSteps = size * size * 2;
    this.visitedCells = new Set();
    
    return {
      success: true,
      mazeSize: { width: size, height: size },
      startPosition: this.startPosition,
      goalPosition: this.goalPosition,
      maxSteps: this.maxSteps
    };
  }
  
  async run(agentId, options = {}) {
    // Create container for agent
    const containerId = `${agentId}-maze-container`;
    await runtime.createContainer(containerId);
    
    try {
      // Initialize agent
      await interaction.sendMessage(
        'system',
        agentId,
        'initialize',
        {
          scenario: 'maze-navigation',
          mazeSize: { width: this.maze.length, height: this.maze[0].length },
          startPosition: this.startPosition,
          goalPosition: this.goalPosition,
          maxSteps: this.maxSteps
        }
      );
      
      // Run simulation
      let currentPosition = { ...this.startPosition };
      let done = false;
      let success = false;
      
      while (!done) {
        // Get agent action
        const response = await interaction.sendRequest(
          'system',
          agentId,
          'get-action',
          {
            position: currentPosition,
            observation: this.getObservation(currentPosition)
          }
        );
        
        // Process action
        const action = response.action;
        const nextPosition = this.getNextPosition(currentPosition, action);
        
        // Check if valid move
        if (this.isValidMove(currentPosition, nextPosition)) {
          currentPosition = nextPosition;
          this.visitedCells.add(`${currentPosition.x},${currentPosition.y}`);
        }
        
        // Check if goal reached
        if (currentPosition.x === this.goalPosition.x && 
            currentPosition.y === this.goalPosition.y) {
          success = true;
          done = true;
        }
        
        // Increment step counter
        this.steps++;
        
        // Check if max steps reached
        if (this.steps >= this.maxSteps) {
          done = true;
        }
      }
      
      // Calculate metrics
      const coverage = this.visitedCells.size / (this.maze.length * this.maze[0].length);
      const efficiency = success ? this.getOptimalPathLength() / this.steps : 0;
      
      // Return results
      return {
        success,
        steps: this.steps,
        coverage,
        efficiency,
        visitedCells: this.visitedCells.size
      };
    } finally {
      // Clean up
      await runtime.removeContainer(containerId);
    }
  }
  
  async cleanup() {
    // Reset state
    this.maze = null;
    this.startPosition = null;
    this.goalPosition = null;
    this.steps = 0;
    this.visitedCells.clear();
    
    return true;
  }
  
  // Helper methods
  generateMaze(width, height, seed) {
    // Implementation of maze generation algorithm
    // ...
  }
  
  getObservation(position) {
    // Return what the agent can observe at the current position
    // ...
  }
  
  getNextPosition(position, action) {
    // Calculate next position based on action
    // ...
  }
  
  isValidMove(currentPosition, nextPosition) {
    // Check if move is valid
    // ...
  }
  
  getOptimalPathLength() {
    // Calculate optimal path length using A*
    // ...
  }
}
```

### Leaderboards

The leaderboard implementation includes:

```javascript
/**
 * Leaderboard class for tracking agent performance
 */
class Leaderboard {
  constructor(id, name, description, metricId) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.metricId = metricId;
    this.entries = [];
    this.lastUpdated = Date.now();
  }
  
  /**
   * Add or update an entry in the leaderboard
   * @param {string} agentId - Agent ID
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   * @returns {object} Updated entry
   */
  addEntry(agentId, value, metadata = {}) {
    // Check if agent already exists
    const existingIndex = this.entries.findIndex(entry => entry.agentId === agentId);
    
    if (existingIndex >= 0) {
      // Update existing entry
      const existing = this.entries[existingIndex];
      
      // Only update if new value is better
      const metric = metrics.get(this.metricId);
      if (metric.compare(value, existing.value) > 0) {
        this.entries[existingIndex] = {
          ...existing,
          value,
          previousValue: existing.value,
          metadata: { ...existing.metadata, ...metadata },
          updatedAt: Date.now()
        };
        
        // Re-sort entries
        this.sortEntries();
        this.lastUpdated = Date.now();
        
        return this.entries[existingIndex];
      }
      
      return existing;
    } else {
      // Add new entry
      const newEntry = {
        agentId,
        value,
        metadata,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      this.entries.push(newEntry);
      
      // Sort entries
      this.sortEntries();
      this.lastUpdated = Date.now();
      
      return newEntry;
    }
  }
  
  /**
   * Get the rank of an agent
   * @param {string} agentId - Agent ID
   * @returns {number} Rank (1-based) or -1 if not found
   */
  getRank(agentId) {
    const index = this.entries.findIndex(entry => entry.agentId === agentId);
    return index >= 0 ? index + 1 : -1;
  }
  
  /**
   * Get top entries
   * @param {number} count - Number of entries to return
   * @returns {Array<object>} Top entries
   */
  getTopEntries(count = 10) {
    return this.entries.slice(0, count);
  }
  
  /**
   * Get entries around an agent
   * @param {string} agentId - Agent ID
   * @param {number} range - Number of entries before and after
   * @returns {Array<object>} Entries around agent
   */
  getEntriesAroundAgent(agentId, range = 2) {
    const index = this.entries.findIndex(entry => entry.agentId === agentId);
    
    if (index < 0) {
      return [];
    }
    
    const start = Math.max(0, index - range);
    const end = Math.min(this.entries.length, index + range + 1);
    
    return this.entries.slice(start, end);
  }
  
  /**
   * Sort entries based on metric
   */
  sortEntries() {
    const metric = metrics.get(this.metricId);
    
    this.entries.sort((a, b) => {
      return -metric.compare(a.value, b.value); // Negative to sort in descending order
    });
  }
  
  /**
   * Export leaderboard data
   * @returns {object} Leaderboard data
   */
  export() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      metricId: this.metricId,
      entries: this.entries,
      lastUpdated: this.lastUpdated
    };
  }
  
  /**
   * Import leaderboard data
   * @param {object} data - Leaderboard data
   * @returns {boolean} True if import successful
   */
  import(data) {
    if (!data || data.id !== this.id) {
      return false;
    }
    
    this.name = data.name;
    this.description = data.description;
    this.metricId = data.metricId;
    this.entries = data.entries;
    this.lastUpdated = data.lastUpdated;
    
    return true;
  }
}
```

### Evaluation System

The main evaluation system implementation includes:

```javascript
/**
 * Evaluation system for assessing agent performance
 */
class EvaluationSystem {
  constructor() {
    this.metrics = new Map();
    this.scenarios = new Map();
    this.leaderboards = new Map();
    this.evaluationResults = new Map();
    this.logger = logger.getLogger('evaluation-system');
  }
  
  /**
   * Initialize the evaluation system
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Register default metrics
      this.registerMetric(new CompletionRateMetric());
      this.registerMetric(new TimeEfficiencyMetric());
      this.registerMetric(new ResourceEfficiencyMetric());
      this.registerMetric(new LearningSpeedMetric());
      
      // Register default scenarios
      this.registerScenario(new MazeNavigationChallenge(3)); // Easy
      this.registerScenario(new MazeNavigationChallenge(6)); // Medium
      this.registerScenario(new MazeNavigationChallenge(9)); // Hard
      
      // Create default leaderboards
      this.createLeaderboard(
        'global-completion',
        'Global Completion Rate',
        'Overall task completion rate across all scenarios',
        'completion-rate'
      );
      
      this.createLeaderboard(
        'global-efficiency',
        'Global Efficiency',
        'Overall time and resource efficiency across all scenarios',
        'resource-efficiency'
      );
      
      this.createLeaderboard(
        'learning-speed',
        'Learning Speed',
        'Rate of performance improvement over time',
        'learning-speed'
      );
      
      this.logger.info('Evaluation system initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize evaluation system: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Register a performance metric
   * @param {PerformanceMetric} metric - Metric to register
   * @returns {boolean} True if registration successful
   */
  registerMetric(metric) {
    if (this.metrics.has(metric.id)) {
      this.logger.warn(`Metric already registered: ${metric.id}`);
      return false;
    }
    
    this.metrics.set(metric.id, metric);
    this.logger.info(`Registered metric: ${metric.id}`);
    return true;
  }
  
  /**
   * Unregister a performance metric
   * @param {string} metricId - Metric ID
   * @returns {boolean} True if unregistration successful
   */
  unregisterMetric(metricId) {
    if (!this.metrics.has(metricId)) {
      this.logger.warn(`Metric not found: ${metricId}`);
      return false;
    }
    
    this.metrics.delete(metricId);
    this.logger.info(`Unregistered metric: ${metricId}`);
    return true;
  }
  
  /**
   * Register a challenge scenario
   * @param {ChallengeScenario} scenario - Scenario to register
   * @returns {boolean} True if registration successful
   */
  registerScenario(scenario) {
    if (this.scenarios.has(scenario.id)) {
      this.logger.warn(`Scenario already registered: ${scenario.id}`);
      return false;
    }
    
    this.scenarios.set(scenario.id, scenario);
    this.logger.info(`Registered scenario: ${scenario.id}`);
    return true;
  }
  
  /**
   * Unregister a challenge scenario
   * @param {string} scenarioId - Scenario ID
   * @returns {boolean} True if unregistration successful
   */
  unregisterScenario(scenarioId) {
    if (!this.scenarios.has(scenarioId)) {
      this.logger.warn(`Scenario not found: ${scenarioId}`);
      return false;
    }
    
    this.scenarios.delete(scenarioId);
    this.logger.info(`Unregistered scenario: ${scenarioId}`);
    return true;
  }
  
  /**
   * Create a leaderboard
   * @param {string} id - Leaderboard ID
   * @param {string} name - Leaderboard name
   * @param {string} description - Leaderboard description
   * @param {string} metricId - Metric ID
   * @returns {Leaderboard} Created leaderboard
   */
  createLeaderboard(id, name, description, metricId) {
    if (this.leaderboards.has(id)) {
      this.logger.warn(`Leaderboard already exists: ${id}`);
      return this.leaderboards.get(id);
    }
    
    if (!this.metrics.has(metricId)) {
      this.logger.error(`Metric not found: ${metricId}`);
      throw new Error(`Metric not found: ${metricId}`);
    }
    
    const leaderboard = new Leaderboard(id, name, description, metricId);
    this.leaderboards.set(id, leaderboard);
    this.logger.info(`Created leaderboard: ${id}`);
    return leaderboard;
  }
  
  /**
   * Delete a leaderboard
   * @param {string} id - Leaderboard ID
   * @returns {boolean} True if deletion successful
   */
  deleteLeaderboard(id) {
    if (!this.leaderboards.has(id)) {
      this.logger.warn(`Leaderboard not found: ${id}`);
      return false;
    }
    
    this.leaderboards.delete(id);
    this.logger.info(`Deleted leaderboard: ${id}`);
    return true;
  }
  
  /**
   * Evaluate an agent on a scenario
   * @param {string} agentId - Agent ID
   * @param {string} scenarioId - Scenario ID
   * @param {object} options - Evaluation options
   * @returns {Promise<object>} Evaluation results
   */
  async evaluateAgent(agentId, scenarioId, options = {}) {
    if (!this.scenarios.has(scenarioId)) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    
    const scenario = this.scenarios.get(scenarioId);
    
    try {
      // Initialize scenario
      await scenario.initialize(options);
      
      // Run scenario
      const startTime = Date.now();
      const results = await scenario.run(agentId, options);
      const endTime = Date.now();
      
      // Add timing information
      results.evaluationTime = endTime - startTime;
      
      // Store results
      const resultId = `${agentId}-${scenarioId}-${startTime}`;
      this.evaluationResults.set(resultId, {
        id: resultId,
        agentId,
        scenarioId,
        timestamp: startTime,
        duration: endTime - startTime,
        results
      });
      
      // Update leaderboards
      this.updateLeaderboards(agentId, scenarioId, results);
      
      // Clean up scenario
      await scenario.cleanup();
      
      return {
        resultId,
        agentId,
        scenarioId,
        timestamp: startTime,
        duration: endTime - startTime,
        ...results
      };
    } catch (error) {
      this.logger.error(`Evaluation failed for agent ${agentId} on scenario ${scenarioId}: ${error.message}`, error);
      
      // Ensure cleanup
      await scenario.cleanup();
      
      throw error;
    }
  }
  
  /**
   * Evaluate an agent on multiple scenarios
   * @param {string} agentId - Agent ID
   * @param {Array<string>} scenarioIds - Scenario IDs
   * @param {object} options - Evaluation options
   * @returns {Promise<object>} Evaluation results
   */
  async evaluateAgentOnMultipleScenarios(agentId, scenarioIds, options = {}) {
    const results = [];
    
    for (const scenarioId of scenarioIds) {
      try {
        const result = await this.evaluateAgent(agentId, scenarioId, options);
        results.push(result);
      } catch (error) {
        this.logger.error(`Evaluation failed for scenario ${scenarioId}: ${error.message}`);
        
        if (options.continueOnError) {
          results.push({
            agentId,
            scenarioId,
            error: error.message,
            success: false
          });
        } else {
          throw error;
        }
      }
    }
    
    // Calculate aggregate metrics
    const aggregateResults = this.calculateAggregateMetrics(results);
    
    return {
      agentId,
      timestamp: Date.now(),
      scenarioCount: results.length,
      results,
      aggregateResults
    };
  }
  
  /**
   * Update leaderboards with evaluation results
   * @param {string} agentId - Agent ID
   * @param {string} scenarioId - Scenario ID
   * @param {object} results - Evaluation results
   */
  updateLeaderboards(agentId, scenarioId, results) {
    // Update scenario-specific leaderboards
    const scenarioLeaderboardId = `scenario-${scenarioId}`;
    
    if (this.leaderboards.has(scenarioLeaderboardId)) {
      const leaderboard = this.leaderboards.get(scenarioLeaderboardId);
      const metric = this.metrics.get(leaderboard.metricId);
      const value = metric.calculate(results);
      
      leaderboard.addEntry(agentId, value, {
        scenarioId,
        evaluationTime: results.evaluationTime
      });
    }
    
    // Update global leaderboards
    for (const [id, leaderboard] of this.leaderboards.entries()) {
      if (id.startsWith('global-')) {
        const metric = this.metrics.get(leaderboard.metricId);
        const value = metric.calculate(results);
        
        leaderboard.addEntry(agentId, value, {
          scenarioId,
          evaluationTime: results.evaluationTime
        });
      }
    }
  }
  
  /**
   * Calculate aggregate metrics from multiple results
   * @param {Array<object>} results - Array of evaluation results
   * @returns {object} Aggregate metrics
   */
  calculateAggregateMetrics(results) {
    const validResults = results.filter(r => r.success);
    
    if (validResults.length === 0) {
      return {
        success: false,
        message: 'No successful evaluations'
      };
    }
    
    // Calculate aggregate metrics
    const aggregateMetrics = {};
    
    for (const [id, metric] of this.metrics.entries()) {
      try {
        const values = validResults.map(r => metric.calculate(r));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        
        aggregateMetrics[id] = {
          average: avg,
          min: Math.min(...values),
          max: Math.max(...values),
          values
        };
      } catch (error) {
        this.logger.warn(`Failed to calculate aggregate for metric ${id}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      metricCount: Object.keys(aggregateMetrics).length,
      metrics: aggregateMetrics
    };
  }
  
  /**
   * Get evaluation results for an agent
   * @param {string} agentId - Agent ID
   * @returns {Array<object>} Evaluation results
   */
  getAgentResults(agentId) {
    const results = [];
    
    for (const [id, result] of this.evaluationResults.entries()) {
      if (result.agentId === agentId) {
        results.push(result);
      }
    }
    
    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    return results;
  }
  
  /**
   * Get leaderboard data
   * @param {string} leaderboardId - Leaderboard ID
   * @returns {object} Leaderboard data
   */
  getLeaderboard(leaderboardId) {
    if (!this.leaderboards.has(leaderboardId)) {
      throw new Error(`Leaderboard not found: ${leaderboardId}`);
    }
    
    return this.leaderboards.get(leaderboardId).export();
  }
  
  /**
   * List all leaderboards
   * @returns {Array<object>} Leaderboard information
   */
  listLeaderboards() {
    const leaderboards = [];
    
    for (const [id, leaderboard] of this.leaderboards.entries()) {
      leaderboards.push({
        id,
        name: leaderboard.name,
        description: leaderboard.description,
        metricId: leaderboard.metricId,
        entryCount: leaderboard.entries.length,
        lastUpdated: leaderboard.lastUpdated
      });
    }
    
    return leaderboards;
  }
  
  /**
   * List all metrics
   * @returns {Array<object>} Metric information
   */
  listMetrics() {
    const metrics = [];
    
    for (const [id, metric] of this.metrics.entries()) {
      metrics.push({
        id,
        name: metric.name,
        description: metric.description
      });
    }
    
    return metrics;
  }
  
  /**
   * List all scenarios
   * @returns {Array<object>} Scenario information
   */
  listScenarios() {
    const scenarios = [];
    
    for (const [id, scenario] of this.scenarios.entries()) {
      scenarios.push({
        id,
        name: scenario.name,
        description: scenario.description,
        difficulty: scenario.difficulty
      });
    }
    
    return scenarios;
  }
}
```

## Usage Examples

### Basic Agent Evaluation

```javascript
// Create evaluation system
const evaluation = new EvaluationSystem();
await evaluation.initialize();

// Register agent
const agentId = 'test-agent';
await evolution.registerAgent(agentId, { name: 'Test Agent' });

// Evaluate agent on a scenario
const result = await evaluation.evaluateAgent(agentId, 'maze-navigation-medium');

console.log(`Evaluation result: ${result.success ? 'Success' : 'Failure'}`);
console.log(`Steps taken: ${result.steps}`);
console.log(`Efficiency: ${result.efficiency}`);
```

### Comprehensive Evaluation

```javascript
// Evaluate agent on all scenarios
const scenarioIds = evaluation.listScenarios().map(s => s.id);
const results = await evaluation.evaluateAgentOnMultipleScenarios(agentId, scenarioIds, {
  continueOnError: true,
  repetitions: 3,  // Run each scenario multiple times
  aggregateMethod: 'average'  // Use average of repetitions
});

console.log(`Overall success rate: ${results.aggregateResults.metrics['completion-rate'].average}%`);
console.log(`Average efficiency: ${results.aggregateResults.metrics['resource-efficiency'].average}`);
```

### Leaderboard Management

```javascript
// Create a custom leaderboard
const leaderboardId = 'maze-masters';
evaluation.createLeaderboard(
  leaderboardId,
  'Maze Masters',
  'Top performers in maze navigation challenges',
  'completion-rate'
);

// Get leaderboard data
const leaderboard = evaluation.getLeaderboard(leaderboardId);
console.log(`Leaderboard: ${leaderboard.name}`);
console.log(`Entries: ${leaderboard.entries.length}`);

// Display top entries
const topEntries = leaderboard.entries.slice(0, 5);
for (let i = 0; i < topEntries.length; i++) {
  const entry = topEntries[i];
  console.log(`#${i+1}: ${entry.agentId} - ${entry.value}`);
}
```

### Custom Metrics

```javascript
// Define a custom metric
class ExplorationMetric extends PerformanceMetric {
  constructor() {
    super(
      'exploration',
      'Exploration Rate',
      'Percentage of environment explored'
    );
  }
  
  calculate(evaluationData) {
    const { visitedCells, totalCells } = evaluationData;
    return (visitedCells / totalCells) * 100;
  }
}

// Register custom metric
evaluation.registerMetric(new ExplorationMetric());

// Create leaderboard using custom metric
evaluation.createLeaderboard(
  'top-explorers',
  'Top Explorers',
  'Agents that explore the most of their environment',
  'exploration'
);
```

### Performance Comparison

```javascript
// Compare multiple agents
const agentIds = ['agent1', 'agent2', 'agent3'];
const scenarioId = 'maze-navigation-hard';
const comparisonResults = {};

for (const agentId of agentIds) {
  const result = await evaluation.evaluateAgent(agentId, scenarioId);
  comparisonResults[agentId] = result;
}

// Compare completion rates
for (const agentId of agentIds) {
  const result = comparisonResults[agentId];
  console.log(`${agentId}: ${result.success ? 'Completed' : 'Failed'} in ${result.steps} steps`);
}

// Statistical comparison
const completionRateMetric = evaluation.metrics.get('completion-rate');
const efficiencyMetric = evaluation.metrics.get('resource-efficiency');

for (let i = 0; i < agentIds.length; i++) {
  for (let j = i + 1; j < agentIds.length; j++) {
    const agent1 = agentIds[i];
    const agent2 = agentIds[j];
    
    const result1 = comparisonResults[agent1];
    const result2 = comparisonResults[agent2];
    
    const cr1 = completionRateMetric.calculate(result1);
    const cr2 = completionRateMetric.calculate(result2);
    
    const eff1 = efficiencyMetric.calculate(result1);
    const eff2 = efficiencyMetric.calculate(result2);
    
    console.log(`${agent1} vs ${agent2}:`);
    console.log(`  Completion Rate: ${cr1} vs ${cr2}`);
    console.log(`  Efficiency: ${eff1} vs ${eff2}`);
  }
}
```

## Best Practices

### Metric Design

- **Clarity**: Metrics should have clear definitions and interpretations
- **Relevance**: Metrics should measure aspects relevant to the task
- **Robustness**: Metrics should be robust to noise and randomness
- **Comparability**: Metrics should enable fair comparisons between agents

### Challenge Design

- **Progression**: Create challenges with progressive difficulty levels
- **Diversity**: Include challenges from different problem domains
- **Reproducibility**: Ensure challenges can be reproduced consistently
- **Fairness**: Design challenges that don't favor specific agent types

### Evaluation Protocol

- **Multiple Runs**: Evaluate agents multiple times to account for randomness
- **Controlled Environment**: Keep evaluation conditions consistent
- **Comprehensive Testing**: Test across multiple scenarios and metrics
- **Baseline Comparison**: Compare against baseline agents for context

### Leaderboard Management

- **Regular Updates**: Update leaderboards regularly with new evaluations
- **Historical Tracking**: Maintain historical performance data
- **Transparency**: Make evaluation criteria and conditions transparent
- **Categorization**: Categorize leaderboards by task type or difficulty

## Conclusion

The evaluation system in DevSparkAgent Playground provides a comprehensive framework for measuring, comparing, and tracking agent performance. By following the guidelines and examples in this document, developers can effectively implement and use the evaluation system to assess agent capabilities and track improvements over time.

For more detailed information on specific metrics, scenarios, or implementation details, refer to the source code and API documentation.
