# User Interface Design

## Overview
The User Interface component provides the visual interface for interacting with the DevSparkAgent Playground. It includes a development dashboard, visualization tools, experiment management, and tournament management.

## Class Structure

### UserInterface
Main class responsible for managing the user interface.

```
class UserInterface {
  constructor(config)
  async initialize()
  async start()
  async stop()
  async renderDashboard(options)
  async updateVisualization(visualizationId, data)
  async createExperiment(experimentId, options)
  async createTournament(tournamentId, options)
  getUIState()
}
```

### DashboardManager
Handles the development dashboard interface.

```
class DashboardManager {
  constructor(config)
  async initialize()
  async renderDashboard(options)
  async updateDashboard(data)
  async createPanel(panelId, panelType, options)
  async removePanel(panelId)
  async saveLayout(layoutId)
  async loadLayout(layoutId)
  getDashboardState()
}
```

### VisualizationManager
Manages data visualization components.

```
class VisualizationManager {
  constructor(config)
  async initialize()
  async createVisualization(visualizationId, visualizationType, options)
  async updateVisualization(visualizationId, data)
  async removeVisualization(visualizationId)
  async exportVisualization(visualizationId, format)
  getVisualizationState(visualizationId)
}
```

### ExperimentManager
Handles experiment configuration and execution.

```
class ExperimentManager {
  constructor(config)
  async initialize()
  async createExperiment(experimentId, options)
  async configureExperiment(experimentId, configuration)
  async runExperiment(experimentId)
  async pauseExperiment(experimentId)
  async resumeExperiment(experimentId)
  async stopExperiment(experimentId)
  async getExperimentResults(experimentId)
  getExperimentState(experimentId)
}
```

### TournamentManager
Manages agent tournaments and competitions.

```
class TournamentManager {
  constructor(config)
  async initialize()
  async createTournament(tournamentId, options)
  async addAgentToTournament(tournamentId, agentId)
  async removeAgentFromTournament(tournamentId, agentId)
  async startTournament(tournamentId)
  async pauseTournament(tournamentId)
  async resumeTournament(tournamentId)
  async stopTournament(tournamentId)
  async getTournamentResults(tournamentId)
  getTournamentState(tournamentId)
}
```

## Interfaces

### Dashboard Interface
```javascript
/**
 * Dashboard configuration
 * @typedef {Object} Dashboard
 * @property {string} id - Dashboard ID
 * @property {string} name - Dashboard name
 * @property {string} theme - Dashboard theme
 * @property {Array<Panel>} panels - Dashboard panels
 * @property {Object} layout - Panel layout configuration
 * @property {Object} options - Additional options
 */

/**
 * Dashboard panel
 * @typedef {Object} Panel
 * @property {string} id - Panel ID
 * @property {string} type - Panel type
 * @property {string} title - Panel title
 * @property {Object} data - Panel data
 * @property {Object} options - Panel options
 * @property {Object} position - Panel position in layout
 */
```

### Visualization Interface
```javascript
/**
 * Visualization configuration
 * @typedef {Object} Visualization
 * @property {string} id - Visualization ID
 * @property {string} type - Visualization type
 * @property {string} title - Visualization title
 * @property {Object} data - Visualization data
 * @property {Object} options - Visualization options
 * @property {Object} dimensions - Visualization dimensions
 */
```

### Experiment Interface
```javascript
/**
 * Experiment configuration
 * @typedef {Object} Experiment
 * @property {string} id - Experiment ID
 * @property {string} name - Experiment name
 * @property {string} description - Experiment description
 * @property {Array<string>} agentIds - Agent IDs to evaluate
 * @property {Array<string>} challengeIds - Challenge IDs to use
 * @property {Object} parameters - Experiment parameters
 * @property {Object} schedule - Execution schedule
 * @property {string} status - Experiment status
 * @property {Object} results - Experiment results
 */
```

### Tournament Interface
```javascript
/**
 * Tournament configuration
 * @typedef {Object} Tournament
 * @property {string} id - Tournament ID
 * @property {string} name - Tournament name
 * @property {string} description - Tournament description
 * @property {Array<string>} agentIds - Participating agent IDs
 * @property {string} format - Tournament format
 * @property {number} rounds - Number of rounds
 * @property {Object} matchmaking - Matchmaking configuration
 * @property {string} status - Tournament status
 * @property {Object} results - Tournament results
 */
```

## Implementation Details

### Dashboard Implementation
The DashboardManager will implement a flexible dashboard:

```javascript
class Dashboard {
  constructor(id, options) {
    this.id = id;
    this.name = options.name || id;
    this.theme = options.theme || 'dark';
    this.panels = [];
    this.layout = options.layout || { type: 'grid', columns: 12 };
    this.options = options;
    this.lastUpdated = new Date();
  }
  
  async render() {
    // In a real implementation, this would render to a web interface
    // For now, we'll return a representation of the dashboard
    
    const renderedPanels = await Promise.all(
      this.panels.map(panel => this._renderPanel(panel))
    );
    
    return {
      id: this.id,
      name: this.name,
      theme: this.theme,
      panels: renderedPanels,
      layout: this.layout,
      lastUpdated: this.lastUpdated
    };
  }
  
  async _renderPanel(panel) {
    // Render individual panel based on type
    switch (panel.type) {
      case 'agent-status':
        return this._renderAgentStatusPanel(panel);
      case 'metrics':
        return this._renderMetricsPanel(panel);
      case 'visualization':
        return this._renderVisualizationPanel(panel);
      case 'code-editor':
        return this._renderCodeEditorPanel(panel);
      case 'console':
        return this._renderConsolePanel(panel);
      default:
        return {
          id: panel.id,
          type: panel.type,
          title: panel.title,
          content: 'Unsupported panel type'
        };
    }
  }
  
  async _renderAgentStatusPanel(panel) {
    // Render agent status panel
    const agentIds = panel.data.agentIds || [];
    const agentStatuses = agentIds.map(agentId => ({
      id: agentId,
      status: 'unknown', // Would be fetched from RuntimeEnvironment
      lastActive: new Date(),
      metrics: {} // Would be fetched from EvaluationSystem
    }));
    
    return {
      id: panel.id,
      type: panel.type,
      title: panel.title,
      content: {
        agents: agentStatuses
      }
    };
  }
  
  async _renderMetricsPanel(panel) {
    // Render metrics panel
    const metricIds = panel.data.metricIds || [];
    const metrics = metricIds.map(metricId => ({
      id: metricId,
      name: metricId, // Would be fetched from EvaluationSystem
      value: 0, // Would be fetched from EvaluationSystem
      history: [] // Would be fetched from EvaluationSystem
    }));
    
    return {
      id: panel.id,
      type: panel.type,
      title: panel.title,
      content: {
        metrics
      }
    };
  }
  
  async _renderVisualizationPanel(panel) {
    // Render visualization panel
    return {
      id: panel.id,
      type: panel.type,
      title: panel.title,
      content: {
        visualizationId: panel.data.visualizationId,
        visualizationType: panel.data.visualizationType,
        data: panel.data.data || {}
      }
    };
  }
  
  async _renderCodeEditorPanel(panel) {
    // Render code editor panel
    return {
      id: panel.id,
      type: panel.type,
      title: panel.title,
      content: {
        language: panel.data.language || 'javascript',
        code: panel.data.code || '',
        readOnly: panel.data.readOnly || false
      }
    };
  }
  
  async _renderConsolePanel(panel) {
    // Render console panel
    return {
      id: panel.id,
      type: panel.type,
      title: panel.title,
      content: {
        logs: panel.data.logs || []
      }
    };
  }
  
  async createPanel(panelId, panelType, options) {
    const panel = {
      id: panelId,
      type: panelType,
      title: options.title || panelType,
      data: options.data || {},
      options: options,
      position: options.position || { x: 0, y: 0, w: 6, h: 4 }
    };
    
    this.panels.push(panel);
    this.lastUpdated = new Date();
    
    return panel;
  }
  
  async updatePanel(panelId, updates) {
    const panel = this.panels.find(p => p.id === panelId);
    if (!panel) {
      throw new Error(`Panel ${panelId} not found`);
    }
    
    // Update panel properties
    Object.assign(panel, updates);
    
    // If data is provided, merge with existing data
    if (updates.data) {
      panel.data = { ...panel.data, ...updates.data };
    }
    
    // If options is provided, merge with existing options
    if (updates.options) {
      panel.options = { ...panel.options, ...updates.options };
    }
    
    this.lastUpdated = new Date();
    
    return panel;
  }
  
  async removePanel(panelId) {
    const index = this.panels.findIndex(p => p.id === panelId);
    if (index === -1) {
      throw new Error(`Panel ${panelId} not found`);
    }
    
    this.panels.splice(index, 1);
    this.lastUpdated = new Date();
    
    return true;
  }
  
  async saveLayout(layoutId) {
    // Save current layout
    const layout = {
      id: layoutId,
      dashboardId: this.id,
      panels: this.panels.map(p => ({
        id: p.id,
        position: p.position
      })),
      timestamp: new Date()
    };
    
    // In a real implementation, this would save to a database
    return layout;
  }
  
  async loadLayout(layoutId) {
    // In a real implementation, this would load from a database
    // For now, we'll just return a mock layout
    
    return {
      id: layoutId,
      dashboardId: this.id,
      panels: this.panels.map(p => ({
        id: p.id,
        position: p.position
      })),
      timestamp: new Date()
    };
  }
  
  getState() {
    return {
      id: this.id,
      name: this.name,
      theme: this.theme,
      panelCount: this.panels.length,
      layout: this.layout,
      lastUpdated: this.lastUpdated
    };
  }
}
```

### Visualization Implementation
The VisualizationManager will implement data visualization:

```javascript
class Visualization {
  constructor(id, type, options) {
    this.id = id;
    this.type = type;
    this.title = options.title || id;
    this.data = options.data || {};
    this.options = options;
    this.dimensions = options.dimensions || { width: 800, height: 600 };
    this.lastUpdated = new Date();
  }
  
  async render() {
    // In a real implementation, this would render to a web interface
    // For now, we'll return a representation of the visualization
    
    const renderedData = await this._renderData();
    
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      data: renderedData,
      dimensions: this.dimensions,
      lastUpdated: this.lastUpdated
    };
  }
  
  async _renderData() {
    // Render data based on visualization type
    switch (this.type) {
      case 'bar-chart':
        return this._renderBarChart();
      case 'line-chart':
        return this._renderLineChart();
      case 'scatter-plot':
        return this._renderScatterPlot();
      case 'heatmap':
        return this._renderHeatmap();
      case 'network-graph':
        return this._renderNetworkGraph();
      default:
        return {
          type: this.type,
          message: 'Unsupported visualization type'
        };
    }
  }
  
  _renderBarChart() {
    // Render bar chart data
    return {
      type: 'bar-chart',
      labels: this.data.labels || [],
      datasets: this.data.datasets || [],
      options: {
        xAxis: this.options.xAxis || { title: 'X Axis' },
        yAxis: this.options.yAxis || { title: 'Y Axis' },
        legend: this.options.legend || { position: 'top' },
        colors: this.options.colors || ['#4285F4', '#34A853', '#FBBC05', '#EA4335']
      }
    };
  }
  
  _renderLineChart() {
    // Render line chart data
    return {
      type: 'line-chart',
      labels: this.data.labels || [],
      datasets: this.data.datasets || [],
      options: {
        xAxis: this.options.xAxis || { title: 'X Axis' },
        yAxis: this.options.yAxis || { title: 'Y Axis' },
        legend: this.options.legend || { position: 'top' },
        colors: this.options.colors || ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
        fill: this.options.fill || false,
        tension: this.options.tension || 0.4
      }
    };
  }
  
  _renderScatterPlot() {
    // Render scatter plot data
    return {
      type: 'scatter-plot',
      datasets: this.data.datasets || [],
      options: {
        xAxis: this.options.xAxis || { title: 'X Axis' },
        yAxis: this.options.yAxis || { title: 'Y Axis' },
        legend: this.options.legend || { position: 'top' },
        colors: this.options.colors || ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
        pointSize: this.options.pointSize || 5,
        pointStyle: this.options.pointStyle || 'circle'
      }
    };
  }
  
  _renderHeatmap() {
    // Render heatmap data
    return {
      type: 'heatmap',
      labels: {
        x: this.data.xLabels || [],
        y: this.data.yLabels || []
      },
      data: this.data.values || [],
      options: {
        colorScale: this.options.colorScale || ['#FFFFFF', '#4285F4'],
        legend: this.options.legend || { position: 'right' },
        cellSize: this.options.cellSize || { width: 40, height: 40 }
      }
    };
  }
  
  _renderNetworkGraph() {
    // Render network graph data
    return {
      type: 'network-graph',
      nodes: this.data.nodes || [],
      edges: this.data.edges || [],
      options: {
        layout: this.options.layout || 'force',
        nodeSize: this.options.nodeSize || 10,
        nodeColor: this.options.nodeColor || '#4285F4',
        edgeColor: this.options.edgeColor || '#CCCCCC',
        directed: this.options.directed || false
      }
    };
  }
  
  async update(data) {
    // Update visualization data
    this.data = { ...this.data, ...data };
    this.lastUpdated = new Date();
    
    return await this.render();
  }
  
  async export(format) {
    // Export visualization to specified format
    switch (format) {
      case 'png':
        return this._exportToPNG();
      case 'svg':
        return this._exportToSVG();
      case 'json':
        return this._exportToJSON();
      case 'csv':
        return this._exportToCSV();
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  _exportToPNG() {
    // In a real implementation, this would generate a PNG image
    return {
      format: 'png',
      data: 'base64-encoded-png-data',
      filename: `${this.id}.png`
    };
  }
  
  _exportToSVG() {
    // In a real implementation, this would generate an SVG image
    return {
      format: 'svg',
      data: '<svg>...</svg>',
      filename: `${this.id}.svg`
    };
  }
  
  _exportToJSON() {
    // Export data as JSON
    return {
      format: 'json',
      data: JSON.stringify({
        id: this.id,
        type: this.type,
        title: this.title,
        data: this.data,
        options: this.options
      }, null, 2),
      filename: `${this.id}.json`
    };
  }
  
  _exportToCSV() {
    // Export data as CSV
    let csv = '';
    
    // Different export logic based on visualization type
    switch (this.type) {
      case 'bar-chart':
      case 'line-chart':
        // Export labels and datasets
        csv = 'Label,' + this.data.datasets.map(d => d.label).join(',') + '\n';
        for (let i = 0; i < this.data.labels.length; i++) {
          csv += this.data.labels[i] + ',';
          csv += this.data.datasets.map(d => d.data[i]).join(',') + '\n';
        }
        break;
      case 'scatter-plot':
        // Export x,y coordinates
        csv = 'Dataset,X,Y\n';
        for (const dataset of this.data.datasets) {
          for (const point of dataset.data) {
            csv += `${dataset.label},${point.x},${point.y}\n`;
          }
        }
        break;
      case 'heatmap':
        // Export heatmap values
        csv = ',' + this.data.xLabels.join(',') + '\n';
        for (let i = 0; i < this.data.yLabels.length; i++) {
          csv += this.data.yLabels[i] + ',';
          csv += this.data.values[i].join(',') + '\n';
        }
        break;
      default:
        csv = 'Data cannot be exported to CSV for this visualization type';
    }
    
    return {
      format: 'csv',
      data: csv,
      filename: `${this.id}.csv`
    };
  }
  
  getState() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      dimensions: this.dimensions,
      lastUpdated: this.lastUpdated
    };
  }
}
```

### Experiment Implementation
The ExperimentManager will implement experiment management:

```javascript
class Experiment {
  constructor(id, options) {
    this.id = id;
    this.name = options.name || id;
    this.description = options.description || '';
    this.agentIds = options.agentIds || [];
    this.challengeIds = options.challengeIds || [];
    this.parameters = options.parameters || {};
    this.schedule = options.schedule || { type: 'immediate' };
    this.status = 'created';
    this.progress = 0;
    this.results = {
      summary: {},
      agentResults: {},
      challengeResults: {}
    };
    this.history = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  
  async configure(configuration) {
    // Update experiment configuration
    if (this.status !== 'created' && this.status !== 'configured') {
      throw new Error(`Cannot configure experiment in ${this.status} status`);
    }
    
    // Update properties
    if (configuration.name) this.name = configuration.name;
    if (configuration.description) this.description = configuration.description;
    if (configuration.agentIds) this.agentIds = configuration.agentIds;
    if (configuration.challengeIds) this.challengeIds = configuration.challengeIds;
    if (configuration.parameters) this.parameters = { ...this.parameters, ...configuration.parameters };
    if (configuration.schedule) this.schedule = configuration.schedule;
    
    this.status = 'configured';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'configure',
      timestamp: new Date(),
      configuration
    });
    
    return this;
  }
  
  async run() {
    // Run the experiment
    if (this.status !== 'created' && this.status !== 'configured' && this.status !== 'paused') {
      throw new Error(`Cannot run experiment in ${this.status} status`);
    }
    
    this.status = 'running';
    this.progress = 0;
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'run',
      timestamp: new Date()
    });
    
    // In a real implementation, this would execute the experiment
    // For now, we'll simulate the execution
    this._simulateExecution();
    
    return this;
  }
  
  async pause() {
    // Pause the experiment
    if (this.status !== 'running') {
      throw new Error(`Cannot pause experiment in ${this.status} status`);
    }
    
    this.status = 'paused';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'pause',
      timestamp: new Date()
    });
    
    return this;
  }
  
  async resume() {
    // Resume the experiment
    if (this.status !== 'paused') {
      throw new Error(`Cannot resume experiment in ${this.status} status`);
    }
    
    this.status = 'running';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'resume',
      timestamp: new Date()
    });
    
    // In a real implementation, this would resume the experiment
    // For now, we'll simulate the execution
    this._simulateExecution();
    
    return this;
  }
  
  async stop() {
    // Stop the experiment
    if (this.status !== 'running' && this.status !== 'paused') {
      throw new Error(`Cannot stop experiment in ${this.status} status`);
    }
    
    this.status = 'stopped';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'stop',
      timestamp: new Date()
    });
    
    return this;
  }
  
  _simulateExecution() {
    // Simulate experiment execution
    const totalSteps = this.agentIds.length * this.challengeIds.length;
    let currentStep = 0;
    
    // Initialize results
    this.results = {
      summary: {},
      agentResults: {},
      challengeResults: {}
    };
    
    // Initialize agent results
    for (const agentId of this.agentIds) {
      this.results.agentResults[agentId] = {
        agentId,
        challenges: {},
        metrics: {}
      };
    }
    
    // Initialize challenge results
    for (const challengeId of this.challengeIds) {
      this.results.challengeResults[challengeId] = {
        challengeId,
        agents: {},
        metrics: {}
      };
    }
    
    // Simulate execution steps
    const interval = setInterval(() => {
      if (this.status !== 'running') {
        clearInterval(interval);
        return;
      }
      
      // Simulate one evaluation
      const agentIndex = Math.floor(currentStep / this.challengeIds.length);
      const challengeIndex = currentStep % this.challengeIds.length;
      
      const agentId = this.agentIds[agentIndex];
      const challengeId = this.challengeIds[challengeIndex];
      
      // Simulate evaluation result
      const result = this._simulateEvaluation(agentId, challengeId);
      
      // Update agent results
      this.results.agentResults[agentId].challenges[challengeId] = result;
      
      // Update challenge results
      this.results.challengeResults[challengeId].agents[agentId] = result;
      
      // Update progress
      currentStep++;
      this.progress = currentStep / totalSteps;
      
      // Check if experiment is complete
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        this._finalizeResults();
        this.status = 'completed';
        this.progress = 1;
        this.updatedAt = new Date();
        
        // Add to history
        this.history.push({
          action: 'complete',
          timestamp: new Date()
        });
      }
    }, 1000); // Simulate 1 second per evaluation
  }
  
  _simulateEvaluation(agentId, challengeId) {
    // Simulate evaluation result
    const success = Math.random() > 0.2; // 80% success rate
    
    return {
      agentId,
      challengeId,
      success,
      metrics: {
        accuracy: success ? 70 + Math.random() * 30 : Math.random() * 70,
        executionTime: 100 + Math.random() * 900,
        memoryUsage: 10 + Math.random() * 90
      },
      timestamp: new Date()
    };
  }
  
  _finalizeResults() {
    // Calculate summary metrics
    const summary = {
      totalEvaluations: this.agentIds.length * this.challengeIds.length,
      successRate: 0,
      averageMetrics: {
        accuracy: 0,
        executionTime: 0,
        memoryUsage: 0
      },
      bestAgent: null,
      worstAgent: null,
      hardestChallenge: null,
      easiestChallenge: null
    };
    
    // Calculate agent metrics
    for (const agentId of this.agentIds) {
      const agentResults = this.results.agentResults[agentId];
      const challenges = Object.values(agentResults.challenges);
      
      const successCount = challenges.filter(c => c.success).length;
      const successRate = successCount / challenges.length;
      
      agentResults.metrics = {
        successRate,
        averageAccuracy: challenges.reduce((sum, c) => sum + c.metrics.accuracy, 0) / challenges.length,
        averageExecutionTime: challenges.reduce((sum, c) => sum + c.metrics.executionTime, 0) / challenges.length,
        averageMemoryUsage: challenges.reduce((sum, c) => sum + c.metrics.memoryUsage, 0) / challenges.length
      };
      
      // Update summary success rate
      summary.successRate += successRate / this.agentIds.length;
      
      // Update summary average metrics
      summary.averageMetrics.accuracy += agentResults.metrics.averageAccuracy / this.agentIds.length;
      summary.averageMetrics.executionTime += agentResults.metrics.averageExecutionTime / this.agentIds.length;
      summary.averageMetrics.memoryUsage += agentResults.metrics.averageMemoryUsage / this.agentIds.length;
      
      // Update best and worst agent
      if (!summary.bestAgent || agentResults.metrics.averageAccuracy > this.results.agentResults[summary.bestAgent].metrics.averageAccuracy) {
        summary.bestAgent = agentId;
      }
      
      if (!summary.worstAgent || agentResults.metrics.averageAccuracy < this.results.agentResults[summary.worstAgent].metrics.averageAccuracy) {
        summary.worstAgent = agentId;
      }
    }
    
    // Calculate challenge metrics
    for (const challengeId of this.challengeIds) {
      const challengeResults = this.results.challengeResults[challengeId];
      const agents = Object.values(challengeResults.agents);
      
      const successCount = agents.filter(a => a.success).length;
      const successRate = successCount / agents.length;
      
      challengeResults.metrics = {
        successRate,
        averageAccuracy: agents.reduce((sum, a) => sum + a.metrics.accuracy, 0) / agents.length,
        averageExecutionTime: agents.reduce((sum, a) => sum + a.metrics.executionTime, 0) / agents.length,
        averageMemoryUsage: agents.reduce((sum, a) => sum + a.metrics.memoryUsage, 0) / agents.length
      };
      
      // Update hardest and easiest challenge
      if (!summary.hardestChallenge || challengeResults.metrics.successRate < this.results.challengeResults[summary.hardestChallenge].metrics.successRate) {
        summary.hardestChallenge = challengeId;
      }
      
      if (!summary.easiestChallenge || challengeResults.metrics.successRate > this.results.challengeResults[summary.easiestChallenge].metrics.successRate) {
        summary.easiestChallenge = challengeId;
      }
    }
    
    this.results.summary = summary;
  }
  
  getResults() {
    return this.results;
  }
  
  getState() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      progress: this.progress,
      agentCount: this.agentIds.length,
      challengeCount: this.challengeIds.length,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

### Tournament Implementation
The TournamentManager will implement tournament management:

```javascript
class Tournament {
  constructor(id, options) {
    this.id = id;
    this.name = options.name || id;
    this.description = options.description || '';
    this.agentIds = options.agentIds || [];
    this.format = options.format || 'round-robin';
    this.rounds = options.rounds || 1;
    this.matchmaking = options.matchmaking || { algorithm: 'random' };
    this.status = 'created';
    this.progress = 0;
    this.matches = [];
    this.results = {
      rankings: [],
      matchResults: {},
      agentStats: {}
    };
    this.history = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  
  async addAgent(agentId) {
    // Add agent to tournament
    if (this.status !== 'created' && this.status !== 'configured') {
      throw new Error(`Cannot add agent in ${this.status} status`);
    }
    
    if (!this.agentIds.includes(agentId)) {
      this.agentIds.push(agentId);
      this.updatedAt = new Date();
      
      // Add to history
      this.history.push({
        action: 'add_agent',
        timestamp: new Date(),
        agentId
      });
    }
    
    return this;
  }
  
  async removeAgent(agentId) {
    // Remove agent from tournament
    if (this.status !== 'created' && this.status !== 'configured') {
      throw new Error(`Cannot remove agent in ${this.status} status`);
    }
    
    const index = this.agentIds.indexOf(agentId);
    if (index !== -1) {
      this.agentIds.splice(index, 1);
      this.updatedAt = new Date();
      
      // Add to history
      this.history.push({
        action: 'remove_agent',
        timestamp: new Date(),
        agentId
      });
    }
    
    return this;
  }
  
  async start() {
    // Start the tournament
    if (this.status !== 'created' && this.status !== 'configured' && this.status !== 'paused') {
      throw new Error(`Cannot start tournament in ${this.status} status`);
    }
    
    if (this.agentIds.length < 2) {
      throw new Error('Tournament requires at least 2 agents');
    }
    
    this.status = 'running';
    this.progress = 0;
    this.updatedAt = new Date();
    
    // Generate matches
    if (this.matches.length === 0) {
      this._generateMatches();
    }
    
    // Add to history
    this.history.push({
      action: 'start',
      timestamp: new Date()
    });
    
    // In a real implementation, this would execute the tournament
    // For now, we'll simulate the execution
    this._simulateExecution();
    
    return this;
  }
  
  async pause() {
    // Pause the tournament
    if (this.status !== 'running') {
      throw new Error(`Cannot pause tournament in ${this.status} status`);
    }
    
    this.status = 'paused';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'pause',
      timestamp: new Date()
    });
    
    return this;
  }
  
  async resume() {
    // Resume the tournament
    if (this.status !== 'paused') {
      throw new Error(`Cannot resume tournament in ${this.status} status`);
    }
    
    this.status = 'running';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'resume',
      timestamp: new Date()
    });
    
    // In a real implementation, this would resume the tournament
    // For now, we'll simulate the execution
    this._simulateExecution();
    
    return this;
  }
  
  async stop() {
    // Stop the tournament
    if (this.status !== 'running' && this.status !== 'paused') {
      throw new Error(`Cannot stop tournament in ${this.status} status`);
    }
    
    this.status = 'stopped';
    this.updatedAt = new Date();
    
    // Add to history
    this.history.push({
      action: 'stop',
      timestamp: new Date()
    });
    
    return this;
  }
  
  _generateMatches() {
    // Generate matches based on format
    this.matches = [];
    
    switch (this.format) {
      case 'round-robin':
        this._generateRoundRobinMatches();
        break;
      case 'single-elimination':
        this._generateSingleEliminationMatches();
        break;
      case 'double-elimination':
        this._generateDoubleEliminationMatches();
        break;
      case 'swiss':
        this._generateSwissMatches();
        break;
      default:
        this._generateRoundRobinMatches();
    }
  }
  
  _generateRoundRobinMatches() {
    // Generate round-robin matches
    for (let round = 0; round < this.rounds; round++) {
      for (let i = 0; i < this.agentIds.length; i++) {
        for (let j = i + 1; j < this.agentIds.length; j++) {
          const match = {
            id: `match-${this.id}-${round}-${i}-${j}`,
            round,
            agentA: this.agentIds[i],
            agentB: this.agentIds[j],
            status: 'scheduled',
            result: null,
            timestamp: null
          };
          
          this.matches.push(match);
        }
      }
    }
  }
  
  _generateSingleEliminationMatches() {
    // Generate single-elimination matches
    // For simplicity, we'll assume the number of agents is a power of 2
    const rounds = Math.ceil(Math.log2(this.agentIds.length));
    
    // Shuffle agents
    const shuffledAgents = [...this.agentIds].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    const firstRoundMatches = [];
    for (let i = 0; i < shuffledAgents.length; i += 2) {
      if (i + 1 < shuffledAgents.length) {
        const match = {
          id: `match-${this.id}-0-${i/2}`,
          round: 0,
          agentA: shuffledAgents[i],
          agentB: shuffledAgents[i + 1],
          status: 'scheduled',
          result: null,
          timestamp: null,
          nextMatchId: `match-${this.id}-1-${Math.floor(i/4)}`
        };
        
        firstRoundMatches.push(match);
      } else {
        // Bye
        const match = {
          id: `match-${this.id}-0-${i/2}`,
          round: 0,
          agentA: shuffledAgents[i],
          agentB: null,
          status: 'bye',
          result: {
            winner: shuffledAgents[i],
            loser: null,
            scores: { [shuffledAgents[i]]: 1, null: 0 }
          },
          timestamp: new Date(),
          nextMatchId: `match-${this.id}-1-${Math.floor(i/4)}`
        };
        
        firstRoundMatches.push(match);
      }
    }
    
    this.matches = firstRoundMatches;
    
    // Generate subsequent rounds
    for (let round = 1; round < rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round - 1);
      
      for (let i = 0; i < matchesInRound; i++) {
        const match = {
          id: `match-${this.id}-${round}-${i}`,
          round,
          agentA: null, // Will be filled in during tournament
          agentB: null, // Will be filled in during tournament
          status: 'scheduled',
          result: null,
          timestamp: null,
          nextMatchId: round < rounds - 1 ? `match-${this.id}-${round+1}-${Math.floor(i/2)}` : null
        };
        
        this.matches.push(match);
      }
    }
  }
  
  _generateDoubleEliminationMatches() {
    // Generate double-elimination matches
    // This is a simplified implementation
    
    // First, generate the winners bracket (single elimination)
    this._generateSingleEliminationMatches();
    
    // Mark all matches as winners bracket
    for (const match of this.matches) {
      match.bracket = 'winners';
    }
    
    // Generate losers bracket
    // For simplicity, we'll just add some placeholder matches
    const losersMatches = [];
    for (let i = 0; i < this.matches.length - 1; i++) {
      const match = {
        id: `match-${this.id}-losers-${i}`,
        round: Math.floor(i / 2),
        agentA: null, // Will be filled in during tournament
        agentB: null, // Will be filled in during tournament
        status: 'scheduled',
        result: null,
        timestamp: null,
        bracket: 'losers',
        nextMatchId: i < this.matches.length - 2 ? `match-${this.id}-losers-${i+1}` : 'final'
      };
      
      losersMatches.push(match);
    }
    
    // Add final match
    const finalMatch = {
      id: `match-${this.id}-final`,
      round: 'final',
      agentA: null, // Winner of winners bracket
      agentB: null, // Winner of losers bracket
      status: 'scheduled',
      result: null,
      timestamp: null,
      bracket: 'final'
    };
    
    this.matches = [...this.matches, ...losersMatches, finalMatch];
  }
  
  _generateSwissMatches() {
    // Generate Swiss-system matches
    // For simplicity, we'll just generate the first round
    // Subsequent rounds would be generated based on results
    
    // Shuffle agents
    const shuffledAgents = [...this.agentIds].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    for (let i = 0; i < shuffledAgents.length; i += 2) {
      if (i + 1 < shuffledAgents.length) {
        const match = {
          id: `match-${this.id}-0-${i/2}`,
          round: 0,
          agentA: shuffledAgents[i],
          agentB: shuffledAgents[i + 1],
          status: 'scheduled',
          result: null,
          timestamp: null
        };
        
        this.matches.push(match);
      } else {
        // Bye
        const match = {
          id: `match-${this.id}-0-${i/2}`,
          round: 0,
          agentA: shuffledAgents[i],
          agentB: null,
          status: 'bye',
          result: {
            winner: shuffledAgents[i],
            loser: null,
            scores: { [shuffledAgents[i]]: 1, null: 0 }
          },
          timestamp: new Date()
        };
        
        this.matches.push(match);
      }
    }
  }
  
  _simulateExecution() {
    // Simulate tournament execution
    const pendingMatches = this.matches.filter(m => m.status === 'scheduled');
    let currentMatchIndex = 0;
    
    // Initialize agent stats
    for (const agentId of this.agentIds) {
      this.results.agentStats[agentId] = {
        agentId,
        matches: 0,
        wins: 0,
        losses: 0,
        score: 0
      };
    }
    
    // Simulate matches
    const interval = setInterval(() => {
      if (this.status !== 'running' || currentMatchIndex >= pendingMatches.length) {
        clearInterval(interval);
        
        if (currentMatchIndex >= pendingMatches.length) {
          this._finalizeResults();
          this.status = 'completed';
          this.progress = 1;
          this.updatedAt = new Date();
          
          // Add to history
          this.history.push({
            action: 'complete',
            timestamp: new Date()
          });
        }
        
        return;
      }
      
      // Simulate one match
      const match = pendingMatches[currentMatchIndex];
      
      // Skip if agents are not set (for elimination brackets)
      if (!match.agentA || !match.agentB) {
        currentMatchIndex++;
        return;
      }
      
      // Simulate match result
      const result = this._simulateMatch(match.agentA, match.agentB);
      
      // Update match
      match.status = 'completed';
      match.result = result;
      match.timestamp = new Date();
      
      // Update agent stats
      this.results.agentStats[result.winner].matches++;
      this.results.agentStats[result.winner].wins++;
      this.results.agentStats[result.winner].score += result.scores[result.winner];
      
      this.results.agentStats[result.loser].matches++;
      this.results.agentStats[result.loser].losses++;
      this.results.agentStats[result.loser].score += result.scores[result.loser];
      
      // Store match result
      this.results.matchResults[match.id] = result;
      
      // Update next match for elimination formats
      if (match.nextMatchId) {
        const nextMatch = this.matches.find(m => m.id === match.nextMatchId);
        if (nextMatch) {
          if (!nextMatch.agentA) {
            nextMatch.agentA = result.winner;
          } else if (!nextMatch.agentB) {
            nextMatch.agentB = result.winner;
          }
        }
        
        // For double elimination, update losers bracket
        if (match.bracket === 'winners') {
          const losersMatch = this.matches.find(m => 
            m.bracket === 'losers' && 
            m.round === match.round && 
            (!m.agentA || !m.agentB)
          );
          
          if (losersMatch) {
            if (!losersMatch.agentA) {
              losersMatch.agentA = result.loser;
            } else if (!losersMatch.agentB) {
              losersMatch.agentB = result.loser;
            }
          }
        }
      }
      
      // Update progress
      currentMatchIndex++;
      this.progress = currentMatchIndex / pendingMatches.length;
      
    }, 1000); // Simulate 1 second per match
  }
  
  _simulateMatch(agentA, agentB) {
    // Simulate match result
    const scoreA = Math.floor(Math.random() * 10);
    const scoreB = Math.floor(Math.random() * 10);
    
    const winner = scoreA > scoreB ? agentA : (scoreB > scoreA ? agentB : (Math.random() > 0.5 ? agentA : agentB));
    const loser = winner === agentA ? agentB : agentA;
    
    return {
      winner,
      loser,
      scores: {
        [agentA]: scoreA,
        [agentB]: scoreB
      },
      details: {
        metrics: {
          [agentA]: {
            accuracy: 70 + Math.random() * 30,
            executionTime: 100 + Math.random() * 900,
            memoryUsage: 10 + Math.random() * 90
          },
          [agentB]: {
            accuracy: 70 + Math.random() * 30,
            executionTime: 100 + Math.random() * 900,
            memoryUsage: 10 + Math.random() * 90
          }
        }
      }
    };
  }
  
  _finalizeResults() {
    // Calculate rankings
    const rankings = Object.values(this.results.agentStats)
      .sort((a, b) => {
        // Sort by wins, then by score
        if (a.wins !== b.wins) {
          return b.wins - a.wins;
        }
        return b.score - a.score;
      })
      .map((stats, index) => ({
        rank: index + 1,
        agentId: stats.agentId,
        wins: stats.wins,
        losses: stats.losses,
        score: stats.score
      }));
    
    this.results.rankings = rankings;
  }
  
  getResults() {
    return this.results;
  }
  
  getState() {
    return {
      id: this.id,
      name: this.name,
      format: this.format,
      status: this.status,
      progress: this.progress,
      agentCount: this.agentIds.length,
      matchCount: this.matches.length,
      completedMatches: this.matches.filter(m => m.status === 'completed').length,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

## Error Handling

The UserInterface will implement comprehensive error handling:

```javascript
try {
  // Operation that might fail
} catch (error) {
  if (error.code === 'PANEL_NOT_FOUND') {
    // Panel not found
    logger.warn(`Panel ${panelId} not found`);
    return null;
  } else if (error.code === 'VISUALIZATION_NOT_FOUND') {
    // Visualization not found
    logger.warn(`Visualization ${visualizationId} not found`);
    return { error: 'Visualization not found', code: 404 };
  } else {
    // Other error
    logger.error(`UI operation failed: ${error.message}`, error);
    throw error;
  }
}
```

## Integration Points

The UserInterface will integrate with:

1. **Runtime Environment**: To display agent status and execution results
2. **Interaction Framework**: To visualize agent interactions
3. **Evolution Mechanisms**: To display evolution progress and results
4. **Evaluation System**: To display evaluation results and leaderboards

## Implementation Plan

1. Create basic directory structure
2. Implement DashboardManager with panel management
3. Implement VisualizationManager with chart rendering
4. Implement ExperimentManager with experiment execution
5. Implement TournamentManager with tournament execution
6. Integrate components into UserInterface class
7. Add comprehensive error handling and logging
8. Write unit and integration tests
