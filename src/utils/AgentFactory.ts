/**
 * Factory class for creating agents from configuration
 */

import * as path from 'path';
import { AgentConfig } from './ConfigLoader';
import logger from './logger';
import { Logger } from '../types/core';

// Import agent implementations
import PPO from '../reinforcement/algorithms/PPO';
import SAC from '../reinforcement/algorithms/SAC';
import AlgorithmInterface from '../reinforcement/AlgorithmInterface';

/**
 * Factory class for creating agent instances from configuration
 */
export class AgentFactory {
  private static logger: Logger = logger.createChildLogger({ component: 'AgentFactory' });

  /**
   * Create an agent instance from configuration
   * @param {AgentConfig} config - Agent configuration
   * @returns {AlgorithmInterface} - Agent instance
   */
  static createFromConfig(config: AgentConfig): AlgorithmInterface {
    AgentFactory.logger.info(`Creating agent of type ${config.type} from configuration`);
    
    // Extract parameters from configuration
    const { type, parameters } = config;
    
    // Create agent based on type
    switch (type.toUpperCase()) {
      case 'PPO':
        return new PPO(parameters);
      
      case 'SAC':
        return new SAC(parameters);
      
      default:
        throw new Error(`Unsupported agent type: ${type}`);
    }
  }
}

export default AgentFactory;
