/**
 * index.js
 * Main entry point for the environments module
 * 
 * This file exports all components of the environments module
 * for easy access and integration with the rest of the system.
 */

const BaseEnvironment = require('./BaseEnvironment');
const PhysicsEnvironment = require('./PhysicsEnvironment');
const NaturalLanguageEnvironment = require('./NaturalLanguageEnvironment');
const MultiModalEnvironment = require('./MultiModalEnvironment');
const ProceduralEnvironment = require('./ProceduralEnvironment');

/**
 * Create a new environment
 * @param {String} type - Environment type ('physics', 'natural_language', 'multi_modal', 'procedural')
 * @param {Object} config - Environment configuration
 * @returns {BaseEnvironment} - Created environment
 */
function createEnvironment(type, config = {}) {
  switch (type.toLowerCase()) {
    case 'physics':
      return new PhysicsEnvironment(config);
    case 'natural_language':
      return new NaturalLanguageEnvironment(config);
    case 'multi_modal':
      return new MultiModalEnvironment(config);
    case 'procedural':
      return new ProceduralEnvironment(config);
    default:
      throw new Error(`Unknown environment type: ${type}`);
  }
}

// Export all components
module.exports = {
  // Base classes
  BaseEnvironment,
  
  // Environment types
  PhysicsEnvironment,
  NaturalLanguageEnvironment,
  MultiModalEnvironment,
  ProceduralEnvironment,
  
  // Factory function
  createEnvironment
};
