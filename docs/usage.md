# DevSparkAgent Playground Usage Guide

This guide provides detailed instructions on how to use the DevSparkAgent Playground for developing, testing, and evolving AI agents.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Agents](#creating-agents)
3. [Agent Communication](#agent-communication)
4. [Evolution and Learning](#evolution-and-learning)
5. [Performance Evaluation](#performance-evaluation)
6. [User Interface](#user-interface)
7. [Advanced Usage](#advanced-usage)

## Getting Started

### Installation

Before using the DevSparkAgent Playground, you need to install it:

```bash
# Clone the repository
git clone https://github.com/clownai/DevSparkAgentPlayground.git
cd DevSparkAgentPlayground

# Install dependencies
npm install

# Configure the playground
cp config/default.example.js config/default.js
# Edit config/default.js to match your environment

# Start the playground
npm start
```

### Basic Concepts

The DevSparkAgent Playground is built around these core concepts:

- **Agents**: Autonomous entities that can execute code, communicate with other agents, and interact with the environment
- **Containers**: Isolated environments where agents run
- **Messages**: Communication units between agents
- **Resources**: Environmental elements that agents can interact with
- **Populations**: Groups of agents that can evolve together
- **Models**: Learning models that agents can use to improve their behavior

## Creating Agents

### Simple Agent Creation

To create a simple agent:

```javascript
const { RuntimeEnvironment } = require('devsparkagent-playground');

// Initialize the runtime environment
const runtime = new RuntimeEnvironment();
await runtime.initialize();

// Create a container for the agent
const containerId = 'agent1-container';
await runtime.createContainer(containerId);

// Define agent code
const agentCode = `
  function processMessage(message) {
    return { response: 'Hello, ' + message.sender };
  }
  
  module.exports = { processMessage };
`;

// Execute the agent code
const result = await runtime.executeCode(containerId, agentCode, 'javascript');
console.log(result);
```

### Agent with State

To create an agent that maintains state:

```javascript
const agentWithStateCode = `
  let messageCount = 0;
  
  function processMessage(message) {
    messageCount++;
    return { 
      response: 'Hello, ' + message.sender,
      messageCount: messageCount
    };
  }
  
  module.exports = { processMessage };
`;

await runtime.executeCode(containerId, agentWithStateCode, 'javascript');
```

### Agent with External Dependencies

To create an agent that uses external libraries:

```javascript
const agentWithDependenciesCode = `
  const _ = require('lodash');
  
  function processMessage(message) {
    const data = message.content.data || [];
    return { 
      response: 'Processed data',
      sum: _.sum(data),
      average: _.mean(data)
    };
  }
  
  module.exports = { processMessage };
`;

await runtime.executeCode(containerId, agentWithDependenciesCode, 'javascript');
```

## Agent Communication

### Setting Up Communication

To enable communication between agents:

```javascript
const { InteractionFramework, RuntimeEnvironment } = require('devsparkagent-playground');

// Initialize the runtime environment
const runtime = new RuntimeEnvironment();
await runtime.initialize();

// Initialize the interaction framework
const interaction = new InteractionFramework(runtime);
await interaction.initialize();

// Register agents
await interaction.registerAgent('agent1', { name: 'Agent 1' });
await interaction.registerAgent('agent2', { name: 'Agent 2' });
```

### Sending Messages

To send messages between agents:

```javascript
// Set up message handler for agent2
await interaction.onMessage('agent2', (message) => {
  console.log('Agent 2 received:', message);
  return { response: 'Message received by Agent 2' };
});

// Send a message from agent1 to agent2
const result = await interaction.sendMessage(
  'agent1',
  'agent2',
  'greeting',
  { text: 'Hello from Agent 1' }
);

console.log('Message sent:', result);
```

### Request-Response Pattern

To implement a request-response pattern:

```javascript
// Set up request handler for agent2
await interaction.onRequest('agent2', 'calculate', (request) => {
  const { a, b, operation } = request.content;
  let result;
  
  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      result = a / b;
      break;
    default:
      result = null;
  }
  
  return { result };
});

// Send a request from agent1 to agent2
const response = await interaction.sendRequest(
  'agent1',
  'agent2',
  'calculate',
  { a: 5, b: 3, operation: 'add' }
);

console.log('Calculation result:', response.result); // 8
```

### Broadcasting

To broadcast messages to all agents:

```javascript
// Set up broadcast handlers
await interaction.onBroadcast('agent1', (message) => {
  console.log('Agent 1 received broadcast:', message);
});

await interaction.onBroadcast('agent2', (message) => {
  console.log('Agent 2 received broadcast:', message);
});

// Broadcast a message
await interaction.broadcast(
  'system',
  'announcement',
  { text: 'Important system announcement' }
);
```

## Evolution and Learning

### Creating a Population

To create a population of agents:

```javascript
const { EvolutionSystem, InteractionFramework, RuntimeEnvironment } = require('devsparkagent-playground');

// Initialize the runtime environment
const runtime = new RuntimeEnvironment();
await runtime.initialize();

// Initialize the interaction framework
const interaction = new InteractionFramework(runtime);
await interaction.initialize();

// Initialize the evolution system
const evolution = new EvolutionSystem(interaction);
await evolution.initialize();

// Create a population
await evolution.createPopulation('population1', {
  name: 'Test Population',
  description: 'A test population for evolution'
});
```

### Adding Agents to a Population

To add agents to a population:

```javascript
// Create agents
const agent1 = {
  id: 'agent1',
  genome: Array.from({ length: 50 }, () => Math.random()),
  fitness: 0,
  metadata: {
    created: new Date(),
    type: 'test'
  }
};

const agent2 = {
  id: 'agent2',
  genome: Array.from({ length: 50 }, () => Math.random()),
  fitness: 0,
  metadata: {
    created: new Date(),
    type: 'test'
  }
};

// Register agents
await evolution.registerAgent('agent1', agent1);
await evolution.registerAgent('agent2', agent2);

// Add agents to population
await evolution.addAgentToPopulation('population1', 'agent1');
await evolution.addAgentToPopulation('population1', 'agent2');
```

### Evolving a Population

To evolve a population:

```javascript
// Define fitness function
const fitnessFunction = async (agent) => {
  // In a real scenario, this would evaluate the agent's performance
  // For this example, we'll use a simple function based on the genome
  return agent.genome.reduce((sum, gene) => sum + gene, 0);
};

// Evolve the population
const evolutionResult = await evolution.evolvePopulation('population1', {
  generations: 10,
  fitnessFunction,
  selectionMethod: 'tournament',
  crossoverMethod: 'uniform',
  mutationRate: 0.01,
  elitismRate: 0.1
});

console.log('Evolution result:', evolutionResult);
console.log('Best fitness:', evolutionResult.bestFitness);
console.log('Best agent ID:', evolutionResult.bestAgentId);
```

### Creating and Training Learning Models

To create and train learning models:

```javascript
// Create a reinforcement learning model
const modelId = 'rl-model-1';
await evolution.learningMechanisms.createModel(modelId, 'reinforcement', {
  stateSize: 5,
  actionSize: 3,
  learningRate: 0.1,
  discountFactor: 0.9,
  explorationRate: 0.1
});

// Train the model
const trainingResult = await evolution.learningMechanisms.trainModel(modelId, {
  state: [0.1, 0.2, 0.3, 0.4, 0.5],
  action: 1,
  reward: 0.5,
  nextState: [0.2, 0.3, 0.4, 0.5, 0.6]
});

console.log('Training result:', trainingResult);

// Make a prediction
const state = [0.1, 0.2, 0.3, 0.4, 0.5];
const prediction = await evolution.learningMechanisms.predict(modelId, state);
console.log('Prediction:', prediction);
```

## Performance Evaluation

### Tracking Performance

To track agent performance:

```javascript
// Track performance for an agent
await evolution.trackPerformance('agent1', 'accuracy', 0.85, {
  timestamp: new Date(),
  context: 'test-scenario-1'
});

await evolution.trackPerformance('agent1', 'responseTime', 150, {
  timestamp: new Date(),
  context: 'test-scenario-1'
});

// Get performance metrics for an agent
const performance = evolution.getAgentPerformance('agent1');
console.log('Agent performance:', performance);

// Get specific metric
const accuracyPerformance = evolution.getAgentPerformance('agent1', 'accuracy');
console.log('Accuracy performance:', accuracyPerformance);
```

### Creating and Running Benchmarks

To create and run benchmarks:

```javascript
// Register a benchmark
await evolution.performanceTracking.registerBenchmark('benchmark1', {
  name: 'Basic Operations Benchmark',
  description: 'Tests basic agent operations',
  tasks: [
    { 
      id: 'task1', 
      name: 'Addition', 
      description: 'Test addition operation',
      input: { a: 5, b: 3 },
      expectedOutput: { result: 8 }
    },
    { 
      id: 'task2', 
      name: 'Multiplication', 
      description: 'Test multiplication operation',
      input: { a: 4, b: 7 },
      expectedOutput: { result: 28 }
    }
  ]
});

// Run the benchmark
const benchmarkResult = await evolution.performanceTracking.runBenchmark('agent1', 'benchmark1', {
  taskResults: {
    task1: {
      success: true,
      responseTime: 100,
      output: { result: 8 }
    },
    task2: {
      success: true,
      responseTime: 120,
      output: { result: 28 }
    }
  }
});

console.log('Benchmark result:', benchmarkResult);
```

### Comparing Agents

To compare agent performance:

```javascript
// Track performance for multiple agents
await evolution.trackPerformance('agent1', 'accuracy', 0.85);
await evolution.trackPerformance('agent2', 'accuracy', 0.75);

// Compare agents
const comparison = evolution.performanceTracking.compareAgentPerformance(['agent1', 'agent2'], 'accuracy');
console.log('Agent comparison:', comparison);
```

## User Interface

### Initializing the UI

To initialize the UI:

```javascript
const { PlaygroundUI, RuntimeEnvironment, InteractionFramework, EvolutionSystem } = require('devsparkagent-playground');

// Initialize the runtime environment
const runtime = new RuntimeEnvironment();
await runtime.initialize();

// Initialize the interaction framework
const interaction = new InteractionFramework(runtime);
await interaction.initialize();

// Initialize the evolution system
const evolution = new EvolutionSystem(interaction);
await evolution.initialize();

// Initialize the UI
const ui = new PlaygroundUI(runtime, interaction, evolution);
await ui.initialize();

// Render the UI
const container = document.getElementById('playground-container');
await ui.render(container);
```

### Registering UI Components

To register custom UI components:

```javascript
// Create a custom component
const customComponent = {
  render: async (container) => {
    container.innerHTML = '<div class="custom-component">Custom Component</div>';
  },
  update: async (data) => {
    // Update component with new data
  }
};

// Register the component
await ui.registerComponent('customComponent', customComponent);
```

### Handling UI Events

To handle UI events:

```javascript
// Register event handler
await ui.registerEventHandler('agent-selected', (data) => {
  console.log('Agent selected:', data.agentId);
  // Perform actions when an agent is selected
});

// Trigger an event
await ui.triggerEvent('agent-selected', { agentId: 'agent1' });
```

### Showing Dialogs and Notifications

To show dialogs and notifications:

```javascript
// Show a dialog
const dialogResult = await ui.showDialog(
  'Confirm Action',
  'Are you sure you want to delete this agent?',
  [
    { id: 'cancel', label: 'Cancel' },
    { id: 'confirm', label: 'Confirm' }
  ]
);

if (dialogResult === 'confirm') {
  // Perform deletion
  console.log('User confirmed deletion');
}

// Show a notification
await ui.showNotification('Agent created successfully', 'success', 3000);
```

## Advanced Usage

### Custom Agent Templates

To create custom agent templates:

```javascript
// Define a template
const agentTemplate = `
  class Agent {
    constructor() {
      this.state = {
        memory: {},
        counter: 0
      };
    }
    
    processMessage(message) {
      this.state.counter++;
      
      if (message.type === 'store') {
        const { key, value } = message.content;
        this.state.memory[key] = value;
        return { success: true, key, value };
      }
      
      if (message.type === 'retrieve') {
        const { key } = message.content;
        const value = this.state.memory[key];
        return { success: true, key, value };
      }
      
      return { 
        success: false, 
        error: 'Unknown message type',
        counter: this.state.counter
      };
    }
  }
  
  const agent = new Agent();
  module.exports = {
    processMessage: (message) => agent.processMessage(message)
  };
`;

// Create an agent from the template
const containerId = 'template-agent-container';
await runtime.createContainer(containerId);
await runtime.executeCode(containerId, agentTemplate, 'javascript');
```

### Agent Collaboration

To implement agent collaboration:

```javascript
// Create a team of agents
const agents = ['agent1', 'agent2', 'agent3'];

// Register all agents
for (const agentId of agents) {
  await interaction.registerAgent(agentId, { name: `Agent ${agentId.slice(-1)}` });
  
  // Set up message handlers
  await interaction.onMessage(agentId, (message) => {
    console.log(`${agentId} received:`, message);
    return { response: `Processed by ${agentId}` };
  });
}

// Implement a round-robin collaboration
async function collaborativeSolve(problem) {
  let currentState = problem;
  const results = [];
  
  for (const agentId of agents) {
    // Each agent processes the current state
    const response = await interaction.sendRequest(
      'system',
      agentId,
      'process',
      { state: currentState }
    );
    
    // Update the current state with the agent's response
    currentState = response.newState;
    results.push({
      agentId,
      result: response
    });
  }
  
  return {
    finalState: currentState,
    steps: results
  };
}

// Use the collaborative solving function
const problem = { data: [1, 2, 3, 4, 5], operation: 'analyze' };
const solution = await collaborativeSolve(problem);
console.log('Collaborative solution:', solution);
```

### Custom Evolution Strategies

To implement custom evolution strategies:

```javascript
// Define a custom selection method
evolution.geneticAlgorithm.customSelectionMethods = {
  ...evolution.geneticAlgorithm.customSelectionMethods,
  weightedRandom: (population, count) => {
    const totalFitness = population.reduce((sum, individual) => sum + individual.fitness, 0);
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      let value = Math.random() * totalFitness;
      let runningSum = 0;
      
      for (const individual of population) {
        runningSum += individual.fitness;
        if (runningSum >= value) {
          selected.push(individual);
          break;
        }
      }
    }
    
    return selected;
  }
};

// Use the custom selection method
const evolutionResult = await evolution.evolvePopulation('population1', {
  generations: 10,
  fitnessFunction,
  selectionMethod: 'weightedRandom',
  crossoverMethod: 'uniform',
  mutationRate: 0.01,
  elitismRate: 0.1
});
```

### Persistent Agents

To create persistent agents that save their state:

```javascript
// Define agent code with persistence
const persistentAgentCode = `
  const fs = require('fs');
  const path = require('path');
  
  class PersistentAgent {
    constructor(id) {
      this.id = id;
      this.statePath = path.join('/tmp', \`agent-\${id}-state.json\`);
      this.state = this.loadState() || {
        memory: {},
        counter: 0
      };
    }
    
    loadState() {
      try {
        if (fs.existsSync(this.statePath)) {
          const data = fs.readFileSync(this.statePath, 'utf8');
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Error loading state:', error);
      }
      return null;
    }
    
    saveState() {
      try {
        fs.writeFileSync(this.statePath, JSON.stringify(this.state), 'utf8');
      } catch (error) {
        console.error('Error saving state:', error);
      }
    }
    
    processMessage(message) {
      this.state.counter++;
      
      // Process message...
      
      // Save state after processing
      this.saveState();
      
      return { success: true, counter: this.state.counter };
    }
  }
  
  const agent = new PersistentAgent('agent-123');
  
  module.exports = {
    processMessage: (message) => agent.processMessage(message)
  };
`;

// Create a persistent agent
const containerId = 'persistent-agent-container';
await runtime.createContainer(containerId, {
  filesystem: true  // Allow filesystem access
});
await runtime.executeCode(containerId, persistentAgentCode, 'javascript');
```

This comprehensive usage guide should help users get started with the DevSparkAgent Playground and explore its capabilities for developing, testing, and evolving AI agents.
