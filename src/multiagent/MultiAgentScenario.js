/**
 * MultiAgentScenario.js
 * Implements example scenarios for multi-agent environments
 * 
 * This module provides pre-configured scenarios for testing and
 * demonstrating multi-agent capabilities.
 */

const GridWorldEnvironment = require('./GridWorldEnvironment');
const RLAgent = require('./RLAgent');
const TeamFormation = require('./TeamFormation');
const CommunicationProtocol = require('./CommunicationProtocol');

class MultiAgentScenario {
  /**
   * Create a new multi-agent scenario
   * @param {String} scenarioType - Type of scenario to create
   * @param {Object} config - Scenario configuration
   */
  constructor(scenarioType, config = {}) {
    this.scenarioType = scenarioType;
    this.config = this._validateConfig(config);
    this.environment = null;
    this.agents = [];
    this.teamManager = null;
    this.communicationProtocol = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the scenario
   * @returns {Boolean} - Success status
   */
  initialize() {
    // Create communication protocol
    this.communicationProtocol = new CommunicationProtocol();
    
    // Create team manager if needed
    if (this.config.teamBased) {
      this.teamManager = new TeamFormation();
    }
    
    // Create environment and agents based on scenario type
    switch (this.scenarioType) {
      case 'cooperative_navigation':
        this._setupCooperativeNavigation();
        break;
      case 'competitive_gathering':
        this._setupCompetitiveGathering();
        break;
      case 'predator_prey':
        this._setupPredatorPrey();
        break;
      case 'team_battle':
        this._setupTeamBattle();
        break;
      default:
        throw new Error(`Unknown scenario type: ${this.scenarioType}`);
    }
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Run the scenario for a specified number of episodes
   * @param {Number} episodes - Number of episodes to run
   * @param {Boolean} render - Whether to render the environment
   * @returns {Object} - Results of the scenario
   */
  run(episodes = 1, render = false) {
    if (!this.initialized) {
      throw new Error('Scenario must be initialized before running');
    }
    
    const results = {
      episodes: [],
      agentStats: new Map(),
      teamStats: this.config.teamBased ? new Map() : null
    };
    
    for (let i = 0; i < episodes; i++) {
      // Run episode
      const episodeResult = this.environment.runEpisode(render);
      results.episodes.push(episodeResult);
      
      // Update team statistics if team-based
      if (this.config.teamBased && this.teamManager) {
        for (const team of this.teamManager.getAllTeams().values()) {
          this.teamManager.updateTeamPerformance(team.id, {
            reward: Array.from(episodeResult.rewards.entries())
              .filter(([agentId]) => this.teamManager.agentTeams.get(agentId) === team.id)
              .reduce((sum, [_, reward]) => sum + reward, 0)
          });
          
          // Update agent performances
          for (const [agentId, reward] of episodeResult.rewards.entries()) {
            if (this.teamManager.agentTeams.get(agentId) === team.id) {
              this.teamManager.updateAgentPerformance(team.id, agentId, {
                reward
              });
            }
          }
        }
      }
    }
    
    // Collect agent statistics
    for (const agent of this.agents) {
      results.agentStats.set(agent.id, agent.getStats());
    }
    
    // Collect team statistics if team-based
    if (this.config.teamBased && this.teamManager) {
      for (const team of this.teamManager.getAllTeams().values()) {
        results.teamStats.set(team.id, this.teamManager.getTeamStatistics(team.id));
      }
    }
    
    return results;
  }
  
  /**
   * Reset the scenario
   * @returns {Boolean} - Success status
   */
  reset() {
    if (!this.initialized) {
      return false;
    }
    
    // Reset environment
    this.environment.reset();
    
    // Reset agents
    for (const agent of this.agents) {
      agent.reset();
    }
    
    return true;
  }
  
  /**
   * Close the scenario and release resources
   * @returns {Boolean} - Success status
   */
  close() {
    if (!this.initialized) {
      return false;
    }
    
    // Close environment
    this.environment.close();
    
    this.initialized = false;
    return true;
  }
  
  /**
   * Set up cooperative navigation scenario
   * @private
   */
  _setupCooperativeNavigation() {
    // Create grid world environment
    this.environment = new GridWorldEnvironment({
      width: 10,
      height: 10,
      visionRange: 3,
      communicationEnabled: true,
      teamBased: true,
      objects: {
        goal1: { type: 'goal', position: { x: 1, y: 1 } },
        goal2: { type: 'goal', position: { x: 8, y: 1 } },
        goal3: { type: 'goal', position: { x: 1, y: 8 } },
        goal4: { type: 'goal', position: { x: 8, y: 8 } },
        obstacle1: { type: 'obstacle', position: { x: 4, y: 4 } },
        obstacle2: { type: 'obstacle', position: { x: 5, y: 4 } },
        obstacle3: { type: 'obstacle', position: { x: 4, y: 5 } },
        obstacle4: { type: 'obstacle', position: { x: 5, y: 5 } }
      }
    });
    
    // Create team
    const teamId = 'navigation_team';
    this.teamManager.createTeam(teamId, {
      name: 'Navigation Team',
      goal: 'Reach all goals efficiently',
      formation: 'cooperative'
    });
    
    // Create agents
    for (let i = 0; i < this.config.agentCount; i++) {
      const agent = new RLAgent(`agent_${i}`, {
        algorithmType: 'ppo',
        learnFromCommunication: true,
        sharedExperienceWeight: 0.7
      });
      
      this.agents.push(agent);
      this.environment.registerAgent(agent);
      
      // Add agent to team
      this.teamManager.addAgentToTeam(teamId, agent.id);
    }
  }
  
  /**
   * Set up competitive gathering scenario
   * @private
   */
  _setupCompetitiveGathering() {
    // Create grid world environment
    this.environment = new GridWorldEnvironment({
      width: 15,
      height: 15,
      visionRange: 4,
      communicationEnabled: true,
      teamBased: false,
      objects: {}
    });
    
    // Add resources
    for (let i = 0; i < 20; i++) {
      this.environment.config.objects[`resource_${i}`] = {
        type: 'resource'
      };
    }
    
    // Create agents
    for (let i = 0; i < this.config.agentCount; i++) {
      const agent = new RLAgent(`agent_${i}`, {
        algorithmType: 'sac',
        learnFromCommunication: false
      });
      
      this.agents.push(agent);
      this.environment.registerAgent(agent);
    }
  }
  
  /**
   * Set up predator prey scenario
   * @private
   */
  _setupPredatorPrey() {
    // Create grid world environment
    this.environment = new GridWorldEnvironment({
      width: 20,
      height: 20,
      visionRange: 5,
      communicationEnabled: true,
      teamBased: true,
      objects: {
        obstacle1: { type: 'obstacle', position: { x: 5, y: 5 } },
        obstacle2: { type: 'obstacle', position: { x: 15, y: 5 } },
        obstacle3: { type: 'obstacle', position: { x: 5, y: 15 } },
        obstacle4: { type: 'obstacle', position: { x: 15, y: 15 } },
        obstacle5: { type: 'obstacle', position: { x: 10, y: 10 } }
      }
    });
    
    // Create predator team
    const predatorTeamId = 'predator_team';
    this.teamManager.createTeam(predatorTeamId, {
      name: 'Predator Team',
      goal: 'Catch all prey',
      formation: 'cooperative'
    });
    
    // Create prey team
    const preyTeamId = 'prey_team';
    this.teamManager.createTeam(preyTeamId, {
      name: 'Prey Team',
      goal: 'Avoid predators',
      formation: 'cooperative'
    });
    
    // Create predator agents
    const predatorCount = Math.floor(this.config.agentCount / 3);
    for (let i = 0; i < predatorCount; i++) {
      const agent = new RLAgent(`predator_${i}`, {
        algorithmType: 'ppo',
        learnFromCommunication: true
      });
      
      this.agents.push(agent);
      this.environment.registerAgent(agent);
      
      // Add agent to team
      this.teamManager.addAgentToTeam(predatorTeamId, agent.id);
    }
    
    // Create prey agents
    const preyCount = this.config.agentCount - predatorCount;
    for (let i = 0; i < preyCount; i++) {
      const agent = new RLAgent(`prey_${i}`, {
        algorithmType: 'sac',
        learnFromCommunication: true
      });
      
      this.agents.push(agent);
      this.environment.registerAgent(agent);
      
      // Add agent to team
      this.teamManager.addAgentToTeam(preyTeamId, agent.id);
    }
  }
  
  /**
   * Set up team battle scenario
   * @private
   */
  _setupTeamBattle() {
    // Create grid world environment
    this.environment = new GridWorldEnvironment({
      width: 20,
      height: 20,
      visionRange: 4,
      communicationEnabled: true,
      teamBased: true,
      objects: {}
    });
    
    // Add resources and obstacles
    for (let i = 0; i < 10; i++) {
      this.environment.config.objects[`resource_${i}`] = {
        type: 'resource'
      };
      
      this.environment.config.objects[`obstacle_${i}`] = {
        type: 'obstacle'
      };
    }
    
    // Create teams
    const teamCount = Math.min(4, Math.floor(this.config.agentCount / 2));
    const teamsIds = [];
    
    for (let i = 0; i < teamCount; i++) {
      const teamId = `team_${i}`;
      this.teamManager.createTeam(teamId, {
        name: `Team ${i + 1}`,
        goal: 'Defeat other teams and collect resources',
        formation: 'hierarchical'
      });
      
      teamsIds.push(teamId);
    }
    
    // Create agents and assign to teams
    for (let i = 0; i < this.config.agentCount; i++) {
      const agent = new RLAgent(`agent_${i}`, {
        algorithmType: i % 2 === 0 ? 'ppo' : 'sac',
        learnFromCommunication: true
      });
      
      this.agents.push(agent);
      this.environment.registerAgent(agent);
      
      // Add agent to team (round-robin assignment)
      const teamId = teamsIds[i % teamCount];
      this.teamManager.addAgentToTeam(teamId, agent.id);
    }
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @private
   */
  _validateConfig(config) {
    const defaultConfig = {
      agentCount: 4,
      teamBased: true,
      communicationEnabled: true,
      difficulty: 'medium'
    };
    
    return { ...defaultConfig, ...config };
  }
}

module.exports = MultiAgentScenario;
