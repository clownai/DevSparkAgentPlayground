/**
 * DevelopmentDashboard.js
 * Implementation of the development dashboard for agent monitoring and configuration
 */

class DevelopmentDashboard {
  /**
   * Create a new DevelopmentDashboard instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      refreshInterval: 5000, // ms
      maxHistoryPoints: 100,
      defaultView: 'overview',
      autoRefresh: true,
      ...options
    };
    
    this.views = new Map();
    this.panels = new Map();
    this.data = {
      agents: new Map(),
      metrics: new Map(),
      experiments: new Map(),
      configurations: new Map()
    };
    
    this.eventListeners = new Map();
    this.refreshTimer = null;
    this.activeView = null;
    
    this.logger = options.logger || console;
    
    // Initialize dashboard
    this.initialize();
  }
  
  /**
   * Initialize dashboard
   */
  initialize() {
    // Register default views
    this.registerView('overview', {
      name: 'Overview',
      description: 'Dashboard overview with key metrics and agent status',
      icon: 'dashboard',
      panels: ['agent-summary', 'performance-summary', 'active-experiments']
    });
    
    this.registerView('agents', {
      name: 'Agents',
      description: 'Detailed agent monitoring and configuration',
      icon: 'robot',
      panels: ['agent-list', 'agent-details', 'agent-configuration']
    });
    
    this.registerView('performance', {
      name: 'Performance',
      description: 'Performance metrics and visualizations',
      icon: 'chart-line',
      panels: ['metrics-overview', 'performance-charts', 'leaderboards']
    });
    
    this.registerView('experiments', {
      name: 'Experiments',
      description: 'Experiment management and results',
      icon: 'flask',
      panels: ['experiment-list', 'experiment-details', 'experiment-results']
    });
    
    this.registerView('settings', {
      name: 'Settings',
      description: 'Dashboard and system configuration',
      icon: 'cog',
      panels: ['system-settings', 'dashboard-settings', 'user-preferences']
    });
    
    // Register default panels
    this.registerPanel('agent-summary', {
      name: 'Agent Summary',
      description: 'Summary of all registered agents',
      type: 'summary',
      dataProvider: this.getAgentSummaryData.bind(this),
      refreshInterval: 5000
    });
    
    this.registerPanel('performance-summary', {
      name: 'Performance Summary',
      description: 'Summary of key performance metrics',
      type: 'summary',
      dataProvider: this.getPerformanceSummaryData.bind(this),
      refreshInterval: 10000
    });
    
    this.registerPanel('active-experiments', {
      name: 'Active Experiments',
      description: 'Currently running experiments',
      type: 'list',
      dataProvider: this.getActiveExperimentsData.bind(this),
      refreshInterval: 5000
    });
    
    this.registerPanel('agent-list', {
      name: 'Agent List',
      description: 'List of all registered agents',
      type: 'list',
      dataProvider: this.getAgentListData.bind(this),
      refreshInterval: 5000
    });
    
    this.registerPanel('agent-details', {
      name: 'Agent Details',
      description: 'Detailed information about selected agent',
      type: 'details',
      dataProvider: this.getAgentDetailsData.bind(this),
      refreshInterval: 2000
    });
    
    this.registerPanel('agent-configuration', {
      name: 'Agent Configuration',
      description: 'Configuration interface for selected agent',
      type: 'form',
      dataProvider: this.getAgentConfigurationData.bind(this),
      actionHandler: this.handleAgentConfigurationAction.bind(this),
      refreshInterval: 0 // Only refresh on demand
    });
    
    this.registerPanel('metrics-overview', {
      name: 'Metrics Overview',
      description: 'Overview of all performance metrics',
      type: 'grid',
      dataProvider: this.getMetricsOverviewData.bind(this),
      refreshInterval: 10000
    });
    
    this.registerPanel('performance-charts', {
      name: 'Performance Charts',
      description: 'Visualizations of performance metrics',
      type: 'charts',
      dataProvider: this.getPerformanceChartsData.bind(this),
      refreshInterval: 10000
    });
    
    this.registerPanel('leaderboards', {
      name: 'Leaderboards',
      description: 'Agent rankings and leaderboards',
      type: 'leaderboard',
      dataProvider: this.getLeaderboardsData.bind(this),
      refreshInterval: 30000
    });
    
    this.registerPanel('experiment-list', {
      name: 'Experiment List',
      description: 'List of all experiments',
      type: 'list',
      dataProvider: this.getExperimentListData.bind(this),
      refreshInterval: 10000
    });
    
    this.registerPanel('experiment-details', {
      name: 'Experiment Details',
      description: 'Detailed information about selected experiment',
      type: 'details',
      dataProvider: this.getExperimentDetailsData.bind(this),
      refreshInterval: 5000
    });
    
    this.registerPanel('experiment-results', {
      name: 'Experiment Results',
      description: 'Results and analysis of selected experiment',
      type: 'results',
      dataProvider: this.getExperimentResultsData.bind(this),
      refreshInterval: 10000
    });
    
    this.registerPanel('system-settings', {
      name: 'System Settings',
      description: 'Global system configuration',
      type: 'form',
      dataProvider: this.getSystemSettingsData.bind(this),
      actionHandler: this.handleSystemSettingsAction.bind(this),
      refreshInterval: 0 // Only refresh on demand
    });
    
    this.registerPanel('dashboard-settings', {
      name: 'Dashboard Settings',
      description: 'Dashboard configuration',
      type: 'form',
      dataProvider: this.getDashboardSettingsData.bind(this),
      actionHandler: this.handleDashboardSettingsAction.bind(this),
      refreshInterval: 0 // Only refresh on demand
    });
    
    this.registerPanel('user-preferences', {
      name: 'User Preferences',
      description: 'User-specific preferences',
      type: 'form',
      dataProvider: this.getUserPreferencesData.bind(this),
      actionHandler: this.handleUserPreferencesAction.bind(this),
      refreshInterval: 0 // Only refresh on demand
    });
    
    // Set active view
    this.setActiveView(this.options.defaultView);
    
    // Start auto-refresh if enabled
    if (this.options.autoRefresh) {
      this.startAutoRefresh();
    }
  }
  
  /**
   * Register a new view
   * @param {string} id - View ID
   * @param {object} definition - View definition
   * @returns {boolean} Registration success
   */
  registerView(id, definition) {
    if (this.views.has(id)) {
      this.logger.warn(`View ${id} already exists, overwriting`);
    }
    
    this.views.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      icon: definition.icon || 'default',
      panels: definition.panels || [],
      layout: definition.layout || 'default',
      permissions: definition.permissions || ['user'],
      metadata: definition.metadata || {}
    });
    
    return true;
  }
  
  /**
   * Register a new panel
   * @param {string} id - Panel ID
   * @param {object} definition - Panel definition
   * @returns {boolean} Registration success
   */
  registerPanel(id, definition) {
    if (this.panels.has(id)) {
      this.logger.warn(`Panel ${id} already exists, overwriting`);
    }
    
    this.panels.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      type: definition.type || 'custom',
      dataProvider: definition.dataProvider || (() => ({})),
      actionHandler: definition.actionHandler || (() => ({})),
      refreshInterval: definition.refreshInterval !== undefined ? definition.refreshInterval : this.options.refreshInterval,
      permissions: definition.permissions || ['user'],
      metadata: definition.metadata || {}
    });
    
    return true;
  }
  
  /**
   * Set active view
   * @param {string} viewId - View ID
   * @returns {object} Active view
   */
  setActiveView(viewId) {
    if (!this.views.has(viewId)) {
      this.logger.error(`Unknown view: ${viewId}`);
      return null;
    }
    
    this.activeView = this.views.get(viewId);
    this.emit('viewChanged', { view: this.activeView });
    
    return this.activeView;
  }
  
  /**
   * Get active view
   * @returns {object} Active view
   */
  getActiveView() {
    return this.activeView;
  }
  
  /**
   * Get all views
   * @returns {Array<object>} All views
   */
  getAllViews() {
    return Array.from(this.views.values());
  }
  
  /**
   * Get panel by ID
   * @param {string} id - Panel ID
   * @returns {object} Panel definition
   */
  getPanel(id) {
    return this.panels.get(id) || null;
  }
  
  /**
   * Get all panels
   * @returns {Array<object>} All panels
   */
  getAllPanels() {
    return Array.from(this.panels.values());
  }
  
  /**
   * Get panels for active view
   * @returns {Array<object>} Panels for active view
   */
  getActivePanels() {
    if (!this.activeView) {
      return [];
    }
    
    return this.activeView.panels
      .map(id => this.panels.get(id))
      .filter(panel => panel !== undefined);
  }
  
  /**
   * Refresh dashboard data
   * @param {boolean} force - Force refresh all panels
   * @returns {Promise<object>} Refresh result
   */
  async refreshData(force = false) {
    if (!this.activeView) {
      return { success: false, message: 'No active view' };
    }
    
    const panels = this.getActivePanels();
    const refreshResults = {};
    
    for (const panel of panels) {
      // Skip panels with no refresh interval unless forced
      if (panel.refreshInterval === 0 && !force) {
        continue;
      }
      
      try {
        const data = await panel.dataProvider();
        this.emit('panelDataUpdated', { panelId: panel.id, data });
        refreshResults[panel.id] = { success: true, data };
      } catch (error) {
        this.logger.error(`Error refreshing panel ${panel.id}: ${error.message}`, error);
        refreshResults[panel.id] = { success: false, error: error.message };
      }
    }
    
    this.emit('dashboardRefreshed', { timestamp: Date.now(), results: refreshResults });
    
    return {
      success: true,
      timestamp: Date.now(),
      results: refreshResults
    };
  }
  
  /**
   * Start auto-refresh
   * @returns {boolean} Success
   */
  startAutoRefresh() {
    if (this.refreshTimer) {
      return false;
    }
    
    this.refreshTimer = setInterval(() => {
      this.refreshData();
    }, this.options.refreshInterval);
    
    return true;
  }
  
  /**
   * Stop auto-refresh
   * @returns {boolean} Success
   */
  stopAutoRefresh() {
    if (!this.refreshTimer) {
      return false;
    }
    
    clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    
    return true;
  }
  
  /**
   * Register an agent
   * @param {string} id - Agent ID
   * @param {object} agent - Agent object
   * @returns {boolean} Registration success
   */
  registerAgent(id, agent) {
    this.data.agents.set(id, {
      id,
      name: agent.name || id,
      type: agent.type || 'unknown',
      status: agent.status || 'idle',
      lastActive: agent.lastActive || Date.now(),
      metadata: agent.metadata || {},
      configuration: agent.configuration || {},
      metrics: agent.metrics || {},
      history: agent.history || []
    });
    
    this.emit('agentRegistered', { agentId: id });
    
    return true;
  }
  
  /**
   * Update agent data
   * @param {string} id - Agent ID
   * @param {object} data - Agent data to update
   * @returns {boolean} Update success
   */
  updateAgentData(id, data) {
    if (!this.data.agents.has(id)) {
      return false;
    }
    
    const agent = this.data.agents.get(id);
    
    // Update fields
    Object.assign(agent, data);
    
    // Update last active timestamp
    agent.lastActive = Date.now();
    
    // Add to history if metrics changed
    if (data.metrics) {
      agent.history.push({
        timestamp: Date.now(),
        metrics: { ...data.metrics }
      });
      
      // Limit history size
      if (agent.history.length > this.options.maxHistoryPoints) {
        agent.history.shift();
      }
    }
    
    this.emit('agentUpdated', { agentId: id, data });
    
    return true;
  }
  
  /**
   * Get agent data
   * @param {string} id - Agent ID
   * @returns {object|null} Agent data
   */
  getAgentData(id) {
    return this.data.agents.get(id) || null;
  }
  
  /**
   * Get all agents
   * @returns {Array<object>} All agents
   */
  getAllAgents() {
    return Array.from(this.data.agents.values());
  }
  
  /**
   * Register a metric
   * @param {string} id - Metric ID
   * @param {object} definition - Metric definition
   * @returns {boolean} Registration success
   */
  registerMetric(id, definition) {
    this.data.metrics.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      unit: definition.unit || '',
      format: definition.format || 'number',
      domain: definition.domain || [0, 100],
      higherIsBetter: definition.higherIsBetter !== undefined ? definition.higherIsBetter : true,
      history: []
    });
    
    this.emit('metricRegistered', { metricId: id });
    
    return true;
  }
  
  /**
   * Record metric value
   * @param {string} id - Metric ID
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   * @returns {boolean} Recording success
   */
  recordMetricValue(id, value, metadata = {}) {
    if (!this.data.metrics.has(id)) {
      return false;
    }
    
    const metric = this.data.metrics.get(id);
    
    // Add to history
    metric.history.push({
      timestamp: metadata.timestamp || Date.now(),
      value,
      metadata
    });
    
    // Limit history size
    if (metric.history.length > this.options.maxHistoryPoints) {
      metric.history.shift();
    }
    
    this.emit('metricRecorded', { metricId: id, value, metadata });
    
    return true;
  }
  
  /**
   * Get metric data
   * @param {string} id - Metric ID
   * @returns {object|null} Metric data
   */
  getMetricData(id) {
    return this.data.metrics.get(id) || null;
  }
  
  /**
   * Get all metrics
   * @returns {Array<object>} All metrics
   */
  getAllMetrics() {
    return Array.from(this.data.metrics.values());
  }
  
  /**
   * Register an experiment
   * @param {string} id - Experiment ID
   * @param {object} experiment - Experiment object
   * @returns {boolean} Registration success
   */
  registerExperiment(id, experiment) {
    this.data.experiments.set(id, {
      id,
      name: experiment.name || id,
      description: experiment.description || '',
      status: experiment.status || 'created',
      startTime: experiment.startTime || null,
      endTime: experiment.endTime || null,
      configuration: experiment.configuration || {},
      results: experiment.results || {},
      agents: experiment.agents || [],
      metadata: experiment.metadata || {}
    });
    
    this.emit('experimentRegistered', { experimentId: id });
    
    return true;
  }
  
  /**
   * Update experiment data
   * @param {string} id - Experiment ID
   * @param {object} data - Experiment data to update
   * @returns {boolean} Update success
   */
  updateExperimentData(id, data) {
    if (!this.data.experiments.has(id)) {
      return false;
    }
    
    const experiment = this.data.experiments.get(id);
    
    // Update fields
    Object.assign(experiment, data);
    
    this.emit('experimentUpdated', { experimentId: id, data });
    
    return true;
  }
  
  /**
   * Get experiment data
   * @param {string} id - Experiment ID
   * @returns {object|null} Experiment data
   */
  getExperimentData(id) {
    return this.data.experiments.get(id) || null;
  }
  
  /**
   * Get all experiments
   * @returns {Array<object>} All experiments
   */
  getAllExperiments() {
    return Array.from(this.data.experiments.values());
  }
  
  /**
   * Register a configuration
   * @param {string} id - Configuration ID
   * @param {object} configuration - Configuration object
   * @returns {boolean} Registration success
   */
  registerConfiguration(id, configuration) {
    this.data.configurations.set(id, {
      id,
      name: configuration.name || id,
      description: configuration.description || '',
      parameters: configuration.parameters || {},
      schema: configuration.schema || {},
      metadata: configuration.metadata || {}
    });
    
    this.emit('configurationRegistered', { configurationId: id });
    
    return true;
  }
  
  /**
   * Update configuration data
   * @param {string} id - Configuration ID
   * @param {object} data - Configuration data to update
   * @returns {boolean} Update success
   */
  updateConfigurationData(id, data) {
    if (!this.data.configurations.has(id)) {
      return false;
    }
    
    const configuration = this.data.configurations.get(id);
    
    // Update fields
    Object.assign(configuration, data);
    
    this.emit('configurationUpdated', { configurationId: id, data });
    
    return true;
  }
  
  /**
   * Get configuration data
   * @param {string} id - Configuration ID
   * @returns {object|null} Configuration data
   */
  getConfigurationData(id) {
    return this.data.configurations.get(id) || null;
  }
  
  /**
   * Get all configurations
   * @returns {Array<object>} All configurations
   */
  getAllConfigurations() {
    return Array.from(this.data.configurations.values());
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
  
  /**
   * Handle action
   * @param {string} panelId - Panel ID
   * @param {string} action - Action name
   * @param {object} data - Action data
   * @returns {Promise<object>} Action result
   */
  async handleAction(panelId, action, data = {}) {
    const panel = this.panels.get(panelId);
    
    if (!panel) {
      return {
        success: false,
        message: `Unknown panel: ${panelId}`
      };
    }
    
    if (!panel.actionHandler) {
      return {
        success: false,
        message: `Panel ${panelId} does not support actions`
      };
    }
    
    try {
      const result = await panel.actionHandler(action, data);
      
      this.emit('actionHandled', {
        panelId,
        action,
        data,
        result
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Error handling action ${action} for panel ${panelId}: ${error.message}`, error);
      
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // Data provider methods for panels
  
  /**
   * Get agent summary data
   * @returns {object} Agent summary data
   */
  getAgentSummaryData() {
    const agents = this.getAllAgents();
    
    // Count agents by status
    const statusCounts = {};
    for (const agent of agents) {
      statusCounts[agent.status] = (statusCounts[agent.status] || 0) + 1;
    }
    
    // Count agents by type
    const typeCounts = {};
    for (const agent of agents) {
      typeCounts[agent.type] = (typeCounts[agent.type] || 0) + 1;
    }
    
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      statusCounts,
      typeCounts,
      recentlyActive: agents
        .filter(a => Date.now() - a.lastActive < 3600000) // Active in last hour
        .sort((a, b) => b.lastActive - a.lastActive)
        .slice(0, 5)
    };
  }
  
  /**
   * Get performance summary data
   * @returns {object} Performance summary data
   */
  getPerformanceSummaryData() {
    const metrics = this.getAllMetrics();
    
    // Get latest values for key metrics
    const keyMetrics = {};
    for (const metric of metrics) {
      if (metric.history.length > 0) {
        const latest = metric.history[metric.history.length - 1];
        keyMetrics[metric.id] = {
          name: metric.name,
          value: latest.value,
          unit: metric.unit,
          timestamp: latest.timestamp
        };
      }
    }
    
    return {
      keyMetrics,
      totalMetrics: metrics.length,
      recentlyUpdated: metrics
        .filter(m => m.history.length > 0)
        .sort((a, b) => {
          const aLatest = a.history[a.history.length - 1].timestamp;
          const bLatest = b.history[b.history.length - 1].timestamp;
          return bLatest - aLatest;
        })
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          name: m.name,
          value: m.history[m.history.length - 1].value,
          unit: m.unit,
          timestamp: m.history[m.history.length - 1].timestamp
        }))
    };
  }
  
  /**
   * Get active experiments data
   * @returns {object} Active experiments data
   */
  getActiveExperimentsData() {
    const experiments = this.getAllExperiments();
    
    // Filter active experiments
    const activeExperiments = experiments.filter(e => e.status === 'running');
    
    return {
      activeExperiments: activeExperiments.map(e => ({
        id: e.id,
        name: e.name,
        startTime: e.startTime,
        duration: e.startTime ? Date.now() - e.startTime : 0,
        agentCount: e.agents.length,
        progress: e.metadata.progress || 0
      })),
      totalActive: activeExperiments.length,
      totalExperiments: experiments.length
    };
  }
  
  /**
   * Get agent list data
   * @returns {object} Agent list data
   */
  getAgentListData() {
    const agents = this.getAllAgents();
    
    return {
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        status: a.status,
        lastActive: a.lastActive
      })),
      totalAgents: agents.length
    };
  }
  
  /**
   * Get agent details data
   * @returns {object} Agent details data
   */
  getAgentDetailsData() {
    // This would typically use a selected agent ID from state
    const selectedAgentId = this.selectedAgentId;
    
    if (!selectedAgentId || !this.data.agents.has(selectedAgentId)) {
      return {
        agent: null,
        metrics: [],
        experiments: []
      };
    }
    
    const agent = this.data.agents.get(selectedAgentId);
    
    // Get experiments for this agent
    const experiments = this.getAllExperiments()
      .filter(e => e.agents.includes(selectedAgentId))
      .map(e => ({
        id: e.id,
        name: e.name,
        status: e.status,
        startTime: e.startTime,
        endTime: e.endTime
      }));
    
    return {
      agent,
      metrics: Object.entries(agent.metrics).map(([key, value]) => ({
        key,
        value,
        history: agent.history
          .filter(h => h.metrics[key] !== undefined)
          .map(h => ({
            timestamp: h.timestamp,
            value: h.metrics[key]
          }))
      })),
      experiments
    };
  }
  
  /**
   * Get agent configuration data
   * @returns {object} Agent configuration data
   */
  getAgentConfigurationData() {
    // This would typically use a selected agent ID from state
    const selectedAgentId = this.selectedAgentId;
    
    if (!selectedAgentId || !this.data.agents.has(selectedAgentId)) {
      return {
        agent: null,
        configuration: null,
        schema: null
      };
    }
    
    const agent = this.data.agents.get(selectedAgentId);
    
    // Get configuration schema if available
    let schema = null;
    if (agent.type && this.data.configurations.has(`${agent.type}-schema`)) {
      schema = this.data.configurations.get(`${agent.type}-schema`).schema;
    }
    
    return {
      agent: {
        id: agent.id,
        name: agent.name,
        type: agent.type
      },
      configuration: agent.configuration,
      schema
    };
  }
  
  /**
   * Handle agent configuration action
   * @param {string} action - Action name
   * @param {object} data - Action data
   * @returns {Promise<object>} Action result
   */
  async handleAgentConfigurationAction(action, data) {
    switch (action) {
      case 'updateConfiguration':
        if (!data.agentId || !data.configuration) {
          return {
            success: false,
            message: 'Missing agentId or configuration'
          };
        }
        
        if (!this.data.agents.has(data.agentId)) {
          return {
            success: false,
            message: `Unknown agent: ${data.agentId}`
          };
        }
        
        // Update agent configuration
        const agent = this.data.agents.get(data.agentId);
        agent.configuration = data.configuration;
        
        this.emit('agentConfigurationUpdated', {
          agentId: data.agentId,
          configuration: data.configuration
        });
        
        return {
          success: true,
          message: 'Configuration updated'
        };
        
      case 'resetConfiguration':
        if (!data.agentId) {
          return {
            success: false,
            message: 'Missing agentId'
          };
        }
        
        if (!this.data.agents.has(data.agentId)) {
          return {
            success: false,
            message: `Unknown agent: ${data.agentId}`
          };
        }
        
        // Reset agent configuration to defaults
        const resetAgent = this.data.agents.get(data.agentId);
        
        // Get default configuration if available
        let defaultConfig = {};
        if (resetAgent.type && this.data.configurations.has(`${resetAgent.type}-defaults`)) {
          defaultConfig = this.data.configurations.get(`${resetAgent.type}-defaults`).parameters;
        }
        
        resetAgent.configuration = defaultConfig;
        
        this.emit('agentConfigurationReset', {
          agentId: data.agentId,
          configuration: defaultConfig
        });
        
        return {
          success: true,
          message: 'Configuration reset to defaults'
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`
        };
    }
  }
  
  /**
   * Get metrics overview data
   * @returns {object} Metrics overview data
   */
  getMetricsOverviewData() {
    const metrics = this.getAllMetrics();
    
    return {
      metrics: metrics.map(m => {
        const latestValue = m.history.length > 0
          ? m.history[m.history.length - 1].value
          : null;
          
        const previousValue = m.history.length > 1
          ? m.history[m.history.length - 2].value
          : null;
          
        const change = latestValue !== null && previousValue !== null
          ? latestValue - previousValue
          : null;
          
        const percentChange = latestValue !== null && previousValue !== null && previousValue !== 0
          ? (change / Math.abs(previousValue)) * 100
          : null;
        
        return {
          id: m.id,
          name: m.name,
          description: m.description,
          unit: m.unit,
          format: m.format,
          latestValue,
          change,
          percentChange,
          improving: change !== null
            ? (m.higherIsBetter ? change > 0 : change < 0)
            : null,
          timestamp: m.history.length > 0
            ? m.history[m.history.length - 1].timestamp
            : null
        };
      }),
      totalMetrics: metrics.length
    };
  }
  
  /**
   * Get performance charts data
   * @returns {object} Performance charts data
   */
  getPerformanceChartsData() {
    const metrics = this.getAllMetrics();
    
    // Get time series data for each metric
    const timeSeriesData = {};
    for (const metric of metrics) {
      if (metric.history.length > 0) {
        timeSeriesData[metric.id] = {
          name: metric.name,
          unit: metric.unit,
          format: metric.format,
          domain: metric.domain,
          data: metric.history.map(h => ({
            timestamp: h.timestamp,
            value: h.value
          }))
        };
      }
    }
    
    // Get agent performance data
    const agents = this.getAllAgents();
    const agentPerformance = {};
    
    for (const agent of agents) {
      if (agent.history.length > 0) {
        const metricIds = Object.keys(agent.metrics);
        
        agentPerformance[agent.id] = {
          name: agent.name,
          type: agent.type,
          metrics: {}
        };
        
        for (const metricId of metricIds) {
          agentPerformance[agent.id].metrics[metricId] = agent.history
            .filter(h => h.metrics[metricId] !== undefined)
            .map(h => ({
              timestamp: h.timestamp,
              value: h.metrics[metricId]
            }));
        }
      }
    }
    
    return {
      timeSeriesData,
      agentPerformance
    };
  }
  
  /**
   * Get leaderboards data
   * @returns {object} Leaderboards data
   */
  getLeaderboardsData() {
    // This would typically come from a Leaderboard component
    // For now, we'll generate some sample data
    
    const agents = this.getAllAgents();
    
    // Create sample leaderboards
    const leaderboards = {
      overall: {
        name: 'Overall Performance',
        entries: agents.map(a => ({
          agentId: a.id,
          agentName: a.name,
          score: a.metrics.overallScore || Math.random() * 100,
          timestamp: Date.now() - Math.random() * 86400000
        })).sort((a, b) => b.score - a.score)
      },
      learning: {
        name: 'Learning Speed',
        entries: agents.map(a => ({
          agentId: a.id,
          agentName: a.name,
          score: a.metrics.learningSpeed || Math.random() * 100,
          timestamp: Date.now() - Math.random() * 86400000
        })).sort((a, b) => b.score - a.score)
      },
      efficiency: {
        name: 'Efficiency',
        entries: agents.map(a => ({
          agentId: a.id,
          agentName: a.name,
          score: a.metrics.efficiency || Math.random() * 100,
          timestamp: Date.now() - Math.random() * 86400000
        })).sort((a, b) => b.score - a.score)
      }
    };
    
    return {
      leaderboards,
      categories: Object.keys(leaderboards)
    };
  }
  
  /**
   * Get experiment list data
   * @returns {object} Experiment list data
   */
  getExperimentListData() {
    const experiments = this.getAllExperiments();
    
    return {
      experiments: experiments.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        status: e.status,
        startTime: e.startTime,
        endTime: e.endTime,
        duration: e.startTime && e.endTime ? e.endTime - e.startTime : null,
        agentCount: e.agents.length
      })),
      totalExperiments: experiments.length,
      statusCounts: experiments.reduce((counts, e) => {
        counts[e.status] = (counts[e.status] || 0) + 1;
        return counts;
      }, {})
    };
  }
  
  /**
   * Get experiment details data
   * @returns {object} Experiment details data
   */
  getExperimentDetailsData() {
    // This would typically use a selected experiment ID from state
    const selectedExperimentId = this.selectedExperimentId;
    
    if (!selectedExperimentId || !this.data.experiments.has(selectedExperimentId)) {
      return {
        experiment: null,
        agents: []
      };
    }
    
    const experiment = this.data.experiments.get(selectedExperimentId);
    
    // Get agents in this experiment
    const agents = experiment.agents
      .map(agentId => this.data.agents.get(agentId))
      .filter(agent => agent !== undefined)
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status
      }));
    
    return {
      experiment,
      agents
    };
  }
  
  /**
   * Get experiment results data
   * @returns {object} Experiment results data
   */
  getExperimentResultsData() {
    // This would typically use a selected experiment ID from state
    const selectedExperimentId = this.selectedExperimentId;
    
    if (!selectedExperimentId || !this.data.experiments.has(selectedExperimentId)) {
      return {
        experiment: null,
        results: null
      };
    }
    
    const experiment = this.data.experiments.get(selectedExperimentId);
    
    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        startTime: experiment.startTime,
        endTime: experiment.endTime
      },
      results: experiment.results
    };
  }
  
  /**
   * Get system settings data
   * @returns {object} System settings data
   */
  getSystemSettingsData() {
    // This would typically come from a system configuration
    return {
      settings: {
        maxAgents: 100,
        maxExperiments: 50,
        dataRetentionDays: 30,
        loggingLevel: 'info',
        autoSave: true,
        backupEnabled: true,
        backupInterval: 86400000 // 1 day
      },
      schema: {
        maxAgents: {
          type: 'number',
          min: 1,
          max: 1000,
          default: 100
        },
        maxExperiments: {
          type: 'number',
          min: 1,
          max: 100,
          default: 50
        },
        dataRetentionDays: {
          type: 'number',
          min: 1,
          max: 365,
          default: 30
        },
        loggingLevel: {
          type: 'select',
          options: ['debug', 'info', 'warn', 'error'],
          default: 'info'
        },
        autoSave: {
          type: 'boolean',
          default: true
        },
        backupEnabled: {
          type: 'boolean',
          default: true
        },
        backupInterval: {
          type: 'number',
          min: 3600000, // 1 hour
          max: 604800000, // 1 week
          default: 86400000 // 1 day
        }
      }
    };
  }
  
  /**
   * Handle system settings action
   * @param {string} action - Action name
   * @param {object} data - Action data
   * @returns {Promise<object>} Action result
   */
  async handleSystemSettingsAction(action, data) {
    switch (action) {
      case 'updateSettings':
        if (!data.settings) {
          return {
            success: false,
            message: 'Missing settings'
          };
        }
        
        // Update system settings
        // This would typically update a system configuration
        
        this.emit('systemSettingsUpdated', {
          settings: data.settings
        });
        
        return {
          success: true,
          message: 'System settings updated'
        };
        
      case 'resetSettings':
        // Reset system settings to defaults
        // This would typically reset a system configuration
        
        this.emit('systemSettingsReset', {});
        
        return {
          success: true,
          message: 'System settings reset to defaults'
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`
        };
    }
  }
  
  /**
   * Get dashboard settings data
   * @returns {object} Dashboard settings data
   */
  getDashboardSettingsData() {
    return {
      settings: {
        refreshInterval: this.options.refreshInterval,
        maxHistoryPoints: this.options.maxHistoryPoints,
        defaultView: this.options.defaultView,
        autoRefresh: this.options.autoRefresh,
        theme: 'light',
        layout: 'default'
      },
      schema: {
        refreshInterval: {
          type: 'number',
          min: 1000,
          max: 60000,
          default: 5000
        },
        maxHistoryPoints: {
          type: 'number',
          min: 10,
          max: 1000,
          default: 100
        },
        defaultView: {
          type: 'select',
          options: Array.from(this.views.keys()),
          default: 'overview'
        },
        autoRefresh: {
          type: 'boolean',
          default: true
        },
        theme: {
          type: 'select',
          options: ['light', 'dark', 'system'],
          default: 'light'
        },
        layout: {
          type: 'select',
          options: ['default', 'compact', 'expanded'],
          default: 'default'
        }
      }
    };
  }
  
  /**
   * Handle dashboard settings action
   * @param {string} action - Action name
   * @param {object} data - Action data
   * @returns {Promise<object>} Action result
   */
  async handleDashboardSettingsAction(action, data) {
    switch (action) {
      case 'updateSettings':
        if (!data.settings) {
          return {
            success: false,
            message: 'Missing settings'
          };
        }
        
        // Update dashboard settings
        if (data.settings.refreshInterval !== undefined) {
          this.options.refreshInterval = data.settings.refreshInterval;
          
          // Restart auto-refresh if enabled
          if (this.refreshTimer) {
            this.stopAutoRefresh();
            this.startAutoRefresh();
          }
        }
        
        if (data.settings.maxHistoryPoints !== undefined) {
          this.options.maxHistoryPoints = data.settings.maxHistoryPoints;
        }
        
        if (data.settings.defaultView !== undefined) {
          this.options.defaultView = data.settings.defaultView;
        }
        
        if (data.settings.autoRefresh !== undefined) {
          this.options.autoRefresh = data.settings.autoRefresh;
          
          if (this.options.autoRefresh && !this.refreshTimer) {
            this.startAutoRefresh();
          } else if (!this.options.autoRefresh && this.refreshTimer) {
            this.stopAutoRefresh();
          }
        }
        
        this.emit('dashboardSettingsUpdated', {
          settings: data.settings
        });
        
        return {
          success: true,
          message: 'Dashboard settings updated'
        };
        
      case 'resetSettings':
        // Reset dashboard settings to defaults
        this.options = {
          ...this.options,
          refreshInterval: 5000,
          maxHistoryPoints: 100,
          defaultView: 'overview',
          autoRefresh: true
        };
        
        // Restart auto-refresh
        if (this.refreshTimer) {
          this.stopAutoRefresh();
        }
        
        if (this.options.autoRefresh) {
          this.startAutoRefresh();
        }
        
        this.emit('dashboardSettingsReset', {});
        
        return {
          success: true,
          message: 'Dashboard settings reset to defaults'
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`
        };
    }
  }
  
  /**
   * Get user preferences data
   * @returns {object} User preferences data
   */
  getUserPreferencesData() {
    // This would typically come from user preferences storage
    return {
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        notifications: true
      },
      schema: {
        theme: {
          type: 'select',
          options: ['light', 'dark', 'system'],
          default: 'light'
        },
        language: {
          type: 'select',
          options: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
          default: 'en'
        },
        timezone: {
          type: 'select',
          options: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'],
          default: 'UTC'
        },
        dateFormat: {
          type: 'select',
          options: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'],
          default: 'YYYY-MM-DD'
        },
        timeFormat: {
          type: 'select',
          options: ['12h', '24h'],
          default: '24h'
        },
        notifications: {
          type: 'boolean',
          default: true
        }
      }
    };
  }
  
  /**
   * Handle user preferences action
   * @param {string} action - Action name
   * @param {object} data - Action data
   * @returns {Promise<object>} Action result
   */
  async handleUserPreferencesAction(action, data) {
    switch (action) {
      case 'updatePreferences':
        if (!data.preferences) {
          return {
            success: false,
            message: 'Missing preferences'
          };
        }
        
        // Update user preferences
        // This would typically update user preferences storage
        
        this.emit('userPreferencesUpdated', {
          preferences: data.preferences
        });
        
        return {
          success: true,
          message: 'User preferences updated'
        };
        
      case 'resetPreferences':
        // Reset user preferences to defaults
        // This would typically reset user preferences storage
        
        this.emit('userPreferencesReset', {});
        
        return {
          success: true,
          message: 'User preferences reset to defaults'
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`
        };
    }
  }
}

module.exports = DevelopmentDashboard;
