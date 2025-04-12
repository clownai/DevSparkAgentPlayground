# Multi-Agent Example Environments

This directory contains a collection of example environments that showcase different aspects of multi-agent reinforcement learning. Each environment is designed to demonstrate specific capabilities of the multi-agent system.

## Overview

The examples are organized to highlight different aspects of multi-agent systems:

1. **Team Cooperation Environment**: Demonstrates how agents can work together to achieve goals that would be impossible for individual agents.
2. **Competitive Environment**: Shows how agents can compete for resources and territory in a zero-sum setting.
3. **Mixed Cooperative-Competitive Environment**: Illustrates how agents can cooperate within teams while competing against other teams.
4. **Communication-Dependent Environment**: Demonstrates how agents can solve problems that require information sharing.
5. **Reward Structure Examples**: Shows how different reward structures affect agent behavior and cooperation patterns.

All environments extend the `BaseMultiAgentEnvironment` class and implement the standard environment interface, making them compatible with the rest of the framework.

## Common Features

All example environments share these common features:

- **Grid-World Based**: Agents navigate in a 2D grid world with obstacles and other entities.
- **Observation Spaces**: Agents receive local observations of their surroundings.
- **Action Spaces**: Agents can perform actions like movement, interaction with objects, and communication.
- **Reward Functions**: Customized reward functions that encourage specific behaviors.
- **Rendering**: Support for human-readable and machine-readable rendering modes.
- **Dynamic Agent Management**: Ability to add and remove agents during runtime.

## Environment Details

### 1. Team Cooperation Environment: Resource Collection

A grid-world environment where agents must work together to collect resources and deliver them to a central depot. The task requires coordination as some resources are too heavy for a single agent to carry.

**Key Features:**
- Different resource types requiring different numbers of agents to carry
- Help request mechanism for coordination
- Team-based rewards
- Local observations with limited view distance

**Example Usage:**
```typescript
import { TeamCooperationEnvironment } from './TeamCooperationEnvironment';

// Create environment
const env = new TeamCooperationEnvironment({
  gridSize: 10,
  maxStepsPerEpisode: 100,
  numResources: 10,
  requiredResources: 5,
  agents: [
    { id: 'agent1' },
    { id: 'agent2' },
    { id: 'agent3' }
  ]
});

// Reset environment
const initialObservations = env.reset();

// Run episode
let done = false;
while (!done) {
  // Get actions from agents (in a real scenario, these would come from agent policies)
  const actions = {};
  for (const agentId of env.getAgentIds()) {
    actions[agentId] = {
      action: Math.floor(Math.random() * 7) // Random action
    };
  }
  
  // Step environment
  const results = env.step(actions);
  
  // Render environment
  env.render();
  
  // Check if episode is done
  done = Object.values(results).some(result => result.done);
}
```

### 2. Competitive Environment: Territory Control

A grid-world environment where agents compete to control territory and collect resources. Agents can claim territory and steal resources from opponents.

**Key Features:**
- Territory claiming and contesting mechanics
- Resource collection and theft
- Combat system based on agent strength
- Zero-sum reward structure
- Resource generators on territory cells

**Example Usage:**
```typescript
import { CompetitiveEnvironment } from './CompetitiveEnvironment';

// Create environment
const env = new CompetitiveEnvironment({
  gridSize: 12,
  maxStepsPerEpisode: 200,
  maxResources: 20,
  agents: [
    { id: 'agent1' },
    { id: 'agent2' },
    { id: 'agent3' },
    { id: 'agent4' }
  ]
});

// Reset environment
const initialObservations = env.reset();

// Run episode
let done = false;
while (!done) {
  // Get actions from agents
  const actions = {};
  for (const agentId of env.getAgentIds()) {
    actions[agentId] = {
      action: Math.floor(Math.random() * 7) // Random action
    };
  }
  
  // Step environment
  const results = env.step(actions);
  
  // Render environment
  env.render();
  
  // Check if episode is done
  done = env.getCurrentStep() >= env.getMaxStepsPerEpisode();
}
```

### 3. Mixed Cooperative-Competitive Environment: Team Capture the Flag

A team-based competitive environment where two teams of agents compete to capture the opposing team's flag while defending their own.

**Key Features:**
- Team-based mechanics with distinct territories
- Flag capture objectives
- Tagging system for defense
- Flag passing between teammates
- Mixed reward structure (individual and team components)
- Team communication

**Example Usage:**
```typescript
import { CaptureTheFlagEnvironment, Team } from './CaptureTheFlagEnvironment';

// Create environment
const env = new CaptureTheFlagEnvironment({
  gridWidth: 20,
  gridHeight: 10,
  maxStepsPerEpisode: 300,
  agents: [
    { id: 'agent1', team: Team.TEAM_A },
    { id: 'agent2', team: Team.TEAM_A },
    { id: 'agent3', team: Team.TEAM_A },
    { id: 'agent4', team: Team.TEAM_B },
    { id: 'agent5', team: Team.TEAM_B },
    { id: 'agent6', team: Team.TEAM_B }
  ]
});

// Reset environment
const initialObservations = env.reset();

// Run episode
let done = false;
while (!done) {
  // Get actions from agents
  const actions = {};
  for (const agentId of env.getAgentIds()) {
    actions[agentId] = {
      action: Math.floor(Math.random() * 8), // Random action
      message: {
        to: 'team',
        content: { type: 'status', position: initialObservations[agentId].position }
      }
    };
  }
  
  // Step environment
  const results = env.step(actions);
  
  // Render environment
  env.render();
  
  // Check if episode is done
  done = env.getCurrentStep() >= env.getMaxStepsPerEpisode();
}
```

### 4. Communication-Dependent Environment: Collaborative Puzzle Solving

A grid-world environment where agents must solve a puzzle that requires sharing information. Each agent can only see part of the solution, and they must communicate to solve the complete puzzle.

**Key Features:**
- Information asymmetry (different agent specializations)
- Communication-critical tasks
- Puzzle elements with different visibility to different agents
- Solution nodes requiring information from multiple agents
- Team-based rewards

**Example Usage:**
```typescript
import { PuzzleSolvingEnvironment, PuzzleElementType } from './PuzzleSolvingEnvironment';

// Create environment
const env = new PuzzleSolvingEnvironment({
  gridSize: 15,
  maxStepsPerEpisode: 150,
  numPuzzleElements: 20,
  numSolutionNodes: 4,
  agents: [
    { id: 'agent1', specialization: PuzzleElementType.SYMBOL },
    { id: 'agent2', specialization: PuzzleElementType.PATTERN },
    { id: 'agent3', specialization: PuzzleElementType.COLOR },
    { id: 'agent4', specialization: PuzzleElementType.NUMBER }
  ]
});

// Reset environment
const initialObservations = env.reset();

// Run episode
let done = false;
while (!done) {
  // Get actions from agents
  const actions = {};
  for (const agentId of env.getAgentIds()) {
    // In a real scenario, agents would share information about observed elements
    actions[agentId] = {
      action: Math.floor(Math.random() * 7), // Random action
      message: {
        to: 'broadcast',
        content: { type: 'info', data: 'random message' }
      }
    };
  }
  
  // Step environment
  const results = env.step(actions);
  
  // Render environment
  env.render();
  
  // Check if episode is done
  done = Object.values(results).some(result => result.done);
}
```

### 5. Reward Structure Examples: Resource Allocation Scenarios

A set of similar environments with different reward structures to demonstrate how reward design affects agent behavior and cooperation patterns.

**Key Features:**
- Four reward structures: Individual, Team, Mixed, Zero-Sum
- Resource collection and allocation mechanics
- Configurable team assignments
- Goals with different values
- Factory function for easy creation of different reward scenarios

**Example Usage:**
```typescript
import { createRewardStructureEnvironment, RewardType } from './ResourceAllocationEnvironment';

// Create individual reward environment
const individualEnv = createRewardStructureEnvironment(RewardType.INDIVIDUAL, {
  gridSize: 8,
  maxStepsPerEpisode: 100,
  agents: [
    { id: 'agent1' },
    { id: 'agent2' },
    { id: 'agent3' },
    { id: 'agent4' }
  ]
});

// Create team reward environment
const teamEnv = createRewardStructureEnvironment(RewardType.TEAM, {
  gridSize: 8,
  maxStepsPerEpisode: 100,
  agents: [
    { id: 'agent1', team: 'team1' },
    { id: 'agent2', team: 'team1' },
    { id: 'agent3', team: 'team1' },
    { id: 'agent4', team: 'team1' }
  ]
});

// Create mixed reward environment
const mixedEnv = createRewardStructureEnvironment(RewardType.MIXED, {
  gridSize: 8,
  maxStepsPerEpisode: 100,
  agents: [
    { id: 'agent1', team: 'team1' },
    { id: 'agent2', team: 'team1' },
    { id: 'agent3', team: 'team1' },
    { id: 'agent4', team: 'team1' }
  ]
});

// Create zero-sum reward environment
const zeroSumEnv = createRewardStructureEnvironment(RewardType.ZERO_SUM, {
  gridSize: 8,
  maxStepsPerEpisode: 100,
  agents: [
    { id: 'agent1' },
    { id: 'agent2' },
    { id: 'agent3' },
    { id: 'agent4' }
  ]
});

// Choose environment to run
const env = individualEnv;
const initialObservations = env.reset();

// Run episode
let done = false;
while (!done) {
  // Get actions from agents
  const actions = {};
  for (const agentId of env.getAgentIds()) {
    actions[agentId] = {
      action: Math.floor(Math.random() * 6) // Random action
    };
  }
  
  // Step environment
  const results = env.step(actions);
  
  // Render environment
  env.render();
  
  // Check if episode is done
  done = Object.values(results).some(result => result.done) || 
         env.getCurrentStep() >= env.getMaxStepsPerEpisode();
}
```

## Extending the Examples

These examples are designed to be easily extended and modified. Here are some ways you can build upon them:

1. **Add New Agent Types**: Create specialized agents with different capabilities.
2. **Modify Reward Functions**: Experiment with different reward structures to encourage specific behaviors.
3. **Add New Environment Features**: Introduce new elements like power-ups, traps, or dynamic obstacles.
4. **Implement Learning Algorithms**: Use these environments to test reinforcement learning algorithms.
5. **Create Hybrid Environments**: Combine features from different examples to create more complex scenarios.

## Integration with the Framework

All example environments are fully integrated with the multi-agent framework:

- They extend `BaseMultiAgentEnvironment` and implement all required methods.
- They support the standard environment interface (`reset()`, `step()`, `render()`, etc.).
- They work with the visualization system for monitoring and debugging.
- They can be used with the experiment runner for systematic evaluation.

## Performance Considerations

When using these environments, keep in mind:

- Grid size significantly affects performance, especially with many agents.
- Complex observation spaces may slow down learning algorithms.
- Communication-heavy environments may require more computational resources.
- Rendering in 'human' mode is useful for debugging but can slow down execution.

## Contributing

Feel free to contribute to these examples by:

1. Adding new environment types
2. Improving existing environments
3. Adding new features to existing environments
4. Creating better visualization tools
5. Documenting interesting emergent behaviors

## License

These examples are released under the same license as the main project.
