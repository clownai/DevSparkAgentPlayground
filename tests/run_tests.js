/**
 * Main test runner for DevSparkAgent Playground
 * 
 * Runs all tests for the playground.
 */

const testRuntime = require('./test_runtime');
const testInteraction = require('./test_interaction');
const testEvolution = require('./test_evolution');
const testUI = require('./test_ui');
const testIntegration = require('./test_integration');

// Test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Run all tests
async function runAllTests() {
  console.log('=== DevSparkAgent Playground Tests ===');
  console.log('Running all tests...\n');
  
  const startTime = Date.now();
  
  // Run unit tests
  console.log('=== Running Unit Tests ===');
  
  console.log('\n=== Runtime Environment Tests ===');
  const runtimeResults = await testRuntime.runTests();
  
  console.log('\n=== Interaction Framework Tests ===');
  const interactionResults = await testInteraction.runTests();
  
  console.log('\n=== Evolution System Tests ===');
  const evolutionResults = await testEvolution.runTests();
  
  console.log('\n=== UI Tests ===');
  const uiResults = await testUI.runTests();
  
  // Run integration tests
  console.log('\n=== Running Integration Tests ===');
  const integrationResults = await testIntegration.runTests();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Print overall results
  console.log('\n=== Overall Test Results ===');
  console.log(`Runtime Environment: ${runtimeResults ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Interaction Framework: ${interactionResults ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Evolution System: ${evolutionResults ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`UI: ${uiResults ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Integration: ${integrationResults ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nTotal Duration: ${duration.toFixed(2)} seconds`);
  
  const allPassed = runtimeResults && interactionResults && evolutionResults && uiResults && integrationResults;
  
  if (allPassed) {
    console.log('\n✅ All tests passed!');
    return true;
  } else {
    console.log('\n❌ Some tests failed.');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests
};
