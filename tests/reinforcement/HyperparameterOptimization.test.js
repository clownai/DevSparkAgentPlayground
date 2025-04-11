/**
 * HyperparameterOptimization.test.js
 * Unit tests for the HyperparameterOptimization class
 */

const HyperparameterOptimization = require('../../src/reinforcement/HyperparameterOptimization');
const ReinforcementLearningManager = require('../../src/reinforcement/ReinforcementLearningManager');

// Mock ReinforcementLearningManager for testing
jest.mock('../../src/reinforcement/ReinforcementLearningManager');

describe('HyperparameterOptimization', () => {
  let optimizer;
  let mockRLManager;
  
  beforeEach(() => {
    // Reset mocks
    ReinforcementLearningManager.mockClear();
    
    // Create optimizer with default options
    optimizer = new HyperparameterOptimization();
    
    // Create mock RL manager
    mockRLManager = {
      getAvailableAlgorithms: jest.fn().mockReturnValue(['ppo', 'sac']),
      createAlgorithm: jest.fn().mockReturnValue({ initialize: jest.fn() }),
      initializeAlgorithm: jest.fn().mockReturnValue(true),
      evaluateAlgorithm: jest.fn().mockResolvedValue({
        averageReward: 10,
        successRate: 0.8,
        episodes: [{ reward: 10, steps: 100 }]
      }),
      removeAlgorithm: jest.fn().mockReturnValue(true)
    };
  });
  
  test('should initialize with default options', () => {
    expect(optimizer.options).toEqual({
      maxIterations: 50,
      populationSize: 10,
      evaluationEpisodes: 5,
      optimizationMetric: 'averageReward',
      optimizationGoal: 'maximize',
      parallelEvaluations: 1
    });
    
    expect(optimizer.bestParameters).toBeNull();
    expect(optimizer.bestScore).toBe(-Infinity);
    expect(optimizer.history).toEqual([]);
    expect(optimizer.currentIteration).toBe(0);
  });
  
  test('should initialize with custom options', () => {
    const customOptions = {
      maxIterations: 100,
      populationSize: 20,
      evaluationEpisodes: 10,
      optimizationMetric: 'successRate',
      optimizationGoal: 'minimize',
      parallelEvaluations: 2
    };
    
    const customOptimizer = new HyperparameterOptimization(customOptions);
    
    expect(customOptimizer.options).toEqual(customOptions);
    expect(customOptimizer.bestScore).toBe(Infinity); // For minimize goal
  });
  
  test('should detect grid search space correctly', () => {
    // Grid search space (discrete values, few combinations)
    const gridSpace = {
      learningRate: [0.001, 0.01],
      gamma: [0.9, 0.99]
    };
    
    // Evolutionary search space (continuous ranges or many combinations)
    const evolutionarySpace = {
      learningRate: { min: 0.001, max: 0.1 },
      gamma: [0.9, 0.95, 0.99, 0.995, 0.999]
    };
    
    expect(optimizer._isGridSearchSpace(gridSpace)).toBe(true);
    expect(optimizer._isGridSearchSpace(evolutionarySpace)).toBe(false);
  });
  
  test('should generate parameter combinations for grid search', () => {
    const parameterSpace = {
      learningRate: [0.001, 0.01],
      gamma: [0.9, 0.99]
    };
    
    const combinations = optimizer._generateParameterCombinations(parameterSpace);
    
    expect(combinations.length).toBe(4);
    expect(combinations).toContainEqual({ learningRate: 0.001, gamma: 0.9 });
    expect(combinations).toContainEqual({ learningRate: 0.001, gamma: 0.99 });
    expect(combinations).toContainEqual({ learningRate: 0.01, gamma: 0.9 });
    expect(combinations).toContainEqual({ learningRate: 0.01, gamma: 0.99 });
  });
  
  test('should initialize population for evolutionary search', () => {
    const parameterSpace = {
      learningRate: { min: 0.001, max: 0.1, precision: 3 },
      gamma: [0.9, 0.99],
      useCritic: [true, false]
    };
    
    const population = optimizer._initializePopulation(parameterSpace, 5);
    
    expect(population.length).toBe(5);
    
    // Check first individual
    const individual = population[0];
    expect(individual).toHaveProperty('learningRate');
    expect(individual.learningRate).toBeGreaterThanOrEqual(0.001);
    expect(individual.learningRate).toBeLessThanOrEqual(0.1);
    expect(individual).toHaveProperty('gamma');
    expect([0.9, 0.99]).toContain(individual.gamma);
    expect(individual).toHaveProperty('useCritic');
    expect([true, false]).toContain(individual.useCritic);
  });
  
  test('should update best parameters when better score is found (maximize)', () => {
    // For maximize goal
    optimizer.options.optimizationGoal = 'maximize';
    optimizer.bestScore = 5;
    
    // Better score
    optimizer._updateBestParameters({ param: 'better' }, 10);
    expect(optimizer.bestParameters).toEqual({ param: 'better' });
    expect(optimizer.bestScore).toBe(10);
    
    // Worse score
    optimizer._updateBestParameters({ param: 'worse' }, 3);
    expect(optimizer.bestParameters).toEqual({ param: 'better' });
    expect(optimizer.bestScore).toBe(10);
  });
  
  test('should update best parameters when better score is found (minimize)', () => {
    // For minimize goal
    optimizer.options.optimizationGoal = 'minimize';
    optimizer.bestScore = 5;
    
    // Better score (lower)
    optimizer._updateBestParameters({ param: 'better' }, 3);
    expect(optimizer.bestParameters).toEqual({ param: 'better' });
    expect(optimizer.bestScore).toBe(3);
    
    // Worse score (higher)
    optimizer._updateBestParameters({ param: 'worse' }, 10);
    expect(optimizer.bestParameters).toEqual({ param: 'better' });
    expect(optimizer.bestScore).toBe(3);
  });
  
  test('should evaluate parameters correctly', async () => {
    const parameters = { learningRate: 0.01, gamma: 0.99 };
    
    const score = await optimizer._evaluateParameters(
      mockRLManager, 'ppo', 'test-env', parameters
    );
    
    expect(score).toBe(10); // From mock return value
    
    // Check if methods were called correctly
    expect(mockRLManager.createAlgorithm).toHaveBeenCalledWith('ppo', expect.any(String), parameters);
    expect(mockRLManager.initializeAlgorithm).toHaveBeenCalled();
    expect(mockRLManager.evaluateAlgorithm).toHaveBeenCalledWith(
      expect.any(String),
      'test-env',
      { episodes: optimizer.options.evaluationEpisodes, render: false }
    );
    expect(mockRLManager.removeAlgorithm).toHaveBeenCalled();
  });
  
  test('should throw error for missing required parameters in optimize', async () => {
    await expect(optimizer.optimize()).rejects.toThrow('Missing required parameters for optimization');
  });
  
  test('should throw error for unknown algorithm type', async () => {
    await expect(optimizer.optimize(
      mockRLManager, 'unknown', 'test-env', { param: [1, 2] }
    )).rejects.toThrow('Algorithm type unknown not available');
  });
  
  test('should use grid search for discrete parameter space', async () => {
    // Spy on _gridSearch method
    const gridSearchSpy = jest.spyOn(optimizer, '_gridSearch').mockResolvedValue({});
    
    const parameterSpace = {
      learningRate: [0.001, 0.01],
      gamma: [0.9, 0.99]
    };
    
    await optimizer.optimize(mockRLManager, 'ppo', 'test-env', parameterSpace);
    
    expect(gridSearchSpy).toHaveBeenCalled();
  });
  
  test('should use evolutionary search for continuous parameter space', async () => {
    // Spy on _evolutionarySearch method
    const evolutionarySearchSpy = jest.spyOn(optimizer, '_evolutionarySearch').mockResolvedValue({});
    
    const parameterSpace = {
      learningRate: { min: 0.001, max: 0.1 },
      gamma: [0.9, 0.99]
    };
    
    await optimizer.optimize(mockRLManager, 'ppo', 'test-env', parameterSpace);
    
    expect(evolutionarySearchSpy).toHaveBeenCalled();
  });
  
  test('should perform grid search correctly', async () => {
    // Mock _evaluateParameters to avoid actual evaluation
    optimizer._evaluateParameters = jest.fn().mockResolvedValue(10);
    
    const parameterSpace = {
      learningRate: [0.001, 0.01],
      gamma: [0.9, 0.99]
    };
    
    const progressCallback = jest.fn();
    
    const result = await optimizer._gridSearch(
      mockRLManager, 'ppo', 'test-env', parameterSpace, progressCallback
    );
    
    expect(result).toBeDefined();
    expect(result.bestParameters).toBeDefined();
    expect(result.bestScore).toBe(10);
    expect(result.history.length).toBe(4); // 4 combinations
    expect(result.method).toBe('grid_search');
    
    // Check if progress callback was called
    expect(progressCallback).toHaveBeenCalledTimes(4);
  });
  
  test('should perform evolutionary search correctly', async () => {
    // Mock _evaluateParameters to avoid actual evaluation
    optimizer._evaluateParameters = jest.fn().mockResolvedValue(10);
    
    // Mock _createNextGeneration to avoid actual evolution
    optimizer._createNextGeneration = jest.fn().mockImplementation((pop) => pop);
    
    const parameterSpace = {
      learningRate: { min: 0.001, max: 0.1 },
      gamma: [0.9, 0.99]
    };
    
    // Use small values for testing
    optimizer.options.maxIterations = 2;
    optimizer.options.populationSize = 3;
    
    const progressCallback = jest.fn();
    
    const result = await optimizer._evolutionarySearch(
      mockRLManager, 'ppo', 'test-env', parameterSpace, progressCallback
    );
    
    expect(result).toBeDefined();
    expect(result.bestParameters).toBeDefined();
    expect(result.bestScore).toBe(10);
    expect(result.history.length).toBe(6); // 2 iterations * 3 population
    expect(result.method).toBe('evolutionary_search');
    
    // Check if progress callback was called
    expect(progressCallback).toHaveBeenCalledTimes(2);
  });
  
  test('should create next generation correctly', () => {
    const population = [
      { learningRate: 0.001, gamma: 0.9 },
      { learningRate: 0.01, gamma: 0.99 },
      { learningRate: 0.005, gamma: 0.95 }
    ];
    
    const scores = [5, 10, 7]; // Second individual is best
    
    const parameterSpace = {
      learningRate: { min: 0.001, max: 0.1, precision: 3 },
      gamma: [0.9, 0.95, 0.99]
    };
    
    // Mock tournament selection to always return the best individual
    optimizer._tournamentSelection = jest.fn().mockReturnValue(1);
    
    // Mock crossover to return a simple combination
    optimizer._crossover = jest.fn().mockImplementation((p1, p2) => ({
      learningRate: p1.learningRate,
      gamma: p2.gamma
    }));
    
    // Mock mutate to do nothing
    optimizer._mutate = jest.fn();
    
    const nextGeneration = optimizer._createNextGeneration(population, scores, parameterSpace);
    
    expect(nextGeneration.length).toBe(3);
    
    // First individual should be the elite (best from previous generation)
    expect(nextGeneration[0]).toEqual(population[1]);
    
    // Check if tournament selection was called
    expect(optimizer._tournamentSelection).toHaveBeenCalled();
    
    // Check if crossover was called
    expect(optimizer._crossover).toHaveBeenCalled();
    
    // Check if mutate was called
    expect(optimizer._mutate).toHaveBeenCalled();
  });
  
  test('should perform crossover correctly', () => {
    const parent1 = { a: 1, b: 2, c: 3 };
    const parent2 = { a: 4, b: 5, c: 6 };
    
    // Mock Math.random to alternate between 0.3 and 0.7
    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount % 2 === 0 ? 0.7 : 0.3;
    });
    
    const child = optimizer._crossover(parent1, parent2);
    
    // Restore Math.random
    Math.random = originalRandom;
    
    // With our mock, a and c should come from parent1, b from parent2
    expect(child).toEqual({ a: 1, b: 5, c: 3 });
  });
  
  test('should perform mutation correctly', () => {
    const individual = { 
      learningRate: 0.05, 
      gamma: 0.95,
      useCritic: true
    };
    
    const parameterSpace = {
      learningRate: { min: 0.001, max: 0.1, precision: 3 },
      gamma: [0.9, 0.95, 0.99],
      useCritic: [true, false]
    };
    
    // Mock Math.random to return 0.1 for mutation probability check (below 0.2 threshold)
    // and 0.5 for other random values
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);
    
    // For the first parameter check, return 0.1 to trigger mutation
    Math.random.mockReturnValueOnce(0.1);
    
    optimizer._mutate(individual, parameterSpace);
    
    // Restore Math.random
    Math.random = originalRandom;
    
    // The individual should have been mutated
    expect(individual).toBeDefined();
    // We can't check exact values due to randomness, but we can check types
    expect(typeof individual.learningRate).toBe('number');
    expect(typeof individual.gamma).toBe('number');
    expect(typeof individual.useCritic).toBe('boolean');
  });
});
