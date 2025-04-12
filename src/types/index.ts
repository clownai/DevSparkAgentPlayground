/**
 * Index type definitions for the DevSparkAgentPlayground
 * This file serves as a central export point for all type definitions
 */

// Re-export all types from specific modules
export * from './core';
export * from './reinforcement';

// Global application types
export interface AppConfig {
  environment: string;
  port: number;
  logLevel: string;
  dataDir: string;
  maxAgents: number;
  maxEnvironments: number;
  enableSecurity: boolean;
  enableMonitoring: boolean;
  enablePersistence: boolean;
}

export interface SystemResources {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
}

export interface PerformanceMetrics {
  startTime: Date;
  uptime: number;
  requestsProcessed: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  component?: string;
  trace?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user' | 'guest';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

// Event system types
export type EventType = 
  | 'agent:created'
  | 'agent:updated'
  | 'agent:deleted'
  | 'environment:created'
  | 'environment:updated'
  | 'environment:deleted'
  | 'training:started'
  | 'training:progress'
  | 'training:completed'
  | 'training:error'
  | 'system:error'
  | 'system:warning'
  | 'system:info';

export interface Event {
  id: string;
  type: EventType;
  timestamp: Date;
  data: any;
  source: string;
}

export interface EventListener {
  id: string;
  eventTypes: EventType[];
  callback: (event: Event) => void;
}

export interface EventEmitter {
  on(eventType: EventType, callback: (event: Event) => void): string;
  off(listenerId: string): boolean;
  emit(eventType: EventType, data: any): void;
  getListeners(): EventListener[];
}
