/**
 * Main UI Component for DevSparkAgent Playground
 * 
 * Provides the main user interface for the playground.
 */

class PlaygroundUI {
  /**
   * Create a new PlaygroundUI instance
   * @param {Object} config - Configuration options
   * @param {RuntimeEnvironment} runtimeEnvironment - Runtime environment instance
   * @param {InteractionFramework} interactionFramework - Interaction framework instance
   * @param {EvolutionSystem} evolutionSystem - Evolution system instance
   */
  constructor(config, runtimeEnvironment, interactionFramework, evolutionSystem) {
    this.config = config;
    this.runtimeEnvironment = runtimeEnvironment;
    this.interactionFramework = interactionFramework;
    this.evolutionSystem = evolutionSystem;
    this.initialized = false;
    this.components = new Map();
    this.eventHandlers = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the UI
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing PlaygroundUI...');
      
      // Register UI components
      await this._registerComponents();
      
      // Set up event handlers
      this._setupEventHandlers();
      
      this.initialized = true;
      this.logger.info('PlaygroundUI initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`PlaygroundUI initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Render the UI
   * @param {HTMLElement} container - Container element
   * @returns {Promise<boolean>} - Resolves to true if rendering is successful
   */
  async render(container) {
    try {
      if (!this.initialized) {
        throw new Error('PlaygroundUI not initialized');
      }
      
      this.logger.info('Rendering PlaygroundUI...');
      
      // Clear container
      container.innerHTML = '';
      
      // Create main layout
      const layout = document.createElement('div');
      layout.className = 'playground-layout';
      container.appendChild(layout);
      
      // Render header
      const header = document.createElement('header');
      header.className = 'playground-header';
      header.innerHTML = `
        <h1>DevSparkAgent Playground</h1>
        <div class="playground-controls">
          <button id="btn-new-agent">New Agent</button>
          <button id="btn-new-population">New Population</button>
          <button id="btn-settings">Settings</button>
        </div>
      `;
      layout.appendChild(header);
      
      // Render main content
      const content = document.createElement('div');
      content.className = 'playground-content';
      layout.appendChild(content);
      
      // Render sidebar
      const sidebar = document.createElement('div');
      sidebar.className = 'playground-sidebar';
      content.appendChild(sidebar);
      
      // Render main panel
      const mainPanel = document.createElement('div');
      mainPanel.className = 'playground-main-panel';
      content.appendChild(mainPanel);
      
      // Render footer
      const footer = document.createElement('footer');
      footer.className = 'playground-footer';
      footer.innerHTML = `
        <div class="playground-status">Ready</div>
        <div class="playground-version">Version ${this.config.version}</div>
      `;
      layout.appendChild(footer);
      
      // Render components
      await this._renderComponents(sidebar, mainPanel);
      
      // Set up event listeners
      this._setupEventListeners(container);
      
      this.logger.info('PlaygroundUI rendered successfully');
      return true;
    } catch (error) {
      this.logger.error(`PlaygroundUI rendering failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update the UI
   * @returns {Promise<boolean>} - Resolves to true if update is successful
   */
  async update() {
    try {
      if (!this.initialized) {
        throw new Error('PlaygroundUI not initialized');
      }
      
      this.logger.info('Updating PlaygroundUI...');
      
      // Update components
      for (const [componentId, component] of this.components.entries()) {
        if (component.update) {
          await component.update();
        }
      }
      
      this.logger.info('PlaygroundUI updated successfully');
      return true;
    } catch (error) {
      this.logger.error(`PlaygroundUI update failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Show a dialog
   * @param {string} title - Dialog title
   * @param {string} content - Dialog content
   * @param {Array<Object>} buttons - Dialog buttons
   * @returns {Promise<string>} - Resolves to button ID that was clicked
   */
  async showDialog(title, content, buttons = []) {
    try {
      return new Promise((resolve) => {
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'playground-dialog';
        
        // Create dialog content
        dialog.innerHTML = `
          <div class="playground-dialog-content">
            <div class="playground-dialog-header">
              <h2>${title}</h2>
              <button class="playground-dialog-close">&times;</button>
            </div>
            <div class="playground-dialog-body">
              ${content}
            </div>
            <div class="playground-dialog-footer">
              ${buttons.map(button => `
                <button class="playground-dialog-button" data-id="${button.id}">${button.label}</button>
              `).join('')}
            </div>
          </div>
        `;
        
        // Add dialog to body
        document.body.appendChild(dialog);
        
        // Set up event listeners
        const closeButton = dialog.querySelector('.playground-dialog-close');
        closeButton.addEventListener('click', () => {
          document.body.removeChild(dialog);
          resolve('close');
        });
        
        // Set up button event listeners
        const buttonElements = dialog.querySelectorAll('.playground-dialog-button');
        buttonElements.forEach(button => {
          button.addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(button.dataset.id);
          });
        });
      });
    } catch (error) {
      this.logger.error(`Failed to show dialog: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Show a notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, warning, error)
   * @param {number} duration - Notification duration in milliseconds
   * @returns {Promise<void>}
   */
  async showNotification(message, type = 'info', duration = 3000) {
    try {
      // Create notification
      const notification = document.createElement('div');
      notification.className = `playground-notification playground-notification-${type}`;
      notification.innerHTML = message;
      
      // Add notification to body
      document.body.appendChild(notification);
      
      // Remove notification after duration
      setTimeout(() => {
        document.body.removeChild(notification);
      }, duration);
    } catch (error) {
      this.logger.error(`Failed to show notification: ${error.message}`, error);
    }
  }

  /**
   * Register a component
   * @param {string} componentId - Component ID
   * @param {Object} component - Component object
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerComponent(componentId, component) {
    try {
      this.logger.info(`Registering UI component ${componentId}`);
      
      // Store component
      this.components.set(componentId, component);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register UI component ${componentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister a component
   * @param {string} componentId - Component ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterComponent(componentId) {
    try {
      this.logger.info(`Unregistering UI component ${componentId}`);
      
      // Check if component exists
      if (!this.components.has(componentId)) {
        this.logger.warn(`UI component ${componentId} not found`);
        return false;
      }
      
      // Remove component
      this.components.delete(componentId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister UI component ${componentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerEventHandler(eventType, handler) {
    try {
      this.logger.info(`Registering event handler for ${eventType}`);
      
      // Check if event type exists
      if (!this.eventHandlers.has(eventType)) {
        this.eventHandlers.set(eventType, []);
      }
      
      // Add handler
      this.eventHandlers.get(eventType).push(handler);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register event handler for ${eventType}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterEventHandler(eventType, handler) {
    try {
      this.logger.info(`Unregistering event handler for ${eventType}`);
      
      // Check if event type exists
      if (!this.eventHandlers.has(eventType)) {
        this.logger.warn(`Event type ${eventType} not found`);
        return false;
      }
      
      // Remove handler
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      
      if (index === -1) {
        this.logger.warn(`Event handler for ${eventType} not found`);
        return false;
      }
      
      handlers.splice(index, 1);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister event handler for ${eventType}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Trigger event
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {Promise<boolean>} - Resolves to true if event was triggered
   */
  async triggerEvent(eventType, eventData = {}) {
    try {
      this.logger.debug(`Triggering event ${eventType}`);
      
      // Check if event type exists
      if (!this.eventHandlers.has(eventType)) {
        return false;
      }
      
      // Call handlers
      const handlers = this.eventHandlers.get(eventType);
      
      for (const handler of handlers) {
        try {
          await handler(eventData);
        } catch (error) {
          this.logger.error(`Error in event handler for ${eventType}: ${error.message}`, error);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to trigger event ${eventType}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register UI components
   * @private
   * @returns {Promise<void>}
   */
  async _registerComponents() {
    try {
      // Register agent list component
      await this.registerComponent('agentList', {
        render: async (container) => {
          container.innerHTML = `
            <div class="playground-component playground-agent-list">
              <h2>Agents</h2>
              <div class="playground-agent-list-content">
                <ul id="agent-list"></ul>
              </div>
            </div>
          `;
          
          // Populate agent list
          await this._populateAgentList();
        },
        update: async () => {
          // Update agent list
          await this._populateAgentList();
        }
      });
      
      // Register population list component
      await this.registerComponent('populationList', {
        render: async (container) => {
          container.innerHTML = `
            <div class="playground-component playground-population-list">
              <h2>Populations</h2>
              <div class="playground-population-list-content">
                <ul id="population-list"></ul>
              </div>
            </div>
          `;
          
          // Populate population list
          await this._populatePopulationList();
        },
        update: async () => {
          // Update population list
          await this._populatePopulationList();
        }
      });
      
      // Register agent details component
      await this.registerComponent('agentDetails', {
        render: async (container) => {
          container.innerHTML = `
            <div class="playground-component playground-agent-details">
              <h2>Agent Details</h2>
              <div class="playground-agent-details-content">
                <div id="agent-details-placeholder">Select an agent to view details</div>
                <div id="agent-details" style="display: none;">
                  <h3 id="agent-details-name"></h3>
                  <div class="playground-agent-details-info">
                    <div class="playground-agent-details-section">
                      <h4>Properties</h4>
                      <table id="agent-details-properties"></table>
                    </div>
                    <div class="playground-agent-details-section">
                      <h4>Performance</h4>
                      <div id="agent-details-performance"></div>
                    </div>
                    <div class="playground-agent-details-section">
                      <h4>Evolution History</h4>
                      <div id="agent-details-evolution"></div>
                    </div>
                  </div>
                  <div class="playground-agent-details-actions">
                    <button id="btn-evolve-agent">Evolve</button>
                    <button id="btn-benchmark-agent">Benchmark</button>
                    <button id="btn-delete-agent">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        },
        update: async () => {
          // Nothing to update
        },
        showAgent: async (agentId) => {
          try {
            // Get agent info
            const agentInfo = this.evolutionSystem.getAgentInfo(agentId);
            
            // Update UI
            document.getElementById('agent-details-placeholder').style.display = 'none';
            document.getElementById('agent-details').style.display = 'block';
            document.getElementById('agent-details-name').textContent = agentId;
            
            // Update properties
            const propertiesTable = document.getElementById('agent-details-properties');
            propertiesTable.innerHTML = `
              <tr>
                <th>Registered At</th>
                <td>${agentInfo.registeredAt.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Last Evolved</th>
                <td>${agentInfo.lastEvolved ? agentInfo.lastEvolved.toLocaleString() : 'Never'}</td>
              </tr>
              <tr>
                <th>Evolution Count</th>
                <td>${agentInfo.evolutionHistory.length}</td>
              </tr>
            `;
            
            // Update performance
            const performanceDiv = document.getElementById('agent-details-performance');
            const performance = this.evolutionSystem.getAgentPerformance(agentId, null, { limit: 5 });
            
            if (performance.length === 0) {
              performanceDiv.innerHTML = '<p>No performance data available</p>';
            } else {
              performanceDiv.innerHTML = `
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${performance.map(record => `
                      <tr>
                        <td>${record.metricId}</td>
                        <td>${record.value}</td>
                        <td>${record.timestamp.toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            }
            
            // Update evolution history
            const evolutionDiv = document.getElementById('agent-details-evolution');
            
            if (agentInfo.evolutionHistory.length === 0) {
              evolutionDiv.innerHTML = '<p>No evolution history available</p>';
            } else {
              evolutionDiv.innerHTML = `
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Type</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${agentInfo.evolutionHistory.map(record => `
                      <tr>
                        <td>${record.timestamp.toLocaleString()}</td>
                        <td>${record.populationId ? 'Population' : (record.modelId ? 'Learning' : 'Unknown')}</td>
                        <td>${record.populationId ? `Population: ${record.populationId}` : (record.modelId ? `Model: ${record.modelId}` : '')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            }
            
            // Set up action buttons
            document.getElementById('btn-evolve-agent').onclick = async () => {
              await this._showEvolveAgentDialog(agentId);
            };
            
            document.getElementById('btn-benchmark-agent').onclick = async () => {
              await this._showBenchmarkAgentDialog(agentId);
            };
            
            document.getElementById('btn-delete-agent').onclick = async () => {
              await this._showDeleteAgentDialog(agentId);
            };
          } catch (error) {
            this.logger.error(`Failed to show agent ${agentId}: ${error.message}`, error);
            await this.showNotification(`Failed to show agent: ${error.message}`, 'error');
          }
        }
      });
      
      // Register population details component
      await this.registerComponent('populationDetails', {
        render: async (container) => {
          container.innerHTML = `
            <div class="playground-component playground-population-details">
              <h2>Population Details</h2>
              <div class="playground-population-details-content">
                <div id="population-details-placeholder">Select a population to view details</div>
                <div id="population-details" style="display: none;">
                  <h3 id="population-details-name"></h3>
                  <div class="playground-population-details-info">
                    <div class="playground-population-details-section">
                      <h4>Properties</h4>
                      <table id="population-details-properties"></table>
                    </div>
                    <div class="playground-population-details-section">
                      <h4>Agents</h4>
                      <div id="population-details-agents"></div>
                    </div>
                    <div class="playground-population-details-section">
                      <h4>Evolution History</h4>
                      <div id="population-details-evolution"></div>
                    </div>
                  </div>
                  <div class="playground-population-details-actions">
                    <button id="btn-evolve-population">Evolve</button>
                    <button id="btn-add-agent">Add Agent</button>
                    <button id="btn-delete-population">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        },
        update: async () => {
          // Nothing to update
        },
        showPopulation: async (populationId) => {
          try {
            // Get population info
            const populationInfo = this.evolutionSystem.getPopulationInfo(populationId);
            
            // Update UI
            document.getElementById('population-details-placeholder').style.display = 'none';
            document.getElementById('population-details').style.display = 'block';
            document.getElementById('population-details-name').textContent = populationInfo.name;
            
            // Update properties
            const propertiesTable = document.getElementById('population-details-properties');
            propertiesTable.innerHTML = `
              <tr>
                <th>ID</th>
                <td>${populationInfo.id}</td>
              </tr>
              <tr>
                <th>Description</th>
                <td>${populationInfo.description}</td>
              </tr>
              <tr>
                <th>Created At</th>
                <td>${populationInfo.createdAt.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Last Evolved</th>
                <td>${populationInfo.lastEvolved ? populationInfo.lastEvolved.toLocaleString() : 'Never'}</td>
              </tr>
              <tr>
                <th>Agent Count</th>
                <td>${populationInfo.agentIds.length}</td>
              </tr>
            `;
            
            // Update agents
            const agentsDiv = document.getElementById('population-details-agents');
            
            if (populationInfo.agentIds.length === 0) {
              agentsDiv.innerHTML = '<p>No agents in this population</p>';
            } else {
              agentsDiv.innerHTML = `
                <ul>
                  ${populationInfo.agentIds.map(agentId => `
                    <li>
                      <a href="#" class="population-agent-link" data-agent-id="${agentId}">${agentId}</a>
                    </li>
                  `).join('')}
                </ul>
              `;
              
              // Set up agent links
              const agentLinks = agentsDiv.querySelectorAll('.population-agent-link');
              agentLinks.forEach(link => {
                link.onclick = async (event) => {
                  event.preventDefault();
                  const agentId = link.dataset.agentId;
                  await this.components.get('agentDetails').showAgent(agentId);
                };
              });
            }
            
            // Update evolution history
            const evolutionDiv = document.getElementById('population-details-evolution');
            
            if (populationInfo.evolutionHistory.length === 0) {
              evolutionDiv.innerHTML = '<p>No evolution history available</p>';
            } else {
              evolutionDiv.innerHTML = `
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Generations</th>
                      <th>Best Fitness</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${populationInfo.evolutionHistory.map(record => `
                      <tr>
                        <td>${record.timestamp.toLocaleString()}</td>
                        <td>${record.generations}</td>
                        <td>${record.bestFitness.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            }
            
            // Set up action buttons
            document.getElementById('btn-evolve-population').onclick = async () => {
              await this._showEvolvePopulationDialog(populationId);
            };
            
            document.getElementById('btn-add-agent').onclick = async () => {
              await this._showAddAgentToPopulationDialog(populationId);
            };
            
            document.getElementById('btn-delete-population').onclick = async () => {
              await this._showDeletePopulationDialog(populationId);
            };
          } catch (error) {
            this.logger.error(`Failed to show population ${populationId}: ${error.message}`, error);
            await this.showNotification(`Failed to show population: ${error.message}`, 'error');
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to register UI components: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Set up event handlers
   * @private
   * @returns {void}
   */
  _setupEventHandlers() {
    try {
      // Register event handlers
      this.registerEventHandler('agent:created', async (data) => {
        await this.update();
        await this.showNotification(`Agent ${data.agentId} created`, 'success');
      });
      
      this.registerEventHandler('agent:deleted', async (data) => {
        await this.update();
        await this.showNotification(`Agent ${data.agentId} deleted`, 'success');
      });
      
      this.registerEventHandler('population:created', async (data) => {
        await this.update();
        await this.showNotification(`Population ${data.populationId} created`, 'success');
      });
      
      this.registerEventHandler('population:deleted', async (data) => {
        await this.update();
        await this.showNotification(`Population ${data.populationId} deleted`, 'success');
      });
      
      this.registerEventHandler('agent:evolved', async (data) => {
        await this.update();
        await this.showNotification(`Agent ${data.agentId} evolved`, 'success');
      });
      
      this.registerEventHandler('population:evolved', async (data) => {
        await this.update();
        await this.showNotification(`Population ${data.populationId} evolved`, 'success');
      });
    } catch (error) {
      this.logger.error(`Failed to set up event handlers: ${error.message}`, error);
    }
  }

  /**
   * Render components
   * @private
   * @param {HTMLElement} sidebar - Sidebar element
   * @param {HTMLElement} mainPanel - Main panel element
   * @returns {Promise<void>}
   */
  async _renderComponents(sidebar, mainPanel) {
    try {
      // Render sidebar components
      await this.components.get('agentList').render(sidebar);
      await this.components.get('populationList').render(sidebar);
      
      // Render main panel components
      const mainPanelContent = document.createElement('div');
      mainPanelContent.className = 'playground-main-panel-content';
      mainPanel.appendChild(mainPanelContent);
      
      // Create tabs
      const tabs = document.createElement('div');
      tabs.className = 'playground-tabs';
      tabs.innerHTML = `
        <button class="playground-tab-button active" data-tab="agent-details">Agent Details</button>
        <button class="playground-tab-button" data-tab="population-details">Population Details</button>
      `;
      mainPanelContent.appendChild(tabs);
      
      // Create tab content
      const tabContent = document.createElement('div');
      tabContent.className = 'playground-tab-content';
      mainPanelContent.appendChild(tabContent);
      
      // Create tab panels
      const agentDetailsPanel = document.createElement('div');
      agentDetailsPanel.className = 'playground-tab-panel active';
      agentDetailsPanel.dataset.tab = 'agent-details';
      tabContent.appendChild(agentDetailsPanel);
      
      const populationDetailsPanel = document.createElement('div');
      populationDetailsPanel.className = 'playground-tab-panel';
      populationDetailsPanel.dataset.tab = 'population-details';
      tabContent.appendChild(populationDetailsPanel);
      
      // Render tab panels
      await this.components.get('agentDetails').render(agentDetailsPanel);
      await this.components.get('populationDetails').render(populationDetailsPanel);
      
      // Set up tab buttons
      const tabButtons = tabs.querySelectorAll('.playground-tab-button');
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Deactivate all buttons and panels
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContent.querySelectorAll('.playground-tab-panel').forEach(panel => panel.classList.remove('active'));
          
          // Activate clicked button and corresponding panel
          button.classList.add('active');
          tabContent.querySelector(`.playground-tab-panel[data-tab="${button.dataset.tab}"]`).classList.add('active');
        });
      });
    } catch (error) {
      this.logger.error(`Failed to render components: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Set up event listeners
   * @private
   * @param {HTMLElement} container - Container element
   * @returns {void}
   */
  _setupEventListeners(container) {
    try {
      // Set up new agent button
      const newAgentButton = container.querySelector('#btn-new-agent');
      newAgentButton.addEventListener('click', async () => {
        await this._showNewAgentDialog();
      });
      
      // Set up new population button
      const newPopulationButton = container.querySelector('#btn-new-population');
      newPopulationButton.addEventListener('click', async () => {
        await this._showNewPopulationDialog();
      });
      
      // Set up settings button
      const settingsButton = container.querySelector('#btn-settings');
      settingsButton.addEventListener('click', async () => {
        await this._showSettingsDialog();
      });
    } catch (error) {
      this.logger.error(`Failed to set up event listeners: ${error.message}`, error);
    }
  }

  /**
   * Populate agent list
   * @private
   * @returns {Promise<void>}
   */
  async _populateAgentList() {
    try {
      const agentList = document.getElementById('agent-list');
      
      if (!agentList) {
        return;
      }
      
      // Get agents
      const agents = this.evolutionSystem.listAgents();
      
      // Update list
      if (agents.length === 0) {
        agentList.innerHTML = '<li class="empty-list">No agents</li>';
      } else {
        agentList.innerHTML = agents.map(agent => `
          <li>
            <a href="#" class="agent-list-item" data-agent-id="${agent.id}">${agent.id}</a>
          </li>
        `).join('');
        
        // Set up agent links
        const agentLinks = agentList.querySelectorAll('.agent-list-item');
        agentLinks.forEach(link => {
          link.addEventListener('click', async (event) => {
            event.preventDefault();
            
            // Deactivate all links
            agentLinks.forEach(l => l.classList.remove('active'));
            
            // Activate clicked link
            link.classList.add('active');
            
            // Show agent details
            const agentId = link.dataset.agentId;
            await this.components.get('agentDetails').showAgent(agentId);
            
            // Switch to agent details tab
            const tabButton = document.querySelector('.playground-tab-button[data-tab="agent-details"]');
            tabButton.click();
          });
        });
      }
    } catch (error) {
      this.logger.error(`Failed to populate agent list: ${error.message}`, error);
    }
  }

  /**
   * Populate population list
   * @private
   * @returns {Promise<void>}
   */
  async _populatePopulationList() {
    try {
      const populationList = document.getElementById('population-list');
      
      if (!populationList) {
        return;
      }
      
      // Get populations
      const populations = this.evolutionSystem.listPopulations();
      
      // Update list
      if (populations.length === 0) {
        populationList.innerHTML = '<li class="empty-list">No populations</li>';
      } else {
        populationList.innerHTML = populations.map(population => `
          <li>
            <a href="#" class="population-list-item" data-population-id="${population.id}">${population.name}</a>
          </li>
        `).join('');
        
        // Set up population links
        const populationLinks = populationList.querySelectorAll('.population-list-item');
        populationLinks.forEach(link => {
          link.addEventListener('click', async (event) => {
            event.preventDefault();
            
            // Deactivate all links
            populationLinks.forEach(l => l.classList.remove('active'));
            
            // Activate clicked link
            link.classList.add('active');
            
            // Show population details
            const populationId = link.dataset.populationId;
            await this.components.get('populationDetails').showPopulation(populationId);
            
            // Switch to population details tab
            const tabButton = document.querySelector('.playground-tab-button[data-tab="population-details"]');
            tabButton.click();
          });
        });
      }
    } catch (error) {
      this.logger.error(`Failed to populate population list: ${error.message}`, error);
    }
  }

  /**
   * Show new agent dialog
   * @private
   * @returns {Promise<void>}
   */
  async _showNewAgentDialog() {
    try {
      const content = `
        <form id="new-agent-form">
          <div class="form-group">
            <label for="agent-id">Agent ID</label>
            <input type="text" id="agent-id" name="agent-id" required>
          </div>
          <div class="form-group">
            <label for="agent-type">Agent Type</label>
            <select id="agent-type" name="agent-type">
              <option value="basic">Basic Agent</option>
              <option value="advanced">Advanced Agent</option>
            </select>
          </div>
        </form>
      `;
      
      const result = await this.showDialog('New Agent', content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'create', label: 'Create' }
      ]);
      
      if (result === 'create') {
        const agentId = document.getElementById('agent-id').value;
        const agentType = document.getElementById('agent-type').value;
        
        if (!agentId) {
          await this.showNotification('Agent ID is required', 'error');
          return;
        }
        
        // Create agent
        const agent = {
          id: agentId,
          type: agentType,
          genome: Array.from({ length: 100 }, () => Math.random()),
          fitness: 0,
          metadata: {
            created: new Date(),
            type: agentType
          }
        };
        
        await this.evolutionSystem.registerAgent(agentId, agent);
        
        // Trigger event
        await this.triggerEvent('agent:created', { agentId });
      }
    } catch (error) {
      this.logger.error(`Failed to show new agent dialog: ${error.message}`, error);
      await this.showNotification(`Failed to create agent: ${error.message}`, 'error');
    }
  }

  /**
   * Show new population dialog
   * @private
   * @returns {Promise<void>}
   */
  async _showNewPopulationDialog() {
    try {
      const content = `
        <form id="new-population-form">
          <div class="form-group">
            <label for="population-id">Population ID</label>
            <input type="text" id="population-id" name="population-id" required>
          </div>
          <div class="form-group">
            <label for="population-name">Name</label>
            <input type="text" id="population-name" name="population-name" required>
          </div>
          <div class="form-group">
            <label for="population-description">Description</label>
            <textarea id="population-description" name="population-description"></textarea>
          </div>
        </form>
      `;
      
      const result = await this.showDialog('New Population', content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'create', label: 'Create' }
      ]);
      
      if (result === 'create') {
        const populationId = document.getElementById('population-id').value;
        const name = document.getElementById('population-name').value;
        const description = document.getElementById('population-description').value;
        
        if (!populationId || !name) {
          await this.showNotification('Population ID and name are required', 'error');
          return;
        }
        
        // Create population
        await this.evolutionSystem.createPopulation(populationId, {
          name,
          description
        });
        
        // Trigger event
        await this.triggerEvent('population:created', { populationId });
      }
    } catch (error) {
      this.logger.error(`Failed to show new population dialog: ${error.message}`, error);
      await this.showNotification(`Failed to create population: ${error.message}`, 'error');
    }
  }

  /**
   * Show settings dialog
   * @private
   * @returns {Promise<void>}
   */
  async _showSettingsDialog() {
    try {
      const content = `
        <form id="settings-form">
          <div class="form-group">
            <label for="evolution-generations">Default Generations</label>
            <input type="number" id="evolution-generations" name="evolution-generations" value="${this.config.evolution.defaultPopulationOptions.generations}" min="1" max="100">
          </div>
          <div class="form-group">
            <label for="evolution-population-size">Default Population Size</label>
            <input type="number" id="evolution-population-size" name="evolution-population-size" value="${this.config.evolution.defaultPopulationOptions.populationSize}" min="10" max="1000">
          </div>
          <div class="form-group">
            <label for="evolution-mutation-rate">Default Mutation Rate</label>
            <input type="number" id="evolution-mutation-rate" name="evolution-mutation-rate" value="${this.config.evolution.defaultPopulationOptions.mutationRate}" min="0" max="1" step="0.01">
          </div>
        </form>
      `;
      
      const result = await this.showDialog('Settings', content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'save', label: 'Save' }
      ]);
      
      if (result === 'save') {
        const generations = parseInt(document.getElementById('evolution-generations').value);
        const populationSize = parseInt(document.getElementById('evolution-population-size').value);
        const mutationRate = parseFloat(document.getElementById('evolution-mutation-rate').value);
        
        // Update config
        this.config.evolution.defaultPopulationOptions.generations = generations;
        this.config.evolution.defaultPopulationOptions.populationSize = populationSize;
        this.config.evolution.defaultPopulationOptions.mutationRate = mutationRate;
        
        await this.showNotification('Settings saved', 'success');
      }
    } catch (error) {
      this.logger.error(`Failed to show settings dialog: ${error.message}`, error);
      await this.showNotification(`Failed to save settings: ${error.message}`, 'error');
    }
  }

  /**
   * Show evolve agent dialog
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _showEvolveAgentDialog(agentId) {
    try {
      // Get populations
      const populations = this.evolutionSystem.listPopulations();
      
      if (populations.length === 0) {
        await this.showNotification('No populations available for evolution', 'error');
        return;
      }
      
      const content = `
        <form id="evolve-agent-form">
          <div class="form-group">
            <label for="population-id">Population</label>
            <select id="population-id" name="population-id">
              ${populations.map(population => `
                <option value="${population.id}">${population.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="generations">Generations</label>
            <input type="number" id="generations" name="generations" value="10" min="1" max="100">
          </div>
        </form>
      `;
      
      const result = await this.showDialog(`Evolve Agent: ${agentId}`, content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'evolve', label: 'Evolve' }
      ]);
      
      if (result === 'evolve') {
        const populationId = document.getElementById('population-id').value;
        const generations = parseInt(document.getElementById('generations').value);
        
        // Add agent to population if not already in it
        const populationInfo = this.evolutionSystem.getPopulationInfo(populationId);
        
        if (!populationInfo.agentIds.includes(agentId)) {
          await this.evolutionSystem.addAgentToPopulation(populationId, agentId);
        }
        
        // Evolve population
        await this.evolutionSystem.evolvePopulation(populationId, {
          generations
        });
        
        // Trigger events
        await this.triggerEvent('agent:evolved', { agentId });
        await this.triggerEvent('population:evolved', { populationId });
        
        // Update agent details
        await this.components.get('agentDetails').showAgent(agentId);
      }
    } catch (error) {
      this.logger.error(`Failed to evolve agent ${agentId}: ${error.message}`, error);
      await this.showNotification(`Failed to evolve agent: ${error.message}`, 'error');
    }
  }

  /**
   * Show benchmark agent dialog
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _showBenchmarkAgentDialog(agentId) {
    try {
      // Get benchmarks
      const benchmarks = this.evolutionSystem.listBenchmarks();
      
      if (benchmarks.length === 0) {
        await this.showNotification('No benchmarks available', 'error');
        return;
      }
      
      const content = `
        <form id="benchmark-agent-form">
          <div class="form-group">
            <label for="benchmark-id">Benchmark</label>
            <select id="benchmark-id" name="benchmark-id">
              ${benchmarks.map(benchmark => `
                <option value="${benchmark.id}">${benchmark.name}</option>
              `).join('')}
            </select>
          </div>
        </form>
      `;
      
      const result = await this.showDialog(`Benchmark Agent: ${agentId}`, content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'benchmark', label: 'Benchmark' }
      ]);
      
      if (result === 'benchmark') {
        const benchmarkId = document.getElementById('benchmark-id').value;
        
        // Run benchmark
        const benchmarkResults = await this.evolutionSystem.runBenchmark(agentId, benchmarkId);
        
        // Show results
        const resultsContent = `
          <div class="benchmark-results">
            <h3>Benchmark Results</h3>
            <table>
              <tr>
                <th>Tasks Completed</th>
                <td>${benchmarkResults.results.summary.tasksCompleted}</td>
              </tr>
              <tr>
                <th>Tasks Succeeded</th>
                <td>${benchmarkResults.results.summary.tasksSucceeded}</td>
              </tr>
              <tr>
                <th>Tasks Failed</th>
                <td>${benchmarkResults.results.summary.tasksFailed}</td>
              </tr>
              <tr>
                <th>Average Response Time</th>
                <td>${benchmarkResults.results.summary.averageResponseTime.toFixed(2)} ms</td>
              </tr>
              <tr>
                <th>Average Accuracy</th>
                <td>${(benchmarkResults.results.summary.averageAccuracy * 100).toFixed(2)}%</td>
              </tr>
            </table>
          </div>
        `;
        
        await this.showDialog('Benchmark Results', resultsContent, [
          { id: 'close', label: 'Close' }
        ]);
        
        // Update agent details
        await this.components.get('agentDetails').showAgent(agentId);
      }
    } catch (error) {
      this.logger.error(`Failed to benchmark agent ${agentId}: ${error.message}`, error);
      await this.showNotification(`Failed to benchmark agent: ${error.message}`, 'error');
    }
  }

  /**
   * Show delete agent dialog
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async _showDeleteAgentDialog(agentId) {
    try {
      const content = `
        <p>Are you sure you want to delete agent "${agentId}"?</p>
        <p>This action cannot be undone.</p>
      `;
      
      const result = await this.showDialog(`Delete Agent: ${agentId}`, content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'delete', label: 'Delete' }
      ]);
      
      if (result === 'delete') {
        // Delete agent
        await this.evolutionSystem.unregisterAgent(agentId);
        
        // Trigger event
        await this.triggerEvent('agent:deleted', { agentId });
        
        // Show placeholder
        document.getElementById('agent-details-placeholder').style.display = 'block';
        document.getElementById('agent-details').style.display = 'none';
      }
    } catch (error) {
      this.logger.error(`Failed to delete agent ${agentId}: ${error.message}`, error);
      await this.showNotification(`Failed to delete agent: ${error.message}`, 'error');
    }
  }

  /**
   * Show evolve population dialog
   * @private
   * @param {string} populationId - Population ID
   * @returns {Promise<void>}
   */
  async _showEvolvePopulationDialog(populationId) {
    try {
      const content = `
        <form id="evolve-population-form">
          <div class="form-group">
            <label for="generations">Generations</label>
            <input type="number" id="generations" name="generations" value="10" min="1" max="100">
          </div>
          <div class="form-group">
            <label for="selection-method">Selection Method</label>
            <select id="selection-method" name="selection-method">
              <option value="tournament">Tournament</option>
              <option value="roulette">Roulette Wheel</option>
              <option value="rank">Rank</option>
            </select>
          </div>
          <div class="form-group">
            <label for="crossover-method">Crossover Method</label>
            <select id="crossover-method" name="crossover-method">
              <option value="uniform">Uniform</option>
              <option value="onepoint">One Point</option>
              <option value="twopoint">Two Point</option>
            </select>
          </div>
          <div class="form-group">
            <label for="mutation-rate">Mutation Rate</label>
            <input type="number" id="mutation-rate" name="mutation-rate" value="0.01" min="0" max="1" step="0.01">
          </div>
        </form>
      `;
      
      const result = await this.showDialog(`Evolve Population: ${populationId}`, content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'evolve', label: 'Evolve' }
      ]);
      
      if (result === 'evolve') {
        const generations = parseInt(document.getElementById('generations').value);
        const selectionMethod = document.getElementById('selection-method').value;
        const crossoverMethod = document.getElementById('crossover-method').value;
        const mutationRate = parseFloat(document.getElementById('mutation-rate').value);
        
        // Evolve population
        await this.evolutionSystem.evolvePopulation(populationId, {
          generations,
          selectionMethod,
          crossoverMethod,
          mutationRate
        });
        
        // Trigger event
        await this.triggerEvent('population:evolved', { populationId });
        
        // Update population details
        await this.components.get('populationDetails').showPopulation(populationId);
      }
    } catch (error) {
      this.logger.error(`Failed to evolve population ${populationId}: ${error.message}`, error);
      await this.showNotification(`Failed to evolve population: ${error.message}`, 'error');
    }
  }

  /**
   * Show add agent to population dialog
   * @private
   * @param {string} populationId - Population ID
   * @returns {Promise<void>}
   */
  async _showAddAgentToPopulationDialog(populationId) {
    try {
      // Get agents
      const agents = this.evolutionSystem.listAgents();
      
      if (agents.length === 0) {
        await this.showNotification('No agents available to add', 'error');
        return;
      }
      
      // Get population
      const populationInfo = this.evolutionSystem.getPopulationInfo(populationId);
      
      // Filter out agents already in population
      const availableAgents = agents.filter(agent => !populationInfo.agentIds.includes(agent.id));
      
      if (availableAgents.length === 0) {
        await this.showNotification('All agents are already in this population', 'info');
        return;
      }
      
      const content = `
        <form id="add-agent-form">
          <div class="form-group">
            <label for="agent-id">Agent</label>
            <select id="agent-id" name="agent-id">
              ${availableAgents.map(agent => `
                <option value="${agent.id}">${agent.id}</option>
              `).join('')}
            </select>
          </div>
        </form>
      `;
      
      const result = await this.showDialog(`Add Agent to Population: ${populationId}`, content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'add', label: 'Add' }
      ]);
      
      if (result === 'add') {
        const agentId = document.getElementById('agent-id').value;
        
        // Add agent to population
        await this.evolutionSystem.addAgentToPopulation(populationId, agentId);
        
        // Update population details
        await this.components.get('populationDetails').showPopulation(populationId);
        
        await this.showNotification(`Agent ${agentId} added to population ${populationId}`, 'success');
      }
    } catch (error) {
      this.logger.error(`Failed to add agent to population ${populationId}: ${error.message}`, error);
      await this.showNotification(`Failed to add agent to population: ${error.message}`, 'error');
    }
  }

  /**
   * Show delete population dialog
   * @private
   * @param {string} populationId - Population ID
   * @returns {Promise<void>}
   */
  async _showDeletePopulationDialog(populationId) {
    try {
      const content = `
        <p>Are you sure you want to delete population "${populationId}"?</p>
        <p>This action cannot be undone.</p>
      `;
      
      const result = await this.showDialog(`Delete Population: ${populationId}`, content, [
        { id: 'cancel', label: 'Cancel' },
        { id: 'delete', label: 'Delete' }
      ]);
      
      if (result === 'delete') {
        // Delete population
        await this.evolutionSystem.deletePopulation(populationId);
        
        // Trigger event
        await this.triggerEvent('population:deleted', { populationId });
        
        // Show placeholder
        document.getElementById('population-details-placeholder').style.display = 'block';
        document.getElementById('population-details').style.display = 'none';
      }
    } catch (error) {
      this.logger.error(`Failed to delete population ${populationId}: ${error.message}`, error);
      await this.showNotification(`Failed to delete population: ${error.message}`, 'error');
    }
  }
}

module.exports = PlaygroundUI;
