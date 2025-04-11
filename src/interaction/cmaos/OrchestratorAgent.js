/**
 * OrchestratorAgent - Central coordination of multi-agent teams and workflows
 * 
 * This component is responsible for:
 * - Team formation and management
 * - Role assignment based on agent capabilities
 * - Task distribution and coordination
 * - Workflow orchestration
 * - Performance monitoring
 */

class OrchestratorAgent {
  /**
   * Create a new OrchestratorAgent instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.teamRegistry = config.teamRegistry;
    this.collaborationManager = config.collaborationManager;
    this.negotiationProtocol = config.negotiationProtocol;
    this.collectiveIntelligence = config.collectiveIntelligence;
    this.messageBroker = config.messageBroker;
    this.agentCommunication = config.agentCommunication;
    this.logger = config.logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the OrchestratorAgent
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing OrchestratorAgent');
      
      // Check required dependencies
      if (!this.teamRegistry) {
        throw new Error('TeamRegistry is required');
      }
      
      if (!this.collaborationManager) {
        throw new Error('CollaborationManager is required');
      }
      
      if (!this.negotiationProtocol) {
        throw new Error('NegotiationProtocol is required');
      }
      
      if (!this.messageBroker) {
        throw new Error('MessageBroker is required');
      }
      
      if (!this.agentCommunication) {
        throw new Error('AgentCommunication is required');
      }
      
      // Subscribe to relevant events
      await this._subscribeToEvents();
      
      this.initialized = true;
      this.logger.info('OrchestratorAgent initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`OrchestratorAgent initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the OrchestratorAgent
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      this.logger.info('Stopping OrchestratorAgent');
      
      // Unsubscribe from events
      await this._unsubscribeFromEvents();
      
      this.initialized = false;
      this.logger.info('OrchestratorAgent stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`OrchestratorAgent shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Form a new team
   * @param {Object} teamData - Team data
   * @returns {Promise<Object>} - Created team
   */
  async formTeam(teamData) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Forming team: ${teamData.name}`);
      
      // Create team in registry
      const team = await this.teamRegistry.createTeam(teamData);
      
      // Create roles if needed
      for (const roleData of (teamData.roles || [])) {
        if (typeof roleData === 'object' && !this.teamRegistry.getRole(roleData.id)) {
          await this.teamRegistry.createRole(roleData);
        }
      }
      
      this.logger.info(`Team formed: ${team.id}`);
      return team;
    } catch (error) {
      this.logger.error(`Failed to form team: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Assign agents to team roles
   * @param {string} teamId - Team ID
   * @param {Array<Object>} assignments - Role assignments
   * @returns {Promise<Object>} - Updated team
   */
  async assignTeamRoles(teamId, assignments) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Assigning roles for team ${teamId}`);
      
      // Get team
      const team = this.teamRegistry.getTeam(teamId);
      
      // Process assignments
      for (const assignment of assignments) {
        const { agentId, roleId, capabilities } = assignment;
        
        // Get agent capabilities if not provided
        const agentCapabilities = capabilities || await this._getAgentCapabilities(agentId);
        
        // Add agent to team with role
        await this.teamRegistry.addAgentToTeam(teamId, agentId, roleId, agentCapabilities);
        
        // Notify agent of assignment
        await this._notifyAgentOfRoleAssignment(agentId, teamId, roleId);
      }
      
      this.logger.info(`Roles assigned for team ${teamId}`);
      return this.teamRegistry.getTeam(teamId);
    } catch (error) {
      this.logger.error(`Failed to assign team roles for team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a task for a team
   * @param {string} teamId - Team ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created task
   */
  async createTeamTask(teamId, taskData) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Creating task for team ${teamId}`);
      
      // Get team
      const team = this.teamRegistry.getTeam(teamId);
      
      // Create task
      let task;
      if (taskData.templateId) {
        task = await this.collaborationManager.createTaskFromTemplate(taskData.templateId, {
          ...taskData,
          teamId
        });
      } else {
        task = await this.collaborationManager.createTask({
          ...taskData,
          teamId
        });
      }
      
      // Assign team members to task roles
      for (const member of team.members) {
        if (task.roles.includes(member.role)) {
          await this.collaborationManager.assignAgentToTask(task.id, member.role, member.agentId);
        }
      }
      
      // Start task if all roles are assigned
      if (task.status === 'ready') {
        await this.collaborationManager.startTask(task.id);
      }
      
      this.logger.info(`Created task ${task.id} for team ${teamId}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task for team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Distribute a task using bidding
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Task bidding
   */
  async distributeTaskWithBidding(taskData) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Distributing task with bidding: ${taskData.name}`);
      
      // Create task bidding
      const bidding = await this.negotiationProtocol.createTaskBidding(taskData);
      
      // Broadcast bidding opportunity to agents
      await this._broadcastBiddingOpportunity(bidding);
      
      this.logger.info(`Task bidding created: ${bidding.taskId}`);
      return bidding;
    } catch (error) {
      this.logger.error(`Failed to distribute task with bidding: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Form a team based on bidding results
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Formed team
   */
  async formTeamFromBidding(taskId) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Forming team from bidding for task ${taskId}`);
      
      // Close bidding
      const biddingResult = await this.negotiationProtocol.closeBidding(taskId);
      
      // Get bidding
      const bidding = this.negotiationProtocol.getTaskBidding(taskId);
      
      // Create team
      const team = await this.teamRegistry.createTeam({
        name: `Team for ${bidding.name}`,
        description: `Team formed for task: ${bidding.description}`,
        roles: bidding.roles
      });
      
      // Assign agents to team based on bidding results
      for (const assignment of biddingResult.assignments) {
        await this.teamRegistry.addAgentToTeam(
          team.id,
          assignment.agentId,
          assignment.roleId,
          assignment.bid.resources
        );
        
        // Notify agent of assignment
        await this._notifyAgentOfRoleAssignment(
          assignment.agentId,
          team.id,
          assignment.roleId
        );
      }
      
      // Create task for team
      const task = await this.collaborationManager.createTask({
        id: taskId,
        name: bidding.name,
        description: bidding.description,
        roles: bidding.roles,
        teamId: team.id,
        metadata: bidding.metadata
      });
      
      // Assign team members to task roles
      for (const assignment of biddingResult.assignments) {
        await this.collaborationManager.assignAgentToTask(
          task.id,
          assignment.roleId,
          assignment.agentId
        );
      }
      
      // Start task
      await this.collaborationManager.startTask(task.id);
      
      this.logger.info(`Team ${team.id} formed from bidding for task ${taskId}`);
      return {
        team,
        task,
        biddingResult
      };
    } catch (error) {
      this.logger.error(`Failed to form team from bidding for task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Monitor task progress
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Task progress
   */
  async monitorTaskProgress(taskId) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      // Get task progress
      const progress = this.collaborationManager.getTaskProgress(taskId);
      
      this.logger.info(`Task ${taskId} progress: ${progress.progressPercentage.toFixed(2)}%`);
      return progress;
    } catch (error) {
      this.logger.error(`Failed to monitor task ${taskId} progress: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Handle step completion
   * @param {string} taskId - Task ID
   * @param {string} stepId - Step ID
   * @param {string} agentId - Agent ID
   * @param {Object} result - Step result
   * @returns {Promise<Object>} - Updated task
   */
  async handleStepCompletion(taskId, stepId, agentId, result) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Agent ${agentId} completed step ${stepId} in task ${taskId}`);
      
      // Complete step in collaboration manager
      const task = await this.collaborationManager.completeStep(taskId, stepId, result);
      
      // Notify team of step completion
      await this._notifyTeamOfStepCompletion(task.teamId, taskId, stepId, agentId, result);
      
      // Check if task is completed
      if (task.status === 'completed') {
        await this._handleTaskCompletion(taskId);
      } else {
        // Notify agents of new current steps
        await this._notifyAgentsOfCurrentSteps(taskId);
      }
      
      return task;
    } catch (error) {
      this.logger.error(`Failed to handle step completion for task ${taskId}, step ${stepId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Resolve a conflict in a team
   * @param {string} teamId - Team ID
   * @param {Object} conflictData - Conflict data
   * @returns {Promise<Object>} - Resolved conflict
   */
  async resolveTeamConflict(teamId, conflictData) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      this.logger.info(`Resolving conflict in team ${teamId}: ${conflictData.issue}`);
      
      // Create conflict
      const conflict = await this.negotiationProtocol.createConflict({
        ...conflictData,
        teamId
      });
      
      // Notify team members of conflict
      await this._notifyTeamOfConflict(teamId, conflict);
      
      // If mediation strategy, create mediator proposal
      if (conflict.resolutionStrategy === 'mediation') {
        await this._createMediatorProposal(conflict.id);
      }
      
      this.logger.info(`Created conflict resolution process ${conflict.id} for team ${teamId}`);
      return conflict;
    } catch (error) {
      this.logger.error(`Failed to resolve conflict in team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get team performance metrics
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} - Team performance metrics
   */
  async getTeamPerformanceMetrics(teamId) {
    try {
      if (!this.initialized) {
        throw new Error('OrchestratorAgent not initialized');
      }
      
      // Get team
      const team = this.teamRegistry.getTeam(teamId);
      
      // Get tasks for team
      const tasks = Array.from(this.collaborationManager.tasks.values())
        .filter(task => task.teamId === teamId);
      
      // Calculate metrics
      const metrics = {
        teamId,
        name: team.name,
        memberCount: team.members.length,
        taskMetrics: {
          total: tasks.length,
          completed: tasks.filter(task => task.status === 'completed').length,
          inProgress: tasks.filter(task => task.status === 'in-progress').length,
          pending: tasks.filter(task => task.status === 'pending' || task.status === 'ready').length
        },
        completionRate: 0,
        averageTaskDuration: 0,
        memberContributions: {}
      };
      
      // Calculate completion rate
      if (tasks.length > 0) {
        metrics.completionRate = (metrics.taskMetrics.completed / tasks.length) * 100;
      }
      
      // Calculate average task duration
      const completedTasks = tasks.filter(task => 
        task.status === 'completed' && task.startedAt && task.completedAt
      );
      
      if (completedTasks.length > 0) {
        const totalDuration = completedTasks.reduce((sum, task) => {
          const duration = task.completedAt.getTime() - task.startedAt.getTime();
          return sum + duration;
        }, 0);
        
        metrics.averageTaskDuration = totalDuration / completedTasks.length;
      }
      
      // Calculate member contributions
      for (const member of team.members) {
        metrics.memberContributions[member.agentId] = {
          role: member.role,
          completedSteps: 0,
          totalSteps: 0
        };
      }
      
      for (const task of tasks) {
        if (task.progress && task.progress.results) {
          for (const [stepId, result] of Object.entries(task.progress.results)) {
            if (result.agentId && metrics.memberContributions[result.agentId]) {
              metrics.memberContributions[result.agentId].completedSteps++;
            }
          }
        }
        
        if (task.workflow) {
          for (const step of task.workflow) {
            for (const roleId of step.roles) {
              const member = team.members.find(m => m.role === roleId);
              if (member && metrics.memberContributions[member.agentId]) {
                metrics.memberContributions[member.agentId].totalSteps++;
              }
            }
          }
        }
      }
      
      this.logger.info(`Generated performance metrics for team ${teamId}`);
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get performance metrics for team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @private
   * @returns {Promise<void>}
   */
  async _subscribeToEvents() {
    try {
      // Subscribe to agent registration events
      await this.messageBroker.subscribe(
        'orchestrator',
        'topic:agent.registration',
        this._handleAgentRegistration.bind(this)
      );
      
      // Subscribe to task bidding events
      await this.messageBroker.subscribe(
        'orchestrator',
        'topic:task.bid',
        this._handleTaskBid.bind(this)
      );
      
      // Subscribe to step completion events
      await this.messageBroker.subscribe(
        'orchestrator',
        'topic:task.step.completed',
        this._handleStepCompletionEvent.bind(this)
      );
      
      // Subscribe to conflict proposal events
      await this.messageBroker.subscribe(
        'orchestrator',
        'topic:conflict.proposal',
        this._handleConflictProposal.bind(this)
      );
      
      // Subscribe to vote events
      await this.messageBroker.subscribe(
        'orchestrator',
        'topic:vote.cast',
        this._handleVoteCast.bind(this)
      );
      
      // Subscribe to insight events
      await this.messageBroker.subscribe(
        'orchestrator',
        'topic:insight.submitted',
        this._handleInsightSubmission.bind(this)
      );
    } catch (error) {
      this.logger.error(`Failed to subscribe to events: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from events
   * @private
   * @returns {Promise<void>}
   */
  async _unsubscribeFromEvents() {
    try {
      await this.messageBroker.unsubscribe('orchestrator', 'topic:agent.registration');
      await this.messageBroker.unsubscribe('orchestrator', 'topic:task.bid');
      await this.messageBroker.unsubscribe('orchestrator', 'topic:task.step.completed');
      await this.messageBroker.unsubscribe('orchestrator', 'topic:conflict.proposal');
      await this.messageBroker.unsubscribe('orchestrator', 'topic:vote.cast');
      await this.messageBroker.unsubscribe('orchestrator', 'topic:insight.submitted');
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from events: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Handle agent registration event
   * @private
   * @param {Object} message - Message object
   */
  async _handleAgentRegistration(message) {
    try {
      const { agentId, capabilities } = message.content;
      
      this.logger.debug(`Agent ${agentId} registered with capabilities: ${JSON.stringify(capabilities)}`);
      
      // Check for open biddings that match agent capabilities
      const openBiddings = Array.from(this.negotiationProtocol.bids.values())
        .filter(bidding => bidding.status === 'open');
      
      for (const bidding of openBiddings) {
        // Check if agent capabilities match any role requirements
        for (const roleId of bidding.roles) {
          const role = this.teamRegistry.getRole(roleId);
          
          // Check if agent has required capabilities for role
          const hasRequiredCapabilities = role.requiredCapabilities.every(
            capability => capabilities.includes(capability)
          );
          
          if (hasRequiredCapabilities) {
            // Notify agent of bidding opportunity
            await this._notifyAgentOfBiddingOpportunity(agentId, bidding, roleId);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error handling agent registration: ${error.message}`, error);
    }
  }

  /**
   * Handle task bid event
   * @private
   * @param {Object} message - Message object
   */
  async _handleTaskBid(message) {
    try {
      const { taskId, roleId, agentId, bid } = message.content;
      
      this.logger.debug(`Agent ${agentId} submitted bid for role ${roleId} in task ${taskId}`);
      
      // Submit bid
      await this.negotiationProtocol.submitBid(taskId, roleId, agentId, bid);
    } catch (error) {
      this.logger.error(`Error handling task bid: ${error.message}`, error);
    }
  }

  /**
   * Handle step completion event
   * @private
   * @param {Object} message - Message object
   */
  async _handleStepCompletionEvent(message) {
    try {
      const { taskId, stepId, agentId, result } = message.content;
      
      this.logger.debug(`Received step completion event for task ${taskId}, step ${stepId} from agent ${agentId}`);
      
      // Handle step completion
      await this.handleStepCompletion(taskId, stepId, agentId, result);
    } catch (error) {
      this.logger.error(`Error handling step completion event: ${error.message}`, error);
    }
  }

  /**
   * Handle conflict proposal event
   * @private
   * @param {Object} message - Message object
   */
  async _handleConflictProposal(message) {
    try {
      const { conflictId, agentId, proposal } = message.content;
      
      this.logger.debug(`Agent ${agentId} submitted proposal for conflict ${conflictId}`);
      
      // Add proposal to conflict
      await this.negotiationProtocol.addProposal(conflictId, agentId, proposal);
    } catch (error) {
      this.logger.error(`Error handling conflict proposal: ${error.message}`, error);
    }
  }

  /**
   * Handle vote cast event
   * @private
   * @param {Object} message - Message object
   */
  async _handleVoteCast(message) {
    try {
      const { voteId, agentId, choice, confidence } = message.content;
      
      this.logger.debug(`Agent ${agentId} cast vote in ${voteId}`);
      
      // Cast vote
      await this.collectiveIntelligence.castVote(voteId, agentId, choice, confidence);
    } catch (error) {
      this.logger.error(`Error handling vote cast: ${error.message}`, error);
    }
  }

  /**
   * Handle insight submission event
   * @private
   * @param {Object} message - Message object
   */
  async _handleInsightSubmission(message) {
    try {
      const { taskId, agentId, insight } = message.content;
      
      this.logger.debug(`Agent ${agentId} submitted insight for task ${taskId}`);
      
      // Add insight
      await this.collectiveIntelligence.addInsight(taskId, agentId, insight);
    } catch (error) {
      this.logger.error(`Error handling insight submission: ${error.message}`, error);
    }
  }

  /**
   * Get agent capabilities
   * @private
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Agent capabilities
   */
  async _getAgentCapabilities(agentId) {
    try {
      // Get agent info
      const agentInfo = this.agentCommunication.getAgentInfo(agentId);
      
      return agentInfo.capabilities || {};
    } catch (error) {
      this.logger.error(`Failed to get agent ${agentId} capabilities: ${error.message}`, error);
      return {};
    }
  }

  /**
   * Notify agent of role assignment
   * @private
   * @param {string} agentId - Agent ID
   * @param {string} teamId - Team ID
   * @param {string} roleId - Role ID
   * @returns {Promise<void>}
   */
  async _notifyAgentOfRoleAssignment(agentId, teamId, roleId) {
    try {
      // Get team and role
      const team = this.teamRegistry.getTeam(teamId);
      const role = this.teamRegistry.getRole(roleId);
      
      // Create notification message
      const message = {
        type: 'notification',
        content: {
          event: 'team.role.assigned',
          data: {
            teamId,
            teamName: team.name,
            roleId,
            roleName: role.name,
            permissions: role.permissions
          }
        }
      };
      
      // Send message to agent
      await this.messageBroker.publishMessage({
        ...message,
        sender: 'orchestrator',
        recipient: agentId,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error(`Failed to notify agent ${agentId} of role assignment: ${error.message}`, error);
    }
  }

  /**
   * Broadcast bidding opportunity to agents
   * @private
   * @param {Object} bidding - Bidding object
   * @returns {Promise<void>}
   */
  async _broadcastBiddingOpportunity(bidding) {
    try {
      // Create broadcast message
      const message = {
        type: 'notification',
        content: {
          event: 'task.bidding.opportunity',
          data: {
            taskId: bidding.taskId,
            name: bidding.name,
            description: bidding.description,
            roles: bidding.roles,
            requirements: bidding.requirements,
            deadline: bidding.deadline
          }
        }
      };
      
      // Broadcast message
      await this.messageBroker.publishMessage({
        ...message,
        sender: 'orchestrator',
        recipient: 'topic:broadcast',
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast bidding opportunity: ${error.message}`, error);
    }
  }

  /**
   * Notify agent of bidding opportunity
   * @private
   * @param {string} agentId - Agent ID
   * @param {Object} bidding - Bidding object
   * @param {string} roleId - Role ID
   * @returns {Promise<void>}
   */
  async _notifyAgentOfBiddingOpportunity(agentId, bidding, roleId) {
    try {
      // Get role
      const role = this.teamRegistry.getRole(roleId);
      
      // Create notification message
      const message = {
        type: 'notification',
        content: {
          event: 'task.bidding.opportunity',
          data: {
            taskId: bidding.taskId,
            name: bidding.name,
            description: bidding.description,
            roleId,
            roleName: role.name,
            requirements: bidding.requirements,
            deadline: bidding.deadline
          }
        }
      };
      
      // Send message to agent
      await this.messageBroker.publishMessage({
        ...message,
        sender: 'orchestrator',
        recipient: agentId,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error(`Failed to notify agent ${agentId} of bidding opportunity: ${error.message}`, error);
    }
  }

  /**
   * Notify team of step completion
   * @private
   * @param {string} teamId - Team ID
   * @param {string} taskId - Task ID
   * @param {string} stepId - Step ID
   * @param {string} agentId - Agent ID
   * @param {Object} result - Step result
   * @returns {Promise<void>}
   */
  async _notifyTeamOfStepCompletion(teamId, taskId, stepId, agentId, result) {
    try {
      // Get team
      const team = this.teamRegistry.getTeam(teamId);
      
      // Get task
      const task = this.collaborationManager.getTask(taskId);
      
      // Get step
      const step = task.workflow.find(s => s.id === stepId);
      
      // Create notification message
      const message = {
        type: 'notification',
        content: {
          event: 'task.step.completed',
          data: {
            taskId,
            taskName: task.name,
            stepId,
            stepName: step.name,
            agentId,
            result: {
              summary: result.summary || 'Step completed'
            }
          }
        }
      };
      
      // Send message to all team members except the completing agent
      for (const member of team.members) {
        if (member.agentId !== agentId) {
          await this.messageBroker.publishMessage({
            ...message,
            sender: 'orchestrator',
            recipient: member.agentId,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to notify team ${teamId} of step completion: ${error.message}`, error);
    }
  }

  /**
   * Notify agents of current steps
   * @private
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async _notifyAgentsOfCurrentSteps(taskId) {
    try {
      // Get task
      const task = this.collaborationManager.getTask(taskId);
      
      // Get team
      const team = this.teamRegistry.getTeam(task.teamId);
      
      // For each current step
      for (const stepId of task.progress.currentSteps) {
        // Get step
        const step = task.workflow.find(s => s.id === stepId);
        
        // For each role in step
        for (const roleId of step.roles) {
          // Find agent with this role
          const member = team.members.find(m => m.role === roleId);
          
          if (member) {
            // Create notification message
            const message = {
              type: 'notification',
              content: {
                event: 'task.step.assigned',
                data: {
                  taskId,
                  taskName: task.name,
                  stepId,
                  stepName: step.name,
                  roleId,
                  instructions: step.instructions || ''
                }
              }
            };
            
            // Send message to agent
            await this.messageBroker.publishMessage({
              ...message,
              sender: 'orchestrator',
              recipient: member.agentId,
              timestamp: new Date()
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to notify agents of current steps for task ${taskId}: ${error.message}`, error);
    }
  }

  /**
   * Handle task completion
   * @private
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async _handleTaskCompletion(taskId) {
    try {
      // Get task
      const task = this.collaborationManager.getTask(taskId);
      
      // Get team
      const team = this.teamRegistry.getTeam(task.teamId);
      
      // Aggregate insights if any
      let aggregatedInsight = null;
      try {
        if (this.collectiveIntelligence.getInsights(taskId).length > 0) {
          aggregatedInsight = await this.collectiveIntelligence.aggregateInsights(taskId);
        }
      } catch (error) {
        this.logger.warn(`Failed to aggregate insights for task ${taskId}: ${error.message}`);
      }
      
      // Create notification message
      const message = {
        type: 'notification',
        content: {
          event: 'task.completed',
          data: {
            taskId,
            taskName: task.name,
            completedAt: task.completedAt,
            duration: task.completedAt - task.startedAt,
            aggregatedInsight: aggregatedInsight ? aggregatedInsight.result : null
          }
        }
      };
      
      // Send message to all team members
      for (const member of team.members) {
        await this.messageBroker.publishMessage({
          ...message,
          sender: 'orchestrator',
          recipient: member.agentId,
          timestamp: new Date()
        });
      }
      
      // Update team performance metrics
      await this.getTeamPerformanceMetrics(team.id);
    } catch (error) {
      this.logger.error(`Failed to handle task ${taskId} completion: ${error.message}`, error);
    }
  }

  /**
   * Notify team of conflict
   * @private
   * @param {string} teamId - Team ID
   * @param {Object} conflict - Conflict object
   * @returns {Promise<void>}
   */
  async _notifyTeamOfConflict(teamId, conflict) {
    try {
      // Get team
      const team = this.teamRegistry.getTeam(teamId);
      
      // Create notification message
      const message = {
        type: 'notification',
        content: {
          event: 'conflict.created',
          data: {
            conflictId: conflict.id,
            issue: conflict.issue,
            description: conflict.description,
            resolutionStrategy: conflict.resolutionStrategy
          }
        }
      };
      
      // Send message to all team members
      for (const member of team.members) {
        if (conflict.parties.includes(member.agentId)) {
          await this.messageBroker.publishMessage({
            ...message,
            sender: 'orchestrator',
            recipient: member.agentId,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to notify team ${teamId} of conflict: ${error.message}`, error);
    }
  }

  /**
   * Create mediator proposal for conflict
   * @private
   * @param {string} conflictId - Conflict ID
   * @returns {Promise<Object>} - Created proposal
   */
  async _createMediatorProposal(conflictId) {
    try {
      // Get conflict
      const conflict = this.negotiationProtocol.getConflict(conflictId);
      
      // Wait for initial proposals
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get all proposals
      const proposals = conflict.proposals;
      
      // If no proposals yet, wait longer
      if (proposals.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return null;
      }
      
      // Create mediator proposal based on existing proposals
      // In a real implementation, this would use more sophisticated mediation logic
      // For now, we'll use a simplified approach that combines elements from existing proposals
      
      let mediatorProposal;
      
      if (proposals.length === 1) {
        // If only one proposal, suggest it
        mediatorProposal = {
          content: proposals[0].content,
          justification: `This is the only proposal submitted and appears to address the issue.`
        };
      } else {
        // If multiple proposals, create a compromise
        mediatorProposal = {
          content: `Compromise proposal based on ${proposals.length} submissions`,
          justification: `This proposal combines elements from all submitted proposals to find a middle ground.`,
          compromise: true
        };
      }
      
      // Add proposal to conflict
      return await this.negotiationProtocol.addProposal(
        conflictId,
        'orchestrator',
        mediatorProposal
      );
    } catch (error) {
      this.logger.error(`Failed to create mediator proposal for conflict ${conflictId}: ${error.message}`, error);
      return null;
    }
  }
}

module.exports = OrchestratorAgent;
