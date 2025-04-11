// Core configuration for the DevSparkAgent Playground
module.exports = {
  // Runtime environment configuration
  runtime: {
    // Container configuration
    container: {
      baseImage: 'ubuntu:22.04',
      pythonVersion: '3.10',
      nodeVersion: '20.x',
      resourceLimits: {
        cpu: 1,
        memory: '2Gi',
        disk: '10Gi'
      },
      networkPolicy: 'restricted'
    },
    
    // Execution engine settings
    execution: {
      supportedLanguages: ['python', 'javascript', 'typescript'],
      timeoutDefault: 30000, // ms
      maxExecutionTime: 300000, // ms
      statePersistence: true,
      eventLoopInterval: 100 // ms
    },
    
    // Security settings
    security: {
      isolationLevel: 'high',
      capabilities: [
        'filesystem:read',
        'filesystem:write',
        'network:internal',
        'process:spawn'
      ],
      monitoringInterval: 1000, // ms
      seccompProfile: 'default'
    }
  },
  
  // Agent interaction framework configuration
  interaction: {
    // Communication protocol settings
    communication: {
      messageFormat: 'json',
      defaultChannels: ['system', 'public', 'private'],
      maxMessageSize: 1048576, // bytes
      rateLimiting: {
        messagesPerSecond: 10,
        burstSize: 50
      }
    },
    
    // Environment interface settings
    environment: {
      updateFrequency: 10, // Hz
      sensorResolution: 'medium',
      actionLatency: 50, // ms
      eventBufferSize: 1000
    },
    
    // Collaboration settings
    collaboration: {
      maxTeamSize: 10,
      sharedMemoryLimit: '100Mi',
      consensusAlgorithm: 'majority',
      taskDistributionStrategy: 'capability-based'
    }
  },
  
  // Evolution and learning configuration
  evolution: {
    // Genetic algorithm settings
    genetic: {
      populationSize: 100,
      generationLimit: 1000,
      mutationRate: 0.01,
      crossoverRate: 0.7,
      selectionStrategy: 'tournament',
      tournamentSize: 5,
      elitismCount: 2
    },
    
    // Reinforcement learning settings
    reinforcement: {
      discountFactor: 0.99,
      learningRate: 0.001,
      explorationRate: 0.1,
      explorationDecay: 0.995,
      replayBufferSize: 10000,
      batchSize: 64,
      targetUpdateFrequency: 1000
    },
    
    // Neural architecture search settings
    architectureSearch: {
      searchSpace: 'small',
      searchAlgorithm: 'random',
      maxTrials: 100,
      evaluationMetric: 'accuracy',
      transferLearningEnabled: true
    },
    
    // Knowledge transfer settings
    knowledgeTransfer: {
      distillationTemperature: 2.0,
      curriculumLevels: 5,
      imitationSamples: 1000,
      multitaskSharing: true
    }
  },
  
  // Evaluation and benchmarking configuration
  evaluation: {
    // Performance metrics settings
    metrics: {
      taskSpecific: {
        accuracy: true,
        precision: true,
        recall: true,
        f1Score: true
      },
      efficiency: {
        executionTime: true,
        memoryUsage: true,
        cpuUsage: true,
        networkUsage: true
      },
      learning: {
        convergenceRate: true,
        generalizationError: true,
        overfittingScore: true
      },
      collaboration: {
        teamEfficiency: true,
        communicationOverhead: true,
        taskCompletionRate: true
      }
    },
    
    // Challenge scenario settings
    challenges: {
      difficultyLevels: 5,
      domains: [
        'reasoning',
        'perception',
        'planning',
        'learning',
        'communication'
      ],
      scenarioGeneration: 'procedural',
      adversarialEnabled: true
    },
    
    // Comparative analysis settings
    analysis: {
      baselineAgents: ['random', 'heuristic', 'expert'],
      significanceLevel: 0.05,
      visualizationEnabled: true,
      historyRetention: 90 // days
    },
    
    // Leaderboard settings
    leaderboards: {
      updateFrequency: 3600, // seconds
      rankingCategories: [
        'overall',
        'domain-specific',
        'efficiency',
        'innovation'
      ],
      publiclyVisible: true,
      minimumEvaluations: 10
    }
  },
  
  // User interface configuration
  ui: {
    // Development dashboard settings
    dashboard: {
      theme: 'dark',
      layout: 'flexible',
      autoSave: true,
      codeHighlighting: true,
      debuggingTools: ['breakpoints', 'watches', 'console', 'inspection']
    },
    
    // Visualization settings
    visualization: {
      renderingEngine: 'webgl',
      maxFrameRate: 60,
      detailLevel: 'high',
      dataPointLimit: 10000
    },
    
    // Experiment management settings
    experiments: {
      maxParallelExperiments: 10,
      resultStorage: 'database',
      autoExport: true,
      reproducibilityLevel: 'high'
    },
    
    // Tournament settings
    tournaments: {
      matchmakingAlgorithm: 'elo',
      defaultRounds: 3,
      eliminationStyle: 'double',
      publicResults: true
    }
  },
  
  // Marketplace configuration
  marketplace: {
    // Agent repository settings
    repository: {
      versioningScheme: 'semantic',
      requiredMetadata: [
        'name',
        'version',
        'description',
        'author',
        'license'
      ],
      documentationFormat: 'markdown',
      licensingOptions: ['MIT', 'Apache-2.0', 'GPL-3.0', 'proprietary']
    },
    
    // Component sharing settings
    components: {
      dependencyTracking: true,
      compatibilityChecking: true,
      usageAnalytics: true,
      recommendationEngine: true
    },
    
    // Collaborative development settings
    collaboration: {
      accessControlModel: 'rbac',
      roles: ['owner', 'developer', 'reviewer', 'viewer'],
      activityFeedEnabled: true,
      reviewRequirement: 'optional'
    },
    
    // Knowledge base settings
    knowledgeBase: {
      documentationFormats: ['markdown', 'jupyter'],
      searchEnabled: true,
      contributionGuidelines: true,
      exampleCategories: ['beginner', 'intermediate', 'advanced']
    }
  },
  
  // System integration configuration
  integration: {
    // DevSpark IDE integration settings
    ide: {
      pluginEnabled: true,
      templateCategories: ['basic', 'advanced', 'specialized'],
      debuggingProtocol: 'dap',
      deploymentOneClick: true
    },
    
    // External API settings
    api: {
      restEnabled: true,
      websocketEnabled: true,
      authMethods: ['api-key', 'oauth2', 'jwt'],
      rateLimits: {
        requestsPerMinute: 60,
        burstSize: 100
      }
    },
    
    // Data pipeline settings
    dataPipeline: {
      collectionInterval: 60, // seconds
      storageEngine: 'timeseries',
      processingFramework: 'stream',
      retentionPolicy: '90d'
    },
    
    // Extension system settings
    extensions: {
      pluginArchitecture: 'modular',
      hookPoints: [
        'runtime:before',
        'runtime:after',
        'evaluation:before',
        'evaluation:after',
        'ui:render'
      ],
      sandboxed: true,
      marketplaceEnabled: true
    }
  },
  
  // Deployment and scaling configuration
  deployment: {
    // Containerization settings
    containerization: {
      orchestration: 'kubernetes',
      registry: 'docker-hub',
      cicdPipeline: 'github-actions',
      deploymentStrategy: 'rolling'
    },
    
    // Resource management settings
    resources: {
      autoscalingEnabled: true,
      loadBalancingAlgorithm: 'round-robin',
      resourceQuotaEnforcement: true,
      costOptimizationEnabled: true
    },
    
    // Monitoring settings
    monitoring: {
      metricsEngine: 'prometheus',
      loggingEngine: 'elasticsearch',
      alertingEngine: 'alertmanager',
      dashboardEngine: 'grafana'
    },
    
    // Disaster recovery settings
    recovery: {
      backupSchedule: '0 0 * * *', // daily at midnight
      backupRetention: 30, // days
      failoverEnabled: true,
      rpoTarget: 3600, // seconds
      rtoTarget: 300 // seconds
    }
  }
};
