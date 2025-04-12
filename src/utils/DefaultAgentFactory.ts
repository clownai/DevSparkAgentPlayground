/**
 * Default implementation of AgentFactory
 */

import { Agent, AgentFactory } from '../types/agent';
import { TestAgent } from './TestAgent';

/**
 * Default implementation of AgentFactory
 */
export class DefaultAgentFactory implements AgentFactory {
  /**
   * Create an agent based on configuration
   * @param config Agent configuration
   * @returns Created agent
   */
  public createAgent(config: any): Agent {
    // For testing purposes, always return a TestAgent
    return new TestAgent();
  }
}
