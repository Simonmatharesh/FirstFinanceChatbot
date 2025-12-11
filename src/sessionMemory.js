// sessionMemory.js
export const sessionMemory = {
  data: {},
  conversationState: {
    lastBotIntent: null,        // What was the bot asking for?
    expectingResponse: null,    // What type of response are we expecting?
  },

  set(key, val) { this.data[key] = val; },
  get(key) { return this.data[key]; },
  getAll() { return this.data; },
  clear() { 
    this.data = {}; 
    this.conversationState = { lastBotIntent: null, expectingResponse: null };
  },
  has(key) { return key in this.data; },
  
  // New methods for conversation tracking
  setExpecting(type) { this.conversationState.expectingResponse = type; },
  getExpecting() { return this.conversationState.expectingResponse; },
  clearExpecting() { this.conversationState.expectingResponse = null; },
};