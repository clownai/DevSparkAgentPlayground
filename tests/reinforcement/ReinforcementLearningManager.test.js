/**
 * ReinforcementLearningManager.test.js
 * Unit tests for the ReinforcementLearningManager class
 */

const ReinforcementLearningManager = require('../../src/reinforcement/ReinforcementLearningManager');
const AlgorithmInterface = require('../../src/reinforcement/AlgorithmInterface');
const PPO = require('../../src/reinforcement/algorithms/PPO');
const SAC = require('../../src/reinforcement/algorithms/SAC');

// Mock environment for testing
class MockEnvironment {
  constructor() {
    this.stateSpace = { shape: [4] };
    this.actionSpace = { n: 2 };
    this.actionType = 'discrete';
    this.resetCalled = 0;
    this.stepCalled = 0;
  }
  
  reset() {
    this.resetCalled++;
    return [0, 0, 0, 0];
  }
  
  step(action) {
    this.stepCalled++;
    return {
      nextState: [0, 0, 0, 0],
      reward: 1,
      done: this.stepCalled >= 10,
      info: { success: this.stepCalled >= 8 }
    };
  }
  
  render() {}
}

describe('ReinforcementLearningManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new ReinforcementLearningManager();
  });
  
  test('should initialize with built-in algorithms', () => {
    expect(manager.registeredAlgorithms.size).toBeGreaterThan(0);
    expect(manager.registeredAlgorithms.has('ppo')).toBe(true);
    expect(manager.registeredAlgorithms.has('sac')).toBe(true);
  });
  
  test('should register custom algorithm', () => {
    // Create mock algorithm class
    class MockAlgorithm extends AlgorithmInterface {
      initialize() { return true; }
      selectAction() { return 0; }
      update() { return { loss: 0 }; }
      batchUpdate() { return { loss: 0 }; }
      save() { return true; }
      load() { return true; }
    }
    
    // Register algorithm
    const result = manager.registerAlgorithm('mock', MockAlgorithm);
    
    expect(result).toBe(true);
    expect(manager.registeredAlgorithms.has('mock')).toBe(true);
  });
  
  test('should create algorithm instance', () => {
    const algorithm = manager.createAlgorithm('ppo', 'test-ppo');
    
    expect(algorithm).toBeDefined();
    expect(algorithm instanceof PPO).toBe(true);
    expect(manager.algorithms.has('test-ppo')).toBe(true);
  });
  
  test('should throw error for unknown algorithm', () => {
    expect(() => {
      manager.createAlgorithm('unknown', 'test-unknown');
    }).toThrow('Unknown algorithm: unknown');
  });
  
  test('should throw error for duplicate algorithm ID', () => {
    manager.createAlgorithm('ppo', 'test-ppo');
    
    expect(() => {
      manager.createAlgorithm('ppo', 'test-ppo');
    }).toThrow('Algorithm with ID test-ppo already exists');
  });
  
  test('should get algorithm instance', () => {
    const created = manager.createAlgorithm('ppo', 'test-ppo');
    const retrieved = manager.getAlgorithm('test-ppo');
    
    expect(retrieved).toBe(created);
  });
  
  test('should throw error for unknown algorithm ID', () => {
    expect(() => {
      manager.getAlgorithm('unknown');
    }).toThrow('Unknown algorithm ID: unknown');
  });
  
  test('should get all algorithm instances', () => {
    manager.createAlgorithm('ppo', 'test-ppo-1');
    manager.createAlgorithm('ppo', 'test-ppo-2');
    
    const algorithms = manager.getAllAlgorithms();
    
    expect(algorithms.size).toBe(2);
    expect(algorithms.has('test-ppo-1')).toBe(true);
    expect(algorithms.has('test-ppo-2')).toBe(true);
  });
  
  test('should remove algorithm instance', () => {
    manager.createAlgorithm('ppo', 'test-ppo');
    
    const result = manager.removeAlgorithm('test-ppo');
    
    expect(result).toBe(true);
    expect(manager.algorithms.has('test-ppo')).toBe(false);
  });
  
  test('should return false when removing non-existent algorithm', () => {
    const result = manager.removeAlgorithm('non-existent');
    
    expect(result).toBe(false);
  });
  
  test('should register environment', () => {
    const environment = new MockEnvironment();
    
    const result = manager.registerEnvironment('test-env', environment);
    
    expect(result).toBe(true);
    expect(manager.environments.has('test-env')).toBe(true);
  });
  
  test('should throw error for invalid environment', () => {
    expect(() => {
      manager.registerEnvironment('test-env', {});
    }).toThrow('Environment must have reset and step methods');
  });
  
  test('should get environment', () => {
    const environment = new MockEnvironment();
    manager.registerEnvironment('test-env', environment);
    
    const retrieved = manager.getEnvironment('test-env');
    
    expect(retrieved).toBe(environment);
  });
  
  test('should throw error for unknown environment ID', () => {
    expect(() => {
      manager.getEnvironment('unknown');
    }).toThrow('Unknown environment ID: unknown');
  });
  
  test('should get all environments', () => {
    const env1 = new MockEnvironment();
    const env2 = new MockEnvironment();
    
    manager.registerEnvironment('test-env-1', env1);
    manager.registerEnvironment('test-env-2', env2);
    
    const environments = manager.getAllEnvironments();
    
    expect(environments.size).toBe(2);
    expect(environments.has('test-env-1')).toBe(true);
    expect(environments.has('test-env-2')).toBe(true);
  });
  
  test('should remove environment', () => {
    const environment = new MockEnvironment();
    manager.registerEnvironment('test-env', environment);
    
    const result = manager.removeEnvironment('test-env');
    
    expect(result).toBe(true);
    expect(manager.environments.has('test-env')).toBe(false);
  });
  
  test('should return false when removing non-existent environment', () => {
    const result = manager.removeEnvironment('non-existent');
    
    expect(result).toBe(false);
  });
  
  test('should initialize algorithm with environment', () => {
    const algorithm = manager.createAlgorithm('ppo', 'test-ppo');
    const environment = new MockEnvironment();
    manager.registerEnvironment('test-env', environment);
    
    const result = manager.initializeAlgorithm('test-ppo', 'test-env');
    
    expect(result).toBe(true);
    expect(algorithm.initialized).toBe(true);
  });
  
  // Note: The following tests would normally use Jest's mocking capabilities
  // to avoid actual training, but we'll keep them simple for this example
  
  test('should train algorithm in environment', async () => {
    // This is a simplified test that just verifies the method exists and returns
    // We would normally mock the algorithm and environment for proper unit testing
    const algorithm = manager.createAlgorithm('ppo', 'test-ppo');
    const environment = new MockEnvironment();
    manager.registerEnvironment('test-env', environment);
    
    // Mock the algorithm's methods to avoid actual training
    algorithm.initialize = jest.fn().mockReturnValue(true);
    algorithm.selectAction = jest.fn().mockReturnValue(0);
    algorithm.update = jest.fn().mockReturnValue({ loss: 0 });
    
    const result = await manager.trainAlgorithm('test-ppo', 'test-env', {
      episodes: 2,
      maxStepsPerEpisode: 5,
      evaluationInterval: 2,
      evaluationEpisodes: 1
    });
    
    expect(result).toBeDefined();
    expect(result.episodes.length).toBe(2);
    expect(algorithm.initialize).toHaveBeenCalled();
    expect(algorithm.selectAction).toHaveBeenCalled();
    expect(algorithm.update).toHaveBeenCalled();
  });
  
  test('should evaluate algorithm in environment', async () => {
    // This is a simplified test that just verifies the method exists and returns
    const algorithm = manager.createAlgorithm('ppo', 'test-ppo');
    const environment = new MockEnvironment();
    manager.registerEnvironment('test-env', environment);
    
    // Mock the algorithm's methods to avoid actual evaluation
    algorithm.initialize = jest.fn().mockReturnValue(true);
    algorithm.selectAction = jest.fn().mockReturnValue(0);
    
    const result = await manager.evaluateAlgorithm('test-ppo', 'test-env', {
      episodes: 2
    });
    
    expect(result).toBeDefined();
    expect(result.episodes.length).toBe(2);
    expect(algorithm.initialize).toHaveBeenCalled();
    expect(algorithm.selectAction).toHaveBeenCalled();
  });
  
  test('should get available algorithms', () => {
    const algorithms = manager.getAvailableAlgorithms();
    
    expect(Array.isArray(algorithms)).toBe(true);
    expect(algorithms).toContain('ppo');
    expect(algorithms).toContain('sac');
  });
  
  test('should get algorithm configuration schema', () => {
    const schema = manager.getAlgorithmConfigSchema('ppo');
    
    expect(Array.isArray(schema)).toBe(true);
    expect(schema.length).toBeGreaterThan(0);
    
    // Check first schema item
    expect(schema[0]).toEqual({
      name: expect.any(String),
      description: expect.any(String),
      defaultValue: expect.anything(),
      type: expect.any(String)
    });
  });
});
