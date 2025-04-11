/**
 * index.js
 * Main entry point for the multi-agent module
 * 
 * This file exports all components of the multi-agent module
 * for easy access and integration with the rest of the system.
 */

const Agent = require('./Agent');
const MultiAgentEnvironment = require('./MultiAgentEnvironment');
const CommunicationProtocol = require('./CommunicationProtocol');
const TeamFormation = require('./TeamFormation');
const GridWorldEnvironment = require('./GridWorldEnvironment');
const RLAgent = require('./RLAgent');
const MultiAgentScenario = require('./MultiAgentScenario');

/**
 * Create a new multi-agent environment
 * @param {String} type - Environment type ('gridworld' or custom)
 * @param {Object} config - Environment configuration
 * @returns {MultiAgentEnvironment} - Created environment
 */
function createEnvironment(type, config = {}) {
  switch (type.toLowerCase()) {
    case 'gridworld':
      return new GridWorldEnvironment(config);
    default:
      throw new Error(`Unknown environment type: ${type}`);
  }
}

/**
 * Create a new agent
 * @param {String} type - Agent type ('rl' or custom)
 * @param {String} id - Agent ID
 * @param {Object} config - Agent configuration
 * @returns {Agent} - Created agent
 */
function createAgent(type, id, config = {}) {
  switch (type.toLowerCase()) {
    case 'rl':
      return new RLAgent(id, config);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

/**
 * Create a new scenario
 * @param {String} type - Scenario type
 * @param {Object} config - Scenario configuration
 * @returns {MultiAgentScenario} - Created scenario
 */
function createScenario(type, config = {}) {
  return new MultiAgentScenario(type, config);
}

/**
 * Create a new team formation manager
 * @param {Object} config - Team formation configuration
 * @returns {TeamFormation} - Created team formation manager
 */
function createTeamManager(config = {}) {
  return new TeamFormation(config);
}

/**
 * Create a new communication protocol
 * @param {Object} config - Communication protocol configuration
 * @returns {CommunicationProtocol} - Created communication protocol
 */
function createCommunicationProtocol(config = {}) {
  return new CommunicationProtocol(config);
}

// Export all components
module.exports = {
  // Base classes
  Agent,
  MultiAgentEnvironment,
  CommunicationProtocol,
  TeamFormation,
  
  // Implementations
  environments: {
    GridWorldEnvironment
  },
  
  agents: {
    RLAgent
  },
  
  // Scenarios
  MultiAgentScenario,
  
  // Factory functions
  createEnvironment,
  createAgent,
  createScenario,
  createTeamManager,
  createCommunicationProtocol
};
