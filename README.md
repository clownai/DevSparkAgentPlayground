# DevSparkAgent Playground

A comprehensive playground for developing, testing, and evolving AI agents within the DevSpark ecosystem.

## Overview

DevSparkAgent Playground is a powerful environment for creating, training, and evaluating AI agents. It provides a secure, isolated runtime environment, robust communication framework, advanced evolution mechanisms, and an intuitive user interface.

The playground enables developers to:
- Create and deploy AI agents in isolated containers
- Facilitate communication between agents and with the environment
- Evolve agents through genetic algorithms and other learning mechanisms
- Evaluate agent performance through comprehensive benchmarking
- Visualize agent behavior and performance metrics

## Architecture

The DevSparkAgent Playground consists of five core components:

1. **Agent Runtime Environment**: Provides secure, isolated environments for agent execution
2. **Agent Interaction Framework**: Enables communication between agents and with the environment
3. **Evolution Mechanisms**: Facilitates agent learning and evolution over time
4. **Evaluation System**: Measures and compares agent performance
5. **User Interface**: Provides visual interface for interacting with the playground

### Agent Runtime Environment

The Runtime Environment provides secure, isolated execution environments for agents using Docker containers. It includes:

- **ContainerManager**: Handles Docker container lifecycle management
- **ExecutionEngine**: Manages code execution within containers
- **SecurityManager**: Enforces security policies and monitors for violations
- **ResourceMonitor**: Tracks and limits resource usage by agent containers

### Agent Interaction Framework

The Interaction Framework enables communication between agents and with the environment. It includes:

- **MessageProtocol**: Defines the message format and protocol for agent communication
- **MessageBroker**: Handles message routing and delivery between agents
- **AgentCommunication**: Manages communication between agents
- **EnvironmentInteraction**: Handles interaction between agents and the environment

### Evolution Mechanisms

The Evolution Mechanisms enable agents to learn and evolve over time. It includes:

- **GeneticAlgorithm**: Provides functionality for population evolution
- **LearningMechanisms**: Implements various learning models
- **AgentEvolution**: Manages the evolution of agents over time
- **PerformanceTracking**: Tracks and analyzes agent performance

### User Interface

The User Interface provides a visual interface for interacting with the playground. It includes:

- **PlaygroundUI**: Main UI component that integrates with all other components
- **Visualization Tools**: Visualize agent behavior and performance metrics
- **Experiment Management**: Manage and track experiments

## Installation

### Prerequisites

- Node.js 14+
- Docker
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/clownai/DevSparkAgentPlayground.git
cd DevSparkAgentPlayground
```

2. Install dependencies:
```bash
npm install
```

3. Configure the playground:
```bash
cp config/default.example.js config/default.js
# Edit config/default.js to match your environment
```

4. Start the playground:
```bash
npm start
```

## Usage

### Creating an Agent

```javascript
const { AgentRuntime } = require('devsparkagent-playground');

// Create a new agent
const agent = await AgentRuntime.createAgent({
  name: 'MyAgent',
  description: 'A simple test agent',
  code: `
    // Agent code goes here
    function onMessage(message) {
      return { response: 'Hello, ' + message.sender };
    }
  `
});
```

### Running an Agent

```javascript
// Start the agent
await agent.start();

// Send a message to the agent
const response = await agent.sendMessage({
  type: 'greeting',
  content: { text: 'Hello!' }
});

console.log(response); // { response: 'Hello, system' }

// Stop the agent
await agent.stop();
```

### Evolving Agents

```javascript
const { EvolutionSystem } = require('devsparkagent-playground');

// Create a population of agents
const population = await EvolutionSystem.createPopulation({
  name: 'TestPopulation',
  size: 10,
  template: `
    // Agent template code
    function process(input) {
      // Processing logic
      return input * 2;
    }
  `
});

// Define fitness function
const fitnessFunction = async (agent) => {
  const result = await agent.evaluate([1, 2, 3, 4, 5]);
  return result.reduce((sum, val) => sum + val, 0);
};

// Evolve the population
const evolvedPopulation = await EvolutionSystem.evolvePopulation(population, {
  generations: 10,
  fitnessFunction,
  selectionMethod: 'tournament',
  crossoverMethod: 'uniform',
  mutationRate: 0.01
});

// Get the best agent
const bestAgent = evolvedPopulation.getBestAgent();
```

## API Reference

### Agent Runtime Environment

#### ContainerManager

- `createContainer(containerId, options)`: Creates a new container
- `removeContainer(containerId)`: Removes a container
- `startContainer(containerId)`: Starts a container
- `stopContainer(containerId)`: Stops a container
- `listContainers()`: Lists all containers

#### ExecutionEngine

- `executeCode(containerId, code, language, timeout)`: Executes code in a container
- `getExecutionResult(executionId)`: Gets the result of an execution
- `listExecutions(containerId)`: Lists all executions for a container

#### SecurityManager

- `setSecurityPolicy(containerId, policy)`: Sets security policy for a container
- `getSecurityPolicy(containerId)`: Gets security policy for a container
- `checkCodeSecurity(code, language)`: Checks if code is secure

#### ResourceMonitor

- `getResourceUsage(containerId)`: Gets resource usage for a container
- `setResourceLimits(containerId, limits)`: Sets resource limits for a container
- `checkResourceLimits(containerId, resources)`: Checks if resources are within limits

### Agent Interaction Framework

#### MessageProtocol

- `createMessage(sender, recipient, type, content)`: Creates a new message
- `validateMessage(message)`: Validates a message
- `serializeMessage(message)`: Serializes a message
- `deserializeMessage(serialized)`: Deserializes a message

#### MessageBroker

- `publishMessage(message)`: Publishes a message
- `subscribe(recipient, callback)`: Subscribes to messages
- `unsubscribe(subscriptionId)`: Unsubscribes from messages
- `publishToTopic(topic, message)`: Publishes a message to a topic
- `subscribeTopic(topic, callback)`: Subscribes to a topic
- `unsubscribeTopic(subscriptionId)`: Unsubscribes from a topic

#### AgentCommunication

- `registerAgent(agentId, info)`: Registers an agent
- `unregisterAgent(agentId)`: Unregisters an agent
- `sendMessage(sender, recipient, type, content)`: Sends a message
- `sendRequest(sender, recipient, type, content)`: Sends a request and waits for response
- `broadcast(sender, type, content)`: Broadcasts a message to all agents
- `onMessage(agentId, callback)`: Registers a message handler
- `onRequest(agentId, type, callback)`: Registers a request handler
- `onBroadcast(agentId, callback)`: Registers a broadcast handler

#### EnvironmentInteraction

- `registerResource(resourceId, info)`: Registers a resource
- `unregisterResource(resourceId)`: Unregisters a resource
- `getResource(resourceId)`: Gets a resource
- `listResources()`: Lists all resources
- `setEnvironmentVariable(name, value)`: Sets an environment variable
- `getEnvironmentVariable(name)`: Gets an environment variable
- `getAllEnvironmentVariables()`: Gets all environment variables

### Evolution Mechanisms

#### GeneticAlgorithm

- `initializePopulation(size, genomeSize)`: Initializes a population
- `evaluatePopulation(population, fitnessFunction)`: Evaluates a population
- `selectParents(population, count, method)`: Selects parents for reproduction
- `crossover(parents, method)`: Performs crossover between parents
- `mutate(offspring, rate, amount)`: Mutates offspring
- `selectSurvivors(population, offspring, size, elitismRate)`: Selects survivors for next generation
- `evolve(options)`: Evolves a population

#### LearningMechanisms

- `createModel(id, type, options)`: Creates a learning model
- `trainModel(modelId, data)`: Trains a model
- `predict(modelId, input)`: Makes a prediction using a model
- `deleteModel(modelId)`: Deletes a model
- `listModels()`: Lists all models

#### AgentEvolution

- `registerAgent(agentId, agent)`: Registers an agent
- `unregisterAgent(agentId)`: Unregisters an agent
- `createPopulation(populationId, options)`: Creates a population
- `deletePopulation(populationId)`: Deletes a population
- `addAgentToPopulation(populationId, agentId)`: Adds an agent to a population
- `removeAgentFromPopulation(populationId, agentId)`: Removes an agent from a population
- `evolvePopulation(populationId, options)`: Evolves a population
- `listAgents()`: Lists all agents
- `listPopulations()`: Lists all populations
- `getAgentInfo(agentId)`: Gets information about an agent
- `getPopulationInfo(populationId)`: Gets information about a population

#### PerformanceTracking

- `trackPerformance(agentId, metricId, value, metadata)`: Tracks agent performance
- `getAgentPerformance(agentId, metricId)`: Gets agent performance
- `registerBenchmark(benchmarkId, benchmark)`: Registers a benchmark
- `unregisterBenchmark(benchmarkId)`: Unregisters a benchmark
- `runBenchmark(agentId, benchmarkId, options)`: Runs a benchmark
- `getBenchmarkResults(agentId, benchmarkId)`: Gets benchmark results
- `compareAgentPerformance(agentIds, metricId)`: Compares agent performance
- `listBenchmarks()`: Lists all benchmarks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- DevSpark Team for the DevSpark ecosystem
- Docker for container technology
- Node.js community for the runtime environment
