/**
 * Mock MessageProtocol for testing
 */
class MockMessageProtocol {
  constructor(config = {}) {
    this.config = config || { version: '1.0' };
    this.logger = config.logger || console;
  }

  createMessage(sender, recipient, type, content, options = {}) {
    const timestamp = new Date();
    const id = this._generateMessageId(sender, timestamp);
    
    return {
      id,
      sender,
      recipient,
      type,
      content,
      timestamp,
      ...options
    };
  }

  validateMessage(message) {
    return true;
  }

  serializeMessage(message) {
    return JSON.stringify(message);
  }

  deserializeMessage(serializedMessage) {
    return JSON.parse(serializedMessage);
  }

  _generateMessageId(sender, timestamp) {
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${sender}-${timestamp.getTime()}-${random}`;
  }
}

module.exports = MockMessageProtocol;
