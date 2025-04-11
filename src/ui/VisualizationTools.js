/**
 * VisualizationTools.js
 * Implementation of visualization tools for agent behavior and learning progress
 */

class VisualizationTools {
  /**
   * Create a new VisualizationTools instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultWidth: 800,
      defaultHeight: 600,
      colorScheme: 'default',
      animationEnabled: true,
      maxDataPoints: 1000,
      renderEngine: 'canvas',
      ...options
    };
    
    this.visualizations = new Map();
    this.renderers = new Map();
    this.dataProviders = new Map();
    
    this.logger = options.logger || console;
    
    // Initialize default renderers
    this.initializeDefaultRenderers();
    
    // Initialize default visualizations
    this.initializeDefaultVisualizations();
  }
  
  /**
   * Initialize default renderers
   */
  initializeDefaultRenderers() {
    // Register canvas renderer
    this.registerRenderer('canvas', {
      name: 'Canvas Renderer',
      description: 'Renders visualizations using HTML Canvas',
      initialize: (container, options) => {
        const canvas = document.createElement('canvas');
        canvas.width = options.width || this.options.defaultWidth;
        canvas.height = options.height || this.options.defaultHeight;
        container.appendChild(canvas);
        
        return {
          canvas,
          context: canvas.getContext('2d'),
          container
        };
      },
      clear: (context) => {
        context.context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      },
      resize: (context, width, height) => {
        context.canvas.width = width;
        context.canvas.height = height;
      }
    });
    
    // Register SVG renderer
    this.registerRenderer('svg', {
      name: 'SVG Renderer',
      description: 'Renders visualizations using SVG',
      initialize: (container, options) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', options.width || this.options.defaultWidth);
        svg.setAttribute('height', options.height || this.options.defaultHeight);
        container.appendChild(svg);
        
        return {
          svg,
          container
        };
      },
      clear: (context) => {
        while (context.svg.firstChild) {
          context.svg.removeChild(context.svg.firstChild);
        }
      },
      resize: (context, width, height) => {
        context.svg.setAttribute('width', width);
        context.svg.setAttribute('height', height);
      }
    });
    
    // Register WebGL renderer
    this.registerRenderer('webgl', {
      name: 'WebGL Renderer',
      description: 'Renders visualizations using WebGL',
      initialize: (container, options) => {
        const canvas = document.createElement('canvas');
        canvas.width = options.width || this.options.defaultWidth;
        canvas.height = options.height || this.options.defaultHeight;
        container.appendChild(canvas);
        
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          throw new Error('WebGL not supported');
        }
        
        return {
          canvas,
          gl,
          container
        };
      },
      clear: (context) => {
        context.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        context.gl.clear(context.gl.COLOR_BUFFER_BIT);
      },
      resize: (context, width, height) => {
        context.canvas.width = width;
        context.canvas.height = height;
        context.gl.viewport(0, 0, width, height);
      }
    });
  }
  
  /**
   * Initialize default visualizations
   */
  initializeDefaultVisualizations() {
    // Register line chart visualization
    this.registerVisualization('line-chart', {
      name: 'Line Chart',
      description: 'Visualizes time series data as a line chart',
      renderer: 'canvas',
      render: this.renderLineChart.bind(this),
      update: this.updateLineChart.bind(this),
      options: {
        xAxis: {
          label: 'Time',
          tickCount: 5,
          gridLines: true
        },
        yAxis: {
          label: 'Value',
          tickCount: 5,
          gridLines: true
        },
        line: {
          width: 2,
          color: '#3498db',
          smooth: true
        },
        points: {
          show: true,
          radius: 3,
          color: '#3498db'
        },
        animation: {
          duration: 500,
          easing: 'easeInOutQuad'
        }
      }
    });
    
    // Register bar chart visualization
    this.registerVisualization('bar-chart', {
      name: 'Bar Chart',
      description: 'Visualizes categorical data as a bar chart',
      renderer: 'canvas',
      render: this.renderBarChart.bind(this),
      update: this.updateBarChart.bind(this),
      options: {
        xAxis: {
          label: 'Category',
          tickCount: 0,
          gridLines: false
        },
        yAxis: {
          label: 'Value',
          tickCount: 5,
          gridLines: true
        },
        bars: {
          width: 0.7, // Relative to available space
          color: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1
        },
        animation: {
          duration: 500,
          easing: 'easeOutQuad'
        }
      }
    });
    
    // Register scatter plot visualization
    this.registerVisualization('scatter-plot', {
      name: 'Scatter Plot',
      description: 'Visualizes relationships between two variables',
      renderer: 'canvas',
      render: this.renderScatterPlot.bind(this),
      update: this.updateScatterPlot.bind(this),
      options: {
        xAxis: {
          label: 'X',
          tickCount: 5,
          gridLines: true
        },
        yAxis: {
          label: 'Y',
          tickCount: 5,
          gridLines: true
        },
        points: {
          radius: 5,
          color: '#3498db',
          opacity: 0.7
        },
        trendline: {
          show: true,
          color: '#e74c3c',
          width: 2
        }
      }
    });
    
    // Register heatmap visualization
    this.registerVisualization('heatmap', {
      name: 'Heatmap',
      description: 'Visualizes matrix data as a heatmap',
      renderer: 'canvas',
      render: this.renderHeatmap.bind(this),
      update: this.updateHeatmap.bind(this),
      options: {
        colorScale: ['#f7fbff', '#08306b'],
        cellSize: 20,
        labels: {
          show: true,
          fontSize: 10
        },
        grid: {
          show: true,
          color: '#ffffff',
          width: 1
        },
        tooltip: {
          show: true
        }
      }
    });
    
    // Register network graph visualization
    this.registerVisualization('network-graph', {
      name: 'Network Graph',
      description: 'Visualizes network relationships between entities',
      renderer: 'canvas',
      render: this.renderNetworkGraph.bind(this),
      update: this.updateNetworkGraph.bind(this),
      options: {
        nodes: {
          radius: 10,
          color: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1,
          labelColor: '#333333',
          labelSize: 12
        },
        edges: {
          width: 2,
          color: '#95a5a6',
          opacity: 0.6,
          directed: true,
          arrowSize: 5
        },
        layout: {
          algorithm: 'force-directed',
          iterations: 100,
          damping: 0.9,
          springLength: 100,
          springCoefficient: 0.01,
          gravity: 0.1
        },
        interaction: {
          draggable: true,
          zoomable: true,
          selectable: true
        }
      }
    });
    
    // Register agent behavior visualization
    this.registerVisualization('agent-behavior', {
      name: 'Agent Behavior',
      description: 'Visualizes agent behavior in an environment',
      renderer: 'canvas',
      render: this.renderAgentBehavior.bind(this),
      update: this.updateAgentBehavior.bind(this),
      options: {
        environment: {
          gridSize: 20,
          showGrid: true,
          gridColor: '#eeeeee',
          backgroundColor: '#ffffff'
        },
        agent: {
          color: '#3498db',
          size: 10,
          showPath: true,
          pathColor: '#3498db',
          pathOpacity: 0.3,
          pathWidth: 2
        },
        objects: {
          goal: {
            color: '#2ecc71',
            size: 8
          },
          obstacle: {
            color: '#e74c3c',
            size: 8
          }
        },
        animation: {
          speed: 1,
          showControls: true
        }
      }
    });
    
    // Register learning progress visualization
    this.registerVisualization('learning-progress', {
      name: 'Learning Progress',
      description: 'Visualizes agent learning progress over time',
      renderer: 'canvas',
      render: this.renderLearningProgress.bind(this),
      update: this.updateLearningProgress.bind(this),
      options: {
        metrics: ['reward', 'error', 'exploration'],
        colors: {
          reward: '#2ecc71',
          error: '#e74c3c',
          exploration: '#3498db'
        },
        xAxis: {
          label: 'Episodes',
          tickCount: 5,
          gridLines: true
        },
        yAxis: {
          label: 'Value',
          tickCount: 5,
          gridLines: true
        },
        legend: {
          show: true,
          position: 'top-right'
        },
        smoothing: {
          enabled: true,
          factor: 0.1
        }
      }
    });
  }
  
  /**
   * Register a new renderer
   * @param {string} id - Renderer ID
   * @param {object} definition - Renderer definition
   * @returns {boolean} Registration success
   */
  registerRenderer(id, definition) {
    if (this.renderers.has(id)) {
      this.logger.warn(`Renderer ${id} already exists, overwriting`);
    }
    
    this.renderers.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      initialize: definition.initialize || (() => ({})),
      clear: definition.clear || (() => {}),
      resize: definition.resize || (() => {})
    });
    
    return true;
  }
  
  /**
   * Register a new visualization
   * @param {string} id - Visualization ID
   * @param {object} definition - Visualization definition
   * @returns {boolean} Registration success
   */
  registerVisualization(id, definition) {
    if (this.visualizations.has(id)) {
      this.logger.warn(`Visualization ${id} already exists, overwriting`);
    }
    
    this.visualizations.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      renderer: definition.renderer || this.options.renderEngine,
      render: definition.render || (() => {}),
      update: definition.update || (() => {}),
      options: definition.options || {}
    });
    
    return true;
  }
  
  /**
   * Register a data provider
   * @param {string} id - Data provider ID
   * @param {function} provider - Data provider function
   * @returns {boolean} Registration success
   */
  registerDataProvider(id, provider) {
    if (this.dataProviders.has(id)) {
      this.logger.warn(`Data provider ${id} already exists, overwriting`);
    }
    
    this.dataProviders.set(id, provider);
    
    return true;
  }
  
  /**
   * Create a visualization
   * @param {string} id - Visualization ID
   * @param {HTMLElement} container - Container element
   * @param {object} options - Visualization options
   * @returns {object} Visualization context
   */
  createVisualization(id, container, options = {}) {
    if (!this.visualizations.has(id)) {
      throw new Error(`Unknown visualization: ${id}`);
    }
    
    const visualization = this.visualizations.get(id);
    
    // Get renderer
    const rendererId = visualization.renderer;
    if (!this.renderers.has(rendererId)) {
      throw new Error(`Unknown renderer: ${rendererId}`);
    }
    
    const renderer = this.renderers.get(rendererId);
    
    // Initialize renderer
    const rendererContext = renderer.initialize(container, {
      width: options.width || this.options.defaultWidth,
      height: options.height || this.options.defaultHeight
    });
    
    // Create visualization context
    const visualizationContext = {
      id,
      container,
      renderer: rendererContext,
      options: {
        ...visualization.options,
        ...options
      },
      data: null,
      animation: {
        active: false,
        startTime: 0,
        duration: 0
      }
    };
    
    return visualizationContext;
  }
  
  /**
   * Render a visualization
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   * @returns {boolean} Render success
   */
  render(context, data) {
    if (!context || !context.id) {
      return false;
    }
    
    if (!this.visualizations.has(context.id)) {
      return false;
    }
    
    const visualization = this.visualizations.get(context.id);
    
    // Clear renderer
    const renderer = this.renderers.get(visualization.renderer);
    renderer.clear(context.renderer);
    
    // Update data
    context.data = data;
    
    // Render visualization
    visualization.render(context, data);
    
    return true;
  }
  
  /**
   * Update a visualization
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   * @returns {boolean} Update success
   */
  update(context, data) {
    if (!context || !context.id) {
      return false;
    }
    
    if (!this.visualizations.has(context.id)) {
      return false;
    }
    
    const visualization = this.visualizations.get(context.id);
    
    // Update data
    const oldData = context.data;
    context.data = data;
    
    // Update visualization
    visualization.update(context, data, oldData);
    
    return true;
  }
  
  /**
   * Resize a visualization
   * @param {object} context - Visualization context
   * @param {number} width - New width
   * @param {number} height - New height
   * @returns {boolean} Resize success
   */
  resize(context, width, height) {
    if (!context || !context.id) {
      return false;
    }
    
    if (!this.visualizations.has(context.id)) {
      return false;
    }
    
    const visualization = this.visualizations.get(context.id);
    
    // Resize renderer
    const renderer = this.renderers.get(visualization.renderer);
    renderer.resize(context.renderer, width, height);
    
    // Re-render visualization
    if (context.data) {
      visualization.render(context, context.data);
    }
    
    return true;
  }
  
  /**
   * Get data from a data provider
   * @param {string} id - Data provider ID
   * @param {object} params - Data provider parameters
   * @returns {Promise<object>} Provider data
   */
  async getData(id, params = {}) {
    if (!this.dataProviders.has(id)) {
      throw new Error(`Unknown data provider: ${id}`);
    }
    
    const provider = this.dataProviders.get(id);
    
    try {
      return await provider(params);
    } catch (error) {
      this.logger.error(`Error getting data from provider ${id}: ${error.message}`, error);
      throw error;
    }
  }
  
  // Visualization rendering methods
  
  /**
   * Render a line chart
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderLineChart(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const series = data.series || [];
    if (series.length === 0) {
      return;
    }
    
    // Calculate margins
    const margin = {
      top: 20,
      right: 20,
      bottom: 40,
      left: 50
    };
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Find data range
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    
    for (const serie of series) {
      for (const point of serie.data) {
        xMin = Math.min(xMin, point.x);
        xMax = Math.max(xMax, point.x);
        yMin = Math.min(yMin, point.y);
        yMax = Math.max(yMax, point.y);
      }
    }
    
    // Add padding to y range
    const yPadding = (yMax - yMin) * 0.1;
    yMin -= yPadding;
    yMax += yPadding;
    
    // Create scales
    const xScale = (x) => margin.left + (x - xMin) / (xMax - xMin) * chartWidth;
    const yScale = (y) => margin.top + chartHeight - (y - yMin) / (yMax - yMin) * chartHeight;
    
    // Draw axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();
    
    // Draw grid lines
    if (options.xAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const xTickCount = options.xAxis.tickCount;
      for (let i = 0; i <= xTickCount; i++) {
        const x = xMin + (xMax - xMin) * (i / xTickCount);
        const xPos = xScale(x);
        
        ctx.beginPath();
        ctx.moveTo(xPos, margin.top);
        ctx.lineTo(xPos, margin.top + chartHeight);
        ctx.stroke();
      }
    }
    
    if (options.yAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const yTickCount = options.yAxis.tickCount;
      for (let i = 0; i <= yTickCount; i++) {
        const y = yMin + (yMax - yMin) * (i / yTickCount);
        const yPos = yScale(y);
        
        ctx.beginPath();
        ctx.moveTo(margin.left, yPos);
        ctx.lineTo(margin.left + chartWidth, yPos);
        ctx.stroke();
      }
    }
    
    // Draw axis labels
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis label
    ctx.fillText(options.xAxis.label, margin.left + chartWidth / 2, margin.top + chartHeight + 20);
    
    // Y axis label
    ctx.save();
    ctx.translate(margin.left - 30, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.yAxis.label, 0, 0);
    ctx.restore();
    
    // Draw axis ticks
    ctx.fillStyle = '#333333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis ticks
    const xTickCount = options.xAxis.tickCount;
    for (let i = 0; i <= xTickCount; i++) {
      const x = xMin + (xMax - xMin) * (i / xTickCount);
      const xPos = xScale(x);
      
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top + chartHeight);
      ctx.lineTo(xPos, margin.top + chartHeight + 5);
      ctx.stroke();
      
      ctx.fillText(x.toFixed(1), xPos, margin.top + chartHeight + 7);
    }
    
    // Y axis ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const yTickCount = options.yAxis.tickCount;
    for (let i = 0; i <= yTickCount; i++) {
      const y = yMin + (yMax - yMin) * (i / yTickCount);
      const yPos = yScale(y);
      
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left - 5, yPos);
      ctx.stroke();
      
      ctx.fillText(y.toFixed(1), margin.left - 7, yPos);
    }
    
    // Draw series
    for (let i = 0; i < series.length; i++) {
      const serie = series[i];
      const color = serie.color || options.line.color;
      
      // Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = options.line.width;
      ctx.beginPath();
      
      for (let j = 0; j < serie.data.length; j++) {
        const point = serie.data[j];
        const x = xScale(point.x);
        const y = yScale(point.y);
        
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          if (options.line.smooth) {
            // Use cardinal spline for smooth curves
            const prev = serie.data[j - 1];
            const prevX = xScale(prev.x);
            const prevY = yScale(prev.y);
            
            const tension = 0.3;
            const cp1x = prevX + (x - prevX) / 3;
            const cp1y = prevY + tension * (y - prevY);
            const cp2x = x - (x - prevX) / 3;
            const cp2y = y - tension * (y - prevY);
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      
      ctx.stroke();
      
      // Draw points
      if (options.points.show) {
        ctx.fillStyle = color;
        
        for (const point of serie.data) {
          const x = xScale(point.x);
          const y = yScale(point.y);
          
          ctx.beginPath();
          ctx.arc(x, y, options.points.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  /**
   * Update a line chart
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateLineChart(context, data, oldData) {
    // For simplicity, just re-render the chart
    this.renderLineChart(context, data);
  }
  
  /**
   * Render a bar chart
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderBarChart(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const categories = data.categories || [];
    const values = data.values || [];
    
    if (categories.length === 0 || values.length === 0) {
      return;
    }
    
    // Calculate margins
    const margin = {
      top: 20,
      right: 20,
      bottom: 40,
      left: 50
    };
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Find data range
    const yMin = Math.min(0, ...values);
    const yMax = Math.max(...values);
    
    // Add padding to y range
    const yPadding = (yMax - yMin) * 0.1;
    const yMinPadded = yMin - yPadding;
    const yMaxPadded = yMax + yPadding;
    
    // Create scales
    const barWidth = chartWidth / categories.length * options.bars.width;
    const xScale = (i) => margin.left + (i + 0.5) * (chartWidth / categories.length);
    const yScale = (y) => margin.top + chartHeight - (y - yMinPadded) / (yMaxPadded - yMinPadded) * chartHeight;
    
    // Draw axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();
    
    // Draw grid lines
    if (options.yAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const yTickCount = options.yAxis.tickCount;
      for (let i = 0; i <= yTickCount; i++) {
        const y = yMinPadded + (yMaxPadded - yMinPadded) * (i / yTickCount);
        const yPos = yScale(y);
        
        ctx.beginPath();
        ctx.moveTo(margin.left, yPos);
        ctx.lineTo(margin.left + chartWidth, yPos);
        ctx.stroke();
      }
    }
    
    // Draw axis labels
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis label
    ctx.fillText(options.xAxis.label, margin.left + chartWidth / 2, margin.top + chartHeight + 20);
    
    // Y axis label
    ctx.save();
    ctx.translate(margin.left - 30, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.yAxis.label, 0, 0);
    ctx.restore();
    
    // Draw axis ticks
    ctx.fillStyle = '#333333';
    ctx.font = '10px Arial';
    
    // X axis ticks (category labels)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i < categories.length; i++) {
      const x = xScale(i);
      
      ctx.fillText(categories[i], x, margin.top + chartHeight + 7);
    }
    
    // Y axis ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const yTickCount = options.yAxis.tickCount;
    for (let i = 0; i <= yTickCount; i++) {
      const y = yMinPadded + (yMaxPadded - yMinPadded) * (i / yTickCount);
      const yPos = yScale(y);
      
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left - 5, yPos);
      ctx.stroke();
      
      ctx.fillText(y.toFixed(1), margin.left - 7, yPos);
    }
    
    // Draw bars
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const x = xScale(i) - barWidth / 2;
      const y = yScale(Math.max(0, value));
      const barHeight = Math.abs(yScale(0) - yScale(value));
      
      // Fill bar
      ctx.fillStyle = options.bars.color;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw border
      ctx.strokeStyle = options.bars.borderColor;
      ctx.lineWidth = options.bars.borderWidth;
      ctx.strokeRect(x, y, barWidth, barHeight);
    }
  }
  
  /**
   * Update a bar chart
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateBarChart(context, data, oldData) {
    // For simplicity, just re-render the chart
    this.renderBarChart(context, data);
  }
  
  /**
   * Render a scatter plot
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderScatterPlot(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const points = data.points || [];
    
    if (points.length === 0) {
      return;
    }
    
    // Calculate margins
    const margin = {
      top: 20,
      right: 20,
      bottom: 40,
      left: 50
    };
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Find data range
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    
    for (const point of points) {
      xMin = Math.min(xMin, point.x);
      xMax = Math.max(xMax, point.x);
      yMin = Math.min(yMin, point.y);
      yMax = Math.max(yMax, point.y);
    }
    
    // Add padding to ranges
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;
    
    xMin -= xPadding;
    xMax += xPadding;
    yMin -= yPadding;
    yMax += yPadding;
    
    // Create scales
    const xScale = (x) => margin.left + (x - xMin) / (xMax - xMin) * chartWidth;
    const yScale = (y) => margin.top + chartHeight - (y - yMin) / (yMax - yMin) * chartHeight;
    
    // Draw axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();
    
    // Draw grid lines
    if (options.xAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const xTickCount = options.xAxis.tickCount;
      for (let i = 0; i <= xTickCount; i++) {
        const x = xMin + (xMax - xMin) * (i / xTickCount);
        const xPos = xScale(x);
        
        ctx.beginPath();
        ctx.moveTo(xPos, margin.top);
        ctx.lineTo(xPos, margin.top + chartHeight);
        ctx.stroke();
      }
    }
    
    if (options.yAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const yTickCount = options.yAxis.tickCount;
      for (let i = 0; i <= yTickCount; i++) {
        const y = yMin + (yMax - yMin) * (i / yTickCount);
        const yPos = yScale(y);
        
        ctx.beginPath();
        ctx.moveTo(margin.left, yPos);
        ctx.lineTo(margin.left + chartWidth, yPos);
        ctx.stroke();
      }
    }
    
    // Draw axis labels
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis label
    ctx.fillText(options.xAxis.label, margin.left + chartWidth / 2, margin.top + chartHeight + 20);
    
    // Y axis label
    ctx.save();
    ctx.translate(margin.left - 30, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.yAxis.label, 0, 0);
    ctx.restore();
    
    // Draw axis ticks
    ctx.fillStyle = '#333333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis ticks
    const xTickCount = options.xAxis.tickCount;
    for (let i = 0; i <= xTickCount; i++) {
      const x = xMin + (xMax - xMin) * (i / xTickCount);
      const xPos = xScale(x);
      
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top + chartHeight);
      ctx.lineTo(xPos, margin.top + chartHeight + 5);
      ctx.stroke();
      
      ctx.fillText(x.toFixed(1), xPos, margin.top + chartHeight + 7);
    }
    
    // Y axis ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const yTickCount = options.yAxis.tickCount;
    for (let i = 0; i <= yTickCount; i++) {
      const y = yMin + (yMax - yMin) * (i / yTickCount);
      const yPos = yScale(y);
      
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left - 5, yPos);
      ctx.stroke();
      
      ctx.fillText(y.toFixed(1), margin.left - 7, yPos);
    }
    
    // Draw points
    ctx.fillStyle = options.points.color;
    ctx.globalAlpha = options.points.opacity;
    
    for (const point of points) {
      const x = xScale(point.x);
      const y = yScale(point.y);
      
      ctx.beginPath();
      ctx.arc(x, y, options.points.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
    
    // Draw trendline if enabled
    if (options.trendline.show && points.length > 1) {
      // Calculate linear regression
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;
      
      for (const point of points) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumX2 += point.x * point.x;
      }
      
      const n = points.length;
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Draw trendline
      ctx.strokeStyle = options.trendline.color;
      ctx.lineWidth = options.trendline.width;
      
      const x1 = xMin;
      const y1 = slope * x1 + intercept;
      const x2 = xMax;
      const y2 = slope * x2 + intercept;
      
      ctx.beginPath();
      ctx.moveTo(xScale(x1), yScale(y1));
      ctx.lineTo(xScale(x2), yScale(y2));
      ctx.stroke();
    }
  }
  
  /**
   * Update a scatter plot
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateScatterPlot(context, data, oldData) {
    // For simplicity, just re-render the chart
    this.renderScatterPlot(context, data);
  }
  
  /**
   * Render a heatmap
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderHeatmap(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const matrix = data.matrix || [];
    const rowLabels = data.rowLabels || [];
    const colLabels = data.colLabels || [];
    
    if (matrix.length === 0) {
      return;
    }
    
    // Calculate cell size
    const cellSize = options.cellSize;
    
    // Calculate margins
    const margin = {
      top: options.labels.show ? 50 : 20,
      right: 20,
      bottom: 20,
      left: options.labels.show ? 50 : 20
    };
    
    // Find data range
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    
    for (const row of matrix) {
      for (const value of row) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }
    
    // Create color scale
    const colorScale = (value) => {
      const t = (value - minValue) / (maxValue - minValue);
      const startColor = hexToRgb(options.colorScale[0]);
      const endColor = hexToRgb(options.colorScale[1]);
      
      const r = Math.round(startColor.r + t * (endColor.r - startColor.r));
      const g = Math.round(startColor.g + t * (endColor.g - startColor.g));
      const b = Math.round(startColor.b + t * (endColor.b - startColor.b));
      
      return `rgb(${r}, ${g}, ${b})`;
    };
    
    // Draw heatmap cells
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      
      for (let j = 0; j < row.length; j++) {
        const value = row[j];
        const x = margin.left + j * cellSize;
        const y = margin.top + i * cellSize;
        
        // Fill cell
        ctx.fillStyle = colorScale(value);
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Draw grid
        if (options.grid.show) {
          ctx.strokeStyle = options.grid.color;
          ctx.lineWidth = options.grid.width;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
        
        // Draw cell value
        if (options.labels.show) {
          ctx.fillStyle = '#333333';
          ctx.font = `${options.labels.fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toFixed(1), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
    
    // Draw row labels
    if (options.labels.show && rowLabels.length > 0) {
      ctx.fillStyle = '#333333';
      ctx.font = `${options.labels.fontSize}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      for (let i = 0; i < rowLabels.length; i++) {
        const y = margin.top + i * cellSize + cellSize / 2;
        ctx.fillText(rowLabels[i], margin.left - 5, y);
      }
    }
    
    // Draw column labels
    if (options.labels.show && colLabels.length > 0) {
      ctx.fillStyle = '#333333';
      ctx.font = `${options.labels.fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      for (let j = 0; j < colLabels.length; j++) {
        const x = margin.left + j * cellSize + cellSize / 2;
        ctx.fillText(colLabels[j], x, margin.top - 5);
      }
    }
    
    // Helper function to convert hex color to RGB
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    }
  }
  
  /**
   * Update a heatmap
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateHeatmap(context, data, oldData) {
    // For simplicity, just re-render the chart
    this.renderHeatmap(context, data);
  }
  
  /**
   * Render a network graph
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderNetworkGraph(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const nodes = data.nodes || [];
    const edges = data.edges || [];
    
    if (nodes.length === 0) {
      return;
    }
    
    // Calculate layout if not provided
    if (!data.layout) {
      // Use force-directed layout
      const layout = this.calculateForceDirectedLayout(nodes, edges, {
        width,
        height,
        iterations: options.layout.iterations,
        springLength: options.layout.springLength,
        springCoefficient: options.layout.springCoefficient,
        gravity: options.layout.gravity,
        damping: options.layout.damping
      });
      
      // Update node positions
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].x = layout[i].x;
        nodes[i].y = layout[i].y;
      }
    }
    
    // Draw edges
    ctx.strokeStyle = options.edges.color;
    ctx.lineWidth = options.edges.width;
    ctx.globalAlpha = options.edges.opacity;
    
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      if (!source || !target) {
        continue;
      }
      
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      
      // Draw arrow if directed
      if (options.edges.directed) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowSize = options.edges.arrowSize;
        
        const arrowX = target.x - Math.cos(angle) * options.nodes.radius;
        const arrowY = target.y - Math.sin(angle) * options.nodes.radius;
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = options.edges.color;
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1.0;
    
    // Draw nodes
    for (const node of nodes) {
      // Draw node circle
      ctx.fillStyle = node.color || options.nodes.color;
      ctx.strokeStyle = node.borderColor || options.nodes.borderColor;
      ctx.lineWidth = options.nodes.borderWidth;
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, options.nodes.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw node label
      if (node.label) {
        ctx.fillStyle = options.nodes.labelColor;
        ctx.font = `${options.nodes.labelSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.label, node.x, node.y + options.nodes.radius + 5);
      }
    }
  }
  
  /**
   * Update a network graph
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateNetworkGraph(context, data, oldData) {
    // For simplicity, just re-render the chart
    this.renderNetworkGraph(context, data);
  }
  
  /**
   * Calculate force-directed layout for a network graph
   * @param {Array<object>} nodes - Graph nodes
   * @param {Array<object>} edges - Graph edges
   * @param {object} options - Layout options
   * @returns {Array<object>} Node positions
   */
  calculateForceDirectedLayout(nodes, edges, options) {
    const width = options.width;
    const height = options.height;
    const iterations = options.iterations || 100;
    const springLength = options.springLength || 100;
    const springCoefficient = options.springCoefficient || 0.01;
    const gravity = options.gravity || 0.1;
    const damping = options.damping || 0.9;
    
    // Initialize positions if not set
    for (const node of nodes) {
      if (node.x === undefined) {
        node.x = Math.random() * width;
      }
      if (node.y === undefined) {
        node.y = Math.random() * height;
      }
      
      // Initialize velocity
      node.vx = 0;
      node.vy = 0;
    }
    
    // Run simulation
    for (let i = 0; i < iterations; i++) {
      // Calculate forces
      for (const node of nodes) {
        node.fx = 0;
        node.fy = 0;
      }
      
      // Repulsive forces between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Repulsive force is inversely proportional to distance
          const force = 1 / distance;
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          nodeA.fx -= fx;
          nodeA.fy -= fy;
          nodeB.fx += fx;
          nodeB.fy += fy;
        }
      }
      
      // Spring forces along edges
      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        
        if (!source || !target) {
          continue;
        }
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Spring force is proportional to difference from rest length
        const force = springCoefficient * (distance - springLength);
        
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        source.fx += fx;
        source.fy += fy;
        target.fx -= fx;
        target.fy -= fy;
      }
      
      // Gravity force towards center
      const centerX = width / 2;
      const centerY = height / 2;
      
      for (const node of nodes) {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        
        node.fx += gravity * dx;
        node.fy += gravity * dy;
      }
      
      // Update positions
      for (const node of nodes) {
        // Update velocity with damping
        node.vx = (node.vx + node.fx) * damping;
        node.vy = (node.vy + node.fy) * damping;
        
        // Update position
        node.x += node.vx;
        node.y += node.vy;
        
        // Keep within bounds
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      }
    }
    
    // Return final positions
    return nodes.map(node => ({
      x: node.x,
      y: node.y
    }));
  }
  
  /**
   * Render agent behavior visualization
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderAgentBehavior(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const environment = data.environment || {};
    const agent = data.agent || {};
    const objects = data.objects || [];
    
    // Calculate grid size
    const gridSize = options.environment.gridSize;
    const cellSize = Math.min(width, height) / gridSize;
    
    // Calculate margins to center the grid
    const margin = {
      left: (width - cellSize * gridSize) / 2,
      top: (height - cellSize * gridSize) / 2
    };
    
    // Draw background
    ctx.fillStyle = options.environment.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    if (options.environment.showGrid) {
      ctx.strokeStyle = options.environment.gridColor;
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let i = 0; i <= gridSize; i++) {
        const x = margin.left + i * cellSize;
        
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + gridSize * cellSize);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 0; i <= gridSize; i++) {
        const y = margin.top + i * cellSize;
        
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + gridSize * cellSize, y);
        ctx.stroke();
      }
    }
    
    // Draw objects
    for (const object of objects) {
      const x = margin.left + object.x * cellSize + cellSize / 2;
      const y = margin.top + object.y * cellSize + cellSize / 2;
      
      ctx.fillStyle = options.objects[object.type]?.color || '#999999';
      
      ctx.beginPath();
      ctx.arc(x, y, options.objects[object.type]?.size || 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw agent path
    if (options.agent.showPath && agent.path && agent.path.length > 1) {
      ctx.strokeStyle = options.agent.pathColor;
      ctx.lineWidth = options.agent.pathWidth;
      ctx.globalAlpha = options.agent.pathOpacity;
      
      ctx.beginPath();
      
      for (let i = 0; i < agent.path.length; i++) {
        const point = agent.path[i];
        const x = margin.left + point.x * cellSize + cellSize / 2;
        const y = margin.top + point.y * cellSize + cellSize / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    
    // Draw agent
    if (agent.x !== undefined && agent.y !== undefined) {
      const x = margin.left + agent.x * cellSize + cellSize / 2;
      const y = margin.top + agent.y * cellSize + cellSize / 2;
      
      ctx.fillStyle = options.agent.color;
      
      ctx.beginPath();
      ctx.arc(x, y, options.agent.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Update agent behavior visualization
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateAgentBehavior(context, data, oldData) {
    // For simplicity, just re-render the visualization
    this.renderAgentBehavior(context, data);
  }
  
  /**
   * Render learning progress visualization
   * @param {object} context - Visualization context
   * @param {object} data - Visualization data
   */
  renderLearningProgress(context, data) {
    const { canvas, context: ctx } = context.renderer;
    const { width, height } = canvas;
    const options = context.options;
    
    // Extract data
    const episodes = data.episodes || [];
    const metrics = options.metrics;
    
    if (episodes.length === 0 || metrics.length === 0) {
      return;
    }
    
    // Calculate margins
    const margin = {
      top: 30,
      right: 20,
      bottom: 40,
      left: 50
    };
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Find data range
    const xMin = 0;
    const xMax = episodes.length - 1;
    
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    
    for (const episode of episodes) {
      for (const metric of metrics) {
        if (episode[metric] !== undefined) {
          yMin = Math.min(yMin, episode[metric]);
          yMax = Math.max(yMax, episode[metric]);
        }
      }
    }
    
    // Add padding to y range
    const yPadding = (yMax - yMin) * 0.1;
    yMin -= yPadding;
    yMax += yPadding;
    
    // Create scales
    const xScale = (x) => margin.left + (x - xMin) / (xMax - xMin) * chartWidth;
    const yScale = (y) => margin.top + chartHeight - (y - yMin) / (yMax - yMin) * chartHeight;
    
    // Draw axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();
    
    // Draw grid lines
    if (options.xAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const xTickCount = options.xAxis.tickCount;
      for (let i = 0; i <= xTickCount; i++) {
        const x = xMin + (xMax - xMin) * (i / xTickCount);
        const xPos = xScale(x);
        
        ctx.beginPath();
        ctx.moveTo(xPos, margin.top);
        ctx.lineTo(xPos, margin.top + chartHeight);
        ctx.stroke();
      }
    }
    
    if (options.yAxis.gridLines) {
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 1;
      
      const yTickCount = options.yAxis.tickCount;
      for (let i = 0; i <= yTickCount; i++) {
        const y = yMin + (yMax - yMin) * (i / yTickCount);
        const yPos = yScale(y);
        
        ctx.beginPath();
        ctx.moveTo(margin.left, yPos);
        ctx.lineTo(margin.left + chartWidth, yPos);
        ctx.stroke();
      }
    }
    
    // Draw axis labels
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis label
    ctx.fillText(options.xAxis.label, margin.left + chartWidth / 2, margin.top + chartHeight + 20);
    
    // Y axis label
    ctx.save();
    ctx.translate(margin.left - 30, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.yAxis.label, 0, 0);
    ctx.restore();
    
    // Draw axis ticks
    ctx.fillStyle = '#333333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X axis ticks
    const xTickCount = options.xAxis.tickCount;
    for (let i = 0; i <= xTickCount; i++) {
      const x = xMin + (xMax - xMin) * (i / xTickCount);
      const xPos = xScale(x);
      
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top + chartHeight);
      ctx.lineTo(xPos, margin.top + chartHeight + 5);
      ctx.stroke();
      
      ctx.fillText(Math.round(x).toString(), xPos, margin.top + chartHeight + 7);
    }
    
    // Y axis ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const yTickCount = options.yAxis.tickCount;
    for (let i = 0; i <= yTickCount; i++) {
      const y = yMin + (yMax - yMin) * (i / yTickCount);
      const yPos = yScale(y);
      
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left - 5, yPos);
      ctx.stroke();
      
      ctx.fillText(y.toFixed(1), margin.left - 7, yPos);
    }
    
    // Draw metrics
    for (const metric of metrics) {
      const color = options.colors[metric];
      
      // Apply smoothing if enabled
      let values = episodes.map(episode => episode[metric] || 0);
      
      if (options.smoothing.enabled) {
        values = this.smoothValues(values, options.smoothing.factor);
      }
      
      // Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < values.length; i++) {
        const x = xScale(i);
        const y = yScale(values[i]);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Draw legend
    if (options.legend.show) {
      const legendX = margin.left + chartWidth - 100;
      const legendY = margin.top + 10;
      const lineHeight = 20;
      
      for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        const color = options.colors[metric];
        const y = legendY + i * lineHeight;
        
        // Draw color box
        ctx.fillStyle = color;
        ctx.fillRect(legendX, y, 15, 15);
        
        // Draw label
        ctx.fillStyle = '#333333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(metric, legendX + 20, y + 7);
      }
    }
  }
  
  /**
   * Update learning progress visualization
   * @param {object} context - Visualization context
   * @param {object} data - New visualization data
   * @param {object} oldData - Old visualization data
   */
  updateLearningProgress(context, data, oldData) {
    // For simplicity, just re-render the visualization
    this.renderLearningProgress(context, data);
  }
  
  /**
   * Apply exponential moving average smoothing to values
   * @param {Array<number>} values - Values to smooth
   * @param {number} factor - Smoothing factor (0-1)
   * @returns {Array<number>} Smoothed values
   */
  smoothValues(values, factor) {
    if (values.length === 0) {
      return [];
    }
    
    const smoothed = [values[0]];
    
    for (let i = 1; i < values.length; i++) {
      const value = values[i];
      const prevSmoothed = smoothed[i - 1];
      
      smoothed.push(prevSmoothed * (1 - factor) + value * factor);
    }
    
    return smoothed;
  }
}

module.exports = VisualizationTools;
