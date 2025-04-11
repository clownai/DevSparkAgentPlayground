/**
 * Unit tests for PlaygroundUI
 * 
 * Tests the functionality of the PlaygroundUI component.
 */

const PlaygroundUI = require('../src/ui/PlaygroundUI');
const RuntimeEnvironment = require('../src/runtime/RuntimeEnvironment');
const InteractionFramework = require('../src/interaction/InteractionFramework');
const EvolutionSystem = require('../src/evolution/EvolutionSystem');

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
  }
};

// Mock DOM elements and functions for testing UI without a browser
global.document = {
  createElement: (tag) => {
    return {
      className: '',
      innerHTML: '',
      style: {},
      dataset: {},
      appendChild: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {}
    };
  },
  getElementById: () => ({
    innerHTML: '',
    style: {},
    appendChild: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
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
async function testPlaygroundUIInitialization() {
  console.log('\n--- Testing PlaygroundUI Initialization ---');
  
  try {
    // Initialize dependencies
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Initialize UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    assert(playgroundUI.initialized, 'PlaygroundUI should be initialized');
    assert(playgroundUI.components instanceof Map, 'PlaygroundUI should have components map');
    assert(playgroundUI.eventHandlers instanceof Map, 'PlaygroundUI should have event handlers map');
    
    return true;
  } catch (error) {
    console.error('Error in PlaygroundUI Initialization tests:', error);
    assert(false, `PlaygroundUI Initialization test failed with error: ${error.message}`);
    return false;
  }
}

async function testComponentRegistration() {
  console.log('\n--- Testing Component Registration ---');
  
  try {
    // Initialize dependencies
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Initialize UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    // Test component registration
    const testComponent = {
      render: async () => {},
      update: async () => {}
    };
    
    await playgroundUI.registerComponent('testComponent', testComponent);
    assert(playgroundUI.components.has('testComponent'), 'Test component should be registered');
    assert(playgroundUI.components.get('testComponent') === testComponent, 'Registered component should be the same object');
    
    // Test component unregistration
    await playgroundUI.unregisterComponent('testComponent');
    assert(!playgroundUI.components.has('testComponent'), 'Test component should be unregistered');
    
    return true;
  } catch (error) {
    console.error('Error in Component Registration tests:', error);
    assert(false, `Component Registration test failed with error: ${error.message}`);
    return false;
  }
}

async function testEventHandling() {
  console.log('\n--- Testing Event Handling ---');
  
  try {
    // Initialize dependencies
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Initialize UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    // Test event handler registration
    let eventHandled = false;
    const testHandler = () => { eventHandled = true; };
    
    await playgroundUI.registerEventHandler('testEvent', testHandler);
    assert(playgroundUI.eventHandlers.has('testEvent'), 'Event handler should be registered');
    assert(playgroundUI.eventHandlers.get('testEvent').length === 1, 'Event handler list should have one handler');
    
    // Test event triggering
    await playgroundUI.triggerEvent('testEvent');
    assert(eventHandled, 'Event handler should be called when event is triggered');
    
    // Test event handler unregistration
    eventHandled = false;
    await playgroundUI.unregisterEventHandler('testEvent', testHandler);
    assert(playgroundUI.eventHandlers.has('testEvent'), 'Event type should still exist');
    assert(playgroundUI.eventHandlers.get('testEvent').length === 0, 'Event handler list should be empty');
    
    await playgroundUI.triggerEvent('testEvent');
    assert(!eventHandled, 'Event handler should not be called after unregistration');
    
    return true;
  } catch (error) {
    console.error('Error in Event Handling tests:', error);
    assert(false, `Event Handling test failed with error: ${error.message}`);
    return false;
  }
}

async function testDialogAndNotification() {
  console.log('\n--- Testing Dialog and Notification ---');
  
  try {
    // Initialize dependencies
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Initialize UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    // Mock document.body.appendChild to capture dialog creation
    let dialogCreated = false;
    let dialogContent = '';
    const originalAppendChild = document.body.appendChild;
    document.body.appendChild = (element) => {
      dialogCreated = true;
      dialogContent = element.innerHTML || '';
      
      // Simulate clicking the first button to resolve the promise
      setTimeout(() => {
        const buttons = element.querySelectorAll ? element.querySelectorAll('.playground-dialog-button') : [];
        if (buttons.length > 0) {
          buttons[0].click();
        }
      }, 10);
    };
    
    // Test dialog
    const dialogResult = await playgroundUI.showDialog('Test Dialog', 'This is a test dialog', [
      { id: 'cancel', label: 'Cancel' },
      { id: 'ok', label: 'OK' }
    ]);
    
    assert(dialogCreated, 'Dialog should be created');
    assert(dialogContent.includes('Test Dialog'), 'Dialog should contain title');
    assert(dialogContent.includes('This is a test dialog'), 'Dialog should contain content');
    assert(dialogResult === 'cancel', 'Dialog should return first button ID');
    
    // Reset mock
    document.body.appendChild = originalAppendChild;
    
    // Test notification
    let notificationCreated = false;
    let notificationContent = '';
    document.body.appendChild = (element) => {
      notificationCreated = true;
      notificationContent = element.innerHTML || '';
    };
    
    await playgroundUI.showNotification('Test notification', 'info', 100);
    
    assert(notificationCreated, 'Notification should be created');
    assert(notificationContent.includes('Test notification'), 'Notification should contain message');
    
    // Reset mock
    document.body.appendChild = originalAppendChild;
    
    return true;
  } catch (error) {
    console.error('Error in Dialog and Notification tests:', error);
    assert(false, `Dialog and Notification test failed with error: ${error.message}`);
    return false;
  }
}

async function testUIRendering() {
  console.log('\n--- Testing UI Rendering ---');
  
  try {
    // Initialize dependencies
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    const interactionFramework = new InteractionFramework(config, runtimeEnvironment);
    await interactionFramework.initialize();
    
    const evolutionSystem = new EvolutionSystem(config, interactionFramework);
    await evolutionSystem.initialize();
    
    // Initialize UI
    const playgroundUI = new PlaygroundUI(config, runtimeEnvironment, interactionFramework, evolutionSystem);
    await playgroundUI.initialize();
    
    // Mock container element
    const container = {
      innerHTML: '',
      appendChild: () => {}
    };
    
    // Test rendering
    await playgroundUI.render(container);
    
    // Since we can't test actual DOM rendering in this environment,
    // we'll just verify that the render method doesn't throw an error
    assert(true, 'Render method should not throw an error');
    
    // Test update
    await playgroundUI.update();
    assert(true, 'Update method should not throw an error');
    
    return true;
  } catch (error) {
    console.error('Error in UI Rendering tests:', error);
    assert(false, `UI Rendering test failed with error: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== PlaygroundUI Unit Tests ===');
  
  const startTime = Date.now();
  
  await testPlaygroundUIInitialization();
  await testComponentRegistration();
  await testEventHandling();
  await testDialogAndNotification();
  await testUIRendering();
  
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
  testPlaygroundUIInitialization,
  testComponentRegistration,
  testEventHandling,
  testDialogAndNotification,
  testUIRendering
};
