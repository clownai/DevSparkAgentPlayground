/**
 * Integration tests for DevSparkAgent Playground
 * 
 * Tests the integration between all components of the playground.
 */

// Import required modules
const RuntimeEnvironment = require('../src/runtime/RuntimeEnvironment');
const InteractionFramework = require('../src/interaction/InteractionFramework');
const EvolutionSystem = require('../src/evolution/EvolutionSystem');
const PlaygroundUI = require('../src/ui/PlaygroundUI');

// Test configuration
const config = {
  version: '1.0.0-test',
  runtime: {
    containerOptions: {
      memoryLimit: '256m',
      cpuLimit: '0.5',
      timeoutSeconds: 30
    },
    securityOptions: {
      allowNetwork: true,
      allowFileSystem: true,
      allowSubprocesses: false
    }
  },
  interaction: {
    communication: {
      requestTimeout: 5000,
      maxQueueSize: 100
    },
    broker: {
      maxQueueSize: 100
    }
  },
  evolution: {
    populationSize: 20,
    genomeSize: 50,
    selectionMethod: 'tournament',
    tournamentSize: 3,
    crossoverMethod: 'uniform',
    mutationRate: 0.01,
    mutationAmount: 0.1,
    elitismRate: 0.1,
    defaultPopulationOptions: {
      generations: 5,
      populationSize: 10,
      selectionMethod: 'tournament',
      crossoverMethod: 'uniform',
      mutationRate: 0.01,
      elitismRate: 0.1
    }
  },
  learning: {
    reinforcement: {
      learningRate: 0.1,
      discountFactor: 0.9,
      explorationRate: 0.1
    },
    neuralnetwork: {
      learningRate: 0.01
    }
  },
  performance: {
    maxRecordsPerMetric: 100,
    maxRecordsPerBenchmark: 10
  }
};

// Test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Test utilities
function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log(`✅ PASS: ${message}`);
    return true;
  } else {
    testResults.failed++;
    console.error(`❌ FAIL: ${message}`);
    return false;
  }
}

function skip(message) {
  testResults.total++;
  testResults.skipped++;
  console.warn(`⚠️ SKIP: ${message}`);
}

// Test cases
async function testRuntimeEnvironment() {
  console.log('\n--- Testing Runtime Environment ---');
  
  try {
    // Initialize runtime environment
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    assert(runtimeEnvironment.initialized, 'Runtime environment should be initialized');
    
    // Test container management
    const containerId = 'test-container';
    const containerCreated = await runtimeEnvironment.containerManager.createContainer(containerId);
    assert(containerCreated, 'Container should be created');
    
    const containerExists = await runtimeEnvironment.containerManager.containerExists(containerId);
    assert(containerExists, 'Container should exist after creation');
    
    const containerStatus = await runtimeEnvironment.containerManager.getContainerStatus(containerId);
    assert(containerStatus.id === containerId, 'Container status should have correct ID');
    
    // Test code execution
    const code = 'console.log("Hello, world!");';
    const result = await runtimeEnvironment.executeCode(containerId, code, 'javascript');
    assert(result.success, 'Code execution should succeed');
    
    // Test resource monitoring
    const resources = await runtimeEnvironment.monitorResources(containerId);
    assert(resources.containerId === containerId, 'Resource monitoring should return correct container ID');
    assert(typeof resources.memoryUsage === 'number', 'Memory usage should be a number');
    assert(typeof resources.cpuUsage === 'number', 'CPU usage should be a number');
    
    // Test container removal
    const containerRemoved = await runtimeEnvironment.containerManager.removeContainer(containerId);
    assert(containerRemoved, 'Container should be removed');
    
    const containerExistsAfterRemoval = await runtimeEnvironment.containerManager.containerExists(containerId);
    assert(!containerExistsAfterRemoval, 'Container should not exist after removal');
    
    return true;
  } catch (error) {
    console.error('Error in Runtime Environment tests:', error);
    assert(false, `Runtime Environment test failed with error: ${error.message}`);
    return false;
  }
}

async function testInteractionFramework() {
  console.log('\n--- Testing Interaction Framework ---');
  
  try {
    // Initialize runtime environment
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    // Initialize interaction framework
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    assert(interactionFramework.initialized, 'Interaction framework should be initialized');
    
    // Test message protocol
    const message = interactionFramework.messageProtocol.createMessage(
      'agent1',
      'agent2',
      'test',
      { data: 'test data' }
    );
    
    assert(message.sender === 'agent1', 'Message should have correct sender');
    assert(message.recipient === 'agent2', 'Message should have correct recipient');
    assert(message.type === 'test', 'Message should have correct type');
    assert(message.content.data === 'test data', 'Message should have correct content');
    
    // Test agent registration
    await interactionFramework.agentCommunication.registerAgent('agent1', { name: 'Agent 1' });
    await interactionFramework.agentCommunication.registerAgent('agent2', { name: 'Agent 2' });
    
    const agents = interactionFramework.agentCommunication.getAgents();
    assert(agents.length === 2, 'Two agents should be registered');
    assert(agents.some(agent => agent.id === 'agent1'), 'Agent 1 should be in the list');
    assert(agents.some(agent => agent.id === 'agent2'), 'Agent 2 should be in the list');
    
    // Test message broker
    let messageReceived = false;
    await interactionFramework.messageBroker.subscribe('agent2', 'agent2', (receivedMessage) => {
      messageReceived = receivedMessage.content.data === 'test data';
    });
    
    await interactionFramework.messageBroker.publishMessage(message);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(messageReceived, 'Message should be received by subscriber');
    
    // Test environment interaction
    await interactionFramework.environmentInteraction.registerResource('testResource', {
      type: 'test',
      name: 'Test Resource',
      description: 'A test resource'
    });
    
    const resources = interactionFramework.environmentInteraction.listResources();
    assert(resources.some(resource => resource.id === 'testResource'), 'Test resource should be in the list');
    
    const resource = interactionFramework.environmentInteraction.getResource('testResource');
    assert(resource.name === 'Test Resource', 'Resource should have correct name');
    
    // Test agent unregistration
    await interactionFramework.agentCommunication.unregisterAgent('agent1');
    await interactionFramework.agentCommunication.unregisterAgent('agent2');
    
    const agentsAfterUnregister = interactionFramework.agentCommunication.getAgents();
    assert(agentsAfterUnregister.length === 0, 'No agents should be registered after unregistration');
    
    return true;
  } catch (error) {
    console.error('Error in Interaction Framework tests:', error);
    assert(false, `Interaction Framework test failed with error: ${error.message}`);
    return false;
  }
}

async function testEvolutionSystem() {
  console.log('\n--- Testing Evolution System ---');
  
  try {
    // Initialize runtime environment
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    // Initialize interaction framework
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    // Initialize evolution system
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    assert(evolutionSystem.initialized, 'Evolution system should be initialized');
    
    // Test genetic algorithm
    await evolutionSystem.geneticAlgorithm.initialize();
    const evolveResult = await evolutionSystem.geneticAlgorithm.evolve();
    
    assert(evolveResult.generation === 1, 'Generation should be incremented after evolution');
    assert(typeof evolveResult.bestFitness === 'number', 'Best fitness should be a number');
    assert(typeof evolveResult.averageFitness === 'number', 'Average fitness should be a number');
    
    // Test learning mechanisms
    const models = evolutionSystem.learningMechanisms.listModels();
    assert(models.length > 0, 'Learning mechanisms should have default models');
    assert(models.some(model => model.id === 'reinforcement'), 'Reinforcement learning model should exist');
    
    // Test agent evolution
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
    
    await evolutionSystem.registerAgent('agent1', agent1);
    await evolutionSystem.registerAgent('agent2', agent2);
    
    const agents = evolutionSystem.listAgents();
    assert(agents.length === 2, 'Two agents should be registered');
    
    // Test population creation
    await evolutionSystem.createPopulation('testPopulation', {
      name: 'Test Population',
      description: 'A test population'
    });
    
    const populations = evolutionSystem.listPopulations();
    assert(populations.length === 2, 'Two populations should exist (default and test)');
    assert(populations.some(pop => pop.id === 'testPopulation'), 'Test population should be in the list');
    
    // Test adding agents to population
    await evolutionSystem.addAgentToPopulation('testPopulation', 'agent1');
    await evolutionSystem.addAgentToPopulation('testPopulation', 'agent2');
    
    const populationInfo = evolutionSystem.getPopulationInfo('testPopulation');
    assert(populationInfo.agentIds.length === 2, 'Population should have two agents');
    assert(populationInfo.agentIds.includes('agent1'), 'Agent 1 should be in the population');
    assert(populationInfo.agentIds.includes('agent2'), 'Agent 2 should be in the population');
    
    // Test population evolution
    const populationEvolveResult = await evolutionSystem.evolvePopulation('testPopulation', {
      generations: 2
    });
    
    assert(populationEvolveResult.generations === 2, 'Population should evolve for 2 generations');
    assert(typeof populationEvolveResult.bestFitness === 'number', 'Best fitness should be a number');
    
    // Test performance tracking
    await evolutionSystem.trackPerformance('agent1', 'accuracy', 0.85);
    await evolutionSystem.trackPerformance('agent1', 'responseTime', 150);
    
    const performance = evolutionSystem.getAgentPerformance('agent1');
    assert(performance.length === 2, 'Agent should have two performance records');
    
    // Test benchmarking
    const benchmarkResult = await evolutionSystem.runBenchmark('agent1', 'basic');
    assert(benchmarkResult.results.summary.tasksCompleted > 0, 'Benchmark should complete tasks');
    
    // Test agent comparison
    const comparison = evolutionSystem.compareAgentPerformance(['agent1', 'agent2'], 'accuracy');
    assert(comparison.metric === 'accuracy', 'Comparison should be for accuracy metric');
    assert('agent1' in comparison.agents, 'Agent 1 should be in comparison results');
    assert('agent2' in comparison.agents, 'Agent 2 should be in comparison results');
    
    // Test cleanup
    await evolutionSystem.unregisterAgent('agent1');
    await evolutionSystem.unregisterAgent('agent2');
    await evolutionSystem.deletePopulation('testPopulation');
    
    const agentsAfterCleanup = evolutionSystem.listAgents();
    assert(agentsAfterCleanup.length === 0, 'No agents should be registered after cleanup');
    
    const populationsAfterCleanup = evolutionSystem.listPopulations();
    assert(populationsAfterCleanup.length === 1, 'Only default population should exist after cleanup');
    assert(populationsAfterCleanup[0].id === 'default', 'Default population should still exist');
    
    return true;
  } catch (error) {
    console.error('Error in Evolution System tests:', error);
    assert(false, `Evolution System test failed with error: ${error.message}`);
    return false;
  }
}

async function testPlaygroundUI() {
  console.log('\n--- Testing Playground UI ---');
  
  try {
    // Since we can't test the UI directly without a browser environment,
    // we'll just test the initialization and component registration
    
    // Initialize runtime environment
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    // Initialize interaction framework
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    // Initialize evolution system
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Initialize UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    assert(playgroundUI.initialized, 'Playground UI should be initialized');
    
    // Test component registration
    const testComponent = {
      render: async () => {},
      update: async () => {}
    };
    
    await playgroundUI.registerComponent('testComponent', testComponent);
    assert(playgroundUI.components.has('testComponent'), 'Test component should be registered');
    
    // Test event handler registration
    let eventHandled = false;
    const testHandler = () => { eventHandled = true; };
    
    await playgroundUI.registerEventHandler('testEvent', testHandler);
    await playgroundUI.triggerEvent('testEvent');
    
    assert(eventHandled, 'Event handler should be called when event is triggered');
    
    // Test component unregistration
    await playgroundUI.unregisterComponent('testComponent');
    assert(!playgroundUI.components.has('testComponent'), 'Test component should be unregistered');
    
    // Test event handler unregistration
    eventHandled = false;
    await playgroundUI.unregisterEventHandler('testEvent', testHandler);
    await playgroundUI.triggerEvent('testEvent');
    
    assert(!eventHandled, 'Event handler should not be called after unregistration');
    
    return true;
  } catch (error) {
    console.error('Error in Playground UI tests:', error);
    assert(false, `Playground UI test failed with error: ${error.message}`);
    return false;
  }
}

async function testIntegration() {
  console.log('\n--- Testing Integration Between Components ---');
  
  try {
    // Initialize all components
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    assert(runtimeEnvironment.initialized, 'Runtime environment should be initialized');
    assert(interactionFramework.initialized, 'Interaction framework should be initialized');
    assert(evolutionSystem.initialized, 'Evolution system should be initialized');
    assert(playgroundUI.initialized, 'Playground UI should be initialized');
    
    // Test agent creation and evolution flow
    const agent = {
      id: 'test-agent',
      genome: Array.from({ length: 50 }, () => Math.random()),
      fitness: 0,
      metadata: {
        created: new Date(),
        type: 'test'
      }
    };
    
    // Register agent
    await evolutionSystem.registerAgent('test-agent', agent);
    
    // Create population
    await evolutionSystem.createPopulation('test-population', {
      name: 'Test Population',
      description: 'A test population for integration testing'
    });
    
    // Add agent to population
    await evolutionSystem.addAgentToPopulation('test-population', 'test-agent');
    
    // Evolve population
    const evolveResult = await evolutionSystem.evolvePopulation('test-population', {
      generations: 3
    });
    
    assert(evolveResult.generations === 3, 'Population should evolve for 3 generations');
    assert(typeof evolveResult.bestFitness === 'number', 'Best fitness should be a number');
    
    // Track performance
    await evolutionSystem.trackPerformance('test-agent', 'accuracy', 0.9);
    
    // Run benchmark
    const benchmarkResult = await evolutionSystem.runBenchmark('test-agent', 'basic');
    
    assert(benchmarkResult.results.summary.tasksCompleted > 0, 'Benchmark should complete tasks');
    
    // Test UI event handling
    let eventHandled = false;
    await playgroundUI.registerEventHandler('agent:evolved', () => { eventHandled = true; });
    await playgroundUI.triggerEvent('agent:evolved', { agentId: 'test-agent' });
    
    assert(eventHandled, 'UI should handle agent evolution event');
    
    // Clean up
    await evolutionSystem.unregisterAgent('test-agent');
    await evolutionSystem.deletePopulation('test-population');
    
    return true;
  } catch (error) {
    console.error('Error in Integration tests:', error);
    assert(false, `Integration test failed with error: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== DevSparkAgent Playground Integration Tests ===');
  console.log(`Running tests with configuration version: ${config.version}`);
  
  const startTime = Date.now();
  
  // Run individual component tests
  await testRuntimeEnvironment();
  await testInteractionFramework();
  await testEvolutionSystem();
  await testPlaygroundUI();
  
  // Run integration tests
  await testIntegration();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Print test results
  console.log('\n=== Test Results ===');
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Skipped: ${testResults.skipped}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  
  if (testResults.failed === 0) {
    console.log('\n✅ All tests passed!');
    return true;
  } else {
    console.log(`\n❌ ${testResults.failed} tests failed.`);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testRuntimeEnvironment,
  testInteractionFramework,
  testEvolutionSystem,
  testPlaygroundUI,
  testIntegration
};
