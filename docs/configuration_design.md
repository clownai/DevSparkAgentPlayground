# Configuration System Design

This document outlines the design for the YAML/JSON configuration system for DevSparkAgentPlayground. The configuration system aims to simplify the setup and customization of agents and environments without requiring code changes.

## Configuration Structure

The configuration system will use a hierarchical structure with the following main components:

```
config/
├── agents/
│   ├── ppo.yaml
│   ├── sac.yaml
│   └── ...
├── environments/
│   ├── cartpole.yaml
│   ├── pendulum.yaml
│   └── ...
├── experiments/
│   ├── experiment1.yaml
│   ├── experiment2.yaml
│   └── ...
└── presets/
    ├── beginner.yaml
    ├── advanced.yaml
    └── ...
```

## Schema Definitions

### Agent Configuration Schema

```yaml
# Agent Configuration Schema
name: string                   # Name of the agent
type: string                   # Algorithm type (PPO, SAC, etc.)
version: string                # Version of the agent configuration

# Algorithm-specific parameters
parameters:
  # Common parameters
  learning_rate: number        # Learning rate for optimization
  gamma: number                # Discount factor
  batch_size: number           # Batch size for training
  buffer_size: number          # Size of replay buffer
  
  # Algorithm-specific parameters (example for PPO)
  ppo_specific:
    epsilon: number            # PPO clipping parameter
    value_coef: number         # Value function coefficient
    entropy_coef: number       # Entropy coefficient
    lambda: number             # GAE lambda parameter
    epochs: number             # Number of epochs per update
    
  # Network architecture
  network:
    hidden_layers: number[]    # Sizes of hidden layers
    activation: string         # Activation function
    output_activation: string  # Output layer activation function
    
# Training configuration
training:
  max_steps: number            # Maximum number of steps
  max_episodes: number         # Maximum number of episodes
  eval_frequency: number       # Evaluation frequency
  save_frequency: number       # Model save frequency
  
# Logging configuration
logging:
  level: string                # Logging level
  metrics: string[]            # Metrics to log
  tensorboard: boolean         # Enable TensorBoard logging
  
# Exploration configuration
exploration:
  type: string                 # Exploration strategy
  initial_epsilon: number      # Initial exploration rate
  final_epsilon: number        # Final exploration rate
  decay_steps: number          # Steps to decay exploration
```

### Environment Configuration Schema

```yaml
# Environment Configuration Schema
name: string                   # Name of the environment
type: string                   # Environment type
version: string                # Version of the environment configuration

# Environment parameters
parameters:
  # Common parameters
  max_steps: number            # Maximum steps per episode
  reward_scale: number         # Scaling factor for rewards
  
  # Environment-specific parameters
  env_specific:
    gravity: number            # Example: gravity for physics environments
    friction: number           # Example: friction coefficient
    
# Observation space configuration
observation_space:
  type: string                 # Type of observation space (discrete, continuous)
  shape: number[]              # Shape of observation space
  low: number[]                # Lower bounds (for continuous spaces)
  high: number[]               # Upper bounds (for continuous spaces)
  
# Action space configuration
action_space:
  type: string                 # Type of action space (discrete, continuous)
  shape: number[]              # Shape of action space (for continuous)
  n: number                    # Number of actions (for discrete)
  low: number[]                # Lower bounds (for continuous spaces)
  high: number[]               # Upper bounds (for continuous spaces)
  
# Rendering configuration
rendering:
  enabled: boolean             # Enable rendering
  mode: string                 # Rendering mode (human, rgb_array)
  fps: number                  # Frames per second
```

### Experiment Configuration Schema

```yaml
# Experiment Configuration Schema
name: string                   # Name of the experiment
description: string            # Description of the experiment
version: string                # Version of the experiment configuration
tags: string[]                 # Tags for categorization

# Agent configuration
agent:
  name: string                 # Name of the agent configuration file
  overrides:                   # Override specific agent parameters
    learning_rate: number      # Example override
    
# Environment configuration
environment:
  name: string                 # Name of the environment configuration file
  overrides:                   # Override specific environment parameters
    max_steps: number          # Example override
    
# Experiment parameters
parameters:
  seed: number                 # Random seed
  num_runs: number             # Number of runs
  parallel: boolean            # Run in parallel
  
# Metrics to track
metrics:
  - name: string               # Name of the metric
    type: string               # Type of metric (mean, sum, etc.)
    
# Visualization configuration
visualization:
  enabled: boolean             # Enable visualization
  plots: string[]              # Types of plots to generate
```

## Configuration Loading System

The configuration system will include:

1. **Parser**: Handles reading YAML/JSON files and converting to JavaScript objects
2. **Validator**: Ensures configurations match the expected schema
3. **Merger**: Combines configurations with defaults and overrides
4. **Resolver**: Resolves references between configurations

## Example Usage

```javascript
// Load an experiment configuration
const configLoader = new ConfigLoader();
const experimentConfig = configLoader.loadExperiment('experiment1');

// Create agent and environment from configuration
const agent = AgentFactory.createFromConfig(experimentConfig.agent);
const environment = EnvironmentFactory.createFromConfig(experimentConfig.environment);

// Run the experiment
const runner = new ExperimentRunner(agent, environment, experimentConfig.parameters);
runner.run();
```

## Implementation Plan

1. Create configuration schemas as TypeScript interfaces
2. Implement configuration loading utilities
3. Add validation using JSON Schema or similar
4. Update agent and environment classes to accept configurations
5. Create factory classes for instantiating from configurations
6. Develop example configurations for existing components
7. Update core system to use configuration-based approach

## Benefits

- Simplified experiment setup
- Reproducible experiments
- Easy parameter tuning
- Configuration versioning
- Shareable configurations
- Reduced code duplication
