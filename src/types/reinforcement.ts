/**
 * Type definitions for the DevSparkAgentPlayground
 */

/**
 * Environment information interface
 */
export interface EnvironmentInfo {
  stateSpace: StateSpace;
  actionSpace: ActionSpace;
  actionType: 'discrete' | 'continuous';
}

/**
 * State space interface
 */
export interface StateSpace {
  shape: number[];
  low?: number[];
  high?: number[];
}

/**
 * Action space interface for discrete actions
 */
export interface DiscreteActionSpace {
  n: number;
  shape: number[];
}

/**
 * Action space interface for continuous actions
 */
export interface ContinuousActionSpace {
  shape: number[];
  low: number[];
  high: number[];
}

/**
 * Union type for action spaces
 */
export type ActionSpace = DiscreteActionSpace | ContinuousActionSpace;

/**
 * Experience tuple interface
 */
export interface Experience {
  state: number[] | Record<string, number>;
  action: number | number[];
  reward: number;
  nextState: number[] | Record<string, number>;
  done: boolean;
}

/**
 * Algorithm configuration interface
 */
export interface AlgorithmConfig {
  learningRate: number;
  batchSize: number;
  bufferSize?: number;
  gamma?: number;
  tau?: number;
  hiddenSize?: number[];
  activationFn?: string;
  [key: string]: any;
}

/**
 * Training statistics interface
 */
export interface TrainingStats {
  episodes: number;
  steps: number;
  totalReward: number;
  averageReward: number;
  startTime: Date;
  lastUpdateTime: Date;
  [key: string]: any;
}

/**
 * Update result interface
 */
export interface UpdateResult {
  loss: number | null;
  policyLoss?: number;
  valueLoss?: number;
  entropyLoss?: number;
  [key: string]: any;
}
