/**
 * Unit test helper for CMAOS components
 */
class TestHelper {
  /**
   * Create a mock logger
   * @returns {Object} Mock logger
   */
  static createMockLogger() {
    return {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  }

  /**
   * Create a mock message broker
   * @returns {Object} Mock message broker
   */
  static createMockMessageBroker() {
    return {
      initialize: jest.fn().mockResolvedValue(true),
      publishMessage: jest.fn().mockResolvedValue(true),
      subscribe: jest.fn().mockResolvedValue(true),
      unsubscribe: jest.fn().mockResolvedValue(true),
      subscribeToTopic: jest.fn().mockResolvedValue(true),
      unsubscribeFromTopic: jest.fn().mockResolvedValue(true),
      subscribeToTeam: jest.fn().mockResolvedValue(true),
      unsubscribeFromTeam: jest.fn().mockResolvedValue(true),
      subscribeToRole: jest.fn().mockResolvedValue(true),
      unsubscribeFromRole: jest.fn().mockResolvedValue(true)
    };
  }

  /**
   * Create a mock team registry
   * @returns {Object} Mock team registry
   */
  static createMockTeamRegistry() {
    const teams = new Map();
    const roles = new Map();
    
    return {
      initialize: jest.fn().mockResolvedValue(true),
      createTeam: jest.fn().mockImplementation((teamData) => {
        const team = {
          id: teamData.id || `team-${Date.now()}`,
          name: teamData.name,
          description: teamData.description,
          members: [],
          created: new Date(),
          updated: new Date()
        };
        teams.set(team.id, team);
        return team;
      }),
      getTeam: jest.fn().mockImplementation((teamId) => {
        return teams.get(teamId);
      }),
      listTeams: jest.fn().mockImplementation(() => {
        return Array.from(teams.values());
      }),
      createRole: jest.fn().mockImplementation((roleData) => {
        const role = {
          id: roleData.id,
          name: roleData.name,
          description: roleData.description,
          requiredCapabilities: roleData.requiredCapabilities || [],
          permissions: roleData.permissions || []
        };
        roles.set(role.id, role);
        return role;
      }),
      getRole: jest.fn().mockImplementation((roleId) => {
        return roles.get(roleId);
      }),
      addAgentToTeam: jest.fn().mockImplementation((teamId, agentId, roleId, capabilities) => {
        const team = teams.get(teamId);
        if (team) {
          team.members.push({
            agentId,
            role: roleId,
            capabilities,
            joined: new Date()
          });
          team.updated = new Date();
        }
        return team;
      }),
      removeAgentFromTeam: jest.fn().mockImplementation((teamId, agentId) => {
        const team = teams.get(teamId);
        if (team) {
          team.members = team.members.filter(m => m.agentId !== agentId);
          team.updated = new Date();
        }
        return team;
      }),
      getAgentsByRole: jest.fn().mockImplementation((teamId, roleId) => {
        const team = teams.get(teamId);
        if (team) {
          return team.members.filter(m => m.role === roleId);
        }
        return [];
      }),
      getAgentTeams: jest.fn().mockImplementation((agentId) => {
        return Array.from(teams.values()).filter(team => 
          team.members.some(m => m.agentId === agentId)
        );
      })
    };
  }

  /**
   * Create a mock agent communication
   * @returns {Object} Mock agent communication
   */
  static createMockAgentCommunication() {
    const agents = new Map();
    
    return {
      initialize: jest.fn().mockResolvedValue(true),
      registerAgent: jest.fn().mockImplementation((agentId, info, capabilities) => {
        const agent = {
          id: agentId,
          info: info || {},
          capabilities: capabilities || {},
          registered: new Date(),
          lastActive: new Date()
        };
        agents.set(agentId, agent);
        return agent;
      }),
      unregisterAgent: jest.fn().mockImplementation((agentId) => {
        return agents.delete(agentId);
      }),
      getAgentInfo: jest.fn().mockImplementation((agentId) => {
        return agents.get(agentId);
      }),
      sendRequest: jest.fn().mockResolvedValue({ result: 'success' }),
      sendNotification: jest.fn().mockResolvedValue(true),
      broadcastToTeam: jest.fn().mockResolvedValue(true)
    };
  }
}

module.exports = TestHelper;
