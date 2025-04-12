/**
 * SAC.test.ts
 * Unit tests for the SAC (Soft Actor-Critic) algorithm
 */

import SAC from '../../src/reinforcement/algorithms/SAC';
import * as tf from '@tensorflow/tfjs';
import { EnvironmentInfo, Experience, ContinuousActionSpace } from '../../src/types/reinforcement';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  input: jest.fn().mockReturnValue({}),
  layers: {
    dense: jest.fn().mockReturnValue({
      apply: jest.fn().mockReturnValue({})
    }),
    concatenate: jest.fn().mockReturnValue({
      apply: jest.fn().mockReturnValue({})
    }),
    activation: jest.fn().mockReturnValue({
      apply: jest.fn().mockReturnValue({})
    })
  },
  model: jest.fn().mockReturnValue({
    predict: jest.fn().mockReturnValue([{}, {}]),
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
  tanh: jest.fn().mockReturnValue({}),
  atanh: jest.fn().mockReturnValue({}),
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
  },
  loadLayersModel: jest.fn().mockReturnValue({
    predict: jest.fn().mockReturnValue([{}, {}])
  })
}));

// Mock fs module
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    config: { learningRate: 0.001 },
    stats: { episodes: 10 },
    actionSpace: { shape: [2] },
    stateSpace: { shape: [4] },
    alpha: 0.2,
    logAlpha: Math.log(0.2),
    targetEntropy: -2,
    updateCounter: 5
  }))
}));

describe('SAC', () => {
  let sac: SAC;
  
  beforeEach(() => {
    // Create SAC instance with default config
    sac = new SAC();
    
    // Reset TensorFlow mocks
    jest.clearAllMocks();
  });
  
  test('should initialize with default configuration', () => {
    expect(sac.config).toBeDefined();
    expect(sac.config.learningRate).toBeDefined();
    expect(sac.config.gamma).toBeDefined();
    expect(sac.config.tau).toBeDefined();
    expect(sac.config.alpha).toBeDefined();
    expect(sac.initialized).toBe(false);
    expect(sac.replayBuffer).toEqual([]);
  });
  
  test('should initialize with custom configuration', () => {
    const customConfig = {
      learningRate: 0.001,
      gamma: 0.95,
      tau: 0.01,
      alpha: 0.1,
      batchSize: 64
    };
    
    const customSAC = new SAC(customConfig);
    
    expect(customSAC.config.learningRate).toBe(0.001);
    expect(customSAC.config.gamma).toBe(0.95);
    expect(customSAC.config.tau).toBe(0.01);
    expect(customSAC.config.alpha).toBe(0.1);
  });
  
  test('should initialize with environment information', () => {
    const envInfo: EnvironmentInfo = {
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    };
    
    const result = sac.initialize(envInfo);
    
    expect(result).toBe(true);
    expect(sac.initialized).toBe(true);
    expect(sac.stateSpace).toEqual(envInfo.stateSpace);
    expect(sac.actionSpace).toEqual(envInfo.actionSpace);
    expect(sac.targetEntropy).toBe(-2); // Negative of action space dimension
    
    // Check if networks were created
    expect(tf.input).toHaveBeenCalled();
    expect(tf.layers.dense).toHaveBeenCalled();
    expect(tf.model).toHaveBeenCalled();
    expect(tf.train.adam).toHaveBeenCalledWith(sac.config.learningRate);
  });
  
  test('should throw error when initializing without environment info', () => {
    expect(() => {
      sac.initialize(undefined as unknown as EnvironmentInfo);
    }).toThrow('Environment info must contain stateSpace and actionSpace');
  });
  
  test('should throw error when initializing with discrete action space', () => {
    expect(() => {
      sac.initialize({
        stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
        actionSpace: { n: 2, shape: [1], type: 'discrete' },
        actionType: 'discrete'
      });
    }).toThrow('SAC is designed for continuous action spaces');
  });
  
  test('should throw error when selecting action without initialization', () => {
    expect(() => {
      sac.selectAction([0, 0, 0, 0]);
    }).toThrow('Algorithm must be initialized before selecting actions');
  });
  
  test('should select action after initialization', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock action distribution
    const mockMean = new Float32Array([0.5, -0.5]);
    const mockLogStd = new Float32Array([-1.0, -1.0]);
    (tf.model().predict as jest.Mock).mockReturnValue([
      { dataSync: () => mockMean },
      { dataSync: () => mockLogStd }
    ]);
    
    // Select action with exploration
    const actionExplore = sac.selectAction([0, 0, 0, 0], true);
    
    expect(Array.isArray(actionExplore)).toBe(true);
    expect((actionExplore as number[]).length).toBe(2);
    
    // Select action without exploration
    const actionExploit = sac.selectAction([0, 0, 0, 0], false);
    
    expect(Array.isArray(actionExploit)).toBe(true);
    expect((actionExploit as number[]).length).toBe(2);
  });
  
  test('should scale actions to action space bounds', () => {
    // Initialize with bounded action space
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { 
        shape: [2],
        low: [-1, -2],
        high: [1, 2],
        type: 'continuous'
      },
      actionType: 'continuous'
    });
    
    // Test scaling
    const scaledAction = sac['_scaleAction']([-1, 1]);
    
    expect(scaledAction[0]).toBe(-1); // -1 maps to -1
    expect(scaledAction[1]).toBe(2);  // 1 maps to 2
    
    // Test unscaling
    const unscaledAction = sac['_unscaleAction']([-1, 2]);
    
    expect(unscaledAction[0]).toBe(-1); // -1 maps to -1
    expect(unscaledAction[1]).toBe(1);  // 2 maps to 1
  });
  
  test('should add experience to replay buffer', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Add experience
    sac['_addToReplayBuffer']({
      state: [0, 0, 0, 0],
      action: [0.5, -0.5],
      reward: 1.0,
      nextState: [0, 0, 0, 1],
      done: false
    });
    
    expect(sac.replayBuffer.length).toBe(1);
    expect(sac.bufferSize).toBe(1);
    
    // Add more experiences to test buffer limit
    for (let i = 0; i < sac.config.bufferSize! + 10; i++) {
      sac['_addToReplayBuffer']({
        state: [0, 0, 0, 0],
        action: [0.5, -0.5],
        reward: 1.0,
        nextState: [0, 0, 0, 1],
        done: false
      });
    }
    
    expect(sac.replayBuffer.length).toBe(sac.config.bufferSize!);
    expect(sac.bufferSize).toBe(sac.config.bufferSize!);
  });
  
  test('should sample from replay buffer', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Add experiences
    for (let i = 0; i < 10; i++) {
      sac['_addToReplayBuffer']({
        state: [0, 0, 0, i],
        action: [0.5, -0.5],
        reward: i * 1.0,
        nextState: [0, 0, 0, i + 1],
        done: i === 9
      });
    }
    
    // Sample batch
    const batch = sac['_sampleFromReplayBuffer'](5);
    
    expect(batch.states.length).toBe(5);
    expect(batch.actions.length).toBe(5);
    expect(batch.rewards.length).toBe(5);
    expect(batch.nextStates.length).toBe(5);
    expect(batch.dones.length).toBe(5);
  });
  
  test('should update target networks', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock network weights
    const mockWeights = [
      { dataSync: () => new Float32Array([1, 2, 3]) },
      { dataSync: () => new Float32Array([4, 5, 6]) }
    ];
    
    sac.qNetwork1.getWeights = jest.fn().mockReturnValue(mockWeights);
    sac.qNetwork2.getWeights = jest.fn().mockReturnValue(mockWeights);
    sac.targetQNetwork1.getWeights = jest.fn().mockReturnValue(mockWeights);
    sac.targetQNetwork2.getWeights = jest.fn().mockReturnValue(mockWeights);
    
    // Update target networks
    sac['_updateTargetNetworks']();
    
    expect(sac.targetQNetwork1.setWeights).toHaveBeenCalled();
    expect(sac.targetQNetwork2.setWeights).toHaveBeenCalled();
  });
  
  test('should update with experience', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock _performUpdate
    sac['_performUpdate'] = jest.fn().mockReturnValue({ loss: 0.1 });
    
    // Update with experience
    const experience1: Experience = {
      state: [0, 0, 0, 0],
      action: [0.5, -0.5],
      reward: 1.0,
      nextState: [0, 0, 0, 1],
      done: false
    };
    
    const result1 = sac.update(experience1);
    
    expect(sac.replayBuffer.length).toBe(1);
    expect(result1).toEqual({ loss: null }); // No update yet
    
    // Fill buffer to trigger update
    for (let i = 0; i < sac.config.batchSize; i++) {
      sac.update({
        state: [0, 0, 0, i],
        action: [0.5, -0.5],
        reward: 1.0,
        nextState: [0, 0, 0, i + 1],
        done: false
      });
    }
    
    // Set updateCounter to trigger update
    sac.updateCounter = sac.config.targetUpdateInterval! - 1;
    
    // Update with one more experience
    const experience2: Experience = {
      state: [0, 0, 0, 100],
      action: [0.5, -0.5],
      reward: 1.0,
      nextState: [0, 0, 0, 101],
      done: false
    };
    
    const result2 = sac.update(experience2);
    
    expect(sac['_performUpdate']).toHaveBeenCalled();
    expect(result2).toEqual({ loss: 0.1 });
  });
  
  test('should perform batch update with experiences', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock update method
    sac.update = jest.fn().mockReturnValue({ loss: 0.1 });
    
    // Batch update
    const experiences: Experience[] = [
      { state: [0, 0, 0, 0], action: [0.5, -0.5], reward: 1.0, nextState: [0, 0, 0, 1], done: false },
      { state: [0, 0, 0, 1], action: [0.3, -0.7], reward: 0.0, nextState: [0, 0, 0, 0], done: true }
    ];
    
    const result = sac.batchUpdate(experiences);
    
    expect(sac.update).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });
  
  test('should save and load model', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Save model
    const saveResult = sac.save('/path/to/save');
    
    expect(saveResult).toBe(true);
    
    // Load model
    const loadResult = sac.load('/path/to/load');
    
    expect(loadResult).toBe(true);
    expect(sac.initialized).toBe(true);
  });
  
  test('should reset algorithm state', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Add some data to buffer
    sac['_addToReplayBuffer']({
      state: [0, 0, 0, 0],
      action: [0.5, -0.5],
      reward: 1.0,
      nextState: [0, 0, 0, 1],
      done: false
    });
    
    sac.updateCounter = 10;
    
    // Reset
    const result = sac.reset();
    
    expect(result).toBe(true);
    expect(sac.replayBuffer).toEqual([]);
    expect(sac.bufferSize).toBe(0);
    expect(sac.updateCounter).toBe(0);
    expect(sac.trainingStats.episodes).toBe(0);
    expect(sac.trainingStats.steps).toBe(0);
  });
  
  test('should calculate log probabilities correctly', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock TensorFlow operations
    (tf.tidy as jest.Mock).mockImplementation((fn) => {
      const result = fn();
      return {
        dataSync: () => [result]
      };
    });
    
    (tf.exp as jest.Mock).mockReturnValue({
      dataSync: () => [0.1, 0.1]
    });
    
    (tf.atanh as jest.Mock).mockReturnValue({
      dataSync: () => [0.5, -0.5]
    });
    
    (tf.sub as jest.Mock).mockReturnValue({
      dataSync: () => [0, 0]
    });
    
    (tf.square as jest.Mock).mockReturnValue({
      dataSync: () => [0, 0]
    });
    
    (tf.div as jest.Mock).mockReturnValue({
      dataSync: () => [0, 0]
    });
    
    (tf.mul as jest.Mock).mockReturnValue({
      dataSync: () => [0, 0]
    });
    
    (tf.log as jest.Mock).mockReturnValue({
      dataSync: () => [0, 0]
    });
    
    (tf.sum as jest.Mock).mockReturnValue({
      dataSync: () => [0]
    });
    
    (tf.add as jest.Mock).mockReturnValue({
      dataSync: () => [0]
    });
    
    // Calculate log probs
    const means = { dataSync: () => [0.5, -0.5] };
    const logStds = { dataSync: () => [-1.0, -1.0] };
    const actions = { dataSync: () => [0.4, -0.6] };
    
    const logProbs = sac['_calculateLogProbs'](means, logStds, actions);
    
    expect(logProbs).toBeDefined();
  });
  
  test('should perform Q-network update correctly', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock tensors and optimizer
    const states = tf.tensor([]);
    const actions = tf.tensor([]);
    const rewards = tf.tensor1d([]);
    const nextStates = tf.tensor([]);
    const dones = tf.tensor1d([]);
    
    // Mock loss calculation
    (tf.losses.meanSquaredError as jest.Mock).mockReturnValue({
      dataSync: () => [0.1]
    });
    
    // Update Q-network
    const loss = sac['_updateQNetwork'](
      sac.qNetwork1,
      sac.qOptimizer1,
      states,
      actions,
      rewards,
      nextStates,
      dones
    );
    
    expect(loss).toBe(0.1);
    expect(sac.qOptimizer1.minimize).toHaveBeenCalled();
  });
  
  test('should perform policy network update correctly', () => {
    // Initialize
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Mock tensors and optimizer
    const states = tf.tensor([]);
    
    // Mock loss calculation
    (tf.mean as jest.Mock).mockReturnValue({
      dataSync: () => [0.2]
    });
    
    // Update policy network
    const loss = sac['_updatePolicyNetwork'](states);
    
    expect(loss).toBe(0.2);
    expect(sac.policyOptimizer.minimize).toHaveBeenCalled();
  });
  
  test('should perform alpha update correctly when auto-tuning', () => {
    // Initialize with auto alpha
    sac.initialize({
      stateSpace: { shape: [4], low: [-1, -1, -1, -1], high: [1, 1, 1, 1] },
      actionSpace: { shape: [2], low: [-1, -1], high: [1, 1], type: 'continuous' },
      actionType: 'continuous'
    });
    
    // Ensure auto alpha is enabled
    sac.config.autoAlpha = true;
    
    // Mock tensors and optimizer
    const states = tf.tensor([]);
    
    // Mock loss calculation
    (tf.mean as jest.Mock).mockReturnValue({
      dataSync: () => [0.3]
    });
    
    (tf.scalar as jest.Mock).mockReturnValue({
      dataSync: () => [Math.log(sac.alpha)]
    });
    
    // Update alpha
    const loss = sac['_updateAlpha'](states);
    
    expect(loss).toBe(0.3);
    expect(sac.alphaOptimizer.minimize).toHaveBeenCalled();
  });
});
