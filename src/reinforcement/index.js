/**
 * index.js
 * Entry point for the Advanced Reinforcement Learning Framework
 */

const AlgorithmInterface = require('./AlgorithmInterface');
const ReinforcementConfig = require('./ReinforcementConfig');
const ReinforcementLearningManager = require('./ReinforcementLearningManager');
const HyperparameterOptimization = require('./HyperparameterOptimization');

// Import algorithms
const PPO = require('./algorithms/PPO');
const SAC = require('./algorithms/SAC');

// Export all components
module.exports = {
  // Core components
  AlgorithmInterface,
  ReinforcementConfig,
  ReinforcementLearningManager,
  HyperparameterOptimization,
  
  // Algorithms
  algorithms: {
    PPO,
    SAC
  },
  
  // Factory function to create a manager
  createManager: () => new ReinforcementLearningManager(),
  
  // Factory function to create an optimizer
  createOptimizer: (options) => new HyperparameterOptimization(options)
};
