/**
 * Test Agent implementation for testing purposes
 */

import { Agent } from '../types/agent';

/**
 * Simple agent implementation for testing
 */
export class TestAgent implements Agent {
  private actionSpace: any;
  private observationSpace: any;
  
  /**
   * Initialize the agent
   * @param config Agent configuration
   */
  public initialize(config: any): void {
    this.actionSpace = config.actionSpace;
    this.observationSpace = config.observationSpace;
  }
  
  /**
   * Select an action based on observation
   * @param observation Agent observation
   * @returns Selected action
   */
  public selectAction(observation: any): any {
    // Simple implementation for testing
    return 0;
  }
  
  /**
   * Update agent with experience
   * @param experience Experience data
   */
  public update(experience: any): any {
    // No learning in this simple agent
    return { loss: 0 };
  }
  
  /**
   * Terminate the agent
   */
  public terminate(): void {
    // No resources to clean up
  }
}
