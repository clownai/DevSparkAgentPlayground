/**
 * Performance Tracking for DevSparkAgent Playground
 * 
 * Tracks and analyzes agent performance over time.
 */

class PerformanceTracking {
  /**
   * Create a new PerformanceTracking instance
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config;
    this.metrics = new Map();
    this.agentPerformance = new Map();
    this.benchmarks = new Map();
    this.logger = console; // Will be replaced with proper logger
  }

  /**
   * Initialize the performance tracking
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing PerformanceTracking...');
      
      // Initialize default metrics
      await this._initializeDefaultMetrics();
      
      // Initialize default benchmarks
      await this._initializeDefaultBenchmarks();
      
      this.logger.info('PerformanceTracking initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`PerformanceTracking initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register a metric
   * @param {string} metricId - Metric ID
   * @param {Object} metric - Metric object
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerMetric(metricId, metric) {
    try {
      this.logger.info(`Registering metric ${metricId}`);
      
      // Store metric
      this.metrics.set(metricId, {
        id: metricId,
        name: metric.name || metricId,
        description: metric.description || '',
        type: metric.type || 'numeric',
        unit: metric.unit || '',
        min: metric.min,
        max: metric.max,
        calculate: metric.calculate || (value => value),
        registeredAt: new Date()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register metric ${metricId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister a metric
   * @param {string} metricId - Metric ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterMetric(metricId) {
    try {
      this.logger.info(`Unregistering metric ${metricId}`);
      
      // Check if metric exists
      if (!this.metrics.has(metricId)) {
        this.logger.warn(`Metric ${metricId} not found`);
        return false;
      }
      
      // Remove metric
      this.metrics.delete(metricId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister metric ${metricId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register a benchmark
   * @param {string} benchmarkId - Benchmark ID
   * @param {Object} benchmark - Benchmark object
   * @returns {Promise<boolean>} - Resolves to true if registration is successful
   */
  async registerBenchmark(benchmarkId, benchmark) {
    try {
      this.logger.info(`Registering benchmark ${benchmarkId}`);
      
      // Store benchmark
      this.benchmarks.set(benchmarkId, {
        id: benchmarkId,
        name: benchmark.name || benchmarkId,
        description: benchmark.description || '',
        metrics: benchmark.metrics || [],
        tasks: benchmark.tasks || [],
        execute: benchmark.execute,
        registeredAt: new Date()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register benchmark ${benchmarkId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Unregister a benchmark
   * @param {string} benchmarkId - Benchmark ID
   * @returns {Promise<boolean>} - Resolves to true if unregistration is successful
   */
  async unregisterBenchmark(benchmarkId) {
    try {
      this.logger.info(`Unregistering benchmark ${benchmarkId}`);
      
      // Check if benchmark exists
      if (!this.benchmarks.has(benchmarkId)) {
        this.logger.warn(`Benchmark ${benchmarkId} not found`);
        return false;
      }
      
      // Remove benchmark
      this.benchmarks.delete(benchmarkId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister benchmark ${benchmarkId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Track agent performance
   * @param {string} agentId - Agent ID
   * @param {string} metricId - Metric ID
   * @param {*} value - Metric value
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Performance record
   */
  async trackPerformance(agentId, metricId, value, context = {}) {
    try {
      // Check if metric exists
      if (!this.metrics.has(metricId)) {
        throw new Error(`Metric ${metricId} not found`);
      }
      
      // Get metric
      const metric = this.metrics.get(metricId);
      
      // Calculate metric value
      const calculatedValue = metric.calculate(value);
      
      // Create performance record
      const record = {
        agentId,
        metricId,
        value: calculatedValue,
        rawValue: value,
        timestamp: new Date(),
        context
      };
      
      // Store performance record
      if (!this.agentPerformance.has(agentId)) {
        this.agentPerformance.set(agentId, new Map());
      }
      
      const agentMetrics = this.agentPerformance.get(agentId);
      
      if (!agentMetrics.has(metricId)) {
        agentMetrics.set(metricId, []);
      }
      
      const metricRecords = agentMetrics.get(metricId);
      metricRecords.push(record);
      
      // Limit number of records
      const maxRecords = this.config.performance.maxRecordsPerMetric || 1000;
      if (metricRecords.length > maxRecords) {
        metricRecords.shift();
      }
      
      return record;
    } catch (error) {
      this.logger.error(`Failed to track performance for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Run benchmark for an agent
   * @param {string} agentId - Agent ID
   * @param {string} benchmarkId - Benchmark ID
   * @param {Object} options - Benchmark options
   * @returns {Promise<Object>} - Benchmark results
   */
  async runBenchmark(agentId, benchmarkId, options = {}) {
    try {
      this.logger.info(`Running benchmark ${benchmarkId} for agent ${agentId}`);
      
      // Check if benchmark exists
      if (!this.benchmarks.has(benchmarkId)) {
        throw new Error(`Benchmark ${benchmarkId} not found`);
      }
      
      // Get benchmark
      const benchmark = this.benchmarks.get(benchmarkId);
      
      // Execute benchmark
      const startTime = Date.now();
      const results = await benchmark.execute(agentId, options);
      const endTime = Date.now();
      
      // Create benchmark record
      const record = {
        agentId,
        benchmarkId,
        results,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        options
      };
      
      // Store benchmark results
      if (!this.agentPerformance.has(agentId)) {
        this.agentPerformance.set(agentId, new Map());
      }
      
      const agentMetrics = this.agentPerformance.get(agentId);
      
      if (!agentMetrics.has(`benchmark:${benchmarkId}`)) {
        agentMetrics.set(`benchmark:${benchmarkId}`, []);
      }
      
      const benchmarkRecords = agentMetrics.get(`benchmark:${benchmarkId}`);
      benchmarkRecords.push(record);
      
      // Limit number of records
      const maxRecords = this.config.performance.maxRecordsPerBenchmark || 100;
      if (benchmarkRecords.length > maxRecords) {
        benchmarkRecords.shift();
      }
      
      return record;
    } catch (error) {
      this.logger.error(`Failed to run benchmark ${benchmarkId} for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent performance
   * @param {string} agentId - Agent ID
   * @param {string} metricId - Metric ID (optional)
   * @param {Object} options - Query options
   * @returns {Array<Object>} - Performance records
   */
  getAgentPerformance(agentId, metricId = null, options = {}) {
    try {
      // Check if agent has performance records
      if (!this.agentPerformance.has(agentId)) {
        return [];
      }
      
      const agentMetrics = this.agentPerformance.get(agentId);
      
      // If metric ID is provided, return records for that metric
      if (metricId) {
        if (!agentMetrics.has(metricId)) {
          return [];
        }
        
        const metricRecords = agentMetrics.get(metricId);
        
        // Apply time range filter
        if (options.startTime || options.endTime) {
          return metricRecords.filter(record => {
            if (options.startTime && record.timestamp < options.startTime) {
              return false;
            }
            if (options.endTime && record.timestamp > options.endTime) {
              return false;
            }
            return true;
          });
        }
        
        // Apply limit
        if (options.limit) {
          return metricRecords.slice(-options.limit);
        }
        
        return metricRecords;
      }
      
      // If no metric ID is provided, return all records
      const allRecords = [];
      
      for (const [metricId, metricRecords] of agentMetrics.entries()) {
        allRecords.push(...metricRecords);
      }
      
      // Sort by timestamp
      allRecords.sort((a, b) => a.timestamp - b.timestamp);
      
      // Apply time range filter
      if (options.startTime || options.endTime) {
        return allRecords.filter(record => {
          if (options.startTime && record.timestamp < options.startTime) {
            return false;
          }
          if (options.endTime && record.timestamp > options.endTime) {
            return false;
          }
          return true;
        });
      }
      
      // Apply limit
      if (options.limit) {
        return allRecords.slice(-options.limit);
      }
      
      return allRecords;
    } catch (error) {
      this.logger.error(`Failed to get performance for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get agent benchmark results
   * @param {string} agentId - Agent ID
   * @param {string} benchmarkId - Benchmark ID
   * @param {Object} options - Query options
   * @returns {Array<Object>} - Benchmark records
   */
  getAgentBenchmarkResults(agentId, benchmarkId, options = {}) {
    try {
      // Check if agent has performance records
      if (!this.agentPerformance.has(agentId)) {
        return [];
      }
      
      const agentMetrics = this.agentPerformance.get(agentId);
      const benchmarkMetricId = `benchmark:${benchmarkId}`;
      
      // Check if agent has benchmark records
      if (!agentMetrics.has(benchmarkMetricId)) {
        return [];
      }
      
      const benchmarkRecords = agentMetrics.get(benchmarkMetricId);
      
      // Apply time range filter
      if (options.startTime || options.endTime) {
        return benchmarkRecords.filter(record => {
          if (options.startTime && record.startTime < options.startTime) {
            return false;
          }
          if (options.endTime && record.endTime > options.endTime) {
            return false;
          }
          return true;
        });
      }
      
      // Apply limit
      if (options.limit) {
        return benchmarkRecords.slice(-options.limit);
      }
      
      return benchmarkRecords;
    } catch (error) {
      this.logger.error(`Failed to get benchmark results for agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Compare agent performance
   * @param {Array<string>} agentIds - Agent IDs to compare
   * @param {string} metricId - Metric ID
   * @param {Object} options - Comparison options
   * @returns {Object} - Comparison results
   */
  compareAgentPerformance(agentIds, metricId, options = {}) {
    try {
      const results = {
        metric: metricId,
        agents: {},
        summary: {}
      };
      
      // Get performance records for each agent
      for (const agentId of agentIds) {
        const records = this.getAgentPerformance(agentId, metricId, options);
        
        if (records.length === 0) {
          results.agents[agentId] = {
            count: 0,
            min: null,
            max: null,
            avg: null,
            values: []
          };
          continue;
        }
        
        // Calculate statistics
        const values = records.map(record => record.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
        
        results.agents[agentId] = {
          count: records.length,
          min,
          max,
          avg,
          values
        };
      }
      
      // Calculate summary statistics
      const agentStats = Object.values(results.agents);
      
      if (agentStats.length === 0 || agentStats.every(stats => stats.count === 0)) {
        results.summary = {
          bestAgent: null,
          worstAgent: null,
          avgDifference: null
        };
      } else {
        // Find best and worst agents
        let bestAgent = null;
        let worstAgent = null;
        let bestAvg = -Infinity;
        let worstAvg = Infinity;
        
        for (const agentId of agentIds) {
          const stats = results.agents[agentId];
          
          if (stats.count === 0) {
            continue;
          }
          
          // For metrics where higher is better
          if (options.higherIsBetter !== false) {
            if (stats.avg > bestAvg) {
              bestAvg = stats.avg;
              bestAgent = agentId;
            }
            
            if (stats.avg < worstAvg) {
              worstAvg = stats.avg;
              worstAgent = agentId;
            }
          } else {
            // For metrics where lower is better
            if (stats.avg < worstAvg) {
              worstAvg = stats.avg;
              bestAgent = agentId;
            }
            
            if (stats.avg > bestAvg) {
              bestAvg = stats.avg;
              worstAgent = agentId;
            }
          }
        }
        
        // Calculate average difference
        const avgDifference = bestAvg - worstAvg;
        
        results.summary = {
          bestAgent,
          worstAgent,
          avgDifference
        };
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to compare agent performance: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get metric information
   * @param {string} metricId - Metric ID
   * @returns {Object} - Metric information
   */
  getMetricInfo(metricId) {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      throw new Error(`Metric ${metricId} not found`);
    }
    
    return {
      id: metric.id,
      name: metric.name,
      description: metric.description,
      type: metric.type,
      unit: metric.unit,
      min: metric.min,
      max: metric.max,
      registeredAt: metric.registeredAt
    };
  }

  /**
   * Get benchmark information
   * @param {string} benchmarkId - Benchmark ID
   * @returns {Object} - Benchmark information
   */
  getBenchmarkInfo(benchmarkId) {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkId} not found`);
    }
    
    return {
      id: benchmark.id,
      name: benchmark.name,
      description: benchmark.description,
      metrics: benchmark.metrics,
      tasks: benchmark.tasks,
      registeredAt: benchmark.registeredAt
    };
  }

  /**
   * List all metrics
   * @returns {Array<Object>} - List of metrics
   */
  listMetrics() {
    const metrics = [];
    
    for (const [metricId, metric] of this.metrics.entries()) {
      metrics.push({
        id: metricId,
        name: metric.name,
        description: metric.description,
        type: metric.type,
        unit: metric.unit
      });
    }
    
    return metrics;
  }

  /**
   * List all benchmarks
   * @returns {Array<Object>} - List of benchmarks
   */
  listBenchmarks() {
    const benchmarks = [];
    
    for (const [benchmarkId, benchmark] of this.benchmarks.entries()) {
      benchmarks.push({
        id: benchmarkId,
        name: benchmark.name,
        description: benchmark.description,
        metrics: benchmark.metrics.length,
        tasks: benchmark.tasks.length
      });
    }
    
    return benchmarks;
  }

  /**
   * Initialize default metrics
   * @private
   * @returns {Promise<void>}
   */
  async _initializeDefaultMetrics() {
    try {
      // Register accuracy metric
      await this.registerMetric('accuracy', {
        name: 'Accuracy',
        description: 'Percentage of correct responses',
        type: 'numeric',
        unit: '%',
        min: 0,
        max: 100,
        calculate: value => Math.min(100, Math.max(0, value * 100))
      });
      
      // Register response time metric
      await this.registerMetric('responseTime', {
        name: 'Response Time',
        description: 'Time taken to respond to a request',
        type: 'numeric',
        unit: 'ms',
        min: 0,
        calculate: value => Math.max(0, value)
      });
      
      // Register memory usage metric
      await this.registerMetric('memoryUsage', {
        name: 'Memory Usage',
        description: 'Memory used by the agent',
        type: 'numeric',
        unit: 'MB',
        min: 0,
        calculate: value => Math.max(0, value / (1024 * 1024))
      });
      
      // Register error rate metric
      await this.registerMetric('errorRate', {
        name: 'Error Rate',
        description: 'Percentage of requests that result in errors',
        type: 'numeric',
        unit: '%',
        min: 0,
        max: 100,
        calculate: value => Math.min(100, Math.max(0, value * 100))
      });
    } catch (error) {
      this.logger.error(`Failed to initialize default metrics: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Initialize default benchmarks
   * @private
   * @returns {Promise<void>}
   */
  async _initializeDefaultBenchmarks() {
    try {
      // Register basic benchmark
      await this.registerBenchmark('basic', {
        name: 'Basic Benchmark',
        description: 'Basic benchmark for agent performance',
        metrics: ['accuracy', 'responseTime'],
        tasks: [
          {
            id: 'task1',
            name: 'Simple Addition',
            description: 'Add two numbers',
            input: { a: 2, b: 3 },
            expectedOutput: 5
          },
          {
            id: 'task2',
            name: 'String Reversal',
            description: 'Reverse a string',
            input: { text: 'hello' },
            expectedOutput: 'olleh'
          }
        ],
        execute: async (agentId, options) => {
          // In a real implementation, this would execute the benchmark tasks
          // For now, we'll return placeholder results
          
          return {
            tasks: [
              {
                id: 'task1',
                success: true,
                output: 5,
                responseTime: 50,
                metrics: {
                  accuracy: 1,
                  responseTime: 50
                }
              },
              {
                id: 'task2',
                success: true,
                output: 'olleh',
                responseTime: 75,
                metrics: {
                  accuracy: 1,
                  responseTime: 75
                }
              }
            ],
            summary: {
              tasksCompleted: 2,
              tasksSucceeded: 2,
              tasksFailed: 0,
              averageResponseTime: 62.5,
              averageAccuracy: 1
            }
          };
        }
      });
      
      // Register advanced benchmark
      await this.registerBenchmark('advanced', {
        name: 'Advanced Benchmark',
        description: 'Advanced benchmark for agent performance',
        metrics: ['accuracy', 'responseTime', 'memoryUsage'],
        tasks: [
          {
            id: 'task1',
            name: 'Complex Calculation',
            description: 'Perform a complex calculation',
            input: { expression: '(2 + 3) * 4 / 2' },
            expectedOutput: 10
          },
          {
            id: 'task2',
            name: 'Text Analysis',
            description: 'Count words in a text',
            input: { text: 'The quick brown fox jumps over the lazy dog' },
            expectedOutput: 9
          }
        ],
        execute: async (agentId, options) => {
          // In a real implementation, this would execute the benchmark tasks
          // For now, we'll return placeholder results
          
          return {
            tasks: [
              {
                id: 'task1',
                success: true,
                output: 10,
                responseTime: 100,
                metrics: {
                  accuracy: 1,
                  responseTime: 100,
                  memoryUsage: 5 * 1024 * 1024
                }
              },
              {
                id: 'task2',
                success: true,
                output: 9,
                responseTime: 150,
                metrics: {
                  accuracy: 1,
                  responseTime: 150,
                  memoryUsage: 8 * 1024 * 1024
                }
              }
            ],
            summary: {
              tasksCompleted: 2,
              tasksSucceeded: 2,
              tasksFailed: 0,
              averageResponseTime: 125,
              averageAccuracy: 1,
              averageMemoryUsage: 6.5 * 1024 * 1024
            }
          };
        }
      });
    } catch (error) {
      this.logger.error(`Failed to initialize default benchmarks: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = PerformanceTracking;
