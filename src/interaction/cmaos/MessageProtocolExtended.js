/**
 * MessageProtocolExtended - Extended message protocol for collaborative multi-agent systems
 * 
 * This component extends the base MessageProtocol with:
 * - Role-based message addressing
 * - Team-oriented message types
 * - Collaboration-specific message formats
 * - Enhanced validation for team communication
 */

const MessageProtocol = require('../MessageProtocol');

class MessageProtocolExtended extends MessageProtocol {
  /**
   * Create a new MessageProtocolExtended instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.teamRegistry = config.teamRegistry;
    this.logger.info('MessageProtocolExtended initialized');
  }

  /**
   * Create a message
   * @override
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID, role ID (prefixed with 'role:'), or team ID (prefixed with 'team:')
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @param {Object} options - Additional options
   * @returns {Object} - Message object
   */
  createMessage(sender, recipient, type, content, options = {}) {
    // Check if recipient is a role or team
    if (recipient.startsWith('role:') || recipient.startsWith('team:')) {
      // Store original recipient for routing
      options.originalRecipient = recipient;
    }

    // Set default config if needed
    if (!this.config) {
      this.config = { version: '1.0' };
    }

    // Create base message
    const message = super.createMessage(sender, recipient, type, content, options);
    
    // Add team and role information if available
    if (options.teamId) {
      message.teamId = options.teamId;
    }
    
    if (options.roleId) {
      message.roleId = options.roleId;
    }
    
    // Add collaboration context if available
    if (options.collaborationContext) {
      message.collaborationContext = options.collaborationContext;
    }
    
    return message;
  }

  /**
   * Validate a message
   * @override
   * @param {Object} message - Message to validate
   * @returns {boolean} - True if message is valid
   */
  validateMessage(message) {
    // Perform base validation
    if (!super.validateMessage(message)) {
      return false;
    }
    
    try {
      // Validate team-specific fields if present
      if (message.teamId && typeof message.teamId !== 'string') {
        return false;
      }
      
      if (message.roleId && typeof message.roleId !== 'string') {
        return false;
      }
      
      // Validate collaboration context if present
      if (message.collaborationContext && typeof message.collaborationContext !== 'object') {
        return false;
      }
      
      // Validate extended message types
      if (message.type === 'team' && !this._validateTeamMessage(message)) {
        return false;
      }
      
      if (message.type === 'negotiation' && !this._validateNegotiationMessage(message)) {
        return false;
      }
      
      if (message.type === 'collective' && !this._validateCollectiveMessage(message)) {
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Extended message validation failed: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Create a team message
   * @param {string} sender - Sender ID
   * @param {string} teamId - Team ID
   * @param {string} action - Team action
   * @param {Object} params - Action parameters
   * @param {Object} options - Additional options
   * @returns {Object} - Team message
   */
  createTeamMessage(sender, teamId, action, params, options = {}) {
    return this.createMessage(sender, `team:${teamId}`, 'team', {
      action,
      params
    }, {
      ...options,
      teamId
    });
  }

  /**
   * Create a role-targeted message
   * @param {string} sender - Sender ID
   * @param {string} roleId - Role ID
   * @param {string} teamId - Team ID
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @param {Object} options - Additional options
   * @returns {Object} - Role-targeted message
   */
  createRoleMessage(sender, roleId, teamId, type, content, options = {}) {
    return this.createMessage(sender, `role:${roleId}`, type, content, {
      ...options,
      teamId,
      roleId
    });
  }

  /**
   * Create a team formation request message
   * @param {string} sender - Sender ID
   * @param {Object} teamData - Team data
   * @param {Object} options - Additional options
   * @returns {Object} - Team formation request message
   */
  createTeamFormationMessage(sender, teamData, options = {}) {
    return this.createMessage(sender, 'orchestrator', 'team', {
      action: 'team.create',
      params: teamData
    }, options);
  }

  /**
   * Create a role assignment message
   * @param {string} sender - Sender ID
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID
   * @param {string} roleId - Role ID
   * @param {Object} options - Additional options
   * @returns {Object} - Role assignment message
   */
  createRoleAssignmentMessage(sender, teamId, agentId, roleId, options = {}) {
    return this.createTeamMessage(sender, teamId, 'team.assignRole', {
      agentId,
      roleId
    }, options);
  }

  /**
   * Create a team broadcast message
   * @param {string} sender - Sender ID
   * @param {string} teamId - Team ID
   * @param {string} message - Message content
   * @param {number} priority - Message priority (0-10)
   * @param {Object} options - Additional options
   * @returns {Object} - Team broadcast message
   */
  createTeamBroadcastMessage(sender, teamId, message, priority = 5, options = {}) {
    return this.createTeamMessage(sender, teamId, 'team.broadcast', {
      message,
      priority
    }, options);
  }

  /**
   * Create a task bid message
   * @param {string} sender - Sender ID
   * @param {string} taskId - Task ID
   * @param {string} roleId - Role ID
   * @param {Object} bid - Bid data
   * @param {Object} options - Additional options
   * @returns {Object} - Task bid message
   */
  createTaskBidMessage(sender, taskId, roleId, bid, options = {}) {
    return this.createMessage(sender, 'orchestrator', 'negotiation', {
      action: 'negotiation.bid',
      params: {
        taskId,
        roleId,
        bid
      }
    }, options);
  }

  /**
   * Create a conflict resolution message
   * @param {string} sender - Sender ID
   * @param {string} conflictId - Conflict ID
   * @param {Array<string>} parties - Conflict parties
   * @param {string} issue - Conflict issue
   * @param {Array<Object>} proposals - Conflict proposals
   * @param {Object} options - Additional options
   * @returns {Object} - Conflict resolution message
   */
  createConflictResolutionMessage(sender, conflictId, parties, issue, proposals, options = {}) {
    return this.createMessage(sender, 'orchestrator', 'negotiation', {
      action: 'negotiation.resolveConflict',
      params: {
        conflictId,
        parties,
        issue,
        proposals
      }
    }, options);
  }

  /**
   * Create a voting request message
   * @param {string} sender - Sender ID
   * @param {string} voteId - Vote ID
   * @param {string} topic - Vote topic
   * @param {Array<string>} options - Vote options
   * @param {Date} deadline - Vote deadline
   * @param {Object} messageOptions - Additional message options
   * @returns {Object} - Voting request message
   */
  createVotingRequestMessage(sender, voteId, topic, options, deadline, messageOptions = {}) {
    return this.createMessage(sender, 'orchestrator', 'collective', {
      action: 'collective.vote',
      params: {
        voteId,
        topic,
        options,
        deadline
      }
    }, messageOptions);
  }

  /**
   * Create an insight contribution message
   * @param {string} sender - Sender ID
   * @param {string} taskId - Task ID
   * @param {string} insight - Insight content
   * @param {number} confidence - Confidence level (0-1)
   * @param {Object} evidence - Supporting evidence
   * @param {Object} options - Additional options
   * @returns {Object} - Insight contribution message
   */
  createInsightMessage(sender, taskId, insight, confidence, evidence = {}, options = {}) {
    return this.createMessage(sender, 'orchestrator', 'collective', {
      event: 'collective.insight',
      data: {
        taskId,
        insight,
        confidence,
        evidence
      }
    }, options);
  }

  /**
   * Create a step completion message
   * @param {string} sender - Sender ID
   * @param {string} taskId - Task ID
   * @param {string} stepId - Step ID
   * @param {Object} result - Step result
   * @param {Object} options - Additional options
   * @returns {Object} - Step completion message
   */
  createStepCompletionMessage(sender, taskId, stepId, result, options = {}) {
    return this.createMessage(sender, 'orchestrator', 'notification', {
      event: 'task.step.completed',
      data: {
        taskId,
        stepId,
        result
      }
    }, options);
  }

  /**
   * Validate a team message
   * @private
   * @param {Object} message - Team message to validate
   * @returns {boolean} - True if message is valid
   */
  _validateTeamMessage(message) {
    if (!message.content || !message.content.action) {
      return false;
    }
    
    const { action, params } = message.content;
    
    switch (action) {
      case 'team.create':
        return params && params.name;
      
      case 'team.assignRole':
        return params && params.agentId && params.roleId;
      
      case 'team.broadcast':
        return params && params.message !== undefined;
      
      default:
        return true;
    }
  }

  /**
   * Validate a negotiation message
   * @private
   * @param {Object} message - Negotiation message to validate
   * @returns {boolean} - True if message is valid
   */
  _validateNegotiationMessage(message) {
    if (!message.content || !message.content.action) {
      return false;
    }
    
    const { action, params } = message.content;
    
    switch (action) {
      case 'negotiation.bid':
        return params && params.taskId && params.roleId && params.bid;
      
      case 'negotiation.resolveConflict':
        return params && params.conflictId && params.parties && params.issue;
      
      default:
        return true;
    }
  }

  /**
   * Validate a collective intelligence message
   * @private
   * @param {Object} message - Collective intelligence message to validate
   * @returns {boolean} - True if message is valid
   */
  _validateCollectiveMessage(message) {
    if (!message.content) {
      return false;
    }
    
    if (message.content.action === 'collective.vote') {
      const { params } = message.content;
      return params && params.voteId && params.topic && params.options;
    }
    
    if (message.content.event === 'collective.insight') {
      const { data } = message.content;
      return data && data.taskId && data.insight !== undefined;
    }
    
    return true;
  }

  /**
   * Check if message is valid for the specified message type
   * @override
   * @private
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @returns {boolean} - True if content is valid for type
   */
  _validateContentForType(type, content) {
    // Handle extended message types
    switch (type) {
      case 'team':
        return content.action && content.params !== undefined;
      
      case 'negotiation':
        return content.action && content.params !== undefined;
      
      case 'collective':
        return (content.action && content.params !== undefined) || 
               (content.event && content.data !== undefined);
      
      default:
        // Use base validation for standard types
        return super._validateContentForType(type, content);
    }
  }

  /**
   * Check if message type is valid
   * @override
   * @private
   * @param {string} type - Message type
   * @returns {boolean} - True if type is valid
   */
  _isValidMessageType(type) {
    const extendedTypes = ['team', 'negotiation', 'collective'];
    return super._isValidMessageType(type) || extendedTypes.includes(type);
  }
}

module.exports = MessageProtocolExtended;
