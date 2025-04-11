/**
 * Mock EventEmitter for testing
 */
class MockEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)) {
        listener(...args);
      }
    }
  }

  removeAllListeners(event) {
    if (this.listeners.has(event)) {
      this.listeners.delete(event);
    }
  }
}

module.exports = MockEventEmitter;
