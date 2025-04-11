/**
 * CMAOS Integration Test
 * 
 * This file contains tests to validate the integration of all CMAOS components.
 */

// Import required modules
const TeamRegistry = require('../src/interaction/cmaos/TeamRegistry');
const CollectiveIntelligence = require('../src/interaction/cmaos/CollectiveIntelligence');
const NegotiationProtocol = require('../src/interaction/cmaos/NegotiationProtocol');
const CollaborationManager = require('../src/interaction/cmaos/CollaborationManager');
const OrchestratorAgent = require('../src/interaction/cmaos/OrchestratorAgent');
const MessageProtocolExtended = require('../src/interaction/cmaos/MessageProtocolExtended');
const MessageBrokerExtended = require('../src/interaction/cmaos/MessageBrokerExtended');
const AgentCommunicationExtended = require('../src/interaction/cmaos/AgentCommunicationExtended');

// Create logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

/**
 * Run integration tests
 */
async function runIntegrationTests() {
  console.log('Starting CMAOS Integration Tests');
  
  try {
    // Initialize components
    const components = await initializeComponents();
    
    // Run tests
    await testTeamFormation(components);
    await testRoleAssignment(components);
    await testTaskCreation(components);
    await testTaskBidding(components);
    await testTeamCommunication(components);
    await testCollectiveDecisionMaking(components);
    await testWorkflowExecution(components);
    
    console.log('All integration tests completed successfully');
  } catch (error) {
    console.error('Integration tests failed:', error);
  }
}

/**
 * Initialize all CMAOS components
 */
async function initializeComponents() {
  console.log('Initializing CMAOS components');
  
  // Create message protocol
  const messageProtocol = new MessageProtocolExtended({
    logger
  });
  
  // Create message broker
  const messageBroker = new MessageBrokerExtended({
    logger
  });
  await messageBroker.initialize();
  
  // Create team registry
  const teamRegistry = new TeamRegistry({
    logger
  });
  await teamRegistry.initialize();
  
  // Create collective intelligence
  const collectiveIntelligence = new CollectiveIntelligence({
    logger
  });
  await collectiveIntelligence.initialize();
  
  // Create negotiation protocol
  const negotiationProtocol = new NegotiationProtocol({
    logger
  });
  await negotiationProtocol.initialize();
  
  // Create collaboration manager
  const collaborationManager = new CollaborationManager({
    logger
  });
  await collaborationManager.initialize();
  
  // Create agent communication
  const agentCommunication = new AgentCommunicationExtended({
    messageProtocolExtended: messageProtocol,
    messageBrokerExtended: messageBroker,
    teamRegistry,
    logger
  });
  await agentCommunication.initialize();
  
  // Create orchestrator agent
  const orchestratorAgent = new OrchestratorAgent({
    teamRegistry,
    collaborationManager,
    negotiationProtocol,
    collectiveIntelligence,
    messageBroker,
    agentCommunication,
    logger
  });
  await orchestratorAgent.initialize();
  
  // Set team registry in message broker
  messageBroker.teamRegistry = teamRegistry;
  
  // Set message protocol in team registry
  messageProtocol.teamRegistry = teamRegistry;
  
  console.log('All components initialized successfully');
  
  return {
    messageProtocol,
    messageBroker,
    teamRegistry,
    collectiveIntelligence,
    negotiationProtocol,
    collaborationManager,
    agentCommunication,
    orchestratorAgent
  };
}

/**
 * Test team formation
 */
async function testTeamFormation(components) {
  console.log('\n--- Testing Team Formation ---');
  
  const { orchestratorAgent } = components;
  
  // Create a team
  const team = await orchestratorAgent.formTeam({
    name: 'Test Team',
    description: 'A team for testing CMAOS',
    roles: [
      { id: 'coordinator', name: 'Coordinator', requiredCapabilities: ['planning'] },
      { id: 'analyst', name: 'Analyst', requiredCapabilities: ['analysis'] },
      { id: 'executor', name: 'Executor', requiredCapabilities: ['execution'] }
    ]
  });
  
  console.log(`Team created: ${team.id} - ${team.name}`);
  console.assert(team.name === 'Test Team', 'Team name should match');
  console.assert(team.members.length === 0, 'Team should have no members initially');
  
  return team;
}

/**
 * Test role assignment
 */
async function testRoleAssignment(components) {
  console.log('\n--- Testing Role Assignment ---');
  
  const { orchestratorAgent, agentCommunication, teamRegistry } = components;
  
  // Get the first team
  const teams = teamRegistry.listTeams();
  const team = teams[0];
  
  // Register test agents
  await agentCommunication.registerAgent('agent1', { name: 'Agent 1' }, { planning: 0.9 });
  await agentCommunication.registerAgent('agent2', { name: 'Agent 2' }, { analysis: 0.8 });
  await agentCommunication.registerAgent('agent3', { name: 'Agent 3' }, { execution: 0.7 });
  
  console.log('Registered test agents');
  
  // Assign roles
  await orchestratorAgent.assignTeamRoles(team.id, [
    { agentId: 'agent1', roleId: 'coordinator' },
    { agentId: 'agent2', roleId: 'analyst' },
    { agentId: 'agent3', roleId: 'executor' }
  ]);
  
  // Get updated team
  const updatedTeam = teamRegistry.getTeam(team.id);
  
  console.log(`Team now has ${updatedTeam.members.length} members`);
  console.assert(updatedTeam.members.length === 3, 'Team should have 3 members');
  
  // Verify role assignments
  const agent1Role = updatedTeam.members.find(m => m.agentId === 'agent1').role;
  const agent2Role = updatedTeam.members.find(m => m.agentId === 'agent2').role;
  const agent3Role = updatedTeam.members.find(m => m.agentId === 'agent3').role;
  
  console.assert(agent1Role === 'coordinator', 'Agent 1 should be coordinator');
  console.assert(agent2Role === 'analyst', 'Agent 2 should be analyst');
  console.assert(agent3Role === 'executor', 'Agent 3 should be executor');
  
  return updatedTeam;
}

/**
 * Test task creation
 */
async function testTaskCreation(components) {
  console.log('\n--- Testing Task Creation ---');
  
  const { orchestratorAgent, teamRegistry, collaborationManager } = components;
  
  // Get the first team
  const teams = teamRegistry.listTeams();
  const team = teams[0];
  
  // Create a task for the team
  const task = await orchestratorAgent.createTeamTask(team.id, {
    name: 'Test Task',
    description: 'A task for testing CMAOS',
    roles: ['coordinator', 'analyst', 'executor'],
    workflow: [
      {
        id: 'step1',
        name: 'Planning Step',
        description: 'Plan the task execution',
        roles: ['coordinator'],
        dependencies: []
      },
      {
        id: 'step2',
        name: 'Analysis Step',
        description: 'Analyze the requirements',
        roles: ['analyst'],
        dependencies: ['step1']
      },
      {
        id: 'step3',
        name: 'Execution Step',
        description: 'Execute the plan',
        roles: ['executor'],
        dependencies: ['step2']
      }
    ]
  });
  
  console.log(`Task created: ${task.id} - ${task.name}`);
  console.assert(task.name === 'Test Task', 'Task name should match');
  console.assert(task.status === 'in-progress', 'Task should be in progress');
  
  // Verify task assignments
  console.assert(task.assignments.length === 3, 'Task should have 3 assignments');
  
  // Verify current steps
  console.assert(task.progress.currentSteps.includes('step1'), 'Step 1 should be current');
  console.assert(!task.progress.currentSteps.includes('step2'), 'Step 2 should not be current yet');
  
  return task;
}

/**
 * Test task bidding
 */
async function testTaskBidding(components) {
  console.log('\n--- Testing Task Bidding ---');
  
  const { orchestratorAgent, negotiationProtocol } = components;
  
  // Create a task bidding
  const bidding = await orchestratorAgent.distributeTaskWithBidding({
    name: 'Bidding Task',
    description: 'A task for testing bidding',
    roles: ['researcher', 'developer', 'tester'],
    biddingStrategy: 'highestConfidence'
  });
  
  console.log(`Task bidding created: ${bidding.taskId}`);
  console.assert(bidding.name === 'Bidding Task', 'Bidding task name should match');
  console.assert(bidding.status === 'open', 'Bidding should be open');
  
  // Submit bids
  await negotiationProtocol.submitBid(bidding.taskId, 'researcher', 'agent1', {
    confidence: 0.9,
    estimatedTime: 120,
    resources: { cpu: 2, memory: 4 }
  });
  
  await negotiationProtocol.submitBid(bidding.taskId, 'developer', 'agent2', {
    confidence: 0.8,
    estimatedTime: 180,
    resources: { cpu: 3, memory: 8 }
  });
  
  await negotiationProtocol.submitBid(bidding.taskId, 'tester', 'agent3', {
    confidence: 0.7,
    estimatedTime: 90,
    resources: { cpu: 1, memory: 2 }
  });
  
  console.log('Submitted bids for all roles');
  
  // Form team from bidding
  const result = await orchestratorAgent.formTeamFromBidding(bidding.taskId);
  
  console.log(`Team formed from bidding: ${result.team.id}`);
  console.assert(result.team.members.length === 3, 'Team should have 3 members');
  console.assert(result.task.status === 'in-progress', 'Task should be in progress');
  
  return result;
}

/**
 * Test team communication
 */
async function testTeamCommunication(components) {
  console.log('\n--- Testing Team Communication ---');
  
  const { agentCommunication, teamRegistry } = components;
  
  // Get the first team
  const teams = teamRegistry.listTeams();
  const team = teams[0];
  
  // Set up message handlers for testing
  let messageReceived = false;
  const originalHandleAgentMessage = agentCommunication._handleAgentMessage;
  
  agentCommunication._handleAgentMessage = (agentId, message) => {
    if (message.teamId === team.id && message.content.action === 'team.broadcast') {
      console.log(`Agent ${agentId} received team broadcast: ${message.content.params.message}`);
      messageReceived = true;
    }
    
    // Call original handler
    originalHandleAgentMessage.call(agentCommunication, agentId, message);
  };
  
  // Broadcast message to team
  await agentCommunication.broadcastToTeam('agent1', team.id, 'Hello team!', 5);
  
  // Wait a bit for message processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.assert(messageReceived, 'Team broadcast message should be received');
  
  // Restore original handler
  agentCommunication._handleAgentMessage = originalHandleAgentMessage;
  
  return messageReceived;
}

/**
 * Test collective decision making
 */
async function testCollectiveDecisionMaking(components) {
  console.log('\n--- Testing Collective Decision Making ---');
  
  const { collectiveIntelligence } = components;
  
  // Create a vote
  const vote = await collectiveIntelligence.createVote({
    topic: 'Test Decision',
    description: 'A test decision for CMAOS',
    options: ['Option A', 'Option B', 'Option C'],
    method: 'majority',
    participants: ['agent1', 'agent2', 'agent3']
  });
  
  console.log(`Vote created: ${vote.id} - ${vote.topic}`);
  
  // Cast votes
  await collectiveIntelligence.castVote(vote.id, 'agent1', 'Option A', 0.9);
  await collectiveIntelligence.castVote(vote.id, 'agent2', 'Option A', 0.7);
  await collectiveIntelligence.castVote(vote.id, 'agent3', 'Option B', 0.8);
  
  console.log('All agents have voted');
  
  // Get vote result
  const result = collectiveIntelligence.getVoteResult(vote.id);
  
  console.log(`Vote result: ${result.winner}`);
  console.assert(result.winner === 'Option A', 'Option A should win the vote');
  console.assert(result.method === 'majority', 'Voting method should be majority');
  
  return result;
}

/**
 * Test workflow execution
 */
async function testWorkflowExecution(components) {
  console.log('\n--- Testing Workflow Execution ---');
  
  const { collaborationManager } = components;
  
  // Get the first task
  const tasks = Array.from(collaborationManager.tasks.values());
  const task = tasks.find(t => t.status === 'in-progress' && t.workflow.length > 0);
  
  if (!task) {
    console.log('No suitable task found for workflow testing');
    return null;
  }
  
  console.log(`Testing workflow for task: ${task.id} - ${task.name}`);
  
  // Complete step 1
  await collaborationManager.completeStep(task.id, 'step1', {
    summary: 'Planning completed',
    details: 'The plan has been created and is ready for analysis'
  });
  
  console.log('Completed step 1');
  
  // Check task progress
  let progress = collaborationManager.getTaskProgress(task.id);
  console.log(`Task progress: ${progress.progressPercentage.toFixed(2)}%`);
  console.assert(progress.completedSteps.includes('step1'), 'Step 1 should be completed');
  console.assert(progress.currentSteps.includes('step2'), 'Step 2 should now be current');
  
  // Complete step 2
  await collaborationManager.completeStep(task.id, 'step2', {
    summary: 'Analysis completed',
    details: 'The requirements have been analyzed and are ready for execution'
  });
  
  console.log('Completed step 2');
  
  // Check task progress
  progress = collaborationManager.getTaskProgress(task.id);
  console.log(`Task progress: ${progress.progressPercentage.toFixed(2)}%`);
  console.assert(progress.completedSteps.includes('step2'), 'Step 2 should be completed');
  console.assert(progress.currentSteps.includes('step3'), 'Step 3 should now be current');
  
  // Complete step 3
  await collaborationManager.completeStep(task.id, 'step3', {
    summary: 'Execution completed',
    details: 'The plan has been executed successfully'
  });
  
  console.log('Completed step 3');
  
  // Check task progress
  progress = collaborationManager.getTaskProgress(task.id);
  console.log(`Task progress: ${progress.progressPercentage.toFixed(2)}%`);
  console.assert(progress.completedSteps.includes('step3'), 'Step 3 should be completed');
  console.assert(progress.progressPercentage === 100, 'Task should be 100% complete');
  
  // Get updated task
  const updatedTask = collaborationManager.getTask(task.id);
  console.assert(updatedTask.status === 'completed', 'Task should be completed');
  
  return updatedTask;
}

// Run the tests
runIntegrationTests();
