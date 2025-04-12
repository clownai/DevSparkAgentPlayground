/**
 * Dashboard components for visualization
 * 
 * This module provides React components for creating customizable dashboards
 * to visualize agent training and environment interactions.
 */

import React, { useState, useEffect, useRef } from 'react';
import MetricsCharts from './MetricsCharts';
import SimulationViewers from './SimulationViewers';
import { MetricDataPoint, MetricType } from '../utils/DataCollector';

/**
 * Props for Dashboard component
 */
interface DashboardProps {
  title: string;
  layout?: DashboardLayout;
  children: React.ReactNode;
  onLayoutChange?: (layout: DashboardLayout) => void;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  columns: number;
  rows: number;
  panels: DashboardPanel[];
}

/**
 * Dashboard panel configuration
 */
export interface DashboardPanel {
  id: string;
  title: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: any;
}

/**
 * Dashboard component for organizing visualization components
 */
export const Dashboard: React.FC<DashboardProps> = ({
  title,
  layout = { columns: 2, rows: 2, panels: [] },
  children,
  onLayoutChange
}) => {
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(layout);
  const [isEditing, setIsEditing] = useState(false);
  
  // Handle layout change
  const handleLayoutChange = (newLayout: DashboardLayout) => {
    setCurrentLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };
  
  return (
    <div className="dashboard" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#f5f5f5'
      }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div className="dashboard-controls">
          <button onClick={toggleEditMode}>
            {isEditing ? 'Save Layout' : 'Edit Layout'}
          </button>
        </div>
      </div>
      
      <div className="dashboard-content" style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${currentLayout.columns}, 1fr)`,
        gridTemplateRows: `repeat(${currentLayout.rows}, 1fr)`,
        gap: '10px',
        padding: '10px',
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Props for DashboardPanel component
 */
interface DashboardPanelProps {
  title: string;
  children: React.ReactNode;
  onRemove?: () => void;
  onConfigure?: () => void;
  isEditing?: boolean;
}

/**
 * Dashboard panel component for containing visualization components
 */
export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  title,
  children,
  onRemove,
  onConfigure,
  isEditing = false
}) => {
  return (
    <div className="dashboard-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #ccc',
      borderRadius: '4px',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      <div className="panel-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#f5f5f5'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>{title}</h3>
        {isEditing && (
          <div className="panel-controls">
            {onConfigure && (
              <button onClick={onConfigure} style={{ marginRight: '5px' }}>
                ⚙️
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove}>
                ❌
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="panel-content" style={{
        flex: 1,
        padding: '10px',
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Props for MetricsDashboard component
 */
interface MetricsDashboardProps {
  metrics: MetricDataPoint[];
  width?: number;
  height?: number;
  layout?: DashboardLayout;
  onLayoutChange?: (layout: DashboardLayout) => void;
}

/**
 * Metrics dashboard component for visualizing training metrics
 */
export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  width = 1200,
  height = 800,
  layout,
  onLayoutChange
}) => {
  // Group metrics by name
  const metricsByName: Record<string, MetricDataPoint[]> = {};
  
  metrics.forEach(metric => {
    if (!metricsByName[metric.name]) {
      metricsByName[metric.name] = [];
    }
    metricsByName[metric.name].push(metric);
  });
  
  // Create default layout if not provided
  const defaultLayout: DashboardLayout = {
    columns: 2,
    rows: Math.ceil(Object.keys(metricsByName).length / 2),
    panels: Object.keys(metricsByName).map((name, index) => ({
      id: `metric-${index}`,
      title: name,
      type: 'line-chart',
      x: index % 2,
      y: Math.floor(index / 2),
      width: 1,
      height: 1,
      config: {
        metricName: name,
        smoothing: 0.3
      }
    }))
  };
  
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(
    layout || defaultLayout
  );
  
  // Update layout when metrics change
  useEffect(() => {
    if (!layout) {
      setCurrentLayout(defaultLayout);
    }
  }, [metrics]);
  
  // Handle layout change
  const handleLayoutChange = (newLayout: DashboardLayout) => {
    setCurrentLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };
  
  return (
    <div style={{ width, height }}>
      <Dashboard 
        title="Training Metrics" 
        layout={currentLayout}
        onLayoutChange={handleLayoutChange}
      >
        {currentLayout.panels.map(panel => {
          const panelMetrics = metricsByName[panel.config.metricName] || [];
          
          return (
            <div key={panel.id} style={{
              gridColumn: `${panel.x + 1} / span ${panel.width}`,
              gridRow: `${panel.y + 1} / span ${panel.height}`
            }}>
              <DashboardPanel title={panel.title}>
                {panel.type === 'line-chart' && (
                  <MetricsCharts.LineChart
                    data={panelMetrics}
                    width={panel.width * (width / currentLayout.columns) - 40}
                    height={panel.height * (height / currentLayout.rows) - 80}
                    title={panel.title}
                    smoothing={panel.config.smoothing || 0}
                    showGrid={true}
                  />
                )}
                {panel.type === 'bar-chart' && (
                  <MetricsCharts.BarChart
                    data={panelMetrics}
                    width={panel.width * (width / currentLayout.columns) - 40}
                    height={panel.height * (height / currentLayout.rows) - 80}
                    title={panel.title}
                    showGrid={true}
                  />
                )}
              </DashboardPanel>
            </div>
          );
        })}
      </Dashboard>
    </div>
  );
};

/**
 * Props for AgentDashboard component
 */
interface AgentDashboardProps {
  metrics: MetricDataPoint[];
  episodeData?: {
    states: any[];
    actions: any[];
  };
  width?: number;
  height?: number;
  renderState?: (state: any, action?: any) => React.ReactNode;
  layout?: DashboardLayout;
  onLayoutChange?: (layout: DashboardLayout) => void;
}

/**
 * Agent dashboard component for visualizing agent behavior
 */
export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  metrics,
  episodeData,
  width = 1200,
  height = 800,
  renderState,
  layout,
  onLayoutChange
}) => {
  // Group metrics by name
  const metricsByName: Record<string, MetricDataPoint[]> = {};
  
  metrics.forEach(metric => {
    if (!metricsByName[metric.name]) {
      metricsByName[metric.name] = [];
    }
    metricsByName[metric.name].push(metric);
  });
  
  // Filter for agent-specific metrics
  const agentMetricNames = Object.keys(metricsByName).filter(
    name => name.startsWith('agent/')
  );
  
  // Create default layout if not provided
  const defaultLayout: DashboardLayout = {
    columns: 2,
    rows: Math.ceil((agentMetricNames.length + (episodeData ? 1 : 0)) / 2),
    panels: [
      ...(episodeData && renderState ? [{
        id: 'episode-player',
        title: 'Agent Behavior',
        type: 'episode-player',
        x: 0,
        y: 0,
        width: 2,
        height: 1,
        config: {}
      }] : []),
      ...agentMetricNames.map((name, index) => ({
        id: `metric-${index}`,
        title: name.replace('agent/', ''),
        type: 'line-chart',
        x: index % 2,
        y: Math.floor(index / 2) + (episodeData ? 1 : 0),
        width: 1,
        height: 1,
        config: {
          metricName: name,
          smoothing: 0.3
        }
      }))
    ]
  };
  
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(
    layout || defaultLayout
  );
  
  // Update layout when metrics change
  useEffect(() => {
    if (!layout) {
      setCurrentLayout(defaultLayout);
    }
  }, [metrics, episodeData]);
  
  // Handle layout change
  const handleLayoutChange = (newLayout: DashboardLayout) => {
    setCurrentLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };
  
  return (
    <div style={{ width, height }}>
      <Dashboard 
        title="Agent Dashboard" 
        layout={currentLayout}
        onLayoutChange={handleLayoutChange}
      >
        {currentLayout.panels.map(panel => {
          if (panel.type === 'episode-player' && episodeData && renderState) {
            return (
              <div key={panel.id} style={{
                gridColumn: `${panel.x + 1} / span ${panel.width}`,
                gridRow: `${panel.y + 1} / span ${panel.height}`
              }}>
                <DashboardPanel title={panel.title}>
                  <SimulationViewers.EpisodePlayer
                    episodeData={episodeData}
                    width={panel.width * (width / currentLayout.columns) - 40}
                    height={panel.height * (height / currentLayout.rows) - 80}
                    renderState={renderState}
                    autoPlay={panel.config.autoPlay}
                    speed={panel.config.speed || 1}
                  />
                </DashboardPanel>
              </div>
            );
          }
          
          const panelMetrics = metricsByName[panel.config.metricName] || [];
          
          return (
            <div key={panel.id} style={{
              gridColumn: `${panel.x + 1} / span ${panel.width}`,
              gridRow: `${panel.y + 1} / span ${panel.height}`
            }}>
              <DashboardPanel title={panel.title}>
                {panel.type === 'line-chart' && (
                  <MetricsCharts.LineChart
                    data={panelMetrics}
                    width={panel.width * (width / currentLayout.columns) - 40}
                    height={panel.height * (height / currentLayout.rows) - 80}
                    title={panel.title}
                    smoothing={panel.config.smoothing || 0}
                    showGrid={true}
                  />
                )}
                {panel.type === 'bar-chart' && (
                  <MetricsCharts.BarChart
                    data={panelMetrics}
                    width={panel.width * (width / currentLayout.columns) - 40}
                    height={panel.height * (height / currentLayout.rows) - 80}
                    title={panel.title}
                    showGrid={true}
                  />
                )}
              </DashboardPanel>
            </div>
          );
        })}
      </Dashboard>
    </div>
  );
};

/**
 * Props for ExperimentDashboard component
 */
interface ExperimentDashboardProps {
  experiments: Array<{
    id: string;
    name: string;
    metrics: MetricDataPoint[];
  }>;
  width?: number;
  height?: number;
  layout?: DashboardLayout;
  onLayoutChange?: (layout: DashboardLayout) => void;
}

/**
 * Experiment dashboard component for comparing multiple experiments
 */
export const ExperimentDashboard: React.FC<ExperimentDashboardProps> = ({
  experiments,
  width = 1200,
  height = 800,
  layout,
  onLayoutChange
}) => {
  // Find common metrics across experiments
  const commonMetricNames = new Set<string>();
  
  // First pass: collect all metric names
  experiments.forEach(experiment => {
    experiment.metrics.forEach(metric => {
      commonMetricNames.add(metric.name);
    });
  });
  
  // Group metrics by name for each experiment
  const metricsByExperiment: Record<string, Record<string, MetricDataPoint[]>> = {};
  
  experiments.forEach(experiment => {
    metricsByExperiment[experiment.id] = {};
    
    experiment.metrics.forEach(metric => {
      if (!metricsByExperiment[experiment.id][metric.name]) {
        metricsByExperiment[experiment.id][metric.name] = [];
      }
      metricsByExperiment[experiment.id][metric.name].push(metric);
    });
  });
  
  // Create default layout if not provided
  const defaultLayout: DashboardLayout = {
    columns: 2,
    rows: Math.ceil(commonMetricNames.size / 2),
    panels: Array.from(commonMetricNames).map((name, index) => ({
      id: `metric-${index}`,
      title: name,
      type: 'comparison-chart',
      x: index % 2,
      y: Math.floor(index / 2),
      width: 1,
      height: 1,
      config: {
        metricName: name,
        smoothing: 0.3
      }
    }))
  };
  
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(
    layout || defaultLayout
  );
  
  // Update layout when experiments change
  useEffect(() => {
    if (!layout) {
      setCurrentLayout(defaultLayout);
    }
  }, [experiments]);
  
  // Handle layout change
  const handleLayoutChange = (newLayout: DashboardLayout) => {
    setCurrentLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };
  
  // Prepare comparison data for each metric
  const prepareComparisonData = (metricName: string) => {
    const comparisonData: Array<{
      id: string;
      name: string;
      data: MetricDataPoint[];
    }> = [];
    
    experiments.forEach(experiment => {
      if (metricsByExperiment[experiment.id][metricName]) {
        comparisonData.push({
          id: experiment.id,
          name: experiment.name,
          data: metricsByExperiment[experiment.id][metricName]
        });
      }
    });
    
    return comparisonData;
  };
  
  // Render comparison chart
  const renderComparisonChart = (metricName: string, panelWidth: number, panelHeight: number) => {
    const comparisonData = prepareComparisonData(metricName);
    
    // Generate unique colors for each experiment
    const colors = experiments.map((_, i) => 
      `hsl(${(i * 360 / experiments.length) % 360}, 70%, 50%)`
    );
    
    return (
      <div style={{ position: 'relative' }}>
        {comparisonData.map((experiment, i) => (
          <div key={experiment.id} style={{ 
            position: i === 0 ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.8
          }}>
            <MetricsCharts.LineChart
              data={experiment.data}
              width={panelWidth}
              height={panelHeight}
              title={i === 0 ? metricName : ''}
              color={colors[i]}
              smoothing={0.3}
              showGrid={i === 0}
              showLegend={i === 0}
            />
          </div>
        ))}
        
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '5px',
          borderRadius: '4px',
          border: '1px solid #ccc'
        }}>
          {comparisonData.map((experiment, i) => (
            <div key={experiment.id} style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginBottom: '5px'
            }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                backgroundColor: colors[i],
                marginRight: '5px'
              }}></div>
              <span style={{ fontSize: '12px' }}>{experiment.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div style={{ width, height }}>
      <Dashboard 
        title="Experiment Comparison" 
        layout={currentLayout}
        onLayoutChange={handleLayoutChange}
      >
        {currentLayout.panels.map(panel => {
          return (
            <div key={panel.id} style={{
              gridColumn: `${panel.x + 1} / span ${panel.width}`,
              gridRow: `${panel.y + 1} / span ${panel.height}`
            }}>
              <DashboardPanel title={panel.title}>
                {panel.type === 'comparison-chart' && (
                  renderComparisonChart(
                    panel.config.metricName,
                    panel.width * (width / currentLayout.columns) - 40,
                    panel.height * (height / currentLayout.rows) - 80
                  )
                )}
              </DashboardPanel>
            </div>
          );
        })}
      </Dashboard>
    </div>
  );
};

/**
 * Props for CustomDashboard component
 */
interface CustomDashboardProps {
  title: string;
  data: any;
  width?: number;
  height?: number;
  layout?: DashboardLayout;
  components: Record<string, React.ComponentType<any>>;
  onLayoutChange?: (layout: DashboardLayout) => void;
}

/**
 * Custom dashboard component for creating user-defined dashboards
 */
export const CustomDashboard: React.FC<CustomDashboardProps> = ({
  title,
  data,
  width = 1200,
  height = 800,
  layout = { columns: 2, rows: 2, panels: [] },
  components,
  onLayoutChange
}) => {
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(layout);
  const [isEditing, setIsEditing] = useState(false);
  
  // Handle layout change
  const handleLayoutChange = (newLayout: DashboardLayout) => {
    setCurrentLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };
  
  return (
    <div style={{ width, height }}>
      <Dashboard 
        title={title} 
        layout={currentLayout}
        onLayoutChange={handleLayoutChange}
      >
        {currentLayout.panels.map(panel => {
          const Component = components[panel.type];
          
          if (!Component) {
            return (
              <div key={panel.id} style={{
                gridColumn: `${panel.x + 1} / span ${panel.width}`,
                gridRow: `${panel.y + 1} / span ${panel.height}`
              }}>
                <DashboardPanel title={panel.title}>
                  <div>Unknown component type: {panel.type}</div>
                </DashboardPanel>
              </div>
            );
          }
          
          return (
            <div key={panel.id} style={{
              gridColumn: `${panel.x + 1} / span ${panel.width}`,
              gridRow: `${panel.y + 1} / span ${panel.height}`
            }}>
              <DashboardPanel 
                title={panel.title}
                isEditing={isEditing}
                onRemove={() => {
                  const newPanels = currentLayout.panels.filter(p => p.id !== panel.id);
                  handleLayoutChange({
                    ...currentLayout,
                    panels: newPanels
                  });
                }}
                onConfigure={() => {
                  // Configuration logic would go here
                }}
              >
                <Component
                  {...panel.config}
                  data={data}
                  width={panel.width * (width / currentLayout.columns) - 40}
                  height={panel.height * (height / currentLayout.rows) - 80}
                />
              </DashboardPanel>
            </div>
          );
        })}
      </Dashboard>
    </div>
  );
};

export default {
  Dashboard,
  DashboardPanel,
  MetricsDashboard,
  AgentDashboard,
  ExperimentDashboard,
  CustomDashboard
};
