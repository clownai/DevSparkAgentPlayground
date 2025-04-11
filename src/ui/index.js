/**
 * Main JavaScript file for DevSparkAgent Playground
 * 
 * Initializes and renders the playground UI.
 */

// Import required modules
const PlaygroundUI = require('./PlaygroundUI');
const RuntimeEnvironment = require('../runtime/RuntimeEnvironment');
const InteractionFramework = require('../interaction/InteractionFramework');
const EvolutionSystem = require('../evolution/EvolutionSystem');

// Configuration
const config = {
  version: '1.0.0',
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
      requestTimeout: 30000,
      maxQueueSize: 100
    },
    broker: {
      maxQueueSize: 100
    }
  },
  evolution: {
    populationSize: 100,
    genomeSize: 100,
    selectionMethod: 'tournament',
    tournamentSize: 5,
    crossoverMethod: 'uniform',
    mutationRate: 0.01,
    mutationAmount: 0.1,
    elitismRate: 0.1,
    defaultPopulationOptions: {
      generations: 10,
      populationSize: 20,
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
    maxRecordsPerMetric: 1000,
    maxRecordsPerBenchmark: 100
  }
};

// Initialize components
async function initializePlayground() {
  try {
    console.log('Initializing DevSparkAgent Playground...');
    
    // Create runtime environment
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    // Create interaction framework
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    // Create evolution system
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Create UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    // Render UI
    const container = document.getElementById('playground-container');
    await playgroundUI.render(container);
    
    console.log('DevSparkAgent Playground initialized successfully');
    
    // Show welcome notification
    await playgroundUI.showNotification('Welcome to DevSparkAgent Playground!', 'info', 5000);
    
    return {
      runtimeEnvironment,
      interactionFramework,
      evolutionSystem,
      playgroundUI
    };
  } catch (error) {
    console.error('Failed to initialize DevSparkAgent Playground:', error);
    
    // Show error message
    const container = document.getElementById('playground-container');
    container.innerHTML = `
      <div class="playground-error">
        <h1>Initialization Error</h1>
        <p>Failed to initialize DevSparkAgent Playground:</p>
        <pre>${error.message}</pre>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializePlayground().then(playground => {
    // Make playground available globally for debugging
    window.playground = playground;
  });
});
