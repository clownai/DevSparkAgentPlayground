/**
 * CommunicationProtocol.js
 * Defines communication protocols for multi-agent systems
 * 
 * This module provides standardized communication protocols
 * for agents to exchange information in multi-agent environments.
 */

class CommunicationProtocol {
  /**
   * Create a new communication protocol
   * @param {Object} config - Protocol configuration
   */
  constructor(config = {}) {
    this.config = this._validateConfig(config);
    this.messageTypes = new Map();
    this.registerDefaultMessageTypes();
  }
  
  /**
   * Register default message types
   * @private
   */
  registerDefaultMessageTypes() {
    // Basic message types
    this.registerMessageType('text', {
      description: 'Simple text message',
      schema: {
        text: { type: 'string', required: true }
      },
      priority: 1
    });
    
    this.registerMessageType('request', {
      description: 'Request for information or action',
      schema: {
        requestType: { type: 'string', required: true },
        content: { type: 'object', required: false }
      },
      priority: 2
    });
    
    this.registerMessageType('response', {
      description: 'Response to a request',
      schema: {
        requestId: { type: 'string', required: true },
        content: { type: 'object', required: false },
        success: { type: 'boolean', required: true }
      },
      priority: 2
    });
    
    this.registerMessageType('inform', {
      description: 'Information sharing',
      schema: {
        topic: { type: 'string', required: true },
        content: { type: 'object', required: true }
      },
      priority: 1
    });
    
    this.registerMessageType('propose', {
      description: 'Propose an action or plan',
      schema: {
        action: { type: 'string', required: true },
        parameters: { type: 'object', required: false },
        utility: { type: 'number', required: false }
      },
      priority: 3
    });
    
    this.registerMessageType('accept', {
      description: 'Accept a proposal',
      schema: {
        proposalId: { type: 'string', required: true }
      },
      priority: 3
    });
    
    this.registerMessageType('reject', {
      description: 'Reject a proposal',
      schema: {
        proposalId: { type: 'string', required: true },
        reason: { type: 'string', required: false }
      },
      priority: 3
    });
    
    // Coordination message types
    this.registerMessageType('coordinate', {
      description: 'Coordination message for team activities',
      schema: {
        action: { type: 'string', required: true },
        position: { type: 'object', required: false },
        timestamp: { type: 'number', required: true }
      },
      priority: 4
    });
    
    this.registerMessageType('intention', {
      description: 'Declare intention to perform an action',
      schema: {
        action: { type: 'string', required: true },
        target: { type: 'string', required: false },
        utility: { type: 'number', required: false }
      },
      priority: 3
    });
    
    // Team formation message types
    this.registerMessageType('team_join', {
      description: 'Request to join a team',
      schema: {
        teamId: { type: 'string', required: true },
        capabilities: { type: 'array', required: false }
      },
      priority: 5
    });
    
    this.registerMessageType('team_leave', {
      description: 'Notification of leaving a team',
      schema: {
        teamId: { type: 'string', required: true },
        reason: { type: 'string', required: false }
      },
      priority: 5
    });
    
    this.registerMessageType('team_formation', {
      description: 'Proposal to form a new team',
      schema: {
        teamId: { type: 'string', required: true },
        goal: { type: 'string', required: true },
        members: { type: 'array', required: true }
      },
      priority: 5
    });
  }
  
  /**
   * Register a new message type
   * @param {String} type - Message type identifier
   * @param {Object} definition - Message type definition
   * @returns {Boolean} - Success status
   */
  registerMessageType(type, definition) {
    if (this.messageTypes.has(type)) {
      throw new Error(`Message type ${type} is already registered`);
    }
    
    this.messageTypes.set(type, {
      ...definition,
      validator: this._createValidator(definition.schema)
    });
    
    return true;
  }
  
  /**
   * Get all registered message types
   * @returns {Map<String, Object>} - Map of message types
   */
  getMessageTypes() {
    return new Map(this.messageTypes);
  }
  
  /**
   * Create a new message
   * @param {String} senderId - Sender agent ID
   * @param {String} recipientId - Recipient agent ID (or 'all' for broadcast)
   * @param {String} type - Message type
   * @param {Object} content - Message content
   * @returns {Object} - Formatted message
   */
  createMessage(senderId, recipientId, type, content) {
    if (!this.messageTypes.has(type)) {
      throw new Error(`Unknown message type: ${type}`);
    }
    
    const messageType = this.messageTypes.get(type);
    
    // Validate content against schema
    if (!messageType.validator(content)) {
      throw new Error(`Invalid content for message type ${type}`);
    }
    
    // Create message
    const message = {
      id: this._generateId(),
      senderId,
      recipientId,
      type,
      content,
      timestamp: Date.now(),
      priority: messageType.priority || 1
    };
    
    return message;
  }
  
  /**
   * Validate a message
   * @param {Object} message - Message to validate
   * @returns {Boolean} - Validation result
   */
  validateMessage(message) {
    // Check required fields
    if (!message.id || !message.senderId || !message.recipientId || 
        !message.type || !message.timestamp) {
      return false;
    }
    
    // Check message type
    if (!this.messageTypes.has(message.type)) {
      return false;
    }
    
    // Validate content against schema
    const messageType = this.messageTypes.get(message.type);
    return messageType.validator(message.content);
  }
  
  /**
   * Filter messages by type
   * @param {Array<Object>} messages - Array of messages
   * @param {String} type - Message type to filter
   * @returns {Array<Object>} - Filtered messages
   */
  filterMessagesByType(messages, type) {
    return messages.filter(message => message.type === type);
  }
  
  /**
   * Sort messages by priority
   * @param {Array<Object>} messages - Array of messages
   * @param {Boolean} ascending - Sort in ascending order
   * @returns {Array<Object>} - Sorted messages
   */
  sortMessagesByPriority(messages, ascending = false) {
    return [...messages].sort((a, b) => {
      const priorityA = a.priority || this.messageTypes.get(a.type)?.priority || 1;
      const priorityB = b.priority || this.messageTypes.get(b.type)?.priority || 1;
      
      return ascending ? priorityA - priorityB : priorityB - priorityA;
    });
  }
  
  /**
   * Encode message for transmission
   * @param {Object} message - Message to encode
   * @returns {String} - Encoded message
   */
  encodeMessage(message) {
    return JSON.stringify(message);
  }
  
  /**
   * Decode received message
   * @param {String} encodedMessage - Encoded message
   * @returns {Object} - Decoded message
   */
  decodeMessage(encodedMessage) {
    return JSON.parse(encodedMessage);
  }
  
  /**
   * Create a validator function for a schema
   * @param {Object} schema - Schema definition
   * @returns {Function} - Validator function
   * @private
   */
  _createValidator(schema) {
    return (content) => {
      if (!content) {
        return false;
      }
      
      for (const [field, rules] of Object.entries(schema)) {
        // Check required fields
        if (rules.required && (content[field] === undefined || content[field] === null)) {
          return false;
        }
        
        // Skip validation for optional fields that are not present
        if (!rules.required && (content[field] === undefined || content[field] === null)) {
          continue;
        }
        
        // Validate type
        if (rules.type === 'string' && typeof content[field] !== 'string') {
          return false;
        } else if (rules.type === 'number' && typeof content[field] !== 'number') {
          return false;
        } else if (rules.type === 'boolean' && typeof content[field] !== 'boolean') {
          return false;
        } else if (rules.type === 'object' && (typeof content[field] !== 'object' || Array.isArray(content[field]))) {
          return false;
        } else if (rules.type === 'array' && !Array.isArray(content[field])) {
          return false;
        }
      }
      
      return true;
    };
  }
  
  /**
   * Generate a unique message ID
   * @returns {String} - Unique ID
   * @private
   */
  _generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @private
   */
  _validateConfig(config) {
    const defaultConfig = {
      maxMessageSize: 1024,
      compressionEnabled: false,
      encryptionEnabled: false
    };
    
    return { ...defaultConfig, ...config };
  }
}

module.exports = CommunicationProtocol;
