/**
 * Configuration loader for DevSparkAgentPlayground
 * 
 * This module provides utilities for loading, validating, and processing
 * YAML configuration files for agents, environments, and experiments.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '../types/core';
import logger from './logger';

// Configuration types
export interface AgentConfig {
  name: string;
  type: string;
  version: string;
  parameters: {
    learning_rate: number;
    gamma: number;
    batch_size: number;
    buffer_size: number;
    [key: string]: any;
  };
  training: {
    max_steps: number;
    max_episodes: number;
    eval_frequency: number;
    save_frequency: number;
  };
  logging: {
    level: string;
    metrics: string[];
    tensorboard: boolean;
  };
  exploration: {
    type: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface EnvironmentConfig {
  name: string;
  type: string;
  version: string;
  parameters: {
    max_steps: number;
    reward_scale: number;
    env_specific?: {
      [key: string]: any;
    };
  };
  observation_space: {
    type: string;
    shape: number[];
    low?: number[];
    high?: number[];
  };
  action_space: {
    type: string;
    shape?: number[];
    n?: number;
    low?: number[];
    high?: number[];
  };
  rendering: {
    enabled: boolean;
    mode: string;
    fps: number;
  };
  [key: string]: any;
}

export interface ExperimentConfig {
  name: string;
  description: string;
  version: string;
  tags: string[];
  agent: {
    name: string;
    overrides?: {
      [key: string]: any;
    };
  };
  environment: {
    name: string;
    overrides?: {
      [key: string]: any;
    };
  };
  parameters: {
    seed: number;
    num_runs: number;
    parallel: boolean;
  };
  metrics: Array<{
    name: string;
    type: string;
  }>;
  visualization: {
    enabled: boolean;
    plots: string[];
  };
  [key: string]: any;
}

export interface PresetConfig {
  name: string;
  description: string;
  version: string;
  agent_defaults: {
    [key: string]: any;
  };
  environment_defaults: {
    [key: string]: any;
  };
  experiment_defaults: {
    [key: string]: any;
  };
  recommended_combinations: Array<{
    name: string;
    agent: string;
    environment: string;
    description: string;
  }>;
  [key: string]: any;
}

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private basePath: string;
  private logger: Logger;
  
  /**
   * Create a new ConfigLoader
   * @param {string} basePath - Base path for configuration files
   */
  constructor(basePath?: string) {
    this.basePath = basePath || path.join(process.cwd(), 'config');
    this.logger = logger.createChildLogger({ component: 'ConfigLoader' });
  }
  
  /**
   * Load an agent configuration
   * @param {string} name - Name of the agent configuration
   * @returns {AgentConfig} - Agent configuration object
   */
  loadAgent(name: string): AgentConfig {
    const configPath = path.join(this.basePath, 'agents', `${name}.yaml`);
    return this.loadYamlFile(configPath) as AgentConfig;
  }
  
  /**
   * Load an environment configuration
   * @param {string} name - Name of the environment configuration
   * @returns {EnvironmentConfig} - Environment configuration object
   */
  loadEnvironment(name: string): EnvironmentConfig {
    const configPath = path.join(this.basePath, 'environments', `${name}.yaml`);
    return this.loadYamlFile(configPath) as EnvironmentConfig;
  }
  
  /**
   * Load an experiment configuration
   * @param {string} name - Name of the experiment configuration
   * @returns {ExperimentConfig} - Experiment configuration object
   */
  loadExperiment(name: string): ExperimentConfig {
    const configPath = path.join(this.basePath, 'experiments', `${name}.yaml`);
    const experimentConfig = this.loadYamlFile(configPath) as ExperimentConfig;
    
    // Load referenced agent and environment configs
    const agentConfig = this.loadAgent(experimentConfig.agent.name);
    const environmentConfig = this.loadEnvironment(experimentConfig.environment.name);
    
    // Apply overrides
    const mergedAgentConfig = this.mergeConfigs(agentConfig, experimentConfig.agent.overrides || {});
    const mergedEnvironmentConfig = this.mergeConfigs(environmentConfig, experimentConfig.environment.overrides || {});
    
    // Attach merged configs to experiment config
    experimentConfig._resolvedAgent = mergedAgentConfig;
    experimentConfig._resolvedEnvironment = mergedEnvironmentConfig;
    
    return experimentConfig;
  }
  
  /**
   * Load a preset configuration
   * @param {string} name - Name of the preset configuration
   * @returns {PresetConfig} - Preset configuration object
   */
  loadPreset(name: string): PresetConfig {
    const configPath = path.join(this.basePath, 'presets', `${name}.yaml`);
    return this.loadYamlFile(configPath) as PresetConfig;
  }
  
  /**
   * Load a YAML file
   * @param {string} filePath - Path to the YAML file
   * @returns {object} - Parsed YAML object
   * @private
   */
  private loadYamlFile(filePath: string): object {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedConfig = yaml.load(fileContent) as object;
      
      if (!parsedConfig) {
        throw new Error(`Empty or invalid YAML file: ${filePath}`);
      }
      
      this.logger.debug(`Loaded configuration from ${filePath}`);
      return parsedConfig;
    } catch (error) {
      this.logger.error(`Failed to load configuration from ${filePath}`, error);
      throw new Error(`Failed to load configuration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Merge configuration objects
   * @param {object} baseConfig - Base configuration object
   * @param {object} overrides - Override values
   * @returns {object} - Merged configuration object
   * @private
   */
  private mergeConfigs(baseConfig: object, overrides: object): object {
    const merged = { ...baseConfig };
    
    // Helper function for deep merge
    const deepMerge = (target: any, source: any) => {
      for (const key in source) {
        if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    
    deepMerge(merged, overrides);
    return merged;
  }
  
  /**
   * Validate a configuration against a schema
   * @param {object} config - Configuration object to validate
   * @param {string} schemaType - Type of schema to validate against
   * @returns {boolean} - Validation result
   * @private
   */
  private validateConfig(config: object, schemaType: string): boolean {
    // TODO: Implement schema validation using JSON Schema or similar
    // For now, we'll just do basic validation
    if (!config) {
      return false;
    }
    
    // Basic validation based on config type
    switch (schemaType) {
      case 'agent':
        return this.validateAgentConfig(config as AgentConfig);
      case 'environment':
        return this.validateEnvironmentConfig(config as EnvironmentConfig);
      case 'experiment':
        return this.validateExperimentConfig(config as ExperimentConfig);
      case 'preset':
        return this.validatePresetConfig(config as PresetConfig);
      default:
        return true;
    }
  }
  
  /**
   * Validate agent configuration
   * @param {AgentConfig} config - Agent configuration to validate
   * @returns {boolean} - Validation result
   * @private
   */
  private validateAgentConfig(config: AgentConfig): boolean {
    return !!(
      config.name &&
      config.type &&
      config.parameters &&
      typeof config.parameters.learning_rate === 'number' &&
      typeof config.parameters.gamma === 'number'
    );
  }
  
  /**
   * Validate environment configuration
   * @param {EnvironmentConfig} config - Environment configuration to validate
   * @returns {boolean} - Validation result
   * @private
   */
  private validateEnvironmentConfig(config: EnvironmentConfig): boolean {
    return !!(
      config.name &&
      config.type &&
      config.observation_space &&
      config.action_space
    );
  }
  
  /**
   * Validate experiment configuration
   * @param {ExperimentConfig} config - Experiment configuration to validate
   * @returns {boolean} - Validation result
   * @private
   */
  private validateExperimentConfig(config: ExperimentConfig): boolean {
    return !!(
      config.name &&
      config.agent &&
      config.agent.name &&
      config.environment &&
      config.environment.name
    );
  }
  
  /**
   * Validate preset configuration
   * @param {PresetConfig} config - Preset configuration to validate
   * @returns {boolean} - Validation result
   * @private
   */
  private validatePresetConfig(config: PresetConfig): boolean {
    return !!(
      config.name &&
      config.description &&
      config.agent_defaults &&
      config.environment_defaults
    );
  }
}

export default ConfigLoader;
