# Multi-Agent Visualization System Documentation

## Overview

The Multi-Agent Visualization System is a comprehensive framework for visualizing and analyzing multi-agent reinforcement learning experiments. This system extends the base visualization components to support multiple agents, teams, and their interactions, providing researchers and developers with powerful tools to understand complex multi-agent dynamics.

This documentation provides a detailed explanation of the system's architecture, components, and usage patterns.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Collection](#data-collection)
3. [Visualization Components](#visualization-components)
   - [Metrics Charts](#metrics-charts)
   - [Simulation Viewers](#simulation-viewers)
   - [Dashboards](#dashboards)
4. [Integration Guide](#integration-guide)
5. [Usage Examples](#usage-examples)
6. [API Reference](#api-reference)

## System Architecture

The Multi-Agent Visualization System follows a modular architecture with three main layers:

1. **Data Collection Layer**: Responsible for collecting, processing, and storing data from multi-agent experiments.
2. **Visualization Components Layer**: Provides reusable visualization components for different aspects of multi-agent systems.
3. **Dashboard Layer**: Combines visualization components into comprehensive dashboards for different analysis needs.

![System Architecture](https://mermaid.ink/img/pako:eNqNkk1PwzAMhv9KlBMgdYVyQEKaJnFgHDhNXHrIGi9EtE2UOGiM8d9x262wDcSUQ-K8fvw4_gBFrYADl7bR9bOx2FjHjkFp1VjmUNda1Vb1zKFWtWXGNKZmDh_a1IyZVnGHhWqRGWVQsJJKZY1qEQvtHOtQOdQNWnYcCuUcbqFQrUMcBvwKhRKtw0LVDjHXyqBgJbXCGnGYa9VYLJTFQiuHhVIWC6Ub3GKhWmQOC-UQC-3QYa5qRMFKKoU14jDXqrFYKIuFVg4LpSwWSjW4xUK1yBwWyiEW2qHDXNWIgpVUCmvEYa5VY7FQFgutHBZKWSyUanCLhWqROSyUQyy0Q4e5qhEFK6kU1ojDXKvGYqEsFlq5_3_hv3zhvzjhvzThvzDhvyzhvyjhvyTZf0Gy_3Jk_8XI_kuR_Rci-y9D9l-E7L8E2X8Bsv_8Y__Zx_5zj_1nHvvPO_afdeyvJwfOoVfKDsZhNAiTJE5G0SgcDJNBkiRxMojDQZwMB-PxIE6jNI3TKE6iKPkEsQfraw)

### Key Components

- **MultiAgentDataCollector**: Extends the base DataCollector to track agent-specific and team-specific metrics, states, actions, communications, and interactions.
- **MultiAgentMetricsCharts**: Provides specialized chart components for visualizing multi-agent metrics, team comparisons, and communication patterns.
- **MultiAgentSimulationViewers**: Extends simulation viewers to display multiple agents, teams, and their interactions in grid-world environments.
- **MultiAgentDashboards**: Combines various visualization components into comprehensive dashboards for different analysis needs.

## Data Collection

The data collection system is the foundation of the visualization framework, responsible for capturing and organizing data from multi-agent experiments.

### MultiAgentDataCollector

The `MultiAgentDataCollector` extends the base `DataCollector` class to provide specialized data collection for multi-agent scenarios:

```typescript
import { MultiAgentDataCollector } from '../../utils/MultiAgentDataCollector';

// Create a new collector
const collector = new MultiAgentDataCollector('experiment-id', {
  enabled: true,
  collectMetrics: true,
  collectStates: true,
  collectActions: true,
  collectCommunications: true,
  collectInteractions: true,
  collectTeamMetrics: true,
  trackRelativePositions: true
});
```

#### Key Features

1. **Agent and Team Registration**

```typescript
// Register agents
collector.registerAgent({
  id: 'agent1',
  name: 'Agent 1',
  teamId: 'team1',
  role: 'explorer'
});

// Register teams
collector.registerTeam({
  id: 'team1',
  name: 'Team Alpha',
  metadata: { strategy: 'cooperative' }
});
```

2. **Agent-Specific Metrics**

```typescript
// Collect agent-specific metrics
collector.collectAgentMetric(
  'agent1',
  'reward',
  10.5,
  MetricType.SCALAR,
  { location: 'zone_a' }
);
```

3. **Team Metrics**

```typescript
// Collect team metrics
collector.collectTeamMetric(
  'team1',
  'team_reward',
  25.0,
  MetricType.SCALAR,
  ['agent1', 'agent2'],
  { mission: 'resource_gathering' }
);
```

4. **Agent States and Actions**

```typescript
// Record agent state
collector.recordAgentState(
  'agent1',
  { position: [1, 2], inventory: ['tool', 'resource'] },
  { x: 1, y: 2 },
  { visibility: 'high' }
);

// Record agent action
collector.recordAgentAction(
  'agent1',
  'move_right',
  { energy_cost: 1 }
);
```

5. **Communication and Interaction Recording**

```typescript
// Record communication between agents
collector.recordCommunication(
  'agent1',  // sender
  'agent2',  // receiver (undefined for broadcast)
  { type: 'request', content: 'need_assistance' },
  { priority: 'high' }
);

// Record interaction between agents
collector.recordInteraction(
  ['agent1', 'agent2'],
  'cooperation',
  'success',
  { resource_gained: 10 }
);
```

6. **Episode Recording**

```typescript
// Start a new episode
collector.startMultiAgentEpisode(
  ['agent1', 'agent2'],
  { difficulty: 'medium' }
);

// ... record states, actions, communications, interactions ...

// End the episode
collector.endMultiAgentEpisode(
  { team1: 100, team2: 75 },
  { agent1: 60, agent2: 40 },
  { success: true }
);
```

7. **Data Export**

```typescript
// Export collected data
const agentMetrics = collector.getAgentMetrics();
const teamMetrics = collector.getTeamMetrics();
const communications = collector.getCommunications();
const episodes = collector.getMultiAgentEpisodes();

// Save to file
collector.saveToFile('/path/to/experiment-data.json');
```

## Visualization Components

The visualization components layer provides reusable React components for visualizing different aspects of multi-agent systems.

### Metrics Charts

The `MultiAgentMetricsCharts` module provides specialized chart components for visualizing multi-agent metrics:

#### MultiAgentLineChart

Visualizes metrics over time for multiple agents, with options for grouping by team and highlighting specific agents:

```tsx
import { MultiAgentLineChart } from '../visualization/components/MultiAgentMetricsCharts';

<MultiAgentLineChart
  data={agentMetrics}
  width={800}
  height={400}
  title="Agent Rewards Over Time"
  xAxis="Step"
  yAxis="Reward"
  groupByTeam={false}
  showLegend={true}
  highlightAgents={['agent1']}
  onPointClick={(point) => console.log(point)}
/>
```

#### TeamComparisonBarChart

Compares metrics across teams:

```tsx
import { TeamComparisonBarChart } from '../visualization/components/MultiAgentMetricsCharts';

<TeamComparisonBarChart
  data={teamMetrics}
  width={600}
  height={400}
  title="Team Performance Comparison"
  xAxis="Team"
  yAxis="Total Reward"
  showValues={true}
/>
```

#### StackedBarChart

Visualizes the contribution of individual agents to team metrics:

```tsx
import { StackedBarChart } from '../visualization/components/MultiAgentMetricsCharts';

<StackedBarChart
  data={agentMetrics}
  width={700}
  height={500}
  title="Agent Contributions to Team Reward"
  xAxis="Team"
  yAxis="Reward"
  groupBy="teamId"
  stackBy="agentId"
/>
```

#### CommunicationNetworkChart

Visualizes communication patterns between agents:

```tsx
import { CommunicationNetworkChart } from '../visualization/components/MultiAgentMetricsCharts';

<CommunicationNetworkChart
  data={communications}
  width={800}
  height={600}
  title="Agent Communication Network"
  colorByTeam={true}
  showLabels={true}
  linkStrength="frequency"
/>
```

### Simulation Viewers

The `MultiAgentSimulationViewers` module provides specialized viewers for visualizing multi-agent simulations:

#### MultiAgentGridWorldViewer

Visualizes multiple agents in a grid-world environment:

```tsx
import { MultiAgentGridWorldViewer } from '../visualization/components/MultiAgentSimulationViewers';

<MultiAgentGridWorldViewer
  width={600}
  height={600}
  gridSize={{ width: 10, height: 10 }}
  agentStates={currentAgentStates}
  obstacles={[{ x: 2, y: 3 }, { x: 5, y: 7 }]}
  goals={[{ x: 9, y: 9, reward: 100 }]}
  communications={recentCommunications}
  interactions={recentInteractions}
  teamColorMap={{ team1: '#ff0000', team2: '#0000ff' }}
  showAgentIds={true}
  showTeamIds={true}
  showCommunications={true}
  showInteractions={true}
  cellSize={50}
  onAgentClick={(agentId) => console.log(`Clicked agent: ${agentId}`)}
  onCellClick={(x, y) => console.log(`Clicked cell: (${x}, ${y})`)}
/>
```

#### MultiAgentEpisodePlayer

Provides playback controls for multi-agent episodes:

```tsx
import { MultiAgentEpisodePlayer } from '../visualization/components/MultiAgentSimulationViewers';

<MultiAgentEpisodePlayer
  width={800}
  height={600}
  gridSize={{ width: 10, height: 10 }}
  episodeStates={episodeAgentStates}
  episodeActions={episodeAgentActions}
  episodeCommunications={episodeCommunications}
  episodeInteractions={episodeInteractions}
  obstacles={obstacles}
  goals={goals}
  teamColorMap={teamColorMap}
  showAgentIds={true}
  showTeamIds={true}
  showCommunications={true}
  showInteractions={true}
  autoPlay={false}
  playbackSpeed={1}
  onStepChange={(step) => console.log(`Current step: ${step}`)}
/>
```

#### AgentFilterPanel

Provides UI controls for filtering agents and teams:

```tsx
import { AgentFilterPanel } from '../visualization/components/MultiAgentSimulationViewers';

<AgentFilterPanel
  agents={[
    { id: 'agent1', teamId: 'team1', name: 'Agent 1' },
    { id: 'agent2', teamId: 'team2', name: 'Agent 2' }
  ]}
  teams={[
    { id: 'team1', name: 'Team Alpha' },
    { id: 'team2', name: 'Team Beta' }
  ]}
  selectedAgentIds={['agent1']}
  selectedTeamIds={['team1']}
  onAgentSelectionChange={(agentIds) => setSelectedAgents(agentIds)}
  onTeamSelectionChange={(teamIds) => setSelectedTeams(teamIds)}
/>
```

### Dashboards

The `MultiAgentDashboards` module provides comprehensive dashboards for different analysis needs:

#### MultiAgentMetricsDashboard

Visualizes metrics for multiple agents and teams:

```tsx
import { MultiAgentMetricsDashboard } from '../visualization/components/MultiAgentDashboards';

<MultiAgentMetricsDashboard
  agentMetrics={agentMetrics}
  teamMetrics={teamMetrics}
  width={1200}
  height={800}
  title="Multi-Agent Performance Analysis"
  showAgentFilter={true}
  showTeamFilter={true}
  metricNames={['reward', 'steps', 'success_rate']}
  onAgentSelectionChange={(agentIds) => console.log(agentIds)}
  onTeamSelectionChange={(teamIds) => console.log(teamIds)}
/>
```

#### MultiAgentInteractionDashboard

Visualizes agent interactions and communications:

```tsx
import { MultiAgentInteractionDashboard } from '../visualization/components/MultiAgentDashboards';

<MultiAgentInteractionDashboard
  communications={communications}
  interactions={interactions}
  agentStates={agentStates}
  width={1200}
  height={800}
  title="Agent Interaction Analysis"
  showCommunicationNetwork={true}
  showInteractionHeatmap={true}
  showTimeline={true}
  timeRange={{ start: 0, end: 1000 }}
/>
```

#### MultiAgentEpisodeAnalysisDashboard

Provides detailed analysis of a single multi-agent episode:

```tsx
import { MultiAgentEpisodeAnalysisDashboard } from '../visualization/components/MultiAgentDashboards';

<MultiAgentEpisodeAnalysisDashboard
  episodeStates={episodeStates}
  episodeActions={episodeActions}
  episodeCommunications={episodeCommunications}
  episodeInteractions={episodeInteractions}
  episodeMetrics={episodeMetrics}
  gridSize={{ width: 10, height: 10 }}
  width={1200}
  height={900}
  title="Episode Analysis"
  showPlaybackControls={true}
  showMetricsPanel={true}
  showCommunicationPanel={true}
  onStepChange={(step) => console.log(`Current step: ${step}`)}
/>
```

#### MultiAgentDashboard

Combines all visualization components into a comprehensive dashboard:

```tsx
import { MultiAgentDashboard } from '../visualization/components/MultiAgentDashboards';

<MultiAgentDashboard
  agentMetrics={agentMetrics}
  teamMetrics={teamMetrics}
  communications={communications}
  interactions={interactions}
  agentStates={agentStates}
  episodeStates={episodeStates}
  episodeActions={episodeActions}
  episodeCommunications={episodeCommunications}
  episodeInteractions={episodeInteractions}
  gridSize={{ width: 10, height: 10 }}
  width={1600}
  height={1200}
  title="Comprehensive Multi-Agent Analysis"
  activeTab="metrics" // 'metrics', 'interactions', 'episode', 'overview'
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

## Integration Guide

This section provides guidance on integrating the Multi-Agent Visualization System into your projects.

### Basic Integration

1. **Import Required Components**

```typescript
// Data collection
import { MultiAgentDataCollector } from '../utils/MultiAgentDataCollector';

// Visualization components
import { 
  MultiAgentLineChart,
  TeamComparisonBarChart
} from '../visualization/components/MultiAgentMetricsCharts';

import {
  MultiAgentGridWorldViewer,
  MultiAgentEpisodePlayer
} from '../visualization/components/MultiAgentSimulationViewers';

import {
  MultiAgentMetricsDashboard
} from '../visualization/components/MultiAgentDashboards';
```

2. **Initialize Data Collector**

```typescript
const collector = new MultiAgentDataCollector('experiment-id', {
  enabled: true,
  collectMetrics: true,
  collectStates: true,
  collectActions: true,
  collectCommunications: true,
  collectInteractions: true
});

// Register agents and teams
collector.registerAgent({
  id: 'agent1',
  name: 'Agent 1',
  teamId: 'team1',
  role: 'explorer'
});

collector.registerTeam({
  id: 'team1',
  name: 'Team Alpha'
});
```

3. **Collect Data During Experiment**

```typescript
// In your experiment loop
for (let episode = 0; episode < numEpisodes; episode++) {
  collector.startMultiAgentEpisode(['agent1', 'agent2']);
  
  for (let step = 0; step < maxSteps; step++) {
    // Record agent states
    collector.recordAgentState('agent1', state1, position1);
    collector.recordAgentState('agent2', state2, position2);
    
    // Record agent actions
    collector.recordAgentAction('agent1', action1);
    collector.recordAgentAction('agent2', action2);
    
    // Record communications
    if (communication) {
      collector.recordCommunication(
        communication.sender,
        communication.receiver,
        communication.content
      );
    }
    
    // Record interactions
    if (interaction) {
      collector.recordInteraction(
        interaction.agents,
        interaction.type,
        interaction.outcome
      );
    }
    
    // Collect metrics
    collector.collectAgentMetric('agent1', 'reward', reward1);
    collector.collectAgentMetric('agent2', 'reward', reward2);
    collector.collectTeamMetric('team1', 'team_reward', teamReward);
    
    // Increment step
    collector.incrementStep();
  }
  
  // End episode
  collector.endMultiAgentEpisode(
    { team1: teamReward },
    { agent1: reward1, agent2: reward2 },
    { success: episodeSuccess }
  );
}
```

4. **Visualize Results**

```tsx
// In your React component
function ExperimentVisualization() {
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [teamMetrics, setTeamMetrics] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  
  useEffect(() => {
    // Load data from collector or file
    const data = collector.getAllData();
    setAgentMetrics(data.agentMetrics);
    setTeamMetrics(data.teamMetrics);
    setCommunications(data.communications);
    setEpisodes(data.multiAgentEpisodes);
  }, []);
  
  return (
    <div>
      <h1>Experiment Results</h1>
      
      <h2>Agent Performance</h2>
      <MultiAgentLineChart
        data={agentMetrics.filter(m => m.name === 'reward')}
        width={800}
        height={400}
        title="Agent Rewards Over Time"
      />
      
      <h2>Team Performance</h2>
      <TeamComparisonBarChart
        data={teamMetrics.filter(m => m.name === 'team_reward')}
        width={600}
        height={400}
        title="Team Performance Comparison"
      />
      
      <h2>Episode Playback</h2>
      {episodes.length > 0 && (
        <MultiAgentEpisodePlayer
          width={800}
          height={600}
          gridSize={{ width: 10, height: 10 }}
          episodeStates={episodes[0].states}
          episodeActions={episodes[0].actions}
          episodeCommunications={episodes[0].communications}
          episodeInteractions={episodes[0].interactions}
        />
      )}
    </div>
  );
}
```

### Advanced Integration

For more advanced integration, you can use the comprehensive dashboards:

```tsx
function AdvancedVisualization() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('metrics');
  
  useEffect(() => {
    // Load data from file or API
    fetch('/api/experiment-data')
      .then(response => response.json())
      .then(data => setData(data));
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Advanced Multi-Agent Analysis</h1>
      
      <MultiAgentDashboard
        agentMetrics={data.agentMetrics}
        teamMetrics={data.teamMetrics}
        communications={data.communications}
        interactions={data.interactions}
        agentStates={data.agentStates}
        episodeStates={data.episodes[0].states}
        episodeActions={data.episodes[0].actions}
        episodeCommunications={data.episodes[0].communications}
        episodeInteractions={data.episodes[0].interactions}
        gridSize={{ width: 10, height: 10 }}
        width={1600}
        height={1200}
        title="Comprehensive Multi-Agent Analysis"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
```

## Usage Examples

This section provides concrete examples of using the Multi-Agent Visualization System for different scenarios.

### Example 1: Analyzing Team Performance

```tsx
import React, { useState, useEffect } from 'react';
import { MultiAgentMetricsDashboard } from '../visualization/components/MultiAgentDashboards';
import { loadExperimentData } from '../utils/dataLoader';

function TeamPerformanceAnalysis() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    loadExperimentData('team-experiment')
      .then(data => setData(data));
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Team Performance Analysis</h1>
      
      <MultiAgentMetricsDashboard
        agentMetrics={data.agentMetrics}
        teamMetrics={data.teamMetrics}
        width={1200}
        height={800}
        title="Team Performance Analysis"
        showAgentFilter={true}
        showTeamFilter={true}
        metricNames={['reward', 'steps', 'success_rate']}
      />
    </div>
  );
}
```

### Example 2: Analyzing Communication Patterns

```tsx
import React, { useState, useEffect } from 'react';
import { MultiAgentInteractionDashboard } from '../visualization/components/MultiAgentDashboards';
import { CommunicationNetworkChart } from '../visualization/components/MultiAgentMetricsCharts';
import { loadExperimentData } from '../utils/dataLoader';

function CommunicationAnalysis() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    loadExperimentData('communication-experiment')
      .then(data => setData(data));
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Communication Pattern Analysis</h1>
      
      <CommunicationNetworkChart
        data={data.communications}
        width={800}
        height={600}
        title="Agent Communication Network"
        colorByTeam={true}
        showLabels={true}
        linkStrength="frequency"
      />
      
      <MultiAgentInteractionDashboard
        communications={data.communications}
        interactions={data.interactions}
        agentStates={data.agentStates}
        width={1200}
        height={800}
        title="Agent Interaction Analysis"
        showCommunicationNetwork={true}
        showInteractionHeatmap={true}
        showTimeline={true}
      />
    </div>
  );
}
```

### Example 3: Episode Replay and Analysis

```tsx
import React, { useState, useEffect } from 'react';
import { MultiAgentEpisodeAnalysisDashboard } from '../visualization/components/MultiAgentDashboards';
import { loadEpisodeData } from '../utils/dataLoader';

function EpisodeAnalysis() {
  const [episode, setEpisode] = useState(null);
  const [episodeId, setEpisodeId] = useState('episode-001');
  
  useEffect(() => {
    loadEpisodeData(episodeId)
      .then(data => setEpisode(data));
  }, [episodeId]);
  
  if (!episode) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Episode Analysis</h1>
      
      <div>
        <label>
          Episode:
          <select 
            value={episodeId} 
            onChange={(e) => setEpisodeId(e.target.value)}
          >
            <option value="episode-001">Episode 1</option>
            <option value="episode-002">Episode 2</option>
            <option value="episode-003">Episode 3</option>
          </select>
        </label>
      </div>
      
      <MultiAgentEpisodeAnalysisDashboard
        episodeStates={episode.states}
        episodeActions={episode.actions}
        episodeCommunications={episode.communications}
        episodeInteractions={episode.interactions}
        episodeMetrics={episode.metrics}
        gridSize={{ width: 10, height: 10 }}
        width={1200}
        height={900}
        title={`Episode ${episodeId} Analysis`}
        showPlaybackControls={true}
        showMetricsPanel={true}
        showCommunicationPanel={true}
      />
    </div>
  );
}
```

## API Reference

This section provides a detailed API reference for all components in the Multi-Agent Visualization System.

### MultiAgentDataCollector

#### Constructor

```typescript
constructor(experimentId: string, config: MultiAgentDataCollectorConfig)
```

#### Configuration

```typescript
interface MultiAgentDataCollectorConfig {
  enabled?: boolean;
  collectMetrics?: boolean;
  collectStates?: boolean;
  collectActions?: boolean;
  collectEpisodes?: boolean;
  collectCommunications?: boolean;
  collectInteractions?: boolean;
  collectTeamMetrics?: boolean;
  trackRelativePositions?: boolean;
  maxBufferSize?: number;
  stateSubsampling?: number;
  communicationSubsampling?: number;
}
```

#### Methods

| Method | Description |
|--------|-------------|
| `registerAgent(agent: AgentIdentity)` | Register an agent with the data collector |
| `registerTeam(team: TeamIdentity)` | Register a team with the data collector |
| `collectAgentMetric(agentId: string, name: string, value: any, type?: MetricType, metadata?: any)` | Collect an agent-specific metric |
| `collectTeamMetric(teamId: string, name: string, value: any, type?: MetricType, agentIds?: string[], metadata?: any)` | Collect a team-specific metric |
| `recordAgentState(agentId: string, state: any, position?: {x: number, y: number, z?: number}, metadata?: any)` | Record an agent's state |
| `recordAgentAction(agentId: string, action: any, metadata?: any)` | Record an agent's action |
| `recordCommunication(senderId: string, receiverId?: string, content: any, metadata?: any)` | Record communication between agents |
| `recordInteraction(agentIds: string[], type: string, outcome?: any, metadata?: any)` | Record interaction between agents |
| `startMultiAgentEpisode(agentIds: string[], metadata?: any)` | Start a new multi-agent episode |
| `endMultiAgentEpisode(teamRewards?: Record<string, number>, individualRewards?: Record<string, number>, metadata?: any)` | End the current multi-agent episode |
| `incrementStep()` | Increment the step counter |
| `incrementEpisode()` | Increment the episode counter |
| `getAgentMetrics()` | Get all collected agent metrics |
| `getTeamMetrics()` | Get all collected team metrics |
| `getAgentStates()` | Get all recorded agent states |
| `getAgentActions()` | Get all recorded agent actions |
| `getCommunications()` | Get all recorded communications |
| `getInteractions()` | Get all recorded interactions |
| `getMultiAgentEpisodes()` | Get all recorded multi-agent episodes |
| `getAllData()` | Get all collected data |
| `saveToFile(filePath: string)` | Save all collected data to a file |
| `loadFromFile(filePath: string)` | Load data from a file |
| `clear()` | Clear all collected data |

### MultiAgentMetricsCharts

#### MultiAgentLineChart

```typescript
interface MultiAgentLineChartProps {
  data: AgentMetricDataPoint[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxis?: string;
  yAxis?: string;
  title?: string;
  colorScheme?: string[];
  smoothing?: number;
  showPoints?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  groupByTeam?: boolean;
  highlightAgents?: string[];
  onPointClick?: (point: AgentMetricDataPoint) => void;
}
```

#### TeamComparisonBarChart

```typescript
interface TeamComparisonBarChartProps {
  data: TeamMetricDataPoint[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxis?: string;
  yAxis?: string;
  title?: string;
  colorScheme?: string[];
  showValues?: boolean;
  showGrid?: boolean;
  sortBy?: 'value' | 'name' | 'none';
  sortDirection?: 'ascending' | 'descending';
  onBarClick?: (team: string, value: number) => void;
}
```

#### StackedBarChart

```typescript
interface StackedBarChartProps {
  data: AgentMetricDataPoint[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxis?: string;
  yAxis?: string;
  title?: string;
  colorScheme?: string[];
  showValues?: boolean;
  showGrid?: boolean;
  groupBy: 'teamId' | 'step' | 'episode';
  stackBy: 'agentId' | 'name';
  sortBy?: 'value' | 'name' | 'none';
  sortDirection?: 'ascending' | 'descending';
  onBarClick?: (group: string, stack: string, value: number) => void;
}
```

#### CommunicationNetworkChart

```typescript
interface CommunicationNetworkChartProps {
  data: CommunicationRecord[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  title?: string;
  colorByTeam?: boolean;
  colorScheme?: string[];
  showLabels?: boolean;
  linkStrength?: 'frequency' | 'recency' | 'uniform';
  nodeSize?: 'degree' | 'uniform';
  timeWindow?: { start: number; end: number };
  onNodeClick?: (agentId: string) => void;
  onLinkClick?: (source: string, target: string) => void;
}
```

### MultiAgentSimulationViewers

#### MultiAgentGridWorldViewer

```typescript
interface MultiAgentGridWorldViewerProps {
  width?: number;
  height?: number;
  gridSize: { width: number; height: number };
  agentStates: AgentStateRecord[];
  obstacles?: { x: number; y: number }[];
  goals?: { x: number; y: number; reward?: number }[];
  communications?: CommunicationRecord[];
  interactions?: InteractionRecord[];
  teamColorMap?: Record<string, string>;
  showAgentIds?: boolean;
  showTeamIds?: boolean;
  showCommunications?: boolean;
  showInteractions?: boolean;
  cellSize?: number;
  onAgentClick?: (agentId: string) => void;
  onCellClick?: (x: number, y: number) => void;
}
```

#### MultiAgentEpisodePlayer

```typescript
interface MultiAgentEpisodePlayerProps {
  width?: number;
  height?: number;
  gridSize: { width: number; height: number };
  episodeStates: AgentStateRecord[];
  episodeActions?: AgentActionRecord[];
  episodeCommunications?: CommunicationRecord[];
  episodeInteractions?: InteractionRecord[];
  obstacles?: { x: number; y: number }[];
  goals?: { x: number; y: number; reward?: number }[];
  teamColorMap?: Record<string, string>;
  showAgentIds?: boolean;
  showTeamIds?: boolean;
  showCommunications?: boolean;
  showInteractions?: boolean;
  autoPlay?: boolean;
  playbackSpeed?: number;
  initialStep?: number;
  showControls?: boolean;
  showTimeline?: boolean;
  onStepChange?: (step: number) => void;
}
```

#### AgentFilterPanel

```typescript
interface AgentFilterPanelProps {
  agents: { id: string; teamId?: string; name?: string }[];
  teams: { id: string; name?: string }[];
  selectedAgentIds: string[];
  selectedTeamIds: string[];
  onAgentSelectionChange: (agentIds: string[]) => void;
  onTeamSelectionChange: (teamIds: string[]) => void;
  showSelectAll?: boolean;
  showSearch?: boolean;
  width?: number;
  height?: number;
}
```

### MultiAgentDashboards

#### MultiAgentMetricsDashboard

```typescript
interface MultiAgentMetricsDashboardProps {
  agentMetrics: AgentMetricDataPoint[];
  teamMetrics: TeamMetricDataPoint[];
  width?: number;
  height?: number;
  title?: string;
  showAgentFilter?: boolean;
  showTeamFilter?: boolean;
  metricNames?: string[];
  onAgentSelectionChange?: (agentIds: string[]) => void;
  onTeamSelectionChange?: (teamIds: string[]) => void;
}
```

#### MultiAgentInteractionDashboard

```typescript
interface MultiAgentInteractionDashboardProps {
  communications: CommunicationRecord[];
  interactions: InteractionRecord[];
  agentStates: AgentStateRecord[];
  width?: number;
  height?: number;
  title?: string;
  showCommunicationNetwork?: boolean;
  showInteractionHeatmap?: boolean;
  showTimeline?: boolean;
  timeRange?: { start: number; end: number };
}
```

#### MultiAgentEpisodeAnalysisDashboard

```typescript
interface MultiAgentEpisodeAnalysisDashboardProps {
  episodeStates: AgentStateRecord[];
  episodeActions: AgentActionRecord[];
  episodeCommunications: CommunicationRecord[];
  episodeInteractions: InteractionRecord[];
  episodeMetrics: AgentMetricDataPoint[];
  gridSize: { width: number; height: number };
  width?: number;
  height?: number;
  title?: string;
  showPlaybackControls?: boolean;
  showMetricsPanel?: boolean;
  showCommunicationPanel?: boolean;
  onStepChange?: (step: number) => void;
}
```

#### MultiAgentDashboard

```typescript
interface MultiAgentDashboardProps {
  agentMetrics: AgentMetricDataPoint[];
  teamMetrics: TeamMetricDataPoint[];
  communications: CommunicationRecord[];
  interactions: InteractionRecord[];
  agentStates: AgentStateRecord[];
  episodeStates: AgentStateRecord[];
  episodeActions: AgentActionRecord[];
  episodeCommunications: CommunicationRecord[];
  episodeInteractions: InteractionRecord[];
  gridSize: { width: number; height: number };
  width?: number;
  height?: number;
  title?: string;
  activeTab?: 'metrics' | 'interactions' | 'episode' | 'overview';
  onTabChange?: (tab: string) => void;
}
```

---

This documentation provides a comprehensive overview of the Multi-Agent Visualization System, its components, and how to use them. For more detailed information, refer to the source code and inline documentation.
