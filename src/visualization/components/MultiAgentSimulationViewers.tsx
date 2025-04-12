/**
 * Enhanced simulation viewers for multi-agent visualization
 * 
 * This module extends the base SimulationViewers components to provide
 * specialized visualizations for multi-agent scenarios, including
 * team-based coloring, agent interactions, and communication visualization.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  StateRecord, 
  ActionRecord 
} from '../../utils/DataCollector';
import {
  AgentStateRecord,
  AgentActionRecord,
  CommunicationRecord,
  InteractionRecord
} from '../../utils/MultiAgentDataCollector';

// Re-export original viewer components
import { 
  GridWorldViewer as BaseGridWorldViewer,
  EpisodePlayer as BaseEpisodePlayer
} from './SimulationViewers';

/**
 * Props for MultiAgentGridWorldViewer component
 */
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

/**
 * Multi-agent grid world viewer component
 */
export const MultiAgentGridWorldViewer: React.FC<MultiAgentGridWorldViewerProps> = ({
  width = 500,
  height = 500,
  gridSize,
  agentStates,
  obstacles = [],
  goals = [],
  communications = [],
  interactions = [],
  teamColorMap = {},
  showAgentIds = true,
  showTeamIds = false,
  showCommunications = true,
  showInteractions = true,
  cellSize,
  onAgentClick,
  onCellClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Calculate cell size if not provided
  const calculatedCellSize = cellSize || Math.min(
    width / gridSize.width,
    height / gridSize.height
  );
  
  // Adjust width and height to fit grid
  const adjustedWidth = calculatedCellSize * gridSize.width;
  const adjustedHeight = calculatedCellSize * gridSize.height;
  
  // Default team colors
  const defaultTeamColors = d3.schemeCategory10;
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', adjustedWidth)
      .attr('height', adjustedHeight)
      .attr('viewBox', `0 0 ${adjustedWidth} ${adjustedHeight}`)
      .style('background-color', '#f9f9f9')
      .style('border', '1px solid #ddd');
    
    // Create grid
    const grid = svg.append('g')
      .attr('class', 'grid');
    
    // Draw grid cells
    for (let x = 0; x < gridSize.width; x++) {
      for (let y = 0; y < gridSize.height; y++) {
        grid.append('rect')
          .attr('x', x * calculatedCellSize)
          .attr('y', y * calculatedCellSize)
          .attr('width', calculatedCellSize)
          .attr('height', calculatedCellSize)
          .attr('fill', 'white')
          .attr('stroke', '#ddd')
          .style('cursor', onCellClick ? 'pointer' : 'default')
          .on('click', () => {
            if (onCellClick) onCellClick(x, y);
          });
      }
    }
    
    // Draw obstacles
    const obstaclesGroup = svg.append('g')
      .attr('class', 'obstacles');
    
    obstacles.forEach(obstacle => {
      obstaclesGroup.append('rect')
        .attr('x', obstacle.x * calculatedCellSize)
        .attr('y', obstacle.y * calculatedCellSize)
        .attr('width', calculatedCellSize)
        .attr('height', calculatedCellSize)
        .attr('fill', '#666')
        .attr('stroke', '#444');
    });
    
    // Draw goals
    const goalsGroup = svg.append('g')
      .attr('class', 'goals');
    
    goals.forEach(goal => {
      // Determine color based on reward
      const reward = goal.reward || 1;
      const color = reward > 0 ? 
        d3.interpolateGreens(0.3 + 0.7 * Math.min(1, reward / 10)) : 
        d3.interpolateReds(0.3 + 0.7 * Math.min(1, Math.abs(reward) / 10));
      
      goalsGroup.append('rect')
        .attr('x', goal.x * calculatedCellSize)
        .attr('y', goal.y * calculatedCellSize)
        .attr('width', calculatedCellSize)
        .attr('height', calculatedCellSize)
        .attr('fill', color)
        .attr('stroke', '#444');
      
      // Add reward text
      goalsGroup.append('text')
        .attr('x', (goal.x + 0.5) * calculatedCellSize)
        .attr('y', (goal.y + 0.5) * calculatedCellSize)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', getContrastColor(color))
        .style('font-size', `${calculatedCellSize * 0.4}px`)
        .text(reward.toString());
    });
    
    // Draw interactions if enabled
    if (showInteractions && interactions.length > 0) {
      const interactionsGroup = svg.append('g')
        .attr('class', 'interactions');
      
      interactions.forEach(interaction => {
        // Only draw interactions between agents that have positions
        const agentPositions: { agentId: string; x: number; y: number }[] = [];
        
        interaction.agentIds.forEach(agentId => {
          const agentState = agentStates.find(state => state.agentId === agentId);
          if (agentState && agentState.position) {
            agentPositions.push({
              agentId,
              x: agentState.position.x,
              y: agentState.position.y
            });
          }
        });
        
        if (agentPositions.length >= 2) {
          // Draw lines between interacting agents
          for (let i = 0; i < agentPositions.length - 1; i++) {
            for (let j = i + 1; j < agentPositions.length; j++) {
              const agent1 = agentPositions[i];
              const agent2 = agentPositions[j];
              
              interactionsGroup.append('line')
                .attr('x1', (agent1.x + 0.5) * calculatedCellSize)
                .attr('y1', (agent1.y + 0.5) * calculatedCellSize)
                .attr('x2', (agent2.x + 0.5) * calculatedCellSize)
                .attr('y2', (agent2.y + 0.5) * calculatedCellSize)
                .attr('stroke', interaction.type === 'cooperation' ? '#4CAF50' : 
                              interaction.type === 'competition' ? '#F44336' : 
                              '#FF9800')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '4,4')
                .attr('opacity', 0.7)
                .append('title')
                .text(`${interaction.type} between ${interaction.agentIds.join(', ')}`);
            }
          }
          
          // Draw interaction marker at the center
          if (agentPositions.length > 2) {
            const centerX = agentPositions.reduce((sum, pos) => sum + pos.x, 0) / agentPositions.length;
            const centerY = agentPositions.reduce((sum, pos) => sum + pos.y, 0) / agentPositions.length;
            
            interactionsGroup.append('circle')
              .attr('cx', (centerX + 0.5) * calculatedCellSize)
              .attr('cy', (centerY + 0.5) * calculatedCellSize)
              .attr('r', calculatedCellSize * 0.15)
              .attr('fill', interaction.type === 'cooperation' ? '#4CAF50' : 
                          interaction.type === 'competition' ? '#F44336' : 
                          '#FF9800')
              .attr('opacity', 0.7)
              .append('title')
              .text(`${interaction.type} between ${interaction.agentIds.join(', ')}`);
          }
        }
      });
    }
    
    // Draw communications if enabled
    if (showCommunications && communications.length > 0) {
      const communicationsGroup = svg.append('g')
        .attr('class', 'communications');
      
      communications.forEach(communication => {
        const senderState = agentStates.find(state => state.agentId === communication.senderId);
        const receiverState = communication.receiverId ? 
          agentStates.find(state => state.agentId === communication.receiverId) : 
          null;
        
        if (senderState && senderState.position) {
          if (receiverState && receiverState.position) {
            // Draw directed arrow for direct communication
            const startX = (senderState.position.x + 0.5) * calculatedCellSize;
            const startY = (senderState.position.y + 0.5) * calculatedCellSize;
            const endX = (receiverState.position.x + 0.5) * calculatedCellSize;
            const endY = (receiverState.position.y + 0.5) * calculatedCellSize;
            
            // Calculate arrow path
            const dx = endX - startX;
            const dy = endY - startY;
            const angle = Math.atan2(dy, dx);
            const length = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust start and end points to be outside the agent circles
            const agentRadius = calculatedCellSize * 0.3;
            const adjustedStartX = startX + agentRadius * Math.cos(angle);
            const adjustedStartY = startY + agentRadius * Math.sin(angle);
            const adjustedEndX = endX - agentRadius * Math.cos(angle);
            const adjustedEndY = endY - agentRadius * Math.sin(angle);
            
            // Draw arrow line
            communicationsGroup.append('line')
              .attr('x1', adjustedStartX)
              .attr('y1', adjustedStartY)
              .attr('x2', adjustedEndX)
              .attr('y2', adjustedEndY)
              .attr('stroke', '#2196F3')
              .attr('stroke-width', 2)
              .attr('marker-end', 'url(#arrowhead)')
              .attr('opacity', 0.7)
              .append('title')
              .text(`Message from ${communication.senderId} to ${communication.receiverId}`);
          } else {
            // Draw broadcast indicator for broadcast communication
            communicationsGroup.append('circle')
              .attr('cx', (senderState.position.x + 0.5) * calculatedCellSize)
              .attr('cy', (senderState.position.y + 0.5) * calculatedCellSize)
              .attr('r', calculatedCellSize * 0.6)
              .attr('fill', 'none')
              .attr('stroke', '#2196F3')
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '5,5')
              .attr('opacity', 0.5)
              .append('title')
              .text(`Broadcast message from ${communication.senderId}`);
          }
        }
      });
      
      // Add arrow marker definition
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 5)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#2196F3');
    }
    
    // Draw agents
    const agentsGroup = svg.append('g')
      .attr('class', 'agents');
    
    // Group agents by position to handle overlapping
    const agentsByPosition: Record<string, AgentStateRecord[]> = {};
    
    agentStates.forEach(agentState => {
      if (!agentState.position) return;
      
      const key = `${agentState.position.x},${agentState.position.y}`;
      if (!agentsByPosition[key]) {
        agentsByPosition[key] = [];
      }
      agentsByPosition[key].push(agentState);
    });
    
    // Draw agents at each position
    Object.entries(agentsByPosition).forEach(([posKey, agents]) => {
      const [x, y] = posKey.split(',').map(Number);
      const centerX = (x + 0.5) * calculatedCellSize;
      const centerY = (y + 0.5) * calculatedCellSize;
      
      if (agents.length === 1) {
        // Single agent at this position
        const agent = agents[0];
        const teamId = agent.teamId;
        
        // Determine agent color based on team
        let agentColor = '#1976D2'; // Default blue
        if (teamId) {
          agentColor = teamColorMap[teamId] || 
                      defaultTeamColors[parseInt(teamId) % defaultTeamColors.length];
        }
        
        // Draw agent circle
        agentsGroup.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', calculatedCellSize * 0.3)
          .attr('fill', agentColor)
          .attr('stroke', '#333')
          .attr('stroke-width', 1.5)
          .style('cursor', onAgentClick ? 'pointer' : 'default')
          .on('click', () => {
            if (onAgentClick) onAgentClick(agent.agentId);
          })
          .append('title')
          .text(`Agent ${agent.agentId}${teamId ? ` (Team ${teamId})` : ''}`);
        
        // Add agent ID if enabled
        if (showAgentIds) {
          agentsGroup.append('text')
            .attr('x', centerX)
            .attr('y', centerY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', getContrastColor(agentColor))
            .style('font-size', `${calculatedCellSize * 0.3}px`)
            .style('font-weight', 'bold')
            .style('pointer-events', 'none')
            .text(agent.agentId);
        }
        
        // Add team ID if enabled
        if (showTeamIds && teamId) {
          agentsGroup.append('text')
            .attr('x', centerX)
            .attr('y', centerY + calculatedCellSize * 0.4)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#333')
            .style('font-size', `${calculatedCellSize * 0.2}px`)
            .style('pointer-events', 'none')
            .text(`T${teamId}`);
        }
      } else {
        // Multiple agents at this position
        const radius = calculatedCellSize * 0.3;
        const angleStep = (2 * Math.PI) / agents.length;
        
        agents.forEach((agent, i) => {
          const angle = i * angleStep;
          const offsetX = radius * 0.7 * Math.cos(angle);
          const offsetY = radius * 0.7 * Math.sin(angle);
          
          const teamId = agent.teamId;
          
          // Determine agent color based on team
          let agentColor = '#1976D2'; // Default blue
          if (teamId) {
            agentColor = teamColorMap[teamId] || 
                        defaultTeamColors[parseInt(teamId) % defaultTeamColors.length];
          }
          
          // Draw smaller agent circle
          agentsGroup.append('circle')
            .attr('cx', centerX + offsetX)
            .attr('cy', centerY + offsetY)
            .attr('r', radius * 0.6)
            .attr('fill', agentColor)
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .style('cursor', onAgentClick ? 'pointer' : 'default')
            .on('click', () => {
              if (onAgentClick) onAgentClick(agent.agentId);
            })
            .append('title')
            .text(`Agent ${agent.agentId}${teamId ? ` (Team ${teamId})` : ''}`);
          
          // Add agent ID if enabled
          if (showAgentIds) {
            agentsGroup.append('text')
              .attr('x', centerX + offsetX)
              .attr('y', centerY + offsetY)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('fill', getContrastColor(agentColor))
              .style('font-size', `${calculatedCellSize * 0.2}px`)
              .style('font-weight', 'bold')
              .style('pointer-events', 'none')
              .text(agent.agentId);
          }
        });
        
        // Draw a small indicator in the center to show multiple agents
        agentsGroup.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', radius * 0.2)
          .attr('fill', '#333')
          .append('title')
          .text(`${agents.length} agents at this position`);
      }
    });
    
  }, [
    adjustedWidth, 
    adjustedHeight, 
    gridSize, 
    calculatedCellSize, 
    agentStates, 
    obstacles, 
    goals, 
    communications, 
    interactions,
    teamColorMap,
    showAgentIds,
    showTeamIds,
    showCommunications,
    showInteractions,
    onAgentClick,
    onCellClick
  ]);
  
  return (
    <div className="multi-agent-grid-world-viewer">
      <svg ref={svgRef}></svg>
    </div>
  );
};

/**
 * Props for MultiAgentEpisodePlayer component
 */
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
  showControls?: boolean;
  autoPlay?: boolean;
  playbackSpeed?: number;
  onAgentClick?: (agentId: string) => void;
  onStepChange?: (step: number) => void;
  onPlaybackComplete?: () => void;
  selectedAgentIds?: string[];
  selectedTeamIds?: string[];
}

/**
 * Multi-agent episode player component
 */
export const MultiAgentEpisodePlayer: React.FC<MultiAgentEpisodePlayerProps> = ({
  width = 600,
  height = 500,
  gridSize,
  episodeStates,
  episodeActions = [],
  episodeCommunications = [],
  episodeInteractions = [],
  obstacles = [],
  goals = [],
  teamColorMap = {},
  showAgentIds = true,
  showTeamIds = false,
  showCommunications = true,
  showInteractions = true,
  showControls = true,
  autoPlay = false,
  playbackSpeed = 1,
  onAgentClick,
  onStepChange,
  onPlaybackComplete,
  selectedAgentIds = [],
  selectedTeamIds = []
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(playbackSpeed);
  
  // Get unique steps from episode states
  const steps = Array.from(new Set(episodeStates.map(state => state.step))).sort((a, b) => a - b);
  const maxStep = steps.length > 0 ? steps[steps.length - 1] : 0;
  
  // Filter states for the current step
  const currentStates = episodeStates.filter(state => {
    // Apply agent and team filters if provided
    const agentFilter = selectedAgentIds.length === 0 || selectedAgentIds.includes(state.agentId);
    const teamFilter = selectedTeamIds.length === 0 || (state.teamId && selectedTeamIds.includes(state.teamId));
    
    return state.step === steps[currentStep] && agentFilter && teamFilter;
  });
  
  // Filter communications for the current step
  const currentCommunications = episodeCommunications.filter(comm => {
    // Apply agent and team filters if provided
    const senderFilter = selectedAgentIds.length === 0 || selectedAgentIds.includes(comm.senderId);
    const receiverFilter = !comm.receiverId || selectedAgentIds.length === 0 || selectedAgentIds.includes(comm.receiverId);
    const senderTeamFilter = selectedTeamIds.length === 0 || (comm.senderTeamId && selectedTeamIds.includes(comm.senderTeamId));
    const receiverTeamFilter = !comm.receiverTeamId || selectedTeamIds.length === 0 || selectedTeamIds.includes(comm.receiverTeamId);
    
    return comm.step === steps[currentStep] && 
           senderFilter && receiverFilter && 
           senderTeamFilter && receiverTeamFilter;
  });
  
  // Filter interactions for the current step
  const currentInteractions = episodeInteractions.filter(interaction => {
    // Apply agent and team filters if provided
    const agentFilter = selectedAgentIds.length === 0 || 
                        interaction.agentIds.some(id => selectedAgentIds.includes(id));
    const teamFilter = selectedTeamIds.length === 0 || 
                      (interaction.teamIds && interaction.teamIds.some(id => selectedTeamIds.includes(id)));
    
    return interaction.step === steps[currentStep] && agentFilter && teamFilter;
  });
  
  // Handle playback
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isPlaying && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next >= steps.length) {
            setIsPlaying(false);
            if (onPlaybackComplete) onPlaybackComplete();
            return prev;
          }
          if (onStepChange) onStepChange(steps[next]);
          return next;
        });
      }, 1000 / speed);
    } else if (isPlaying && currentStep >= steps.length - 1) {
      setIsPlaying(false);
      if (onPlaybackComplete) onPlaybackComplete();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentStep, steps, speed, onStepChange, onPlaybackComplete]);
  
  // Update when autoPlay or playbackSpeed props change
  useEffect(() => {
    setIsPlaying(autoPlay);
  }, [autoPlay]);
  
  useEffect(() => {
    setSpeed(playbackSpeed);
  }, [playbackSpeed]);
  
  // Handle step change
  const handleStepChange = (newStep: number) => {
    setCurrentStep(newStep);
    if (onStepChange) onStepChange(steps[newStep]);
  };
  
  // Playback controls
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    if (onStepChange) onStepChange(steps[0]);
  };
  const handleStepBackward = () => {
    if (currentStep > 0) {
      handleStepChange(currentStep - 1);
    }
  };
  const handleStepForward = () => {
    if (currentStep < steps.length - 1) {
      handleStepChange(currentStep + 1);
    }
  };
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };
  
  return (
    <div className="multi-agent-episode-player" style={{ width }}>
      <MultiAgentGridWorldViewer
        width={width}
        height={height}
        gridSize={gridSize}
        agentStates={currentStates}
        obstacles={obstacles}
        goals={goals}
        communications={showCommunications ? currentCommunications : []}
        interactions={showInteractions ? currentInteractions : []}
        teamColorMap={teamColorMap}
        showAgentIds={showAgentIds}
        showTeamIds={showTeamIds}
        onAgentClick={onAgentClick}
      />
      
      {showControls && (
        <div className="episode-player-controls" style={{ marginTop: 10 }}>
          <div className="playback-controls" style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <button onClick={handleStop} disabled={currentStep === 0 && !isPlaying}>
              ⏹️
            </button>
            <button onClick={handleStepBackward} disabled={currentStep === 0 || isPlaying}>
              ⏪
            </button>
            {isPlaying ? (
              <button onClick={handlePause}>⏸️</button>
            ) : (
              <button onClick={handlePlay} disabled={currentStep >= steps.length - 1}>
                ▶️
              </button>
            )}
            <button onClick={handleStepForward} disabled={currentStep >= steps.length - 1 || isPlaying}>
              ⏩
            </button>
            <div style={{ marginLeft: 20 }}>
              <label>
                Speed:
                <select
                  value={speed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  style={{ marginLeft: 5 }}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                  <option value={8}>8x</option>
                </select>
              </label>
            </div>
          </div>
          
          <div className="step-slider" style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 10 }}>Step: {steps[currentStep]}</span>
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={currentStep}
              onChange={(e) => handleStepChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ marginLeft: 10 }}>
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Props for AgentFilterPanel component
 */
interface AgentFilterPanelProps {
  agents: { id: string; teamId?: string }[];
  teams: { id: string; name?: string }[];
  selectedAgentIds: string[];
  selectedTeamIds: string[];
  onAgentSelectionChange: (agentIds: string[]) => void;
  onTeamSelectionChange: (teamIds: string[]) => void;
  teamColorMap?: Record<string, string>;
}

/**
 * Agent filter panel component for filtering agents in visualizations
 */
export const AgentFilterPanel: React.FC<AgentFilterPanelProps> = ({
  agents,
  teams,
  selectedAgentIds,
  selectedTeamIds,
  onAgentSelectionChange,
  onTeamSelectionChange,
  teamColorMap = {}
}) => {
  const [filterByTeam, setFilterByTeam] = useState(teams.length > 0);
  const [showAllAgents, setShowAllAgents] = useState(selectedAgentIds.length === 0);
  const [showAllTeams, setShowAllTeams] = useState(selectedTeamIds.length === 0);
  
  // Default team colors
  const defaultTeamColors = d3.schemeCategory10;
  
  // Handle team selection change
  const handleTeamSelectionChange = (teamId: string, selected: boolean) => {
    let newSelectedTeams: string[];
    
    if (selected) {
      newSelectedTeams = [...selectedTeamIds, teamId];
    } else {
      newSelectedTeams = selectedTeamIds.filter(id => id !== teamId);
    }
    
    onTeamSelectionChange(newSelectedTeams);
    
    // Update show all teams state
    setShowAllTeams(newSelectedTeams.length === 0);
  };
  
  // Handle agent selection change
  const handleAgentSelectionChange = (agentId: string, selected: boolean) => {
    let newSelectedAgents: string[];
    
    if (selected) {
      newSelectedAgents = [...selectedAgentIds, agentId];
    } else {
      newSelectedAgents = selectedAgentIds.filter(id => id !== agentId);
    }
    
    onAgentSelectionChange(newSelectedAgents);
    
    // Update show all agents state
    setShowAllAgents(newSelectedAgents.length === 0);
  };
  
  // Handle select all teams
  const handleSelectAllTeams = (selected: boolean) => {
    setShowAllTeams(selected);
    onTeamSelectionChange(selected ? [] : teams.map(team => team.id));
  };
  
  // Handle select all agents
  const handleSelectAllAgents = (selected: boolean) => {
    setShowAllAgents(selected);
    onAgentSelectionChange(selected ? [] : agents.map(agent => agent.id));
  };
  
  return (
    <div className="agent-filter-panel" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Filter Agents</h3>
      
      {teams.length > 0 && (
        <div className="filter-mode" style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={filterByTeam}
              onChange={(e) => setFilterByTeam(e.target.checked)}
            />
            Filter by team
          </label>
        </div>
      )}
      
      {filterByTeam && teams.length > 0 && (
        <div className="team-filters" style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
            <h4 style={{ margin: '0 10px 0 0' }}>Teams</h4>
            <label style={{ fontSize: '0.9em' }}>
              <input
                type="checkbox"
                checked={showAllTeams}
                onChange={(e) => handleSelectAllTeams(e.target.checked)}
              />
              Show all teams
            </label>
          </div>
          
          <div className="team-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {teams.map(team => {
              const teamColor = teamColorMap[team.id] || 
                              defaultTeamColors[parseInt(team.id) % defaultTeamColors.length];
              
              return (
                <div 
                  key={team.id} 
                  className="team-item"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '3px 8px',
                    backgroundColor: selectedTeamIds.includes(team.id) || showAllTeams ? teamColor : '#f0f0f0',
                    color: selectedTeamIds.includes(team.id) || showAllTeams ? getContrastColor(teamColor) : '#333',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleTeamSelectionChange(team.id, !(selectedTeamIds.includes(team.id) || showAllTeams))}
                >
                  <span style={{ marginRight: 5 }}>
                    {team.name || `Team ${team.id}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="agent-filters">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <h4 style={{ margin: '0 10px 0 0' }}>Agents</h4>
          <label style={{ fontSize: '0.9em' }}>
            <input
              type="checkbox"
              checked={showAllAgents}
              onChange={(e) => handleSelectAllAgents(e.target.checked)}
            />
            Show all agents
          </label>
        </div>
        
        <div className="agent-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
          {agents.map(agent => {
            // Only show agents from selected teams if filtering by team
            if (filterByTeam && agent.teamId && !showAllTeams && !selectedTeamIds.includes(agent.teamId)) {
              return null;
            }
            
            const teamColor = agent.teamId ? 
              (teamColorMap[agent.teamId] || defaultTeamColors[parseInt(agent.teamId) % defaultTeamColors.length]) : 
              '#1976D2';
            
            return (
              <div 
                key={agent.id} 
                className="agent-item"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '3px 8px',
                  backgroundColor: selectedAgentIds.includes(agent.id) || showAllAgents ? teamColor : '#f0f0f0',
                  color: selectedAgentIds.includes(agent.id) || showAllAgents ? getContrastColor(teamColor) : '#333',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                onClick={() => handleAgentSelectionChange(agent.id, !(selectedAgentIds.includes(agent.id) || showAllAgents))}
              >
                <span>
                  Agent {agent.id}
                  {agent.teamId && ` (T${agent.teamId})`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper functions

/**
 * Get contrast color for text based on background
 */
function getContrastColor(backgroundColor: string): string {
  // Convert hex to RGB
  let r = 0, g = 0, b = 0;
  
  if (backgroundColor.startsWith('#')) {
    r = parseInt(backgroundColor.slice(1, 3), 16);
    g = parseInt(backgroundColor.slice(3, 5), 16);
    b = parseInt(backgroundColor.slice(5, 7), 16);
  } else if (backgroundColor.startsWith('rgb')) {
    const match = backgroundColor.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Re-export original components with new names for clarity
export const GridWorldViewer = BaseGridWorldViewer;
export const EpisodePlayer = BaseEpisodePlayer;

export default {
  GridWorldViewer,
  EpisodePlayer,
  MultiAgentGridWorldViewer,
  MultiAgentEpisodePlayer,
  AgentFilterPanel
};
