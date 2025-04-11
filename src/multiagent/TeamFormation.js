/**
 * TeamFormation.js
 * Implements team formation mechanisms for multi-agent systems
 * 
 * This module provides functionality for agents to form teams,
 * coordinate actions, and share responsibilities.
 */

class TeamFormation {
  /**
   * Create a new team formation manager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = this._validateConfig(config);
    this.teams = new Map();
    this.agentTeams = new Map(); // Maps agent IDs to team IDs
  }
  
  /**
   * Create a new team
   * @param {String} teamId - Unique team identifier
   * @param {Object} teamConfig - Team configuration
   * @returns {Object} - Created team
   */
  createTeam(teamId, teamConfig = {}) {
    if (this.teams.has(teamId)) {
      throw new Error(`Team with ID ${teamId} already exists`);
    }
    
    const team = {
      id: teamId,
      name: teamConfig.name || teamId,
      members: new Map(),
      roles: new Map(),
      formation: teamConfig.formation || 'dynamic',
      goal: teamConfig.goal || '',
      performance: {
        totalReward: 0,
        successRate: 0,
        completedTasks: 0,
        failedTasks: 0
      },
      created: Date.now(),
      lastActive: Date.now()
    };
    
    // Initialize roles if provided
    if (teamConfig.roles) {
      for (const [roleId, roleConfig] of Object.entries(teamConfig.roles)) {
        this.addRole(teamId, roleId, roleConfig);
      }
    }
    
    this.teams.set(teamId, team);
    return team;
  }
  
  /**
   * Get team by ID
   * @param {String} teamId - Team ID
   * @returns {Object} - Team object
   */
  getTeam(teamId) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    return this.teams.get(teamId);
  }
  
  /**
   * Get all teams
   * @returns {Map<String, Object>} - Map of team IDs to team objects
   */
  getAllTeams() {
    return new Map(this.teams);
  }
  
  /**
   * Add an agent to a team
   * @param {String} teamId - Team ID
   * @param {String} agentId - Agent ID
   * @param {String} roleId - Role ID (optional)
   * @returns {Boolean} - Success status
   */
  addAgentToTeam(teamId, agentId, roleId = null) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    // Check if agent is already in a team
    if (this.agentTeams.has(agentId)) {
      const currentTeamId = this.agentTeams.get(agentId);
      if (currentTeamId !== teamId) {
        // Remove from current team first
        this.removeAgentFromTeam(currentTeamId, agentId);
      }
    }
    
    // Add agent to team
    team.members.set(agentId, {
      id: agentId,
      role: roleId,
      joinedAt: Date.now(),
      performance: {
        totalReward: 0,
        successRate: 0,
        completedTasks: 0,
        failedTasks: 0
      }
    });
    
    // Update agent-team mapping
    this.agentTeams.set(agentId, teamId);
    
    // Assign role if specified
    if (roleId && team.roles.has(roleId)) {
      const role = team.roles.get(roleId);
      
      // Check if role is already filled
      if (role.assignedAgent && role.assignedAgent !== agentId) {
        // Remove previous agent from role
        const previousAgentData = team.members.get(role.assignedAgent);
        if (previousAgentData) {
          previousAgentData.role = null;
        }
      }
      
      // Assign role to agent
      role.assignedAgent = agentId;
      role.assignedAt = Date.now();
    }
    
    // Update team last active timestamp
    team.lastActive = Date.now();
    
    return true;
  }
  
  /**
   * Remove an agent from a team
   * @param {String} teamId - Team ID
   * @param {String} agentId - Agent ID
   * @returns {Boolean} - Success status
   */
  removeAgentFromTeam(teamId, agentId) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    if (!team.members.has(agentId)) {
      return false;
    }
    
    // Get agent data
    const agentData = team.members.get(agentId);
    
    // Remove agent from role if assigned
    if (agentData.role && team.roles.has(agentData.role)) {
      const role = team.roles.get(agentData.role);
      if (role.assignedAgent === agentId) {
        role.assignedAgent = null;
        role.assignedAt = null;
      }
    }
    
    // Remove agent from team
    team.members.delete(agentId);
    
    // Remove agent-team mapping
    this.agentTeams.delete(agentId);
    
    // Update team last active timestamp
    team.lastActive = Date.now();
    
    return true;
  }
  
  /**
   * Get team for an agent
   * @param {String} agentId - Agent ID
   * @returns {Object} - Team object or null if agent is not in a team
   */
  getAgentTeam(agentId) {
    if (!this.agentTeams.has(agentId)) {
      return null;
    }
    
    const teamId = this.agentTeams.get(agentId);
    return this.teams.get(teamId);
  }
  
  /**
   * Add a role to a team
   * @param {String} teamId - Team ID
   * @param {String} roleId - Role ID
   * @param {Object} roleConfig - Role configuration
   * @returns {Object} - Created role
   */
  addRole(teamId, roleId, roleConfig = {}) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    if (team.roles.has(roleId)) {
      throw new Error(`Role with ID ${roleId} already exists in team ${teamId}`);
    }
    
    const role = {
      id: roleId,
      name: roleConfig.name || roleId,
      description: roleConfig.description || '',
      responsibilities: roleConfig.responsibilities || [],
      requiredCapabilities: roleConfig.requiredCapabilities || [],
      assignedAgent: null,
      assignedAt: null
    };
    
    team.roles.set(roleId, role);
    
    // Update team last active timestamp
    team.lastActive = Date.now();
    
    return role;
  }
  
  /**
   * Assign a role to an agent
   * @param {String} teamId - Team ID
   * @param {String} roleId - Role ID
   * @param {String} agentId - Agent ID
   * @returns {Boolean} - Success status
   */
  assignRole(teamId, roleId, agentId) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    if (!team.roles.has(roleId)) {
      throw new Error(`Unknown role ID: ${roleId} in team ${teamId}`);
    }
    
    if (!team.members.has(agentId)) {
      throw new Error(`Agent ${agentId} is not a member of team ${teamId}`);
    }
    
    const role = team.roles.get(roleId);
    const agentData = team.members.get(agentId);
    
    // Check if role is already assigned
    if (role.assignedAgent && role.assignedAgent !== agentId) {
      // Remove previous agent from role
      const previousAgentData = team.members.get(role.assignedAgent);
      if (previousAgentData) {
        previousAgentData.role = null;
      }
    }
    
    // Check if agent already has a role
    if (agentData.role && agentData.role !== roleId) {
      // Remove agent from previous role
      const previousRole = team.roles.get(agentData.role);
      if (previousRole && previousRole.assignedAgent === agentId) {
        previousRole.assignedAgent = null;
        previousRole.assignedAt = null;
      }
    }
    
    // Assign role to agent
    role.assignedAgent = agentId;
    role.assignedAt = Date.now();
    agentData.role = roleId;
    
    // Update team last active timestamp
    team.lastActive = Date.now();
    
    return true;
  }
  
  /**
   * Update team performance
   * @param {String} teamId - Team ID
   * @param {Object} performance - Performance update
   * @returns {Boolean} - Success status
   */
  updateTeamPerformance(teamId, performance) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    // Update team performance
    if (performance.reward) {
      team.performance.totalReward += performance.reward;
    }
    
    if (performance.success) {
      team.performance.completedTasks += 1;
    } else if (performance.success === false) {
      team.performance.failedTasks += 1;
    }
    
    // Calculate success rate
    const totalTasks = team.performance.completedTasks + team.performance.failedTasks;
    if (totalTasks > 0) {
      team.performance.successRate = team.performance.completedTasks / totalTasks;
    }
    
    // Update team last active timestamp
    team.lastActive = Date.now();
    
    return true;
  }
  
  /**
   * Update agent performance within a team
   * @param {String} teamId - Team ID
   * @param {String} agentId - Agent ID
   * @param {Object} performance - Performance update
   * @returns {Boolean} - Success status
   */
  updateAgentPerformance(teamId, agentId, performance) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    if (!team.members.has(agentId)) {
      throw new Error(`Agent ${agentId} is not a member of team ${teamId}`);
    }
    
    const agentData = team.members.get(agentId);
    
    // Update agent performance
    if (performance.reward) {
      agentData.performance.totalReward += performance.reward;
    }
    
    if (performance.success) {
      agentData.performance.completedTasks += 1;
    } else if (performance.success === false) {
      agentData.performance.failedTasks += 1;
    }
    
    // Calculate success rate
    const totalTasks = agentData.performance.completedTasks + agentData.performance.failedTasks;
    if (totalTasks > 0) {
      agentData.performance.successRate = agentData.performance.completedTasks / totalTasks;
    }
    
    return true;
  }
  
  /**
   * Dissolve a team
   * @param {String} teamId - Team ID
   * @returns {Boolean} - Success status
   */
  dissolveTeam(teamId) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    // Remove all agents from team
    for (const agentId of team.members.keys()) {
      this.agentTeams.delete(agentId);
    }
    
    // Remove team
    this.teams.delete(teamId);
    
    return true;
  }
  
  /**
   * Get team statistics
   * @param {String} teamId - Team ID
   * @returns {Object} - Team statistics
   */
  getTeamStatistics(teamId) {
    if (!this.teams.has(teamId)) {
      throw new Error(`Unknown team ID: ${teamId}`);
    }
    
    const team = this.teams.get(teamId);
    
    return {
      id: team.id,
      name: team.name,
      memberCount: team.members.size,
      roleCount: team.roles.size,
      filledRoles: Array.from(team.roles.values()).filter(r => r.assignedAgent).length,
      performance: { ...team.performance },
      created: team.created,
      lastActive: team.lastActive,
      age: Date.now() - team.created
    };
  }
  
  /**
   * Find optimal team formation
   * @param {Array<String>} agentIds - Array of agent IDs
   * @param {Array<Object>} agentCapabilities - Array of agent capabilities
   * @param {Object} taskRequirements - Task requirements
   * @returns {Object} - Optimal team formation
   */
  findOptimalTeamFormation(agentIds, agentCapabilities, taskRequirements) {
    // This is a simplified implementation
    // A real implementation would use more sophisticated algorithms
    
    const teamFormation = {
      teamId: `team_${Date.now()}`,
      members: [],
      roles: []
    };
    
    // Create roles based on task requirements
    const roles = [];
    if (taskRequirements.roles) {
      for (const [roleId, requirements] of Object.entries(taskRequirements.roles)) {
        roles.push({
          id: roleId,
          requirements,
          assignedAgent: null,
          score: 0
        });
      }
    }
    
    // Score each agent for each role
    const scores = [];
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const capabilities = agentCapabilities[i];
      
      for (let j = 0; j < roles.length; j++) {
        const role = roles[j];
        const score = this._calculateRoleCompatibility(capabilities, role.requirements);
        
        scores.push({
          agentId,
          roleId: role.id,
          score
        });
      }
    }
    
    // Sort scores in descending order
    scores.sort((a, b) => b.score - a.score);
    
    // Assign agents to roles
    const assignedAgents = new Set();
    const assignedRoles = new Set();
    
    for (const score of scores) {
      if (assignedAgents.has(score.agentId) || assignedRoles.has(score.roleId)) {
        continue;
      }
      
      // Assign agent to role
      const role = roles.find(r => r.id === score.roleId);
      if (role) {
        role.assignedAgent = score.agentId;
        role.score = score.score;
      }
      
      assignedAgents.add(score.agentId);
      assignedRoles.add(score.roleId);
      
      // Add to team formation
      teamFormation.members.push({
        agentId: score.agentId,
        roleId: score.roleId,
        score: score.score
      });
      
      // Check if all roles are filled
      if (assignedRoles.size === roles.length) {
        break;
      }
    }
    
    // Add remaining agents without roles
    for (const agentId of agentIds) {
      if (!assignedAgents.has(agentId)) {
        teamFormation.members.push({
          agentId,
          roleId: null,
          score: 0
        });
      }
    }
    
    teamFormation.roles = roles;
    
    return teamFormation;
  }
  
  /**
   * Calculate role compatibility score
   * @param {Object} capabilities - Agent capabilities
   * @param {Object} requirements - Role requirements
   * @returns {Number} - Compatibility score
   * @private
   */
  _calculateRoleCompatibility(capabilities, requirements) {
    let score = 0;
    let totalWeight = 0;
    
    // Check each required capability
    for (const [capability, requirement] of Object.entries(requirements)) {
      const weight = requirement.weight || 1;
      totalWeight += weight;
      
      if (capabilities[capability]) {
        const agentLevel = capabilities[capability];
        const requiredLevel = requirement.level || 1;
        
        // Score based on capability level
        if (agentLevel >= requiredLevel) {
          score += weight;
        } else {
          score += weight * (agentLevel / requiredLevel);
        }
      }
    }
    
    // Normalize score to 0-1 range
    return totalWeight > 0 ? score / totalWeight : 0;
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @private
   */
  _validateConfig(config) {
    const defaultConfig = {
      maxTeamSize: 10,
      minTeamSize: 1,
      allowMultipleTeams: false,
      teamFormationStrategy: 'optimal'
    };
    
    return { ...defaultConfig, ...config };
  }
}

module.exports = TeamFormation;
