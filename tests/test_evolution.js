/**
 * Unit tests for Evolution System
 * 
 * Tests the functionality of the Evolution System component.
 */

const EvolutionSystem = require('../src/evolution/EvolutionSystem');
const GeneticAlgorithm = require('../src/evolution/GeneticAlgorithm');
const LearningMechanisms = require('../src/evolution/LearningMechanisms');
const AgentEvolution = require('../src/evolution/AgentEvolution');
const PerformanceTracking = require('../src/evolution/PerformanceTracking');
const InteractionFramework = require('../src/interaction/InteractionFramework');
const RuntimeEnvironment = require('../src/runtime/RuntimeEnvironment');

// Test configuration
const config = {
  version: '1.0.0-test',
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
async function testGeneticAlgorithm() {
  console.log('\n--- Testing Genetic Algorithm ---');
  
  try {
    const geneticAlgorithm = new GeneticAlgorithm(config);
    await geneticAlgorithm.initialize();
    
    assert(geneticAlgorithm.initialized, 'Genetic algorithm should be initialized');
    
    // Test population initialization
    const population = await geneticAlgorithm.initializePopulation(20, 50);
    assert(population.length === 20, 'Population should have 20 individuals');
    assert(population[0].genome.length === 50, 'Individual genome should have 50 genes');
    
    // Test fitness evaluation
    const fitnessFunction = (individual) => {
      // Simple fitness function: sum of genes
      return individual.genome.reduce((sum, gene) => sum + gene, 0);
    };
    
    const evaluatedPopulation = await geneticAlgorithm.evaluatePopulation(population, fitnessFunction);
    assert(evaluatedPopulation.length === 20, 'Evaluated population should have 20 individuals');
    assert(typeof evaluatedPopulation[0].fitness === 'number', 'Individual should have fitness value');
    
    // Test selection
    const parents = await geneticAlgorithm.selectParents(evaluatedPopulation, 10, 'tournament');
    assert(parents.length === 10, 'Should select 10 parents');
    
    // Test crossover
    const offspring = await geneticAlgorithm.crossover(parents, 'uniform');
    assert(offspring.length === 10, 'Should produce 10 offspring');
    assert(offspring[0].genome.length === 50, 'Offspring genome should have 50 genes');
    
    // Test mutation
    const mutatedOffspring = await geneticAlgorithm.mutate(offspring, 0.1, 0.1);
    assert(mutatedOffspring.length === 10, 'Should have 10 mutated offspring');
    
    // Test survivor selection
    const nextGeneration = await geneticAlgorithm.selectSurvivors(evaluatedPopulation, mutatedOffspring, 20, 0.1);
    assert(nextGeneration.length === 20, 'Next generation should have 20 individuals');
    
    // Test evolution
    const evolveResult = await geneticAlgorithm.evolve({
      populationSize: 20,
      genomeSize: 50,
      generations: 5,
      fitnessFunction,
      selectionMethod: 'tournament',
      crossoverMethod: 'uniform',
      mutationRate: 0.1,
      elitismRate: 0.1
    });
    
    assert(evolveResult.generation === 5, 'Should evolve for 5 generations');
    assert(evolveResult.population.length === 20, 'Final population should have 20 individuals');
    assert(typeof evolveResult.bestFitness === 'number', 'Should report best fitness');
    assert(typeof evolveResult.averageFitness === 'number', 'Should report average fitness');
    
    return true;
  } catch (error) {
    console.error('Error in Genetic Algorithm tests:', error);
    assert(false, `Genetic Algorithm test failed with error: ${error.message}`);
    return false;
  }
}

async function testLearningMechanisms() {
  console.log('\n--- Testing Learning Mechanisms ---');
  
  try {
    const learningMechanisms = new LearningMechanisms(config);
    await learningMechanisms.initialize();
    
    assert(learningMechanisms.initialized, 'Learning mechanisms should be initialized');
    
    // Test model listing
    const models = learningMechanisms.listModels();
    assert(models.length > 0, 'Should have default models');
    assert(models.some(model => model.id === 'reinforcement'), 'Should have reinforcement learning model');
    
    // Test reinforcement learning model
    const rlModel = await learningMechanisms.createModel('test-rl', 'reinforcement', {
      stateSize: 5,
      actionSize: 3,
      learningRate: 0.1,
      discountFactor: 0.9,
      explorationRate: 0.1
    });
    
    assert(rlModel.id === 'test-rl', 'Model should have correct ID');
    assert(rlModel.type === 'reinforcement', 'Model should have correct type');
    
    // Test training
    const state = [0.1, 0.2, 0.3, 0.4, 0.5];
    const action = 1;
    const reward = 0.5;
    const nextState = [0.2, 0.3, 0.4, 0.5, 0.6];
    
    const trainingResult = await learningMechanisms.trainModel('test-rl', {
      state,
      action,
      reward,
      nextState
    });
    
    assert(trainingResult.modelId === 'test-rl', 'Training result should have correct model ID');
    assert(typeof trainingResult.error === 'number', 'Training result should have error value');
    
    // Test prediction
    const prediction = await learningMechanisms.predict('test-rl', state);
    assert(Array.isArray(prediction), 'Prediction should be an array');
    assert(prediction.length === 3, 'Prediction should have 3 values (one for each action)');
    
    // Test model deletion
    await learningMechanisms.deleteModel('test-rl');
    
    const modelsAfterDeletion = learningMechanisms.listModels();
    assert(!modelsAfterDeletion.some(model => model.id === 'test-rl'), 'Model should be deleted');
    
    return true;
  } catch (error) {
    console.error('Error in Learning Mechanisms tests:', error);
    assert(false, `Learning Mechanisms test failed with error: ${error.message}`);
    return false;
  }
}

async function testAgentEvolution() {
  console.log('\n--- Testing Agent Evolution ---');
  
  try {
    const geneticAlgorithm = new GeneticAlgorithm(config);
    await geneticAlgorithm.initialize();
    
    const learningMechanisms = new LearningMechanisms(config);
    await learningMechanisms.initialize();
    
    const agentEvolution = new AgentEvolution(config, geneticAlgorithm, learningMechanisms);
    await agentEvolution.initialize();
    
    assert(agentEvolution.initialized, 'Agent evolution should be initialized');
    
    // Test agent registration
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
    
    await agentEvolution.registerAgent('agent1', agent1);
    await agentEvolution.registerAgent('agent2', agent2);
    
    const agents = agentEvolution.listAgents();
    assert(agents.length === 2, 'Should have 2 registered agents');
    assert(agents.some(agent => agent.id === 'agent1'), 'Agent 1 should be registered');
    assert(agents.some(agent => agent.id === 'agent2'), 'Agent 2 should be registered');
    
    // Test agent info retrieval
    const agent1Info = agentEvolution.getAgentInfo('agent1');
    assert(agent1Info.id === 'agent1', 'Agent info should have correct ID');
    
    // Test population creation
    await agentEvolution.createPopulation('test-population', {
      name: 'Test Population',
      description: 'A test population'
    });
    
    const populations = agentEvolution.listPopulations();
    assert(populations.length === 2, 'Should have 2 populations (default and test)');
    assert(populations.some(pop => pop.id === 'test-population'), 'Test population should be created');
    
    // Test population info retrieval
    const populationInfo = agentEvolution.getPopulationInfo('test-population');
    assert(populationInfo.id === 'test-population', 'Population info should have correct ID');
    assert(populationInfo.name === 'Test Population', 'Population info should have correct name');
    
    // Test adding agents to population
    await agentEvolution.addAgentToPopulation('test-population', 'agent1');
    await agentEvolution.addAgentToPopulation('test-population', 'agent2');
    
    const updatedPopulationInfo = agentEvolution.getPopulationInfo('test-population');
    assert(updatedPopulationInfo.agentIds.length === 2, 'Population should have 2 agents');
    assert(updatedPopulationInfo.agentIds.includes('agent1'), 'Population should include agent1');
    assert(updatedPopulationInfo.agentIds.includes('agent2'), 'Population should include agent2');
    
    // Test population evolution
    const evolveResult = await agentEvolution.evolvePopulation('test-population', {
      generations: 3,
      fitnessFunction: (agent) => {
        // Simple fitness function: sum of genome
        return agent.genome.reduce((sum, gene) => sum + gene, 0);
      }
    });
    
    assert(evolveResult.populationId === 'test-population', 'Evolution result should have correct population ID');
    assert(evolveResult.generations === 3, 'Evolution result should show 3 generations');
    assert(typeof evolveResult.bestFitness === 'number', 'Evolution result should have best fitness');
    
    // Test removing agent from population
    await agentEvolution.removeAgentFromPopulation('test-population', 'agent1');
    
    const populationInfoAfterRemoval = agentEvolution.getPopulationInfo('test-population');
    assert(populationInfoAfterRemoval.agentIds.length === 1, 'Population should have 1 agent after removal');
    assert(populationInfoAfterRemoval.agentIds[0] === 'agent2', 'Population should only include agent2');
    
    // Test agent unregistration
    await agentEvolution.unregisterAgent('agent1');
    
    const agentsAfterUnregister = agentEvolution.listAgents();
    assert(agentsAfterUnregister.length === 1, 'Should have 1 registered agent after unregistration');
    assert(agentsAfterUnregister[0].id === 'agent2', 'Only agent2 should remain registered');
    
    // Test population deletion
    await agentEvolution.deletePopulation('test-population');
    
    const populationsAfterDeletion = agentEvolution.listPopulations();
    assert(populationsAfterDeletion.length === 1, 'Should have 1 population after deletion');
    assert(populationsAfterDeletion[0].id === 'default', 'Only default population should remain');
    
    return true;
  } catch (error) {
    console.error('Error in Agent Evolution tests:', error);
    assert(false, `Agent Evolution test failed with error: ${error.message}`);
    return false;
  }
}

async function testPerformanceTracking() {
  console.log('\n--- Testing Performance Tracking ---');
  
  try {
    const performanceTracking = new PerformanceTracking(config);
    await performanceTracking.initialize();
    
    assert(performanceTracking.initialized, 'Performance tracking should be initialized');
    
    // Test performance tracking
    const record1 = await performanceTracking.trackPerformance('agent1', 'accuracy', 0.85, {
      timestamp: new Date(),
      context: 'test'
    });
    
    assert(record1.agentId === 'agent1', 'Performance record should have correct agent ID');
    assert(record1.metricId === 'accuracy', 'Performance record should have correct metric ID');
    assert(record1.value === 0.85, 'Performance record should have correct value');
    
    const record2 = await performanceTracking.trackPerformance('agent1', 'responseTime', 150, {
      timestamp: new Date(),
      context: 'test'
    });
    
    // Test performance retrieval
    const performance = performanceTracking.getAgentPerformance('agent1');
    assert(performance.length === 2, 'Should have 2 performance records');
    assert(performance.some(record => record.metricId === 'accuracy'), 'Should have accuracy record');
    assert(performance.some(record => record.metricId === 'responseTime'), 'Should have response time record');
    
    // Test metric-specific performance retrieval
    const accuracyPerformance = performanceTracking.getAgentPerformance('agent1', 'accuracy');
    assert(accuracyPerformance.length === 1, 'Should have 1 accuracy record');
    assert(accuracyPerformance[0].value === 0.85, 'Accuracy record should have correct value');
    
    // Test benchmark registration
    await performanceTracking.registerBenchmark('test-benchmark', {
      name: 'Test Benchmark',
      description: 'A test benchmark',
      tasks: [
        { id: 'task1', name: 'Task 1', description: 'A test task' }
      ]
    });
    
    const benchmarks = performanceTracking.listBenchmarks();
    assert(benchmarks.some(benchmark => benchmark.id === 'test-benchmark'), 'Test benchmark should be registered');
    
    // Test benchmark execution
    const benchmarkResult = await performanceTracking.runBenchmark('agent1', 'test-benchmark', {
      taskResults: {
        task1: {
          success: true,
          responseTime: 100,
          accuracy: 0.9
        }
      }
    });
    
    assert(benchmarkResult.agentId === 'agent1', 'Benchmark result should have correct agent ID');
    assert(benchmarkResult.benchmarkId === 'test-benchmark', 'Benchmark result should have correct benchmark ID');
    assert(benchmarkResult.results.summary.tasksCompleted === 1, 'Benchmark result should show 1 task completed');
    assert(benchmarkResult.results.summary.tasksSucceeded === 1, 'Benchmark result should show 1 task succeeded');
    
    // Test benchmark results retrieval
    const benchmarkResults = performanceTracking.getBenchmarkResults('agent1', 'test-benchmark');
    assert(benchmarkResults.length === 1, 'Should have 1 benchmark result');
    
    // Test agent comparison
    const agent2Record = await performanceTracking.trackPerformance('agent2', 'accuracy', 0.75, {
      timestamp: new Date(),
      context: 'test'
    });
    
    const comparison = performanceTracking.compareAgentPerformance(['agent1', 'agent2'], 'accuracy');
    assert(comparison.metric === 'accuracy', 'Comparison should be for accuracy metric');
    assert(comparison.agents.agent1 === 0.85, 'Agent1 accuracy should be 0.85');
    assert(comparison.agents.agent2 === 0.75, 'Agent2 accuracy should be 0.75');
    
    // Test benchmark unregistration
    await performanceTracking.unregisterBenchmark('test-benchmark');
    
    const benchmarksAfterUnregister = performanceTracking.listBenchmarks();
    assert(!benchmarksAfterUnregister.some(benchmark => benchmark.id === 'test-benchmark'), 'Test benchmark should be unregistered');
    
    return true;
  } catch (error) {
    console.error('Error in Performance Tracking tests:', error);
    assert(false, `Performance Tracking test failed with error: ${error.message}`);
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
    assert(evolutionSystem.geneticAlgorithm.initialized, 'Genetic algorithm should be initialized');
    assert(evolutionSystem.learningMechanisms.initialized, 'Learning mechanisms should be initialized');
    assert(evolutionSystem.agentEvolution.initialized, 'Agent evolution should be initialized');
    assert(evolutionSystem.performanceTracking.initialized, 'Performance tracking should be initialized');
    
    // Test agent registration
    const agent = {
      id: 'test-agent',
      genome: Array.from({ length: 50 }, () => Math.random()),
      fitness: 0,
      metadata: {
        created: new Date(),
        type: 'test'
      }
    };
    
    await evolutionSystem.registerAgent('test-agent', agent);
    
    const agents = evolutionSystem.listAgents();
    assert(agents.some(a => a.id === 'test-agent'), 'Test agent should be registered');
    
    // Test population creation
    await evolutionSystem.createPopulation('test-population', {
      name: 'Test Population',
      description: 'A test population for evolution system tests'
    });
    
    const populations = evolutionSystem.listPopulations();
    assert(populations.some(p => p.id === 'test-population'), 'Test population should be created');
    
    // Test adding agent to population
    await evolutionSystem.addAgentToPopulation('test-population', 'test-agent');
    
    const populationInfo = evolutionSystem.getPopulationInfo('test-population');
    assert(populationInfo.agentIds.includes('test-agent'), 'Test agent should be added to population');
    
    // Test population evolution
    const evolveResult = await evolutionSystem.evolvePopulation('test-population', {
      generations: 2,
      fitnessFunction: (agent) => {
        return agent.genome.reduce((sum, gene) => sum + gene, 0);
      }
    });
    
    assert(evolveResult.generations === 2, 'Should evolve for 2 generations');
    assert(typeof evolveResult.bestFitness === 'number', 'Should report best fitness');
    
    // Test performance tracking
    await evolutionSystem.trackPerformance('test-agent', 'accuracy', 0.9);
    
    const performance = evolutionSystem.getAgentPerformance('test-agent');
    assert(performance.length === 1, 'Should have 1 performance record');
    assert(performance[0].metricId === 'accuracy', 'Performance record should be for accuracy metric');
    assert(performance[0].value === 0.9, 'Performance record should have correct value');
    
    // Test cleanup
    await evolutionSystem.unregisterAgent('test-agent');
    await evolutionSystem.deletePopulation('test-population');
    
    const agentsAfterCleanup = evolutionSystem.listAgents();
    assert(!agentsAfterCleanup.some(a => a.id === 'test-agent'), 'Test agent should be unregistered');
    
    const populationsAfterCleanup = evolutionSystem.listPopulations();
    assert(!populationsAfterCleanup.some(p => p.id === 'test-population'), 'Test population should be deleted');
    
    return true;
  } catch (error) {
    console.error('Error in Evolution System tests:', error);
    assert(false, `Evolution System test failed with error: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== Evolution System Unit Tests ===');
  
  const startTime = Date.now();
  
  await testGeneticAlgorithm();
  await testLearningMechanisms();
  await testAgentEvolution();
  await testPerformanceTracking();
  await testEvolutionSystem();
  
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
  testGeneticAlgorithm,
  testLearningMechanisms,
  testAgentEvolution,
  testPerformanceTracking,
  testEvolutionSystem
};
