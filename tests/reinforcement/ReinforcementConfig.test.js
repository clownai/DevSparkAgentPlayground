/**
 * ReinforcementConfig.test.js
 * Unit tests for the ReinforcementConfig class
 */

const ReinforcementConfig = require('../../src/reinforcement/ReinforcementConfig');

describe('ReinforcementConfig', () => {
  test('should have default configurations for algorithms', () => {
    expect(ReinforcementConfig.defaults).toBeDefined();
    expect(ReinforcementConfig.defaults.ppo).toBeDefined();
    expect(ReinforcementConfig.defaults.sac).toBeDefined();
    expect(ReinforcementConfig.defaults.dqn).toBeDefined();
  });
  
  test('should get configuration with defaults', () => {
    const config = ReinforcementConfig.getConfig('ppo');
    expect(config).toEqual(ReinforcementConfig.defaults.ppo);
  });
  
  test('should merge user configuration with defaults', () => {
    const userConfig = {
      learningRate: 0.001,
      batchSize: 128
    };
    
    const config = ReinforcementConfig.getConfig('ppo', userConfig);
    
    // Should have user values
    expect(config.learningRate).toBe(0.001);
    expect(config.batchSize).toBe(128);
    
    // Should have default values for other parameters
    expect(config.gamma).toBe(ReinforcementConfig.defaults.ppo.gamma);
    expect(config.epsilon).toBe(ReinforcementConfig.defaults.ppo.epsilon);
  });
  
  test('should throw error for unknown algorithm', () => {
    expect(() => {
      ReinforcementConfig.getConfig('unknown');
    }).toThrow('Unknown algorithm: unknown');
  });
  
  test('should validate parameter correctly', () => {
    // Valid parameters
    expect(ReinforcementConfig.validateParam('ppo', 'learningRate', 0.001)).toBe(true);
    expect(ReinforcementConfig.validateParam('ppo', 'useCritic', false)).toBe(true);
    
    // Invalid parameters (wrong type)
    expect(ReinforcementConfig.validateParam('ppo', 'learningRate', 'not a number')).toBe(false);
    expect(ReinforcementConfig.validateParam('ppo', 'useCritic', 'not a boolean')).toBe(false);
  });
  
  test('should throw error for unknown parameter', () => {
    expect(() => {
      ReinforcementConfig.validateParam('ppo', 'unknownParam', 0);
    }).toThrow('Unknown parameter: unknownParam for algorithm: ppo');
  });
  
  test('should get parameter description', () => {
    const description = ReinforcementConfig.getParamDescription('ppo', 'learningRate');
    
    expect(description).toEqual({
      name: 'learningRate',
      description: expect.any(String),
      defaultValue: ReinforcementConfig.defaults.ppo.learningRate,
      type: 'number'
    });
  });
  
  test('should throw error for unknown parameter description', () => {
    expect(() => {
      ReinforcementConfig.getParamDescription('ppo', 'unknownParam');
    }).toThrow('No description available for parameter: unknownParam in algorithm: ppo');
  });
  
  test('should get all parameter descriptions', () => {
    const descriptions = ReinforcementConfig.getAllParamDescriptions('ppo');
    
    expect(Array.isArray(descriptions)).toBe(true);
    expect(descriptions.length).toBe(Object.keys(ReinforcementConfig.defaults.ppo).length);
    
    // Check first description
    expect(descriptions[0]).toEqual({
      name: expect.any(String),
      description: expect.any(String),
      defaultValue: expect.anything(),
      type: expect.any(String)
    });
  });
  
  test('should get available algorithms', () => {
    const algorithms = ReinforcementConfig.getAvailableAlgorithms();
    
    expect(Array.isArray(algorithms)).toBe(true);
    expect(algorithms).toContain('ppo');
    expect(algorithms).toContain('sac');
    expect(algorithms).toContain('dqn');
  });
});
