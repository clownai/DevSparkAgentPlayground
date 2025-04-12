# Multi-Agent Example Environment Specifications

This document outlines the specifications for five example environments that showcase different aspects of the multi-agent system capabilities.

## 1. Team Cooperation Environment: Resource Collection

### Overview
A grid-world environment where agents must work together to collect resources and deliver them to a central depot. The task requires coordination as some resources are too heavy for a single agent to carry.

### Environment Details
- **Grid Size**: 10x10
- **Agents**: 3-5 agents on the same team
- **Resources**: Multiple resource types (light, medium, heavy)
  - Light: Can be carried by a single agent
  - Medium: Requires 2 agents to carry
  - Heavy: Requires 3 agents to carry
- **Depot**: Central location where resources must be delivered
- **Obstacles**: Static obstacles that agents must navigate around
- **Time Limit**: 100 steps per episode

### Agent Capabilities
- **Actions**: Move (up, down, left, right), Pick up, Drop, Help (join another agent to carry a resource)
- **Observations**: 
  - Local view of the grid (5x5 centered on agent)
  - Position of nearby agents
  - Position and type of nearby resources
  - Whether the agent is currently carrying a resource
  - Whether other nearby agents are requesting help
- **Communication**: Agents can send help requests to nearby agents

### Reward Structure
- **Type**: Team reward
- **Rewards**:
  - +1 for delivering a light resource
  - +3 for delivering a medium resource
  - +5 for delivering a heavy resource
  - -0.01 per step (small penalty to encourage efficiency)
  - -0.5 for invalid actions (e.g., trying to pick up a heavy resource alone)

### Success Criteria
- Team must collect and deliver a specified number of resources within the time limit
- Heavier resources provide more points but require coordination

## 2. Competitive Environment: Territory Control

### Overview
A grid-world environment where agents compete to control territory and collect resources. Agents can claim territory and steal resources from opponents.

### Environment Details
- **Grid Size**: 12x12
- **Agents**: 4-6 agents, each operating independently
- **Resources**: Randomly spawning resources of different values
- **Territory**: Cells can be claimed by agents, providing passive resource generation
- **Time Limit**: 200 steps per episode

### Agent Capabilities
- **Actions**: Move (up, down, left, right), Claim territory, Collect resource, Attack (contest another agent's territory)
- **Observations**:
  - Local view of the grid (7x7 centered on agent)
  - Position of nearby agents
  - Position of resources
  - Territory ownership information
  - Health status
- **Combat**: Agents can contest territory owned by other agents, with success probability based on agent strength

### Reward Structure
- **Type**: Individual (zero-sum)
- **Rewards**:
  - +0.1 for each territory cell owned per step
  - +1 for collecting a resource
  - +2 for successfully stealing a resource
  - -1 for losing territory to another agent
  - -0.01 per step (small penalty to encourage efficiency)

### Success Criteria
- Agents are ranked by their total accumulated rewards
- The agent with the most territory and resources at the end wins

## 3. Mixed Cooperative-Competitive Environment: Team Capture the Flag

### Overview
A team-based competitive environment where two teams of agents compete to capture the opposing team's flag while defending their own.

### Environment Details
- **Grid Size**: 20x10
- **Agents**: 6 agents, divided into 2 teams of 3
- **Flags**: Each team has a flag at their base
- **Bases**: Each team has a home base area
- **Obstacles**: Various obstacles creating strategic pathways
- **Time Limit**: 300 steps per episode

### Agent Capabilities
- **Actions**: Move (up, down, left, right), Pick up flag, Drop flag, Tag opponent, Pass flag (to teammate)
- **Observations**:
  - Local view of the grid (7x7 centered on agent)
  - Position of teammates
  - Position of visible opponents
  - Flag status and location
  - Whether the agent is in their own territory or opponent territory
- **Communication**: Agents can communicate with teammates to coordinate strategy
- **Tagging**: Agents can tag opponents in their territory, sending them back to their base

### Reward Structure
- **Type**: Mixed (team and individual components)
- **Team Rewards**:
  - +10 for capturing the opponent's flag
  - +1 for tagging an opponent
  - -10 when team's flag is captured
- **Individual Rewards**:
  - +5 for personally capturing the flag
  - +0.5 for tagging an opponent
  - +0.2 for successful passes to teammates
  - -0.01 per step (small penalty to encourage efficiency)

### Success Criteria
- The team that captures the opponent's flag more times within the time limit wins
- If tied, the team with more tags wins

## 4. Communication-Dependent Environment: Collaborative Puzzle Solving

### Overview
A grid-world environment where agents must solve a puzzle that requires sharing information. Each agent can only see part of the solution, and they must communicate to solve the complete puzzle.

### Environment Details
- **Grid Size**: 15x15
- **Agents**: 4 agents on the same team
- **Puzzle Elements**: Various symbols and patterns distributed across the grid
- **Solution Nodes**: Special locations where agents must input the correct pattern
- **Time Limit**: 150 steps per episode

### Agent Capabilities
- **Actions**: Move (up, down, left, right), Observe puzzle element, Input solution, Send message
- **Observations**:
  - Local view of the grid (5x5 centered on agent)
  - Visible puzzle elements in view
  - Position of nearby agents
  - Solution nodes in view
- **Communication**: Critical feature - agents can send messages containing information about puzzle elements they've observed
- **Information Asymmetry**: Each agent can only interpret certain types of puzzle elements, requiring information sharing

### Reward Structure
- **Type**: Team reward
- **Rewards**:
  - +5 for each correctly solved node
  - +20 for solving the complete puzzle
  - -5 for incorrect solution attempts
  - -0.01 per step (small penalty to encourage efficiency)

### Success Criteria
- Team must solve all puzzle nodes within the time limit
- Solution requires effective communication between agents

## 5. Reward Structure Examples: Resource Allocation Scenarios

### Overview
A set of similar environments with different reward structures to demonstrate how reward design affects agent behavior and cooperation patterns.

### Environment Details
- **Grid Size**: 8x8
- **Agents**: 4 agents with configurable team assignments
- **Resources**: Various resources with different values
- **Allocation Tasks**: Agents must collect and allocate resources to different goals
- **Time Limit**: 100 steps per episode

### Scenarios with Different Reward Structures

#### 5.1 Individual Rewards
- Each agent rewarded based solely on their own contributions
- **Rewards**:
  - +1 for each resource collected personally
  - +2 for each resource allocated to goals personally
- Expected behavior: Agents act selfishly, minimal cooperation

#### 5.2 Team Rewards
- All agents share the same team reward
- **Rewards**:
  - +1 for each resource collected by any team member
  - +2 for each resource allocated to goals by any team member
- Expected behavior: Agents cooperate but may have free-rider problems

#### 5.3 Mixed Rewards
- Combination of individual and team components
- **Rewards**:
  - +0.5 individual + 0.5 team reward for collection
  - +1 individual + 1 team reward for allocation
- Expected behavior: Balance between self-interest and cooperation

#### 5.4 Zero-Sum Rewards
- Competitive scenario where one agent's gain is another's loss
- **Rewards**:
  - +1 for collecting a resource (to collector)
  - -0.25 to each other agent when one collects a resource
  - Resource allocation similarly zero-sum
- Expected behavior: Competitive strategies, possible sabotage

### Success Criteria
- Demonstration of how different reward structures lead to different emergent behaviors
- Comparative analysis of efficiency and cooperation levels across scenarios

## Implementation Notes

Each environment will be implemented as a class extending the BaseMultiAgentEnvironment class, with the following structure:

```typescript
export class TeamCooperationEnvironment extends BaseMultiAgentEnvironment {
  // Environment-specific properties
  
  constructor(config: any) {
    super(config);
    // Initialize environment-specific state
  }
  
  protected initializeState(config: any): void {
    // Initialize grid, resources, agents, etc.
  }
  
  protected resetState(): void {
    // Reset environment state for a new episode
  }
  
  protected resetAgentState(agentId: string): void {
    // Reset individual agent state
  }
  
  protected generateObservation(agentId: string): AgentObservation {
    // Generate observation for the specified agent
  }
  
  protected processActions(actions: Record<string, AgentAction>): void {
    // Process actions from all agents and update environment
  }
  
  protected calculateReward(agentId: string, actions: Record<string, AgentAction>): number {
    // Calculate reward for the specified agent
  }
  
  protected isAgentDone(agentId: string): boolean {
    // Check if the agent has completed the episode
  }
  
  protected getAgentInfo(agentId: string): any {
    // Get additional information for the agent
  }
  
  public render(mode?: string): any {
    // Render the environment
  }
  
  public addAgent(agentId: string, config: any): boolean {
    // Add a new agent to the environment
  }
  
  public removeAgent(agentId: string): boolean {
    // Remove an agent from the environment
  }
}
```

Each environment will also include:
- Configuration options for customization
- Helper methods for environment-specific logic
- Visualization support for debugging and demonstration
- Example usage code
