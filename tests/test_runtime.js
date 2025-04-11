/**
 * Unit tests for Runtime Environment
 * 
 * Tests the functionality of the Runtime Environment component.
 */

const RuntimeEnvironment = require('../src/runtime/RuntimeEnvironment');
const ContainerManager = require('../src/runtime/ContainerManager');
const ExecutionEngine = require('../src/runtime/ExecutionEngine');
const SecurityManager = require('../src/runtime/SecurityManager');
const ResourceMonitor = require('../src/runtime/ResourceMonitor');

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
async function testContainerManager() {
  console.log('\n--- Testing Container Manager ---');
  
  try {
    const containerManager = new ContainerManager(config);
    await containerManager.initialize();
    
    assert(containerManager.initialized, 'Container manager should be initialized');
    
    // Test container creation
    const containerId = 'test-container';
    const containerCreated = await containerManager.createContainer(containerId);
    assert(containerCreated, 'Container should be created');
    
    // Test container existence check
    const containerExists = await containerManager.containerExists(containerId);
    assert(containerExists, 'Container should exist after creation');
    
    // Test container status
    const containerStatus = await containerManager.getContainerStatus(containerId);
    assert(containerStatus.id === containerId, 'Container status should have correct ID');
    
    // Test container removal
    const containerRemoved = await containerManager.removeContainer(containerId);
    assert(containerRemoved, 'Container should be removed');
    
    const containerExistsAfterRemoval = await containerManager.containerExists(containerId);
    assert(!containerExistsAfterRemoval, 'Container should not exist after removal');
    
    return true;
  } catch (error) {
    console.error('Error in Container Manager tests:', error);
    assert(false, `Container Manager test failed with error: ${error.message}`);
    return false;
  }
}

async function testExecutionEngine() {
  console.log('\n--- Testing Execution Engine ---');
  
  try {
    const executionEngine = new ExecutionEngine(config);
    await executionEngine.initialize();
    
    assert(executionEngine.initialized, 'Execution engine should be initialized');
    
    // Test code execution
    const containerId = 'test-container';
    const code = 'console.log("Hello, world!");';
    const result = await executionEngine.executeCode(containerId, code, 'javascript');
    
    assert(result.success, 'Code execution should succeed');
    assert(result.output.includes('Hello, world!'), 'Output should contain expected string');
    
    // Test execution with timeout
    const longRunningCode = 'while(true) {}';
    try {
      const timeoutResult = await executionEngine.executeCode(containerId, longRunningCode, 'javascript', 1);
      assert(false, 'Long-running code should timeout');
    } catch (error) {
      assert(error.message.includes('timeout'), 'Error should indicate timeout');
    }
    
    // Test execution with invalid language
    try {
      const invalidResult = await executionEngine.executeCode(containerId, code, 'invalid-language');
      assert(false, 'Execution with invalid language should fail');
    } catch (error) {
      assert(error.message.includes('language'), 'Error should indicate invalid language');
    }
    
    return true;
  } catch (error) {
    console.error('Error in Execution Engine tests:', error);
    assert(false, `Execution Engine test failed with error: ${error.message}`);
    return false;
  }
}

async function testSecurityManager() {
  console.log('\n--- Testing Security Manager ---');
  
  try {
    const securityManager = new SecurityManager(config);
    await securityManager.initialize();
    
    assert(securityManager.initialized, 'Security manager should be initialized');
    
    // Test security policy validation
    const validPolicy = {
      allowNetwork: true,
      allowFileSystem: false,
      allowSubprocesses: false
    };
    
    const validationResult = securityManager.validatePolicy(validPolicy);
    assert(validationResult.valid, 'Valid policy should pass validation');
    
    // Test invalid policy
    const invalidPolicy = {
      allowNetwork: true,
      allowFileSystem: 'invalid',
      allowSubprocesses: false
    };
    
    const invalidValidationResult = securityManager.validatePolicy(invalidPolicy);
    assert(!invalidValidationResult.valid, 'Invalid policy should fail validation');
    
    // Test code security check
    const safeCode = 'console.log("Hello, world!");';
    const safeResult = securityManager.checkCodeSecurity(safeCode, 'javascript');
    assert(safeResult.safe, 'Safe code should pass security check');
    
    // Test unsafe code
    const unsafeCode = 'require("fs").readFileSync("/etc/passwd");';
    const unsafeResult = securityManager.checkCodeSecurity(unsafeCode, 'javascript');
    assert(!unsafeResult.safe, 'Unsafe code should fail security check');
    
    return true;
  } catch (error) {
    console.error('Error in Security Manager tests:', error);
    assert(false, `Security Manager test failed with error: ${error.message}`);
    return false;
  }
}

async function testResourceMonitor() {
  console.log('\n--- Testing Resource Monitor ---');
  
  try {
    const resourceMonitor = new ResourceMonitor(config);
    await resourceMonitor.initialize();
    
    assert(resourceMonitor.initialized, 'Resource monitor should be initialized');
    
    // Test resource monitoring
    const containerId = 'test-container';
    const resources = await resourceMonitor.getResourceUsage(containerId);
    
    assert(resources.containerId === containerId, 'Resource usage should have correct container ID');
    assert(typeof resources.memoryUsage === 'number', 'Memory usage should be a number');
    assert(typeof resources.cpuUsage === 'number', 'CPU usage should be a number');
    
    // Test resource limit check
    const withinLimits = resourceMonitor.checkResourceLimits(containerId, {
      memoryUsage: 100,
      cpuUsage: 0.2
    });
    
    assert(withinLimits, 'Resources within limits should pass check');
    
    // Test resource limit violation
    const exceedsLimits = resourceMonitor.checkResourceLimits(containerId, {
      memoryUsage: 1000,
      cpuUsage: 1.0
    });
    
    assert(!exceedsLimits, 'Resources exceeding limits should fail check');
    
    return true;
  } catch (error) {
    console.error('Error in Resource Monitor tests:', error);
    assert(false, `Resource Monitor test failed with error: ${error.message}`);
    return false;
  }
}

async function testRuntimeEnvironment() {
  console.log('\n--- Testing Runtime Environment ---');
  
  try {
    const runtimeEnvironment = new RuntimeEnvironment(config);
    await runtimeEnvironment.initialize();
    
    assert(runtimeEnvironment.initialized, 'Runtime environment should be initialized');
    assert(runtimeEnvironment.containerManager.initialized, 'Container manager should be initialized');
    assert(runtimeEnvironment.executionEngine.initialized, 'Execution engine should be initialized');
    assert(runtimeEnvironment.securityManager.initialized, 'Security manager should be initialized');
    assert(runtimeEnvironment.resourceMonitor.initialized, 'Resource monitor should be initialized');
    
    // Test container creation
    const containerId = 'test-container';
    const containerCreated = await runtimeEnvironment.createContainer(containerId);
    assert(containerCreated, 'Container should be created');
    
    // Test code execution
    const code = 'console.log("Hello from Runtime Environment!");';
    const result = await runtimeEnvironment.executeCode(containerId, code, 'javascript');
    
    assert(result.success, 'Code execution should succeed');
    assert(result.output.includes('Hello from Runtime Environment!'), 'Output should contain expected string');
    
    // Test resource monitoring
    const resources = await runtimeEnvironment.monitorResources(containerId);
    assert(resources.containerId === containerId, 'Resource monitoring should return correct container ID');
    
    // Test container removal
    const containerRemoved = await runtimeEnvironment.removeContainer(containerId);
    assert(containerRemoved, 'Container should be removed');
    
    return true;
  } catch (error) {
    console.error('Error in Runtime Environment tests:', error);
    assert(false, `Runtime Environment test failed with error: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== Runtime Environment Unit Tests ===');
  
  const startTime = Date.now();
  
  await testContainerManager();
  await testExecutionEngine();
  await testSecurityManager();
  await testResourceMonitor();
  await testRuntimeEnvironment();
  
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
  testContainerManager,
  testExecutionEngine,
  testSecurityManager,
  testResourceMonitor,
  testRuntimeEnvironment
};
