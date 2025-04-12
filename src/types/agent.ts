/**
 * Agent module type definitions
 * Contains interfaces for agent components and behaviors
 */

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  parameters: Record<string, any>;
  algorithm?: string;
  algorithmConfig?: Record<string, any>;
  modelPath?: string;
  features: string[];
}

export interface AgentCapabilities {
  supportedEnvironments: string[];
  supportedAlgorithms: string[];
  canLearn: boolean;
  canAdapt: boolean;
  canExplain: boolean;
  canCollaborate: boolean;
  maxObservationDimension?: number;
  maxActionDimension?: number;
  supportsContinuousActions: boolean;
  supportsDiscreteActions: boolean;
  supportsDictObservations: boolean;
  requiresPreprocessing: boolean;
}

export interface AgentState {
  id: string;
  status: 'initializing' | 'ready' | 'learning' | 'acting' | 'paused' | 'error';
  currentEnvironment?: string;
  episodeCount: number;
  totalSteps: number;
  totalReward: number;
  averageReward: number;
  lastAction?: any;
  lastObservation?: any;
  lastReward?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface AgentPerformance {
  episodeRewards: number[];
  episodeLengths: number[];
  cumulativeReward: number;
  successRate: number;
  learningCurve: Array<{
    episode: number;
    reward: number;
    steps: number;
    success: boolean;
  }>;
  evaluationResults: Array<{
    timestamp: Date;
    environmentId: string;
    episodeCount: number;
    averageReward: number;
    successRate: number;
  }>;
}

export interface AgentMemory {
  addExperience(experience: any): void;
  getExperiences(count?: number): any[];
  getExperienceBatch(batchSize: number): any[];
  clear(): void;
  save(path: string): Promise<boolean>;
  load(path: string): Promise<boolean>;
  getSize(): number;
  getCapacity(): number;
}

export interface AgentModel {
  initialize(inputShape: number[], outputShape: number[]): Promise<boolean>;
  predict(input: number[]): Promise<number[]>;
  update(input: number[], target: number[]): Promise<number>;
  save(path: string): Promise<boolean>;
  load(path: string): Promise<boolean>;
  getParameters(): Record<string, any>;
  setParameters(parameters: Record<string, any>): void;
}

export interface AgentLearningConfig {
  learningRate: number;
  batchSize: number;
  updateFrequency: number;
  maxEpisodes: number;
  targetReward?: number;
  explorationStrategy: 'epsilon-greedy' | 'boltzmann' | 'ucb' | 'thompson' | 'custom';
  explorationParams: Record<string, any>;
  discountFactor: number;
  prioritizedExperienceReplay: boolean;
  gradientClipping?: number;
}

export interface AgentAction {
  type: string;
  value: number | number[] | Record<string, any>;
  confidence?: number;
  reasoning?: string;
  alternatives?: Array<{
    value: number | number[] | Record<string, any>;
    confidence: number;
  }>;
}

export interface Agent {
  // Core agent methods
  initialize(config: AgentConfig): Promise<boolean>;
  act(observation: any, reward?: number, done?: boolean): Promise<AgentAction>;
  learn(experiences?: any[]): Promise<number>;
  reset(): void;
  
  // Agent information
  getId(): string;
  getName(): string;
  getType(): string;
  getCapabilities(): AgentCapabilities;
  getState(): AgentState;
  getPerformance(): AgentPerformance;
  
  // Agent configuration
  getConfig(): AgentConfig;
  updateConfig(config: Partial<AgentConfig>): boolean;
  
  // Agent persistence
  save(path: string): Promise<boolean>;
  load(path: string): Promise<boolean>;
  
  // Agent explanation
  explainAction(action: AgentAction): string;
  explainStrategy(): string;
  getImportantFeatures(observation: any): Record<string, number>;
}

export interface AgentFactory {
  createAgent(config: AgentConfig): Promise<Agent>;
  listAvailableAgents(): string[];
  getAgentInfo(type: string): {
    name: string;
    description: string;
    version: string;
    capabilities: AgentCapabilities;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      default?: any;
      required: boolean;
      range?: [number, number];
      options?: string[];
    }>;
  };
}

export interface MultiAgent {
  addAgent(agent: Agent, role?: string): void;
  removeAgent(agentId: string): boolean;
  getAgents(): Record<string, Agent>;
  act(observations: Record<string, any>): Promise<Record<string, AgentAction>>;
  learn(): Promise<Record<string, number>>;
  coordinate(strategy: 'cooperative' | 'competitive' | 'mixed'): void;
}
