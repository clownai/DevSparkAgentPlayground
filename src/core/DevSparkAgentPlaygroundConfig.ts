/**
 * DevSparkAgentPlayground - Core system with configuration support
 * 
 * Updated version of the core system that uses the new configuration system
 */

import * as path from 'path';
import * as fs from 'fs';
import ConfigLoader, { ExperimentConfig } from '../utils/ConfigLoader';
import AgentFactory from '../utils/AgentFactory';
import EnvironmentFactory from '../utils/EnvironmentFactory';
import ExperimentRunner from '../utils/ExperimentRunner';
import logger from '../utils/logger';
import { 
  DevSparkAgentConfig, 
  ComponentCollection, 
  Component,
  Logger
} from '../types/core';

/**
 * DevSparkAgent Playground System
 * 
 * Main system class that initializes and coordinates all components
 * of the DevSparkAgent Playground with configuration support.
 */
class DevSparkAgentPlayground {
  private config: DevSparkAgentConfig;
  private components: ComponentCollection;
  private initialized: boolean;
  private logger: Logger;
  private configLoader: ConfigLoader;

  constructor(options: Partial<DevSparkAgentConfig> = {}) {
    // Load default config and merge with options
    const defaultConfig = require('../config/default');
    this.config = { ...defaultConfig, ...options };
    
    this.components = {};
    this.initialized = false;
    this.logger = this._initializeLogger();
    
    // Initialize configuration loader
    this.configLoader = new ConfigLoader(path.join(process.cwd(), 'config'));
  }

  /**
   * Initialize the playground system
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing DevSparkAgent Playground...');
      
      // Initialize runtime environment
      this.components.runtime = await this._initializeRuntime();
      
      // Initialize interaction framework
      this.components.interaction = await this._initializeInteraction();
      
      // Initialize evolution mechanisms
      this.components.evolution = await this._initializeEvolution();
      
      // Initialize evaluation system
      this.components.evaluation = await this._initializeEvaluation();
      
      // Initialize user interface
      this.components.ui = await this._initializeUI();
      
      // Initialize marketplace
      this.components.marketplace = await this._initializeMarketplace();
      
      // Initialize system integration
      this.components.integration = await this._initializeIntegration();
      
      // Initialize deployment and scaling
      this.components.deployment = await this._initializeDeployment();
      
      this.initialized = true;
      this.logger.info('DevSparkAgent Playground initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Initialization failed: ${(error as Error).message}`, error);
      throw error;
    }
  }

  /**
   * Start the playground system
   * @returns {Promise<boolean>} - Resolves to true if startup is successful
   */
  async start(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      this.logger.info('Starting DevSparkAgent Playground...');
      
      // Start runtime environment
      await this.components.runtime!.start();
      
      // Start interaction framework
      await this.components.interaction!.start();
      
      // Start evolution mechanisms
      await this.components.evolution!.start();
      
      // Start evaluation system
      await this.components.evaluation!.start();
      
      // Start user interface
      await this.components.ui!.start();
      
      // Start marketplace
      await this.components.marketplace!.start();
      
      // Start system integration
      await this.components.integration!.start();
      
      this.logger.info('DevSparkAgent Playground started successfully');
      return true;
    } catch (error) {
      this.logger.error(`Startup failed: ${(error as Error).message}`, error);
      throw error;
    }
  }

  /**
   * Stop the playground system
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop(): Promise<boolean> {
    if (!this.initialized) {
      this.logger.warn('Attempting to stop uninitialized system');
      return false;
    }
    
    try {
      this.logger.info('Stopping DevSparkAgent Playground...');
      
      // Stop in reverse order of initialization
      
      // Stop system integration
      await this.components.integration!.stop();
      
      // Stop marketplace
      await this.components.marketplace!.stop();
      
      // Stop user interface
      await this.components.ui!.stop();
      
      // Stop evaluation system
      await this.components.evaluation!.stop();
      
      // Stop evolution mechanisms
      await this.components.evolution!.stop();
      
      // Stop interaction framework
      await this.components.interaction!.stop();
      
      // Stop runtime environment
      await this.components.runtime!.stop();
      
      this.logger.info('DevSparkAgent Playground stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`Shutdown failed: ${(error as Error).message}`, error);
      throw error;
    }
  }

  /**
   * Run an experiment from configuration
   * @param {string} experimentName - Name of the experiment configuration
   * @returns {Promise<any>} - Experiment results
   */
  async runExperiment(experimentName: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      this.logger.info(`Loading experiment configuration: ${experimentName}`);
      
      // Load experiment configuration
      const experimentConfig = this.configLoader.loadExperiment(experimentName);
      
      // Create experiment runner
      const runner = new ExperimentRunner(experimentConfig);
      
      // Run the experiment
      this.logger.info(`Running experiment: ${experimentName}`);
      const results = await runner.run();
      
      this.logger.info(`Experiment completed: ${experimentName}`);
      return results;
    } catch (error) {
      this.logger.error(`Experiment failed: ${(error as Error).message}`, error);
      throw error;
    }
  }

  /**
   * Load a preset configuration
   * @param {string} presetName - Name of the preset configuration
   * @returns {object} - Preset configuration
   */
  loadPreset(presetName: string): object {
    try {
      this.logger.info(`Loading preset configuration: ${presetName}`);
      return this.configLoader.loadPreset(presetName);
    } catch (error) {
      this.logger.error(`Failed to load preset: ${(error as Error).message}`, error);
      throw error;
    }
  }

  /**
   * Get a component by name
   * @param {string} name - Component name
   * @returns {Component} - Component instance
   */
  getComponent(name: keyof ComponentCollection): Component {
    if (!this.components[name]) {
      throw new Error(`Component '${name}' not found`);
    }
    return this.components[name]!;
  }

  /**
   * Initialize the logging system
   * @private
   * @returns {Logger} - Logger instance
   */
  private _initializeLogger(): Logger {
    // Return the centralized logger with component-specific metadata
    return logger.createChildLogger({ component: 'DevSparkAgentPlayground' });
  }

  /**
   * Initialize the runtime environment
   * @private
   * @returns {Promise<Component>} - Runtime environment instance
   */
  private async _initializeRuntime(): Promise<Component> {
    const RuntimeEnvironment = require('./runtime/RuntimeEnvironment');
    const runtime = new RuntimeEnvironment(this.config.runtime);
    await runtime.initialize();
    return runtime;
  }

  /**
   * Initialize the interaction framework
   * @private
   * @returns {Promise<Component>} - Interaction framework instance
   */
  private async _initializeInteraction(): Promise<Component> {
    const InteractionFramework = require('./interaction/InteractionFramework');
    const interaction = new InteractionFramework(this.config.interaction);
    await interaction.initialize();
    return interaction;
  }

  /**
   * Initialize the evolution mechanisms
   * @private
   * @returns {Promise<Component>} - Evolution mechanisms instance
   */
  private async _initializeEvolution(): Promise<Component> {
    const EvolutionMechanisms = require('./evolution/EvolutionMechanisms');
    const evolution = new EvolutionMechanisms(this.config.evolution);
    await evolution.initialize();
    return evolution;
  }

  /**
   * Initialize the evaluation system
   * @private
   * @returns {Promise<Component>} - Evaluation system instance
   */
  private async _initializeEvaluation(): Promise<Component> {
    const EvaluationSystem = require('./evaluation/EvaluationSystem');
    const evaluation = new EvaluationSystem(this.config.evaluation);
    await evaluation.initialize();
    return evaluation;
  }

  /**
   * Initialize the user interface
   * @private
   * @returns {Promise<Component>} - User interface instance
   */
  private async _initializeUI(): Promise<Component> {
    const UserInterface = require('./ui/UserInterface');
    const ui = new UserInterface(this.config.ui);
    await ui.initialize();
    return ui;
  }

  /**
   * Initialize the marketplace
   * @private
   * @returns {Promise<Component>} - Marketplace instance
   */
  private async _initializeMarketplace(): Promise<Component> {
    const Marketplace = require('./marketplace/Marketplace');
    const marketplace = new Marketplace(this.config.marketplace);
    await marketplace.initialize();
    return marketplace;
  }

  /**
   * Initialize the system integration
   * @private
   * @returns {Promise<Component>} - System integration instance
   */
  private async _initializeIntegration(): Promise<Component> {
    const SystemIntegration = require('./integration/SystemIntegration');
    const integration = new SystemIntegration(this.config.integration);
    await integration.initialize();
    return integration;
  }

  /**
   * Initialize the deployment and scaling
   * @private
   * @returns {Promise<Component>} - Deployment and scaling instance
   */
  private async _initializeDeployment(): Promise<Component> {
    const DeploymentSystem = require('./deployment/DeploymentSystem');
    const deployment = new DeploymentSystem(this.config.deployment);
    await deployment.initialize();
    return deployment;
  }
}

export default DevSparkAgentPlayground;
