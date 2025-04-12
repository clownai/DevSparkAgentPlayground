/**
 * Utility functions for the multi-agent system
 */

export class AgentFactory {
  /**
   * Create an agent
   * @param config Agent configuration
   * @returns Created agent
   */
  public createAgent(config: any): any {
    // This is a stub implementation
    return null;
  }
}

/**
 * Deep merge two objects
 * @param target Target object
 * @param source Source object
 * @returns Merged object
 */
export function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is an object
 * @param item Value to check
 * @returns True if value is an object
 */
function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
