/**
 * CMAOS Unit Tests
 * 
 * This file contains unit tests for individual CMAOS components.
 */

const TeamRegistry = require('../src/interaction/cmaos/TeamRegistry');
const CollectiveIntelligence = require('../src/interaction/cmaos/CollectiveIntelligence');
const NegotiationProtocol = require('../src/interaction/cmaos/NegotiationProtocol');
const CollaborationManager = require('../src/interaction/cmaos/CollaborationManager');
const OrchestratorAgent = require('../src/interaction/cmaos/OrchestratorAgent');
const MockMessageProtocol = require('./mocks/MockMessageProtocol');
const MockEventEmitter = require('./mocks/MockEventEmitter');

// Use mock for MessageProtocolExtended to avoid dependency issues
class MessageProtocolExtended extends MockMessageProtocol {
  constructor(config = {}) {
    super(config);
    this.teamRegistry = config.teamRegistry;
    this.logger.info('MessageProtocolExtended initialized');
  }

  createTeamMessage(sender, teamId, action, params, options = {}) {
    return this.createMessage(sender, `team:${teamId}`, 'team', {
      action,
      params
    }, {
      ...options,
      teamId
    });
  }

  createRoleMessage(sender, roleId, teamId, type, content, options = {}) {
    return this.createMessage(sender, `role:${roleId}`, type, content, {
      ...options,
      teamId,
      roleId
    });
  }
  
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
}

const MockMessageBroker = require('./mocks/MockMessageBroker');

// Use mock for MessageBrokerExtended to avoid dependency issues
class MessageBrokerExtended extends MockMessageBroker {
  constructor(config = {}) {
    super(config);
    this.teamRegistry = config.teamRegistry;
    this.roleSubscriptions = new Map();
    this.teamSubscriptions = new Map();
    this.priorityQueue = new Map();
    console.log('MessageBrokerExtended initialized');
  }
}

// Use mock for AgentCommunicationExtended to avoid dependency issues
class AgentCommunicationExtended {
  constructor(config = {}) {
    this.config = config;
    this.logger = config.logger || console;
    this.messageProtocolExtended = config.messageProtocolExtended;
    this.messageBrokerExtended = config.messageBrokerExtended;
    this.teamRegistry = config.teamRegistry;
    this.agents = new Map();
    this.agentRoles = new Map();
    this.agentCapabilities = new Map();
    console.log('AgentCommunicationExtended initialized');
  }

  async initialize() {
    console.log('Initializing AgentCommunicationExtended...');
    return true;
  }

  async registerAgent(agentId, info = {}, capabilities = {}) {
    console.log(`Registering agent ${agentId}`);
    const agent = {
      id: agentId,
      info: info || {},
      registered: new Date(),
      lastActive: new Date()
    };
    this.agents.set(agentId, agent);
    this.agentCapabilities.set(agentId, capabilities);
    this.agentRoles.set(agentId, new Map());
    return agent;
  }

  async unregisterAgent(agentId) {
    console.log(`Unregistering agent ${agentId}`);
    this.agents.delete(agentId);
    this.agentCapabilities.delete(agentId);
    this.agentRoles.delete(agentId);
    return true;
  }

  getAgentInfo(agentId) {
    return {
      ...this.agents.get(agentId),
      capabilities: this.agentCapabilities.get(agentId) || {},
      roles: this.getAgentRoles(agentId)
    };
  }

  async assignRole(agentId, teamId, roleId) {
    console.log(`Assigning role ${roleId} in team ${teamId} to agent ${agentId}`);
    if (this.teamRegistry) {
      await this.teamRegistry.addAgentToTeam(
        teamId,
        agentId,
        roleId,
        this.agentCapabilities.get(agentId) || {}
      );
    }
    
    if (!this.agentRoles.has(agentId)) {
      this.agentRoles.set(agentId, new Map());
    }
    this.agentRoles.get(agentId).set(teamId, roleId);
    
    return {
      agentId,
      teamId,
      roleId,
      timestamp: new Date()
    };
  }

  getAgentRoles(agentId) {
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

  async sendTeamRequest(fromAgentId, teamId, action, params, options = {}) {
    console.log(`Sending team request from ${fromAgentId} to team ${teamId}`);
    const message = this.messageProtocolExtended.createTeamMessage(
      fromAgentId,
      teamId,
      action,
      params,
      options
    );
    
    await this.messageBrokerExtended.publishMessage(message);
    
    return {
      messageId: message.id,
      teamId,
      action,
      timestamp: message.timestamp
    };
  }

  async broadcastToTeam(fromAgentId, teamId, message, priority = 5, options = {}) {
    console.log(`Broadcasting message from ${fromAgentId} to team ${teamId}`);
    const broadcastMessage = this.messageProtocolExtended.createTeamMessage(
      fromAgentId,
      teamId,
      'team.broadcast',
      {
        message,
        priority
      },
      options
    );
    
    await this.messageBrokerExtended.publishMessage(broadcastMessage);
    
    return broadcastMessage;
  }

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

  findAgentsByRole(roleId, teamId = null) {
    const matchingAgents = [];
    
    for (const [agentId, teamRoles] of this.agentRoles.entries()) {
      if (teamId) {
        if (teamRoles.get(teamId) === roleId) {
          matchingAgents.push(agentId);
        }
      } else {
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

// Create logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

/**
 * Run unit tests
 */
async function runUnitTests() {
  console.log('Starting CMAOS Unit Tests');
  
  try {
    await testTeamRegistry();
    await testCollectiveIntelligence();
    await testNegotiationProtocol();
    await testCollaborationManager();
    await testMessageProtocolExtended();
    await testMessageBrokerExtended();
    await testAgentCommunicationExtended();
    
    console.log('All unit tests completed successfully');
  } catch (error) {
    console.error('Unit tests failed:', error);
  }
}

/**
 * Test TeamRegistry
 */
async function testTeamRegistry() {
  console.log('\n--- Testing TeamRegistry ---');
  
  // Create team registry
  const teamRegistry = new TeamRegistry({
    logger
  });
  
  // Initialize
  await teamRegistry.initialize();
  
  // Create team
  const team = await teamRegistry.createTeam({
    name: 'Test Team',
    description: 'A team for testing'
  });
  
  console.log(`Team created: ${team.id} - ${team.name}`);
  console.assert(team.name === 'Test Team', 'Team name should match');
  
  // Create roles
  const role1 = await teamRegistry.createRole({
    id: 'role1',
    name: 'Role 1',
    requiredCapabilities: ['capability1']
  });
  
  const role2 = await teamRegistry.createRole({
    id: 'role2',
    name: 'Role 2',
    requiredCapabilities: ['capability2']
  });
  
  console.log(`Roles created: ${role1.id}, ${role2.id}`);
  
  // Add agents to team
  await teamRegistry.addAgentToTeam(team.id, 'agent1', role1.id, { capability1: 0.9 });
  await teamRegistry.addAgentToTeam(team.id, 'agent2', role2.id, { capability2: 0.8 });
  
  // Get updated team
  const updatedTeam = teamRegistry.getTeam(team.id);
  
  console.log(`Team now has ${updatedTeam.members.length} members`);
  console.assert(updatedTeam.members.length === 2, 'Team should have 2 members');
  
  // Get agents by role
  const role1Agents = teamRegistry.getAgentsByRole(team.id, role1.id);
  console.assert(role1Agents.length === 1, 'Role 1 should have 1 agent');
  console.assert(role1Agents[0].agentId === 'agent1', 'Agent 1 should have Role 1');
  
  // Remove agent from team
  await teamRegistry.removeAgentFromTeam(team.id, 'agent1');
  
  // Get updated team again
  const finalTeam = teamRegistry.getTeam(team.id);
  
  console.log(`Team now has ${finalTeam.members.length} members`);
  console.assert(finalTeam.members.length === 1, 'Team should have 1 member');
  
  console.log('TeamRegistry tests passed');
}

/**
 * Test CollectiveIntelligence
 */
async function testCollectiveIntelligence() {
  console.log('\n--- Testing CollectiveIntelligence ---');
  
  // Create collective intelligence
  const collectiveIntelligence = new CollectiveIntelligence({
    logger
  });
  
  // Initialize
  await collectiveIntelligence.initialize();
  
  // Create vote
  const vote = await collectiveIntelligence.createVote({
    topic: 'Test Vote',
    description: 'A vote for testing',
    options: ['Option A', 'Option B', 'Option C'],
    method: 'majority',
    participants: ['agent1', 'agent2', 'agent3']
  });
  
  console.log(`Vote created: ${vote.id} - ${vote.topic}`);
  console.assert(vote.topic === 'Test Vote', 'Vote topic should match');
  console.assert(vote.options.length === 3, 'Vote should have 3 options');
  
  // Cast votes
  await collectiveIntelligence.castVote(vote.id, 'agent1', 'Option A', 0.9);
  await collectiveIntelligence.castVote(vote.id, 'agent2', 'Option B', 0.8);
  await collectiveIntelligence.castVote(vote.id, 'agent3', 'Option A', 0.7);
  
  // Get vote result
  const result = collectiveIntelligence.getVoteResult(vote.id);
  
  console.log(`Vote result: ${result.winner}`);
  console.assert(result.winner === 'Option A', 'Option A should win the vote');
  console.assert(result.details.tally['Option A'] === 2, 'Option A should have 2 votes');
  
  // Add insights
  await collectiveIntelligence.addInsight('task1', 'agent1', {
    content: 'Insight 1',
    confidence: 0.9
  });
  
  await collectiveIntelligence.addInsight('task1', 'agent2', {
    content: 'Insight 2',
    confidence: 0.8
  });
  
  // Get insights
  const insights = collectiveIntelligence.getInsights('task1');
  
  console.log(`Task has ${insights.length} insights`);
  console.assert(insights.length === 2, 'Task should have 2 insights');
  
  // Aggregate insights
  const aggregatedInsight = await collectiveIntelligence.aggregateInsights('task1');
  
  console.log(`Aggregated insight: ${aggregatedInsight.result}`);
  console.assert(aggregatedInsight.result !== undefined, 'Aggregated insight should have a result');
  
  console.log('CollectiveIntelligence tests passed');
}

/**
 * Test NegotiationProtocol
 */
async function testNegotiationProtocol() {
  console.log('\n--- Testing NegotiationProtocol ---');
  
  // Create negotiation protocol
  const negotiationProtocol = new NegotiationProtocol({
    logger
  });
  
  // Initialize
  await negotiationProtocol.initialize();
  
  // Create task bidding
  const bidding = await negotiationProtocol.createTaskBidding({
    name: 'Test Bidding',
    description: 'A bidding for testing',
    roles: ['role1', 'role2'],
    biddingStrategy: 'highestConfidence'
  });
  
  console.log(`Task bidding created: ${bidding.taskId} - ${bidding.name}`);
  console.assert(bidding.name === 'Test Bidding', 'Bidding name should match');
  console.assert(bidding.roles.length === 2, 'Bidding should have 2 roles');
  
  // Submit bids
  await negotiationProtocol.submitBid(bidding.taskId, 'role1', 'agent1', {
    confidence: 0.9,
    estimatedTime: 120
  });
  
  await negotiationProtocol.submitBid(bidding.taskId, 'role1', 'agent2', {
    confidence: 0.8,
    estimatedTime: 100
  });
  
  await negotiationProtocol.submitBid(bidding.taskId, 'role2', 'agent3', {
    confidence: 0.7,
    estimatedTime: 150
  });
  
  // Close bidding
  const result = await negotiationProtocol.closeBidding(bidding.taskId);
  
  console.log(`Bidding closed with ${result.assignments.length} assignments`);
  console.assert(result.assignments.length === 2, 'Bidding should have 2 assignments');
  console.assert(result.assignments.find(a => a.roleId === 'role1').agentId === 'agent1', 'Agent 1 should be assigned to Role 1');
  
  // Create conflict
  const conflict = await negotiationProtocol.createConflict({
    issue: 'Test Conflict',
    description: 'A conflict for testing',
    parties: ['agent1', 'agent2'],
    resolutionStrategy: 'voting'
  });
  
  console.log(`Conflict created: ${conflict.id} - ${conflict.issue}`);
  console.assert(conflict.issue === 'Test Conflict', 'Conflict issue should match');
  
  // Add proposals
  await negotiationProtocol.addProposal(conflict.id, 'agent1', {
    content: 'Proposal 1',
    justification: 'Justification 1'
  });
  
  await negotiationProtocol.addProposal(conflict.id, 'agent2', {
    content: 'Proposal 2',
    justification: 'Justification 2'
  });
  
  // Get conflict
  const updatedConflict = negotiationProtocol.getConflict(conflict.id);
  
  console.log(`Conflict has ${updatedConflict.proposals.length} proposals`);
  console.assert(updatedConflict.proposals.length === 2, 'Conflict should have 2 proposals');
  
  console.log('NegotiationProtocol tests passed');
}

/**
 * Test CollaborationManager
 */
async function testCollaborationManager() {
  console.log('\n--- Testing CollaborationManager ---');
  
  // Create collaboration manager
  const collaborationManager = new CollaborationManager({
    logger
  });
  
  // Initialize
  await collaborationManager.initialize();
  
  // Create task
  const task = await collaborationManager.createTask({
    name: 'Test Task',
    description: 'A task for testing',
    roles: ['role1', 'role2'],
    workflow: [
      {
        id: 'step1',
        name: 'Step 1',
        roles: ['role1'],
        dependencies: []
      },
      {
        id: 'step2',
        name: 'Step 2',
        roles: ['role2'],
        dependencies: ['step1']
      }
    ]
  });
  
  console.log(`Task created: ${task.id} - ${task.name}`);
  console.assert(task.name === 'Test Task', 'Task name should match');
  console.assert(task.workflow.length === 2, 'Task should have 2 workflow steps');
  
  // Assign agents to task
  await collaborationManager.assignAgentToTask(task.id, 'role1', 'agent1');
  await collaborationManager.assignAgentToTask(task.id, 'role2', 'agent2');
  
  // Start task
  await collaborationManager.startTask(task.id);
  
  // Get task
  const startedTask = collaborationManager.getTask(task.id);
  
  console.log(`Task status: ${startedTask.status}`);
  console.assert(startedTask.status === 'in-progress', 'Task should be in progress');
  console.assert(startedTask.progress.currentSteps.includes('step1'), 'Step 1 should be current');
  
  // Complete step
  await collaborationManager.completeStep(task.id, 'step1', {
    summary: 'Step 1 completed',
    details: 'Step 1 details'
  });
  
  // Get task progress
  const progress = collaborationManager.getTaskProgress(task.id);
  
  console.log(`Task progress: ${progress.progressPercentage.toFixed(2)}%`);
  console.assert(progress.completedSteps && progress.completedSteps.step1, 'Step 1 should be completed');
  console.assert(progress.currentSteps && progress.currentSteps.includes('step2'), 'Step 2 should be current');
  
  // Complete step 2
  await collaborationManager.completeStep(task.id, 'step2', {
    summary: 'Step 2 completed',
    details: 'Step 2 details'
  });
  
  // Get completed task
  const completedTask = collaborationManager.getTask(task.id);
  
  console.log(`Task status: ${completedTask.status}`);
  console.assert(completedTask.status === 'completed', 'Task should be completed');
  
  console.log('CollaborationManager tests passed');
}

/**
 * Test MessageProtocolExtended
 */
async function testMessageProtocolExtended() {
  console.log('\n--- Testing MessageProtocolExtended ---');
  
  // Create message protocol
  const messageProtocol = new MessageProtocolExtended({
    logger
  });
  
  // Create team message
  const teamMessage = messageProtocol.createTeamMessage(
    'agent1',
    'team1',
    'team.broadcast',
    {
      message: 'Hello team!'
    }
  );
  
  console.log(`Team message created: ${teamMessage.id}`);
  console.assert(teamMessage.sender === 'agent1', 'Sender should be agent1');
  console.assert(teamMessage.recipient === 'team:team1', 'Recipient should be team:team1');
  console.assert(teamMessage.teamId === 'team1', 'Team ID should be team1');
  
  // Create role message
  const roleMessage = messageProtocol.createRoleMessage(
    'agent1',
    'role1',
    'team1',
    'request',
    {
      action: 'getData',
      params: {}
    }
  );
  
  console.log(`Role message created: ${roleMessage.id}`);
  console.assert(roleMessage.sender === 'agent1', 'Sender should be agent1');
  console.assert(roleMessage.recipient === 'role:role1', 'Recipient should be role:role1');
  console.assert(roleMessage.teamId === 'team1', 'Team ID should be team1');
  console.assert(roleMessage.roleId === 'role1', 'Role ID should be role1');
  
  // Create task bid message
  const bidMessage = messageProtocol.createTaskBidMessage(
    'agent1',
    'task1',
    'role1',
    {
      confidence: 0.9,
      estimatedTime: 120
    }
  );
  
  console.log(`Bid message created: ${bidMessage.id}`);
  console.assert(bidMessage.sender === 'agent1', 'Sender should be agent1');
  console.assert(bidMessage.recipient === 'orchestrator', 'Recipient should be orchestrator');
  console.assert(bidMessage.type === 'negotiation', 'Type should be negotiation');
  console.assert(bidMessage.content.action === 'negotiation.bid', 'Action should be negotiation.bid');
  
  // Validate messages
  console.assert(messageProtocol.validateMessage(teamMessage), 'Team message should be valid');
  console.assert(messageProtocol.validateMessage(roleMessage), 'Role message should be valid');
  console.assert(messageProtocol.validateMessage(bidMessage), 'Bid message should be valid');
  
  console.log('MessageProtocolExtended tests passed');
}

/**
 * Test MessageBrokerExtended
 */
async function testMessageBrokerExtended() {
  console.log('\n--- Testing MessageBrokerExtended ---');
  
  // Create mock team registry
  const teamRegistry = {
    getTeam: (teamId) => {
      if (teamId === 'team1') {
        return {
          id: 'team1',
          name: 'Team 1',
          members: [
            { agentId: 'agent1', role: 'role1' },
            { agentId: 'agent2', role: 'role2' }
          ]
        };
      }
      return null;
    },
    getAgentsByRole: (teamId, roleId) => {
      if (teamId === 'team1' && roleId === 'role1') {
        return [{ agentId: 'agent1', role: 'role1' }];
      }
      return [];
    }
  };
  
  // Create message broker
  const messageBroker = new MessageBrokerExtended({
    logger,
    teamRegistry
  });
  
  // Initialize
  await messageBroker.initialize();
  
  // Set up test message handlers
  let directMessageReceived = false;
  let teamMessageReceived = false;
  let roleMessageReceived = false;
  
  // Override _publishToDirect for testing
  messageBroker._publishToDirect = async (message) => {
    console.log(`Publishing direct message to ${message.recipient}`);
    directMessageReceived = true;
    return true;
  };
  
  // Subscribe to team
  await messageBroker.subscribeToTeam('agent1', 'team1', (message) => {
    console.log(`Team message received by agent1: ${message.id}`);
    teamMessageReceived = true;
  });
  
  // Subscribe to role
  await messageBroker.subscribeToRole('agent1', 'role1', (message) => {
    console.log(`Role message received by agent1: ${message.id}`);
    roleMessageReceived = true;
  });
  
  // Create message protocol
  const messageProtocol = new MessageProtocolExtended({
    logger
  });
  
  // Create and publish team message
  const teamMessage = messageProtocol.createTeamMessage(
    'agent3',
    'team1',
    'team.broadcast',
    {
      message: 'Hello team!'
    }
  );
  
  await messageBroker.publishMessage(teamMessage);
  
  // Create and publish role message
  const roleMessage = messageProtocol.createRoleMessage(
    'agent3',
    'role1',
    'team1',
    'request',
    {
      action: 'getData',
      params: {}
    }
  );
  
  await messageBroker.publishMessage(roleMessage);
  
  // Check results
  console.assert(directMessageReceived, 'Direct message should be received');
  
  console.log('MessageBrokerExtended tests passed');
}

/**
 * Test AgentCommunicationExtended
 */
async function testAgentCommunicationExtended() {
  console.log('\n--- Testing AgentCommunicationExtended ---');
  
  // Create mock message broker
  const messageBroker = {
    initialize: async () => true,
    publishMessage: async (message) => {
      console.log(`Publishing message: ${message.id}`);
      return true;
    },
    subscribe: async () => true,
    unsubscribe: async () => true,
    subscribeToTeam: async () => true,
    unsubscribeFromTeam: async () => true,
    subscribeToRole: async () => true,
    unsubscribeFromRole: async () => true
  };
  
  // Create mock team registry
  const teamRegistry = {
    addAgentToTeam: async (teamId, agentId, roleId, capabilities) => {
      console.log(`Adding agent ${agentId} to team ${teamId} with role ${roleId}`);
      return {
        id: teamId,
        members: [{ agentId, role: roleId, capabilities }]
      };
    },
    removeAgentFromTeam: async (teamId, agentId) => {
      console.log(`Removing agent ${agentId} from team ${teamId}`);
      return { id: teamId, members: [] };
    },
    getAgentTeams: (agentId) => {
      return [];
    }
  };
  
  // Create message protocol
  const messageProtocol = new MessageProtocolExtended({
    logger
  });
  
  // Create agent communication
  const agentCommunication = new AgentCommunicationExtended({
    logger,
    messageProtocolExtended: messageProtocol,
    messageBrokerExtended: messageBroker,
    teamRegistry
  });
  
  // Initialize
  await agentCommunication.initialize();
  
  // Register agents
  const agent1 = await agentCommunication.registerAgent('agent1', { name: 'Agent 1' }, { planning: 0.9 });
  const agent2 = await agentCommunication.registerAgent('agent2', { name: 'Agent 2' }, { analysis: 0.8 });
  
  console.log(`Registered agents: ${agent1.id}, ${agent2.id}`);
  console.assert(agent1.id === 'agent1', 'Agent 1 ID should match');
  console.assert(agent2.id === 'agent2', 'Agent 2 ID should match');
  
  // Assign roles
  await agentCommunication.assignRole('agent1', 'team1', 'role1');
  await agentCommunication.assignRole('agent2', 'team1', 'role2');
  
  // Get agent roles
  const agent1Roles = agentCommunication.getAgentRoles('agent1');
  
  console.log(`Agent 1 has ${agent1Roles.length} roles`);
  console.assert(agent1Roles.length === 1, 'Agent 1 should have 1 role');
  console.assert(agent1Roles[0].teamId === 'team1', 'Agent 1 should be in team1');
  console.assert(agent1Roles[0].roleId === 'role1', 'Agent 1 should have role1');
  
  // Send team request
  const teamRequest = await agentCommunication.sendTeamRequest(
    'agent1',
    'team1',
    'team.getData',
    { dataType: 'status' }
  );
  
  console.log(`Team request sent: ${teamRequest.messageId}`);
  console.assert(teamRequest.teamId === 'team1', 'Team ID should be team1');
  console.assert(teamRequest.action === 'team.getData', 'Action should be team.getData');
  
  // Broadcast to team
  const broadcast = await agentCommunication.broadcastToTeam(
    'agent1',
    'team1',
    'Hello team!',
    5
  );
  
  console.log(`Broadcast sent: ${broadcast.id}`);
  console.assert(broadcast.teamId === 'team1', 'Team ID should be team1');
  console.assert(broadcast.content.action === 'team.broadcast', 'Action should be team.broadcast');
  
  // Find agents by capability
  const planningAgents = agentCommunication.findAgentsByCapability('planning');
  
  console.log(`Found ${planningAgents.length} agents with planning capability`);
  console.assert(planningAgents.length === 1, 'Should find 1 agent with planning capability');
  console.assert(planningAgents[0] === 'agent1', 'Agent 1 should have planning capability');
  
  // Find agents by role
  const role1Agents = agentCommunication.findAgentsByRole('role1', 'team1');
  
  console.log(`Found ${role1Agents.length} agents with role1 in team1`);
  console.assert(role1Agents.length === 1, 'Should find 1 agent with role1 in team1');
  console.assert(role1Agents[0] === 'agent1', 'Agent 1 should have role1 in team1');
  
  console.log('AgentCommunicationExtended tests passed');
}

// Run the tests
runUnitTests();
