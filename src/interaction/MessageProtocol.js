/**
 * Message Protocol for DevSparkAgent Playground
 * 
 * Defines the message format and protocol for agent communication.
 */

class MessageProtocol {
  /**
   * Create a new MessageProtocol instance
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config;
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Create a message
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @param {Object} options - Additional options
   * @returns {Object} - Message object
   */
  createMessage(sender, recipient, type, content, options = {}) {
    const timestamp = new Date();
    const messageId = this._generateMessageId(sender, timestamp);
    
    return {
      id: messageId,
      sender,
      recipient,
      type,
      content,
      timestamp,
      options,
      protocol: {
        version: this.config.protocol.version,
        format: this.config.protocol.format
      }
    };
  }

  /**
   * Validate a message
   * @param {Object} message - Message to validate
   * @returns {boolean} - True if message is valid
   */
  validateMessage(message) {
    try {
      // Check required fields
      if (!message.id || !message.sender || !message.recipient || !message.type || !message.timestamp) {
        return false;
      }
      
      // Check protocol version
      if (!message.protocol || message.protocol.version !== this.config.protocol.version) {
        return false;
      }
      
      // Check message type
      if (!this._isValidMessageType(message.type)) {
        return false;
      }
      
      // Check content based on message type
      if (!this._validateContentForType(message.type, message.content)) {
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Message validation failed: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Serialize a message
   * @param {Object} message - Message to serialize
   * @returns {string} - Serialized message
   */
  serializeMessage(message) {
    try {
      return JSON.stringify(message);
    } catch (error) {
      this.logger.error(`Message serialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Deserialize a message
   * @param {string} serializedMessage - Serialized message
   * @returns {Object} - Deserialized message
   */
  deserializeMessage(serializedMessage) {
    try {
      const message = JSON.parse(serializedMessage);
      
      // Convert timestamp string to Date object
      if (message.timestamp && typeof message.timestamp === 'string') {
        message.timestamp = new Date(message.timestamp);
      }
      
      return message;
    } catch (error) {
      this.logger.error(`Message deserialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a request message
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID
   * @param {string} action - Request action
   * @param {Object} params - Request parameters
   * @param {Object} options - Additional options
   * @returns {Object} - Request message
   */
  createRequestMessage(sender, recipient, action, params, options = {}) {
    return this.createMessage(sender, recipient, 'request', {
      action,
      params
    }, options);
  }

  /**
   * Create a response message
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID
   * @param {string} requestId - ID of the request message
   * @param {Object} result - Response result
   * @param {Object} options - Additional options
   * @returns {Object} - Response message
   */
  createResponseMessage(sender, recipient, requestId, result, options = {}) {
    return this.createMessage(sender, recipient, 'response', {
      requestId,
      result
    }, options);
  }

  /**
   * Create an error message
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID
   * @param {string} requestId - ID of the request message
   * @param {string} error - Error message
   * @param {Object} details - Error details
   * @param {Object} options - Additional options
   * @returns {Object} - Error message
   */
  createErrorMessage(sender, recipient, requestId, error, details = {}, options = {}) {
    return this.createMessage(sender, recipient, 'error', {
      requestId,
      error,
      details
    }, options);
  }

  /**
   * Create a notification message
   * @param {string} sender - Sender ID
   * @param {string} recipient - Recipient ID
   * @param {string} event - Notification event
   * @param {Object} data - Notification data
   * @param {Object} options - Additional options
   * @returns {Object} - Notification message
   */
  createNotificationMessage(sender, recipient, event, data, options = {}) {
    return this.createMessage(sender, recipient, 'notification', {
      event,
      data
    }, options);
  }

  /**
   * Generate a message ID
   * @private
   * @param {string} sender - Sender ID
   * @param {Date} timestamp - Message timestamp
   * @returns {string} - Message ID
   */
  _generateMessageId(sender, timestamp) {
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${sender}-${timestamp.getTime()}-${random}`;
  }

  /**
   * Check if message type is valid
   * @private
   * @param {string} type - Message type
   * @returns {boolean} - True if type is valid
   */
  _isValidMessageType(type) {
    const validTypes = ['request', 'response', 'error', 'notification', 'data', 'control'];
    return validTypes.includes(type);
  }

  /**
   * Validate message content based on type
   * @private
   * @param {string} type - Message type
   * @param {Object} content - Message content
   * @returns {boolean} - True if content is valid for type
   */
  _validateContentForType(type, content) {
    if (!content) {
      return false;
    }
    
    switch (type) {
      case 'request':
        return content.action && content.params !== undefined;
      
      case 'response':
        return content.requestId && content.result !== undefined;
      
      case 'error':
        return content.requestId && content.error;
      
      case 'notification':
        return content.event && content.data !== undefined;
      
      case 'data':
        return content.dataType && content.payload !== undefined;
      
      case 'control':
        return content.command && content.params !== undefined;
      
      default:
        return true;
    }
  }
}

module.exports = MessageProtocol;
