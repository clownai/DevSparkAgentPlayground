/**
 * Mock MessageBroker for testing
 */
class MockMessageBroker {
  constructor(config = {}) {
    this.config = config || {};
    this.logger = config.logger || console;
    this.subscriptions = new Map();
    this.teamRegistry = config.teamRegistry;
  }

  async initialize() {
    console.log('Initializing MockMessageBroker...');
    return true;
  }

  async publishMessage(message) {
    console.log(`Publishing message: ${message.id} to ${message.recipient}`);
    return true;
  }

  async subscribe(subscriberId, topic, callback) {
    console.log(`Subscribing ${subscriberId} to ${topic}`);
    return true;
  }

  async unsubscribe(subscriberId, topic) {
    console.log(`Unsubscribing ${subscriberId} from ${topic}`);
    return true;
  }

  async subscribeToTeam(subscriberId, teamId, callback) {
    console.log(`Subscribing ${subscriberId} to team ${teamId}`);
    return true;
  }

  async unsubscribeFromTeam(subscriberId, teamId) {
    console.log(`Unsubscribing ${subscriberId} from team ${teamId}`);
    return true;
  }

  async subscribeToRole(subscriberId, roleId, callback) {
    console.log(`Subscribing ${subscriberId} to role ${roleId}`);
    return true;
  }

  async unsubscribeFromRole(subscriberId, roleId) {
    console.log(`Unsubscribing ${subscriberId} from role ${roleId}`);
    return true;
  }
}

module.exports = MockMessageBroker;
