class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event Name of the event.
   * @param {Function} callback Callback function, can be async.
   * @returns {Function} Unsubscribe function.
   */
  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish an event.
   * @param {string} event Name of the event.
   * @param {*} data Data payload to pass to subscribers.
   */
  async publish(event, data) {
    if (!this.listeners[event]) return;
    
    // Run all listeners concurrently, catching errors so one listener doesn't block others
    const promises = this.listeners[event].map(async (callback) => {
      try {
        await callback(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event "${event}":`, err);
      }
    });
    
    await Promise.all(promises);
  }
}

// Global singleton instance
export const eventBus = new EventBus();
