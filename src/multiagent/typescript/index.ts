/**
 * Index file for the TypeScript multi-agent system
 * Exports all components for easy importing
 */

// Export interfaces as types
export type { 
  MultiAgentEnvironment,
  AgentObservation,
  AgentAction,
  AgentStepResult
} from './MultiAgentEnvironment';

// Export implementations as values
export { 
  BaseMultiAgentEnvironment 
} from './MultiAgentEnvironment';

// Export from MultiAgentManager
export * from './MultiAgentManager';

// Export from MultiAgentExperimentRunner
export * from './MultiAgentExperimentRunner';

// Export from MultiAgentConfigLoader with explicit re-exports to avoid ambiguity
export { 
  MultiAgentConfigLoader,
  // Export interfaces as types to avoid ambiguity
  type MultiAgentEnvironmentConfig
} from './MultiAgentConfigLoader';
