/**
 * Type definitions for agent interfaces
 */

import { ActionSpace, ObservationSpace } from './environment';

export interface Agent {
  /**
   * Initialize the agent with configuration
   * @param config Agent configuration
   */
  initialize(config: any): void;
  
  /**
   * Select an action based on observation
   * @param observation Agent observation
   * @returns Selected action
   */
  selectAction(observation: any): any;
  
  /**
   * Update agent with experience
   * @param experience Experience data
   */
  update(experience: any): any;
  
  /**
   * Terminate the agent
   */
  terminate(): void;
}

export interface AgentFactory {
  /**
   * Create an agent
   * @param config Agent configuration
   * @returns Created agent
   */
  createAgent(config: any): Agent;
}

export interface AgentConfig {
  type: string;
  observationSpace?: ObservationSpace;
  actionSpace?: ActionSpace;
  [key: string]: any;
}

export interface AgentExperience {
  observation: any;
  action: any;
  nextObservation: any;
  reward: number;
  done: boolean;
  info?: any;
}
