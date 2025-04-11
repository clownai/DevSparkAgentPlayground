# User Interface in DevSparkAgent Playground

## Overview

This document provides a comprehensive guide to the user interface in the DevSparkAgent Playground. It covers the implementation details, components, visualization tools, and best practices for implementing and using the user interface to interact with and monitor agents in the playground.

## User Interface Framework

The user interface in DevSparkAgent Playground provides a visual and interactive way to create, manage, monitor, and evaluate agents. It is designed to be intuitive, responsive, and informative, enabling users to effectively work with the playground's capabilities.

### Core Components

#### Development Dashboard

The development dashboard provides a central interface for agent development:

- **Code Editor**: Integrated environment for writing agent code
- **Agent Management**: Tools for creating, configuring, and managing agents
- **Performance Monitoring**: Real-time metrics and status information
- **Debugging Tools**: Utilities for debugging agent behavior

#### Visualization Tools

Visualization tools provide graphical representations of agent behavior and data:

- **Behavior Visualization**: Visual representation of agent decision-making
- **Learning Progress**: Charts and graphs showing learning metrics over time
- **Interaction Networks**: Network diagrams showing agent interactions
- **Environment State**: Visual representation of environment state

#### Experiment Management

Experiment management tools facilitate systematic agent testing:

- **Experiment Configuration**: Interface for defining experiment parameters
- **Batch Processing**: Tools for running multiple experiments
- **Results Collection**: Automated collection and organization of results
- **Comparative Analysis**: Tools for comparing experiment outcomes

#### User Interface Components

The UI is built from reusable components:

- **Navigation**: Sidebar and top navigation for accessing different sections
- **Cards**: Container components for displaying information
- **Charts**: Data visualization components
- **Forms**: Input components for configuration
- **Tables**: Tabular data display components
- **Modals**: Dialog components for focused interactions

### Integration with Other Components

The user interface integrates with other playground components:

- **Runtime Environment**: For executing and monitoring agent code
- **Agent Interaction**: For visualizing agent communication
- **Evolution System**: For configuring and monitoring evolution
- **Evaluation System**: For displaying evaluation results

## Implementation Details

### PlaygroundUI

The main UI component is implemented in `src/ui/PlaygroundUI.js`:

```javascript
/**
 * Main UI component for the DevSparkAgent Playground
 */
class PlaygroundUI {
  constructor(options = {}) {
    this.options = {
      containerId: 'playground-ui',
      theme: 'light',
      ...options
    };
    
    this.components = new Map();
    this.eventHandlers = new Map();
    this.state = {
      initialized: false,
      activeView: 'dashboard',
      agents: [],
      selectedAgentId: null,
      notifications: []
    };
    
    this.logger = logger.getLogger('playground-ui');
  }
  
  /**
   * Initialize the UI
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Create container if it doesn't exist
      const container = document.getElementById(this.options.containerId);
      
      if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = this.options.containerId;
        document.body.appendChild(newContainer);
      }
      
      // Apply theme
      document.body.classList.add(`theme-${this.options.theme}`);
      
      // Register core components
      this.registerComponent('navigation', new NavigationComponent());
      this.registerComponent('dashboard', new DashboardComponent());
      this.registerComponent('code-editor', new CodeEditorComponent());
      this.registerComponent('agent-manager', new AgentManagerComponent());
      this.registerComponent('visualization', new VisualizationComponent());
      this.registerComponent('experiment', new ExperimentComponent());
      this.registerComponent('evaluation', new EvaluationComponent());
      this.registerComponent('notification', new NotificationComponent());
      
      // Initialize components
      for (const [id, component] of this.components.entries()) {
        await component.initialize();
      }
      
      // Register event handlers
      this.registerEventHandler('agent-selected', this.handleAgentSelected.bind(this));
      this.registerEventHandler('view-changed', this.handleViewChanged.bind(this));
      this.registerEventHandler('notification', this.handleNotification.bind(this));
      
      // Set initialized state
      this.state.initialized = true;
      
      // Initial render
      await this.render();
      
      this.logger.info('PlaygroundUI initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize PlaygroundUI: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Render the UI
   * @param {HTMLElement} container - Container element (optional)
   * @returns {Promise<boolean>} True if rendering successful
   */
  async render(container = null) {
    if (!this.state.initialized) {
      throw new Error('PlaygroundUI not initialized');
    }
    
    try {
      // Get container
      const targetContainer = container || document.getElementById(this.options.containerId);
      
      if (!targetContainer) {
        throw new Error(`Container not found: ${this.options.containerId}`);
      }
      
      // Clear container
      targetContainer.innerHTML = '';
      
      // Create main layout
      const layout = document.createElement('div');
      layout.className = 'playground-layout';
      
      // Render navigation
      const navigationComponent = this.components.get('navigation');
      const navigationElement = await navigationComponent.render({
        activeView: this.state.activeView
      });
      layout.appendChild(navigationElement);
      
      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'playground-content';
      
      // Render active view
      const activeComponent = this.components.get(this.state.activeView);
      
      if (activeComponent) {
        const viewElement = await activeComponent.render({
          agents: this.state.agents,
          selectedAgentId: this.state.selectedAgentId
        });
        contentContainer.appendChild(viewElement);
      } else {
        contentContainer.innerHTML = `<div class="error-message">View not found: ${this.state.activeView}</div>`;
      }
      
      layout.appendChild(contentContainer);
      
      // Render notifications
      const notificationComponent = this.components.get('notification');
      const notificationElement = await notificationComponent.render({
        notifications: this.state.notifications
      });
      layout.appendChild(notificationElement);
      
      // Add layout to container
      targetContainer.appendChild(layout);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to render PlaygroundUI: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Update the UI
   * @returns {Promise<boolean>} True if update successful
   */
  async update() {
    return this.render();
  }
  
  /**
   * Register a UI component
   * @param {string} id - Component ID
   * @param {object} component - Component object
   * @returns {Promise<boolean>} True if registration successful
   */
  async registerComponent(id, component) {
    if (this.components.has(id)) {
      this.logger.warn(`Component already registered: ${id}`);
      return false;
    }
    
    this.components.set(id, component);
    this.logger.info(`Registered component: ${id}`);
    return true;
  }
  
  /**
   * Unregister a UI component
   * @param {string} id - Component ID
   * @returns {Promise<boolean>} True if unregistration successful
   */
  async unregisterComponent(id) {
    if (!this.components.has(id)) {
      this.logger.warn(`Component not found: ${id}`);
      return false;
    }
    
    this.components.delete(id);
    this.logger.info(`Unregistered component: ${id}`);
    return true;
  }
  
  /**
   * Register an event handler
   * @param {string} eventType - Event type
   * @param {function} handler - Event handler function
   * @returns {Promise<boolean>} True if registration successful
   */
  async registerEventHandler(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType).push(handler);
    this.logger.info(`Registered event handler for: ${eventType}`);
    return true;
  }
  
  /**
   * Unregister an event handler
   * @param {string} eventType - Event type
   * @param {function} handler - Event handler function
   * @returns {Promise<boolean>} True if unregistration successful
   */
  async unregisterEventHandler(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.logger.warn(`Event type not found: ${eventType}`);
      return false;
    }
    
    const handlers = this.eventHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    
    if (index >= 0) {
      handlers.splice(index, 1);
      this.logger.info(`Unregistered event handler for: ${eventType}`);
      return true;
    } else {
      this.logger.warn(`Handler not found for event type: ${eventType}`);
      return false;
    }
  }
  
  /**
   * Trigger an event
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   * @returns {Promise<boolean>} True if event triggered successfully
   */
  async triggerEvent(eventType, data = {}) {
    if (!this.eventHandlers.has(eventType)) {
      this.logger.warn(`No handlers for event type: ${eventType}`);
      return false;
    }
    
    const handlers = this.eventHandlers.get(eventType);
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error(`Error in event handler for ${eventType}: ${error.message}`, error);
      }
    }
    
    return true;
  }
  
  /**
   * Show a dialog
   * @param {string} title - Dialog title
   * @param {string} content - Dialog content
   * @param {Array<object>} buttons - Array of button objects
   * @returns {Promise<string>} ID of clicked button
   */
  async showDialog(title, content, buttons) {
    return new Promise((resolve) => {
      // Create dialog element
      const dialog = document.createElement('div');
      dialog.className = 'playground-dialog';
      
      // Create dialog content
      dialog.innerHTML = `
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>${title}</h2>
            <button class="close-button" data-id="close">×</button>
          </div>
          <div class="dialog-body">
            ${content}
          </div>
          <div class="dialog-footer">
            ${buttons.map(button => `
              <button class="dialog-button" data-id="${button.id}">${button.label}</button>
            `).join('')}
          </div>
        </div>
      `;
      
      // Add dialog to body
      document.body.appendChild(dialog);
      
      // Add event listeners
      const handleClick = (event) => {
        const button = event.target.closest('button');
        
        if (button) {
          const buttonId = button.getAttribute('data-id');
          
          // Remove dialog
          document.body.removeChild(dialog);
          
          // Remove event listener
          dialog.removeEventListener('click', handleClick);
          
          // Resolve promise
          resolve(buttonId);
        }
      };
      
      dialog.addEventListener('click', handleClick);
    });
  }
  
  /**
   * Show a notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {number} duration - Notification duration in milliseconds
   * @returns {Promise<boolean>} True if notification shown successfully
   */
  async showNotification(message, type = 'info', duration = 3000) {
    // Add notification to state
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };
    
    this.state.notifications.push(notification);
    
    // Update UI
    await this.update();
    
    // Remove notification after duration
    setTimeout(async () => {
      this.state.notifications = this.state.notifications.filter(n => n.id !== notification.id);
      await this.update();
    }, duration);
    
    return true;
  }
  
  // Event handlers
  
  /**
   * Handle agent selected event
   * @param {object} data - Event data
   */
  async handleAgentSelected(data) {
    this.state.selectedAgentId = data.agentId;
    await this.update();
  }
  
  /**
   * Handle view changed event
   * @param {object} data - Event data
   */
  async handleViewChanged(data) {
    this.state.activeView = data.view;
    await this.update();
  }
  
  /**
   * Handle notification event
   * @param {object} data - Event data
   */
  async handleNotification(data) {
    await this.showNotification(data.message, data.type, data.duration);
  }
}
```

### UI Components

#### Dashboard Component

```javascript
/**
 * Dashboard component for the playground UI
 */
class DashboardComponent {
  constructor() {
    this.state = {
      initialized: false,
      agentStats: {
        total: 0,
        active: 0,
        learning: 0
      },
      systemStats: {
        cpuUsage: 0,
        memoryUsage: 0,
        containerCount: 0
      },
      recentActivities: []
    };
  }
  
  /**
   * Initialize the component
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    this.state.initialized = true;
    return true;
  }
  
  /**
   * Render the component
   * @param {object} props - Component properties
   * @returns {Promise<HTMLElement>} Rendered element
   */
  async render(props) {
    // Update state with props
    this.state.agentStats.total = props.agents.length;
    this.state.agentStats.active = props.agents.filter(a => a.status === 'active').length;
    this.state.agentStats.learning = props.agents.filter(a => a.learning).length;
    
    // Get system stats
    await this.updateSystemStats();
    
    // Create dashboard element
    const dashboard = document.createElement('div');
    dashboard.className = 'dashboard';
    
    // Add content
    dashboard.innerHTML = `
      <h1>DevSparkAgent Playground Dashboard</h1>
      
      <div class="stats-container">
        <div class="stats-card">
          <h2>Agent Statistics</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${this.state.agentStats.total}</div>
              <div class="stat-label">Total Agents</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.state.agentStats.active}</div>
              <div class="stat-label">Active Agents</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.state.agentStats.learning}</div>
              <div class="stat-label">Learning Agents</div>
            </div>
          </div>
        </div>
        
        <div class="stats-card">
          <h2>System Statistics</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${this.state.systemStats.cpuUsage.toFixed(1)}%</div>
              <div class="stat-label">CPU Usage</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.state.systemStats.memoryUsage.toFixed(1)}%</div>
              <div class="stat-label">Memory Usage</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.state.systemStats.containerCount}</div>
              <div class="stat-label">Containers</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="recent-activities">
        <h2>Recent Activities</h2>
        <div class="activity-list">
          ${this.state.recentActivities.map(activity => `
            <div class="activity-item">
              <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
              <div class="activity-description">${activity.description}</div>
            </div>
          `).join('') || '<div class="empty-message">No recent activities</div>'}
        </div>
      </div>
      
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="action-buttons">
          <button class="action-button" data-action="create-agent">Create Agent</button>
          <button class="action-button" data-action="run-experiment">Run Experiment</button>
          <button class="action-button" data-action="view-leaderboard">View Leaderboard</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const actionButtons = dashboard.querySelectorAll('.action-button');
    
    for (const button of actionButtons) {
      button.addEventListener('click', (event) => {
        const action = event.target.getAttribute('data-action');
        this.handleAction(action);
      });
    }
    
    return dashboard;
  }
  
  /**
   * Update system statistics
   * @returns {Promise<boolean>} True if update successful
   */
  async updateSystemStats() {
    try {
      // In a real implementation, this would get actual system stats
      // For now, we'll use placeholder values
      this.state.systemStats = {
        cpuUsage: Math.random() * 50 + 10,
        memoryUsage: Math.random() * 40 + 20,
        containerCount: Math.floor(Math.random() * 10) + 5
      };
      
      return true;
    } catch (error) {
      console.error('Failed to update system stats:', error);
      return false;
    }
  }
  
  /**
   * Handle action button click
   * @param {string} action - Action type
   */
  handleAction(action) {
    switch (action) {
      case 'create-agent':
        // Trigger event to switch to agent creation view
        window.dispatchEvent(new CustomEvent('view-changed', {
          detail: { view: 'agent-manager' }
        }));
        break;
        
      case 'run-experiment':
        // Trigger event to switch to experiment view
        window.dispatchEvent(new CustomEvent('view-changed', {
          detail: { view: 'experiment' }
        }));
        break;
        
      case 'view-leaderboard':
        // Trigger event to switch to evaluation view
        window.dispatchEvent(new CustomEvent('view-changed', {
          detail: { view: 'evaluation' }
        }));
        break;
    }
  }
  
  /**
   * Format timestamp to readable time
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
}
```

#### Visualization Component

```javascript
/**
 * Visualization component for the playground UI
 */
class VisualizationComponent {
  constructor() {
    this.state = {
      initialized: false,
      visualizationType: 'behavior',
      selectedAgentId: null,
      data: null
    };
  }
  
  /**
   * Initialize the component
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    this.state.initialized = true;
    return true;
  }
  
  /**
   * Render the component
   * @param {object} props - Component properties
   * @returns {Promise<HTMLElement>} Rendered element
   */
  async render(props) {
    // Update state with props
    this.state.selectedAgentId = props.selectedAgentId;
    
    // Create visualization element
    const visualization = document.createElement('div');
    visualization.className = 'visualization';
    
    // Add content
    visualization.innerHTML = `
      <h1>Agent Visualization</h1>
      
      <div class="visualization-controls">
        <div class="agent-selector">
          <label for="agent-select">Select Agent:</label>
          <select id="agent-select">
            <option value="">Select an agent</option>
            ${props.agents.map(agent => `
              <option value="${agent.id}" ${agent.id === this.state.selectedAgentId ? 'selected' : ''}>
                ${agent.name}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="visualization-type-selector">
          <label>Visualization Type:</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="visualization-type" value="behavior" 
                ${this.state.visualizationType === 'behavior' ? 'checked' : ''}>
              Behavior
            </label>
            <label>
              <input type="radio" name="visualization-type" value="learning" 
                ${this.state.visualizationType === 'learning' ? 'checked' : ''}>
              Learning Progress
            </label>
            <label>
              <input type="radio" name="visualization-type" value="interaction" 
                ${this.state.visualizationType === 'interaction' ? 'checked' : ''}>
              Interaction Network
            </label>
            <label>
              <input type="radio" name="visualization-type" value="environment" 
                ${this.state.visualizationType === 'environment' ? 'checked' : ''}>
              Environment State
            </label>
          </div>
        </div>
      </div>
      
      <div class="visualization-container">
        ${this.state.selectedAgentId 
          ? this.renderVisualization() 
          : '<div class="empty-message">Select an agent to visualize</div>'}
      </div>
    `;
    
    // Add event listeners
    const agentSelect = visualization.querySelector('#agent-select');
    agentSelect.addEventListener('change', (event) => {
      this.handleAgentChange(event.target.value);
    });
    
    const visualizationTypeInputs = visualization.querySelectorAll('input[name="visualization-type"]');
    for (const input of visualizationTypeInputs) {
      input.addEventListener('change', (event) => {
        if (event.target.checked) {
          this.handleVisualizationTypeChange(event.target.value);
        }
      });
    }
    
    return visualization;
  }
  
  /**
   * Render the visualization based on type
   * @returns {string} Visualization HTML
   */
  renderVisualization() {
    if (!this.state.selectedAgentId) {
      return '<div class="empty-message">Select an agent to visualize</div>';
    }
    
    switch (this.state.visualizationType) {
      case 'behavior':
        return this.renderBehaviorVisualization();
        
      case 'learning':
        return this.renderLearningVisualization();
        
      case 'interaction':
        return this.renderInteractionVisualization();
        
      case 'environment':
        return this.renderEnvironmentVisualization();
        
      default:
        return '<div class="error-message">Unknown visualization type</div>';
    }
  }
  
  /**
   * Render behavior visualization
   * @returns {string} Visualization HTML
   */
  renderBehaviorVisualization() {
    // In a real implementation, this would generate a visualization
    // based on actual agent behavior data
    return `
      <div class="behavior-visualization">
        <h3>Agent Behavior Visualization</h3>
        <div class="visualization-placeholder">
          <p>Behavior visualization for agent ${this.state.selectedAgentId}</p>
          <div class="behavior-graph">
            <!-- Placeholder for behavior graph -->
            <svg width="600" height="400">
              <rect x="50" y="50" width="500" height="300" fill="#f0f0f0" stroke="#ccc" />
              <text x="300" y="200" text-anchor="middle">Behavior Visualization</text>
              <!-- Additional visualization elements would be added here -->
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render learning visualization
   * @returns {string} Visualization HTML
   */
  renderLearningVisualization() {
    // In a real implementation, this would generate a visualization
    // based on actual learning progress data
    return `
      <div class="learning-visualization">
        <h3>Learning Progress Visualization</h3>
        <div class="visualization-placeholder">
          <p>Learning progress visualization for agent ${this.state.selectedAgentId}</p>
          <div class="learning-graph">
            <!-- Placeholder for learning graph -->
            <svg width="600" height="400">
              <rect x="50" y="50" width="500" height="300" fill="#f0f0f0" stroke="#ccc" />
              <text x="300" y="200" text-anchor="middle">Learning Progress Visualization</text>
              <!-- Additional visualization elements would be added here -->
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render interaction visualization
   * @returns {string} Visualization HTML
   */
  renderInteractionVisualization() {
    // In a real implementation, this would generate a visualization
    // based on actual agent interaction data
    return `
      <div class="interaction-visualization">
        <h3>Interaction Network Visualization</h3>
        <div class="visualization-placeholder">
          <p>Interaction network visualization for agent ${this.state.selectedAgentId}</p>
          <div class="interaction-graph">
            <!-- Placeholder for interaction graph -->
            <svg width="600" height="400">
              <rect x="50" y="50" width="500" height="300" fill="#f0f0f0" stroke="#ccc" />
              <text x="300" y="200" text-anchor="middle">Interaction Network Visualization</text>
              <!-- Additional visualization elements would be added here -->
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render environment visualization
   * @returns {string} Visualization HTML
   */
  renderEnvironmentVisualization() {
    // In a real implementation, this would generate a visualization
    // based on actual environment state data
    return `
      <div class="environment-visualization">
        <h3>Environment State Visualization</h3>
        <div class="visualization-placeholder">
          <p>Environment state visualization for agent ${this.state.selectedAgentId}</p>
          <div class="environment-graph">
            <!-- Placeholder for environment graph -->
            <svg width="600" height="400">
              <rect x="50" y="50" width="500" height="300" fill="#f0f0f0" stroke="#ccc" />
              <text x="300" y="200" text-anchor="middle">Environment State Visualization</text>
              <!-- Additional visualization elements would be added here -->
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Handle agent change
   * @param {string} agentId - Agent ID
   */
  handleAgentChange(agentId) {
    this.state.selectedAgentId = agentId;
    
    // Trigger event to update selected agent
    window.dispatchEvent(new CustomEvent('agent-selected', {
      detail: { agentId }
    }));
    
    // Update visualization
    const container = document.querySelector('.visualization-container');
    if (container) {
      container.innerHTML = this.renderVisualization();
    }
  }
  
  /**
   * Handle visualization type change
   * @param {string} type - Visualization type
   */
  handleVisualizationTypeChange(type) {
    this.state.visualizationType = type;
    
    // Update visualization
    const container = document.querySelector('.visualization-container');
    if (container) {
      container.innerHTML = this.renderVisualization();
    }
  }
}
```

#### Experiment Management Component

```javascript
/**
 * Experiment management component for the playground UI
 */
class ExperimentComponent {
  constructor() {
    this.state = {
      initialized: false,
      experiments: [],
      selectedExperimentId: null,
      newExperiment: {
        name: '',
        description: '',
        agentIds: [],
        scenarioIds: [],
        repetitions: 1,
        parameters: {}
      }
    };
  }
  
  /**
   * Initialize the component
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    this.state.initialized = true;
    return true;
  }
  
  /**
   * Render the component
   * @param {object} props - Component properties
   * @returns {Promise<HTMLElement>} Rendered element
   */
  async render(props) {
    // Create experiment element
    const experiment = document.createElement('div');
    experiment.className = 'experiment';
    
    // Add content
    experiment.innerHTML = `
      <h1>Experiment Management</h1>
      
      <div class="experiment-container">
        <div class="experiment-list">
          <h2>Experiments</h2>
          <div class="list-container">
            ${this.state.experiments.length > 0 
              ? this.state.experiments.map(exp => `
                <div class="experiment-item ${exp.id === this.state.selectedExperimentId ? 'selected' : ''}" 
                     data-id="${exp.id}">
                  <div class="experiment-name">${exp.name}</div>
                  <div class="experiment-status">${exp.status}</div>
                </div>
              `).join('')
              : '<div class="empty-message">No experiments</div>'
            }
          </div>
          <button class="create-button" data-action="create-experiment">Create Experiment</button>
        </div>
        
        <div class="experiment-details">
          ${this.state.selectedExperimentId 
            ? this.renderExperimentDetails()
            : this.renderNewExperimentForm(props)
          }
        </div>
      </div>
    `;
    
    // Add event listeners
    const experimentItems = experiment.querySelectorAll('.experiment-item');
    for (const item of experimentItems) {
      item.addEventListener('click', (event) => {
        const id = event.currentTarget.getAttribute('data-id');
        this.handleExperimentSelect(id);
      });
    }
    
    const createButton = experiment.querySelector('.create-button');
    createButton.addEventListener('click', () => {
      this.handleCreateExperiment();
    });
    
    // Add form event listeners if new experiment form is shown
    if (!this.state.selectedExperimentId) {
      const form = experiment.querySelector('.new-experiment-form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleExperimentSubmit(form);
      });
      
      const agentCheckboxes = experiment.querySelectorAll('input[name="agent"]');
      for (const checkbox of agentCheckboxes) {
        checkbox.addEventListener('change', () => {
          this.updateSelectedAgents(agentCheckboxes);
        });
      }
      
      const scenarioCheckboxes = experiment.querySelectorAll('input[name="scenario"]');
      for (const checkbox of scenarioCheckboxes) {
        checkbox.addEventListener('change', () => {
          this.updateSelectedScenarios(scenarioCheckboxes);
        });
      }
    }
    
    return experiment;
  }
  
  /**
   * Render experiment details
   * @returns {string} Experiment details HTML
   */
  renderExperimentDetails() {
    const experiment = this.state.experiments.find(e => e.id === this.state.selectedExperimentId);
    
    if (!experiment) {
      return '<div class="error-message">Experiment not found</div>';
    }
    
    return `
      <div class="experiment-detail-view">
        <h2>${experiment.name}</h2>
        <div class="experiment-info">
          <div class="info-item">
            <div class="info-label">Status:</div>
            <div class="info-value">${experiment.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Created:</div>
            <div class="info-value">${new Date(experiment.createdAt).toLocaleString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Description:</div>
            <div class="info-value">${experiment.description}</div>
          </div>
        </div>
        
        <div class="experiment-configuration">
          <h3>Configuration</h3>
          <div class="config-item">
            <div class="config-label">Agents:</div>
            <div class="config-value">
              ${experiment.agentIds.map(id => `<span class="agent-tag">${id}</span>`).join('')}
            </div>
          </div>
          <div class="config-item">
            <div class="config-label">Scenarios:</div>
            <div class="config-value">
              ${experiment.scenarioIds.map(id => `<span class="scenario-tag">${id}</span>`).join('')}
            </div>
          </div>
          <div class="config-item">
            <div class="config-label">Repetitions:</div>
            <div class="config-value">${experiment.repetitions}</div>
          </div>
        </div>
        
        <div class="experiment-results">
          <h3>Results</h3>
          ${experiment.results 
            ? this.renderExperimentResults(experiment.results)
            : '<div class="empty-message">No results available</div>'
          }
        </div>
        
        <div class="experiment-actions">
          ${experiment.status === 'pending' 
            ? '<button class="action-button" data-action="run-experiment">Run Experiment</button>'
            : ''
          }
          ${experiment.status === 'running' 
            ? '<button class="action-button" data-action="stop-experiment">Stop Experiment</button>'
            : ''
          }
          ${experiment.status === 'completed' 
            ? '<button class="action-button" data-action="export-results">Export Results</button>'
            : ''
          }
          <button class="action-button" data-action="delete-experiment">Delete Experiment</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render experiment results
   * @param {object} results - Experiment results
   * @returns {string} Results HTML
   */
  renderExperimentResults(results) {
    return `
      <div class="results-container">
        <div class="results-summary">
          <div class="summary-item">
            <div class="summary-label">Success Rate:</div>
            <div class="summary-value">${results.successRate.toFixed(1)}%</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Average Time:</div>
            <div class="summary-value">${results.averageTime.toFixed(2)}s</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Completion:</div>
            <div class="summary-value">${results.completionRate.toFixed(1)}%</div>
          </div>
        </div>
        
        <div class="results-chart">
          <!-- Placeholder for results chart -->
          <svg width="600" height="300">
            <rect x="50" y="50" width="500" height="200" fill="#f0f0f0" stroke="#ccc" />
            <text x="300" y="150" text-anchor="middle">Results Chart</text>
            <!-- Additional chart elements would be added here -->
          </svg>
        </div>
      </div>
    `;
  }
  
  /**
   * Render new experiment form
   * @param {object} props - Component properties
   * @returns {string} Form HTML
   */
  renderNewExperimentForm(props) {
    return `
      <div class="new-experiment">
        <h2>Create New Experiment</h2>
        <form class="new-experiment-form">
          <div class="form-group">
            <label for="experiment-name">Name:</label>
            <input type="text" id="experiment-name" name="name" required>
          </div>
          
          <div class="form-group">
            <label for="experiment-description">Description:</label>
            <textarea id="experiment-description" name="description" rows="3"></textarea>
          </div>
          
          <div class="form-group">
            <label>Select Agents:</label>
            <div class="checkbox-group">
              ${props.agents.map(agent => `
                <label>
                  <input type="checkbox" name="agent" value="${agent.id}">
                  ${agent.name}
                </label>
              `).join('')}
            </div>
          </div>
          
          <div class="form-group">
            <label>Select Scenarios:</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" name="scenario" value="maze-navigation-easy">
                Maze Navigation (Easy)
              </label>
              <label>
                <input type="checkbox" name="scenario" value="maze-navigation-medium">
                Maze Navigation (Medium)
              </label>
              <label>
                <input type="checkbox" name="scenario" value="maze-navigation-hard">
                Maze Navigation (Hard)
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="experiment-repetitions">Repetitions:</label>
            <input type="number" id="experiment-repetitions" name="repetitions" min="1" max="100" value="1">
          </div>
          
          <div class="form-actions">
            <button type="submit" class="submit-button">Create Experiment</button>
            <button type="button" class="cancel-button">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Handle experiment selection
   * @param {string} experimentId - Experiment ID
   */
  handleExperimentSelect(experimentId) {
    this.state.selectedExperimentId = experimentId;
    
    // Update UI
    const container = document.querySelector('.experiment-details');
    if (container) {
      container.innerHTML = this.renderExperimentDetails();
      
      // Add event listeners to action buttons
      const actionButtons = container.querySelectorAll('.action-button');
      for (const button of actionButtons) {
        button.addEventListener('click', (event) => {
          const action = event.target.getAttribute('data-action');
          this.handleExperimentAction(action);
        });
      }
    }
  }
  
  /**
   * Handle create experiment button
   */
  handleCreateExperiment() {
    this.state.selectedExperimentId = null;
    
    // Reset new experiment form
    this.state.newExperiment = {
      name: '',
      description: '',
      agentIds: [],
      scenarioIds: [],
      repetitions: 1,
      parameters: {}
    };
    
    // Update UI
    const container = document.querySelector('.experiment-details');
    if (container) {
      container.innerHTML = this.renderNewExperimentForm({
        agents: [] // In a real implementation, this would be the actual agents
      });
      
      // Add form event listeners
      const form = container.querySelector('.new-experiment-form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleExperimentSubmit(form);
      });
      
      const agentCheckboxes = container.querySelectorAll('input[name="agent"]');
      for (const checkbox of agentCheckboxes) {
        checkbox.addEventListener('change', () => {
          this.updateSelectedAgents(agentCheckboxes);
        });
      }
      
      const scenarioCheckboxes = container.querySelectorAll('input[name="scenario"]');
      for (const checkbox of scenarioCheckboxes) {
        checkbox.addEventListener('change', () => {
          this.updateSelectedScenarios(scenarioCheckboxes);
        });
      }
    }
  }
  
  /**
   * Handle experiment form submission
   * @param {HTMLFormElement} form - Form element
   */
  handleExperimentSubmit(form) {
    // Get form data
    const formData = new FormData(form);
    
    // Create new experiment
    const experiment = {
      id: `experiment-${Date.now()}`,
      name: formData.get('name'),
      description: formData.get('description'),
      agentIds: this.state.newExperiment.agentIds,
      scenarioIds: this.state.newExperiment.scenarioIds,
      repetitions: parseInt(formData.get('repetitions'), 10),
      parameters: this.state.newExperiment.parameters,
      status: 'pending',
      createdAt: Date.now(),
      results: null
    };
    
    // Add experiment to state
    this.state.experiments.push(experiment);
    
    // Select the new experiment
    this.state.selectedExperimentId = experiment.id;
    
    // Show notification
    window.dispatchEvent(new CustomEvent('notification', {
      detail: {
        message: `Experiment "${experiment.name}" created`,
        type: 'success'
      }
    }));
    
    // Update UI
    const container = document.querySelector('.experiment-container');
    if (container) {
      const parent = container.parentElement;
      parent.innerHTML = '';
      this.render({ agents: [] }).then(element => {
        parent.appendChild(element);
      });
    }
  }
  
  /**
   * Handle experiment action
   * @param {string} action - Action type
   */
  handleExperimentAction(action) {
    const experimentId = this.state.selectedExperimentId;
    const experimentIndex = this.state.experiments.findIndex(e => e.id === experimentId);
    
    if (experimentIndex < 0) {
      return;
    }
    
    switch (action) {
      case 'run-experiment':
        // Update experiment status
        this.state.experiments[experimentIndex].status = 'running';
        
        // Show notification
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            message: `Experiment "${this.state.experiments[experimentIndex].name}" started`,
            type: 'info'
          }
        }));
        
        // In a real implementation, this would start the experiment
        // For now, we'll simulate completion after a delay
        setTimeout(() => {
          this.simulateExperimentCompletion(experimentId);
        }, 3000);
        break;
        
      case 'stop-experiment':
        // Update experiment status
        this.state.experiments[experimentIndex].status = 'stopped';
        
        // Show notification
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            message: `Experiment "${this.state.experiments[experimentIndex].name}" stopped`,
            type: 'warning'
          }
        }));
        break;
        
      case 'export-results':
        // In a real implementation, this would export the results
        // For now, we'll just show a notification
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            message: `Results exported for experiment "${this.state.experiments[experimentIndex].name}"`,
            type: 'success'
          }
        }));
        break;
        
      case 'delete-experiment':
        // Remove experiment from state
        this.state.experiments.splice(experimentIndex, 1);
        
        // Clear selected experiment
        this.state.selectedExperimentId = null;
        
        // Show notification
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            message: `Experiment deleted`,
            type: 'info'
          }
        }));
        
        // Update UI
        const container = document.querySelector('.experiment-container');
        if (container) {
          const parent = container.parentElement;
          parent.innerHTML = '';
          this.render({ agents: [] }).then(element => {
            parent.appendChild(element);
          });
        }
        break;
    }
    
    // Update UI
    const container = document.querySelector('.experiment-details');
    if (container && this.state.selectedExperimentId) {
      container.innerHTML = this.renderExperimentDetails();
      
      // Add event listeners to action buttons
      const actionButtons = container.querySelectorAll('.action-button');
      for (const button of actionButtons) {
        button.addEventListener('click', (event) => {
          const action = event.target.getAttribute('data-action');
          this.handleExperimentAction(action);
        });
      }
    }
  }
  
  /**
   * Update selected agents
   * @param {NodeList} checkboxes - Agent checkboxes
   */
  updateSelectedAgents(checkboxes) {
    const selectedAgents = [];
    
    for (const checkbox of checkboxes) {
      if (checkbox.checked) {
        selectedAgents.push(checkbox.value);
      }
    }
    
    this.state.newExperiment.agentIds = selectedAgents;
  }
  
  /**
   * Update selected scenarios
   * @param {NodeList} checkboxes - Scenario checkboxes
   */
  updateSelectedScenarios(checkboxes) {
    const selectedScenarios = [];
    
    for (const checkbox of checkboxes) {
      if (checkbox.checked) {
        selectedScenarios.push(checkbox.value);
      }
    }
    
    this.state.newExperiment.scenarioIds = selectedScenarios;
  }
  
  /**
   * Simulate experiment completion
   * @param {string} experimentId - Experiment ID
   */
  simulateExperimentCompletion(experimentId) {
    const experimentIndex = this.state.experiments.findIndex(e => e.id === experimentId);
    
    if (experimentIndex < 0) {
      return;
    }
    
    // Update experiment status
    this.state.experiments[experimentIndex].status = 'completed';
    
    // Generate random results
    this.state.experiments[experimentIndex].results = {
      successRate: Math.random() * 40 + 60, // 60-100%
      averageTime: Math.random() * 5 + 1, // 1-6s
      completionRate: Math.random() * 30 + 70 // 70-100%
    };
    
    // Show notification
    window.dispatchEvent(new CustomEvent('notification', {
      detail: {
        message: `Experiment "${this.state.experiments[experimentIndex].name}" completed`,
        type: 'success'
      }
    }));
    
    // Update UI if this is the selected experiment
    if (this.state.selectedExperimentId === experimentId) {
      const container = document.querySelector('.experiment-details');
      if (container) {
        container.innerHTML = this.renderExperimentDetails();
        
        // Add event listeners to action buttons
        const actionButtons = container.querySelectorAll('.action-button');
        for (const button of actionButtons) {
          button.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            this.handleExperimentAction(action);
          });
        }
      }
    }
  }
}
```

## Usage Examples

### Basic UI Initialization

```javascript
// Initialize the playground UI
const ui = new PlaygroundUI({
  containerId: 'playground-container',
  theme: 'dark'
});

// Initialize the UI
await ui.initialize();

// Register agents
const agents = [
  { id: 'agent1', name: 'Agent 1', status: 'active', learning: true },
  { id: 'agent2', name: 'Agent 2', status: 'inactive', learning: false },
  { id: 'agent3', name: 'Agent 3', status: 'active', learning: true }
];

// Update UI state
ui.state.agents = agents;

// Render the UI
await ui.render();
```

### Custom Component Integration

```javascript
// Create a custom component
class CustomComponent {
  constructor() {
    this.state = {
      initialized: false
    };
  }
  
  async initialize() {
    this.state.initialized = true;
    return true;
  }
  
  async render(props) {
    const element = document.createElement('div');
    element.className = 'custom-component';
    
    element.innerHTML = `
      <h2>Custom Component</h2>
      <div class="custom-content">
        <p>This is a custom component.</p>
        <button class="custom-button">Click Me</button>
      </div>
    `;
    
    // Add event listeners
    const button = element.querySelector('.custom-button');
    button.addEventListener('click', () => {
      this.handleButtonClick();
    });
    
    return element;
  }
  
  handleButtonClick() {
    console.log('Custom button clicked');
    
    // Trigger a notification
    window.dispatchEvent(new CustomEvent('notification', {
      detail: {
        message: 'Custom button clicked',
        type: 'info'
      }
    }));
  }
}

// Register the custom component
await ui.registerComponent('custom', new CustomComponent());

// Switch to the custom component view
ui.state.activeView = 'custom';
await ui.update();
```

### Visualization Integration

```javascript
// Create agent data for visualization
const agentData = {
  id: 'agent1',
  behaviorData: {
    states: ['s1', 's2', 's3', 's4', 's5'],
    transitions: [
      { from: 's1', to: 's2', count: 10 },
      { from: 's2', to: 's3', count: 8 },
      { from: 's3', to: 's4', count: 5 },
      { from: 's4', to: 's5', count: 3 },
      { from: 's5', to: 's1', count: 2 }
    ]
  },
  learningData: {
    episodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    rewards: [0.1, 0.2, 0.3, 0.5, 0.4, 0.6, 0.7, 0.8, 0.9, 0.95]
  }
};

// Get visualization component
const visualizationComponent = ui.components.get('visualization');

// Update component state
visualizationComponent.state.data = agentData;
visualizationComponent.state.selectedAgentId = agentData.id;

// Switch to visualization view
ui.state.activeView = 'visualization';
await ui.update();
```

### Experiment Management

```javascript
// Create experiment data
const experimentData = {
  id: 'experiment1',
  name: 'Learning Rate Comparison',
  description: 'Compare different learning rates for Q-learning',
  agentIds: ['agent1', 'agent2', 'agent3'],
  scenarioIds: ['maze-navigation-medium'],
  repetitions: 5,
  parameters: {
    learningRates: [0.1, 0.2, 0.3]
  },
  status: 'completed',
  createdAt: Date.now() - 3600000, // 1 hour ago
  results: {
    successRate: 85.5,
    averageTime: 3.2,
    completionRate: 92.0
  }
};

// Get experiment component
const experimentComponent = ui.components.get('experiment');

// Update component state
experimentComponent.state.experiments = [experimentData];
experimentComponent.state.selectedExperimentId = experimentData.id;

// Switch to experiment view
ui.state.activeView = 'experiment';
await ui.update();
```

## Best Practices

### UI Design

- **Consistency**: Maintain consistent design patterns throughout the UI
- **Responsiveness**: Ensure the UI works well on different screen sizes
- **Feedback**: Provide clear feedback for user actions
- **Progressive Disclosure**: Show information progressively to avoid overwhelming users

### Component Architecture

- **Modularity**: Design components to be self-contained and reusable
- **State Management**: Keep component state separate from UI rendering
- **Event Handling**: Use event delegation for efficient event handling
- **Asynchronous Operations**: Use async/await for asynchronous operations

### Performance Considerations

- **Lazy Loading**: Load components only when needed
- **Efficient Rendering**: Minimize DOM manipulations
- **Throttling**: Throttle frequent events like scrolling and resizing
- **Caching**: Cache expensive computations and remote data

### Accessibility

- **Keyboard Navigation**: Ensure all functionality is accessible via keyboard
- **Screen Reader Support**: Provide appropriate ARIA attributes
- **Color Contrast**: Ensure sufficient color contrast for readability
- **Focus Management**: Manage focus for modal dialogs and dynamic content

## Conclusion

The user interface in DevSparkAgent Playground provides a comprehensive set of tools for interacting with and monitoring agents. By following the guidelines and examples in this document, developers can effectively implement and use the user interface to create, manage, visualize, and evaluate agents in the playground.

For more detailed information on specific components or implementation details, refer to the source code and API documentation.
