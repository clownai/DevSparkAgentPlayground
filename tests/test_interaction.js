/**
 * Unit tests for Interaction Framework
 * 
 * Tests the functionality of the Interaction Framework component.
 */

const InteractionFramework = require('../src/interaction/InteractionFramework');
const MessageProtocol = require('../src/interaction/MessageProtocol');
const MessageBroker = require('../src/interaction/MessageBroker');
const AgentCommunication = require('../src/interaction/AgentCommunication');
const EnvironmentInteraction = require('../src/interaction/EnvironmentInteraction');
const RuntimeEnvironment = require('../src/runtime/RuntimeEnvironment');

// Test configuration
const config = {
  version: '1.0.0-test',
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
async function testMessageProtocol() {
  console.log('\n--- Testing Message Protocol ---');
  
  try {
    const messageProtocol = new MessageProtocol(config);
    await messageProtocol.initialize();
    
    assert(messageProtocol.initialized, 'Message protocol should be initialized');
    
    // Test message creation
    const message = messageProtocol.createMessage(
      'agent1',
      'agent2',
      'test',
      { data: 'test data' }
    );
    
    assert(message.sender === 'agent1', 'Message should have correct sender');
    assert(message.recipient === 'agent2', 'Message should have correct recipient');
    assert(message.type === 'test', 'Message should have correct type');
    assert(message.content.data === 'test data', 'Message should have correct content');
    assert(typeof message.id === 'string', 'Message should have an ID');
    assert(message.timestamp instanceof Date, 'Message should have a timestamp');
    
    // Test message validation
    const validationResult = messageProtocol.validateMessage(message);
    assert(validationResult.valid, 'Valid message should pass validation');
    
    // Test invalid message
    const invalidMessage = {
      sender: 'agent1',
      recipient: 'agent2',
      // Missing type
      content: { data: 'test data' }
    };
    
    const invalidValidationResult = messageProtocol.validateMessage(invalidMessage);
    assert(!invalidValidationResult.valid, 'Invalid message should fail validation');
    
    // Test message serialization
    const serialized = messageProtocol.serializeMessage(message);
    assert(typeof serialized === 'string', 'Serialized message should be a string');
    
    // Test message deserialization
    const deserialized = messageProtocol.deserializeMessage(serialized);
    assert(deserialized.id === message.id, 'Deserialized message should have same ID as original');
    assert(deserialized.sender === message.sender, 'Deserialized message should have same sender as original');
    assert(deserialized.recipient === message.recipient, 'Deserialized message should have same recipient as original');
    assert(deserialized.type === message.type, 'Deserialized message should have same type as original');
    assert(deserialized.content.data === message.content.data, 'Deserialized message should have same content as original');
    
    return true;
  } catch (error) {
    console.error('Error in Message Protocol tests:', error);
    assert(false, `Message Protocol test failed with error: ${error.message}`);
    return false;
  }
}

async function testMessageBroker() {
  console.log('\n--- Testing Message Broker ---');
  
  try {
    const messageProtocol = new MessageProtocol(config);
    await messageProtocol.initialize();
    
    const messageBroker = new MessageBroker(config, messageProtocol);
    await messageBroker.initialize();
    
    assert(messageBroker.initialized, 'Message broker should be initialized');
    
    // Test subscription
    let messageReceived = false;
    const subscriptionId = await messageBroker.subscribe('agent2', 'agent2', (message) => {
      messageReceived = message.content.data === 'test data';
    });
    
    assert(typeof subscriptionId === 'string', 'Subscription should return an ID');
    
    // Test message publishing
    const message = messageProtocol.createMessage(
      'agent1',
      'agent2',
      'test',
      { data: 'test data' }
    );
    
    await messageBroker.publishMessage(message);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(messageReceived, 'Message should be received by subscriber');
    
    // Test unsubscription
    await messageBroker.unsubscribe(subscriptionId);
    
    // Reset flag and publish again
    messageReceived = false;
    await messageBroker.publishMessage(message);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(!messageReceived, 'Message should not be received after unsubscription');
    
    // Test topic subscription
    let topicMessageReceived = false;
    const topicSubscriptionId = await messageBroker.subscribeTopic('test-topic', (message) => {
      topicMessageReceived = message.content.data === 'topic data';
    });
    
    // Test topic publishing
    const topicMessage = messageProtocol.createMessage(
      'agent1',
      'test-topic',
      'topic',
      { data: 'topic data' }
    );
    
    await messageBroker.publishToTopic('test-topic', topicMessage);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(topicMessageReceived, 'Topic message should be received by subscriber');
    
    // Test topic unsubscription
    await messageBroker.unsubscribeTopic(topicSubscriptionId);
    
    // Reset flag and publish again
    topicMessageReceived = false;
    await messageBroker.publishToTopic('test-topic', topicMessage);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(!topicMessageReceived, 'Topic message should not be received after unsubscription');
    
    return true;
  } catch (error) {
    console.error('Error in Message Broker tests:', error);
    assert(false, `Message Broker test failed with error: ${error.message}`);
    return false;
  }
}

async function testAgentCommunication() {
  console.log('\n--- Testing Agent Communication ---');
  
  try {
    const messageProtocol = new MessageProtocol(config);
    await messageProtocol.initialize();
    
    const messageBroker = new MessageBroker(config, messageProtocol);
    await messageBroker.initialize();
    
    const agentCommunication = new AgentCommunication(config, messageBroker, messageProtocol);
    await agentCommunication.initialize();
    
    assert(agentCommunication.initialized, 'Agent communication should be initialized');
    
    // Test agent registration
    await agentCommunication.registerAgent('agent1', { name: 'Agent 1' });
    await agentCommunication.registerAgent('agent2', { name: 'Agent 2' });
    
    const agents = agentCommunication.getAgents();
    assert(agents.length === 2, 'Two agents should be registered');
    assert(agents.some(agent => agent.id === 'agent1'), 'Agent 1 should be in the list');
    assert(agents.some(agent => agent.id === 'agent2'), 'Agent 2 should be in the list');
    
    // Test agent info retrieval
    const agent1Info = agentCommunication.getAgentInfo('agent1');
    assert(agent1Info.name === 'Agent 1', 'Agent 1 info should be correct');
    
    // Test message sending
    let messageReceived = false;
    await agentCommunication.onMessage('agent2', (message) => {
      messageReceived = message.content.data === 'hello';
    });
    
    await agentCommunication.sendMessage('agent1', 'agent2', 'greeting', { data: 'hello' });
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(messageReceived, 'Message should be received by agent2');
    
    // Test request-response
    await agentCommunication.onRequest('agent2', 'echo', (request) => {
      return { data: request.content.data };
    });
    
    const response = await agentCommunication.sendRequest('agent1', 'agent2', 'echo', { data: 'test' });
    assert(response.data === 'test', 'Response should echo request data');
    
    // Test broadcast
    let broadcast1Received = false;
    let broadcast2Received = false;
    
    await agentCommunication.onBroadcast('agent1', (message) => {
      broadcast1Received = message.content.data === 'broadcast';
    });
    
    await agentCommunication.onBroadcast('agent2', (message) => {
      broadcast2Received = message.content.data === 'broadcast';
    });
    
    await agentCommunication.broadcast('system', 'announcement', { data: 'broadcast' });
    
    // Wait for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(broadcast1Received, 'Broadcast should be received by agent1');
    assert(broadcast2Received, 'Broadcast should be received by agent2');
    
    // Test agent unregistration
    await agentCommunication.unregisterAgent('agent1');
    
    const agentsAfterUnregister = agentCommunication.getAgents();
    assert(agentsAfterUnregister.length === 1, 'One agent should be registered after unregistration');
    assert(agentsAfterUnregister[0].id === 'agent2', 'Agent 2 should still be in the list');
    
    return true;
  } catch (error) {
    console.error('Error in Agent Communication tests:', error);
    assert(false, `Agent Communication test failed with error: ${error.message}`);
    return false;
  }
}

async function testEnvironmentInteraction() {
  console.log('\n--- Testing Environment Interaction ---');
  
  try {
    const environmentInteraction = new EnvironmentInteraction(config);
    await environmentInteraction.initialize();
    
    assert(environmentInteraction.initialized, 'Environment interaction should be initialized');
    
    // Test resource registration
    await environmentInteraction.registerResource('testResource', {
      type: 'test',
      name: 'Test Resource',
      description: 'A test resource'
    });
    
    const resources = environmentInteraction.listResources();
    assert(resources.some(resource => resource.id === 'testResource'), 'Test resource should be in the list');
    
    // Test resource retrieval
    const resource = environmentInteraction.getResource('testResource');
    assert(resource.name === 'Test Resource', 'Resource should have correct name');
    assert(resource.type === 'test', 'Resource should have correct type');
    assert(resource.description === 'A test resource', 'Resource should have correct description');
    
    // Test resource update
    await environmentInteraction.updateResource('testResource', {
      type: 'test',
      name: 'Updated Test Resource',
      description: 'An updated test resource'
    });
    
    const updatedResource = environmentInteraction.getResource('testResource');
    assert(updatedResource.name === 'Updated Test Resource', 'Updated resource should have new name');
    assert(updatedResource.description === 'An updated test resource', 'Updated resource should have new description');
    
    // Test resource removal
    await environmentInteraction.unregisterResource('testResource');
    
    const resourcesAfterRemoval = environmentInteraction.listResources();
    assert(!resourcesAfterRemoval.some(resource => resource.id === 'testResource'), 'Test resource should not be in the list after removal');
    
    // Test environment variable management
    await environmentInteraction.setEnvironmentVariable('TEST_VAR', 'test value');
    
    const envVar = environmentInteraction.getEnvironmentVariable('TEST_VAR');
    assert(envVar === 'test value', 'Environment variable should have correct value');
    
    const allEnvVars = environmentInteraction.getAllEnvironmentVariables();
    assert(allEnvVars.TEST_VAR === 'test value', 'All environment variables should include test variable');
    
    await environmentInteraction.unsetEnvironmentVariable('TEST_VAR');
    
    const envVarAfterUnset = environmentInteraction.getEnvironmentVariable('TEST_VAR');
    assert(envVarAfterUnset === undefined, 'Environment variable should be undefined after unset');
    
    return true;
  } catch (error) {
    console.error('Error in Environment Interaction tests:', error);
    assert(false, `Environment Interaction test failed with error: ${error.message}`);
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
    assert(interactionFramework.messageProtocol.initialized, 'Message protocol should be initialized');
    assert(interactionFramework.messageBroker.initialized, 'Message broker should be initialized');
    assert(interactionFramework.agentCommunication.initialized, 'Agent communication should be initialized');
    assert(interactionFramework.environmentInteraction.initialized, 'Environment interaction should be initialized');
    
    // Test agent registration
    await interactionFramework.registerAgent('agent1', { name: 'Agent 1' });
    
    const agentInfo = interactionFramework.getAgentInfo('agent1');
    assert(agentInfo.name === 'Agent 1', 'Agent info should be correct');
    
    // Test message sending
    let messageReceived = false;
    await interactionFramework.onMessage('agent1', (message) => {
      messageReceived = message.content.data === 'test';
    });
    
    await interactionFramework.sendMessage('system', 'agent1', 'test', { data: 'test' });
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert(messageReceived, 'Message should be received by agent');
    
    // Test resource registration
    await interactionFramework.registerResource('testResource', {
      type: 'test',
      name: 'Test Resource',
      description: 'A test resource'
    });
    
    const resource = interactionFramework.getResource('testResource');
    assert(resource.name === 'Test Resource', 'Resource should have correct name');
    
    // Test cleanup
    await interactionFramework.unregisterAgent('agent1');
    await interactionFramework.unregisterResource('testResource');
    
    return true;
  } catch (error) {
    console.error('Error in Interaction Framework tests:', error);
    assert(false, `Interaction Framework test failed with error: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== Interaction Framework Unit Tests ===');
  
  const startTime = Date.now();
  
  await testMessageProtocol();
  await testMessageBroker();
  await testAgentCommunication();
  await testEnvironmentInteraction();
  await testInteractionFramework();
  
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
  testMessageProtocol,
  testMessageBroker,
  testAgentCommunication,
  testEnvironmentInteraction,
  testInteractionFramework
};
