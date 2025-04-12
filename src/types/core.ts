/**
 * Type definitions for the DevSparkAgentPlayground core components
 */

/**
 * Configuration interface for the DevSparkAgentPlayground
 */
export interface DevSparkAgentConfig {
  runtime: RuntimeConfig;
  interaction: InteractionConfig;
  evolution: EvolutionConfig;
  evaluation: EvaluationConfig;
  ui: UIConfig;
  marketplace: MarketplaceConfig;
  integration: IntegrationConfig;
  deployment: DeploymentConfig;
  [key: string]: any;
}

/**
 * Runtime configuration interface
 */
export interface RuntimeConfig {
  [key: string]: any;
}

/**
 * Interaction configuration interface
 */
export interface InteractionConfig {
  [key: string]: any;
}

/**
 * Evolution configuration interface
 */
export interface EvolutionConfig {
  [key: string]: any;
}

/**
 * Evaluation configuration interface
 */
export interface EvaluationConfig {
  [key: string]: any;
}

/**
 * UI configuration interface
 */
export interface UIConfig {
  [key: string]: any;
}

/**
 * Marketplace configuration interface
 */
export interface MarketplaceConfig {
  [key: string]: any;
}

/**
 * Integration configuration interface
 */
export interface IntegrationConfig {
  [key: string]: any;
}

/**
 * Deployment configuration interface
 */
export interface DeploymentConfig {
  [key: string]: any;
}

/**
 * Component interface for all system components
 */
export interface Component {
  initialize(): Promise<boolean>;
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
}

/**
 * Components collection interface
 */
export interface ComponentCollection {
  runtime?: Component;
  interaction?: Component;
  evolution?: Component;
  evaluation?: Component;
  ui?: Component;
  marketplace?: Component;
  integration?: Component;
  deployment?: Component;
  [key: string]: Component | undefined;
}

/**
 * Logger interface
 */
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  debug(message: string, meta?: any): void;
  createChildLogger(meta: Record<string, any>): Logger;
}
