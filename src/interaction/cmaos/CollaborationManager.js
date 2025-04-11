/**
 * CollaborationManager - Manages collaboration patterns and workflows
 * 
 * This component is responsible for:
 * - Tracking multi-agent workflows
 * - Managing collaboration templates
 * - Monitoring collaboration progress
 * - Providing collaboration analytics
 */

class CollaborationManager {
  /**
   * Create a new CollaborationManager instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.templates = new Map(); // Map of templateId -> template
    this.workflows = new Map(); // Map of workflowId -> workflow
    this.tasks = new Map(); // Map of taskId -> task
    this.logger = config.logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the CollaborationManager
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing CollaborationManager');
      
      // Load predefined templates if provided
      if (this.config.predefinedTemplates) {
        for (const template of this.config.predefinedTemplates) {
          this.templates.set(template.id, template);
        }
      }
      
      this.initialized = true;
      this.logger.info('CollaborationManager initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`CollaborationManager initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the CollaborationManager
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      this.logger.info('Stopping CollaborationManager');
      
      // Perform cleanup if needed
      
      this.initialized = false;
      this.logger.info('CollaborationManager stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`CollaborationManager shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new collaboration template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} - Created template
   */
  async createTemplate(templateData) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      const templateId = templateData.id || this._generateId('template');
      
      // Check if template already exists
      if (this.templates.has(templateId)) {
        throw new Error(`Template ${templateId} already exists`);
      }
      
      // Create template object
      const template = {
        id: templateId,
        name: templateData.name || `Template ${templateId}`,
        description: templateData.description || '',
        roles: templateData.roles || [],
        workflow: templateData.workflow || [],
        createdAt: new Date(),
        metadata: templateData.metadata || {},
        ...templateData
      };
      
      // Validate template
      this._validateTemplate(template);
      
      // Store template
      this.templates.set(templateId, template);
      
      this.logger.info(`Created template ${templateId}: ${template.name}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   * @param {string} templateId - Template ID
   * @returns {Object} - Template object
   */
  getTemplate(templateId) {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    return template;
  }

  /**
   * Update a template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated template
   */
  async updateTemplate(templateId, updates) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Get template
      const template = this.getTemplate(templateId);
      
      // Create updated template
      const updatedTemplate = {
        ...template,
        ...updates,
        updatedAt: new Date()
      };
      
      // Validate updated template
      this._validateTemplate(updatedTemplate);
      
      // Store updated template
      this.templates.set(templateId, updatedTemplate);
      
      this.logger.info(`Updated template ${templateId}`);
      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template ${templateId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete a template
   * @param {string} templateId - Template ID
   * @returns {Promise<boolean>} - Resolves to true if deletion is successful
   */
  async deleteTemplate(templateId) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Check if template exists
      if (!this.templates.has(templateId)) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      // Delete template
      this.templates.delete(templateId);
      
      this.logger.info(`Deleted template ${templateId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete template ${templateId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * List all templates
   * @returns {Array<Object>} - List of templates
   */
  listTemplates() {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    return Array.from(this.templates.values());
  }

  /**
   * Create a new task from a template
   * @param {string} templateId - Template ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created task
   */
  async createTaskFromTemplate(templateId, taskData = {}) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Get template
      const template = this.getTemplate(templateId);
      
      const taskId = taskData.id || this._generateId('task');
      
      // Check if task already exists
      if (this.tasks.has(taskId)) {
        throw new Error(`Task ${taskId} already exists`);
      }
      
      // Create task object
      const task = {
        id: taskId,
        templateId,
        name: taskData.name || template.name,
        description: taskData.description || template.description,
        roles: [...template.roles],
        workflow: JSON.parse(JSON.stringify(template.workflow)), // Deep copy
        status: 'pending',
        assignments: [],
        progress: {
          completedSteps: [],
          currentSteps: [],
          metrics: {}
        },
        createdAt: new Date(),
        metadata: {
          ...template.metadata,
          ...taskData.metadata
        },
        ...taskData
      };
      
      // Store task
      this.tasks.set(taskId, task);
      
      this.logger.info(`Created task ${taskId} from template ${templateId}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task from template ${templateId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new task without a template
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created task
   */
  async createTask(taskData) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      const taskId = taskData.id || this._generateId('task');
      
      // Check if task already exists
      if (this.tasks.has(taskId)) {
        throw new Error(`Task ${taskId} already exists`);
      }
      
      // Create task object
      const task = {
        id: taskId,
        name: taskData.name || `Task ${taskId}`,
        description: taskData.description || '',
        roles: taskData.roles || [],
        workflow: taskData.workflow || [],
        status: 'pending',
        assignments: [],
        progress: {
          completedSteps: [],
          currentSteps: [],
          metrics: {}
        },
        createdAt: new Date(),
        metadata: taskData.metadata || {},
        ...taskData
      };
      
      // Validate task
      this._validateTask(task);
      
      // Store task
      this.tasks.set(taskId, task);
      
      this.logger.info(`Created task ${taskId}: ${task.name}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a task by ID
   * @param {string} taskId - Task ID
   * @returns {Object} - Task object
   */
  getTask(taskId) {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return task;
  }

  /**
   * Update a task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated task
   */
  async updateTask(taskId, updates) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Get task
      const task = this.getTask(taskId);
      
      // Create updated task
      const updatedTask = {
        ...task,
        ...updates,
        updatedAt: new Date()
      };
      
      // Validate updated task
      this._validateTask(updatedTask);
      
      // Store updated task
      this.tasks.set(taskId, updatedTask);
      
      this.logger.info(`Updated task ${taskId}`);
      return updatedTask;
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Assign an agent to a role in a task
   * @param {string} taskId - Task ID
   * @param {string} roleId - Role ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Updated task
   */
  async assignAgentToTask(taskId, roleId, agentId) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Get task
      const task = this.getTask(taskId);
      
      // Check if role exists in task
      if (!task.roles.includes(roleId)) {
        throw new Error(`Role ${roleId} not found in task ${taskId}`);
      }
      
      // Check if role is already assigned
      const existingAssignment = task.assignments.find(a => a.roleId === roleId);
      if (existingAssignment) {
        throw new Error(`Role ${roleId} is already assigned to agent ${existingAssignment.agentId} in task ${taskId}`);
      }
      
      // Create assignment
      const assignment = {
        roleId,
        agentId,
        status: 'assigned',
        assignedAt: new Date()
      };
      
      // Add assignment to task
      task.assignments.push(assignment);
      
      // Check if all roles are assigned
      const allRolesAssigned = task.roles.every(role => 
        task.assignments.some(a => a.roleId === role)
      );
      
      // Update task status if all roles are assigned
      if (allRolesAssigned && task.status === 'pending') {
        task.status = 'ready';
        
        // Initialize current steps with steps that have no dependencies
        task.progress.currentSteps = task.workflow
          .filter(step => !step.dependencies || step.dependencies.length === 0)
          .map(step => step.id);
      }
      
      this.logger.info(`Assigned agent ${agentId} to role ${roleId} in task ${taskId}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to assign agent ${agentId} to role ${roleId} in task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Start a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Updated task
   */
  async startTask(taskId) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Get task
      const task = this.getTask(taskId);
      
      // Check if task is ready
      if (task.status !== 'ready') {
        throw new Error(`Task ${taskId} is not ready to start`);
      }
      
      // Update task status
      task.status = 'in-progress';
      task.startedAt = new Date();
      
      this.logger.info(`Started task ${taskId}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to start task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Complete a step in a task
   * @param {string} taskId - Task ID
   * @param {string} stepId - Step ID
   * @param {Object} result - Step result
   * @returns {Promise<Object>} - Updated task
   */
  async completeStep(taskId, stepId, result = {}) {
    try {
      if (!this.initialized) {
        throw new Error('CollaborationManager not initialized');
      }
      
      // Get task
      const task = this.getTask(taskId);
      
      // Check if task is in progress
      if (task.status !== 'in-progress') {
        throw new Error(`Task ${taskId} is not in progress`);
      }
      
      // Check if step exists in workflow
      const step = task.workflow.find(s => s.id === stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found in task ${taskId}`);
      }
      
      // Check if step is in current steps
      if (!task.progress.currentSteps.includes(stepId)) {
        throw new Error(`Step ${stepId} is not currently active in task ${taskId}`);
      }
      
      // Mark step as completed
      task.progress.completedSteps.push(stepId);
      
      // Remove step from current steps
      task.progress.currentSteps = task.progress.currentSteps.filter(id => id !== stepId);
      
      // Store step result
      if (!task.progress.results) {
        task.progress.results = {};
      }
      task.progress.results[stepId] = {
        ...result,
        completedAt: new Date()
      };
      
      // Update current steps
      this._updateCurrentSteps(task);
      
      // Check if all steps are completed
      if (task.progress.completedSteps.length === task.workflow.length) {
        task.status = 'completed';
        task.completedAt = new Date();
      }
      
      this.logger.info(`Completed step ${stepId} in task ${taskId}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to complete step ${stepId} in task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get task progress
   * @param {string} taskId - Task ID
   * @returns {Object} - Task progress
   */
  getTaskProgress(taskId) {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    // Get task
    const task = this.getTask(taskId);
    
    // Calculate progress percentage
    const totalSteps = task.workflow.length;
    const completedSteps = task.progress.completedSteps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    return {
      taskId,
      status: task.status,
      progressPercentage,
      completedSteps,
      totalSteps,
      currentSteps: task.progress.currentSteps,
      results: task.progress.results || {}
    };
  }

  /**
   * Get tasks by status
   * @param {string} status - Task status
   * @returns {Array<Object>} - List of tasks
   */
  getTasksByStatus(status) {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * Get tasks assigned to an agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Object>} - List of tasks
   */
  getAgentTasks(agentId) {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    return Array.from(this.tasks.values()).filter(task => 
      task.assignments.some(assignment => assignment.agentId === agentId)
    );
  }

  /**
   * Get agent's current steps in a task
   * @param {string} taskId - Task ID
   * @param {string} agentId - Agent ID
   * @returns {Array<Object>} - List of steps
   */
  getAgentCurrentSteps(taskId, agentId) {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    // Get task
    const task = this.getTask(taskId);
    
    // Get agent's role
    const assignment = task.assignments.find(a => a.agentId === agentId);
    if (!assignment) {
      throw new Error(`Agent ${agentId} is not assigned to task ${taskId}`);
    }
    
    const roleId = assignment.roleId;
    
    // Get current steps for agent's role
    return task.workflow
      .filter(step => 
        task.progress.currentSteps.includes(step.id) && 
        step.roles.includes(roleId)
      );
  }

  /**
   * Get collaboration analytics
   * @returns {Object} - Collaboration analytics
   */
  getCollaborationAnalytics() {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }
    
    const tasks = Array.from(this.tasks.values());
    
    // Calculate task statistics
    const taskStats = {
      total: tasks.length,
      byStatus: {
        pending: tasks.filter(task => task.status === 'pending').length,
        ready: tasks.filter(task => task.status === 'ready').length,
        'in-progress': tasks.filter(task => task.status === 'in-progress').length,
        completed: tasks.filter(task => task.status === 'completed').length,
        failed: tasks.filter(task => task.status === 'failed').length
      }
    };
    
    // Calculate agent participation
    const agentParticipation = {};
    for (const task of tasks) {
      for (const assignment of task.assignments) {
        const agentId = assignment.agentId;
        if (!agentParticipation[agentId]) {
          agentParticipation[agentId] = {
            totalTasks: 0,
            completedTasks: 0,
            roles: new Set()
          };
        }
        
        agentParticipation[agentId].totalTasks++;
        if (task.status === 'completed') {
          agentParticipation[agentId].completedTasks++;
        }
        agentParticipation[agentId].roles.add(assignment.roleId);
      }
    }
    
    // Convert sets to arrays for serialization
    for (const agentId in agentParticipation) {
      agentParticipation[agentId].roles = Array.from(agentParticipation[agentId].roles);
    }
    
    // Calculate template usage
    const templateUsage = {};
    for (const task of tasks) {
      if (task.templateId) {
        if (!templateUsage[task.templateId]) {
          templateUsage[task.templateId] = 0;
        }
        templateUsage[task.templateId]++;
      }
    }
    
    return {
      taskStats,
      agentParticipation,
      templateUsage,
      timestamp: new Date()
    };
  }

  /**
   * Validate a template
   * @private
   * @param {Object} template - Template to validate
   * @throws {Error} - If template is invalid
   */
  _validateTemplate(template) {
    // Check required fields
    if (!template.name) {
      throw new Error('Template name is required');
    }
    
    if (!Array.isArray(template.roles) || template.roles.length === 0) {
      throw new Error('Template must have at least one role');
    }
    
    if (!Array.isArray(template.workflow) || template.workflow.length === 0) {
      throw new Error('Template must have at least one workflow step');
    }
    
    // Validate workflow steps
    const stepIds = new Set();
    
    for (const step of template.workflow) {
      if (!step.id) {
        throw new Error('Workflow step must have an ID');
      }
      
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }
      
      stepIds.add(step.id);
      
      if (!step.name) {
        throw new Error(`Step ${step.id} must have a name`);
      }
      
      if (!Array.isArray(step.roles) || step.roles.length === 0) {
        throw new Error(`Step ${step.id} must have at least one role`);
      }
      
      // Check if roles exist in template
      for (const roleId of step.roles) {
        if (!template.roles.includes(roleId)) {
          throw new Error(`Step ${step.id} references unknown role: ${roleId}`);
        }
      }
      
      // Check dependencies
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepIds.has(depId)) {
            throw new Error(`Step ${step.id} depends on unknown step: ${depId}`);
          }
        }
      }
    }
    
    // Check for circular dependencies
    this._checkCircularDependencies(template.workflow);
  }

  /**
   * Validate a task
   * @private
   * @param {Object} task - Task to validate
   * @throws {Error} - If task is invalid
   */
  _validateTask(task) {
    // Check required fields
    if (!task.name) {
      throw new Error('Task name is required');
    }
    
    if (!Array.isArray(task.roles) || task.roles.length === 0) {
      throw new Error('Task must have at least one role');
    }
    
    if (!Array.isArray(task.workflow) || task.workflow.length === 0) {
      throw new Error('Task must have at least one workflow step');
    }
    
    // Validate workflow steps
    const stepIds = new Set();
    
    for (const step of task.workflow) {
      if (!step.id) {
        throw new Error('Workflow step must have an ID');
      }
      
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }
      
      stepIds.add(step.id);
      
      if (!step.name) {
        throw new Error(`Step ${step.id} must have a name`);
      }
      
      if (!Array.isArray(step.roles) || step.roles.length === 0) {
        throw new Error(`Step ${step.id} must have at least one role`);
      }
      
      // Check if roles exist in task
      for (const roleId of step.roles) {
        if (!task.roles.includes(roleId)) {
          throw new Error(`Step ${step.id} references unknown role: ${roleId}`);
        }
      }
      
      // Check dependencies
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepIds.has(depId)) {
            throw new Error(`Step ${step.id} depends on unknown step: ${depId}`);
          }
        }
      }
    }
    
    // Check for circular dependencies
    this._checkCircularDependencies(task.workflow);
  }

  /**
   * Check for circular dependencies in workflow
   * @private
   * @param {Array<Object>} workflow - Workflow steps
   * @throws {Error} - If circular dependencies are found
   */
  _checkCircularDependencies(workflow) {
    // Build dependency graph
    const graph = {};
    
    for (const step of workflow) {
      graph[step.id] = step.dependencies || [];
    }
    
    // Check for cycles using DFS
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (nodeId) => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        for (const neighbor of graph[nodeId]) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) {
            return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const step of workflow) {
      if (!visited.has(step.id) && hasCycle(step.id)) {
        throw new Error('Circular dependencies detected in workflow');
      }
    }
  }

  /**
   * Update current steps in a task
   * @private
   * @param {Object} task - Task to update
   */
  _updateCurrentSteps(task) {
    // Find steps that can be started
    for (const step of task.workflow) {
      // Skip completed steps
      if (task.progress.completedSteps.includes(step.id)) {
        continue;
      }
      
      // Skip steps already in current steps
      if (task.progress.currentSteps.includes(step.id)) {
        continue;
      }
      
      // Check if all dependencies are completed
      const allDependenciesCompleted = !step.dependencies || 
        step.dependencies.length === 0 || 
        step.dependencies.every(depId => task.progress.completedSteps.includes(depId));
      
      if (allDependenciesCompleted) {
        task.progress.currentSteps.push(step.id);
      }
    }
  }

  /**
   * Generate a unique ID
   * @private
   * @param {string} prefix - ID prefix
   * @returns {string} - Unique ID
   */
  _generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}_${timestamp}_${random}`;
  }
}

module.exports = CollaborationManager;
