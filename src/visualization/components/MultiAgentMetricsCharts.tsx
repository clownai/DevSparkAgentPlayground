/**
 * Enhanced metrics chart components for multi-agent visualization
 * 
 * This module extends the base MetricsCharts components to provide
 * specialized visualizations for multi-agent scenarios, including
 * agent comparison, team metrics, and communication patterns.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  MetricDataPoint, 
  MetricType 
} from '../utils/DataCollector';
import {
  AgentMetricDataPoint,
  TeamMetricDataPoint,
  CommunicationRecord
} from '../utils/MultiAgentDataCollector';

// Re-export original chart components
import { 
  LineChart as BaseLineChart,
  BarChart as BaseBarChart,
  HeatMap
} from './MetricsCharts';

export { HeatMap };

/**
 * Props for MultiAgentLineChart component
 */
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

/**
 * Multi-agent line chart component for visualizing metrics across multiple agents
 */
export const MultiAgentLineChart: React.FC<MultiAgentLineChartProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 120, bottom: 50, left: 60 },
  xAxis = 'Step',
  yAxis = 'Value',
  title = 'Agent Metrics Over Time',
  colorScheme = d3.schemeCategory10,
  smoothing = 0,
  showPoints = true,
  showGrid = true,
  showLegend = true,
  groupByTeam = false,
  highlightAgents = [],
  onPointClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Calculate inner dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Group data by agent or team
    const groupedData = groupByTeam 
      ? groupDataByTeam(data)
      : groupDataByAgent(data);
    
    // Apply smoothing if needed
    if (smoothing > 0 && smoothing < 1) {
      Object.keys(groupedData).forEach(key => {
        groupedData[key] = applyExponentialSmoothing(groupedData[key], smoothing);
      });
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.step) || 0,
        d3.max(data, d => d.step) || 0
      ])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => Number(d.value)) || 0,
        d3.max(data, d => Number(d.value)) || 0
      ])
      .range([innerHeight, 0])
      .nice();
    
    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(Object.keys(groupedData))
      .range(colorScheme);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    // Add X axis
    chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);
    
    // Add Y axis
    chart.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    // Add grid if enabled
    if (showGrid) {
      chart.append('g')
        .attr('class', 'grid x-grid')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(
          d3.axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => '')
        );
      
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
    
    // Create line generator
    const line = d3.line<AgentMetricDataPoint>()
      .x(d => xScale(d.step))
      .y(d => yScale(Number(d.value)))
      .curve(d3.curveMonotoneX);
    
    // Add lines for each agent/team
    Object.entries(groupedData).forEach(([key, points], i) => {
      const color = colorScale(key);
      const isHighlighted = highlightAgents.includes(key);
      
      // Add line path
      chart.append('path')
        .datum(points)
        .attr('class', `line ${isHighlighted ? 'highlighted' : ''}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isHighlighted ? 3 : 2)
        .attr('opacity', highlightAgents.length > 0 && !isHighlighted ? 0.5 : 1)
        .attr('d', line);
      
      // Add points if enabled
      if (showPoints) {
        chart.selectAll(`.point-${i}`)
          .data(points)
          .enter()
          .append('circle')
          .attr('class', `point ${isHighlighted ? 'highlighted' : ''}`)
          .attr('cx', d => xScale(d.step))
          .attr('cy', d => yScale(Number(d.value)))
          .attr('r', isHighlighted ? 4 : 3)
          .attr('fill', color)
          .attr('opacity', highlightAgents.length > 0 && !isHighlighted ? 0.5 : 1)
          .style('cursor', onPointClick ? 'pointer' : 'default')
          .on('click', (event, d) => {
            if (onPointClick) onPointClick(d);
          })
          .append('title')
          .text(d => `${groupByTeam ? `Team: ${d.teamId}` : `Agent: ${d.agentId}`}\nStep: ${d.step}\nValue: ${d.value}`);
      }
    });
    
    // Add axis labels
    chart.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .text(xAxis);
    
    chart.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${-margin.left + 20}, ${innerHeight / 2}) rotate(-90)`)
      .text(yAxis);
    
    // Add title
    chart.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = chart.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);
      
      Object.keys(groupedData).forEach((key, i) => {
        const isHighlighted = highlightAgents.includes(key);
        
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);
        
        legendItem.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', colorScale(key))
          .attr('opacity', highlightAgents.length > 0 && !isHighlighted ? 0.5 : 1);
        
        legendItem.append('text')
          .attr('x', 20)
          .attr('y', 12.5)
          .text(key)
          .style('font-size', '12px')
          .style('font-weight', isHighlighted ? 'bold' : 'normal')
          .style('opacity', highlightAgents.length > 0 && !isHighlighted ? 0.5 : 1);
      });
    }
    
  }, [data, width, height, margin, xAxis, yAxis, title, colorScheme, smoothing, showPoints, showGrid, showLegend, groupByTeam, highlightAgents, onPointClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for TeamComparisonBarChart component
 */
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
  onBarClick?: (point: TeamMetricDataPoint) => void;
}

/**
 * Team comparison bar chart component for visualizing metrics across teams
 */
export const TeamComparisonBarChart: React.FC<TeamComparisonBarChartProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 30, bottom: 70, left: 60 },
  xAxis = 'Team',
  yAxis = 'Value',
  title = 'Team Comparison',
  colorScheme = d3.schemeCategory10,
  showValues = true,
  showGrid = true,
  onBarClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Calculate inner dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Group data by team and calculate average value
    const teamData: Record<string, { teamId: string; value: number; count: number }> = {};
    
    data.forEach(d => {
      if (!teamData[d.teamId]) {
        teamData[d.teamId] = { teamId: d.teamId, value: 0, count: 0 };
      }
      teamData[d.teamId].value += Number(d.value);
      teamData[d.teamId].count += 1;
    });
    
    // Calculate averages
    const teamAverages = Object.values(teamData).map(d => ({
      teamId: d.teamId,
      value: d.value / d.count
    }));
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(teamAverages.map(d => d.teamId))
      .range([0, innerWidth])
      .padding(0.2);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(teamAverages, d => d.value) || 0])
      .range([innerHeight, 0])
      .nice();
    
    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(teamAverages.map(d => d.teamId))
      .range(colorScheme);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    // Add X axis
    chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    // Add Y axis
    chart.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    // Add grid if enabled
    if (showGrid) {
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
    
    // Add bars
    chart.selectAll('.bar')
      .data(teamAverages)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.teamId) || 0)
      .attr('y', d => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.value))
      .attr('fill', d => colorScale(d.teamId))
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (onBarClick) {
          // Find original data point for this team
          const teamDataPoint = data.find(point => point.teamId === d.teamId);
          if (teamDataPoint) {
            onBarClick(teamDataPoint);
          }
        }
      })
      .append('title')
      .text(d => `Team ${d.teamId}: ${d.value.toFixed(2)}`);
    
    // Add values on top of bars if enabled
    if (showValues) {
      chart.selectAll('.bar-value')
        .data(teamAverages)
        .enter()
        .append('text')
        .attr('class', 'bar-value')
        .attr('x', d => (xScale(d.teamId) || 0) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.value) - 5)
        .attr('text-anchor', 'middle')
        .text(d => d.value.toFixed(1))
        .style('font-size', '12px');
    }
    
    // Add axis labels
    chart.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .text(xAxis);
    
    chart.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${-margin.left + 20}, ${innerHeight / 2}) rotate(-90)`)
      .text(yAxis);
    
    // Add title
    chart.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);
    
  }, [data, width, height, margin, xAxis, yAxis, title, colorScheme, showValues, showGrid, onBarClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for StackedBarChart component
 */
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
  showLegend?: boolean;
  onBarClick?: (agentId: string, value: number) => void;
}

/**
 * Stacked bar chart component for visualizing agent contributions
 */
export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 120, bottom: 50, left: 60 },
  xAxis = 'Team',
  yAxis = 'Value',
  title = 'Agent Contributions',
  colorScheme = d3.schemeCategory10,
  showValues = true,
  showGrid = true,
  showLegend = true,
  onBarClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Calculate inner dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Group data by team and agent
    const teamAgentData: Record<string, Record<string, number>> = {};
    const agentIds: Set<string> = new Set();
    
    data.forEach(d => {
      if (!d.teamId) return;
      
      if (!teamAgentData[d.teamId]) {
        teamAgentData[d.teamId] = {};
      }
      
      if (!teamAgentData[d.teamId][d.agentId]) {
        teamAgentData[d.teamId][d.agentId] = 0;
      }
      
      teamAgentData[d.teamId][d.agentId] += Number(d.value);
      agentIds.add(d.agentId);
    });
    
    // Convert to format for d3 stacked bar chart
    const teamIds = Object.keys(teamAgentData);
    const agentIdsArray = Array.from(agentIds);
    
    const stackedData = teamIds.map(teamId => {
      const result: any = { teamId };
      agentIdsArray.forEach(agentId => {
        result[agentId] = teamAgentData[teamId][agentId] || 0;
      });
      return result;
    });
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(teamIds)
      .range([0, innerWidth])
      .padding(0.2);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(stackedData, d => {
        return agentIdsArray.reduce((sum, agentId) => sum + (d[agentId] || 0), 0);
      }) || 0])
      .range([innerHeight, 0])
      .nice();
    
    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(agentIdsArray)
      .range(colorScheme);
    
    // Create stack generator
    const stack = d3.stack<any>()
      .keys(agentIdsArray)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);
    
    const stackedSeries = stack(stackedData);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    // Add X axis
    chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);
    
    // Add Y axis
    chart.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    // Add grid if enabled
    if (showGrid) {
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
    
    // Add stacked bars
    stackedSeries.forEach((series) => {
      chart.selectAll(`.bar-${series.key}`)
        .data(series)
        .enter()
        .append('rect')
        .attr('class', `bar-${series.key}`)
        .attr('x', d => xScale(d.data.teamId) || 0)
        .attr('y', d => yScale(d[1]))
        .attr('height', d => yScale(d[0]) - yScale(d[1]))
        .attr('width', xScale.bandwidth())
        .attr('fill', colorScale(series.key as string))
        .style('cursor', onBarClick ? 'pointer' : 'default')
        .on('click', (event, d) => {
          if (onBarClick) {
            const agentId = series.key as string;
            const value = d[1] - d[0];
            onBarClick(agentId, value);
          }
        })
        .append('title')
        .text(d => {
          const agentId = series.key as string;
          const value = d[1] - d[0];
          return `Team: ${d.data.teamId}\nAgent: ${agentId}\nValue: ${value.toFixed(2)}`;
        });
    });
    
    // Add values if enabled
    if (showValues) {
      stackedSeries.forEach((series) => {
        chart.selectAll(`.value-${series.key}`)
          .data(series)
          .enter()
          .append('text')
          .attr('class', `value-${series.key}`)
          .attr('x', d => (xScale(d.data.teamId) || 0) + xScale.bandwidth() / 2)
          .attr('y', d => {
            const height = yScale(d[0]) - yScale(d[1]);
            return height > 15 ? yScale(d[1]) + height / 2 + 5 : yScale(d[1]) - 5;
          })
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('fill', d => {
            const height = yScale(d[0]) - yScale(d[1]);
            return height > 15 ? '#ffffff' : '#000000';
          })
          .text(d => {
            const value = d[1] - d[0];
            return value > 0 ? value.toFixed(1) : '';
          });
      });
    }
    
    // Add axis labels
    chart.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .text(xAxis);
    
    chart.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${-margin.left + 20}, ${innerHeight / 2}) rotate(-90)`)
      .text(yAxis);
    
    // Add title
    chart.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = chart.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);
      
      agentIdsArray.forEach((agentId, i) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);
        
        legendItem.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', colorScale(agentId));
        
        legendItem.append('text')
          .attr('x', 20)
          .attr('y', 12.5)
          .text(`Agent ${agentId}`)
          .style('font-size', '12px');
      });
    }
    
  }, [data, width, height, margin, xAxis, yAxis, title, colorScheme, showValues, showGrid, showLegend, onBarClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for CommunicationNetworkChart component
 */
interface CommunicationNetworkChartProps {
  data: CommunicationRecord[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  title?: string;
  colorScheme?: string[];
  showLabels?: boolean;
  onNodeClick?: (agentId: string) => void;
  onLinkClick?: (communication: CommunicationRecord) => void;
}

/**
 * Communication network chart component for visualizing agent communications
 */
export const CommunicationNetworkChart: React.FC<CommunicationNetworkChartProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  title = 'Communication Network',
  colorScheme = d3.schemeCategory10,
  showLabels = true,
  onNodeClick,
  onLinkClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Calculate inner dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Extract unique agents
    const agentIds = new Set<string>();
    data.forEach(d => {
      agentIds.add(d.senderId);
      if (d.receiverId) {
        agentIds.add(d.receiverId);
      }
    });
    
    // Create nodes
    const nodes = Array.from(agentIds).map(id => ({
      id,
      teamId: data.find(d => d.senderId === id)?.senderTeamId || 
              data.find(d => d.receiverId === id)?.receiverTeamId
    }));
    
    // Create links
    const links = data.map(d => ({
      source: d.senderId,
      target: d.receiverId || d.senderId, // Self-loop for broadcasts
      value: 1,
      communication: d
    }));
    
    // Count communications between each pair
    const linkCounts: Record<string, { source: string; target: string; value: number; communications: CommunicationRecord[] }> = {};
    
    links.forEach(link => {
      const key = `${link.source}-${link.target}`;
      if (!linkCounts[key]) {
        linkCounts[key] = {
          source: link.source,
          target: link.target,
          value: 0,
          communications: []
        };
      }
      linkCounts[key].value += 1;
      linkCounts[key].communications.push(link.communication);
    });
    
    // Create aggregated links
    const aggregatedLinks = Object.values(linkCounts);
    
    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(Array.from(new Set(nodes.map(n => n.teamId || 'unknown'))))
      .range(colorScheme);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(aggregatedLinks).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Add links
    const link = chart.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(aggregatedLinks)
      .enter()
      .append('line')
      .attr('stroke-width', d => Math.sqrt(d.value) * 2)
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .style('cursor', onLinkClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (onLinkClick && d.communications.length > 0) {
          onLinkClick(d.communications[0]);
        }
      })
      .append('title')
      .text(d => `${d.source} → ${d.target}: ${d.value} messages`);
    
    // Add nodes
    const node = chart.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', d => colorScale(d.teamId || 'unknown'))
      .style('cursor', onNodeClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (onNodeClick) onNodeClick(d.id);
      })
      .call(d3.drag<SVGCircleElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      )
      .append('title')
      .text(d => `Agent ${d.id}${d.teamId ? ` (Team ${d.teamId})` : ''}`);
    
    // Add labels if enabled
    if (showLabels) {
      const labels = chart.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text(d => d.id)
        .style('font-size', '10px')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none');
    }
    
    // Add title
    chart.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2 + 15)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);
      
      node
        .attr('cx', d => d.x = Math.max(10, Math.min(innerWidth - 10, d.x)))
        .attr('cy', d => d.y = Math.max(10, Math.min(innerHeight - 10, d.y)));
      
      if (showLabels) {
        chart.selectAll('.labels text')
          .attr('x', d => d.x)
          .attr('y', d => d.y + 20);
      }
    });
    
    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
  }, [data, width, height, margin, title, colorScheme, showLabels, onNodeClick, onLinkClick]);
  
  return <svg ref={svgRef}></svg>;
};

// Helper functions

/**
 * Group data by agent ID
 */
function groupDataByAgent(data: AgentMetricDataPoint[]): Record<string, AgentMetricDataPoint[]> {
  const result: Record<string, AgentMetricDataPoint[]> = {};
  
  data.forEach(point => {
    if (!result[point.agentId]) {
      result[point.agentId] = [];
    }
    result[point.agentId].push(point);
  });
  
  // Sort each group by step
  Object.keys(result).forEach(key => {
    result[key].sort((a, b) => a.step - b.step);
  });
  
  return result;
}

/**
 * Group data by team ID
 */
function groupDataByTeam(data: AgentMetricDataPoint[]): Record<string, AgentMetricDataPoint[]> {
  const result: Record<string, AgentMetricDataPoint[]> = {};
  
  data.forEach(point => {
    if (!point.teamId) return;
    
    if (!result[point.teamId]) {
      result[point.teamId] = [];
    }
    result[point.teamId].push(point);
  });
  
  // Sort each group by step
  Object.keys(result).forEach(key => {
    result[key].sort((a, b) => a.step - b.step);
  });
  
  return result;
}

/**
 * Apply exponential smoothing to data points
 */
function applyExponentialSmoothing<T extends MetricDataPoint>(
  data: T[],
  alpha: number
): T[] {
  if (data.length <= 1) return data;
  
  const smoothed = [...data];
  let lastValue = Number(smoothed[0].value);
  
  for (let i = 1; i < smoothed.length; i++) {
    const currentValue = Number(smoothed[i].value);
    const newValue = alpha * currentValue + (1 - alpha) * lastValue;
    
    // Create a new object to avoid mutating the original
    smoothed[i] = {
      ...smoothed[i],
      value: newValue
    };
    
    lastValue = newValue;
  }
  
  return smoothed;
}

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
export const LineChart = BaseLineChart;
export const BarChart = BaseBarChart;

export default {
  LineChart,
  BarChart,
  HeatMap,
  MultiAgentLineChart,
  TeamComparisonBarChart,
  StackedBarChart,
  CommunicationNetworkChart
};
