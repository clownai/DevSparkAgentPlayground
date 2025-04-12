# Visualization System Documentation

## Overview

The DevSparkAgentPlayground visualization system provides comprehensive tools for visualizing agent behavior, training progress, and experiment results. This document outlines the key components, usage patterns, and integration points for the visualization system.

## Architecture

The visualization system follows a layered architecture:

1. **Data Collection Layer**: Captures metrics, states, actions, and episode data during training and evaluation
2. **Integration Layer**: Hooks into agents, environments, and experiment runners
3. **Visualization Core**: Processes data and manages visualization state
4. **Visualization Components**: Renders charts, simulations, and interactive dashboards
5. **User Interface Layer**: Provides customizable dashboards and experiment comparison tools

## Key Components

### Data Collection

- **DataCollector**: Core utility for collecting, processing, and storing visualization data
  - Collects metrics (scalar values, vectors, histograms, images)
  - Records states and actions
  - Tracks episodes with complete history
  - Manages data storage and retrieval

### Integration Hooks

- **AgentVisualizationHooks**: Collects data from agents during training
  - Policy information and action probabilities
  - Value function estimates
  - Loss metrics and training statistics
  - Gradient and weight information (optional)

- **EnvironmentVisualizationHooks**: Collects data from environments
  - State information and statistics
  - Reward tracking
  - Rendered frames for visualization
  - Episode transitions

- **ExperimentVisualizationHooks**: Coordinates data collection across experiments
  - Experiment progress tracking
  - Checkpointing at regular intervals
  - Comparison data between experiments
  - Start/end metrics and overall statistics

### Visualization Components

- **MetricsCharts**: React components for visualizing metrics
  - LineChart: For time series data like rewards or losses
  - BarChart: For categorical data
  - HeatMap: For 2D data visualization
  - ScatterPlot: For relationship visualization

- **SimulationViewers**: React components for visualizing environments
  - GridWorldViewer: For grid-based environments
  - ContinuousSpaceViewer: For continuous state spaces
  - EpisodePlayer: For playing back recorded episodes
  - ComparisonViewer: For comparing multiple episodes

- **Dashboards**: React components for creating dashboards
  - Dashboard: Base dashboard container
  - DashboardPanel: Individual dashboard panel
  - MetricsDashboard: Pre-configured dashboard for metrics
  - AgentDashboard: Pre-configured dashboard for agent behavior
  - ExperimentDashboard: Pre-configured dashboard for experiment comparison
  - CustomDashboard: User-defined dashboard with custom components

### Integration Components

- **VisualizationManager**: Central manager for visualization system
  - Initializes visualization system
  - Registers agents and environments
  - Records experiment progress
  - Creates visualization components
  - Manages visualization resources

- **VisualizedExperimentRunner**: Extends ExperimentRunner with visualization
  - Integrates with experiment workflow
  - Automatically collects visualization data
  - Provides access to visualization components
  - Manages visualization lifecycle

## Usage Examples

### Basic Usage

```typescript
// Create a visualized experiment runner
const runner = new VisualizedExperimentRunner({
  experimentId: 'my-experiment',
  agentConfig: { type: 'ppo', /* ... */ },
  environmentConfig: { type: 'cartpole', /* ... */ },
  visualizationConfig: { 
    enabled: true,
    // Optional configuration for data collection, agent visualization, etc.
  },
  maxSteps: 1000000,
  maxEpisodes: 1000
});

// Run the experiment
await runner.setup();
await runner.run();

// Get visualization manager
const visualizationManager = runner.getVisualizationManager();

// Create a metrics dashboard
const metricsDashboard = runner.createMetricsDashboard({
  width: 1200,
  height: 800
});

// Create an agent dashboard
const agentDashboard = runner.createAgentDashboard({
  renderState: (state) => {
    // Custom state rendering function
    return <CustomStateRenderer state={state} />;
  }
});
```

### Custom Visualization

```typescript
// Get visualization manager
const visualizationManager = runner.getVisualizationManager();

// Create a custom dashboard
const customDashboard = visualizationManager.createCustomDashboard(
  'My Custom Dashboard',
  {
    metrics: [...], // Metrics data
    states: [...],  // State data
    actions: [...], // Action data
  },
  {
    layout: {
      columns: 3,
      rows: 2,
      panels: [
        {
          id: 'panel-1',
          title: 'Reward Over Time',
          type: 'line-chart',
          x: 0,
          y: 0,
          width: 2,
          height: 1,
          config: {
            metricName: 'reward',
            smoothing: 0.3
          }
        },
        {
          id: 'panel-2',
          title: 'Agent Behavior',
          type: 'episode-player',
          x: 2,
          y: 0,
          width: 1,
          height: 2,
          config: {
            autoPlay: true,
            speed: 2
          }
        },
        {
          id: 'panel-3',
          title: 'Policy Entropy',
          type: 'line-chart',
          x: 0,
          y: 1,
          width: 1,
          height: 1,
          config: {
            metricName: 'agent/policy_entropy'
          }
        },
        {
          id: 'panel-4',
          title: 'Value Estimates',
          type: 'line-chart',
          x: 1,
          y: 1,
          width: 1,
          height: 1,
          config: {
            metricName: 'agent/value_estimate'
          }
        }
      ]
    },
    components: {
      // Optional custom components
      'my-custom-component': MyCustomComponent
    }
  }
);
```

### Experiment Comparison

```typescript
// Compare multiple experiments
const experimentDashboard = visualizationManager.createExperimentDashboard(
  [
    {
      id: 'experiment-1',
      name: 'PPO with default parameters',
      metrics: [...] // Metrics from experiment 1
    },
    {
      id: 'experiment-2',
      name: 'PPO with tuned parameters',
      metrics: [...] // Metrics from experiment 2
    },
    {
      id: 'experiment-3',
      name: 'SAC algorithm',
      metrics: [...] // Metrics from experiment 3
    }
  ],
  {
    width: 1200,
    height: 800
  }
);
```

## Configuration Options

### VisualizationManager Configuration

```typescript
{
  enabled: true, // Enable/disable visualization system
  dataCollectionConfig: {
    storageDirectory: './data', // Directory for storing visualization data
    maxBufferSize: 1000, // Maximum buffer size before flushing to storage
    flushInterval: 10000, // Flush interval in milliseconds
    stateSubsampling: 1 // Subsampling rate for states (1 = no subsampling)
  },
  agentVisualizationConfig: {
    collectPolicyInfo: true, // Collect policy information
    collectValueInfo: true, // Collect value function estimates
    collectGradients: false, // Collect gradient information (expensive)
    collectWeights: false, // Collect weight information (expensive)
    collectFrequency: 10 // Collection frequency (every N steps)
  },
  environmentVisualizationConfig: {
    collectStateInfo: true, // Collect state information
    collectRewardInfo: true, // Collect reward information
    collectRenderFrames: true, // Collect rendered frames
    renderFrequency: 5, // Render frequency (every N steps)
    maxFramesPerEpisode: 100 // Maximum frames to collect per episode
  },
  experimentVisualizationConfig: {
    collectExperimentMetrics: true, // Collect experiment metrics
    collectComparisonData: true, // Collect comparison data
    collectCheckpoints: true, // Create checkpoints
    checkpointFrequency: 10000 // Checkpoint frequency (every N steps)
  }
}
```

## Best Practices

1. **Enable visualization selectively**: Visualization can impact performance, especially when collecting gradients, weights, or frequent render frames.

2. **Use appropriate collection frequencies**: Adjust collection frequencies based on experiment length and visualization needs.

3. **Customize dashboards for specific needs**: Create custom dashboards for different stakeholders (researchers, developers, etc.).

4. **Use subsampling for long experiments**: For long experiments, use state subsampling to reduce storage requirements.

5. **Clean up visualization resources**: Always call `cleanup()` when visualization is no longer needed.

## Integration with YAML Configuration

The visualization system integrates with the YAML configuration system:

```yaml
# experiment.yaml
experiment:
  id: my-experiment
  agent:
    type: ppo
    # Agent configuration...
  environment:
    type: cartpole
    # Environment configuration...
  visualization:
    enabled: true
    data_collection:
      storage_directory: ./data
      max_buffer_size: 1000
      flush_interval: 10000
      state_subsampling: 1
    agent_visualization:
      collect_policy_info: true
      collect_value_info: true
      collect_gradients: false
      collect_weights: false
      collect_frequency: 10
    environment_visualization:
      collect_state_info: true
      collect_reward_info: true
      collect_render_frames: true
      render_frequency: 5
      max_frames_per_episode: 100
    experiment_visualization:
      collect_experiment_metrics: true
      collect_comparison_data: true
      collect_checkpoints: true
      checkpoint_frequency: 10000
  max_steps: 1000000
  max_episodes: 1000
```

## Extending the Visualization System

The visualization system is designed to be extensible:

1. **Custom Visualization Components**: Create custom React components and register them with the CustomDashboard.

2. **Custom Data Collectors**: Extend the DataCollector class to collect custom data types.

3. **Custom Hooks**: Create custom hooks for specialized agents or environments.

4. **Custom Dashboards**: Create custom dashboard layouts for specific visualization needs.

## Troubleshooting

1. **Visualization not showing**: Ensure visualization is enabled in the configuration.

2. **Missing data**: Check collection frequencies and ensure hooks are properly registered.

3. **Performance issues**: Reduce collection frequencies, disable expensive collections (gradients, weights), or use subsampling.

4. **Memory issues**: Reduce buffer sizes, increase flush frequency, or disable frame collection.

5. **Rendering issues**: Ensure environment render method returns compatible format (RGB array).
