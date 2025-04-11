/**
 * index.test.js
 * Unit tests for the reinforcement learning module index
 */

const reinforcement = require('../../src/reinforcement/index');

describe('Reinforcement Learning Module Index', () => {
  test('should export all core components', () => {
    expect(reinforcement.AlgorithmInterface).toBeDefined();
    expect(reinforcement.ReinforcementConfig).toBeDefined();
    expect(reinforcement.ReinforcementLearningManager).toBeDefined();
    expect(reinforcement.HyperparameterOptimization).toBeDefined();
  });
  
  test('should export all algorithms', () => {
    expect(reinforcement.algorithms).toBeDefined();
    expect(reinforcement.algorithms.PPO).toBeDefined();
    expect(reinforcement.algorithms.SAC).toBeDefined();
  });
  
  test('should provide factory function for creating manager', () => {
    expect(typeof reinforcement.createManager).toBe('function');
    
    const manager = reinforcement.createManager();
    expect(manager).toBeInstanceOf(reinforcement.ReinforcementLearningManager);
  });
  
  test('should provide factory function for creating optimizer', () => {
    expect(typeof reinforcement.createOptimizer).toBe('function');
    
    const optimizer = reinforcement.createOptimizer();
    expect(optimizer).toBeInstanceOf(reinforcement.HyperparameterOptimization);
    
    // Test with custom options
    const customOptions = { maxIterations: 100 };
    const customOptimizer = reinforcement.createOptimizer(customOptions);
    expect(customOptimizer.options.maxIterations).toBe(100);
  });
});
