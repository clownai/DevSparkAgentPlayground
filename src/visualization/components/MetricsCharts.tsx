/**
 * Visualization components for metrics visualization
 * 
 * This module provides React components for visualizing metrics collected
 * during training and evaluation.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MetricDataPoint, MetricType } from './DataCollector';

/**
 * Props for LineChart component
 */
interface LineChartProps {
  data: MetricDataPoint[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxis?: string;
  yAxis?: string;
  title?: string;
  color?: string;
  smoothing?: number; // 0-1, where 0 is no smoothing and 1 is maximum smoothing
  showPoints?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  onPointClick?: (point: MetricDataPoint) => void;
}

/**
 * Line chart component for visualizing scalar metrics over time
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 30, bottom: 50, left: 60 },
  xAxis = 'Step',
  yAxis = 'Value',
  title = 'Metric Over Time',
  color = 'steelblue',
  smoothing = 0,
  showPoints = true,
  showGrid = true,
  showLegend = false,
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
    
    // Apply smoothing if needed
    let processedData = data;
    if (smoothing > 0 && smoothing < 1) {
      processedData = applyExponentialSmoothing(data, smoothing);
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.step) || 0])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([
        d3.min(processedData, d => Number(d.value)) || 0,
        d3.max(processedData, d => Number(d.value)) || 0
      ])
      .range([innerHeight, 0])
      .nice();
    
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
    const line = d3.line<MetricDataPoint>()
      .x(d => xScale(d.step))
      .y(d => yScale(Number(d.value)))
      .curve(d3.curveMonotoneX);
    
    // Add line path
    chart.append('path')
      .datum(processedData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Add points if enabled
    if (showPoints) {
      chart.selectAll('.point')
        .data(processedData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.step))
        .attr('cy', d => yScale(Number(d.value)))
        .attr('r', 3)
        .attr('fill', color)
        .style('cursor', onPointClick ? 'pointer' : 'default')
        .on('click', (event, d) => {
          if (onPointClick) onPointClick(d);
        })
        .append('title')
        .text(d => `Step: ${d.step}\nValue: ${d.value}`);
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
        .attr('transform', `translate(${innerWidth - 100}, 0)`);
      
      legend.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', color);
      
      legend.append('text')
        .attr('x', 20)
        .attr('y', 12.5)
        .text(title)
        .style('font-size', '12px');
    }
    
  }, [data, width, height, margin, xAxis, yAxis, title, color, smoothing, showPoints, showGrid, showLegend, onPointClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for BarChart component
 */
interface BarChartProps {
  data: MetricDataPoint[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxis?: string;
  yAxis?: string;
  title?: string;
  color?: string;
  showValues?: boolean;
  showGrid?: boolean;
  onBarClick?: (point: MetricDataPoint) => void;
}

/**
 * Bar chart component for visualizing categorical metrics
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 30, bottom: 70, left: 60 },
  xAxis = 'Category',
  yAxis = 'Value',
  title = 'Bar Chart',
  color = 'steelblue',
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
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.2);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Number(d.value)) || 0])
      .range([innerHeight, 0])
      .nice();
    
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
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name) || 0)
      .attr('y', d => yScale(Number(d.value)))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(Number(d.value)))
      .attr('fill', color)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (onBarClick) onBarClick(d);
      })
      .append('title')
      .text(d => `${d.name}: ${d.value}`);
    
    // Add values on top of bars if enabled
    if (showValues) {
      chart.selectAll('.bar-value')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'bar-value')
        .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(Number(d.value)) - 5)
        .attr('text-anchor', 'middle')
        .text(d => d.value.toString())
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
    
  }, [data, width, height, margin, xAxis, yAxis, title, color, showValues, showGrid, onBarClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for HeatMap component
 */
interface HeatMapProps {
  data: number[][];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xLabels?: string[];
  yLabels?: string[];
  title?: string;
  colorScale?: string[];
  showValues?: boolean;
  onCellClick?: (value: number, x: number, y: number) => void;
}

/**
 * Heat map component for visualizing 2D data
 */
export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 30, bottom: 50, left: 60 },
  xLabels,
  yLabels,
  title = 'Heat Map',
  colorScale = ['#f7fbff', '#08306b'],
  showValues = false,
  onCellClick
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
    
    // Determine dimensions
    const numRows = data.length;
    const numCols = data[0].length;
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(xLabels ? xLabels : Array.from({ length: numCols }, (_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.05);
    
    const yScale = d3.scaleBand()
      .domain(yLabels ? yLabels : Array.from({ length: numRows }, (_, i) => i.toString()))
      .range([0, innerHeight])
      .padding(0.05);
    
    // Flatten data for color scale
    const flatData = data.flat();
    
    // Create color scale
    const colorD3Scale = d3.scaleLinear<string>()
      .domain([d3.min(flatData) || 0, d3.max(flatData) || 1])
      .range(colorScale as [string, string]);
    
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
    
    // Add cells
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        const value = data[i][j];
        const x = xScale(xLabels ? xLabels[j] : j.toString()) || 0;
        const y = yScale(yLabels ? yLabels[i] : i.toString()) || 0;
        
        chart.append('rect')
          .attr('class', 'cell')
          .attr('x', x)
          .attr('y', y)
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', colorD3Scale(value))
          .style('cursor', onCellClick ? 'pointer' : 'default')
          .on('click', () => {
            if (onCellClick) onCellClick(value, j, i);
          })
          .append('title')
          .text(`(${xLabels ? xLabels[j] : j}, ${yLabels ? yLabels[i] : i}): ${value}`);
        
        // Add values if enabled
        if (showValues) {
          chart.append('text')
            .attr('class', 'cell-value')
            .attr('x', x + xScale.bandwidth() / 2)
            .attr('y', y + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .text(value.toFixed(1))
            .style('font-size', '10px')
            .style('fill', getContrastColor(colorD3Scale(value)));
        }
      }
    }
    
    // Add title
    chart.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);
    
    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendX = innerWidth - legendWidth;
    const legendY = innerHeight + margin.bottom - 30;
    
    const legendScale = d3.scaleLinear()
      .domain([d3.min(flatData) || 0, d3.max(flatData) || 1])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5);
    
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colorScale[0]);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colorScale[1]);
    
    const legend = chart.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');
    
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis);
    
  }, [data, width, height, margin, xLabels, yLabels, title, colorScale, showValues, onCellClick]);
  
  return <svg ref={svgRef}></svg>;
};

/**
 * Props for ScatterPlot component
 */
interface ScatterPlotProps {
  data: Array<{ x: number; y: number; label?: string; group?: string }>;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxis?: string;
  yAxis?: string;
  title?: string;
  colors?: string[];
  showLabels?: boolean;
  showLegend?: boolean;
  onPointClick?: (point: { x: number; y: number; label?: string; group?: string }) => void;
}

/**
 * Scatter plot component for visualizing relationships between variables
 */
export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 30, bottom: 50, left: 60 },
  xAxis = 'X',
  yAxis = 'Y',
  title = 'Scatter Plot',
  colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
  showLabels = false,
  showLegend = true,
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
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.x) || 0,
        d3.max(data, d => d.x) || 0
      ])
      .range([0, innerWidth])
      .nice();
    
    const yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.y) || 0,
        d3.max(data, d => d.y) || 0
      ])
      .range([innerHeight, 0])
      .nice();
    
    // Determine groups
    const groups = Array.from(new Set(data.map(d => d.group || 'default')));
    
    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(groups)
      .range(colors);
    
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
    
    // Add grid
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
    
    // Add points
    chart.selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5)
      .attr('fill', d => colorScale(d.group || 'default'))
      .style('cursor', onPointClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (onPointClick) onPointClick(d);
      })
      .append('title')
      .text(d => `(${d.x}, ${d.y})${d.label ? ` - ${d.label}` : ''}`);
    
    // Add labels if enabled
    if (showLabels) {
      chart.selectAll('.point-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'point-label')
        .attr('x', d => xScale(d.x) + 8)
        .attr('y', d => yScale(d.y) + 4)
        .text(d => d.label || '')
        .style('font-size', '10px');
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
    
    // Add legend if enabled and there are multiple groups
    if (showLegend && groups.length > 1) {
      const legendItemHeight = 20;
      const legendItemWidth = 150;
      const legendX = innerWidth - legendItemWidth;
      const legendY = 0;
      
      const legend = chart.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);
      
      groups.forEach((group, i) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${i * legendItemHeight})`);
        
        legendItem.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', colorScale(group));
        
        legendItem.append('text')
          .attr('x', 20)
          .attr('y', 12.5)
          .text(group)
          .style('font-size', '12px');
      });
    }
    
  }, [data, width, height, margin, xAxis, yAxis, title, colors, showLabels, showLegend, onPointClick]);
  
  return <svg ref={svgRef}></svg>;
};

// Helper functions

/**
 * Apply exponential smoothing to data
 * @param {MetricDataPoint[]} data - Input data
 * @param {number} alpha - Smoothing factor (0-1)
 * @returns {MetricDataPoint[]} - Smoothed data
 */
function applyExponentialSmoothing(data: MetricDataPoint[], alpha: number): MetricDataPoint[] {
  if (data.length <= 1) return data;
  
  const smoothed = [...data];
  let lastValue = Number(smoothed[0].value);
  
  for (let i = 1; i < smoothed.length; i++) {
    const currentValue = Number(smoothed[i].value);
    const newValue = alpha * currentValue + (1 - alpha) * lastValue;
    smoothed[i] = { ...smoothed[i], value: newValue };
    lastValue = newValue;
  }
  
  return smoothed;
}

/**
 * Get contrasting text color (black or white) based on background color
 * @param {string} backgroundColor - Background color in hex format
 * @returns {string} - Contrasting text color (black or white)
 */
function getContrastColor(backgroundColor: string): string {
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
  LineChart,
  BarChart,
  HeatMap,
  ScatterPlot
};
