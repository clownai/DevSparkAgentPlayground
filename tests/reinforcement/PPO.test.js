/**
 * PPO.test.js
 * Unit tests for the PPO (Proximal Policy Optimization) algorithm
 */

const PPO = require('../../src/reinforcement/algorithms/PPO');
const tf = require('tensorflow.js');

// Mock TensorFlow.js
jest.mock('tensorflow.js', () => ({
  input: jest.fn().mockReturnValue({}),
  layers: {
    dense: jest.fn().mockReturnValue({
      apply: jest.fn().mockReturnValue({})
    }),
    activation: jest.fn().mockReturnValue({
      apply: jest.fn().mockReturnValue({})
    })
  },
  model: jest.fn().mockReturnValue({
    predict: jest.fn().mockReturnValue({}),
    getWeights: jest.fn().mockReturnValue([]),
    setWeights: jest.fn()
  }),
  train: {
    adam: jest.fn().mockReturnValue({
      minimize: jest.fn()
    })
  },
  tensor: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0]),
    shape: [],
    expandDims: jest.fn().mockReturnThis(),
    squeeze: jest.fn().mockReturnThis(),
    reshape: jest.fn().mockReturnThis()
  }),
  tensor1d: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0])
  }),
  stack: jest.fn().mockReturnValue({}),
  tidy: jest.fn().mockImplementation((fn) => fn()),
  add: jest.fn().mockReturnValue({}),
  sub: jest.fn().mockReturnValue({}),
  mul: jest.fn().mockReturnValue({}),
  div: jest.fn().mockReturnValue({}),
  neg: jest.fn().mockReturnValue({}),
  exp: jest.fn().mockReturnValue({}),
  log: jest.fn().mockReturnValue({}),
  square: jest.fn().mockReturnValue({}),
  minimum: jest.fn().mockReturnValue({}),
  clipByValue: jest.fn().mockReturnValue({}),
  oneHot: jest.fn().mockReturnValue({}),
  sum: jest.fn().mockReturnValue({}),
  mean: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0])
  }),
  scalar: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0])
  }),
  randomNormal: jest.fn().mockReturnValue({}),
  losses: {
    meanSquaredError: jest.fn().mockReturnValue({})
  }
}));

describe('PPO', () => {
  let ppo;
  
  beforeEach(() => {
    // Create PPO instance with default config
    ppo = new PPO();
    
    // Reset TensorFlow mocks
    jest.clearAllMocks();
  });
  
  test('should initialize with default configuration', () => {
    expect(ppo.config).toBeDefined();
    expect(ppo.config.learningRate).toBeDefined();
    expect(ppo.config.gamma).toBeDefined();
    expect(ppo.config.epsilon).toBeDefined();
    expect(ppo.initialized).toBe(false);
  });
  
  test('should initialize with custom configuration', () => {
    const customConfig = {
      learningRate: 0.001,
      gamma: 0.95,
      epsilon: 0.1
    };
    
    const customPPO = new PPO(customConfig);
    
    expect(customPPO.config.learningRate).toBe(0.001);
    expect(customPPO.config.gamma).toBe(0.95);
    expect(customPPO.config.epsilon).toBe(0.1);
  });
  
  test('should initialize with environment information', () => {
    const envInfo = {
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    };
    
    const result = ppo.initialize(envInfo);
    
    expect(result).toBe(true);
    expect(ppo.initialized).toBe(true);
    expect(ppo.stateSpace).toEqual(envInfo.stateSpace);
    expect(ppo.actionSpace).toEqual(envInfo.actionSpace);
    expect(ppo.isDiscrete).toBe(true);
    
    // Check if networks were created
    expect(tf.input).toHaveBeenCalled();
    expect(tf.layers.dense).toHaveBeenCalled();
    expect(tf.model).toHaveBeenCalled();
    expect(tf.train.adam).toHaveBeenCalledWith(ppo.config.learningRate);
  });
  
  test('should throw error when initializing without environment info', () => {
    expect(() => {
      ppo.initialize();
    }).toThrow('Environment info must contain stateSpace and actionSpace');
  });
  
  test('should throw error when selecting action without initialization', () => {
    expect(() => {
      ppo.selectAction([0, 0, 0, 0]);
    }).toThrow('Algorithm must be initialized before selecting actions');
  });
  
  test('should select action after initialization', () => {
    // Initialize
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    });
    
    // Mock action distribution
    const mockDistribution = new Float32Array([0.7, 0.3]);
    tf.tensor().dataSync.mockReturnValue(mockDistribution);
    
    // Mock _sampleDiscrete and _argmax
    ppo._sampleDiscrete = jest.fn().mockReturnValue(0);
    ppo._argmax = jest.fn().mockReturnValue(0);
    
    // Select action with exploration
    const actionExplore = ppo.selectAction([0, 0, 0, 0], true);
    
    expect(actionExplore).toBe(0);
    expect(ppo._sampleDiscrete).toHaveBeenCalledWith(mockDistribution);
    
    // Select action without exploration
    const actionExploit = ppo.selectAction([0, 0, 0, 0], false);
    
    expect(actionExploit).toBe(0);
    expect(ppo._argmax).toHaveBeenCalledWith(mockDistribution);
  });
  
  test('should handle continuous action spaces', () => {
    // Initialize with continuous action space
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { shape: [2] },
      actionType: 'continuous'
    });
    
    // Mock mean and stdDev
    const mockMean = new Float32Array([0.5, -0.5]);
    const mockStdDev = new Float32Array([0.1, 0.1]);
    
    // Mock action distribution
    tf.tensor().dataSync
      .mockReturnValueOnce(mockMean)
      .mockReturnValueOnce(mockStdDev);
    
    // Mock _randomNormal and _logProbContinuous
    ppo._randomNormal = jest.fn().mockReturnValue(0.1);
    ppo._logProbContinuous = jest.fn().mockReturnValue(-1.0);
    
    // Select action with exploration
    const actionExplore = ppo.selectAction([0, 0, 0, 0], true);
    
    expect(Array.isArray(actionExplore)).toBe(true);
    expect(actionExplore.length).toBe(2);
    expect(ppo._randomNormal).toHaveBeenCalled();
    expect(ppo._logProbContinuous).toHaveBeenCalled();
    
    // Select action without exploration
    const actionExploit = ppo.selectAction([0, 0, 0, 0], false);
    
    expect(Array.isArray(actionExploit)).toBe(true);
    expect(actionExploit.length).toBe(2);
  });
  
  test('should update with experience', () => {
    // Initialize
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    });
    
    // Add some experiences to buffer
    ppo.buffer.states = [[0, 0, 0, 0]];
    ppo.buffer.actions = [0];
    ppo.buffer.oldLogProbs = [-0.5];
    ppo.buffer.values = [0.5];
    
    // Mock _performBatchUpdate
    ppo._performBatchUpdate = jest.fn().mockReturnValue({ loss: 0.1 });
    
    // Update with non-terminal experience
    const result1 = ppo.update({
      state: [0, 0, 0, 0],
      action: 0,
      reward: 1.0,
      nextState: [0, 0, 0, 1],
      done: false
    });
    
    expect(ppo.buffer.rewards).toContain(1.0);
    expect(ppo.buffer.dones).toContain(false);
    expect(result1).toEqual({ loss: null }); // No batch update yet
    
    // Update with terminal experience
    const result2 = ppo.update({
      state: [0, 0, 0, 1],
      action: 1,
      reward: 0.0,
      nextState: [0, 0, 0, 0],
      done: true
    });
    
    expect(ppo.buffer.rewards).toContain(0.0);
    expect(ppo.buffer.dones).toContain(true);
    expect(ppo._performBatchUpdate).toHaveBeenCalled();
    expect(result2).toEqual({ loss: 0.1 });
  });
  
  test('should perform batch update with experiences', () => {
    // Initialize
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    });
    
    // Mock update method
    ppo.update = jest.fn().mockReturnValue({ loss: 0.1 });
    
    // Batch update
    const result = ppo.batchUpdate([
      { state: [0, 0, 0, 0], action: 0, reward: 1.0, nextState: [0, 0, 0, 1], done: false },
      { state: [0, 0, 0, 1], action: 1, reward: 0.0, nextState: [0, 0, 0, 0], done: true }
    ]);
    
    expect(ppo.update).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });
  
  test('should save and load model', () => {
    // Initialize
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    });
    
    // Mock fs module
    const fs = require('fs');
    jest.mock('fs', () => ({
      writeFileSync: jest.fn(),
      readFileSync: jest.fn().mockReturnValue(JSON.stringify({
        config: { learningRate: 0.001 },
        stats: { episodes: 10 },
        actionSpace: { n: 2 },
        stateSpace: { shape: [4] },
        isDiscrete: true
      }))
    }));
    
    // Mock tf.loadLayersModel
    tf.loadLayersModel = jest.fn().mockReturnValue({
      predict: jest.fn().mockReturnValue({})
    });
    
    // Save model
    const saveResult = ppo.save('/path/to/save');
    
    expect(saveResult).toBe(true);
    
    // Load model
    const loadResult = ppo.load('/path/to/load');
    
    expect(loadResult).toBe(true);
    expect(ppo.initialized).toBe(true);
  });
  
  test('should reset algorithm state', () => {
    // Initialize
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    });
    
    // Add some data to buffer
    ppo.buffer.states = [[0, 0, 0, 0]];
    ppo.buffer.actions = [0];
    ppo.buffer.rewards = [1.0];
    
    // Reset
    const result = ppo.reset();
    
    expect(result).toBe(true);
    expect(ppo.buffer.states).toEqual([]);
    expect(ppo.buffer.actions).toEqual([]);
    expect(ppo.buffer.rewards).toEqual([]);
    expect(ppo.trainingStats.episodes).toBe(0);
    expect(ppo.trainingStats.steps).toBe(0);
  });
  
  test('should calculate advantages correctly', () => {
    // Initialize
    ppo.initialize({
      stateSpace: { shape: [4] },
      actionSpace: { n: 2 },
      actionType: 'discrete'
    });
    
    // Set up buffer
    ppo.buffer.rewards = [1.0, 0.5, 0.0];
    ppo.buffer.values = [0.5, 0.3, 0.1];
    ppo.buffer.dones = [false, false, true];
    
    // Calculate advantages
    ppo._calculateAdvantages();
    
    expect(ppo.buffer.advantages.length).toBe(3);
    expect(ppo.buffer.advantages[0]).not.toBeNaN();
    expect(ppo.buffer.advantages[1]).not.toBeNaN();
    expect(ppo.buffer.advantages[2]).not.toBeNaN();
  });
  
  test('should sample discrete actions correctly', () => {
    const probs = [0.2, 0.8];
    
    // Mock Math.random to return 0.1 (should select first action)
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.1);
    
    const action1 = ppo._sampleDiscrete(probs);
    
    // Mock Math.random to return 0.5 (should select second action)
    Math.random = jest.fn().mockReturnValue(0.5);
    
    const action2 = ppo._sampleDiscrete(probs);
    
    // Restore Math.random
    Math.random = originalRandom;
    
    expect(action1).toBe(0);
    expect(action2).toBe(1);
  });
  
  test('should find argmax correctly', () => {
    const values = [0.2, 0.8, 0.3];
    
    const result = ppo._argmax(values);
    
    expect(result).toBe(1);
  });
  
  test('should shuffle indices correctly', () => {
    const length = 5;
    
    const indices = ppo._shuffle(length);
    
    expect(indices.length).toBe(length);
    expect(new Set(indices).size).toBe(length); // All unique
    expect(indices.every(i => i >= 0 && i < length)).toBe(true); // All in range
  });
});
