/**
 * Simulation viewer components for environment visualization
 * 
 * This module provides React components for visualizing environment states
 * and agent interactions during training and evaluation.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { StateRecord, ActionRecord } from '../utils/DataCollector';

/**
 * Props for GridWorldViewer component
 */
interface GridWorldViewerProps {
  state: any;
  width?: number;
  height?: number;
  cellSize?: number;
  colors?: Record<string, string>;
  agentPosition?: { x: number; y: number };
  goalPosition?: { x: number; y: number };
  obstacles?: Array<{ x: number; y: number }>;
  showCoordinates?: boolean;
  showGrid?: boolean;
  onCellClick?: (x: number, y: number, value: any) => void;
}

/**
 * Grid world viewer component for visualizing grid-based environments
 */
export const GridWorldViewer: React.FC<GridWorldViewerProps> = ({
  state,
  width = 400,
  height = 400,
  cellSize,
  colors = {
    background: '#ffffff',
    grid: '#cccccc',
    agent: '#ff0000',
    goal: '#00ff00',
    obstacle: '#000000',
    text: '#000000'
  },
  agentPosition,
  goalPosition,
  obstacles,
  showCoordinates = true,
  showGrid = true,
  onCellClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!state || !svgRef.current) return;
    
    // Clear previous rendering
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Determine grid dimensions from state if not explicitly provided
    let gridWidth, gridHeight;
    
    if (Array.isArray(state)) {
      gridHeight = state.length;
      gridWidth = state[0].length;
    } else if (state.grid) {
      gridHeight = state.grid.length;
      gridWidth = state.grid[0].length;
    } else if (state.shape) {
      gridHeight = state.shape[0];
      gridWidth = state.shape[1];
    } else {
      // Default dimensions if can't determine from state
      gridWidth = 10;
      gridHeight = 10;
    }
    
    // Calculate cell size if not provided
    const calculatedCellSize = cellSize || Math.min(
      width / gridWidth,
      height / gridHeight
    );
    
    // Adjust SVG dimensions
    const svgWidth = calculatedCellSize * gridWidth;
    const svgHeight = calculatedCellSize * gridHeight;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', svgWidth)
      .attr('height', svgHeight);
    
    // Add background
    svg.append('rect')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('fill', colors.background);
    
    // Extract grid data from state
    let gridData;
    
    if (Array.isArray(state)) {
      gridData = state;
    } else if (state.grid) {
      gridData = state.grid;
    } else {
      // Create empty grid if can't extract from state
      gridData = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));
    }
    
    // Draw grid cells
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const cellValue = Array.isArray(gridData[y]) ? gridData[y][x] : null;
        
        // Determine cell color based on content
        let cellColor = colors.background;
        
        // Check if cell contains an obstacle
        const isObstacle = obstacles?.some(o => o.x === x && o.y === y) ||
          cellValue === 1; // Assuming 1 represents obstacles
        
        if (isObstacle) {
          cellColor = colors.obstacle;
        }
        
        // Draw cell
        svg.append('rect')
          .attr('x', x * calculatedCellSize)
          .attr('y', y * calculatedCellSize)
          .attr('width', calculatedCellSize)
          .attr('height', calculatedCellSize)
          .attr('fill', cellColor)
          .attr('stroke', showGrid ? colors.grid : 'none')
          .attr('stroke-width', 1)
          .style('cursor', onCellClick ? 'pointer' : 'default')
          .on('click', () => {
            if (onCellClick) onCellClick(x, y, cellValue);
          });
        
        // Add coordinates if enabled
        if (showCoordinates) {
          svg.append('text')
            .attr('x', x * calculatedCellSize + calculatedCellSize / 2)
            .attr('y', y * calculatedCellSize + calculatedCellSize / 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', calculatedCellSize / 4)
            .attr('fill', getContrastColor(cellColor))
            .text(`${x},${y}`);
        }
        
        // Add cell value if it exists and is not an obstacle
        if (cellValue !== null && cellValue !== undefined && !isObstacle) {
          svg.append('text')
            .attr('x', x * calculatedCellSize + calculatedCellSize / 2)
            .attr('y', y * calculatedCellSize + calculatedCellSize * 3 / 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', calculatedCellSize / 3)
            .attr('fill', colors.text)
            .text(typeof cellValue === 'number' ? cellValue.toFixed(1) : cellValue.toString());
        }
      }
    }
    
    // Draw goal if provided
    if (goalPosition) {
      svg.append('circle')
        .attr('cx', (goalPosition.x + 0.5) * calculatedCellSize)
        .attr('cy', (goalPosition.y + 0.5) * calculatedCellSize)
        .attr('r', calculatedCellSize / 3)
        .attr('fill', colors.goal);
    }
    
    // Draw agent if provided
    if (agentPosition) {
      svg.append('circle')
        .attr('cx', (agentPosition.x + 0.5) * calculatedCellSize)
        .attr('cy', (agentPosition.y + 0.5) * calculatedCellSize)
        .attr('r', calculatedCellSize / 3)
        .attr('fill', colors.agent);
    }
    
  }, [state, width, height, cellSize, colors, agentPosition, goalPosition, obstacles, showCoordinates, showGrid, onCellClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for ContinuousSpaceViewer component
 */
interface ContinuousSpaceViewerProps {
  state: any;
  width?: number;
  height?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  agentPosition?: { x: number; y: number };
  goalPosition?: { x: number; y: number };
  obstacles?: Array<{ x: number; y: number; radius: number }>;
  showAxes?: boolean;
  showGrid?: boolean;
  onPositionClick?: (x: number, y: number) => void;
}

/**
 * Continuous space viewer component for visualizing continuous state spaces
 */
export const ContinuousSpaceViewer: React.FC<ContinuousSpaceViewerProps> = ({
  state,
  width = 400,
  height = 400,
  xDomain = [-1, 1],
  yDomain = [-1, 1],
  agentPosition,
  goalPosition,
  obstacles,
  showAxes = true,
  showGrid = true,
  onPositionClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous rendering
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Calculate margins
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0]);
    
    // Add background
    chart.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', '#f8f8f8');
    
    // Add grid if enabled
    if (showGrid) {
      // Add x grid lines
      chart.append('g')
        .attr('class', 'grid x-grid')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(
          d3.axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => '')
        );
      
      // Add y grid lines
      chart.append('g')
        .attr('class', 'grid y-grid')
        .call(
          d3.axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        );
      
      // Style grid lines
      svg.selectAll('.grid line')
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.7)
        .style('shape-rendering', 'crispEdges');
      
      svg.selectAll('.grid path')
        .style('stroke-width', 0);
    }
    
    // Add axes if enabled
    if (showAxes) {
      // Add x axis
      chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));
      
      // Add y axis
      chart.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));
      
      // Add axis labels
      chart.append('text')
        .attr('class', 'x-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + margin.bottom - 5)
        .text('X');
      
      chart.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(${-margin.left + 15}, ${innerHeight / 2}) rotate(-90)`)
        .text('Y');
    }
    
    // Draw obstacles if provided
    if (obstacles) {
      obstacles.forEach(obstacle => {
        chart.append('circle')
          .attr('cx', xScale(obstacle.x))
          .attr('cy', yScale(obstacle.y))
          .attr('r', obstacle.radius * Math.min(
            innerWidth / (xDomain[1] - xDomain[0]),
            innerHeight / (yDomain[1] - yDomain[0])
          ))
          .attr('fill', '#000000')
          .attr('opacity', 0.7);
      });
    }
    
    // Draw goal if provided
    if (goalPosition) {
      chart.append('circle')
        .attr('cx', xScale(goalPosition.x))
        .attr('cy', yScale(goalPosition.y))
        .attr('r', 10)
        .attr('fill', '#00ff00');
    }
    
    // Draw agent if provided
    if (agentPosition) {
      chart.append('circle')
        .attr('cx', xScale(agentPosition.x))
        .attr('cy', yScale(agentPosition.y))
        .attr('r', 8)
        .attr('fill', '#ff0000')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1);
    }
    
    // Extract agent position from state if not explicitly provided
    if (!agentPosition && state) {
      let position;
      
      if (Array.isArray(state) && state.length >= 2) {
        position = { x: state[0], y: state[1] };
      } else if (state.position) {
        position = state.position;
      } else if (state.x !== undefined && state.y !== undefined) {
        position = { x: state.x, y: state.y };
      }
      
      if (position) {
        chart.append('circle')
          .attr('cx', xScale(position.x))
          .attr('cy', yScale(position.y))
          .attr('r', 8)
          .attr('fill', '#ff0000')
          .attr('stroke', '#000000')
          .attr('stroke-width', 1);
      }
    }
    
    // Add click handler for position selection
    if (onPositionClick) {
      chart.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event) => {
          const [x, y] = d3.pointer(event);
          const xValue = xScale.invert(x);
          const yValue = yScale.invert(y);
          onPositionClick(xValue, yValue);
        });
    }
    
  }, [state, width, height, xDomain, yDomain, agentPosition, goalPosition, obstacles, showAxes, showGrid, onPositionClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for EpisodePlayer component
 */
interface EpisodePlayerProps {
  episodeData: {
    states: StateRecord[];
    actions: ActionRecord[];
  };
  width?: number;
  height?: number;
  renderState: (state: any, action?: any) => React.ReactNode;
  autoPlay?: boolean;
  speed?: number;
  showControls?: boolean;
  onStateChange?: (state: any, index: number) => void;
}

/**
 * Episode player component for playing back recorded episodes
 */
export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({
  episodeData,
  width = 600,
  height = 400,
  renderState,
  autoPlay = false,
  speed = 1,
  showControls = true,
  onStateChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(speed);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get current state and action
  const currentState = episodeData.states[currentIndex]?.state;
  const currentAction = episodeData.actions[currentIndex]?.action;
  
  // Calculate total steps
  const totalSteps = episodeData.states.length;
  
  // Handle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Handle step forward
  const stepForward = () => {
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  // Handle step backward
  const stepBackward = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  // Handle reset
  const reset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };
  
  // Handle speed change
  const changeSpeed = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
  };
  
  // Handle slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(event.target.value, 10);
    setCurrentIndex(newIndex);
  };
  
  // Set up playback interval
  useEffect(() => {
    if (isPlaying) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set new interval
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          if (prevIndex < totalSteps - 1) {
            return prevIndex + 1;
          } else {
            setIsPlaying(false);
            return prevIndex;
          }
        });
      }, 1000 / playbackSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalSteps]);
  
  // Notify on state change
  useEffect(() => {
    if (onStateChange && currentState) {
      onStateChange(currentState, currentIndex);
    }
  }, [currentState, currentIndex, onStateChange]);
  
  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        {renderState(currentState, currentAction)}
      </div>
      
      {showControls && (
        <div style={{ padding: '10px', borderTop: '1px solid #ccc' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <button onClick={reset} style={{ marginRight: '5px' }}>⏮</button>
            <button onClick={stepBackward} style={{ marginRight: '5px' }}>⏪</button>
            <button onClick={togglePlayback} style={{ marginRight: '5px' }}>
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button onClick={stepForward} style={{ marginRight: '5px' }}>⏩</button>
            
            <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '5px' }}>Speed:</span>
              <select 
                value={playbackSpeed} 
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                style={{ marginRight: '10px' }}
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
              </select>
              
              <span style={{ marginRight: '5px' }}>
                Step: {currentIndex + 1} / {totalSteps}
              </span>
            </div>
          </div>
          
          <input
            type="range"
            min="0"
            max={totalSteps - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Props for ComparisonViewer component
 */
interface ComparisonViewerProps {
  episodes: Array<{
    id: string;
    name: string;
    states: StateRecord[];
    actions: ActionRecord[];
  }>;
  width?: number;
  height?: number;
  renderState: (state: any, action?: any) => React.ReactNode;
  syncPlayback?: boolean;
}

/**
 * Comparison viewer component for comparing multiple episodes
 */
export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  episodes,
  width = 800,
  height = 600,
  renderState,
  syncPlayback = true
}) => {
  const [currentIndices, setCurrentIndices] = useState<number[]>(
    episodes.map(() => 0)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calculate maximum steps
  const maxSteps = Math.max(...episodes.map(ep => ep.states.length));
  
  // Handle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Handle reset
  const reset = () => {
    setCurrentIndices(episodes.map(() => 0));
    setIsPlaying(false);
  };
  
  // Handle speed change
  const changeSpeed = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
  };
  
  // Handle slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(event.target.value, 10);
    
    if (syncPlayback) {
      setCurrentIndices(episodes.map(() => 
        Math.min(newIndex, episodes.map(ep => ep.states.length - 1)[0])
      ));
    } else {
      setCurrentIndices(currentIndices.map((idx, i) => 
        Math.min(newIndex, episodes[i].states.length - 1)
      ));
    }
  };
  
  // Set up playback interval
  useEffect(() => {
    if (isPlaying) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set new interval
      intervalRef.current = setInterval(() => {
        setCurrentIndices(prevIndices => {
          const newIndices = prevIndices.map((idx, i) => {
            const maxIdx = episodes[i].states.length - 1;
            return idx < maxIdx ? idx + 1 : idx;
          });
          
          // Stop playback if all episodes have reached the end
          if (newIndices.every((idx, i) => idx === episodes[i].states.length - 1)) {
            setIsPlaying(false);
          }
          
          return newIndices;
        });
      }, 1000 / playbackSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, episodes]);
  
  // Calculate episode viewer dimensions
  const episodeWidth = width / Math.min(episodes.length, 3);
  const episodeHeight = episodes.length <= 3 ? height - 100 : (height - 100) / 2;
  
  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        overflow: 'auto'
      }}>
        {episodes.map((episode, i) => (
          <div key={episode.id} style={{ 
            width: episodeWidth, 
            height: episodeHeight,
            padding: '5px',
            boxSizing: 'border-box'
          }}>
            <div style={{ 
              height: '100%', 
              border: '1px solid #ccc',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '5px', 
                borderBottom: '1px solid #ccc',
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold'
              }}>
                {episode.name}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {renderState(
                  episode.states[currentIndices[i]]?.state,
                  episode.actions[currentIndices[i]]?.action
                )}
              </div>
              <div style={{ 
                padding: '5px', 
                borderTop: '1px solid #ccc',
                backgroundColor: '#f5f5f5',
                fontSize: '12px'
              }}>
                Step: {currentIndices[i] + 1} / {episode.states.length}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ padding: '10px', borderTop: '1px solid #ccc' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={reset} style={{ marginRight: '5px' }}>⏮</button>
          <button onClick={togglePlayback} style={{ marginRight: '5px' }}>
            {isPlaying ? '⏸' : '▶️'}
          </button>
          
          <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '5px' }}>Speed:</span>
            <select 
              value={playbackSpeed} 
              onChange={(e) => changeSpeed(parseFloat(e.target.value))}
              style={{ marginRight: '10px' }}
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>
            
            <span style={{ marginRight: '5px' }}>
              Sync: 
              <input 
                type="checkbox" 
                checked={syncPlayback} 
                onChange={() => {}} 
                disabled 
                style={{ marginLeft: '5px' }}
              />
            </span>
          </div>
        </div>
        
        <input
          type="range"
          min="0"
          max={maxSteps - 1}
          value={currentIndices[0]}
          onChange={handleSliderChange}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

// Helper functions

/**
 * Get contrasting text color (black or white) based on background color
 * @param {string} backgroundColor - Background color in hex format
 * @returns {string} - Contrasting text color (black or white)
 */
function getContrastColor(backgroundColor: string): string {
  // For non-hex colors, return black
  if (!backgroundColor.startsWith('#')) {
    return '#000000';
  }
  
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for bright colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default {
  GridWorldViewer,
  ContinuousSpaceViewer,
  EpisodePlayer,
  ComparisonViewer
};
