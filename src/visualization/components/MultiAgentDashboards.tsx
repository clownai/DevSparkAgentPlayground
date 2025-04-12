/**
 * Enhanced dashboards for multi-agent visualization and analysis
 * 
 * This module extends the base Dashboards components to provide
 * specialized dashboards for multi-agent scenarios, including
 * team performance comparison, agent interaction analysis, and
 * communication pattern visualization.
 */

import React, { useState, useEffect } from 'react';
import { 
  MetricDataPoint 
} from '../../utils/DataCollector';
import {
  AgentMetricDataPoint,
  TeamMetricDataPoint,
  CommunicationRecord,
  InteractionRecord,
  AgentStateRecord
} from '../../utils/MultiAgentDataCollector';

// Import base dashboard components
import { 
  MetricsDashboard as BaseMetricsDashboard,
  AgentDashboard as BaseAgentDashboard,
  ExperimentDashboard as BaseExperimentDashboard
} from './Dashboards';

// Import multi-agent chart components
import {
  MultiAgentLineChart,
  TeamComparisonBarChart,
  StackedBarChart,
  CommunicationNetworkChart
} from './MultiAgentMetricsCharts';

// Import multi-agent simulation viewers
import {
  MultiAgentGridWorldViewer,
  MultiAgentEpisodePlayer,
  AgentFilterPanel
} from './MultiAgentSimulationViewers';

// Re-export original dashboard components
export { 
  BaseMetricsDashboard as MetricsDashboard,
  BaseAgentDashboard as AgentDashboard,
  BaseExperimentDashboard as ExperimentDashboard
};

/**
 * Props for MultiAgentMetricsDashboard component
 */
interface MultiAgentMetricsDashboardProps {
  agentMetrics: AgentMetricDataPoint[];
  teamMetrics: TeamMetricDataPoint[];
  width?: number;
  height?: number;
  title?: string;
  onMetricClick?: (metric: AgentMetricDataPoint | TeamMetricDataPoint) => void;
}

/**
 * Multi-agent metrics dashboard component
 */
export const MultiAgentMetricsDashboard: React.FC<MultiAgentMetricsDashboardProps> = ({
  agentMetrics,
  teamMetrics,
  width = 1200,
  height = 800,
  title = 'Multi-Agent Metrics Dashboard',
  onMetricClick
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [groupByTeam, setGroupByTeam] = useState<boolean>(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  
  // Extract unique metric names
  const metricNames = Array.from(new Set([
    ...agentMetrics.map(m => m.name.split('/').pop() || m.name),
    ...teamMetrics.map(m => m.name.split('/').pop() || m.name)
  ])).sort();
  
  // Extract unique agent IDs and team IDs
  const agentIds = Array.from(new Set(agentMetrics.map(m => m.agentId)));
  const teamIds = Array.from(new Set([
    ...teamMetrics.map(m => m.teamId),
    ...agentMetrics.filter(m => m.teamId).map(m => m.teamId!)
  ]));
  
  // Filter metrics based on selection
  const filteredAgentMetrics = agentMetrics.filter(m => {
    const metricNameMatch = !selectedMetric || m.name.includes(selectedMetric);
    const agentMatch = selectedAgentIds.length === 0 || selectedAgentIds.includes(m.agentId);
    const teamMatch = selectedTeamIds.length === 0 || (m.teamId && selectedTeamIds.includes(m.teamId));
    return metricNameMatch && agentMatch && teamMatch;
  });
  
  const filteredTeamMetrics = teamMetrics.filter(m => {
    const metricNameMatch = !selectedMetric || m.name.includes(selectedMetric);
    const teamMatch = selectedTeamIds.length === 0 || selectedTeamIds.includes(m.teamId);
    return metricNameMatch && teamMatch;
  });
  
  // Handle metric selection
  const handleMetricSelect = (metricName: string) => {
    setSelectedMetric(metricName === selectedMetric ? null : metricName);
  };
  
  // Handle agent selection
  const handleAgentSelectionChange = (agentIds: string[]) => {
    setSelectedAgentIds(agentIds);
  };
  
  // Handle team selection
  const handleTeamSelectionChange = (teamIds: string[]) => {
    setSelectedTeamIds(teamIds);
  };
  
  return (
    <div className="multi-agent-metrics-dashboard" style={{ width, padding: 20 }}>
      <h2>{title}</h2>
      
      <div className="dashboard-controls" style={{ display: 'flex', marginBottom: 20, gap: 20 }}>
        <div className="metric-selector" style={{ flex: 1 }}>
          <h3>Select Metric</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {metricNames.map(name => (
              <button
                key={name}
                onClick={() => handleMetricSelect(name)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: selectedMetric === name ? '#1976D2' : '#f0f0f0',
                  color: selectedMetric === name ? 'white' : 'black',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="view-options" style={{ flex: 0.5 }}>
          <h3>View Options</h3>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={groupByTeam}
              onChange={(e) => setGroupByTeam(e.target.checked)}
            />
            Group by Team
          </label>
        </div>
        
        <AgentFilterPanel
          agents={agentIds.map(id => ({ 
            id, 
            teamId: agentMetrics.find(m => m.agentId === id)?.teamId 
          }))}
          teams={teamIds.map(id => ({ id }))}
          selectedAgentIds={selectedAgentIds}
          selectedTeamIds={selectedTeamIds}
          onAgentSelectionChange={handleAgentSelectionChange}
          onTeamSelectionChange={handleTeamSelectionChange}
        />
      </div>
      
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Agent Performance Chart */}
        <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
          <h3>Agent Performance</h3>
          <MultiAgentLineChart
            data={filteredAgentMetrics}
            width={width - 60}
            height={300}
            title={`Agent ${selectedMetric || 'Metrics'} Over Time`}
            groupByTeam={groupByTeam}
            highlightAgents={selectedAgentIds}
            onPointClick={onMetricClick}
          />
        </div>
        
        {/* Team Comparison Chart */}
        {filteredTeamMetrics.length > 0 && (
          <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
            <h3>Team Comparison</h3>
            <TeamComparisonBarChart
              data={filteredTeamMetrics}
              width={width - 60}
              height={300}
              title={`Team ${selectedMetric || 'Metrics'} Comparison`}
              onBarClick={onMetricClick}
            />
          </div>
        )}
        
        {/* Agent Contribution Chart */}
        {filteredAgentMetrics.length > 0 && (
          <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
            <h3>Agent Contributions</h3>
            <StackedBarChart
              data={filteredAgentMetrics}
              width={width - 60}
              height={300}
              title={`Agent Contributions to ${selectedMetric || 'Metrics'}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Props for MultiAgentInteractionDashboard component
 */
interface MultiAgentInteractionDashboardProps {
  communications: CommunicationRecord[];
  interactions: InteractionRecord[];
  agentStates: AgentStateRecord[];
  width?: number;
  height?: number;
  title?: string;
  onCommunicationClick?: (communication: CommunicationRecord) => void;
  onInteractionClick?: (interaction: InteractionRecord) => void;
  onAgentClick?: (agentId: string) => void;
}

/**
 * Multi-agent interaction dashboard component
 */
export const MultiAgentInteractionDashboard: React.FC<MultiAgentInteractionDashboardProps> = ({
  communications,
  interactions,
  agentStates,
  width = 1200,
  height = 800,
  title = 'Multi-Agent Interaction Dashboard',
  onCommunicationClick,
  onInteractionClick,
  onAgentClick
}) => {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
  const [interactionTypes, setInteractionTypes] = useState<string[]>([]);
  
  // Extract unique agent IDs and team IDs
  const agentIds = Array.from(new Set([
    ...communications.map(c => c.senderId),
    ...communications.filter(c => c.receiverId).map(c => c.receiverId!),
    ...interactions.flatMap(i => i.agentIds)
  ]));
  
  const teamIds = Array.from(new Set([
    ...communications.filter(c => c.senderTeamId).map(c => c.senderTeamId!),
    ...communications.filter(c => c.receiverTeamId).map(c => c.receiverTeamId!),
    ...interactions.filter(i => i.teamIds).flatMap(i => i.teamIds!)
  ]));
  
  // Extract unique interaction types
  const uniqueInteractionTypes = Array.from(new Set(interactions.map(i => i.type)));
  
  // Calculate time range
  useEffect(() => {
    if (communications.length === 0 && interactions.length === 0) return;
    
    const allTimestamps = [
      ...communications.map(c => c.timestamp),
      ...interactions.map(i => i.timestamp)
    ];
    
    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);
    
    setTimeRange([minTime, maxTime]);
  }, [communications, interactions]);
  
  // Filter communications based on selection
  const filteredCommunications = communications.filter(c => {
    const agentMatch = selectedAgentIds.length === 0 || 
                      selectedAgentIds.includes(c.senderId) || 
                      (c.receiverId && selectedAgentIds.includes(c.receiverId));
    
    const teamMatch = selectedTeamIds.length === 0 || 
                     (c.senderTeamId && selectedTeamIds.includes(c.senderTeamId)) || 
                     (c.receiverTeamId && selectedTeamIds.includes(c.receiverTeamId));
    
    return agentMatch && teamMatch;
  });
  
  // Filter interactions based on selection
  const filteredInteractions = interactions.filter(i => {
    const agentMatch = selectedAgentIds.length === 0 || 
                      i.agentIds.some(id => selectedAgentIds.includes(id));
    
    const teamMatch = selectedTeamIds.length === 0 || 
                     (i.teamIds && i.teamIds.some(id => selectedTeamIds.includes(id)));
    
    const typeMatch = interactionTypes.length === 0 || 
                     interactionTypes.includes(i.type);
    
    return agentMatch && teamMatch && typeMatch;
  });
  
  // Filter agent states based on selection
  const filteredAgentStates = agentStates.filter(s => {
    const agentMatch = selectedAgentIds.length === 0 || 
                      selectedAgentIds.includes(s.agentId);
    
    const teamMatch = selectedTeamIds.length === 0 || 
                     (s.teamId && selectedTeamIds.includes(s.teamId));
    
    return agentMatch && teamMatch;
  });
  
  // Get latest agent states
  const latestAgentStates = filteredAgentStates.reduce((acc, state) => {
    const existing = acc.find(s => s.agentId === state.agentId);
    if (!existing || state.step > existing.step) {
      return [...acc.filter(s => s.agentId !== state.agentId), state];
    }
    return acc;
  }, [] as AgentStateRecord[]);
  
  // Handle agent selection
  const handleAgentSelectionChange = (agentIds: string[]) => {
    setSelectedAgentIds(agentIds);
  };
  
  // Handle team selection
  const handleTeamSelectionChange = (teamIds: string[]) => {
    setSelectedTeamIds(teamIds);
  };
  
  // Handle interaction type selection
  const handleInteractionTypeChange = (type: string) => {
    if (interactionTypes.includes(type)) {
      setInteractionTypes(interactionTypes.filter(t => t !== type));
    } else {
      setInteractionTypes([...interactionTypes, type]);
    }
  };
  
  // Calculate communication statistics
  const communicationStats = {
    total: filteredCommunications.length,
    byAgent: filteredCommunications.reduce((acc, c) => {
      acc[c.senderId] = (acc[c.senderId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byTeam: filteredCommunications.reduce((acc, c) => {
      if (c.senderTeamId) {
        acc[c.senderTeamId] = (acc[c.senderTeamId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  };
  
  // Calculate interaction statistics
  const interactionStats = {
    total: filteredInteractions.length,
    byType: filteredInteractions.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byAgent: filteredInteractions.reduce((acc, i) => {
      i.agentIds.forEach(agentId => {
        acc[agentId] = (acc[agentId] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>),
    byTeam: filteredInteractions.reduce((acc, i) => {
      if (i.teamIds) {
        i.teamIds.forEach(teamId => {
          acc[teamId] = (acc[teamId] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>)
  };
  
  return (
    <div className="multi-agent-interaction-dashboard" style={{ width, padding: 20 }}>
      <h2>{title}</h2>
      
      <div className="dashboard-controls" style={{ display: 'flex', marginBottom: 20, gap: 20 }}>
        <AgentFilterPanel
          agents={agentIds.map(id => ({ 
            id, 
            teamId: agentStates.find(s => s.agentId === id)?.teamId 
          }))}
          teams={teamIds.map(id => ({ id }))}
          selectedAgentIds={selectedAgentIds}
          selectedTeamIds={selectedTeamIds}
          onAgentSelectionChange={handleAgentSelectionChange}
          onTeamSelectionChange={handleTeamSelectionChange}
        />
        
        {uniqueInteractionTypes.length > 0 && (
          <div className="interaction-type-filter" style={{ flex: 1 }}>
            <h3>Interaction Types</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {uniqueInteractionTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleInteractionTypeChange(type)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: interactionTypes.includes(type) ? '#1976D2' : '#f0f0f0',
                    color: interactionTypes.includes(type) ? 'white' : 'black',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Communication Network */}
        <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
          <h3>Communication Network</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 2 }}>
              <CommunicationNetworkChart
                data={filteredCommunications}
                width={(width - 60) * 0.7}
                height={400}
                title="Agent Communication Patterns"
                onNodeClick={onAgentClick}
                onLinkClick={onCommunicationClick}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h4>Communication Statistics</h4>
              <p>Total Messages: {communicationStats.total}</p>
              
              <h5>Top Communicators</h5>
              <ul style={{ maxHeight: 150, overflowY: 'auto' }}>
                {Object.entries(communicationStats.byAgent)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([agentId, count]) => (
                    <li key={agentId}>
                      Agent {agentId}: {count} messages
                    </li>
                  ))}
              </ul>
              
              {Object.keys(communicationStats.byTeam).length > 0 && (
                <>
                  <h5>Team Communication</h5>
                  <ul style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {Object.entries(communicationStats.byTeam)
                      .sort((a, b) => b[1] - a[1])
                      .map(([teamId, count]) => (
                        <li key={teamId}>
                          Team {teamId}: {count} messages
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Agent Positions and Interactions */}
        {latestAgentStates.length > 0 && latestAgentStates.some(s => s.position) && (
          <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
            <h3>Agent Positions and Interactions</h3>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 2 }}>
                <MultiAgentGridWorldViewer
                  width={(width - 60) * 0.7}
                  height={400}
                  gridSize={{ width: 10, height: 10 }} // Adjust based on your environment
                  agentStates={latestAgentStates}
                  interactions={filteredInteractions}
                  communications={filteredCommunications}
                  showAgentIds={true}
                  showTeamIds={true}
                  showCommunications={true}
                  showInteractions={true}
                  onAgentClick={onAgentClick}
                />
              </div>
              <div style={{ flex: 1 }}>
                <h4>Interaction Statistics</h4>
                <p>Total Interactions: {interactionStats.total}</p>
                
                <h5>By Type</h5>
                <ul style={{ maxHeight: 100, overflowY: 'auto' }}>
                  {Object.entries(interactionStats.byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <li key={type}>
                        {type}: {count} interactions
                      </li>
                    ))}
                </ul>
                
                <h5>Most Interactive Agents</h5>
                <ul style={{ maxHeight: 100, overflowY: 'auto' }}>
                  {Object.entries(interactionStats.byAgent)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([agentId, count]) => (
                      <li key={agentId}>
                        Agent {agentId}: {count} interactions
                      </li>
                    ))}
                </ul>
                
                {Object.keys(interactionStats.byTeam).length > 0 && (
                  <>
                    <h5>Team Interactions</h5>
                    <ul style={{ maxHeight: 100, overflowY: 'auto' }}>
                      {Object.entries(interactionStats.byTeam)
                        .sort((a, b) => b[1] - a[1])
                        .map(([teamId, count]) => (
                          <li key={teamId}>
                            Team {teamId}: {count} interactions
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Props for MultiAgentEpisodeAnalysisDashboard component
 */
interface MultiAgentEpisodeAnalysisDashboardProps {
  episodeStates: AgentStateRecord[];
  episodeActions: AgentActionRecord[];
  episodeCommunications: CommunicationRecord[];
  episodeInteractions: InteractionRecord[];
  episodeMetrics: AgentMetricDataPoint[];
  gridSize: { width: number; height: number };
  obstacles?: { x: number; y: number }[];
  goals?: { x: number; y: number; reward?: number }[];
  width?: number;
  height?: number;
  title?: string;
  onAgentClick?: (agentId: string) => void;
}

/**
 * Multi-agent episode analysis dashboard component
 */
export const MultiAgentEpisodeAnalysisDashboard: React.FC<MultiAgentEpisodeAnalysisDashboardProps> = ({
  episodeStates,
  episodeActions,
  episodeCommunications,
  episodeInteractions,
  episodeMetrics,
  gridSize,
  obstacles = [],
  goals = [],
  width = 1200,
  height = 800,
  title = 'Multi-Agent Episode Analysis',
  onAgentClick
}) => {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  
  // Extract unique agent IDs and team IDs
  const agentIds = Array.from(new Set(episodeStates.map(s => s.agentId)));
  const teamIds = Array.from(new Set(episodeStates.filter(s => s.teamId).map(s => s.teamId!)));
  
  // Extract unique steps
  const steps = Array.from(new Set(episodeStates.map(s => s.step))).sort((a, b) => a - b);
  
  // Extract unique metric names
  const metricNames = Array.from(new Set(episodeMetrics.map(m => m.name.split('/').pop() || m.name))).sort();
  
  // Filter states for the current step
  const currentStepStates = episodeStates.filter(s => {
    const stepMatch = s.step === steps[currentStep];
    const agentMatch = selectedAgentIds.length === 0 || selectedAgentIds.includes(s.agentId);
    const teamMatch = selectedTeamIds.length === 0 || (s.teamId && selectedTeamIds.includes(s.teamId));
    return stepMatch && agentMatch && teamMatch;
  });
  
  // Filter communications for the current step
  const currentStepCommunications = episodeCommunications.filter(c => {
    const stepMatch = c.step === steps[currentStep];
    const senderMatch = selectedAgentIds.length === 0 || selectedAgentIds.includes(c.senderId);
    const receiverMatch = !c.receiverId || selectedAgentIds.length === 0 || selectedAgentIds.includes(c.receiverId);
    const senderTeamMatch = selectedTeamIds.length === 0 || (c.senderTeamId && selectedTeamIds.includes(c.senderTeamId));
    const receiverTeamMatch = !c.receiverTeamId || selectedTeamIds.length === 0 || selectedTeamIds.includes(c.receiverTeamId);
    return stepMatch && senderMatch && receiverMatch && senderTeamMatch && receiverTeamMatch;
  });
  
  // Filter interactions for the current step
  const currentStepInteractions = episodeInteractions.filter(i => {
    const stepMatch = i.step === steps[currentStep];
    const agentMatch = selectedAgentIds.length === 0 || i.agentIds.some(id => selectedAgentIds.includes(id));
    const teamMatch = selectedTeamIds.length === 0 || (i.teamIds && i.teamIds.some(id => selectedTeamIds.includes(id)));
    return stepMatch && agentMatch && teamMatch;
  });
  
  // Filter metrics based on selection
  const filteredMetrics = episodeMetrics.filter(m => {
    const metricNameMatch = !selectedMetric || m.name.includes(selectedMetric);
    const agentMatch = selectedAgentIds.length === 0 || selectedAgentIds.includes(m.agentId);
    const teamMatch = selectedTeamIds.length === 0 || (m.teamId && selectedTeamIds.includes(m.teamId));
    return metricNameMatch && agentMatch && teamMatch;
  });
  
  // Handle agent selection
  const handleAgentSelectionChange = (agentIds: string[]) => {
    setSelectedAgentIds(agentIds);
  };
  
  // Handle team selection
  const handleTeamSelectionChange = (teamIds: string[]) => {
    setSelectedTeamIds(teamIds);
  };
  
  // Handle step change
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };
  
  // Handle metric selection
  const handleMetricSelect = (metricName: string) => {
    setSelectedMetric(metricName === selectedMetric ? null : metricName);
  };
  
  // Handle playback complete
  const handlePlaybackComplete = () => {
    setIsPlaying(false);
  };
  
  return (
    <div className="multi-agent-episode-analysis-dashboard" style={{ width, padding: 20 }}>
      <h2>{title}</h2>
      
      <div className="dashboard-controls" style={{ display: 'flex', marginBottom: 20, gap: 20 }}>
        <AgentFilterPanel
          agents={agentIds.map(id => ({ 
            id, 
            teamId: episodeStates.find(s => s.agentId === id)?.teamId 
          }))}
          teams={teamIds.map(id => ({ id }))}
          selectedAgentIds={selectedAgentIds}
          selectedTeamIds={selectedTeamIds}
          onAgentSelectionChange={handleAgentSelectionChange}
          onTeamSelectionChange={handleTeamSelectionChange}
        />
        
        <div className="metric-selector" style={{ flex: 1 }}>
          <h3>Select Metric</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {metricNames.map(name => (
              <button
                key={name}
                onClick={() => handleMetricSelect(name)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: selectedMetric === name ? '#1976D2' : '#f0f0f0',
                  color: selectedMetric === name ? 'white' : 'black',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Episode Player */}
        <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
          <h3>Episode Playback</h3>
          <MultiAgentEpisodePlayer
            width={width - 60}
            height={400}
            gridSize={gridSize}
            episodeStates={episodeStates}
            episodeActions={episodeActions}
            episodeCommunications={episodeCommunications}
            episodeInteractions={episodeInteractions}
            obstacles={obstacles}
            goals={goals}
            showAgentIds={true}
            showTeamIds={true}
            showCommunications={true}
            showInteractions={true}
            showControls={true}
            autoPlay={isPlaying}
            playbackSpeed={playbackSpeed}
            onAgentClick={onAgentClick}
            onStepChange={handleStepChange}
            onPlaybackComplete={handlePlaybackComplete}
            selectedAgentIds={selectedAgentIds}
            selectedTeamIds={selectedTeamIds}
          />
        </div>
        
        {/* Agent Metrics Chart */}
        <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
          <h3>Agent Metrics</h3>
          <MultiAgentLineChart
            data={filteredMetrics}
            width={width - 60}
            height={300}
            title={`Agent ${selectedMetric || 'Metrics'} Over Time`}
            highlightAgents={selectedAgentIds}
          />
        </div>
        
        {/* Current Step Analysis */}
        <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
          <h3>Current Step Analysis (Step {steps[currentStep]})</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <h4>Agent States</h4>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Agent</th>
                      <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Team</th>
                      <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStepStates.map(state => (
                      <tr key={state.agentId}>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{state.agentId}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{state.teamId || '-'}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>
                          {state.position ? `(${state.position.x}, ${state.position.y})` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <h4>Communications</h4>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {currentStepCommunications.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>From</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>To</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStepCommunications.map(comm => (
                        <tr key={comm.messageId}>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{comm.senderId}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{comm.receiverId || 'Broadcast'}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            {typeof comm.content === 'object' 
                              ? JSON.stringify(comm.content).substring(0, 30) + '...'
                              : String(comm.content).substring(0, 30) + (String(comm.content).length > 30 ? '...' : '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No communications at this step</p>
                )}
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <h4>Interactions</h4>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {currentStepInteractions.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Type</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Agents</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStepInteractions.map(interaction => (
                        <tr key={interaction.interactionId}>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{interaction.type}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>{interaction.agentIds.join(', ')}</td>
                          <td style={{ border: '1px solid #ddd', padding: 8 }}>
                            {interaction.outcome 
                              ? (typeof interaction.outcome === 'object' 
                                ? JSON.stringify(interaction.outcome).substring(0, 30) + '...'
                                : String(interaction.outcome).substring(0, 30) + (String(interaction.outcome).length > 30 ? '...' : ''))
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No interactions at this step</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Props for MultiAgentDashboard component
 */
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
  obstacles?: { x: number; y: number }[];
  goals?: { x: number; y: number; reward?: number }[];
  width?: number;
  height?: number;
  title?: string;
}

/**
 * Comprehensive multi-agent dashboard component
 */
export const MultiAgentDashboard: React.FC<MultiAgentDashboardProps> = ({
  agentMetrics,
  teamMetrics,
  communications,
  interactions,
  agentStates,
  episodeStates,
  episodeActions,
  episodeCommunications,
  episodeInteractions,
  gridSize,
  obstacles = [],
  goals = [],
  width = 1200,
  height = 800,
  title = 'Multi-Agent System Dashboard'
}) => {
  const [activeTab, setActiveTab] = useState<string>('metrics');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Handle agent click
  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(agentId);
  };
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Filter metrics for selected agent
  const selectedAgentMetrics = selectedAgentId 
    ? agentMetrics.filter(m => m.agentId === selectedAgentId)
    : [];
  
  return (
    <div className="multi-agent-dashboard" style={{ width, padding: 20 }}>
      <h2>{title}</h2>
      
      {selectedAgentId && (
        <div className="selected-agent-info" style={{ 
          padding: 10, 
          backgroundColor: '#f0f0f0', 
          borderRadius: 4,
          marginBottom: 15
        }}>
          <h3>Selected Agent: {selectedAgentId}</h3>
          <button 
            onClick={() => setSelectedAgentId(null)}
            style={{
              padding: '5px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Clear Selection
          </button>
        </div>
      )}
      
      <div className="dashboard-tabs" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleTabChange('metrics')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'metrics' ? '#1976D2' : '#f0f0f0',
              color: activeTab === 'metrics' ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Metrics
          </button>
          <button
            onClick={() => handleTabChange('interactions')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'interactions' ? '#1976D2' : '#f0f0f0',
              color: activeTab === 'interactions' ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Interactions
          </button>
          <button
            onClick={() => handleTabChange('episode')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'episode' ? '#1976D2' : '#f0f0f0',
              color: activeTab === 'episode' ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Episode Analysis
          </button>
          {selectedAgentId && (
            <button
              onClick={() => handleTabChange('agent')}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'agent' ? '#1976D2' : '#f0f0f0',
                color: activeTab === 'agent' ? 'white' : 'black',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Agent Details
            </button>
          )}
        </div>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'metrics' && (
          <MultiAgentMetricsDashboard
            agentMetrics={agentMetrics}
            teamMetrics={teamMetrics}
            width={width}
            onMetricClick={(metric) => {
              if ('agentId' in metric) {
                handleAgentClick(metric.agentId);
              }
            }}
          />
        )}
        
        {activeTab === 'interactions' && (
          <MultiAgentInteractionDashboard
            communications={communications}
            interactions={interactions}
            agentStates={agentStates}
            width={width}
            onAgentClick={handleAgentClick}
          />
        )}
        
        {activeTab === 'episode' && (
          <MultiAgentEpisodeAnalysisDashboard
            episodeStates={episodeStates}
            episodeActions={episodeActions}
            episodeCommunications={episodeCommunications}
            episodeInteractions={episodeInteractions}
            episodeMetrics={agentMetrics}
            gridSize={gridSize}
            obstacles={obstacles}
            goals={goals}
            width={width}
            onAgentClick={handleAgentClick}
          />
        )}
        
        {activeTab === 'agent' && selectedAgentId && (
          <div className="agent-details" style={{ padding: 15 }}>
            <h3>Agent {selectedAgentId} Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Agent Metrics */}
              <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
                <h4>Agent Metrics</h4>
                <MultiAgentLineChart
                  data={selectedAgentMetrics}
                  width={width - 60}
                  height={300}
                  title={`Agent ${selectedAgentId} Metrics Over Time`}
                />
              </div>
              
              {/* Agent Communications */}
              <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
                <h4>Agent Communications</h4>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Step</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Direction</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Other Agent</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communications
                        .filter(c => c.senderId === selectedAgentId || c.receiverId === selectedAgentId)
                        .sort((a, b) => b.step - a.step)
                        .map(comm => (
                          <tr key={comm.messageId}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{comm.step}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              {comm.senderId === selectedAgentId ? 'Sent' : 'Received'}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              {comm.senderId === selectedAgentId 
                                ? (comm.receiverId || 'Broadcast') 
                                : comm.senderId}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              {typeof comm.content === 'object' 
                                ? JSON.stringify(comm.content).substring(0, 30) + '...'
                                : String(comm.content).substring(0, 30) + (String(comm.content).length > 30 ? '...' : '')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Agent Interactions */}
              <div className="chart-container" style={{ border: '1px solid #ddd', borderRadius: 4, padding: 15 }}>
                <h4>Agent Interactions</h4>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Step</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Type</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>With Agents</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interactions
                        .filter(i => i.agentIds.includes(selectedAgentId))
                        .sort((a, b) => b.step - a.step)
                        .map(interaction => (
                          <tr key={interaction.interactionId}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{interaction.step}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{interaction.type}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              {interaction.agentIds.filter(id => id !== selectedAgentId).join(', ')}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>
                              {interaction.outcome 
                                ? (typeof interaction.outcome === 'object' 
                                  ? JSON.stringify(interaction.outcome).substring(0, 30) + '...'
                                  : String(interaction.outcome).substring(0, 30) + (String(interaction.outcome).length > 30 ? '...' : ''))
                                : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  MetricsDashboard: BaseMetricsDashboard,
  AgentDashboard: BaseAgentDashboard,
  ExperimentDashboard: BaseExperimentDashboard,
  MultiAgentMetricsDashboard,
  MultiAgentInteractionDashboard,
  MultiAgentEpisodeAnalysisDashboard,
  MultiAgentDashboard
};
