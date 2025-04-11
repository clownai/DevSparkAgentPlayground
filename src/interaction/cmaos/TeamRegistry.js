/**
 * TeamRegistry - Maintains information about teams and their members
 * 
 * This component is responsible for:
 * - Storing team compositions and structures
 * - Tracking role assignments
 * - Managing team resources and capabilities
 * - Handling team lifecycle events
 */

class TeamRegistry {
  /**
   * Create a new TeamRegistry instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.teams = new Map(); // Map of teamId -> team
    this.roles = new Map(); // Map of roleId -> role
    this.agentTeams = new Map(); // Map of agentId -> Set of teamIds
    this.logger = config.logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the TeamRegistry
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing TeamRegistry');
      
      // Load predefined roles if provided
      if (this.config.predefinedRoles) {
        for (const role of this.config.predefinedRoles) {
          this.roles.set(role.id, role);
        }
      }
      
      this.initialized = true;
      this.logger.info('TeamRegistry initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`TeamRegistry initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the TeamRegistry
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      this.logger.info('Stopping TeamRegistry');
      
      // Perform cleanup if needed
      
      this.initialized = false;
      this.logger.info('TeamRegistry stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`TeamRegistry shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new team
   * @param {Object} teamData - Team data
   * @returns {Promise<Object>} - Created team
   */
  async createTeam(teamData) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      const teamId = teamData.id || this._generateId('team');
      
      // Check if team already exists
      if (this.teams.has(teamId)) {
        throw new Error(`Team ${teamId} already exists`);
      }
      
      // Create team object
      const team = {
        id: teamId,
        name: teamData.name || `Team ${teamId}`,
        description: teamData.description || '',
        members: [],
        createdAt: new Date(),
        status: 'active',
        metadata: teamData.metadata || {},
        ...teamData
      };
      
      // Store team
      this.teams.set(teamId, team);
      
      this.logger.info(`Created team ${teamId}: ${team.name}`);
      return team;
    } catch (error) {
      this.logger.error(`Failed to create team: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a team by ID
   * @param {string} teamId - Team ID
   * @returns {Object} - Team object
   */
  getTeam(teamId) {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }
    
    return team;
  }

  /**
   * Update a team
   * @param {string} teamId - Team ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated team
   */
  async updateTeam(teamId, updates) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      // Get team
      const team = this.getTeam(teamId);
      
      // Apply updates
      Object.assign(team, updates);
      
      // Update timestamp
      team.updatedAt = new Date();
      
      this.logger.info(`Updated team ${teamId}`);
      return team;
    } catch (error) {
      this.logger.error(`Failed to update team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete a team
   * @param {string} teamId - Team ID
   * @returns {Promise<boolean>} - Resolves to true if deletion is successful
   */
  async deleteTeam(teamId) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      // Get team
      const team = this.getTeam(teamId);
      
      // Remove all members from team
      for (const member of team.members) {
        await this.removeAgentFromTeam(teamId, member.agentId);
      }
      
      // Remove team
      this.teams.delete(teamId);
      
      this.logger.info(`Deleted team ${teamId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * List all teams
   * @param {Object} filters - Optional filters
   * @returns {Array<Object>} - List of teams
   */
  listTeams(filters = {}) {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    let teams = Array.from(this.teams.values());
    
    // Apply filters if provided
    if (filters.status) {
      teams = teams.filter(team => team.status === filters.status);
    }
    
    return teams;
  }

  /**
   * Create a new role
   * @param {Object} roleData - Role data
   * @returns {Promise<Object>} - Created role
   */
  async createRole(roleData) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      const roleId = roleData.id || this._generateId('role');
      
      // Check if role already exists
      if (this.roles.has(roleId)) {
        throw new Error(`Role ${roleId} already exists`);
      }
      
      // Create role object
      const role = {
        id: roleId,
        name: roleData.name || `Role ${roleId}`,
        description: roleData.description || '',
        requiredCapabilities: roleData.requiredCapabilities || [],
        permissions: roleData.permissions || [],
        metadata: roleData.metadata || {},
        ...roleData
      };
      
      // Store role
      this.roles.set(roleId, role);
      
      this.logger.info(`Created role ${roleId}: ${role.name}`);
      return role;
    } catch (error) {
      this.logger.error(`Failed to create role: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a role by ID
   * @param {string} roleId - Role ID
   * @returns {Object} - Role object
   */
  getRole(roleId) {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
    
    return role;
  }

  /**
   * List all roles
   * @returns {Array<Object>} - List of roles
   */
  listRoles() {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    return Array.from(this.roles.values());
  }

  /**
   * Add an agent to a team
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID
   * @param {string} roleId - Role ID
   * @param {Object} capabilities - Agent capabilities
   * @returns {Promise<Object>} - Updated team
   */
  async addAgentToTeam(teamId, agentId, roleId, capabilities = {}) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      // Get team
      const team = this.getTeam(teamId);
      
      // Get role
      const role = this.getRole(roleId);
      
      // Check if agent is already in team
      const existingMember = team.members.find(member => member.agentId === agentId);
      if (existingMember) {
        throw new Error(`Agent ${agentId} is already a member of team ${teamId}`);
      }
      
      // Add agent to team
      const member = {
        agentId,
        role: roleId,
        capabilities: capabilities,
        joinedAt: new Date()
      };
      
      team.members.push(member);
      
      // Update agent-team mapping
      if (!this.agentTeams.has(agentId)) {
        this.agentTeams.set(agentId, new Set());
      }
      this.agentTeams.get(agentId).add(teamId);
      
      this.logger.info(`Added agent ${agentId} to team ${teamId} with role ${roleId}`);
      return team;
    } catch (error) {
      this.logger.error(`Failed to add agent ${agentId} to team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Remove an agent from a team
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Updated team
   */
  async removeAgentFromTeam(teamId, agentId) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      // Get team
      const team = this.getTeam(teamId);
      
      // Check if agent is in team
      const memberIndex = team.members.findIndex(member => member.agentId === agentId);
      if (memberIndex === -1) {
        throw new Error(`Agent ${agentId} is not a member of team ${teamId}`);
      }
      
      // Remove agent from team
      team.members.splice(memberIndex, 1);
      
      // Update agent-team mapping
      if (this.agentTeams.has(agentId)) {
        this.agentTeams.get(agentId).delete(teamId);
        if (this.agentTeams.get(agentId).size === 0) {
          this.agentTeams.delete(agentId);
        }
      }
      
      this.logger.info(`Removed agent ${agentId} from team ${teamId}`);
      return team;
    } catch (error) {
      this.logger.error(`Failed to remove agent ${agentId} from team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update agent role in a team
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID
   * @param {string} roleId - New role ID
   * @returns {Promise<Object>} - Updated team
   */
  async updateAgentRole(teamId, agentId, roleId) {
    try {
      if (!this.initialized) {
        throw new Error('TeamRegistry not initialized');
      }
      
      // Get team
      const team = this.getTeam(teamId);
      
      // Get role
      const role = this.getRole(roleId);
      
      // Find agent in team
      const member = team.members.find(member => member.agentId === agentId);
      if (!member) {
        throw new Error(`Agent ${agentId} is not a member of team ${teamId}`);
      }
      
      // Update role
      member.role = roleId;
      member.roleUpdatedAt = new Date();
      
      this.logger.info(`Updated agent ${agentId} role to ${roleId} in team ${teamId}`);
      return team;
    } catch (error) {
      this.logger.error(`Failed to update agent ${agentId} role in team ${teamId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get teams for an agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Object>} - List of teams
   */
  getAgentTeams(agentId) {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    const teamIds = this.agentTeams.get(agentId) || new Set();
    const teams = [];
    
    for (const teamId of teamIds) {
      try {
        const team = this.getTeam(teamId);
        teams.push(team);
      } catch (error) {
        this.logger.warn(`Failed to get team ${teamId} for agent ${agentId}: ${error.message}`);
      }
    }
    
    return teams;
  }

  /**
   * Get agents with a specific role in a team
   * @param {string} teamId - Team ID
   * @param {string} roleId - Role ID
   * @returns {Array<Object>} - List of agent members
   */
  getAgentsByRole(teamId, roleId) {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    // Get team
    const team = this.getTeam(teamId);
    
    // Filter members by role
    return team.members.filter(member => member.role === roleId);
  }

  /**
   * Check if an agent has a specific role in a team
   * @param {string} teamId - Team ID
   * @param {string} agentId - Agent ID
   * @param {string} roleId - Role ID
   * @returns {boolean} - True if agent has the role
   */
  hasRole(teamId, agentId, roleId) {
    if (!this.initialized) {
      throw new Error('TeamRegistry not initialized');
    }
    
    // Get team
    const team = this.getTeam(teamId);
    
    // Find member
    const member = team.members.find(member => member.agentId === agentId);
    if (!member) {
      return false;
    }
    
    return member.role === roleId;
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

module.exports = TeamRegistry;
