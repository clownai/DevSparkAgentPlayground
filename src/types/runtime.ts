/**
 * Runtime module type definitions
 * Contains interfaces for the runtime environment components
 */

export interface ContainerConfig {
  id: string;
  name: string;
  image: string;
  memory: number;
  cpu: number;
  timeout: number;
  networkEnabled: boolean;
  volumes: string[];
  env: Record<string, string>;
  securityOptions: SecurityOptions;
}

export interface SecurityOptions {
  privileged: boolean;
  capabilities: string[];
  readOnlyRootFilesystem: boolean;
  allowedHosts: string[];
  blockedPorts: number[];
  seccompProfile?: string;
}

export interface ContainerStatus {
  id: string;
  state: 'created' | 'running' | 'paused' | 'stopped' | 'failed';
  startTime?: Date;
  endTime?: Date;
  exitCode?: number;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  restartCount: number;
  cpuUsage: number;
  memoryUsage: number;
  networkStats: {
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  resourceUsage: {
    cpuTime: number;
    maxMemory: number;
    averageCpu: number;
  };
}

export interface ResourceLimits {
  maxCpu: number;
  maxMemory: number;
  maxDisk: number;
  maxNetworkBandwidth: number;
  maxExecutionTime: number;
}

export interface ResourceUsage {
  containerId: string;
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: {
    rx: number;
    tx: number;
  };
}

export interface SecurityViolation {
  containerId: string;
  timestamp: Date;
  type: 'network' | 'filesystem' | 'process' | 'resource' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  action: 'logged' | 'blocked' | 'terminated';
}

export interface ExecutionOptions {
  timeout?: number;
  env?: Record<string, string>;
  workingDir?: string;
  stdin?: string;
  captureOutput?: boolean;
  captureError?: boolean;
  resourceLimits?: Partial<ResourceLimits>;
}

export interface ExecutionEngine {
  execute(command: string, options?: ExecutionOptions): Promise<ExecutionResult>;
  executeScript(scriptPath: string, args: string[], options?: ExecutionOptions): Promise<ExecutionResult>;
  startContainer(config: ContainerConfig): Promise<string>;
  stopContainer(containerId: string, force?: boolean): Promise<boolean>;
  getContainerStatus(containerId: string): Promise<ContainerStatus>;
  listContainers(): Promise<ContainerStatus[]>;
}

export interface ResourceMonitor {
  startMonitoring(containerId: string, interval?: number): void;
  stopMonitoring(containerId: string): void;
  getResourceUsage(containerId: string): ResourceUsage;
  getResourceHistory(containerId: string, startTime?: Date, endTime?: Date): ResourceUsage[];
  setAlertThresholds(containerId: string, thresholds: Partial<ResourceLimits>): void;
  onAlert(callback: (containerId: string, resourceType: keyof ResourceLimits, value: number) => void): void;
}

export interface SecurityManager {
  applySecurityPolicy(containerId: string, policy: SecurityOptions): void;
  checkSecurityViolations(containerId: string): SecurityViolation[];
  getSecurityLogs(containerId: string, startTime?: Date, endTime?: Date): SecurityViolation[];
  blockNetworkAccess(containerId: string, host: string, port?: number): void;
  allowNetworkAccess(containerId: string, host: string, port?: number): void;
  onViolation(callback: (violation: SecurityViolation) => void): void;
}
