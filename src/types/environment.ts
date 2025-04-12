/**
 * Type definitions for environment interfaces
 */

export interface ObservationSpace {
  type: string;
  shape?: number[];
  low?: number | number[];
  high?: number | number[];
  n?: number;
  spaces?: Record<string, ObservationSpace>;
}

export interface ActionSpace {
  type: string;
  shape?: number[];
  low?: number | number[];
  high?: number | number[];
  n?: number;
  spaces?: Record<string, ActionSpace>;
}

export interface DiscreteActionSpace extends ActionSpace {
  type: 'discrete';
  n: number;
}

export interface ContinuousActionSpace extends ActionSpace {
  type: 'continuous' | 'box';
  shape: number[];
  low: number | number[];
  high: number | number[];
}
