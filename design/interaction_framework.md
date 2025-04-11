# Interaction Framework Design

## Overview
The Interaction Framework enables communication between agents and with the environment. It provides standardized protocols for message passing, environment sensing and manipulation, and collaboration mechanisms.

## Class Structure

### InteractionFramework
Main class responsible for managing agent interactions.

```
class InteractionFramework {
  constructor(config)
  async initialize()
  async start()
  async stop()
  async createChannel(channelId, options)
  async removeChannel(channelId)
  async sendMessage(fromAgentId, toAgentId, message, channelId)
  async broadcastMessage(fromAgentId, message, channelId)
  async subscribeToChannel(agentId, channelId, callback)
  async unsubscribeFromChannel(agentId, channelId)
  getChannelHistory(channelId, limit)
}
```

### CommunicationManager
Handles message passing between agents.

```
class CommunicationManager {
  constructor(config)
  async initialize()
  async createChannel(channelId, options)
  async removeChannel(channelId)
  async sendMessage(fromAgentId, toAgentId, message, channelId)
  async broadcastMessage(fromAgentId, message, channelId)
  async subscribeToChannel(agentId, channelId, callback)
  async unsubscribeFromChannel(agentId, channelId)
  getChannelHistory(channelId, limit)
  validateMessage(message)
}
```

### EnvironmentManager
Provides APIs for agents to sense and affect the environment.

```
class EnvironmentManager {
  constructor(config)
  async initialize()
  async createEnvironment(environmentId, options)
  async destroyEnvironment(environmentId)
  async getEnvironmentState(environmentId, agentId)
  async performAction(environmentId, agentId, action)
  async registerSensor(environmentId, agentId, sensorType, options)
  async unregisterSensor(environmentId, agentId, sensorId)
  async getSensorData(environmentId, agentId, sensorId)
}
```

### CollaborationManager
Facilitates collaboration between agents.

```
class CollaborationManager {
  constructor(config)
  async initialize()
  async createTeam(teamId, options)
  async addAgentToTeam(teamId, agentId, role)
  async removeAgentFromTeam(teamId, agentId)
  async getTeamMembers(teamId)
  async createSharedMemory(teamId, memoryId, options)
  async readSharedMemory(teamId, memoryId, agentId)
  async writeSharedMemory(teamId, memoryId, agentId, data)
  async distributeTask(teamId, task, strategy)
}
```

### EventSystem
Manages event publishing and subscription.

```
class EventSystem {
  constructor(config)
  async initialize()
  async publishEvent(publisherId, eventType, eventData)
  async subscribeToEvent(subscriberId, eventType, callback)
  async unsubscribeFromEvent(subscriberId, eventType)
  getEventHistory(eventType, limit)
}
```

## Interfaces

### Message Interface
```javascript
/**
 * Message format
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} fromAgentId - Sender agent ID
 * @property {string} toAgentId - Recipient agent ID (null for broadcasts)
 * @property {string} channelId - Channel ID
 * @property {string} type - Message type
 * @property {Object} content - Message content
 * @property {number} timestamp - Message timestamp
 * @property {Object} metadata - Additional metadata
 */
```

### Environment State Interface
```javascript
/**
 * Environment state
 * @typedef {Object} EnvironmentState
 * @property {string} environmentId - Environment ID
 * @property {Object} state - Current environment state
 * @property {Array<Object>} entities - Entities in the environment
 * @property {Object} physics - Physics properties
 * @property {Object} boundaries - Environment boundaries
 * @property {number} timestamp - State timestamp
 */
```

### Action Interface
```javascript
/**
 * Agent action
 * @typedef {Object} Action
 * @property {string} actionId - Action ID
 * @property {string} agentId - Agent ID
 * @property {string} type - Action type
 * @property {Object} parameters - Action parameters
 * @property {number} timestamp - Action timestamp
 */
```

### Sensor Interface
```javascript
/**
 * Sensor configuration
 * @typedef {Object} Sensor
 * @property {string} sensorId - Sensor ID
 * @property {string} agentId - Agent ID
 * @property {string} type - Sensor type
 * @property {Object} parameters - Sensor parameters
 * @property {number} updateFrequency - Update frequency in Hz
 */
```

## Implementation Details

### Message Passing
The CommunicationManager will implement message passing using an event emitter pattern:

```javascript
const EventEmitter = require('events');

class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.channels = new Map();
  }
  
  createChannel(channelId, options) {
    this.channels.set(channelId, {
      id: channelId,
      options,
      history: [],
      subscribers: new Set()
    });
  }
  
  sendMessage(message, channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    
    // Store in history
    channel.history.push(message);
    if (channel.history.length > channel.options.historyLimit) {
      channel.history.shift();
    }
    
    // Emit message event
    this.emit(`message:${channelId}`, message);
    
    return message.id;
  }
  
  subscribeToChannel(agentId, channelId, callback) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    
    channel.subscribers.add(agentId);
    this.on(`message:${channelId}`, callback);
  }
}
```

### Environment Interaction
The EnvironmentManager will provide a virtual environment for agents:

```javascript
class VirtualEnvironment {
  constructor(id, options) {
    this.id = id;
    this.options = options;
    this.state = this._createInitialState();
    this.entities = new Map();
    this.sensors = new Map();
    this.lastUpdate = Date.now();
  }
  
  _createInitialState() {
    return {
      time: 0,
      physics: {
        gravity: this.options.gravity || 9.8,
        friction: this.options.friction || 0.1
      },
      boundaries: this.options.boundaries || {
        x: [0, 1000],
        y: [0, 1000],
        z: [0, 1000]
      }
    };
  }
  
  update(deltaTime) {
    // Update physics
    this._updatePhysics(deltaTime);
    
    // Update entities
    for (const entity of this.entities.values()) {
      this._updateEntity(entity, deltaTime);
    }
    
    // Update sensors
    for (const sensor of this.sensors.values()) {
      if (Date.now() - sensor.lastUpdate >= (1000 / sensor.updateFrequency)) {
        sensor.data = this._getSensorData(sensor);
        sensor.lastUpdate = Date.now();
      }
    }
    
    this.state.time += deltaTime;
    this.lastUpdate = Date.now();
  }
  
  getStateForAgent(agentId) {
    // Filter state based on agent's sensors and visibility
    const agent = this.entities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in environment`);
    }
    
    const visibleEntities = this._getVisibleEntities(agent);
    const sensorData = this._getAgentSensorData(agentId);
    
    return {
      environmentId: this.id,
      time: this.state.time,
      position: agent.position,
      entities: visibleEntities,
      sensors: sensorData
    };
  }
  
  performAction(agentId, action) {
    const agent = this.entities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in environment`);
    }
    
    switch (action.type) {
      case 'move':
        agent.position = {
          x: agent.position.x + action.parameters.dx,
          y: agent.position.y + action.parameters.dy,
          z: agent.position.z + action.parameters.dz
        };
        break;
      case 'interact':
        const targetEntity = this.entities.get(action.parameters.targetId);
        if (targetEntity) {
          this._handleInteraction(agent, targetEntity, action.parameters);
        }
        break;
      // Other action types...
    }
    
    return true;
  }
}
```

### Collaboration Mechanisms
The CollaborationManager will implement team formation and shared memory:

```javascript
class Team {
  constructor(id, options) {
    this.id = id;
    this.options = options;
    this.members = new Map();
    this.sharedMemory = new Map();
  }
  
  addMember(agentId, role) {
    this.members.set(agentId, {
      id: agentId,
      role,
      joinedAt: Date.now()
    });
  }
  
  removeMember(agentId) {
    this.members.delete(agentId);
  }
  
  createSharedMemory(memoryId, options) {
    this.sharedMemory.set(memoryId, {
      id: memoryId,
      options,
      data: {},
      accessLog: []
    });
  }
  
  readSharedMemory(memoryId, agentId) {
    const memory = this.sharedMemory.get(memoryId);
    if (!memory) {
      throw new Error(`Shared memory ${memoryId} not found`);
    }
    
    // Check access permissions
    if (!this._canAccess(agentId, memory, 'read')) {
      throw new Error(`Agent ${agentId} does not have read access to memory ${memoryId}`);
    }
    
    // Log access
    memory.accessLog.push({
      agentId,
      operation: 'read',
      timestamp: Date.now()
    });
    
    return memory.data;
  }
  
  writeSharedMemory(memoryId, agentId, data) {
    const memory = this.sharedMemory.get(memoryId);
    if (!memory) {
      throw new Error(`Shared memory ${memoryId} not found`);
    }
    
    // Check access permissions
    if (!this._canAccess(agentId, memory, 'write')) {
      throw new Error(`Agent ${agentId} does not have write access to memory ${memoryId}`);
    }
    
    // Update data
    memory.data = { ...memory.data, ...data };
    
    // Log access
    memory.accessLog.push({
      agentId,
      operation: 'write',
      timestamp: Date.now(),
      dataKeys: Object.keys(data)
    });
    
    return true;
  }
  
  _canAccess(agentId, memory, operation) {
    const member = this.members.get(agentId);
    if (!member) {
      return false;
    }
    
    // Check role-based permissions
    const role = member.role;
    const permissions = memory.options.permissions || {};
    
    if (operation === 'read') {
      return permissions.read === 'all' || 
             (permissions.read === 'role' && permissions.roles[role]?.read) ||
             permissions.agents?.[agentId]?.read;
    } else if (operation === 'write') {
      return permissions.write === 'all' || 
             (permissions.write === 'role' && permissions.roles[role]?.write) ||
             permissions.agents?.[agentId]?.write;
    }
    
    return false;
  }
}
```

### Event System
The EventSystem will implement a publish-subscribe pattern:

```javascript
class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.history = new Map();
  }
  
  publishEvent(publisherId, eventType, eventData) {
    const event = {
      id: uuidv4(),
      publisherId,
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    };
    
    // Store in history
    if (!this.history.has(eventType)) {
      this.history.set(eventType, []);
    }
    
    const typeHistory = this.history.get(eventType);
    typeHistory.push(event);
    
    // Limit history size
    const maxHistory = 1000;
    if (typeHistory.length > maxHistory) {
      typeHistory.shift();
    }
    
    // Notify subscribers
    const subscribers = this.subscribers.get(eventType) || new Map();
    for (const [subscriberId, callback] of subscribers.entries()) {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error notifying subscriber ${subscriberId} for event ${eventType}:`, error);
      }
    }
    
    return event.id;
  }
  
  subscribeToEvent(subscriberId, eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }
    
    const typeSubscribers = this.subscribers.get(eventType);
    typeSubscribers.set(subscriberId, callback);
  }
  
  unsubscribeFromEvent(subscriberId, eventType) {
    if (!this.subscribers.has(eventType)) {
      return false;
    }
    
    const typeSubscribers = this.subscribers.get(eventType);
    return typeSubscribers.delete(subscriberId);
  }
  
  getEventHistory(eventType, limit = 100) {
    if (!this.history.has(eventType)) {
      return [];
    }
    
    const typeHistory = this.history.get(eventType);
    return typeHistory.slice(-limit);
  }
}
```

## Error Handling

The InteractionFramework will implement comprehensive error handling:

```javascript
try {
  // Operation that might fail
} catch (error) {
  if (error.code === 'CHANNEL_NOT_FOUND') {
    // Channel not found
    logger.warn(`Channel ${channelId} not found`);
    return null;
  } else if (error.code === 'AGENT_NOT_AUTHORIZED') {
    // Agent not authorized
    logger.warn(`Agent ${agentId} not authorized for channel ${channelId}`);
    return { error: 'Not authorized', code: 403 };
  } else {
    // Other error
    logger.error(`Interaction operation failed: ${error.message}`, error);
    throw error;
  }
}
```

## Integration Points

The InteractionFramework will integrate with:

1. **Runtime Environment**: To execute agent code in response to messages and events
2. **Evolution Mechanisms**: To provide feedback for learning and adaptation
3. **Evaluation System**: To measure agent interaction performance
4. **User Interface**: To visualize agent interactions

## Implementation Plan

1. Create basic directory structure
2. Implement CommunicationManager with message passing
3. Implement EnvironmentManager with basic virtual environment
4. Implement CollaborationManager with team formation
5. Implement EventSystem with publish-subscribe
6. Integrate components into InteractionFramework class
7. Add comprehensive error handling and logging
8. Write unit and integration tests
