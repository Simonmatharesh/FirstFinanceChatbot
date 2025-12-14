// sessionMemory.js
export const sessionMemory = {
  data: {},
  conversationState: {
    lastBotIntent: null,
    expectingResponse: null,
    currentTopic: null,          // Track current topic (e.g., "vehicle_finance")
    lastProductMentioned: null,  // Track last product discussed
    conversationHistory: [],     // Track last 3-5 messages for context
  },

  set(key, val) { 
    this.data[key] = val; 
  },
  
  get(key) { 
    return this.data[key]; 
  },
  
  getAll() { 
    return this.data; 
  },
  
  clear() { 
    this.data = {}; 
    this.conversationState = { 
      lastBotIntent: null, 
      expectingResponse: null,
      currentTopic: null,
      lastProductMentioned: null,
      conversationHistory: []
    };
  },
  
  has(key) { 
    return key in this.data; 
  },
  
  // Conversation flow management
  setExpecting(type) { 
    this.conversationState.expectingResponse = type; 
  },
  
  getExpecting() { 
    return this.conversationState.expectingResponse; 
  },
  
  clearExpecting() { 
    this.conversationState.expectingResponse = null; 
  },

  // Topic tracking
  setCurrentTopic(topic) {
    this.conversationState.currentTopic = topic;
  },

  getCurrentTopic() {
    return this.conversationState.currentTopic;
  },

  clearCurrentTopic() {
    this.conversationState.currentTopic = null;
  },

  // Product tracking
  setLastProduct(product) {
    this.conversationState.lastProductMentioned = product;
  },

  getLastProduct() {
    return this.conversationState.lastProductMentioned;
  },

  // Conversation history (keep last 5 exchanges)
  addToHistory(userMsg, botResponse, intent = null) {
    this.conversationState.conversationHistory.push({
      user: userMsg,
      bot: botResponse,
      intent,
      timestamp: Date.now()
    });
    
    // Keep only last 5 exchanges
    if (this.conversationState.conversationHistory.length > 5) {
      this.conversationState.conversationHistory.shift();
    }
  },

  getHistory() {
    return this.conversationState.conversationHistory;
  },

  // Get context summary for better matching
  getContextSummary() {
    return {
      topic: this.getCurrentTopic(),
      product: this.getLastProduct(),
      nationality: this.get('nationality'),
      recentMessages: this.conversationState.conversationHistory.slice(-2)
    };
  }
};