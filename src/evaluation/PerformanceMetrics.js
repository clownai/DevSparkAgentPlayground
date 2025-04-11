/**
 * PerformanceMetrics.js
 * Implementation of performance metrics for agent evaluation
 */

class PerformanceMetrics {
  /**
   * Create a new PerformanceMetrics instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      historySize: 100,
      aggregationPeriods: ['episode', 'day', 'week', 'month'],
      standardMetrics: ['reward', 'steps', 'success', 'time'],
      ...options
    };
    
    this.metrics = new Map();
    this.history = new Map();
    this.benchmarks = new Map();
    
    this.logger = options.logger || console;
    
    // Initialize standard metrics
    this.initializeStandardMetrics();
  }
  
  /**
   * Initialize standard metrics
   */
  initializeStandardMetrics() {
    // Reward metrics
    this.registerMetric('reward', {
      name: 'Reward',
      description: 'Total reward accumulated during an episode',
      higherIsBetter: true,
      aggregation: 'sum',
      unit: '',
      formatter: value => value.toFixed(2)
    });
    
    // Steps metrics
    this.registerMetric('steps', {
      name: 'Steps',
      description: 'Number of steps taken to complete an episode',
      higherIsBetter: false,
      aggregation: 'sum',
      unit: 'steps',
      formatter: value => value.toFixed(0)
    });
    
    // Success rate metrics
    this.registerMetric('success', {
      name: 'Success Rate',
      description: 'Percentage of episodes completed successfully',
      higherIsBetter: true,
      aggregation: 'average',
      unit: '%',
      formatter: value => (value * 100).toFixed(1) + '%'
    });
    
    // Time metrics
    this.registerMetric('time', {
      name: 'Time',
      description: 'Time taken to complete an episode',
      higherIsBetter: false,
      aggregation: 'sum',
      unit: 'ms',
      formatter: value => {
        if (value < 1000) {
          return `${value.toFixed(0)}ms`;
        } else if (value < 60000) {
          return `${(value / 1000).toFixed(2)}s`;
        } else {
          return `${(value / 60000).toFixed(2)}m`;
        }
      }
    });
    
    // Learning progress metrics
    this.registerMetric('learning_progress', {
      name: 'Learning Progress',
      description: 'Improvement in performance over time',
      higherIsBetter: true,
      aggregation: 'average',
      unit: '',
      formatter: value => value.toFixed(2)
    });
    
    // Exploration metrics
    this.registerMetric('exploration', {
      name: 'Exploration Rate',
      description: 'Rate of exploration vs exploitation',
      higherIsBetter: null, // Neither higher nor lower is necessarily better
      aggregation: 'average',
      unit: '',
      formatter: value => value.toFixed(2)
    });
    
    // Convergence metrics
    this.registerMetric('convergence', {
      name: 'Convergence',
      description: 'Stability of the learning process',
      higherIsBetter: true,
      aggregation: 'average',
      unit: '',
      formatter: value => value.toFixed(2)
    });
    
    // Memory usage metrics
    this.registerMetric('memory_usage', {
      name: 'Memory Usage',
      description: 'Memory used by the agent',
      higherIsBetter: false,
      aggregation: 'average',
      unit: 'KB',
      formatter: value => {
        if (value < 1024) {
          return `${value.toFixed(0)}KB`;
        } else if (value < 1048576) {
          return `${(value / 1024).toFixed(2)}MB`;
        } else {
          return `${(value / 1048576).toFixed(2)}GB`;
        }
      }
    });
    
    // CPU usage metrics
    this.registerMetric('cpu_usage', {
      name: 'CPU Usage',
      description: 'CPU time used by the agent',
      higherIsBetter: false,
      aggregation: 'average',
      unit: '%',
      formatter: value => value.toFixed(1) + '%'
    });
  }
  
  /**
   * Register a new metric
   * @param {string} id - Metric ID
   * @param {object} definition - Metric definition
   * @returns {boolean} Registration success
   */
  registerMetric(id, definition) {
    if (this.metrics.has(id)) {
      this.logger.warn(`Metric ${id} already exists, overwriting`);
    }
    
    this.metrics.set(id, {
      id,
      name: definition.name || id,
      description: definition.description || '',
      higherIsBetter: definition.higherIsBetter !== undefined ? definition.higherIsBetter : true,
      aggregation: definition.aggregation || 'average',
      unit: definition.unit || '',
      formatter: definition.formatter || (value => value.toString()),
      tags: definition.tags || []
    });
    
    // Initialize history for this metric
    if (!this.history.has(id)) {
      this.history.set(id, []);
    }
    
    return true;
  }
  
  /**
   * Record a metric value
   * @param {string} id - Metric ID
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   * @returns {object} Recorded metric
   */
  recordMetric(id, value, metadata = {}) {
    if (!this.metrics.has(id)) {
      this.logger.error(`Unknown metric: ${id}`);
      return null;
    }
    
    const timestamp = metadata.timestamp || Date.now();
    const agentId = metadata.agentId || 'default';
    const episodeId = metadata.episodeId || `episode_${timestamp}`;
    const environmentId = metadata.environmentId || 'default';
    
    const metricRecord = {
      id,
      value,
      timestamp,
      agentId,
      episodeId,
      environmentId,
      metadata: { ...metadata }
    };
    
    // Add to history
    const history = this.history.get(id);
    history.push(metricRecord);
    
    // Limit history size
    if (history.length > this.options.historySize) {
      history.shift();
    }
    
    return metricRecord;
  }
  
  /**
   * Record multiple metrics at once
   * @param {object} metrics - Object mapping metric IDs to values
   * @param {object} metadata - Additional metadata
   * @returns {Array<object>} Recorded metrics
   */
  recordMetrics(metrics, metadata = {}) {
    const results = [];
    
    for (const [id, value] of Object.entries(metrics)) {
      const result = this.recordMetric(id, value, metadata);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Get metric definition
   * @param {string} id - Metric ID
   * @returns {object|null} Metric definition
   */
  getMetricDefinition(id) {
    return this.metrics.get(id) || null;
  }
  
  /**
   * Get all metric definitions
   * @returns {Array<object>} Metric definitions
   */
  getAllMetricDefinitions() {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Get metric history
   * @param {string} id - Metric ID
   * @param {object} filters - Filters to apply
   * @returns {Array<object>} Metric history
   */
  getMetricHistory(id, filters = {}) {
    if (!this.metrics.has(id)) {
      this.logger.error(`Unknown metric: ${id}`);
      return [];
    }
    
    let history = this.history.get(id) || [];
    
    // Apply filters
    if (filters.agentId) {
      history = history.filter(record => record.agentId === filters.agentId);
    }
    
    if (filters.environmentId) {
      history = history.filter(record => record.environmentId === filters.environmentId);
    }
    
    if (filters.episodeId) {
      history = history.filter(record => record.episodeId === filters.episodeId);
    }
    
    if (filters.startTime) {
      history = history.filter(record => record.timestamp >= filters.startTime);
    }
    
    if (filters.endTime) {
      history = history.filter(record => record.timestamp <= filters.endTime);
    }
    
    if (filters.limit) {
      history = history.slice(-filters.limit);
    }
    
    return history;
  }
  
  /**
   * Calculate aggregated metric value
   * @param {string} id - Metric ID
   * @param {object} filters - Filters to apply
   * @returns {object} Aggregated metric
   */
  calculateAggregatedMetric(id, filters = {}) {
    const history = this.getMetricHistory(id, filters);
    
    if (history.length === 0) {
      return {
        id,
        value: null,
        count: 0
      };
    }
    
    const metricDef = this.metrics.get(id);
    const values = history.map(record => record.value);
    
    let aggregatedValue;
    
    switch (metricDef.aggregation) {
      case 'sum':
        aggregatedValue = values.reduce((sum, value) => sum + value, 0);
        break;
        
      case 'average':
        aggregatedValue = values.reduce((sum, value) => sum + value, 0) / values.length;
        break;
        
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
        
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
        
      case 'median':
        const sortedValues = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sortedValues.length / 2);
        aggregatedValue = sortedValues.length % 2 === 0
          ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
          : sortedValues[mid];
        break;
        
      default:
        aggregatedValue = values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    
    return {
      id,
      value: aggregatedValue,
      count: history.length,
      formatted: metricDef.formatter(aggregatedValue)
    };
  }
  
  /**
   * Calculate multiple aggregated metrics
   * @param {Array<string>} ids - Metric IDs
   * @param {object} filters - Filters to apply
   * @returns {object} Aggregated metrics
   */
  calculateAggregatedMetrics(ids, filters = {}) {
    const result = {};
    
    for (const id of ids) {
      result[id] = this.calculateAggregatedMetric(id, filters);
    }
    
    return result;
  }
  
  /**
   * Calculate performance score
   * @param {Array<string>} metricIds - Metric IDs to include in score
   * @param {object} weights - Weights for each metric
   * @param {object} filters - Filters to apply
   * @returns {object} Performance score
   */
  calculatePerformanceScore(metricIds, weights = {}, filters = {}) {
    const metrics = metricIds || Array.from(this.metrics.keys());
    let totalScore = 0;
    let totalWeight = 0;
    const metricScores = {};
    
    for (const id of metrics) {
      const metricDef = this.metrics.get(id);
      
      if (!metricDef) {
        continue;
      }
      
      // Skip metrics where higherIsBetter is null (neutral metrics)
      if (metricDef.higherIsBetter === null) {
        continue;
      }
      
      const aggregated = this.calculateAggregatedMetric(id, filters);
      
      if (aggregated.value === null) {
        continue;
      }
      
      // Get benchmark for this metric
      const benchmark = this.getBenchmark(id);
      
      // Calculate normalized score (0-1)
      let normalizedScore;
      
      if (benchmark) {
        if (metricDef.higherIsBetter) {
          normalizedScore = aggregated.value / benchmark.value;
        } else {
          normalizedScore = benchmark.value / aggregated.value;
        }
      } else {
        // No benchmark, use raw value
        normalizedScore = metricDef.higherIsBetter ? aggregated.value : 1 / aggregated.value;
      }
      
      // Apply weight
      const weight = weights[id] || 1;
      totalWeight += weight;
      
      // Add to total score
      const weightedScore = normalizedScore * weight;
      totalScore += weightedScore;
      
      // Record metric score
      metricScores[id] = {
        raw: aggregated.value,
        normalized: normalizedScore,
        weighted: weightedScore,
        weight
      };
    }
    
    // Calculate final score
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    return {
      score: finalScore,
      normalizedScore: Math.min(1, Math.max(0, finalScore)),
      metrics: metricScores,
      totalWeight
    };
  }
  
  /**
   * Set benchmark for a metric
   * @param {string} id - Metric ID
   * @param {number} value - Benchmark value
   * @param {object} metadata - Additional metadata
   * @returns {object} Benchmark
   */
  setBenchmark(id, value, metadata = {}) {
    if (!this.metrics.has(id)) {
      this.logger.error(`Unknown metric: ${id}`);
      return null;
    }
    
    const benchmark = {
      id,
      value,
      timestamp: metadata.timestamp || Date.now(),
      source: metadata.source || 'manual',
      description: metadata.description || '',
      metadata: { ...metadata }
    };
    
    this.benchmarks.set(id, benchmark);
    return benchmark;
  }
  
  /**
   * Get benchmark for a metric
   * @param {string} id - Metric ID
   * @returns {object|null} Benchmark
   */
  getBenchmark(id) {
    return this.benchmarks.get(id) || null;
  }
  
  /**
   * Get all benchmarks
   * @returns {object} Benchmarks
   */
  getAllBenchmarks() {
    const result = {};
    
    for (const [id, benchmark] of this.benchmarks.entries()) {
      result[id] = benchmark;
    }
    
    return result;
  }
  
  /**
   * Calculate improvement over time
   * @param {string} id - Metric ID
   * @param {object} filters - Filters to apply
   * @param {number} windowSize - Window size for calculating improvement
   * @returns {object} Improvement statistics
   */
  calculateImprovement(id, filters = {}, windowSize = 10) {
    const history = this.getMetricHistory(id, filters);
    
    if (history.length < windowSize * 2) {
      return {
        id,
        improvement: null,
        message: `Not enough data (need at least ${windowSize * 2} records)`
      };
    }
    
    const metricDef = this.metrics.get(id);
    const values = history.map(record => record.value);
    
    // Calculate average for first window
    const firstWindow = values.slice(0, windowSize);
    const firstAvg = firstWindow.reduce((sum, value) => sum + value, 0) / windowSize;
    
    // Calculate average for last window
    const lastWindow = values.slice(-windowSize);
    const lastAvg = lastWindow.reduce((sum, value) => sum + value, 0) / windowSize;
    
    // Calculate improvement
    let improvement;
    let percentImprovement;
    
    if (metricDef.higherIsBetter) {
      improvement = lastAvg - firstAvg;
      percentImprovement = firstAvg !== 0 ? (improvement / Math.abs(firstAvg)) * 100 : 0;
    } else {
      improvement = firstAvg - lastAvg;
      percentImprovement = firstAvg !== 0 ? (improvement / Math.abs(firstAvg)) * 100 : 0;
    }
    
    return {
      id,
      improvement,
      percentImprovement,
      firstAverage: firstAvg,
      lastAverage: lastAvg,
      windowSize,
      totalRecords: history.length
    };
  }
  
  /**
   * Generate performance report
   * @param {object} options - Report options
   * @returns {object} Performance report
   */
  generatePerformanceReport(options = {}) {
    const metricIds = options.metrics || Array.from(this.metrics.keys());
    const filters = options.filters || {};
    const weights = options.weights || {};
    
    // Calculate overall score
    const score = this.calculatePerformanceScore(metricIds, weights, filters);
    
    // Calculate individual metrics
    const metrics = {};
    
    for (const id of metricIds) {
      const metricDef = this.metrics.get(id);
      
      if (!metricDef) {
        continue;
      }
      
      const aggregated = this.calculateAggregatedMetric(id, filters);
      const improvement = this.calculateImprovement(id, filters, options.windowSize || 10);
      const benchmark = this.getBenchmark(id);
      
      metrics[id] = {
        definition: metricDef,
        current: aggregated,
        improvement,
        benchmark,
        score: score.metrics[id]
      };
    }
    
    return {
      timestamp: Date.now(),
      score,
      metrics,
      filters
    };
  }
  
  /**
   * Export metrics data
   * @param {object} options - Export options
   * @returns {object} Exported data
   */
  exportMetricsData(options = {}) {
    const metricIds = options.metrics || Array.from(this.metrics.keys());
    const includeDefinitions = options.includeDefinitions !== false;
    const includeHistory = options.includeHistory !== false;
    const includeBenchmarks = options.includeBenchmarks !== false;
    
    const exportData = {
      timestamp: Date.now(),
      metrics: {}
    };
    
    for (const id of metricIds) {
      const metricDef = this.metrics.get(id);
      
      if (!metricDef) {
        continue;
      }
      
      exportData.metrics[id] = {};
      
      if (includeDefinitions) {
        exportData.metrics[id].definition = { ...metricDef };
      }
      
      if (includeHistory) {
        exportData.metrics[id].history = this.getMetricHistory(id, options.filters || {});
      }
      
      if (includeBenchmarks) {
        const benchmark = this.getBenchmark(id);
        if (benchmark) {
          exportData.metrics[id].benchmark = benchmark;
        }
      }
    }
    
    return exportData;
  }
  
  /**
   * Import metrics data
   * @param {object} data - Data to import
   * @param {object} options - Import options
   * @returns {object} Import result
   */
  importMetricsData(data, options = {}) {
    if (!data || !data.metrics) {
      return {
        success: false,
        message: 'Invalid metrics data'
      };
    }
    
    const importDefinitions = options.importDefinitions !== false;
    const importHistory = options.importHistory !== false;
    const importBenchmarks = options.importBenchmarks !== false;
    const overwrite = options.overwrite === true;
    
    let definitionsImported = 0;
    let historyRecordsImported = 0;
    let benchmarksImported = 0;
    
    for (const [id, metricData] of Object.entries(data.metrics)) {
      // Import definition
      if (importDefinitions && metricData.definition) {
        if (!this.metrics.has(id) || overwrite) {
          this.registerMetric(id, metricData.definition);
          definitionsImported++;
        }
      }
      
      // Import history
      if (importHistory && metricData.history) {
        if (!this.history.has(id)) {
          this.history.set(id, []);
        }
        
        const history = this.history.get(id);
        
        if (overwrite) {
          history.length = 0;
        }
        
        for (const record of metricData.history) {
          history.push(record);
          historyRecordsImported++;
        }
        
        // Sort by timestamp
        history.sort((a, b) => a.timestamp - b.timestamp);
        
        // Limit history size
        if (history.length > this.options.historySize) {
          history.splice(0, history.length - this.options.historySize);
        }
      }
      
      // Import benchmark
      if (importBenchmarks && metricData.benchmark) {
        this.benchmarks.set(id, metricData.benchmark);
        benchmarksImported++;
      }
    }
    
    return {
      success: true,
      definitionsImported,
      historyRecordsImported,
      benchmarksImported
    };
  }
  
  /**
   * Clear metric history
   * @param {string} id - Metric ID (optional, if not provided clears all)
   * @returns {number} Number of records cleared
   */
  clearHistory(id = null) {
    if (id) {
      if (!this.history.has(id)) {
        return 0;
      }
      
      const count = this.history.get(id).length;
      this.history.set(id, []);
      return count;
    } else {
      let count = 0;
      
      for (const history of this.history.values()) {
        count += history.length;
        history.length = 0;
      }
      
      return count;
    }
  }
}

module.exports = PerformanceMetrics;
