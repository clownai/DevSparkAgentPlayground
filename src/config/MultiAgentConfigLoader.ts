/**
 * Multi-Agent Configuration System
 * 
 * This module extends the YAML configuration system to support multi-agent scenarios.
 * It provides schemas and utilities for configuring multi-agent environments, agents, and experiments.
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { deepMerge } from '../utils/helpers';
import logger from '../utils/logger';

/**
 * Multi-agent environment configuration
 */
export interface MultiAgentEnvironmentConfig {
  // Environment type
  type: string;
  
  // Number of agents (optional, environment may have fixed number)
  numAgents?: number;
  
  // Agent IDs (optional, will be generated if not provided)
  agentIds?: string[];
  
  // Whether the environment supports simultaneous actions
  simultaneousActions?: boolean;
  
  // Maximum steps per episode
  maxStepsPerEpisode?: number;
  
  // Reward structure
  rewardStructure?: {
    // Reward type
    type: 'individual' | 'team' | 'mixed' | 'zero-sum';
    
    // Team definitions for team rewards
    teams?: Record<string, string[]>;
    
    // Weights for mixed rewards
    weights?: {
      individual?: number;
      team?: number;
    };
  };
  
  // Environment-specific configuration
  [key: string]: any;
}

/**
 * Multi-agent experiment configuration
 */
export interface MultiAgentExperimentConfig {
  // Experiment ID
  id: string;
  
  // Experiment type
  type: 'multi-agent';
  
  // Action mode
  actionMode?: 'simultaneous' | 'turn-based';
  
  // Turn order for turn-based action mode
  turnOrder?: string[];
  
  // Agent configurations
  agents: {
    // Agent ID
    id: string;
    
    // Agent type
    type: string;
    
    // Team ID (optional)
    team?: string;
    
    // Agent-specific configuration
    [key: string]: any;
  }[];
  
  // Team configurations
  teams?: {
    // Team ID
    id: string;
    
    // Team name
    name?: string;
    
    // Team-specific configuration
    [key: string]: any;
  }[];
  
  // Environment configuration
  environment: MultiAgentEnvironmentConfig;
  
  // Reward structure (overrides environment reward structure)
  rewardStructure?: {
    type: 'individual' | 'team' | 'mixed' | 'zero-sum';
    teams?: Record<string, string[]>;
    weights?: {
      individual?: number;
      team?: number;
    };
  };
  
  // Maximum steps
  maxSteps: number;
  
  // Maximum episodes
  maxEpisodes: number;
  
  // Evaluation frequency
  evaluationFrequency?: number;
  
  // Evaluation episodes
  evaluationEpisodes?: number;
  
  // Checkpoint frequency
  checkpointFrequency?: number;
  
  // Log frequency
  logFrequency?: number;
  
  // Visualization configuration
  visualization?: {
    enabled: boolean;
    [key: string]: any;
  };
}

/**
 * Multi-agent configuration loader
 */
export class MultiAgentConfigLoader {
  // Base configuration directory
  private configDir: string;
  
  // Logger
  private logger = logger.createChildLogger({ component: 'MultiAgentConfigLoader' });
  
  /**
   * Constructor
   * @param configDir Base configuration directory
   */
  constructor(configDir: string = path.join(process.cwd(), 'config')) {
    this.configDir = configDir;
    this.logger.info(`MultiAgentConfigLoader initialized with config directory: ${configDir}`);
  }
  
  /**
   * Load a multi-agent environment configuration
   * @param name Environment name
   * @returns Environment configuration
   */
  public loadEnvironmentConfig(name: string): MultiAgentEnvironmentConfig {
    try {
      const filePath = path.join(this.configDir, 'environments', `${name}.yaml`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Environment configuration file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = yaml.load(fileContent) as any;
      
      if (!config.environment) {
        throw new Error(`Invalid environment configuration: missing 'environment' section`);
      }
      
      this.logger.debug(`Loaded environment configuration: ${name}`);
      
      return config.environment;
    } catch (error) {
      this.logger.error(`Error loading environment configuration ${name}: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Load a multi-agent agent configuration
   * @param name Agent name
   * @returns Agent configuration
   */
  public loadAgentConfig(name: string): any {
    try {
      const filePath = path.join(this.configDir, 'agents', `${name}.yaml`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Agent configuration file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = yaml.load(fileContent) as any;
      
      if (!config.agent) {
        throw new Error(`Invalid agent configuration: missing 'agent' section`);
      }
      
      this.logger.debug(`Loaded agent configuration: ${name}`);
      
      return config.agent;
    } catch (error) {
      this.logger.error(`Error loading agent configuration ${name}: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Load a multi-agent experiment configuration
   * @param name Experiment name
   * @returns Experiment configuration
   */
  public loadExperimentConfig(name: string): MultiAgentExperimentConfig {
    try {
      const filePath = path.join(this.configDir, 'experiments', `${name}.yaml`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Experiment configuration file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = yaml.load(fileContent) as any;
      
      if (!config.experiment) {
        throw new Error(`Invalid experiment configuration: missing 'experiment' section`);
      }
      
      const experimentConfig = config.experiment as MultiAgentExperimentConfig;
      
      // Validate experiment type
      if (experimentConfig.type !== 'multi-agent') {
        throw new Error(`Invalid experiment type: ${experimentConfig.type}, expected 'multi-agent'`);
      }
      
      // Load and merge agent configurations
      if (experimentConfig.agents) {
        for (const agentConfig of experimentConfig.agents) {
          if (agentConfig.type) {
            try {
              const baseConfig = this.loadAgentConfig(agentConfig.type);
              // Merge base config with agent-specific config, with agent-specific taking precedence
              Object.assign(agentConfig, deepMerge(baseConfig, agentConfig));
            } catch (error) {
              this.logger.warn(`Could not load base agent configuration for ${agentConfig.type}: ${(error as Error).message}`);
            }
          }
        }
      }
      
      // Load and merge environment configuration
      if (experimentConfig.environment && experimentConfig.environment.type) {
        try {
          const baseConfig = this.loadEnvironmentConfig(experimentConfig.environment.type);
          // Merge base config with environment-specific config, with environment-specific taking precedence
          experimentConfig.environment = deepMerge(baseConfig, experimentConfig.environment);
        } catch (error) {
          this.logger.warn(`Could not load base environment configuration for ${experimentConfig.environment.type}: ${(error as Error).message}`);
        }
      }
      
      this.logger.debug(`Loaded experiment configuration: ${name}`);
      
      return experimentConfig;
    } catch (error) {
      this.logger.error(`Error loading experiment configuration ${name}: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Load a multi-agent preset configuration
   * @param name Preset name
   * @returns Preset configuration
   */
  public loadPresetConfig(name: string): any {
    try {
      const filePath = path.join(this.configDir, 'presets', `${name}.yaml`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Preset configuration file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = yaml.load(fileContent) as any;
      
      if (!config.preset) {
        throw new Error(`Invalid preset configuration: missing 'preset' section`);
      }
      
      this.logger.debug(`Loaded preset configuration: ${name}`);
      
      return config.preset;
    } catch (error) {
      this.logger.error(`Error loading preset configuration ${name}: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Resolve a multi-agent experiment configuration with presets
   * @param experimentName Experiment name
   * @param presetNames Preset names to apply
   * @returns Resolved experiment configuration
   */
  public resolveExperimentConfig(experimentName: string, presetNames: string[] = []): MultiAgentExperimentConfig {
    try {
      // Load base experiment configuration
      const experimentConfig = this.loadExperimentConfig(experimentName);
      
      // Apply presets in order
      let resolvedConfig = { ...experimentConfig };
      
      for (const presetName of presetNames) {
        try {
          const presetConfig = this.loadPresetConfig(presetName);
          resolvedConfig = deepMerge(resolvedConfig, presetConfig);
        } catch (error) {
          this.logger.warn(`Could not apply preset ${presetName}: ${(error as Error).message}`);
        }
      }
      
      this.logger.debug(`Resolved experiment configuration: ${experimentName} with presets: ${presetNames.join(', ')}`);
      
      return resolvedConfig;
    } catch (error) {
      this.logger.error(`Error resolving experiment configuration ${experimentName}: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Save a multi-agent experiment configuration
   * @param config Experiment configuration
   * @param name Experiment name
   * @returns True if saved successfully
   */
  public saveExperimentConfig(config: MultiAgentExperimentConfig, name: string): boolean {
    try {
      const filePath = path.join(this.configDir, 'experiments', `${name}.yaml`);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Wrap in experiment object
      const wrappedConfig = {
        experiment: config
      };
      
      // Convert to YAML
      const yamlContent = yaml.dump(wrappedConfig, {
        indent: 2,
        lineWidth: 100,
        noRefs: true
      });
      
      // Write to file
      fs.writeFileSync(filePath, yamlContent, 'utf8');
      
      this.logger.info(`Saved experiment configuration: ${name}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error saving experiment configuration ${name}: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * List available multi-agent environment configurations
   * @returns Array of environment names
   */
  public listEnvironmentConfigs(): string[] {
    try {
      const dir = path.join(this.configDir, 'environments');
      
      if (!fs.existsSync(dir)) {
        return [];
      }
      
      const files = fs.readdirSync(dir);
      const configNames = files
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map(file => path.basename(file, path.extname(file)));
      
      return configNames;
    } catch (error) {
      this.logger.error(`Error listing environment configurations: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * List available multi-agent agent configurations
   * @returns Array of agent names
   */
  public listAgentConfigs(): string[] {
    try {
      const dir = path.join(this.configDir, 'agents');
      
      if (!fs.existsSync(dir)) {
        return [];
      }
      
      const files = fs.readdirSync(dir);
      const configNames = files
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map(file => path.basename(file, path.extname(file)));
      
      return configNames;
    } catch (error) {
      this.logger.error(`Error listing agent configurations: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * List available multi-agent experiment configurations
   * @returns Array of experiment names
   */
  public listExperimentConfigs(): string[] {
    try {
      const dir = path.join(this.configDir, 'experiments');
      
      if (!fs.existsSync(dir)) {
        return [];
      }
      
      const files = fs.readdirSync(dir);
      const configNames = files
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map(file => path.basename(file, path.extname(file)));
      
      return configNames;
    } catch (error) {
      this.logger.error(`Error listing experiment configurations: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * List available multi-agent preset configurations
   * @returns Array of preset names
   */
  public listPresetConfigs(): string[] {
    try {
      const dir = path.join(this.configDir, 'presets');
      
      if (!fs.existsSync(dir)) {
        return [];
      }
      
      const files = fs.readdirSync(dir);
      const configNames = files
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map(file => path.basename(file, path.extname(file)));
      
      return configNames;
    } catch (error) {
      this.logger.error(`Error listing preset configurations: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Validate a multi-agent experiment configuration
   * @param config Experiment configuration
   * @returns Validation result with errors if any
   */
  public validateExperimentConfig(config: MultiAgentExperimentConfig): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!config.id) {
      errors.push('Missing experiment ID');
    }
    
    if (!config.type || config.type !== 'multi-agent') {
      errors.push(`Invalid experiment type: ${config.type}, expected 'multi-agent'`);
    }
    
    if (!config.agents || !Array.isArray(config.agents) || config.agents.length === 0) {
      errors.push('Missing or empty agents array');
    } else {
      // Check agent configurations
      const agentIds = new Set<string>();
      
      for (let i = 0; i < config.agents.length; i++) {
        const agent = config.agents[i];
        
        if (!agent.id) {
          errors.push(`Agent at index ${i} is missing ID`);
        } else if (agentIds.has(agent.id)) {
          errors.push(`Duplicate agent ID: ${agent.id}`);
        } else {
          agentIds.add(agent.id);
        }
        
        if (!agent.type) {
          errors.push(`Agent ${agent.id || i} is missing type`);
        }
      }
      
      // Check team configurations
      if (config.teams) {
        const teamIds = new Set<string>();
        
        for (let i = 0; i < config.teams.length; i++) {
          const team = config.teams[i];
          
          if (!team.id) {
            errors.push(`Team at index ${i} is missing ID`);
          } else if (teamIds.has(team.id)) {
            errors.push(`Duplicate team ID: ${team.id}`);
          } else {
            teamIds.add(team.id);
          }
        }
        
        // Check agent team references
        for (const agent of config.agents) {
          if (agent.team && !teamIds.has(agent.team)) {
            errors.push(`Agent ${agent.id} references unknown team: ${agent.team}`);
          }
        }
      }
    }
    
    // Check environment configuration
    if (!config.environment) {
      errors.push('Missing environment configuration');
    } else if (!config.environment.type) {
      errors.push('Environment is missing type');
    }
    
    // Check action mode
    if (config.actionMode && !['simultaneous', 'turn-based'].includes(config.actionMode)) {
      errors.push(`Invalid action mode: ${config.actionMode}, expected 'simultaneous' or 'turn-based'`);
    }
    
    // Check turn order
    if (config.actionMode === 'turn-based' && config.turnOrder) {
      const agentIds = new Set(config.agents.map(agent => agent.id));
      
      for (const agentId of config.turnOrder) {
        if (!agentIds.has(agentId)) {
          errors.push(`Turn order includes unknown agent ID: ${agentId}`);
        }
      }
    }
    
    // Check reward structure
    if (config.rewardStructure) {
      if (!['individual', 'team', 'mixed', 'zero-sum'].includes(config.rewardStructure.type)) {
        errors.push(`Invalid reward structure type: ${config.rewardStructure.type}`);
      }
      
      if (config.rewardStructure.type === 'team' || config.rewardStructure.type === 'mixed') {
        if (!config.rewardStructure.teams || Object.keys(config.rewardStructure.teams).length === 0) {
          errors.push(`Reward structure of type ${config.rewardStructure.type} requires team definitions`);
        }
      }
      
      if (config.rewardStructure.type === 'mixed') {
        if (!config.rewardStructure.weights) {
          errors.push('Mixed reward structure requires weights');
        } else {
          const { individual, team } = config.rewardStructure.weights;
          
          if (individual === undefined || team === undefined) {
            errors.push('Mixed reward structure weights must include individual and team weights');
          } else if (individual + team !== 1) {
            errors.push(`Mixed reward structure weights must sum to 1, got ${individual + team}`);
          }
        }
      }
    }
    
    // Check numeric parameters
    if (typeof config.maxSteps !== 'number' || config.maxSteps <= 0) {
      errors.push(`Invalid maxSteps: ${config.maxSteps}, must be a positive number`);
    }
    
    if (typeof config.maxEpisodes !== 'number' || config.maxEpisodes <= 0) {
      errors.push(`Invalid maxEpisodes: ${config.maxEpisodes}, must be a positive number`);
    }
    
    if (config.evaluationFrequency !== undefined && (typeof config.evaluationFrequency !== 'number' || config.evaluationFrequency <= 0)) {
      errors.push(`Invalid evaluationFrequency: ${config.evaluationFrequency}, must be a positive number`);
    }
    
    if (config.evaluationEpisodes !== undefined && (typeof config.evaluationEpisodes !== 'number' || config.evaluationEpisodes <= 0)) {
      errors.push(`Invalid evaluationEpisodes: ${config.evaluationEpisodes}, must be a positive number`);
    }
    
    if (config.checkpointFrequency !== undefined && (typeof config.checkpointFrequency !== 'number' || config.checkpointFrequency <= 0)) {
      errors.push(`Invalid checkpointFrequency: ${config.checkpointFrequency}, must be a positive number`);
    }
    
    if (config.logFrequency !== undefined && (typeof config.logFrequency !== 'number' || config.logFrequency <= 0)) {
      errors.push(`Invalid logFrequency: ${config.logFrequency}, must be a positive number`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default MultiAgentConfigLoader;
