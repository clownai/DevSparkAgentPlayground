/**
 * Message Broker for DevSparkAgent Playground
 * 
 * Handles message routing and delivery between agents.
 */

const EventEmitter = require('events');

class MessageBroker {
  /**
   * Create a new MessageBroker instance
   * @param {Object} config - Configuration options
   * @param {MessageProtocol} messageProtocol - Message protocol instance
   */
  constructor(config, messageProtocol) {
    this.config = config;
    this.messageProtocol = messageProtocol;
    this.subscriptions = new Map();
    this.messageQueue = new Map();
    this.eventEmitter = new EventEmitter();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the message broker
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing MessageBroker...');
      
      // Set max listeners to avoid memory leak warnings
      this.eventEmitter.setMaxListeners(100);
      
      this.logger.info('MessageBroker initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`MessageBroker initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Publish a message
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async publishMessage(message) {
    try {
      // Validate message
      if (!this.messageProtocol.validateMessage(message)) {
        throw new Error('Invalid message');
      }
      
      this.logger.debug(`Publishing message from ${message.sender} to ${message.recipient}`);
      
      // Check if recipient is a topic
      if (message.recipient.startsWith('topic:')) {
        return this._publishToTopic(message);
      }
      
      // Check if recipient is a direct recipient
      return this._publishToDirect(message);
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to messages
   * @param {string} subscriberId - Subscriber ID
   * @param {string} topic - Topic to subscribe to
   * @param {Function} callback - Callback function
   * @returns {Promise<boolean>} - Resolves to true if subscription is successful
   */
  async subscribe(subscriberId, topic, callback) {
    try {
      this.logger.debug(`Subscribing ${subscriberId} to ${topic}`);
      
      // Create subscription key
      const subscriptionKey = `${subscriberId}:${topic}`;
      
      // Store subscription
      this.subscriptions.set(subscriptionKey, {
        subscriberId,
        topic,
        callback,
        timestamp: new Date()
      });
      
      // Subscribe to event
      this.eventEmitter.on(topic, (message) => {
        try {
          callback(message);
        } catch (error) {
          this.logger.error(`Error in subscription callback: ${error.message}`, error);
        }
      });
      
      // Process any queued messages
      await this._processQueuedMessages(subscriberId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from messages
   * @param {string} subscriberId - Subscriber ID
   * @param {string} topic - Topic to unsubscribe from
   * @returns {Promise<boolean>} - Resolves to true if unsubscription is successful
   */
  async unsubscribe(subscriberId, topic) {
    try {
      this.logger.debug(`Unsubscribing ${subscriberId} from ${topic}`);
      
      // Create subscription key
      const subscriptionKey = `${subscriberId}:${topic}`;
      
      // Check if subscription exists
      if (!this.subscriptions.has(subscriptionKey)) {
        this.logger.warn(`Subscription ${subscriptionKey} not found`);
        return false;
      }
      
      // Remove subscription
      this.subscriptions.delete(subscriptionKey);
      
      // Remove event listener
      this.eventEmitter.removeAllListeners(topic);
      
      // Re-add remaining subscriptions for this topic
      for (const [key, subscription] of this.subscriptions.entries()) {
        if (subscription.topic === topic) {
          this.eventEmitter.on(topic, subscription.callback);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all subscriptions for a subscriber
   * @param {string} subscriberId - Subscriber ID
   * @returns {Array<Object>} - List of subscriptions
   */
  getSubscriptions(subscriberId) {
    const subscriptions = [];
    
    for (const [key, subscription] of this.subscriptions.entries()) {
      if (subscription.subscriberId === subscriberId) {
        subscriptions.push({
          topic: subscription.topic,
          timestamp: subscription.timestamp
        });
      }
    }
    
    return subscriptions;
  }

  /**
   * Publish message to a topic
   * @private
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async _publishToTopic(message) {
    try {
      const topic = message.recipient.substring(6); // Remove 'topic:' prefix
      
      this.logger.debug(`Publishing message to topic ${topic}`);
      
      // Emit event
      this.eventEmitter.emit(topic, message);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish to topic: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Publish message to a direct recipient
   * @private
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async _publishToDirect(message) {
    try {
      const recipientId = message.recipient;
      
      this.logger.debug(`Publishing message to recipient ${recipientId}`);
      
      // Check if recipient has a subscription
      let delivered = false;
      for (const [key, subscription] of this.subscriptions.entries()) {
        if (subscription.subscriberId === recipientId) {
          try {
            subscription.callback(message);
            delivered = true;
          } catch (error) {
            this.logger.error(`Error in subscription callback: ${error.message}`, error);
          }
        }
      }
      
      // If not delivered, queue the message
      if (!delivered) {
        this._queueMessage(message);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish to direct recipient: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Queue a message for later delivery
   * @private
   * @param {Object} message - Message to queue
   */
  _queueMessage(message) {
    const recipientId = message.recipient;
    
    this.logger.debug(`Queueing message for recipient ${recipientId}`);
    
    // Create queue if it doesn't exist
    if (!this.messageQueue.has(recipientId)) {
      this.messageQueue.set(recipientId, []);
    }
    
    // Add message to queue
    const queue = this.messageQueue.get(recipientId);
    queue.push({
      message,
      timestamp: new Date()
    });
    
    // Limit queue size
    const maxQueueSize = this.config.broker.maxQueueSize || 100;
    if (queue.length > maxQueueSize) {
      queue.shift();
    }
  }

  /**
   * Process queued messages for a subscriber
   * @private
   * @param {string} subscriberId - Subscriber ID
   * @returns {Promise<number>} - Number of messages processed
   */
  async _processQueuedMessages(subscriberId) {
    try {
      // Check if subscriber has queued messages
      if (!this.messageQueue.has(subscriberId)) {
        return 0;
      }
      
      const queue = this.messageQueue.get(subscriberId);
      if (queue.length === 0) {
        return 0;
      }
      
      this.logger.debug(`Processing ${queue.length} queued messages for ${subscriberId}`);
      
      // Process messages
      let processedCount = 0;
      for (const item of queue) {
        try {
          await this._publishToDirect(item.message);
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process queued message: ${error.message}`, error);
        }
      }
      
      // Clear queue
      this.messageQueue.set(subscriberId, []);
      
      return processedCount;
    } catch (error) {
      this.logger.error(`Failed to process queued messages: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = MessageBroker;
