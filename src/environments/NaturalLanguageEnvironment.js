/**
 * NaturalLanguageEnvironment.js
 * Base class for natural language environments
 * 
 * This class provides the foundation for environments that
 * use natural language as the primary interaction medium.
 */

const BaseEnvironment = require('./BaseEnvironment');

class NaturalLanguageEnvironment extends BaseEnvironment {
  /**
   * Create a new natural language environment
   * @param {Object} config - Environment configuration
   */
  constructor(config = {}) {
    super(config);
    
    this.vocabulary = new Set();
    this.context = [];
    this.entities = new Map();
    this.actions = new Map();
    this.parser = null;
    
    this.metadata = {
      ...this.metadata,
      type: 'natural_language',
      version: '1.0.0',
      render_modes: ['human', 'text'],
      language: this.config.language
    };
  }
  
  /**
   * Initialize the natural language environment
   * @returns {Object} - Initial state
   */
  initialize() {
    // Initialize vocabulary
    if (this.config.vocabulary) {
      this.vocabulary = new Set(this.config.vocabulary);
    }
    
    // Initialize actions
    this._initializeActions();
    
    // Initialize entities
    this._initializeEntities();
    
    // Initialize parser
    this._initializeParser();
    
    // Initialize context
    this.context = [this.config.initialPrompt || 'You are in a natural language environment.'];
    
    this.state = {
      context: [...this.context],
      lastAction: null,
      lastResponse: null,
      entities: new Map(this.entities),
      step: 0
    };
    
    this.stepCount = 0;
    this.episodeCount = 0;
    this.initialized = true;
    
    return this._getObservation();
  }
  
  /**
   * Reset the environment to initial state
   * @returns {Object} - Initial state
   */
  reset() {
    // Reset context
    this.context = [this.config.initialPrompt || 'You are in a natural language environment.'];
    
    // Reset entities
    this._resetEntities();
    
    // Reset state
    this.state = {
      context: [...this.context],
      lastAction: null,
      lastResponse: null,
      entities: new Map(this.entities),
      step: 0
    };
    
    this.stepCount = 0;
    this.episodeCount += 1;
    
    return this._getObservation();
  }
  
  /**
   * Step the environment forward with an action
   * @param {String} action - Natural language action
   * @returns {Object} - Step result with observation, reward, done, and info
   */
  step(action) {
    if (!this.initialized) {
      throw new Error('Environment must be initialized before stepping');
    }
    
    // Parse action
    const parsedAction = this._parseAction(action);
    
    // Process action
    const result = this._processAction(parsedAction);
    
    // Update context
    this.context.push(`User: ${action}`);
    this.context.push(`Environment: ${result.response}`);
    
    // Limit context length
    if (this.context.length > this.config.maxContextLength) {
      this.context = this.context.slice(this.context.length - this.config.maxContextLength);
    }
    
    // Update state
    this.state = {
      context: [...this.context],
      lastAction: action,
      lastResponse: result.response,
      entities: new Map(this.entities),
      step: this.stepCount
    };
    
    // Update step count
    this.stepCount += 1;
    
    // Check for episode termination
    const done = result.done || this.stepCount >= this.config.maxStepsPerEpisode;
    
    return {
      observation: this._getObservation(),
      reward: result.reward,
      done,
      info: result.info
    };
  }
  
  /**
   * Get environment information
   * @returns {Object} - Environment information
   */
  getInfo() {
    return {
      vocabulary_size: this.vocabulary.size,
      action_types: Array.from(this.actions.keys()),
      entity_types: Array.from(new Set(Array.from(this.entities.values()).map(e => e.type))),
      context_length: this.context.length,
      max_context_length: this.config.maxContextLength,
      language: this.config.language
    };
  }
  
  /**
   * Render the environment
   * @param {String} mode - Render mode ('human', 'text')
   * @returns {*} - Render result, depends on mode
   */
  render(mode = 'human') {
    if (mode === 'human') {
      // Print context
      console.log('\n=== Natural Language Environment ===');
      for (const line of this.context) {
        console.log(line);
      }
      console.log('===============================\n');
      return null;
    } else if (mode === 'text') {
      // Return context as text
      return this.context.join('\n');
    }
    
    return null;
  }
  
  /**
   * Close the environment and release resources
   * @returns {Boolean} - Success status
   */
  close() {
    // Nothing to close in this simple environment
    return true;
  }
  
  /**
   * Get action space information
   * @returns {Object} - Action space information
   */
  getActionSpace() {
    return {
      type: 'text',
      actions: Array.from(this.actions.keys())
    };
  }
  
  /**
   * Get observation space information
   * @returns {Object} - Observation space information
   */
  getObservationSpace() {
    return {
      type: 'text',
      context_length: this.config.maxContextLength
    };
  }
  
  /**
   * Sample a random action from the action space
   * @returns {String} - Random action
   */
  sampleAction() {
    const actionTypes = Array.from(this.actions.keys());
    const randomType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    
    const action = this.actions.get(randomType);
    
    // Generate a simple action template
    return action.templates[Math.floor(Math.random() * action.templates.length)];
  }
  
  /**
   * Check if an action is valid
   * @param {String} action - Action to check
   * @returns {Boolean} - Whether the action is valid
   */
  isActionValid(action) {
    try {
      const parsedAction = this._parseAction(action);
      return parsedAction !== null;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Add a new entity to the environment
   * @param {String} id - Entity ID
   * @param {Object} entity - Entity data
   * @returns {Object} - Added entity
   */
  addEntity(id, entity) {
    this.entities.set(id, { ...entity });
    return this.entities.get(id);
  }
  
  /**
   * Remove an entity from the environment
   * @param {String} id - Entity ID
   * @returns {Boolean} - Success status
   */
  removeEntity(id) {
    return this.entities.delete(id);
  }
  
  /**
   * Get entity by ID
   * @param {String} id - Entity ID
   * @returns {Object} - Entity data
   */
  getEntity(id) {
    if (!this.entities.has(id)) {
      throw new Error(`Unknown entity ID: ${id}`);
    }
    
    return { ...this.entities.get(id) };
  }
  
  /**
   * Update entity properties
   * @param {String} id - Entity ID
   * @param {Object} properties - Properties to update
   * @returns {Object} - Updated entity
   */
  updateEntity(id, properties) {
    if (!this.entities.has(id)) {
      throw new Error(`Unknown entity ID: ${id}`);
    }
    
    const entity = this.entities.get(id);
    this.entities.set(id, { ...entity, ...properties });
    
    return this.entities.get(id);
  }
  
  /**
   * Add a new action type
   * @param {String} type - Action type
   * @param {Object} actionData - Action data
   * @returns {Object} - Added action
   */
  addActionType(type, actionData) {
    this.actions.set(type, { ...actionData });
    return this.actions.get(type);
  }
  
  /**
   * Get observation from current state
   * @returns {Object} - Observation
   * @private
   */
  _getObservation() {
    return {
      context: [...this.context],
      entities: Array.from(this.entities.entries()).map(([id, entity]) => ({
        id,
        type: entity.type,
        name: entity.name,
        description: entity.description,
        visible: entity.visible !== false
      }))
    };
  }
  
  /**
   * Initialize action types
   * @private
   */
  _initializeActions() {
    // Default action types
    const defaultActions = {
      look: {
        templates: ['look', 'look around', 'examine {entity}', 'inspect {entity}'],
        handler: this._handleLookAction.bind(this)
      },
      move: {
        templates: ['go to {location}', 'move to {location}', 'walk to {location}'],
        handler: this._handleMoveAction.bind(this)
      },
      take: {
        templates: ['take {item}', 'pick up {item}', 'grab {item}'],
        handler: this._handleTakeAction.bind(this)
      },
      use: {
        templates: ['use {item}', 'use {item} on {target}', 'activate {item}'],
        handler: this._handleUseAction.bind(this)
      },
      talk: {
        templates: ['talk to {character}', 'speak with {character}', 'ask {character} about {topic}'],
        handler: this._handleTalkAction.bind(this)
      }
    };
    
    // Add default actions
    for (const [type, actionData] of Object.entries(defaultActions)) {
      this.actions.set(type, actionData);
    }
    
    // Add custom actions from config
    if (this.config.actions) {
      for (const [type, actionData] of Object.entries(this.config.actions)) {
        this.actions.set(type, { ...actionData });
      }
    }
  }
  
  /**
   * Initialize entities
   * @private
   */
  _initializeEntities() {
    // Add entities from config
    if (this.config.entities) {
      for (const [id, entityData] of Object.entries(this.config.entities)) {
        this.entities.set(id, { ...entityData });
      }
    }
  }
  
  /**
   * Reset entities to initial state
   * @private
   */
  _resetEntities() {
    this.entities.clear();
    
    // Add entities from config
    if (this.config.entities) {
      for (const [id, entityData] of Object.entries(this.config.entities)) {
        this.entities.set(id, { ...entityData });
      }
    }
  }
  
  /**
   * Initialize natural language parser
   * @private
   */
  _initializeParser() {
    // This is a simple parser implementation
    // In a real implementation, this would use more sophisticated NLP techniques
    
    this.parser = {
      parse: (text) => {
        // Simple rule-based parsing
        text = text.toLowerCase();
        
        // Check each action type
        for (const [type, actionData] of this.actions.entries()) {
          for (const template of actionData.templates) {
            // Convert template to regex pattern
            const pattern = template
              .replace(/\{(\w+)\}/g, '(?<$1>[\\w\\s]+)')
              .replace(/\s+/g, '\\s+');
            
            const regex = new RegExp(`^${pattern}$`, 'i');
            const match = text.match(regex);
            
            if (match) {
              return {
                type,
                params: match.groups || {}
              };
            }
          }
        }
        
        // No match found, try to guess intent
        if (text.includes('look') || text.includes('examine') || text.includes('inspect')) {
          return { type: 'look', params: {} };
        } else if (text.includes('go') || text.includes('move') || text.includes('walk')) {
          return { type: 'move', params: {} };
        } else if (text.includes('take') || text.includes('pick') || text.includes('grab')) {
          return { type: 'take', params: {} };
        } else if (text.includes('use') || text.includes('activate')) {
          return { type: 'use', params: {} };
        } else if (text.includes('talk') || text.includes('speak') || text.includes('ask')) {
          return { type: 'talk', params: {} };
        }
        
        // Default to look action
        return { type: 'look', params: {} };
      }
    };
  }
  
  /**
   * Parse natural language action
   * @param {String} action - Natural language action
   * @returns {Object} - Parsed action
   * @private
   */
  _parseAction(action) {
    if (!this.parser) {
      throw new Error('Parser must be initialized before parsing actions');
    }
    
    return this.parser.parse(action);
  }
  
  /**
   * Process parsed action
   * @param {Object} parsedAction - Parsed action
   * @returns {Object} - Action result
   * @private
   */
  _processAction(parsedAction) {
    if (!parsedAction) {
      return {
        response: "I don't understand that action.",
        reward: -0.1,
        done: false,
        info: { success: false, error: 'invalid_action' }
      };
    }
    
    const { type, params } = parsedAction;
    
    if (!this.actions.has(type)) {
      return {
        response: `Action type '${type}' is not supported.`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'unknown_action_type' }
      };
    }
    
    const actionData = this.actions.get(type);
    
    if (!actionData.handler) {
      return {
        response: `No handler defined for action type '${type}'.`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'no_handler' }
      };
    }
    
    // Call action handler
    return actionData.handler(params);
  }
  
  /**
   * Handle 'look' action
   * @param {Object} params - Action parameters
   * @returns {Object} - Action result
   * @private
   */
  _handleLookAction(params) {
    if (params.entity) {
      // Look at specific entity
      const entityName = params.entity.toLowerCase();
      const entity = Array.from(this.entities.values()).find(
        e => e.name.toLowerCase() === entityName
      );
      
      if (entity && entity.visible !== false) {
        return {
          response: entity.description || `You see ${entity.name}.`,
          reward: 0.1,
          done: false,
          info: { success: true, entity: entity.id }
        };
      } else {
        return {
          response: `You don't see any ${entityName} here.`,
          reward: -0.05,
          done: false,
          info: { success: false, error: 'entity_not_found' }
        };
      }
    } else {
      // Look around
      const visibleEntities = Array.from(this.entities.values())
        .filter(e => e.visible !== false);
      
      if (visibleEntities.length === 0) {
        return {
          response: "There's nothing interesting to see here.",
          reward: 0,
          done: false,
          info: { success: true }
        };
      }
      
      const description = `You see: ${visibleEntities.map(e => e.name).join(', ')}.`;
      
      return {
        response: description,
        reward: 0.1,
        done: false,
        info: { success: true, entities: visibleEntities.map(e => e.id) }
      };
    }
  }
  
  /**
   * Handle 'move' action
   * @param {Object} params - Action parameters
   * @returns {Object} - Action result
   * @private
   */
  _handleMoveAction(params) {
    if (!params.location) {
      return {
        response: "Where do you want to move to?",
        reward: -0.05,
        done: false,
        info: { success: false, error: 'missing_location' }
      };
    }
    
    const locationName = params.location.toLowerCase();
    const location = Array.from(this.entities.values()).find(
      e => e.type === 'location' && e.name.toLowerCase() === locationName
    );
    
    if (!location) {
      return {
        response: `You can't find a way to ${locationName}.`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'location_not_found' }
      };
    }
    
    if (location.accessible === false) {
      return {
        response: `You can't go to ${location.name}. ${location.accessFailMessage || ''}`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'location_not_accessible' }
      };
    }
    
    // Update current location
    this.state.currentLocation = location.id;
    
    // Update visible entities based on location
    for (const [id, entity] of this.entities.entries()) {
      if (entity.location === location.id) {
        this.entities.set(id, { ...entity, visible: true });
      } else if (entity.type !== 'location') {
        this.entities.set(id, { ...entity, visible: false });
      }
    }
    
    return {
      response: `You move to ${location.name}. ${location.description || ''}`,
      reward: 0.2,
      done: location.isGoal === true,
      info: { success: true, location: location.id }
    };
  }
  
  /**
   * Handle 'take' action
   * @param {Object} params - Action parameters
   * @returns {Object} - Action result
   * @private
   */
  _handleTakeAction(params) {
    if (!params.item) {
      return {
        response: "What do you want to take?",
        reward: -0.05,
        done: false,
        info: { success: false, error: 'missing_item' }
      };
    }
    
    const itemName = params.item.toLowerCase();
    const item = Array.from(this.entities.entries()).find(
      ([id, e]) => e.type === 'item' && e.name.toLowerCase() === itemName && e.visible !== false
    );
    
    if (!item) {
      return {
        response: `You don't see any ${itemName} to take.`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'item_not_found' }
      };
    }
    
    const [itemId, itemData] = item;
    
    if (itemData.takeable === false) {
      return {
        response: `You can't take the ${itemData.name}. ${itemData.takeFailMessage || ''}`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'item_not_takeable' }
      };
    }
    
    // Add to inventory
    this.entities.set(itemId, { 
      ...itemData, 
      location: 'inventory',
      visible: true
    });
    
    return {
      response: `You take the ${itemData.name}. ${itemData.takeSuccessMessage || ''}`,
      reward: 0.3,
      done: false,
      info: { success: true, item: itemId }
    };
  }
  
  /**
   * Handle 'use' action
   * @param {Object} params - Action parameters
   * @returns {Object} - Action result
   * @private
   */
  _handleUseAction(params) {
    if (!params.item) {
      return {
        response: "What do you want to use?",
        reward: -0.05,
        done: false,
        info: { success: false, error: 'missing_item' }
      };
    }
    
    const itemName = params.item.toLowerCase();
    const item = Array.from(this.entities.entries()).find(
      ([id, e]) => e.name.toLowerCase() === itemName && 
                  (e.location === 'inventory' || e.visible !== false)
    );
    
    if (!item) {
      return {
        response: `You don't have ${itemName} to use.`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'item_not_available' }
      };
    }
    
    const [itemId, itemData] = item;
    
    if (params.target) {
      // Use item on target
      const targetName = params.target.toLowerCase();
      const target = Array.from(this.entities.entries()).find(
        ([id, e]) => e.name.toLowerCase() === targetName && e.visible !== false
      );
      
      if (!target) {
        return {
          response: `You don't see any ${targetName} to use the ${itemData.name} on.`,
          reward: -0.1,
          done: false,
          info: { success: false, error: 'target_not_found' }
        };
      }
      
      const [targetId, targetData] = target;
      
      // Check if this combination has a special handler
      const combinationId = `${itemId}_${targetId}`;
      if (this.config.itemCombinations && this.config.itemCombinations[combinationId]) {
        const combination = this.config.itemCombinations[combinationId];
        
        // Apply combination effects
        if (combination.effects) {
          for (const [entityId, effects] of Object.entries(combination.effects)) {
            if (this.entities.has(entityId)) {
              this.entities.set(entityId, { 
                ...this.entities.get(entityId), 
                ...effects 
              });
            }
          }
        }
        
        return {
          response: combination.message || `You use the ${itemData.name} on the ${targetData.name}.`,
          reward: combination.reward || 0.5,
          done: combination.isGoal === true,
          info: { success: true, item: itemId, target: targetId }
        };
      }
      
      // Default response
      return {
        response: `You use the ${itemData.name} on the ${targetData.name}, but nothing happens.`,
        reward: 0.1,
        done: false,
        info: { success: true, item: itemId, target: targetId }
      };
    } else {
      // Use item by itself
      if (!itemData.useEffect) {
        return {
          response: `You use the ${itemData.name}, but nothing happens.`,
          reward: 0.1,
          done: false,
          info: { success: true, item: itemId }
        };
      }
      
      // Apply use effects
      if (itemData.useEffect.effects) {
        for (const [entityId, effects] of Object.entries(itemData.useEffect.effects)) {
          if (this.entities.has(entityId)) {
            this.entities.set(entityId, { 
              ...this.entities.get(entityId), 
              ...effects 
            });
          }
        }
      }
      
      return {
        response: itemData.useEffect.message || `You use the ${itemData.name}.`,
        reward: itemData.useEffect.reward || 0.3,
        done: itemData.useEffect.isGoal === true,
        info: { success: true, item: itemId }
      };
    }
  }
  
  /**
   * Handle 'talk' action
   * @param {Object} params - Action parameters
   * @returns {Object} - Action result
   * @private
   */
  _handleTalkAction(params) {
    if (!params.character) {
      return {
        response: "Who do you want to talk to?",
        reward: -0.05,
        done: false,
        info: { success: false, error: 'missing_character' }
      };
    }
    
    const characterName = params.character.toLowerCase();
    const character = Array.from(this.entities.entries()).find(
      ([id, e]) => e.type === 'character' && e.name.toLowerCase() === characterName && e.visible !== false
    );
    
    if (!character) {
      return {
        response: `You don't see ${characterName} here to talk to.`,
        reward: -0.1,
        done: false,
        info: { success: false, error: 'character_not_found' }
      };
    }
    
    const [characterId, characterData] = character;
    
    if (params.topic) {
      // Talk about specific topic
      const topicName = params.topic.toLowerCase();
      
      if (characterData.dialogues && characterData.dialogues[topicName]) {
        const dialogue = characterData.dialogues[topicName];
        
        // Apply dialogue effects
        if (dialogue.effects) {
          for (const [entityId, effects] of Object.entries(dialogue.effects)) {
            if (this.entities.has(entityId)) {
              this.entities.set(entityId, { 
                ...this.entities.get(entityId), 
                ...effects 
              });
            }
          }
        }
        
        return {
          response: `${characterData.name}: "${dialogue.text}"`,
          reward: dialogue.reward || 0.4,
          done: dialogue.isGoal === true,
          info: { success: true, character: characterId, topic: topicName }
        };
      } else {
        return {
          response: `${characterData.name}: "I don't know anything about ${topicName}."`,
          reward: 0.1,
          done: false,
          info: { success: true, character: characterId, topic: topicName }
        };
      }
    } else {
      // General conversation
      if (!characterData.greeting) {
        return {
          response: `${characterData.name} nods at you but doesn't say anything.`,
          reward: 0.1,
          done: false,
          info: { success: true, character: characterId }
        };
      }
      
      return {
        response: `${characterData.name}: "${characterData.greeting}"`,
        reward: 0.2,
        done: false,
        info: { success: true, character: characterId }
      };
    }
  }
  
  /**
   * Validate configuration parameters
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validated configuration
   * @protected
   */
  _validateConfig(config) {
    const parentConfig = super._validateConfig(config);
    
    const defaultConfig = {
      language: 'english',
      maxContextLength: 20,
      initialPrompt: 'You are in a natural language environment.',
      vocabulary: [],
      entities: {},
      actions: {},
      itemCombinations: {}
    };
    
    return { ...defaultConfig, ...parentConfig };
  }
}

module.exports = NaturalLanguageEnvironment;
