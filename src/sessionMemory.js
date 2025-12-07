// sessionMemory.js
export const sessionMemory = {
  data: {},                       // arbitrary key-value bag

  set(key, val) { this.data[key] = val; },
  get(key)        { return this.data[key]; },
  getAll()        { return this.data; },
  clear()         { this.data = {}; },
  has(key)        { return key in this.data; },
};