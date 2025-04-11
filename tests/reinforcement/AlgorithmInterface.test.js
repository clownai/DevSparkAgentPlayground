/**
 * AlgorithmInterface.test.js
 * Unit tests for the AlgorithmInterface class
 */

const AlgorithmInterface = require('../../src/reinforcement/AlgorithmInterface');

// Mock implementation of AlgorithmInterface for testing
class MockAlgorithm extends AlgorithmInterface {
  initialize(envInfo) {
    this.initialized = true;
    return true;
  }
  
  selectAction(state, explore) {
    return 0;
  }
  
  update(experience) {
    this._updateStats({ steps: 1, reward: experience.reward });
    return { loss: 0 };
  }
  
  batchUpdate(experiences) {
    for (const exp of experiences) {
      this.update(exp);
    }
    return { loss: 0 };
  }
  
  save(path) {
    return true;
  }
  
  load(path) {
    return true;
  }
}

describe('AlgorithmInterface', () => {
  test('should not be instantiable directly', () => {
    expect(() => {
      new AlgorithmInterface();
    }).toThrow('AlgorithmInterface is an abstract class and cannot be instantiated directly');
  });
  
  test('should be extendable by subclasses', () => {
    expect(() => {
      new MockAlgorithm();
    }).not.toThrow();
  });
  
  test('should initialize with default training stats', () => {
    const algorithm = new MockAlgorithm();
    expect(algorithm.trainingStats).toEqual({
      episodes: 0,
      steps: 0,
      totalReward: 0,
      losses: []
    });
  });
  
  test('should update config correctly', () => {
    const algorithm = new MockAlgorithm({ testParam: 123 });
    expect(algorithm.getConfig()).toEqual({ testParam: 123 });
    
    algorithm.updateConfig({ newParam: 456 });
    expect(algorithm.getConfig()).toEqual({ testParam: 123, newParam: 456 });
  });
  
  test('should update training stats correctly', () => {
    const algorithm = new MockAlgorithm();
    
    // Update with steps
    algorithm._updateStats({ steps: 10 });
    expect(algorithm.trainingStats.steps).toBe(10);
    
    // Update with episodes
    algorithm._updateStats({ episodes: 2 });
    expect(algorithm.trainingStats.episodes).toBe(2);
    
    // Update with reward
    algorithm._updateStats({ reward: 5 });
    expect(algorithm.trainingStats.totalReward).toBe(5);
    
    // Update with loss
    algorithm._updateStats({ loss: 0.5 });
    expect(algorithm.trainingStats.losses).toEqual([0.5]);
    
    // Multiple updates
    algorithm._updateStats({ steps: 5, episodes: 1, reward: 3, loss: 0.3 });
    expect(algorithm.trainingStats).toEqual({
      episodes: 3,
      steps: 15,
      totalReward: 8,
      losses: [0.5, 0.3]
    });
  });
  
  test('should limit loss history to 100 entries', () => {
    const algorithm = new MockAlgorithm();
    
    // Add 110 losses
    for (let i = 0; i < 110; i++) {
      algorithm._updateStats({ loss: i });
    }
    
    // Should only keep the last 100
    expect(algorithm.trainingStats.losses.length).toBe(100);
    expect(algorithm.trainingStats.losses[0]).toBe(10);
    expect(algorithm.trainingStats.losses[99]).toBe(109);
  });
  
  test('should reset training stats correctly', () => {
    const algorithm = new MockAlgorithm();
    
    // Update stats
    algorithm._updateStats({ steps: 10, episodes: 2, reward: 5, loss: 0.5 });
    
    // Reset
    algorithm.reset();
    
    // Check if reset correctly
    expect(algorithm.trainingStats).toEqual({
      episodes: 0,
      steps: 0,
      totalReward: 0,
      losses: []
    });
  });
  
  test('should get stats correctly', () => {
    const algorithm = new MockAlgorithm();
    
    // Update stats
    algorithm._updateStats({ steps: 10, episodes: 2, reward: 5, loss: 0.5 });
    
    // Get stats
    const stats = algorithm.getStats();
    
    // Check if stats are correct
    expect(stats).toEqual({
      episodes: 2,
      steps: 10,
      totalReward: 5,
      losses: [0.5]
    });
    
    // Ensure stats are a copy, not a reference
    stats.episodes = 100;
    expect(algorithm.trainingStats.episodes).toBe(2);
  });
  
  test('should update stats through update method', () => {
    const algorithm = new MockAlgorithm();
    
    // Call update method
    algorithm.update({ state: 0, action: 0, reward: 3, nextState: 1, done: false });
    
    // Check if stats updated
    expect(algorithm.trainingStats.steps).toBe(1);
    expect(algorithm.trainingStats.totalReward).toBe(3);
  });
  
  test('should update stats through batchUpdate method', () => {
    const algorithm = new MockAlgorithm();
    
    // Call batchUpdate method
    algorithm.batchUpdate([
      { state: 0, action: 0, reward: 3, nextState: 1, done: false },
      { state: 1, action: 1, reward: 2, nextState: 2, done: false }
    ]);
    
    // Check if stats updated
    expect(algorithm.trainingStats.steps).toBe(2);
    expect(algorithm.trainingStats.totalReward).toBe(5);
  });
});
