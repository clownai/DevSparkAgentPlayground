/**
 * Leaderboard.js
 * Implementation of leaderboards for agent evaluation
 */

class Leaderboard {
  /**
   * Create a new Leaderboard instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxEntries: 100,
      categories: ['overall', 'learning', 'problem-solving', 'navigation'],
      sortOrder: 'descending',
      persistenceEnabled: false,
      persistencePath: './leaderboards',
      ...options
    };
    
    this.boards = new Map();
    this.logger = options.logger || console;
    
    // Initialize boards
    this.initializeBoards();
  }
  
  /**
   * Initialize leaderboards
   */
  initializeBoards() {
    // Create a board for each category
    for (const category of this.options.categories) {
      this.boards.set(category, []);
    }
    
    // Load persisted data if enabled
    if (this.options.persistenceEnabled) {
      this.loadBoards();
    }
  }
  
  /**
   * Add an entry to a leaderboard
   * @param {string} category - Leaderboard category
   * @param {object} entry - Leaderboard entry
   * @returns {object} Added entry with position
   */
  addEntry(category, entry) {
    // Validate category
    if (!this.boards.has(category)) {
      if (this.options.autoCreateCategories) {
        this.boards.set(category, []);
      } else {
        throw new Error(`Unknown leaderboard category: ${category}`);
      }
    }
    
    // Validate entry
    if (!entry.agentId) {
      throw new Error('Entry must have an agentId');
    }
    
    if (entry.score === undefined) {
      throw new Error('Entry must have a score');
    }
    
    // Create full entry
    const fullEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
      metadata: entry.metadata || {}
    };
    
    // Add to board
    const board = this.boards.get(category);
    board.push(fullEntry);
    
    // Sort board
    this.sortBoard(category);
    
    // Trim board if needed
    if (board.length > this.options.maxEntries) {
      board.pop(); // Remove last entry
    }
    
    // Get position of new entry
    const position = board.findIndex(e => e === fullEntry) + 1;
    
    // Persist if enabled
    if (this.options.persistenceEnabled) {
      this.saveBoards();
    }
    
    return {
      ...fullEntry,
      position
    };
  }
  
  /**
   * Sort a leaderboard
   * @param {string} category - Leaderboard category
   */
  sortBoard(category) {
    const board = this.boards.get(category);
    
    if (!board) {
      return;
    }
    
    // Sort by score
    if (this.options.sortOrder === 'ascending') {
      board.sort((a, b) => a.score - b.score);
    } else {
      board.sort((a, b) => b.score - a.score);
    }
  }
  
  /**
   * Get leaderboard entries
   * @param {string} category - Leaderboard category
   * @param {object} options - Query options
   * @returns {Array<object>} Leaderboard entries
   */
  getEntries(category, options = {}) {
    // Validate category
    if (!this.boards.has(category)) {
      return [];
    }
    
    const board = this.boards.get(category);
    let entries = [...board];
    
    // Apply filters
    if (options.agentId) {
      entries = entries.filter(entry => entry.agentId === options.agentId);
    }
    
    if (options.minScore !== undefined) {
      entries = entries.filter(entry => entry.score >= options.minScore);
    }
    
    if (options.maxScore !== undefined) {
      entries = entries.filter(entry => entry.score <= options.maxScore);
    }
    
    if (options.startTime) {
      entries = entries.filter(entry => entry.timestamp >= options.startTime);
    }
    
    if (options.endTime) {
      entries = entries.filter(entry => entry.timestamp <= options.endTime);
    }
    
    // Apply limit
    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }
    
    // Add position
    return entries.map((entry, index) => ({
      ...entry,
      position: index + 1
    }));
  }
  
  /**
   * Get top entries from a leaderboard
   * @param {string} category - Leaderboard category
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array<object>} Top leaderboard entries
   */
  getTopEntries(category, limit = 10) {
    return this.getEntries(category, { limit });
  }
  
  /**
   * Get an agent's position on a leaderboard
   * @param {string} category - Leaderboard category
   * @param {string} agentId - Agent ID
   * @returns {object|null} Agent's position and entry
   */
  getAgentPosition(category, agentId) {
    // Validate category
    if (!this.boards.has(category)) {
      return null;
    }
    
    const board = this.boards.get(category);
    
    // Find agent's entry
    const index = board.findIndex(entry => entry.agentId === agentId);
    
    if (index === -1) {
      return null;
    }
    
    return {
      ...board[index],
      position: index + 1
    };
  }
  
  /**
   * Get an agent's best entry on a leaderboard
   * @param {string} category - Leaderboard category
   * @param {string} agentId - Agent ID
   * @returns {object|null} Agent's best entry
   */
  getAgentBestEntry(category, agentId) {
    // Get all entries for this agent
    const entries = this.getEntries(category, { agentId });
    
    if (entries.length === 0) {
      return null;
    }
    
    // Return first entry (already sorted by score)
    return entries[0];
  }
  
  /**
   * Get an agent's entries across all leaderboards
   * @param {string} agentId - Agent ID
   * @returns {object} Agent's entries by category
   */
  getAgentEntries(agentId) {
    const result = {};
    
    for (const category of this.boards.keys()) {
      result[category] = this.getEntries(category, { agentId });
    }
    
    return result;
  }
  
  /**
   * Get an agent's positions across all leaderboards
   * @param {string} agentId - Agent ID
   * @returns {object} Agent's positions by category
   */
  getAgentPositions(agentId) {
    const result = {};
    
    for (const category of this.boards.keys()) {
      result[category] = this.getAgentPosition(category, agentId);
    }
    
    return result;
  }
  
  /**
   * Remove an entry from a leaderboard
   * @param {string} category - Leaderboard category
   * @param {string} agentId - Agent ID
   * @param {number} timestamp - Entry timestamp
   * @returns {boolean} Removal success
   */
  removeEntry(category, agentId, timestamp) {
    // Validate category
    if (!this.boards.has(category)) {
      return false;
    }
    
    const board = this.boards.get(category);
    
    // Find entry
    const index = board.findIndex(entry => 
      entry.agentId === agentId && entry.timestamp === timestamp
    );
    
    if (index === -1) {
      return false;
    }
    
    // Remove entry
    board.splice(index, 1);
    
    // Persist if enabled
    if (this.options.persistenceEnabled) {
      this.saveBoards();
    }
    
    return true;
  }
  
  /**
   * Remove all entries for an agent
   * @param {string} agentId - Agent ID
   * @returns {number} Number of entries removed
   */
  removeAgentEntries(agentId) {
    let count = 0;
    
    for (const board of this.boards.values()) {
      const initialLength = board.length;
      const newBoard = board.filter(entry => entry.agentId !== agentId);
      board.length = 0;
      board.push(...newBoard);
      count += initialLength - board.length;
    }
    
    // Persist if enabled
    if (count > 0 && this.options.persistenceEnabled) {
      this.saveBoards();
    }
    
    return count;
  }
  
  /**
   * Clear a leaderboard
   * @param {string} category - Leaderboard category
   * @returns {number} Number of entries removed
   */
  clearLeaderboard(category) {
    // Validate category
    if (!this.boards.has(category)) {
      return 0;
    }
    
    const board = this.boards.get(category);
    const count = board.length;
    board.length = 0;
    
    // Persist if enabled
    if (count > 0 && this.options.persistenceEnabled) {
      this.saveBoards();
    }
    
    return count;
  }
  
  /**
   * Clear all leaderboards
   * @returns {number} Number of entries removed
   */
  clearAllLeaderboards() {
    let count = 0;
    
    for (const board of this.boards.values()) {
      count += board.length;
      board.length = 0;
    }
    
    // Persist if enabled
    if (count > 0 && this.options.persistenceEnabled) {
      this.saveBoards();
    }
    
    return count;
  }
  
  /**
   * Get leaderboard statistics
   * @returns {object} Leaderboard statistics
   */
  getStatistics() {
    const stats = {
      totalEntries: 0,
      categoryCounts: {},
      uniqueAgents: new Set(),
      topAgents: {}
    };
    
    for (const [category, board] of this.boards.entries()) {
      stats.totalEntries += board.length;
      stats.categoryCounts[category] = board.length;
      
      // Count unique agents
      for (const entry of board) {
        stats.uniqueAgents.add(entry.agentId);
      }
      
      // Get top agent for this category
      if (board.length > 0) {
        stats.topAgents[category] = {
          agentId: board[0].agentId,
          score: board[0].score,
          timestamp: board[0].timestamp
        };
      }
    }
    
    // Convert Set to count
    stats.uniqueAgentCount = stats.uniqueAgents.size;
    stats.uniqueAgents = Array.from(stats.uniqueAgents);
    
    return stats;
  }
  
  /**
   * Save leaderboards to disk
   * @returns {boolean} Save success
   */
  saveBoards() {
    if (!this.options.persistenceEnabled) {
      return false;
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(this.options.persistencePath)) {
        fs.mkdirSync(this.options.persistencePath, { recursive: true });
      }
      
      // Convert boards to object
      const data = {};
      for (const [category, board] of this.boards.entries()) {
        data[category] = board;
      }
      
      // Save to file
      const filePath = path.join(this.options.persistencePath, 'leaderboards.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to save leaderboards: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Load leaderboards from disk
   * @returns {boolean} Load success
   */
  loadBoards() {
    if (!this.options.persistenceEnabled) {
      return false;
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(this.options.persistencePath, 'leaderboards.json');
      
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      // Load from file
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Update boards
      for (const [category, entries] of Object.entries(data)) {
        this.boards.set(category, entries);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to load leaderboards: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Export leaderboards
   * @returns {object} Exported leaderboards
   */
  exportLeaderboards() {
    const data = {
      timestamp: Date.now(),
      categories: Array.from(this.boards.keys()),
      boards: {}
    };
    
    for (const [category, board] of this.boards.entries()) {
      data.boards[category] = board;
    }
    
    return data;
  }
  
  /**
   * Import leaderboards
   * @param {object} data - Leaderboard data to import
   * @param {object} options - Import options
   * @returns {object} Import result
   */
  importLeaderboards(data, options = {}) {
    if (!data || !data.boards) {
      return {
        success: false,
        message: 'Invalid leaderboard data'
      };
    }
    
    const overwrite = options.overwrite === true;
    const merge = options.merge !== false;
    
    let categoriesImported = 0;
    let entriesImported = 0;
    
    for (const [category, entries] of Object.entries(data.boards)) {
      // Skip if category doesn't exist and auto-create is disabled
      if (!this.boards.has(category) && !this.options.autoCreateCategories) {
        continue;
      }
      
      // Create category if it doesn't exist
      if (!this.boards.has(category)) {
        this.boards.set(category, []);
      }
      
      const board = this.boards.get(category);
      
      if (overwrite) {
        // Replace entire board
        board.length = 0;
        board.push(...entries);
        entriesImported += entries.length;
      } else if (merge) {
        // Merge entries
        for (const entry of entries) {
          // Check if entry already exists
          const existingIndex = board.findIndex(e => 
            e.agentId === entry.agentId && e.timestamp === entry.timestamp
          );
          
          if (existingIndex >= 0) {
            // Update existing entry
            board[existingIndex] = entry;
          } else {
            // Add new entry
            board.push(entry);
          }
          
          entriesImported++;
        }
        
        // Sort board
        this.sortBoard(category);
        
        // Trim board if needed
        if (board.length > this.options.maxEntries) {
          board.splice(this.options.maxEntries);
        }
      }
      
      categoriesImported++;
    }
    
    // Persist if enabled
    if (entriesImported > 0 && this.options.persistenceEnabled) {
      this.saveBoards();
    }
    
    return {
      success: true,
      categoriesImported,
      entriesImported
    };
  }
}

module.exports = Leaderboard;
