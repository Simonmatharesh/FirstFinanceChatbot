// server/sessionMemory.js
// Simple in-memory sessions - auto-cleanup after 30 min of inactivity

class SessionMemory {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    // Auto-cleanup every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [userId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > this.SESSION_TIMEOUT) {
          this.sessions.delete(userId);
        }
      }
    }, 5 * 60 * 1000);
  }

  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        data: {},
        conversationState: {
          currentTopic: null,
          lastProductMentioned: null,
          conversationHistory: [],
        },
        lastActivity: Date.now(),
      });
    }
    
    const session = this.sessions.get(userId);
    session.lastActivity = Date.now();
    return session;
  }

  set(userId, key, value) {
    const session = this.getSession(userId);
    session.data[key] = value;
  }

  get(userId, key) {
    const session = this.getSession(userId);
    return session.data[key];
  }

  has(userId, key) {
    const session = this.getSession(userId);
    return key in session.data;
  }

  setCurrentTopic(userId, topic) {
    const session = this.getSession(userId);
    session.conversationState.currentTopic = topic;
  }

  getCurrentTopic(userId) {
    const session = this.getSession(userId);
    return session.conversationState.currentTopic;
  }

  setLastProduct(userId, product) {
    const session = this.getSession(userId);
    session.conversationState.lastProductMentioned = product;
  }

  getLastProduct(userId) {
    const session = this.getSession(userId);
    return session.conversationState.lastProductMentioned;
  }

  addToHistory(userId, userMsg, botResponse, intent = null) {
    const session = this.getSession(userId);
    session.conversationState.conversationHistory.push({
      user: userMsg,
      bot: botResponse,
      intent,
      timestamp: Date.now(),
    });

    if (session.conversationState.conversationHistory.length > 5) {
      session.conversationState.conversationHistory.shift();
    }
  }

    getContextSummary(userId) {
    const session = this.getSession(userId);
    return {
      topic: session.conversationState.currentTopic,
      product: session.conversationState.lastProductMentioned,
      nationality: session.data.nationality,
      specificCorporateProduct: session.data.specificCorporateProduct,  // NEW
      recentMessages: session.conversationState.conversationHistory.slice(-2),
    };
  }
}

export const sessionMemory = new SessionMemory();