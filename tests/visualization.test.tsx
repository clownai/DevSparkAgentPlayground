/**
 * Test file for visualization system
 * 
 * This module tests the visualization system components and integration.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DataCollector, { MetricType } from '../src/utils/DataCollector';
import AgentVisualizationHooks from '../src/utils/AgentVisualizationHooks';
import EnvironmentVisualizationHooks from '../src/utils/EnvironmentVisualizationHooks';
import ExperimentVisualizationHooks from '../src/utils/ExperimentVisualizationHooks';
import VisualizationManager from '../src/visualization/VisualizationManager';
import VisualizedExperimentRunner from '../src/visualization/VisualizedExperimentRunner';
import MetricsCharts from '../src/visualization/components/MetricsCharts';
import SimulationViewers from '../src/visualization/components/SimulationViewers';
import Dashboards from '../src/visualization/components/Dashboards';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs-node', () => ({
  tensor: jest.fn().mockImplementation((data) => ({
    data,
    dataSync: () => Array.isArray(data) ? data : [data],
    shape: Array.isArray(data) ? [data.length] : [1],
  })),
  layers: {
    dense: jest.fn().mockImplementation(() => ({
      apply: jest.fn(),
    })),
  },
  train: {
    adam: jest.fn(),
  },
  sequential: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({ history: { loss: [0.1] } }),
    predict: jest.fn().mockImplementation((x) => x),
  })),
}));

// Mock React components
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useRef: jest.fn().mockImplementation(() => ({ current: {} })),
    useEffect: jest.fn(),
    useState: jest.fn().mockImplementation((initial) => [initial, jest.fn()]),
  };
});

// Mock D3.js
jest.mock('d3', () => ({
  select: jest.fn().mockReturnValue({
    selectAll: jest.fn().mockReturnValue({
      remove: jest.fn(),
    }),
    attr: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnValue({
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      datum: jest.fn().mockReturnThis(),
      data: jest.fn().mockReturnValue({
        enter: jest.fn().mockReturnValue({
          append: jest.fn().mockReturnValue({
            attr: jest.fn().mockReturnThis(),
            style: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            append: jest.fn().mockReturnThis(),
          }),
        }),
      }),
    }),
  }),
  scaleLinear: jest.fn().mockReturnValue({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    nice: jest.fn().mockReturnThis(),
    invert: jest.fn().mockReturnValue(0),
  }),
  scaleBand: jest.fn().mockReturnValue({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    padding: jest.fn().mockReturnThis(),
    bandwidth: jest.fn().mockReturnValue(10),
  }),
  scaleOrdinal: jest.fn().mockReturnValue({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  }),
  axisBottom: jest.fn().mockReturnValue({
    tickSize: jest.fn().mockReturnThis(),
    tickFormat: jest.fn().mockReturnThis(),
  }),
  axisLeft: jest.fn().mockReturnValue({
    tickSize: jest.fn().mockReturnThis(),
    tickFormat: jest.fn().mockReturnThis(),
  }),
  line: jest.fn().mockReturnValue({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
    curve: jest.fn().mockReturnThis(),
  }),
  curveMonotoneX: {},
  max: jest.fn().mockReturnValue(100),
  min: jest.fn().mockReturnValue(0),
  pointer: jest.fn().mockReturnValue([0, 0]),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    createChildLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

// Mock agent and environment
class MockAgent {
  constructor() {}
  update() { return { loss: 0.1 }; }
  selectAction() { return 0; }
  getLastTrainingMetrics() { return { loss: 0.1, entropy: 0.5 }; }
  estimateValue() { return 0.5; }
  getActionProbabilities() { return [0.2, 0.8]; }
}

class MockEnvironment {
  constructor() {}
  step() { return { state: [0, 0], reward: 1, done: false }; }
  reset() { return [0, 0]; }
  render() { return new Uint8Array(100 * 100 * 3); }
}

describe('Visualization System', () => {
  describe('DataCollector', () => {
    let dataCollector: DataCollector;
    
    beforeEach(() => {
      dataCollector = new DataCollector('test-experiment');
    });
    
    test('should collect metrics', () => {
      dataCollector.collectMetric('test/metric', 0.5, MetricType.SCALAR);
      expect(dataCollector.getMetrics().length).toBeGreaterThan(0);
    });
    
    test('should record states', () => {
      dataCollector.recordState({ position: [0, 0] });
      expect(dataCollector.getStates().length).toBeGreaterThan(0);
    });
    
    test('should record actions', () => {
      dataCollector.recordAction(1);
      expect(dataCollector.getActions().length).toBeGreaterThan(0);
    });
    
    test('should track episodes', () => {
      dataCollector.startEpisode();
      dataCollector.recordState({ position: [0, 0] });
      dataCollector.recordAction(1);
      dataCollector.endEpisode();
      expect(dataCollector.getEpisodes().length).toBeGreaterThan(0);
    });
  });
  
  describe('AgentVisualizationHooks', () => {
    let dataCollector: DataCollector;
    let agent: MockAgent;
    let agentHooks: AgentVisualizationHooks;
    
    beforeEach(() => {
      dataCollector = new DataCollector('test-experiment');
      agent = new MockAgent();
      agentHooks = new AgentVisualizationHooks(agent, dataCollector);
    });
    
    test('should initialize correctly', () => {
      expect(agentHooks).toBeDefined();
    });
    
    test('should collect agent data during update', () => {
      agent.update({ state: [0, 0] });
      expect(dataCollector.getMetrics().length).toBeGreaterThan(0);
    });
    
    test('should collect policy data during action selection', () => {
      agent.selectAction([0, 0]);
      expect(dataCollector.getMetrics().some(m => m.name.includes('policy'))).toBeTruthy();
    });
  });
  
  describe('EnvironmentVisualizationHooks', () => {
    let dataCollector: DataCollector;
    let environment: MockEnvironment;
    let environmentHooks: EnvironmentVisualizationHooks;
    
    beforeEach(() => {
      dataCollector = new DataCollector('test-experiment');
      environment = new MockEnvironment();
      environmentHooks = new EnvironmentVisualizationHooks(environment, dataCollector);
    });
    
    test('should initialize correctly', () => {
      expect(environmentHooks).toBeDefined();
    });
    
    test('should collect state information during step', () => {
      environment.step(0);
      expect(dataCollector.getStates().length).toBeGreaterThan(0);
    });
    
    test('should collect render frames', () => {
      environment.step(0);
      expect(dataCollector.getMetrics().some(m => m.name.includes('frame'))).toBeTruthy();
    });
  });
  
  describe('ExperimentVisualizationHooks', () => {
    let dataCollector: DataCollector;
    let experimentHooks: ExperimentVisualizationHooks;
    
    beforeEach(() => {
      dataCollector = new DataCollector('test-experiment');
      experimentHooks = new ExperimentVisualizationHooks('test-experiment', dataCollector);
    });
    
    test('should initialize correctly', () => {
      expect(experimentHooks).toBeDefined();
    });
    
    test('should record experiment progress', () => {
      experimentHooks.recordExperimentProgress(100, 5, { reward: 10 });
      expect(dataCollector.getMetrics().some(m => m.name.includes('experiment'))).toBeTruthy();
    });
    
    test('should record experiment end', () => {
      experimentHooks.recordExperimentEnd(true, { finalReward: 100 });
      expect(dataCollector.getMetrics().some(m => m.name.includes('success'))).toBeTruthy();
    });
  });
  
  describe('VisualizationManager', () => {
    let visualizationManager: VisualizationManager;
    
    beforeEach(() => {
      visualizationManager = new VisualizationManager();
    });
    
    test('should initialize correctly', () => {
      const result = visualizationManager.initialize('test-experiment');
      expect(result).toBeTruthy();
    });
    
    test('should register agent', () => {
      visualizationManager.initialize('test-experiment');
      const result = visualizationManager.registerAgent(new MockAgent());
      expect(result).toBeTruthy();
    });
    
    test('should register environment', () => {
      visualizationManager.initialize('test-experiment');
      const result = visualizationManager.registerEnvironment(new MockEnvironment());
      expect(result).toBeTruthy();
    });
    
    test('should create metrics dashboard', () => {
      visualizationManager.initialize('test-experiment');
      const dashboard = visualizationManager.createMetricsDashboard({});
      expect(dashboard).toBeDefined();
    });
    
    test('should create agent dashboard', () => {
      visualizationManager.initialize('test-experiment');
      const dashboard = visualizationManager.createAgentDashboard({
        renderState: (state) => <div>State: {JSON.stringify(state)}</div>
      });
      expect(dashboard).toBeDefined();
    });
  });
  
  describe('VisualizedExperimentRunner', () => {
    let runner: VisualizedExperimentRunner;
    
    beforeEach(() => {
      runner = new VisualizedExperimentRunner({
        experimentId: 'test-experiment',
        agentConfig: { type: 'mock' },
        environmentConfig: { type: 'mock' },
        visualizationConfig: { enabled: true },
        maxSteps: 1000,
        maxEpisodes: 10
      });
    });
    
    test('should initialize correctly', () => {
      expect(runner).toBeDefined();
    });
    
    test('should have visualization manager', () => {
      const visualizationManager = runner.getVisualizationManager();
      expect(visualizationManager).toBeDefined();
    });
    
    test('should create metrics dashboard', () => {
      const dashboard = runner.createMetricsDashboard({});
      expect(dashboard).toBeDefined();
    });
    
    test('should create agent dashboard', () => {
      const dashboard = runner.createAgentDashboard({
        renderState: (state) => <div>State: {JSON.stringify(state)}</div>
      });
      expect(dashboard).toBeDefined();
    });
  });
  
  describe('Visualization Components', () => {
    describe('MetricsCharts', () => {
      test('LineChart should render', () => {
        const { container } = render(
          <MetricsCharts.LineChart 
            data={[
              { name: 'test', step: 0, value: 0, timestamp: 0 },
              { name: 'test', step: 1, value: 1, timestamp: 1 }
            ]} 
          />
        );
        expect(container).toBeDefined();
      });
      
      test('BarChart should render', () => {
        const { container } = render(
          <MetricsCharts.BarChart 
            data={[
              { name: 'A', step: 0, value: 10, timestamp: 0 },
              { name: 'B', step: 0, value: 20, timestamp: 0 }
            ]} 
          />
        );
        expect(container).toBeDefined();
      });
      
      test('HeatMap should render', () => {
        const { container } = render(
          <MetricsCharts.HeatMap 
            data={[
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]
            ]} 
          />
        );
        expect(container).toBeDefined();
      });
      
      test('ScatterPlot should render', () => {
        const { container } = render(
          <MetricsCharts.ScatterPlot 
            data={[
              { x: 1, y: 2 },
              { x: 3, y: 4, label: 'Point', group: 'A' }
            ]} 
          />
        );
        expect(container).toBeDefined();
      });
    });
    
    describe('SimulationViewers', () => {
      test('GridWorldViewer should render', () => {
        const { container } = render(
          <SimulationViewers.GridWorldViewer 
            state={[
              [0, 0, 0],
              [0, 1, 0],
              [0, 0, 0]
            ]}
            agentPosition={{ x: 0, y: 0 }}
            goalPosition={{ x: 2, y: 2 }}
          />
        );
        expect(container).toBeDefined();
      });
      
      test('ContinuousSpaceViewer should render', () => {
        const { container } = render(
          <SimulationViewers.ContinuousSpaceViewer 
            state={{ x: 0.5, y: 0.5 }}
            agentPosition={{ x: 0.5, y: 0.5 }}
            goalPosition={{ x: 0.8, y: 0.8 }}
          />
        );
        expect(container).toBeDefined();
      });
      
      test('EpisodePlayer should render', () => {
        const { container } = render(
          <SimulationViewers.EpisodePlayer 
            episodeData={{
              states: [
                { state: { x: 0, y: 0 }, step: 0, timestamp: 0 },
                { state: { x: 1, y: 1 }, step: 1, timestamp: 1 }
              ],
              actions: [
                { action: 0, step: 0, timestamp: 0 },
                { action: 1, step: 1, timestamp: 1 }
              ]
            }}
            renderState={(state) => <div>State: {JSON.stringify(state)}</div>}
          />
        );
        expect(container).toBeDefined();
      });
      
      test('ComparisonViewer should render', () => {
        const { container } = render(
          <SimulationViewers.ComparisonViewer 
            episodes={[
              {
                id: 'episode1',
                name: 'Episode 1',
                states: [
                  { state: { x: 0, y: 0 }, step: 0, timestamp: 0 },
                  { state: { x: 1, y: 1 }, step: 1, timestamp: 1 }
                ],
                actions: [
                  { action: 0, step: 0, timestamp: 0 },
                  { action: 1, step: 1, timestamp: 1 }
                ]
              },
              {
                id: 'episode2',
                name: 'Episode 2',
                states: [
                  { state: { x: 0, y: 0 }, step: 0, timestamp: 0 },
                  { state: { x: 2, y: 2 }, step: 1, timestamp: 1 }
                ],
                actions: [
                  { action: 0, step: 0, timestamp: 0 },
                  { action: 2, step: 1, timestamp: 1 }
                ]
              }
            ]}
            renderState={(state) => <div>State: {JSON.stringify(state)}</div>}
          />
        );
        expect(container).toBeDefined();
      });
    });
    
    describe('Dashboards', () => {
      test('Dashboard should render', () => {
        const { container } = render(
          <Dashboards.Dashboard title="Test Dashboard">
            <div>Dashboard content</div>
          </Dashboards.Dashboard>
        );
        expect(container).toBeDefined();
      });
      
      test('DashboardPanel should render', () => {
        const { container } = render(
          <Dashboards.DashboardPanel title="Test Panel">
            <div>Panel content</div>
          </Dashboards.DashboardPanel>
        );
        expect(container).toBeDefined();
      });
      
      test('MetricsDashboard should render', () => {
        const { container } = render(
          <Dashboards.MetricsDashboard 
            metrics={[
              { name: 'metric1', step: 0, value: 0, timestamp: 0 },
              { name: 'metric1', step: 1, value: 1, timestamp: 1 },
              { name: 'metric2', step: 0, value: 10, timestamp: 0 },
              { name: 'metric2', step: 1, value: 20, timestamp: 1 }
            ]}
          />
        );
        expect(container).toBeDefined();
      });
      
      test('AgentDashboard should render', () => {
        const { container } = render(
          <Dashboards.AgentDashboard 
            metrics={[
              { name: 'agent/loss', step: 0, value: 0.5, timestamp: 0 },
              { name: 'agent/loss', step: 1, value: 0.4, timestamp: 1 }
            ]}
            episodeData={{
              states: [
                { state: { x: 0, y: 0 }, step: 0, timestamp: 0 },
                { state: { x: 1, y: 1 }, step: 1, timestamp: 1 }
              ],
              actions: [
                { action: 0, step: 0, timestamp: 0 },
                { action: 1, step: 1, timestamp: 1 }
              ]
            }}
            renderState={(state) => <div>State: {JSON.stringify(state)}</div>}
          />
        );
        expect(container).toBeDefined();
      });
      
      test('ExperimentDashboard should render', () => {
        const { container } = render(
          <Dashboards.ExperimentDashboard 
            experiments={[
              {
                id: 'exp1',
                name: 'Experiment 1',
                metrics: [
                  { name: 'reward', step: 0, value: 0, timestamp: 0 },
                  { name: 'reward', step: 1, value: 1, timestamp: 1 }
                ]
              },
              {
                id: 'exp2',
                name: 'Experiment 2',
                metrics: [
                  { name: 'reward', step: 0, value: 0, timestamp: 0 },
                  { name: 'reward', step: 1, value: 2, timestamp: 1 }
                ]
              }
            ]}
          />
        );
        expect(container).toBeDefined();
      });
    });
  });
});
