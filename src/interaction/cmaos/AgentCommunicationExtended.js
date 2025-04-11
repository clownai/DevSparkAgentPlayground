/**
 * AgentCommunicationExtended - Extended agent communication for collaborative multi-agent systems
 * 
 * This component extends the base AgentCommunication with:
 * - Team-based communication methods
 * - Role-aware agent registration
 * - Enhanced agent capability representation
 * - Team-oriented broadcast mechanisms
 */

const AgentCommunication = require('../AgentCommunication');

class AgentCommunicationExtended extends AgentCommunication {
  /**
   * Create a new AgentCommunicationExtended instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.teamRegistry = config.teamRegistry;
    this.messageProtocolExtended = config.messageProtocolExtended || config.messageProtocol;
    this.messageBrokerExtended = config.messageBrokerExtended || config.messageBroker;
    this.agentRoles = new Map(); // Map of agentId -> Map of teamId -> roleId
    this.agentCapabilities = new Map(); // Map of agentId -> capabilities
    this.logger.info('AgentCommunicationExtended initialized');
  }

  /**
   * Register an agent
   * @override
   * @param {string} agentId - Agent ID
   * @param {Object} info - Agent information
   * @param {Object} capabilities - Agent capabilities
   * @returns {Promise<Object>} - Registered agent
   */
  async registerAgent(agentId, info = {}, capabilities = {}) {
    try {
      // Register agent with base implementation
      const agent = await super.registerAgent(agentId, info);
      
      // Store agent capabilities
      this.agentCapabilities.set(agentId, capabilities);
      
      // Initialize agent roles
      this.agentRoles.set(agentId, new Map());
      
      this.logger.info(`Agent ${agentId} registered with capabilities`);
      return agent;
    } catch (error) {
      this.logger.error(`Failed to register agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent
   * @override
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterAgent(agentId) {
    try {
      // Unregister agent with base implementation
      const result = await super.unregisterAgent(agentId);
      
      // Remove agent capabilities
      this.agentCapabilities.delete(agentId);
      
      // Remove agent roles
      this.agentRoles.delete(agentId);
      
      // If team registry is available, remove agent from all teams
      if (this.teamRegistry) {
        try {
          const teams = this.teamRegistry.getAgentTeams(agentId);
          for (const team of teams) {
            await this.teamRegistry.removeAgentFromTeam(team.id, agentId);
          }
        } catch (error) {
          this.logger.warn(`Failed to remove agent ${agentId} from teams: ${error.message}`);
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update agent capabilities
   * @param {string} agentId - Agent ID
   * @param {Object} capabilities - Updated capabilities
   * @returns {Promise<Object>} - Updated agent capabilities
   */
  async updateAgentCapabilities(agentId, capabilities) {
    try {
      // Check if agent is registered
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not registered`);
      }
      
      // Update capabilities
      this.agentCapabilities.set(agentId, {
        ...this.agentCapabilities.get(agentId) || {},
        ...capabilities
      });
      
      this.logger.info(`Updated capabilities for agent ${agentId}`);
      return this.agentCapabilities.get(agentId);
    } catch (error) {
      this.logger.error(`Failed to update capabilities for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent capabilities
   * @param {string} agentId - Agent ID
   * @returns {Object} - Agent capabilities
   */
  getAgentCapabilities(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    
    return this.agentCapabilities.get(agentId) || {};
  }

  /**
   * Assign role to agent
   * @param {string} agentId - Agent ID
   * @param {string} teamId - Team ID
   * @param {string} roleId - Role ID
   * @returns {Promise<Object>} - Role assignment
   */
  async assignRole(agentId, teamId, roleId) {
    try {
      // Check if agent is registered
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not registered`);
      }
      
      // Check if team registry is available
      if (!this.teamRegistry) {
        throw new Error('Team registry not available');
      }
      
      // Add agent to team with role
      await this.teamRegistry.addAgentToTeam(
        teamId,
        agentId,
        roleId,
        this.agentCapabilities.get(agentId) || {}
      );
      
      // Store role assignment
      if (!this.agentRoles.has(agentId)) {
        this.agentRoles.set(agentId, new Map());
      }
      this.agentRoles.get(agentId).set(teamId, roleId);
      
      // Subscribe agent to team messages
      if (this.messageBrokerExtended.subscribeToTeam) {
        await this.messageBrokerExtended.subscribeToTeam(
          agentId,
          teamId,
          (message) => this._handleAgentMessage(agentId, message)
        );
      }
      
      // Subscribe agent to role messages
      if (this.messageBrokerExtended.subscribeToRole) {
        await this.messageBrokerExtended.subscribeToRole(
          agentId,
          roleId,
          (message) => this._handleAgentMessage(agentId, message)
        );
      }
      
      this.logger.info(`Assigned role ${roleId} in team ${teamId} to agent ${agentId}`);
      return {
        agentId,
        teamId,
        roleId,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to assign role ${roleId} in team ${teamId} to agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Remove role from agent
   * @param {string} agentId - Agent ID
   * @param {string} teamId - Team ID
   * @returns {Promise<boolean>} - Resolves to true if removal is successful
   */
  async removeRole(agentId, teamId) {
    try {
      // Check if agent is registered
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not registered`);
      }
      
      // Check if team registry is available
      if (!this.teamRegistry) {
        throw new Error('Team registry not available');
      }
      
      // Get role ID
      let roleId;
      if (this.agentRoles.has(agentId) && this.agentRoles.get(agentId).has(teamId)) {
        roleId = this.agentRoles.get(agentId).get(teamId);
      }
      
      // Remove agent from team
      await this.teamRegistry.removeAgentFromTeam(teamId, agentId);
      
      // Remove role assignment
      if (this.agentRoles.has(agentId)) {
        this.agentRoles.get(agentId).delete(teamId);
      }
      
      // Unsubscribe agent from team messages
      if (this.messageBrokerExtended.unsubscribeFromTeam) {
        await this.messageBrokerExtended.unsubscribeFromTeam(agentId, teamId);
      }
      
      // Unsubscribe agent from role messages
      if (roleId && this.messageBrokerExtended.unsubscribeFromRole) {
        await this.messageBrokerExtended.unsubscribeFromRole(agentId, roleId);
      }
      
      this.logger.info(`Removed agent ${agentId} from team ${teamId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove agent ${agentId} from team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent roles
   * @param {string} agentId - Agent ID
   * @returns {Array<Object>} - List of agent roles
   */
  getAgentRoles(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    
    if (!this.agentRoles.has(agentId)) {
      return [];
    }
    
    const roles = [];
    for (const [teamId, roleId] of this.agentRoles.get(agentId).entries()) {
      roles.push({
        teamId,
        roleId
      });
    }
    
    return roles;
  }

  /**
   * Send request to a team
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} teamId - Team ID
   * @param {string} action - Request action
   * @param {Object} params - Request parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Response object
   */
  async sendTeamRequest(fromAgentId, teamId, action, params, options = {}) {
    try {
      this.logger.debug(`Sending team request from ${fromAgentId} to team ${teamId}`);
      
      // Check if sender is registered
      if (!this.agents.has(fromAgentId)) {
        throw new Error(`Sender agent ${fromAgentId} not registered`);
      }
      
      // Create request message
      const message = this.messageProtocolExtended.createTeamMessage(
        fromAgentId,
        teamId,
        action,
        params,
        options
      );
      
      // Publish message
      await this.messageBrokerExtended.publishMessage(message);
      
      // Update agent last active timestamp
      const agent = this.agents.get(fromAgentId);
      agent.lastActive = new Date();
      
      // No response expected for team requests
      return {
        messageId: message.id,
        teamId,
        action,
        timestamp: message.timestamp
      };
    } catch (error) {
      this.logger.error(`Failed to send team request from ${fromAgentId} to team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send request to agents with a specific role
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} roleId - Role ID
   * @param {string} teamId - Team ID
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Response object
   */
  async sendRoleRequest(fromAgentId, roleId, teamId, type, content, options = {}) {
    try {
      this.logger.debug(`Sending role request from ${fromAgentId} to role ${roleId} in team ${teamId}`);
      
      // Check if sender is registered
      if (!this.agents.has(fromAgentId)) {
        throw new Error(`Sender agent ${fromAgentId} not registered`);
      }
      
      // Create request message
      const message = this.messageProtocolExtended.createRoleMessage(
        fromAgentId,
        roleId,
        teamId,
        type,
        content,
        options
      );
      
      // Publish message
      await this.messageBrokerExtended.publishMessage(message);
      
      // Update agent last active timestamp
      const agent = this.agents.get(fromAgentId);
      agent.lastActive = new Date();
      
      // No response expected for role requests
      return {
        messageId: message.id,
        roleId,
        teamId,
        type,
        timestamp: message.timestamp
      };
    } catch (error) {
      this.logger.error(`Failed to send role request from ${fromAgentId} to role ${roleId} in team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Broadcast a message to a team
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} teamId - Team ID
   * @param {string} message - Message content
   * @param {number} priority - Message priority (0-10)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Message object
   */
  async broadcastToTeam(fromAgentId, teamId, message, priority = 5, options = {}) {
    try {
      this.logger.debug(`Broadcasting message from ${fromAgentId} to team ${teamId}`);
      
      // Check if sender is registered
      if (!this.agents.has(fromAgentId)) {
        throw new Error(`Sender agent ${fromAgentId} not registered`);
      }
      
      // Create broadcast message
      const broadcastMessage = this.messageProtocolExtended.createTeamBroadcastMessage(
        fromAgentId,
        teamId,
        message,
        priority,
        options
      );
      
      // Publish message
      await this.messageBrokerExtended.publishMessage(broadcastMessage);
      
      // Update agent last active timestamp
      const agent = this.agents.get(fromAgentId);
      agent.lastActive = new Date();
      
      return broadcastMessage;
    } catch (error) {
      this.logger.error(`Failed to broadcast message from ${fromAgentId} to team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent information with extended details
   * @override
   * @param {string} agentId - Agent ID
   * @returns {Object} - Agent information
   */
  getAgentInfo(agentId) {
    // Get base agent info
    const baseInfo = super.getAgentInfo(agentId);
    
    // Add extended information
    return {
      ...baseInfo,
      capabilities: this.agentCapabilities.get(agentId) || {},
      roles: this.getAgentRoles(agentId)
    };
  }

  /**
   * Find agents by capability
   * @param {string} capability - Capability to search for
   * @returns {Array<string>} - List of agent IDs with the capability
   */
  findAgentsByCapability(capability) {
    const matchingAgents = [];
    
    for (const [agentId, capabilities] of this.agentCapabilities.entries()) {
      if (capabilities[capability] || 
          (Array.isArray(capabilities) && capabilities.includes(capability))) {
        matchingAgents.push(agentId);
      }
    }
    
    return matchingAgents;
  }

  /**
   * Find agents by role
   * @param {string} roleId - Role ID
   * @param {string} teamId - Optional team ID
   * @returns {Array<string>} - List of agent IDs with the role
   */
  findAgentsByRole(roleId, teamId = null) {
    const matchingAgents = [];
    
    for (const [agentId, teamRoles] of this.agentRoles.entries()) {
      if (teamId) {
        // Check specific team
        if (teamRoles.get(teamId) === roleId) {
          matchingAgents.push(agentId);
        }
      } else {
        // Check all teams
        for (const [_, role] of teamRoles.entries()) {
          if (role === roleId) {
            matchingAgents.push(agentId);
            break;
          }
        }
      }
    }
    
    return matchingAgents;
  }
}

module.exports = AgentCommunicationExtended;
