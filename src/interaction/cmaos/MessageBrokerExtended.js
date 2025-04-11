/**
 * MessageBrokerExtended - Extended message broker for collaborative multi-agent systems
 * 
 * This component extends the base MessageBroker with:
 * - Role-based message routing
 * - Team broadcast capabilities
 * - Priority-based message handling
 * - Enhanced subscription mechanisms for teams
 */

const MessageBroker = require('../MessageBroker');

class MessageBrokerExtended extends MessageBroker {
  /**
   * Create a new MessageBrokerExtended instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.teamRegistry = config.teamRegistry;
    this.roleSubscriptions = new Map(); // Map of roleId -> Set of subscriberIds
    this.teamSubscriptions = new Map(); // Map of teamId -> Set of subscriberIds
    this.priorityQueue = new Map(); // Map of priority level -> Array of messages
    this.logger.info('MessageBrokerExtended initialized');
  }

  /**
   * Initialize the MessageBrokerExtended
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      // Initialize base MessageBroker
      await super.initialize();
      
      // Initialize priority levels
      this._initializePriorityLevels();
      
      return true;
    } catch (error) {
      this.logger.error(`MessageBrokerExtended initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Publish a message
   * @override
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async publishMessage(message) {
    try {
      // Check if message has priority
      if (message.priority !== undefined) {
        return this._publishWithPriority(message);
      }
      
      // Check if message is for a role
      if (message.recipient && message.recipient.startsWith('role:')) {
        return this._publishToRole(message);
      }
      
      // Check if message is for a team
      if (message.recipient && message.recipient.startsWith('team:')) {
        return this._publishToTeam(message);
      }
      
      // Use base implementation for other messages
      return super.publishMessage(message);
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to role messages
   * @param {string} subscriberId - Subscriber ID
   * @param {string} roleId - Role ID
   * @param {Function} callback - Callback function
   * @returns {Promise<boolean>} - Resolves to true if subscription is successful
   */
  async subscribeToRole(subscriberId, roleId, callback) {
    try {
      this.logger.debug(`Subscribing ${subscriberId} to role ${roleId}`);
      
      // Create role subscription if it doesn't exist
      if (!this.roleSubscriptions.has(roleId)) {
        this.roleSubscriptions.set(roleId, new Set());
      }
      
      // Add subscriber to role
      this.roleSubscriptions.get(roleId).add(subscriberId);
      
      // Create subscription key
      const subscriptionKey = `${subscriberId}:role:${roleId}`;
      
      // Store subscription
      this.subscriptions.set(subscriptionKey, {
        subscriberId,
        topic: `role:${roleId}`,
        callback,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe to role: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from role messages
   * @param {string} subscriberId - Subscriber ID
   * @param {string} roleId - Role ID
   * @returns {Promise<boolean>} - Resolves to true if unsubscription is successful
   */
  async unsubscribeFromRole(subscriberId, roleId) {
    try {
      this.logger.debug(`Unsubscribing ${subscriberId} from role ${roleId}`);
      
      // Check if role subscription exists
      if (!this.roleSubscriptions.has(roleId)) {
        this.logger.warn(`Role subscription ${roleId} not found`);
        return false;
      }
      
      // Remove subscriber from role
      this.roleSubscriptions.get(roleId).delete(subscriberId);
      
      // Remove empty role subscriptions
      if (this.roleSubscriptions.get(roleId).size === 0) {
        this.roleSubscriptions.delete(roleId);
      }
      
      // Create subscription key
      const subscriptionKey = `${subscriberId}:role:${roleId}`;
      
      // Remove subscription
      this.subscriptions.delete(subscriptionKey);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from role: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to team messages
   * @param {string} subscriberId - Subscriber ID
   * @param {string} teamId - Team ID
   * @param {Function} callback - Callback function
   * @returns {Promise<boolean>} - Resolves to true if subscription is successful
   */
  async subscribeToTeam(subscriberId, teamId, callback) {
    try {
      this.logger.debug(`Subscribing ${subscriberId} to team ${teamId}`);
      
      // Create team subscription if it doesn't exist
      if (!this.teamSubscriptions.has(teamId)) {
        this.teamSubscriptions.set(teamId, new Set());
      }
      
      // Add subscriber to team
      this.teamSubscriptions.get(teamId).add(subscriberId);
      
      // Create subscription key
      const subscriptionKey = `${subscriberId}:team:${teamId}`;
      
      // Store subscription
      this.subscriptions.set(subscriptionKey, {
        subscriberId,
        topic: `team:${teamId}`,
        callback,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe to team: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from team messages
   * @param {string} subscriberId - Subscriber ID
   * @param {string} teamId - Team ID
   * @returns {Promise<boolean>} - Resolves to true if unsubscription is successful
   */
  async unsubscribeFromTeam(subscriberId, teamId) {
    try {
      this.logger.debug(`Unsubscribing ${subscriberId} from team ${teamId}`);
      
      // Check if team subscription exists
      if (!this.teamSubscriptions.has(teamId)) {
        this.logger.warn(`Team subscription ${teamId} not found`);
        return false;
      }
      
      // Remove subscriber from team
      this.teamSubscriptions.get(teamId).delete(subscriberId);
      
      // Remove empty team subscriptions
      if (this.teamSubscriptions.get(teamId).size === 0) {
        this.teamSubscriptions.delete(teamId);
      }
      
      // Create subscription key
      const subscriptionKey = `${subscriberId}:team:${teamId}`;
      
      // Remove subscription
      this.subscriptions.delete(subscriptionKey);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from team: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get role subscriptions
   * @param {string} roleId - Role ID
   * @returns {Array<string>} - List of subscriber IDs
   */
  getRoleSubscribers(roleId) {
    if (!this.roleSubscriptions.has(roleId)) {
      return [];
    }
    
    return Array.from(this.roleSubscriptions.get(roleId));
  }

  /**
   * Get team subscriptions
   * @param {string} teamId - Team ID
   * @returns {Array<string>} - List of subscriber IDs
   */
  getTeamSubscribers(teamId) {
    if (!this.teamSubscriptions.has(teamId)) {
      return [];
    }
    
    return Array.from(this.teamSubscriptions.get(teamId));
  }

  /**
   * Publish message to a role
   * @private
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async _publishToRole(message) {
    try {
      const roleId = message.recipient.substring(5); // Remove 'role:' prefix
      
      this.logger.debug(`Publishing message to role ${roleId}`);
      
      // Check if we have a team registry and team ID
      if (this.teamRegistry && message.teamId) {
        // Get agents with this role in the team
        const members = this.teamRegistry.getAgentsByRole(message.teamId, roleId);
        
        // Deliver message to each agent
        for (const member of members) {
          const agentId = member.agentId;
          
          // Create a copy of the message for this agent
          const agentMessage = { ...message, recipient: agentId };
          
          // Publish to agent
          await this._publishToDirect(agentMessage);
        }
        
        return true;
      }
      
      // If no team registry or team ID, use role subscriptions
      if (this.roleSubscriptions.has(roleId)) {
        const subscribers = this.roleSubscriptions.get(roleId);
        
        // Deliver message to each subscriber
        for (const subscriberId of subscribers) {
          // Create a copy of the message for this subscriber
          const subscriberMessage = { ...message, recipient: subscriberId };
          
          // Publish to subscriber
          await this._publishToDirect(subscriberMessage);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish to role: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Publish message to a team
   * @private
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async _publishToTeam(message) {
    try {
      const teamId = message.recipient.substring(5); // Remove 'team:' prefix
      
      this.logger.debug(`Publishing message to team ${teamId}`);
      
      // Check if we have a team registry
      if (this.teamRegistry) {
        try {
          // Get team members
          const team = this.teamRegistry.getTeam(teamId);
          
          // Deliver message to each team member
          for (const member of team.members) {
            const agentId = member.agentId;
            
            // Skip sender if it's a team member
            if (agentId === message.sender) {
              continue;
            }
            
            // Create a copy of the message for this agent
            const agentMessage = { 
              ...message, 
              recipient: agentId,
              teamId,
              roleId: member.role
            };
            
            // Publish to agent
            await this._publishToDirect(agentMessage);
          }
          
          return true;
        } catch (error) {
          this.logger.warn(`Failed to get team ${teamId} from registry: ${error.message}`);
          // Fall back to team subscriptions
        }
      }
      
      // If no team registry or team not found, use team subscriptions
      if (this.teamSubscriptions.has(teamId)) {
        const subscribers = this.teamSubscriptions.get(teamId);
        
        // Deliver message to each subscriber
        for (const subscriberId of subscribers) {
          // Skip sender
          if (subscriberId === message.sender) {
            continue;
          }
          
          // Create a copy of the message for this subscriber
          const subscriberMessage = { ...message, recipient: subscriberId };
          
          // Publish to subscriber
          await this._publishToDirect(subscriberMessage);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish to team: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Publish message with priority
   * @private
   * @param {Object} message - Message to publish
   * @returns {Promise<boolean>} - Resolves to true if publish is successful
   */
  async _publishWithPriority(message) {
    try {
      const priority = message.priority;
      
      this.logger.debug(`Publishing message with priority ${priority}`);
      
      // Normalize priority to 0-10 range
      const normalizedPriority = Math.max(0, Math.min(10, priority));
      
      // Add message to priority queue
      if (!this.priorityQueue.has(normalizedPriority)) {
        this.priorityQueue.set(normalizedPriority, []);
      }
      
      this.priorityQueue.get(normalizedPriority).push({
        message,
        timestamp: new Date()
      });
      
      // Process priority queue
      this._processPriorityQueue();
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish with priority: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Process priority queue
   * @private
   */
  _processPriorityQueue() {
    // Process messages in priority order (highest first)
    const priorities = Array.from(this.priorityQueue.keys()).sort((a, b) => b - a);
    
    for (const priority of priorities) {
      const queue = this.priorityQueue.get(priority);
      
      // Process all messages in this priority level
      while (queue.length > 0) {
        const item = queue.shift();
        
        // Publish message without priority to avoid recursion
        const messageWithoutPriority = { ...item.message };
        delete messageWithoutPriority.priority;
        
        this.publishMessage(messageWithoutPriority).catch(error => {
          this.logger.error(`Failed to process priority message: ${error.message}`, error);
        });
      }
    }
  }

  /**
   * Initialize priority levels
   * @private
   */
  _initializePriorityLevels() {
    // Initialize priority levels 0-10
    for (let i = 0; i <= 10; i++) {
      this.priorityQueue.set(i, []);
    }
  }
}

module.exports = MessageBrokerExtended;
