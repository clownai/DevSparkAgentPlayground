/**
 * Environment module type definitions
 * Contains interfaces for simulation environments and their components
 */

export interface EnvironmentConfig {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  parameters: Record<string, any>;
  maxSteps?: number;
  renderMode?: 'none' | 'console' | 'visual';
  seed?: number;
}

export interface ObservationSpace {
  type: 'discrete' | 'continuous' | 'dict' | 'tuple';
  shape: number[];
  low?: number[];
  high?: number[];
  dtype?: 'float32' | 'float64' | 'int32' | 'int64' | 'uint8';
  spaces?: Record<string, ObservationSpace>;
}

export interface ActionSpace {
  type: 'discrete' | 'continuous' | 'dict' | 'tuple';
  shape: number[];
  n?: number; // For discrete action spaces
  low?: number[];
  high?: number[];
  dtype?: 'float32' | 'float64' | 'int32' | 'int64' | 'uint8';
  spaces?: Record<string, ActionSpace>;
}

export interface Observation {
  [key: string]: number | boolean | string | number[] | Record<string, any>;
}

export type Action = number | number[] | Record<string, number | number[]>;

export interface StepResult {
  observation: Observation;
  reward: number;
  done: boolean;
  info: Record<string, any>;
}

export interface EpisodeStats {
  episodeCount: number;
  totalSteps: number;
  totalReward: number;
  averageReward: number;
  minReward: number;
  maxReward: number;
  averageStepsPerEpisode: number;
  successRate?: number;
}

export interface RenderOptions {
  mode: 'console' | 'visual';
  width?: number;
  height?: number;
  fps?: number;
  includeReward?: boolean;
  includeInfo?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  type: string;
  version: string;
  
  // Core environment methods
  reset(): Observation;
  step(action: Action): StepResult;
  render(options?: RenderOptions): string | Uint8Array | void;
  close(): void;
  
  // Environment information
  getObservationSpace(): ObservationSpace;
  getActionSpace(): ActionSpace;
  getMaxSteps(): number | null;
  getSeed(): number | null;
  
  // Environment state
  getState(): Record<string, any>;
  setState(state: Record<string, any>): boolean;
  getStats(): EpisodeStats;
  
  // Environment configuration
  getConfig(): EnvironmentConfig;
  updateConfig(config: Partial<EnvironmentConfig>): boolean;
}

export interface EnvironmentFactory {
  createEnvironment(config: EnvironmentConfig): Environment;
  listAvailableEnvironments(): string[];
  getEnvironmentInfo(type: string): {
    name: string;
    description: string;
    version: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      default?: any;
      required: boolean;
      range?: [number, number];
      options?: string[];
    }>;
  };
}

export interface MultiAgentEnvironment extends Environment {
  getAgentIds(): string[];
  getAgentObservation(agentId: string): Observation;
  getAgentActionSpace(agentId: string): ActionSpace;
  stepAgent(agentId: string, action: Action): StepResult;
  getAgentStats(agentId: string): EpisodeStats;
}

export interface EnvironmentWrapper {
  wrap(env: Environment): Environment;
  unwrap(): Environment;
}
