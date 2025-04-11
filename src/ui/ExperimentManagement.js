/**
 * ExperimentManagement.js
 * Implementation of experiment management for agent testing and evaluation
 */

class ExperimentManagement {
  /**
   * Create a new ExperimentManagement instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxExperiments: 100,
      maxRunsPerExperiment: 50,
      autoSaveResults: true,
      resultsDirectory: './results',
      defaultTimeout: 3600000, // 1 hour
      ...options
    };
    
    this.experiments = new Map();
    this.runs = new Map();
    this.configurations = new Map();
    this.templates = new Map();
    
    this.eventListeners = new Map();
    this.activeExperiments = new Set();
    
    this.logger = options.logger || console;
    
    // Initialize default templates
    this.initializeDefaultTemplates();
  }
  
  /**
   * Initialize default experiment templates
   */
  initializeDefaultTemplates() {
    // Register basic template
    this.registerTemplate('basic', {
      name: 'Basic Experiment',
      description: 'Simple experiment with a single agent and environment',
      parameters: {
        agentType: {
          type: 'string',
          description: 'Type of agent to use',
          default: 'default'
        },
        environmentType: {
          type: 'string',
          description: 'Type of environment to use',
          default: 'default'
        },
        episodes: {
          type: 'number',
          description: 'Number of episodes to run',
          default: 100,
          min: 1,
          max: 10000
        },
        maxStepsPerEpisode: {
          type: 'number',
          description: 'Maximum steps per episode',
          default: 1000,
          min: 1,
          max: 100000
        }
      },
      setup: this.setupBasicExperiment.bind(this),
      run: this.runBasicExperiment.bind(this),
      analyze: this.analyzeBasicExperiment.bind(this)
    });
    
    // Register comparison template
    this.registerTemplate('comparison', {
      name: 'Agent Comparison',
      description: 'Compare multiple agents in the same environment',
      parameters: {
        agentTypes: {
          type: 'array',
          description: 'Types of agents to compare',
          default: ['default'],
          items: {
            type: 'string'
          }
        },
        environmentType: {
          type: 'string',
          description: 'Type of environment to use',
          default: 'default'
        },
        episodes: {
          type: 'number',
          description: 'Number of episodes to run',
          default: 100,
          min: 1,
          max: 10000
        },
        maxStepsPerEpisode: {
          type: 'number',
          description: 'Maximum steps per episode',
          default: 1000,
          min: 1,
          max: 100000
        },
        metrics: {
          type: 'array',
          description: 'Metrics to compare',
          default: ['reward', 'steps'],
          items: {
            type: 'string'
          }
        }
      },
      setup: this.setupComparisonExperiment.bind(this),
      run: this.runComparisonExperiment.bind(this),
      analyze: this.analyzeComparisonExperiment.bind(this)
    });
    
    // Register hyperparameter optimization template
    this.registerTemplate('hyperparameter-optimization', {
      name: 'Hyperparameter Optimization',
      description: 'Optimize agent hyperparameters',
      parameters: {
        agentType: {
          type: 'string',
          description: 'Type of agent to optimize',
          default: 'default'
        },
        environmentType: {
          type: 'string',
          description: 'Type of environment to use',
          default: 'default'
        },
        hyperparameters: {
          type: 'object',
          description: 'Hyperparameters to optimize',
          default: {
            learningRate: {
              type: 'number',
              min: 0.001,
              max: 0.1,
              values: [0.001, 0.01, 0.1]
            },
            discountFactor: {
              type: 'number',
              min: 0.9,
              max: 0.99,
              values: [0.9, 0.95, 0.99]
            }
          }
        },
        episodes: {
          type: 'number',
          description: 'Number of episodes per configuration',
          default: 100,
          min: 1,
          max: 10000
        },
        optimizationMetric: {
          type: 'string',
          description: 'Metric to optimize',
          default: 'reward'
        },
        optimizationGoal: {
          type: 'string',
          description: 'Optimization goal',
          default: 'maximize',
          enum: ['maximize', 'minimize']
        }
      },
      setup: this.setupHyperparameterOptimizationExperiment.bind(this),
      run: this.runHyperparameterOptimizationExperiment.bind(this),
      analyze: this.analyzeHyperparameterOptimizationExperiment.bind(this)
    });
    
    // Register curriculum learning template
    this.registerTemplate('curriculum-learning', {
      name: 'Curriculum Learning',
      description: 'Train agent with progressive difficulty',
      parameters: {
        agentType: {
          type: 'string',
          description: 'Type of agent to train',
          default: 'default'
        },
        environmentTypes: {
          type: 'array',
          description: 'Sequence of environments with increasing difficulty',
          default: ['easy', 'medium', 'hard'],
          items: {
            type: 'string'
          }
        },
        episodesPerLevel: {
          type: 'number',
          description: 'Number of episodes per difficulty level',
          default: 100,
          min: 1,
          max: 10000
        },
        advancementThreshold: {
          type: 'number',
          description: 'Performance threshold to advance to next level',
          default: 0.8,
          min: 0,
          max: 1
        },
        maxStepsPerEpisode: {
          type: 'number',
          description: 'Maximum steps per episode',
          default: 1000,
          min: 1,
          max: 100000
        }
      },
      setup: this.setupCurriculumLearningExperiment.bind(this),
      run: this.runCurriculumLearningExperiment.bind(this),
      analyze: this.analyzeCurriculumLearningExperiment.bind(this)
    });
  }
  
  /**
   * Register a new experiment template
   * @param {string} id - Template ID
   * @param {object} definition - Template definition
   * @returns {boolean} Registration success
   */
  registerTemplate(id, definition) {
    if (this.templates.has(id)) {
      this.logger.warn(`Template ${id} already exists, overwriting`);
    }
    
    this.templates.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      parameters: definition.parameters || {},
      setup: definition.setup || (() => ({})),
      run: definition.run || (() => ({})),
      analyze: definition.analyze || (() => ({})),
      metadata: definition.metadata || {}
    });
    
    return true;
  }
  
  /**
   * Get experiment template
   * @param {string} id - Template ID
   * @returns {object|null} Template definition
   */
  getTemplate(id) {
    return this.templates.get(id) || null;
  }
  
  /**
   * Get all experiment templates
   * @returns {Array<object>} Template definitions
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }
  
  /**
   * Create a new experiment
   * @param {string} id - Experiment ID
   * @param {object} definition - Experiment definition
   * @returns {object} Created experiment
   */
  createExperiment(id, definition) {
    if (this.experiments.has(id)) {
      throw new Error(`Experiment ${id} already exists`);
    }
    
    if (this.experiments.size >= this.options.maxExperiments) {
      throw new Error(`Maximum number of experiments reached (${this.options.maxExperiments})`);
    }
    
    // Validate template
    const templateId = definition.template;
    if (!this.templates.has(templateId)) {
      throw new Error(`Unknown template: ${templateId}`);
    }
    
    const template = this.templates.get(templateId);
    
    // Create experiment
    const experiment = {
      id,
      name: definition.name || id,
      description: definition.description || '',
      template: templateId,
      parameters: definition.parameters || {},
      status: 'created',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      results: null,
      metadata: definition.metadata || {}
    };
    
    this.experiments.set(id, experiment);
    
    this.emit('experimentCreated', { experimentId: id });
    
    return experiment;
  }
  
  /**
   * Get experiment
   * @param {string} id - Experiment ID
   * @returns {object|null} Experiment definition
   */
  getExperiment(id) {
    return this.experiments.get(id) || null;
  }
  
  /**
   * Get all experiments
   * @param {object} filters - Filters to apply
   * @returns {Array<object>} Experiment definitions
   */
  getAllExperiments(filters = {}) {
    let experiments = Array.from(this.experiments.values());
    
    // Apply filters
    if (filters.status) {
      experiments = experiments.filter(e => e.status === filters.status);
    }
    
    if (filters.template) {
      experiments = experiments.filter(e => e.template === filters.template);
    }
    
    if (filters.startDate) {
      experiments = experiments.filter(e => e.createdAt >= filters.startDate);
    }
    
    if (filters.endDate) {
      experiments = experiments.filter(e => e.createdAt <= filters.endDate);
    }
    
    return experiments;
  }
  
  /**
   * Update experiment
   * @param {string} id - Experiment ID
   * @param {object} updates - Updates to apply
   * @returns {object} Updated experiment
   */
  updateExperiment(id, updates) {
    const experiment = this.getExperiment(id);
    
    if (!experiment) {
      throw new Error(`Unknown experiment: ${id}`);
    }
    
    // Apply updates
    Object.assign(experiment, updates);
    
    this.emit('experimentUpdated', { experimentId: id, updates });
    
    return experiment;
  }
  
  /**
   * Delete experiment
   * @param {string} id - Experiment ID
   * @returns {boolean} Deletion success
   */
  deleteExperiment(id) {
    const experiment = this.getExperiment(id);
    
    if (!experiment) {
      return false;
    }
    
    // Check if experiment is running
    if (experiment.status === 'running') {
      throw new Error(`Cannot delete running experiment: ${id}`);
    }
    
    // Delete experiment
    this.experiments.delete(id);
    
    // Delete associated runs
    const runIds = Array.from(this.runs.keys())
      .filter(runId => runId.startsWith(`${id}:`));
      
    for (const runId of runIds) {
      this.runs.delete(runId);
    }
    
    this.emit('experimentDeleted', { experimentId: id });
    
    return true;
  }
  
  /**
   * Start experiment
   * @param {string} id - Experiment ID
   * @param {object} options - Start options
   * @returns {Promise<object>} Experiment result
   */
  async startExperiment(id, options = {}) {
    const experiment = this.getExperiment(id);
    
    if (!experiment) {
      throw new Error(`Unknown experiment: ${id}`);
    }
    
    if (experiment.status === 'running') {
      throw new Error(`Experiment ${id} is already running`);
    }
    
    if (this.activeExperiments.size >= this.options.maxConcurrentExperiments) {
      throw new Error(`Maximum number of concurrent experiments reached (${this.options.maxConcurrentExperiments})`);
    }
    
    // Update experiment status
    this.updateExperiment(id, {
      status: 'running',
      startedAt: Date.now(),
      progress: 0,
      results: null
    });
    
    this.activeExperiments.add(id);
    
    try {
      // Get template
      const template = this.templates.get(experiment.template);
      
      // Setup experiment
      const context = await template.setup({
        experiment,
        options
      });
      
      // Run experiment
      const result = await template.run({
        experiment,
        context,
        options,
        onProgress: (progress) => {
          this.updateExperiment(id, { progress });
        }
      });
      
      // Analyze results
      const analysis = await template.analyze({
        experiment,
        context,
        result,
        options
      });
      
      // Update experiment status
      this.updateExperiment(id, {
        status: 'completed',
        completedAt: Date.now(),
        progress: 1,
        results: {
          ...result,
          analysis
        }
      });
      
      // Save results if enabled
      if (this.options.autoSaveResults) {
        await this.saveExperimentResults(id);
      }
      
      this.activeExperiments.delete(id);
      
      this.emit('experimentCompleted', { experimentId: id, results: result });
      
      return result;
    } catch (error) {
      // Update experiment status
      this.updateExperiment(id, {
        status: 'failed',
        completedAt: Date.now(),
        error: error.message
      });
      
      this.activeExperiments.delete(id);
      
      this.emit('experimentFailed', { experimentId: id, error: error.message });
      
      throw error;
    }
  }
  
  /**
   * Stop experiment
   * @param {string} id - Experiment ID
   * @returns {boolean} Stop success
   */
  stopExperiment(id) {
    const experiment = this.getExperiment(id);
    
    if (!experiment) {
      return false;
    }
    
    if (experiment.status !== 'running') {
      return false;
    }
    
    // Update experiment status
    this.updateExperiment(id, {
      status: 'stopped',
      completedAt: Date.now()
    });
    
    this.activeExperiments.delete(id);
    
    this.emit('experimentStopped', { experimentId: id });
    
    return true;
  }
  
  /**
   * Create experiment run
   * @param {string} experimentId - Experiment ID
   * @param {string} runId - Run ID
   * @param {object} definition - Run definition
   * @returns {object} Created run
   */
  createRun(experimentId, runId, definition) {
    const experiment = this.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Unknown experiment: ${experimentId}`);
    }
    
    const fullRunId = `${experimentId}:${runId}`;
    
    if (this.runs.has(fullRunId)) {
      throw new Error(`Run ${fullRunId} already exists`);
    }
    
    // Count existing runs for this experiment
    const existingRuns = Array.from(this.runs.keys())
      .filter(id => id.startsWith(`${experimentId}:`));
      
    if (existingRuns.length >= this.options.maxRunsPerExperiment) {
      throw new Error(`Maximum number of runs reached for experiment ${experimentId} (${this.options.maxRunsPerExperiment})`);
    }
    
    // Create run
    const run = {
      id: fullRunId,
      experimentId,
      runId,
      parameters: definition.parameters || {},
      status: 'created',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      results: null,
      metadata: definition.metadata || {}
    };
    
    this.runs.set(fullRunId, run);
    
    this.emit('runCreated', { experimentId, runId });
    
    return run;
  }
  
  /**
   * Get run
   * @param {string} experimentId - Experiment ID
   * @param {string} runId - Run ID
   * @returns {object|null} Run definition
   */
  getRun(experimentId, runId) {
    const fullRunId = `${experimentId}:${runId}`;
    return this.runs.get(fullRunId) || null;
  }
  
  /**
   * Get all runs for an experiment
   * @param {string} experimentId - Experiment ID
   * @returns {Array<object>} Run definitions
   */
  getExperimentRuns(experimentId) {
    return Array.from(this.runs.values())
      .filter(run => run.experimentId === experimentId);
  }
  
  /**
   * Update run
   * @param {string} experimentId - Experiment ID
   * @param {string} runId - Run ID
   * @param {object} updates - Updates to apply
   * @returns {object} Updated run
   */
  updateRun(experimentId, runId, updates) {
    const fullRunId = `${experimentId}:${runId}`;
    const run = this.runs.get(fullRunId);
    
    if (!run) {
      throw new Error(`Unknown run: ${fullRunId}`);
    }
    
    // Apply updates
    Object.assign(run, updates);
    
    this.emit('runUpdated', { experimentId, runId, updates });
    
    return run;
  }
  
  /**
   * Start run
   * @param {string} experimentId - Experiment ID
   * @param {string} runId - Run ID
   * @param {object} options - Start options
   * @returns {Promise<object>} Run result
   */
  async startRun(experimentId, runId, options = {}) {
    const fullRunId = `${experimentId}:${runId}`;
    const run = this.runs.get(fullRunId);
    
    if (!run) {
      throw new Error(`Unknown run: ${fullRunId}`);
    }
    
    if (run.status === 'running') {
      throw new Error(`Run ${fullRunId} is already running`);
    }
    
    // Update run status
    this.updateRun(experimentId, runId, {
      status: 'running',
      startedAt: Date.now(),
      results: null
    });
    
    try {
      // Execute run
      const result = await options.executor({
        run,
        parameters: run.parameters,
        timeout: options.timeout || this.options.defaultTimeout
      });
      
      // Update run status
      this.updateRun(experimentId, runId, {
        status: 'completed',
        completedAt: Date.now(),
        results: result
      });
      
      this.emit('runCompleted', { experimentId, runId, results: result });
      
      return result;
    } catch (error) {
      // Update run status
      this.updateRun(experimentId, runId, {
        status: 'failed',
        completedAt: Date.now(),
        error: error.message
      });
      
      this.emit('runFailed', { experimentId, runId, error: error.message });
      
      throw error;
    }
  }
  
  /**
   * Compare experiment results
   * @param {Array<string>} experimentIds - Experiment IDs to compare
   * @param {object} options - Comparison options
   * @returns {object} Comparison result
   */
  compareExperiments(experimentIds, options = {}) {
    const experiments = experimentIds
      .map(id => this.getExperiment(id))
      .filter(experiment => experiment !== null && experiment.results !== null);
    
    if (experiments.length === 0) {
      return {
        experiments: [],
        metrics: {},
        summary: 'No valid experiments to compare'
      };
    }
    
    // Extract metrics to compare
    const metrics = options.metrics || [];
    const metricResults = {};
    
    for (const metric of metrics) {
      metricResults[metric] = experiments.map(experiment => {
        const value = experiment.results?.metrics?.[metric];
        
        return {
          experimentId: experiment.id,
          name: experiment.name,
          value: value !== undefined ? value : null
        };
      }).filter(result => result.value !== null);
      
      // Sort by value
      metricResults[metric].sort((a, b) => {
        const order = options.sortOrder === 'asc' ? 1 : -1;
        return (a.value - b.value) * order;
      });
    }
    
    return {
      experiments: experiments.map(experiment => ({
        id: experiment.id,
        name: experiment.name,
        template: experiment.template,
        parameters: experiment.parameters,
        createdAt: experiment.createdAt,
        completedAt: experiment.completedAt
      })),
      metrics: metricResults,
      summary: this.generateComparisonSummary(experiments, metricResults)
    };
  }
  
  /**
   * Generate comparison summary
   * @param {Array<object>} experiments - Experiments to compare
   * @param {object} metricResults - Metric results
   * @returns {string} Comparison summary
   */
  generateComparisonSummary(experiments, metricResults) {
    if (experiments.length === 0) {
      return 'No experiments to compare';
    }
    
    if (experiments.length === 1) {
      return `Single experiment: ${experiments[0].name}`;
    }
    
    const metricNames = Object.keys(metricResults);
    
    if (metricNames.length === 0) {
      return `Comparing ${experiments.length} experiments, but no metrics specified`;
    }
    
    const summaryParts = [];
    
    for (const metric of metricNames) {
      const results = metricResults[metric];
      
      if (results.length === 0) {
        continue;
      }
      
      const best = results[0];
      const worst = results[results.length - 1];
      
      summaryParts.push(`${metric}: Best is ${best.name} (${best.value}), worst is ${worst.name} (${worst.value})`);
    }
    
    return summaryParts.join('. ');
  }
  
  /**
   * Save experiment results
   * @param {string} id - Experiment ID
   * @returns {Promise<string>} Saved file path
   */
  async saveExperimentResults(id) {
    const experiment = this.getExperiment(id);
    
    if (!experiment) {
      throw new Error(`Unknown experiment: ${id}`);
    }
    
    if (experiment.results === null) {
      throw new Error(`Experiment ${id} has no results`);
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Create directory if it doesn't exist
      const resultsDir = path.join(this.options.resultsDirectory, id);
      
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      // Save experiment definition
      const definitionPath = path.join(resultsDir, 'experiment.json');
      fs.writeFileSync(definitionPath, JSON.stringify(experiment, null, 2));
      
      // Save results
      const resultsPath = path.join(resultsDir, 'results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(experiment.results, null, 2));
      
      // Save runs
      const runs = this.getExperimentRuns(id);
      
      if (runs.length > 0) {
        const runsPath = path.join(resultsDir, 'runs.json');
        fs.writeFileSync(runsPath, JSON.stringify(runs, null, 2));
      }
      
      return resultsDir;
    } catch (error) {
      this.logger.error(`Failed to save experiment results: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Load experiment results
   * @param {string} id - Experiment ID
   * @param {string} directory - Results directory
   * @returns {Promise<object>} Loaded experiment
   */
  async loadExperimentResults(id, directory) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const resultsDir = directory || path.join(this.options.resultsDirectory, id);
      
      // Load experiment definition
      const definitionPath = path.join(resultsDir, 'experiment.json');
      
      if (!fs.existsSync(definitionPath)) {
        throw new Error(`Experiment definition not found: ${definitionPath}`);
      }
      
      const experiment = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
      
      // Load results
      const resultsPath = path.join(resultsDir, 'results.json');
      
      if (fs.existsSync(resultsPath)) {
        experiment.results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      }
      
      // Load runs
      const runsPath = path.join(resultsDir, 'runs.json');
      
      if (fs.existsSync(runsPath)) {
        const runs = JSON.parse(fs.readFileSync(runsPath, 'utf8'));
        
        for (const run of runs) {
          this.runs.set(run.id, run);
        }
      }
      
      // Register experiment
      this.experiments.set(id, experiment);
      
      return experiment;
    } catch (error) {
      this.logger.error(`Failed to load experiment results: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Export experiment
   * @param {string} id - Experiment ID
   * @returns {object} Exported experiment
   */
  exportExperiment(id) {
    const experiment = this.getExperiment(id);
    
    if (!experiment) {
      throw new Error(`Unknown experiment: ${id}`);
    }
    
    const runs = this.getExperimentRuns(id);
    
    return {
      experiment,
      runs,
      exportedAt: Date.now()
    };
  }
  
  /**
   * Import experiment
   * @param {object} data - Experiment data
   * @param {object} options - Import options
   * @returns {string} Imported experiment ID
   */
  importExperiment(data, options = {}) {
    if (!data.experiment) {
      throw new Error('Invalid experiment data');
    }
    
    const experiment = data.experiment;
    const runs = data.runs || [];
    
    // Generate new ID if needed
    const id = options.newId || experiment.id;
    
    if (this.experiments.has(id) && !options.overwrite) {
      throw new Error(`Experiment ${id} already exists`);
    }
    
    // Import experiment
    this.experiments.set(id, {
      ...experiment,
      id
    });
    
    // Import runs
    for (const run of runs) {
      const runId = run.runId;
      const fullRunId = `${id}:${runId}`;
      
      this.runs.set(fullRunId, {
        ...run,
        id: fullRunId,
        experimentId: id
      });
    }
    
    this.emit('experimentImported', { experimentId: id });
    
    return id;
  }
  
  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} listener - Event listener
   * @returns {boolean} Success
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(listener);
    return true;
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} listener - Event listener
   * @returns {boolean} Success
   */
  off(event, listener) {
    if (!this.eventListeners.has(event)) {
      return false;
    }
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(listener);
    
    if (index === -1) {
      return false;
    }
    
    listeners.splice(index, 1);
    return true;
  }
  
  /**
   * Emit event
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) {
      return;
    }
    
    const listeners = this.eventListeners.get(event);
    
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        this.logger.error(`Error in event listener for ${event}: ${error.message}`, error);
      }
    }
  }
  
  // Template implementation methods
  
  /**
   * Setup basic experiment
   * @param {object} params - Setup parameters
   * @returns {Promise<object>} Setup context
   */
  async setupBasicExperiment(params) {
    const { experiment, options } = params;
    
    // Create agent and environment
    const agentType = experiment.parameters.agentType;
    const environmentType = experiment.parameters.environmentType;
    
    // This would typically create actual agent and environment instances
    // For this implementation, we'll just return configuration
    
    return {
      agent: {
        type: agentType,
        config: {}
      },
      environment: {
        type: environmentType,
        config: {}
      },
      episodes: experiment.parameters.episodes,
      maxStepsPerEpisode: experiment.parameters.maxStepsPerEpisode
    };
  }
  
  /**
   * Run basic experiment
   * @param {object} params - Run parameters
   * @returns {Promise<object>} Run result
   */
  async runBasicExperiment(params) {
    const { experiment, context, options, onProgress } = params;
    
    const episodes = context.episodes;
    const maxSteps = context.maxStepsPerEpisode;
    
    // Simulate experiment execution
    const results = {
      episodes: [],
      metrics: {
        totalReward: 0,
        averageReward: 0,
        totalSteps: 0,
        averageSteps: 0,
        successRate: 0
      }
    };
    
    let totalReward = 0;
    let totalSteps = 0;
    let successCount = 0;
    
    for (let i = 0; i < episodes; i++) {
      // Simulate episode
      const episodeSteps = Math.floor(Math.random() * maxSteps) + 1;
      const episodeReward = Math.random() * 100 - 20; // Random reward between -20 and 80
      const success = episodeReward > 50; // Success if reward > 50
      
      // Record episode results
      results.episodes.push({
        episode: i,
        steps: episodeSteps,
        reward: episodeReward,
        success
      });
      
      // Update totals
      totalReward += episodeReward;
      totalSteps += episodeSteps;
      if (success) successCount++;
      
      // Report progress
      if (onProgress) {
        onProgress((i + 1) / episodes);
      }
      
      // Simulate computation time
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Calculate aggregate metrics
    results.metrics.totalReward = totalReward;
    results.metrics.averageReward = totalReward / episodes;
    results.metrics.totalSteps = totalSteps;
    results.metrics.averageSteps = totalSteps / episodes;
    results.metrics.successRate = successCount / episodes;
    
    return results;
  }
  
  /**
   * Analyze basic experiment
   * @param {object} params - Analysis parameters
   * @returns {Promise<object>} Analysis result
   */
  async analyzeBasicExperiment(params) {
    const { experiment, context, result, options } = params;
    
    // Calculate learning curve
    const episodes = result.episodes;
    const windowSize = Math.min(10, Math.floor(episodes.length / 10));
    
    const learningCurve = [];
    
    for (let i = 0; i < episodes.length; i += windowSize) {
      const window = episodes.slice(i, i + windowSize);
      
      const averageReward = window.reduce((sum, ep) => sum + ep.reward, 0) / window.length;
      const averageSteps = window.reduce((sum, ep) => sum + ep.steps, 0) / window.length;
      const successRate = window.filter(ep => ep.success).length / window.length;
      
      learningCurve.push({
        episode: i,
        averageReward,
        averageSteps,
        successRate
      });
    }
    
    // Calculate final performance
    const finalWindow = episodes.slice(-windowSize);
    
    const finalPerformance = {
      averageReward: finalWindow.reduce((sum, ep) => sum + ep.reward, 0) / finalWindow.length,
      averageSteps: finalWindow.reduce((sum, ep) => sum + ep.steps, 0) / finalWindow.length,
      successRate: finalWindow.filter(ep => ep.success).length / finalWindow.length
    };
    
    return {
      learningCurve,
      finalPerformance,
      summary: `Agent achieved ${(finalPerformance.successRate * 100).toFixed(1)}% success rate with average reward of ${finalPerformance.averageReward.toFixed(2)}`
    };
  }
  
  /**
   * Setup comparison experiment
   * @param {object} params - Setup parameters
   * @returns {Promise<object>} Setup context
   */
  async setupComparisonExperiment(params) {
    const { experiment, options } = params;
    
    // Create agents and environment
    const agentTypes = experiment.parameters.agentTypes;
    const environmentType = experiment.parameters.environmentType;
    
    // This would typically create actual agent and environment instances
    // For this implementation, we'll just return configuration
    
    const agents = agentTypes.map(type => ({
      type,
      config: {}
    }));
    
    return {
      agents,
      environment: {
        type: environmentType,
        config: {}
      },
      episodes: experiment.parameters.episodes,
      maxStepsPerEpisode: experiment.parameters.maxStepsPerEpisode,
      metrics: experiment.parameters.metrics
    };
  }
  
  /**
   * Run comparison experiment
   * @param {object} params - Run parameters
   * @returns {Promise<object>} Run result
   */
  async runComparisonExperiment(params) {
    const { experiment, context, options, onProgress } = params;
    
    const agents = context.agents;
    const episodes = context.episodes;
    const maxSteps = context.maxStepsPerEpisode;
    
    // Simulate experiment execution
    const results = {
      agents: {},
      comparison: {}
    };
    
    // Run each agent
    for (let a = 0; a < agents.length; a++) {
      const agent = agents[a];
      
      const agentResults = {
        episodes: [],
        metrics: {
          totalReward: 0,
          averageReward: 0,
          totalSteps: 0,
          averageSteps: 0,
          successRate: 0
        }
      };
      
      let totalReward = 0;
      let totalSteps = 0;
      let successCount = 0;
      
      for (let i = 0; i < episodes; i++) {
        // Simulate episode with some agent-specific bias
        const agentBias = agent.type.includes('advanced') ? 20 : 0;
        const episodeSteps = Math.floor(Math.random() * maxSteps) + 1;
        const episodeReward = Math.random() * 100 - 20 + agentBias; // Random reward with bias
        const success = episodeReward > 50; // Success if reward > 50
        
        // Record episode results
        agentResults.episodes.push({
          episode: i,
          steps: episodeSteps,
          reward: episodeReward,
          success
        });
        
        // Update totals
        totalReward += episodeReward;
        totalSteps += episodeSteps;
        if (success) successCount++;
        
        // Report progress
        if (onProgress) {
          onProgress((a * episodes + i + 1) / (agents.length * episodes));
        }
        
        // Simulate computation time
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      // Calculate aggregate metrics
      agentResults.metrics.totalReward = totalReward;
      agentResults.metrics.averageReward = totalReward / episodes;
      agentResults.metrics.totalSteps = totalSteps;
      agentResults.metrics.averageSteps = totalSteps / episodes;
      agentResults.metrics.successRate = successCount / episodes;
      
      // Store agent results
      results.agents[agent.type] = agentResults;
    }
    
    // Compare agents
    const comparisonMetrics = context.metrics || ['reward', 'steps', 'successRate'];
    
    for (const metric of comparisonMetrics) {
      results.comparison[metric] = Object.entries(results.agents).map(([agentType, agentResults]) => {
        let value;
        
        switch (metric) {
          case 'reward':
            value = agentResults.metrics.averageReward;
            break;
          case 'steps':
            value = agentResults.metrics.averageSteps;
            break;
          case 'successRate':
            value = agentResults.metrics.successRate;
            break;
          default:
            value = 0;
        }
        
        return {
          agent: agentType,
          value
        };
      }).sort((a, b) => {
        // Sort by value (higher is better for reward and successRate, lower is better for steps)
        const order = metric === 'steps' ? 1 : -1;
        return (a.value - b.value) * order;
      });
    }
    
    return results;
  }
  
  /**
   * Analyze comparison experiment
   * @param {object} params - Analysis parameters
   * @returns {Promise<object>} Analysis result
   */
  async analyzeComparisonExperiment(params) {
    const { experiment, context, result, options } = params;
    
    const agents = context.agents;
    const comparisonMetrics = context.metrics || ['reward', 'steps', 'successRate'];
    
    // Calculate learning curves for each agent
    const learningCurves = {};
    const windowSize = Math.min(10, Math.floor(context.episodes / 10));
    
    for (const agent of agents) {
      const agentType = agent.type;
      const episodes = result.agents[agentType].episodes;
      
      const curve = [];
      
      for (let i = 0; i < episodes.length; i += windowSize) {
        const window = episodes.slice(i, i + windowSize);
        
        const averageReward = window.reduce((sum, ep) => sum + ep.reward, 0) / window.length;
        const averageSteps = window.reduce((sum, ep) => sum + ep.steps, 0) / window.length;
        const successRate = window.filter(ep => ep.success).length / window.length;
        
        curve.push({
          episode: i,
          averageReward,
          averageSteps,
          successRate
        });
      }
      
      learningCurves[agentType] = curve;
    }
    
    // Generate summary
    const summaryParts = [];
    
    for (const metric of comparisonMetrics) {
      const comparison = result.comparison[metric];
      
      if (comparison && comparison.length > 0) {
        const best = comparison[0];
        const worst = comparison[comparison.length - 1];
        
        const metricName = metric === 'successRate' ? 'success rate' : metric;
        
        summaryParts.push(`${metricName}: Best is ${best.agent} (${best.value.toFixed(2)}), worst is ${worst.agent} (${worst.value.toFixed(2)})`);
      }
    }
    
    return {
      learningCurves,
      rankings: result.comparison,
      summary: summaryParts.join('. ')
    };
  }
  
  /**
   * Setup hyperparameter optimization experiment
   * @param {object} params - Setup parameters
   * @returns {Promise<object>} Setup context
   */
  async setupHyperparameterOptimizationExperiment(params) {
    const { experiment, options } = params;
    
    // Generate hyperparameter configurations
    const hyperparameters = experiment.parameters.hyperparameters;
    const configurations = this.generateHyperparameterConfigurations(hyperparameters);
    
    return {
      agentType: experiment.parameters.agentType,
      environmentType: experiment.parameters.environmentType,
      configurations,
      episodes: experiment.parameters.episodes,
      optimizationMetric: experiment.parameters.optimizationMetric,
      optimizationGoal: experiment.parameters.optimizationGoal
    };
  }
  
  /**
   * Generate hyperparameter configurations
   * @param {object} hyperparameters - Hyperparameter definitions
   * @returns {Array<object>} Hyperparameter configurations
   */
  generateHyperparameterConfigurations(hyperparameters) {
    const paramNames = Object.keys(hyperparameters);
    const configurations = [];
    
    // For each hyperparameter, get the values to try
    const paramValues = {};
    
    for (const name of paramNames) {
      const param = hyperparameters[name];
      
      if (param.values) {
        // Use explicit values
        paramValues[name] = param.values;
      } else if (param.min !== undefined && param.max !== undefined) {
        // Generate values in range
        const count = param.count || 3;
        const values = [];
        
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const value = param.min + t * (param.max - param.min);
          values.push(value);
        }
        
        paramValues[name] = values;
      } else {
        // Default single value
        paramValues[name] = [param.default || 0];
      }
    }
    
    // Generate all combinations
    this.generateCombinations(paramNames, paramValues, {}, configurations);
    
    return configurations;
  }
  
  /**
   * Generate combinations of hyperparameters
   * @param {Array<string>} paramNames - Parameter names
   * @param {object} paramValues - Parameter values
   * @param {object} current - Current configuration
   * @param {Array<object>} result - Result array
   */
  generateCombinations(paramNames, paramValues, current, result) {
    if (paramNames.length === 0) {
      result.push({ ...current });
      return;
    }
    
    const name = paramNames[0];
    const values = paramValues[name];
    const remaining = paramNames.slice(1);
    
    for (const value of values) {
      current[name] = value;
      this.generateCombinations(remaining, paramValues, current, result);
    }
  }
  
  /**
   * Run hyperparameter optimization experiment
   * @param {object} params - Run parameters
   * @returns {Promise<object>} Run result
   */
  async runHyperparameterOptimizationExperiment(params) {
    const { experiment, context, options, onProgress } = params;
    
    const configurations = context.configurations;
    const episodes = context.episodes;
    const optimizationMetric = context.optimizationMetric;
    const optimizationGoal = context.optimizationGoal;
    
    // Simulate experiment execution
    const results = {
      configurations: [],
      bestConfiguration: null,
      bestValue: optimizationGoal === 'maximize' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    };
    
    // Run each configuration
    for (let c = 0; c < configurations.length; c++) {
      const config = configurations[c];
      
      // Simulate training with this configuration
      let totalReward = 0;
      let totalSteps = 0;
      let successCount = 0;
      
      // Bias based on hyperparameters (just for simulation)
      const learningRateBias = config.learningRate ? (config.learningRate - 0.05) * 100 : 0;
      const discountFactorBias = config.discountFactor ? (config.discountFactor - 0.9) * 200 : 0;
      
      for (let i = 0; i < episodes; i++) {
        // Simulate episode
        const episodeSteps = Math.floor(Math.random() * 1000) + 1;
        const episodeReward = Math.random() * 100 - 20 + learningRateBias + discountFactorBias;
        const success = episodeReward > 50;
        
        // Update totals
        totalReward += episodeReward;
        totalSteps += episodeSteps;
        if (success) successCount++;
        
        // Report progress
        if (onProgress) {
          onProgress((c * episodes + i + 1) / (configurations.length * episodes));
        }
        
        // Simulate computation time
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      
      // Calculate metrics
      const metrics = {
        averageReward: totalReward / episodes,
        averageSteps: totalSteps / episodes,
        successRate: successCount / episodes
      };
      
      // Store configuration results
      const configResult = {
        configuration: config,
        metrics
      };
      
      results.configurations.push(configResult);
      
      // Check if this is the best configuration
      const metricValue = metrics[optimizationMetric];
      
      if (optimizationGoal === 'maximize') {
        if (metricValue > results.bestValue) {
          results.bestValue = metricValue;
          results.bestConfiguration = config;
        }
      } else {
        if (metricValue < results.bestValue) {
          results.bestValue = metricValue;
          results.bestConfiguration = config;
        }
      }
    }
    
    // Sort configurations by performance
    results.configurations.sort((a, b) => {
      const aValue = a.metrics[optimizationMetric];
      const bValue = b.metrics[optimizationMetric];
      
      return optimizationGoal === 'maximize' ? bValue - aValue : aValue - bValue;
    });
    
    return results;
  }
  
  /**
   * Analyze hyperparameter optimization experiment
   * @param {object} params - Analysis parameters
   * @returns {Promise<object>} Analysis result
   */
  async analyzeHyperparameterOptimizationExperiment(params) {
    const { experiment, context, result, options } = params;
    
    const optimizationMetric = context.optimizationMetric;
    const optimizationGoal = context.optimizationGoal;
    const configurations = result.configurations;
    
    // Analyze impact of each hyperparameter
    const hyperparameterImpact = {};
    
    // Get all hyperparameter names
    const hyperparameterNames = Object.keys(configurations[0].configuration);
    
    for (const name of hyperparameterNames) {
      // Group configurations by this hyperparameter value
      const valueGroups = {};
      
      for (const config of configurations) {
        const value = config.configuration[name];
        
        if (!valueGroups[value]) {
          valueGroups[value] = [];
        }
        
        valueGroups[value].push(config);
      }
      
      // Calculate average performance for each value
      const valuePerformance = Object.entries(valueGroups).map(([value, configs]) => {
        const averagePerformance = configs.reduce((sum, config) => {
          return sum + config.metrics[optimizationMetric];
        }, 0) / configs.length;
        
        return {
          value: parseFloat(value),
          performance: averagePerformance
        };
      });
      
      // Sort by value
      valuePerformance.sort((a, b) => a.value - b.value);
      
      hyperparameterImpact[name] = valuePerformance;
    }
    
    // Generate summary
    const bestConfig = result.bestConfiguration;
    const bestValue = result.bestValue;
    
    const configStr = Object.entries(bestConfig)
      .map(([name, value]) => `${name}: ${value}`)
      .join(', ');
    
    const summary = `Best configuration: ${configStr} with ${optimizationMetric} = ${bestValue.toFixed(2)}`;
    
    return {
      hyperparameterImpact,
      bestConfiguration: bestConfig,
      bestValue,
      allConfigurations: configurations.map(c => ({
        configuration: c.configuration,
        performance: c.metrics[optimizationMetric]
      })),
      summary
    };
  }
  
  /**
   * Setup curriculum learning experiment
   * @param {object} params - Setup parameters
   * @returns {Promise<object>} Setup context
   */
  async setupCurriculumLearningExperiment(params) {
    const { experiment, options } = params;
    
    return {
      agentType: experiment.parameters.agentType,
      environmentTypes: experiment.parameters.environmentTypes,
      episodesPerLevel: experiment.parameters.episodesPerLevel,
      advancementThreshold: experiment.parameters.advancementThreshold,
      maxStepsPerEpisode: experiment.parameters.maxStepsPerEpisode
    };
  }
  
  /**
   * Run curriculum learning experiment
   * @param {object} params - Run parameters
   * @returns {Promise<object>} Run result
   */
  async runCurriculumLearningExperiment(params) {
    const { experiment, context, options, onProgress } = params;
    
    const environmentTypes = context.environmentTypes;
    const episodesPerLevel = context.episodesPerLevel;
    const advancementThreshold = context.advancementThreshold;
    const maxSteps = context.maxStepsPerEpisode;
    
    // Simulate experiment execution
    const results = {
      levels: [],
      finalLevel: 0,
      completedCurriculum: false
    };
    
    // Track agent's learning progress
    let currentLevel = 0;
    let totalEpisodes = 0;
    
    // Run through curriculum
    while (currentLevel < environmentTypes.length) {
      const environmentType = environmentTypes[currentLevel];
      
      // Simulate training at this level
      const levelResults = {
        level: currentLevel,
        environment: environmentType,
        episodes: [],
        metrics: {
          totalReward: 0,
          averageReward: 0,
          totalSteps: 0,
          averageSteps: 0,
          successRate: 0
        }
      };
      
      let totalReward = 0;
      let totalSteps = 0;
      let successCount = 0;
      
      // Difficulty factor affects rewards
      const difficultyFactor = 1.0 - (currentLevel / environmentTypes.length) * 0.5;
      
      for (let i = 0; i < episodesPerLevel; i++) {
        // Simulate episode
        const episodeSteps = Math.floor(Math.random() * maxSteps) + 1;
        const episodeReward = (Math.random() * 100 - 20) * difficultyFactor;
        const success = episodeReward > 50;
        
        // Record episode results
        levelResults.episodes.push({
          episode: i,
          steps: episodeSteps,
          reward: episodeReward,
          success
        });
        
        // Update totals
        totalReward += episodeReward;
        totalSteps += episodeSteps;
        if (success) successCount++;
        
        // Report progress
        totalEpisodes++;
        if (onProgress) {
          const totalPossibleEpisodes = episodesPerLevel * environmentTypes.length;
          onProgress(Math.min(1.0, totalEpisodes / totalPossibleEpisodes));
        }
        
        // Simulate computation time
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      // Calculate level metrics
      levelResults.metrics.totalReward = totalReward;
      levelResults.metrics.averageReward = totalReward / episodesPerLevel;
      levelResults.metrics.totalSteps = totalSteps;
      levelResults.metrics.averageSteps = totalSteps / episodesPerLevel;
      levelResults.metrics.successRate = successCount / episodesPerLevel;
      
      // Store level results
      results.levels.push(levelResults);
      
      // Check if agent should advance to next level
      const successRate = levelResults.metrics.successRate;
      
      if (successRate >= advancementThreshold) {
        currentLevel++;
      } else {
        // Agent failed to advance, end curriculum
        break;
      }
    }
    
    // Record final results
    results.finalLevel = currentLevel;
    results.completedCurriculum = currentLevel >= environmentTypes.length;
    
    return results;
  }
  
  /**
   * Analyze curriculum learning experiment
   * @param {object} params - Analysis parameters
   * @returns {Promise<object>} Analysis result
   */
  async analyzeCurriculumLearningExperiment(params) {
    const { experiment, context, result, options } = params;
    
    const environmentTypes = context.environmentTypes;
    const levels = result.levels;
    
    // Calculate learning progress across levels
    const learningProgress = levels.map(level => ({
      level: level.level,
      environment: level.environment,
      averageReward: level.metrics.averageReward,
      successRate: level.metrics.successRate
    }));
    
    // Calculate performance improvement
    let performanceImprovement = null;
    
    if (levels.length >= 2) {
      const firstLevel = levels[0];
      const lastLevel = levels[levels.length - 1];
      
      performanceImprovement = {
        rewardImprovement: lastLevel.metrics.averageReward - firstLevel.metrics.averageReward,
        successRateImprovement: lastLevel.metrics.successRate - firstLevel.metrics.successRate
      };
    }
    
    // Generate summary
    let summary;
    
    if (result.completedCurriculum) {
      summary = `Agent successfully completed the full curriculum of ${environmentTypes.length} levels`;
    } else {
      summary = `Agent reached level ${result.finalLevel + 1} of ${environmentTypes.length} (environment: ${environmentTypes[result.finalLevel]})`;
    }
    
    if (performanceImprovement) {
      summary += `. Performance improved by ${performanceImprovement.successRateImprovement.toFixed(2)} success rate`;
    }
    
    return {
      learningProgress,
      performanceImprovement,
      levelDetails: levels.map(level => ({
        level: level.level,
        environment: level.environment,
        metrics: level.metrics
      })),
      summary
    };
  }
}

module.exports = ExperimentManagement;
