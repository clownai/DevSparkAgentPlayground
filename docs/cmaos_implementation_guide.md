# CMAOS Implementation Guide

This guide provides instructions for integrating the Collaborative Multi-Agent Orchestration System (CMAOS) into your existing DevSparkAgentPlayground implementation.

## Prerequisites

- DevSparkAgentPlayground framework installed
- Node.js 14.x or higher
- Basic understanding of multi-agent systems

## Installation

1. Copy the CMAOS components to your DevSparkAgentPlayground installation:

```bash
# Create the CMAOS directory structure
mkdir -p /path/to/DevSparkAgentPlayground/src/interaction/cmaos

# Copy the core components
cp TeamRegistry.js CollectiveIntelligence.js NegotiationProtocol.js CollaborationManager.js OrchestratorAgent.js /path/to/DevSparkAgentPlayground/src/interaction/cmaos/

# Copy the extended communication components
cp MessageProtocolExtended.js MessageBrokerExtended.js AgentCommunicationExtended.js /path/to/DevSparkAgentPlayground/src/interaction/cmaos/
```

2. Update your package.json to include any new dependencies:

```json
{
  "dependencies": {
    "uuid": "^8.3.2",
    "events": "^3.3.0"
  }
}
```

3. Install dependencies:

```bash
npm install
```

## Integration Steps

### 1. Initialize CMAOS Components

```javascript
// Import CMAOS components
const TeamRegistry = require('./src/interaction/cmaos/TeamRegistry');
const CollectiveIntelligence = require('./src/interaction/cmaos/CollectiveIntelligence');
const NegotiationProtocol = require('./src/interaction/cmaos/NegotiationProtocol');
const CollaborationManager = require('./src/interaction/cmaos/CollaborationManager');
const OrchestratorAgent = require('./src/interaction/cmaos/OrchestratorAgent');
const MessageProtocolExtended = require('./src/interaction/cmaos/MessageProtocolExtended');
const MessageBrokerExtended = require('./src/interaction/cmaos/MessageBrokerExtended');
const AgentCommunicationExtended = require('./src/interaction/cmaos/AgentCommunicationExtended');

// Create logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

// Initialize components
async function initializeCMAOS() {
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
```

### 2. Integrate with Existing Agents

To integrate existing agents with CMAOS:

```javascript
// Register existing agent with CMAOS
async function registerExistingAgent(agentId, cmaos) {
  const { agentCommunication } = cmaos;
  
  // Get agent capabilities
  const capabilities = {
    planning: 0.8,
    analysis: 0.7,
    execution: 0.9
    // Add more capabilities as needed
  };
  
  // Register agent
  await agentCommunication.registerAgent(agentId, {
    name: `Agent ${agentId}`,
    description: 'An existing agent integrated with CMAOS'
  }, capabilities);
  
  console.log(`Agent ${agentId} registered with CMAOS`);
}
```

### 3. Create Teams and Assign Roles

```javascript
// Create a team and assign roles
async function createTeamWithRoles(cmaos) {
  const { orchestratorAgent } = cmaos;
  
  // Create team
  const team = await orchestratorAgent.formTeam({
    name: 'Integration Team',
    description: 'A team for testing CMAOS integration',
    roles: [
      { id: 'coordinator', name: 'Coordinator', requiredCapabilities: ['planning'] },
      { id: 'analyst', name: 'Analyst', requiredCapabilities: ['analysis'] },
      { id: 'executor', name: 'Executor', requiredCapabilities: ['execution'] }
    ]
  });
  
  // Assign roles
  await orchestratorAgent.assignTeamRoles(team.id, [
    { agentId: 'agent1', roleId: 'coordinator' },
    { agentId: 'agent2', roleId: 'analyst' },
    { agentId: 'agent3', roleId: 'executor' }
  ]);
  
  console.log(`Team created with ID: ${team.id}`);
  return team;
}
```

### 4. Create and Execute Tasks

```javascript
// Create and execute a task
async function createAndExecuteTask(teamId, cmaos) {
  const { orchestratorAgent } = cmaos;
  
  // Create task
  const task = await orchestratorAgent.createTeamTask(teamId, {
    name: 'Integration Task',
    description: 'A task for testing CMAOS integration',
    workflow: [
      {
        id: 'step1',
        name: 'Planning Step',
        roles: ['coordinator'],
        dependencies: []
      },
      {
        id: 'step2',
        name: 'Analysis Step',
        roles: ['analyst'],
        dependencies: ['step1']
      },
      {
        id: 'step3',
        name: 'Execution Step',
        roles: ['executor'],
        dependencies: ['step2']
      }
    ]
  });
  
  console.log(`Task created with ID: ${task.id}`);
  return task;
}
```

### 5. Monitor Task Progress

```javascript
// Monitor task progress
async function monitorTaskProgress(taskId, cmaos) {
  const { orchestratorAgent } = cmaos;
  
  // Get task progress
  const progress = await orchestratorAgent.monitorTaskProgress(taskId);
  
  console.log(`Task progress: ${progress.progressPercentage.toFixed(2)}%`);
  console.log(`Completed steps: ${Object.keys(progress.completedSteps).join(', ')}`);
  console.log(`Current steps: ${progress.currentSteps.join(', ')}`);
  
  return progress;
}
```

## Example Usage

Here's a complete example of using CMAOS in your application:

```javascript
const cmaosComponents = require('./cmaos-components');

async function main() {
  // Initialize CMAOS
  const cmaos = await cmaosComponents.initializeCMAOS();
  
  // Register existing agents
  await registerExistingAgent('agent1', cmaos);
  await registerExistingAgent('agent2', cmaos);
  await registerExistingAgent('agent3', cmaos);
  
  // Create team and assign roles
  const team = await createTeamWithRoles(cmaos);
  
  // Create and execute task
  const task = await createAndExecuteTask(team.id, cmaos);
  
  // Monitor task progress (in a real application, this would be called periodically)
  await monitorTaskProgress(task.id, cmaos);
  
  console.log('CMAOS integration complete');
}

main().catch(console.error);
```

## Troubleshooting

### Common Issues

1. **Component Initialization Failures**
   - Check that all dependencies are installed
   - Verify that the logger is properly configured
   - Ensure all components are initialized in the correct order

2. **Message Routing Issues**
   - Verify that the team registry is set in the message broker
   - Check that agents are properly registered and subscribed to topics
   - Ensure message formats are correct

3. **Task Execution Problems**
   - Verify that all roles are assigned to agents
   - Check that workflow dependencies are correctly defined
   - Ensure agents have the required capabilities for their roles

### Logging

Enable detailed logging for troubleshooting:

```javascript
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`), // Set to noop in production
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};
```

## Next Steps

After integrating CMAOS, consider these next steps:

1. **Create Custom Team Templates**: Define reusable team structures for common tasks
2. **Implement Advanced Bidding Strategies**: Customize the bidding process for your specific needs
3. **Extend Voting Mechanisms**: Add domain-specific voting strategies
4. **Develop Performance Metrics**: Track and analyze team and agent performance
5. **Create Visualization Tools**: Build tools to visualize team structures and task progress

## Support

For issues or questions about CMAOS integration, please refer to the full documentation or contact the DevSparkAgentPlayground support team.
