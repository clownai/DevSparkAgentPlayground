/**
 * Simple test file to verify TypeScript compilation and basic functionality
 */

import logger from '../src/utils/logger';
import AlgorithmInterface from '../src/reinforcement/AlgorithmInterface';
import PPO from '../src/reinforcement/algorithms/PPO';
import SAC from '../src/reinforcement/algorithms/SAC';
import ReinforcementConfig from '../src/reinforcement/ReinforcementConfig';
import { 
  AlgorithmInitializationError, 
  ModelPersistenceError 
} from '../src/reinforcement/errors';
import { EnvironmentInfo } from '../src/types/reinforcement';

// Test logger
logger.info('Starting TypeScript test', { component: 'TypeScriptTest' });

// Test reinforcement config
const ppoConfig = ReinforcementConfig.getConfig('ppo', {
  learningRate: 0.001,
  batchSize: 128
});

logger.info('PPO Config loaded', { config: ppoConfig });

// Test environment info
const envInfo: EnvironmentInfo = {
  stateSpace: {
    shape: [4],
    low: [-1, -1, -1, -1],
    high: [1, 1, 1, 1],
    type: 'continuous'
  },
  actionSpace: {
    shape: [2],
    low: [-1, -1],
    high: [1, 1],
    type: 'continuous'
  },
  actionType: 'continuous'
};

// Test algorithm initialization
try {
  // Create PPO instance
  const ppo = new PPO({
    learningRate: 0.0003,
    gamma: 0.99,
    batchSize: 64
  });
  
  // Initialize PPO
  const ppoInitialized = ppo.initialize(envInfo);
  logger.info('PPO initialized', { success: ppoInitialized });
  
  // Test action selection
  const state = [0.1, 0.2, 0.3, 0.4];
  const action = ppo.selectAction(state, true);
  logger.info('PPO action selected', { state, action });
  
  // Create SAC instance
  const sac = new SAC({
    learningRate: 0.0003,
    gamma: 0.99,
    batchSize: 256
  });
  
  // Initialize SAC
  const sacInitialized = sac.initialize(envInfo);
  logger.info('SAC initialized', { success: sacInitialized });
  
  // Test action selection
  const sacAction = sac.selectAction(state, true);
  logger.info('SAC action selected', { state, action: sacAction });
  
  logger.info('TypeScript test completed successfully');
} catch (error) {
  if (error instanceof AlgorithmInitializationError) {
    logger.error('Algorithm initialization error', { 
      message: error.message,
      context: error.context
    });
  } else if (error instanceof ModelPersistenceError) {
    logger.error('Model persistence error', { 
      message: error.message,
      operation: error.operation,
      path: error.path
    });
  } else {
    logger.error('Unexpected error', { error });
  }
}
