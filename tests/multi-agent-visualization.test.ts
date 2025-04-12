import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  AgentMetricDataPoint, 
  TeamMetricDataPoint,
  CommunicationRecord,
  InteractionRecord,
  AgentStateRecord,
  AgentActionRecord
} from '../src/utils/MultiAgentDataCollector';

// Mock React and D3 since we're testing in a Node environment
jest.mock('react', () => ({
  useState: jest.fn((init) => [init, jest.fn()]),
  useEffect: jest.fn((fn) => fn()),
  useRef: jest.fn(() => ({ current: {} })),
}));

jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn(),
    })),
    attr: jest.fn(() => ({
      attr: jest.fn(() => ({
        attr: jest.fn(() => ({
          style: jest.fn(() => ({
            style: jest.fn(),
          })),
        })),
      })),
    })),
    append: jest.fn(() => ({
      attr: jest.fn(() => ({
        attr: jest.fn(() => ({
          attr: jest.fn(() => ({
            attr: jest.fn(() => ({
              style: jest.fn(() => ({
                on: jest.fn(() => ({
                  append: jest.fn(() => ({
                    text: jest.fn(),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
  schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  interpolateGreens: jest.fn(() => '#00ff00'),
  interpolateReds: jest.fn(() => '#ff0000'),
}));

// Import the components to test
import { 
  MultiAgentLineChart,
  TeamComparisonBarChart,
  StackedBarChart,
  CommunicationNetworkChart
} from '../src/visualization/components/MultiAgentMetricsCharts';

import {
  MultiAgentGridWorldViewer,
  MultiAgentEpisodePlayer,
  AgentFilterPanel
} from '../src/visualization/components/MultiAgentSimulationViewers';

import {
  MultiAgentMetricsDashboard,
  MultiAgentInteractionDashboard,
  MultiAgentEpisodeAnalysisDashboard,
  MultiAgentDashboard
} from '../src/visualization/components/MultiAgentDashboards';

describe('Multi-Agent Visualization Components', () => {
  // Sample test data
  let sampleAgentMetrics: AgentMetricDataPoint[];
  let sampleTeamMetrics: TeamMetricDataPoint[];
  let sampleCommunications: CommunicationRecord[];
  let sampleInteractions: InteractionRecord[];
  let sampleAgentStates: AgentStateRecord[];
  let sampleAgentActions: AgentActionRecord[];
  
  beforeEach(() => {
    // Initialize sample data
    sampleAgentMetrics = [
      { 
        name: 'reward', 
        value: 10, 
        step: 1, 
        timestamp: Date.now(), 
        agentId: 'agent1', 
        teamId: 'team1' 
      },
      { 
        name: 'reward', 
        value: 15, 
        step: 2, 
        timestamp: Date.now() + 100, 
        agentId: 'agent1', 
        teamId: 'team1' 
      },
      { 
        name: 'reward', 
        value: 5, 
        step: 1, 
        timestamp: Date.now(), 
        agentId: 'agent2', 
        teamId: 'team2' 
      },
      { 
        name: 'reward', 
        value: 8, 
        step: 2, 
        timestamp: Date.now() + 100, 
        agentId: 'agent2', 
        teamId: 'team2' 
      }
    ];
    
    sampleTeamMetrics = [
      { 
        name: 'team_reward', 
        value: 25, 
        step: 1, 
        timestamp: Date.now(), 
        teamId: 'team1' 
      },
      { 
        name: 'team_reward', 
        value: 35, 
        step: 2, 
        timestamp: Date.now() + 100, 
        teamId: 'team1' 
      },
      { 
        name: 'team_reward', 
        value: 15, 
        step: 1, 
        timestamp: Date.now(), 
        teamId: 'team2' 
      },
      { 
        name: 'team_reward', 
        value: 20, 
        step: 2, 
        timestamp: Date.now() + 100, 
        teamId: 'team2' 
      }
    ];
    
    sampleCommunications = [
      {
        messageId: 'msg1',
        senderId: 'agent1',
        senderTeamId: 'team1',
        receiverId: 'agent2',
        receiverTeamId: 'team2',
        content: 'Hello agent2',
        step: 1,
        timestamp: Date.now()
      },
      {
        messageId: 'msg2',
        senderId: 'agent2',
        senderTeamId: 'team2',
        receiverId: 'agent1',
        receiverTeamId: 'team1',
        content: 'Hello agent1',
        step: 2,
        timestamp: Date.now() + 100
      },
      {
        messageId: 'msg3',
        senderId: 'agent1',
        senderTeamId: 'team1',
        content: 'Broadcast message',
        step: 3,
        timestamp: Date.now() + 200
      }
    ];
    
    sampleInteractions = [
      {
        interactionId: 'int1',
        type: 'cooperation',
        agentIds: ['agent1', 'agent2'],
        teamIds: ['team1', 'team2'],
        outcome: 'success',
        step: 1,
        timestamp: Date.now()
      },
      {
        interactionId: 'int2',
        type: 'competition',
        agentIds: ['agent1', 'agent2'],
        teamIds: ['team1', 'team2'],
        outcome: 'agent1 won',
        step: 2,
        timestamp: Date.now() + 100
      }
    ];
    
    sampleAgentStates = [
      {
        agentId: 'agent1',
        teamId: 'team1',
        position: { x: 1, y: 1 },
        step: 1,
        timestamp: Date.now()
      },
      {
        agentId: 'agent2',
        teamId: 'team2',
        position: { x: 3, y: 3 },
        step: 1,
        timestamp: Date.now()
      },
      {
        agentId: 'agent1',
        teamId: 'team1',
        position: { x: 2, y: 1 },
        step: 2,
        timestamp: Date.now() + 100
      },
      {
        agentId: 'agent2',
        teamId: 'team2',
        position: { x: 3, y: 2 },
        step: 2,
        timestamp: Date.now() + 100
      }
    ];
    
    sampleAgentActions = [
      {
        agentId: 'agent1',
        teamId: 'team1',
        action: 'move_right',
        step: 1,
        timestamp: Date.now()
      },
      {
        agentId: 'agent2',
        teamId: 'team2',
        action: 'move_up',
        step: 1,
        timestamp: Date.now()
      }
    ];
  });
  
  describe('MultiAgentMetricsCharts', () => {
    it('should render MultiAgentLineChart without errors', () => {
      const chart = new MultiAgentLineChart({
        data: sampleAgentMetrics,
        width: 500,
        height: 300,
        title: 'Test Chart'
      });
      
      expect(chart).toBeDefined();
    });
    
    it('should render TeamComparisonBarChart without errors', () => {
      const chart = new TeamComparisonBarChart({
        data: sampleTeamMetrics,
        width: 500,
        height: 300,
        title: 'Test Chart'
      });
      
      expect(chart).toBeDefined();
    });
    
    it('should render StackedBarChart without errors', () => {
      const chart = new StackedBarChart({
        data: sampleAgentMetrics,
        width: 500,
        height: 300,
        title: 'Test Chart'
      });
      
      expect(chart).toBeDefined();
    });
    
    it('should render CommunicationNetworkChart without errors', () => {
      const chart = new CommunicationNetworkChart({
        data: sampleCommunications,
        width: 500,
        height: 300,
        title: 'Test Chart'
      });
      
      expect(chart).toBeDefined();
    });
    
    it('should handle empty data gracefully', () => {
      const chart1 = new MultiAgentLineChart({
        data: [],
        width: 500,
        height: 300,
        title: 'Empty Chart'
      });
      
      const chart2 = new TeamComparisonBarChart({
        data: [],
        width: 500,
        height: 300,
        title: 'Empty Chart'
      });
      
      const chart3 = new StackedBarChart({
        data: [],
        width: 500,
        height: 300,
        title: 'Empty Chart'
      });
      
      const chart4 = new CommunicationNetworkChart({
        data: [],
        width: 500,
        height: 300,
        title: 'Empty Chart'
      });
      
      expect(chart1).toBeDefined();
      expect(chart2).toBeDefined();
      expect(chart3).toBeDefined();
      expect(chart4).toBeDefined();
    });
  });
  
  describe('MultiAgentSimulationViewers', () => {
    it('should render MultiAgentGridWorldViewer without errors', () => {
      const viewer = new MultiAgentGridWorldViewer({
        gridSize: { width: 5, height: 5 },
        agentStates: sampleAgentStates.filter(s => s.step === 1),
        obstacles: [{ x: 2, y: 2 }],
        goals: [{ x: 4, y: 4, reward: 10 }]
      });
      
      expect(viewer).toBeDefined();
    });
    
    it('should render MultiAgentEpisodePlayer without errors', () => {
      const player = new MultiAgentEpisodePlayer({
        gridSize: { width: 5, height: 5 },
        episodeStates: sampleAgentStates,
        episodeActions: sampleAgentActions,
        episodeCommunications: sampleCommunications,
        episodeInteractions: sampleInteractions,
        obstacles: [{ x: 2, y: 2 }],
        goals: [{ x: 4, y: 4, reward: 10 }]
      });
      
      expect(player).toBeDefined();
    });
    
    it('should render AgentFilterPanel without errors', () => {
      const panel = new AgentFilterPanel({
        agents: [
          { id: 'agent1', teamId: 'team1' },
          { id: 'agent2', teamId: 'team2' }
        ],
        teams: [
          { id: 'team1' },
          { id: 'team2' }
        ],
        selectedAgentIds: [],
        selectedTeamIds: [],
        onAgentSelectionChange: jest.fn(),
        onTeamSelectionChange: jest.fn()
      });
      
      expect(panel).toBeDefined();
    });
    
    it('should handle empty data gracefully', () => {
      const viewer = new MultiAgentGridWorldViewer({
        gridSize: { width: 5, height: 5 },
        agentStates: []
      });
      
      const player = new MultiAgentEpisodePlayer({
        gridSize: { width: 5, height: 5 },
        episodeStates: []
      });
      
      const panel = new AgentFilterPanel({
        agents: [],
        teams: [],
        selectedAgentIds: [],
        selectedTeamIds: [],
        onAgentSelectionChange: jest.fn(),
        onTeamSelectionChange: jest.fn()
      });
      
      expect(viewer).toBeDefined();
      expect(player).toBeDefined();
      expect(panel).toBeDefined();
    });
  });
  
  describe('MultiAgentDashboards', () => {
    it('should render MultiAgentMetricsDashboard without errors', () => {
      const dashboard = new MultiAgentMetricsDashboard({
        agentMetrics: sampleAgentMetrics,
        teamMetrics: sampleTeamMetrics
      });
      
      expect(dashboard).toBeDefined();
    });
    
    it('should render MultiAgentInteractionDashboard without errors', () => {
      const dashboard = new MultiAgentInteractionDashboard({
        communications: sampleCommunications,
        interactions: sampleInteractions,
        agentStates: sampleAgentStates
      });
      
      expect(dashboard).toBeDefined();
    });
    
    it('should render MultiAgentEpisodeAnalysisDashboard without errors', () => {
      const dashboard = new MultiAgentEpisodeAnalysisDashboard({
        episodeStates: sampleAgentStates,
        episodeActions: sampleAgentActions,
        episodeCommunications: sampleCommunications,
        episodeInteractions: sampleInteractions,
        episodeMetrics: sampleAgentMetrics,
        gridSize: { width: 5, height: 5 }
      });
      
      expect(dashboard).toBeDefined();
    });
    
    it('should render comprehensive MultiAgentDashboard without errors', () => {
      const dashboard = new MultiAgentDashboard({
        agentMetrics: sampleAgentMetrics,
        teamMetrics: sampleTeamMetrics,
        communications: sampleCommunications,
        interactions: sampleInteractions,
        agentStates: sampleAgentStates,
        episodeStates: sampleAgentStates,
        episodeActions: sampleAgentActions,
        episodeCommunications: sampleCommunications,
        episodeInteractions: sampleInteractions,
        gridSize: { width: 5, height: 5 }
      });
      
      expect(dashboard).toBeDefined();
    });
    
    it('should handle empty data gracefully', () => {
      const dashboard1 = new MultiAgentMetricsDashboard({
        agentMetrics: [],
        teamMetrics: []
      });
      
      const dashboard2 = new MultiAgentInteractionDashboard({
        communications: [],
        interactions: [],
        agentStates: []
      });
      
      const dashboard3 = new MultiAgentEpisodeAnalysisDashboard({
        episodeStates: [],
        episodeActions: [],
        episodeCommunications: [],
        episodeInteractions: [],
        episodeMetrics: [],
        gridSize: { width: 5, height: 5 }
      });
      
      const dashboard4 = new MultiAgentDashboard({
        agentMetrics: [],
        teamMetrics: [],
        communications: [],
        interactions: [],
        agentStates: [],
        episodeStates: [],
        episodeActions: [],
        episodeCommunications: [],
        episodeInteractions: [],
        gridSize: { width: 5, height: 5 }
      });
      
      expect(dashboard1).toBeDefined();
      expect(dashboard2).toBeDefined();
      expect(dashboard3).toBeDefined();
      expect(dashboard4).toBeDefined();
    });
  });
  
  describe('Integration Tests', () => {
    it('should handle data filtering correctly', () => {
      // Create a dashboard with filter handlers
      const onAgentSelectionChange = jest.fn();
      const onTeamSelectionChange = jest.fn();
      
      const dashboard = new MultiAgentMetricsDashboard({
        agentMetrics: sampleAgentMetrics,
        teamMetrics: sampleTeamMetrics,
        onAgentSelectionChange,
        onTeamSelectionChange
      });
      
      expect(dashboard).toBeDefined();
      
      // Test filter panel integration
      const panel = new AgentFilterPanel({
        agents: [
          { id: 'agent1', teamId: 'team1' },
          { id: 'agent2', teamId: 'team2' }
        ],
        teams: [
          { id: 'team1' },
          { id: 'team2' }
        ],
        selectedAgentIds: [],
        selectedTeamIds: [],
        onAgentSelectionChange,
        onTeamSelectionChange
      });
      
      expect(panel).toBeDefined();
    });
    
    it('should integrate episode player with metrics visualization', () => {
      // Create an episode analysis dashboard
      const onStepChange = jest.fn();
      
      const dashboard = new MultiAgentEpisodeAnalysisDashboard({
        episodeStates: sampleAgentStates,
        episodeActions: sampleAgentActions,
        episodeCommunications: sampleCommunications,
        episodeInteractions: sampleInteractions,
        episodeMetrics: sampleAgentMetrics,
        gridSize: { width: 5, height: 5 },
        onStepChange
      });
      
      expect(dashboard).toBeDefined();
      
      // Test episode player integration
      const player = new MultiAgentEpisodePlayer({
        gridSize: { width: 5, height: 5 },
        episodeStates: sampleAgentStates,
        episodeActions: sampleAgentActions,
        episodeCommunications: sampleCommunications,
        episodeInteractions: sampleInteractions,
        onStepChange
      });
      
      expect(player).toBeDefined();
    });
  });
});
