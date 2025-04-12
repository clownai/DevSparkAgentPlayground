/**
 * Type definitions for core interfaces
 */

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  createChildLogger(options: any): Logger;
}

export interface VisualizationManager {
  initialize(experimentId: string): boolean;
  registerEnvironment(environment: any): void;
  registerAgent(agent: any, agentId: string): void;
  recordProgress(step: number, episode: number, data: any): void;
  recordEnd(success: boolean, data: any): void;
  cleanup(): void;
}
