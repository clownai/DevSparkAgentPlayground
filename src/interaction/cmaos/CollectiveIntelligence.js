/**
 * CollectiveIntelligence - Aggregates insights and decisions from multiple agents
 * 
 * This component is responsible for:
 * - Implementing voting mechanisms
 * - Applying consensus algorithms
 * - Aggregating individual agent insights
 * - Providing decision support for teams
 */

class CollectiveIntelligence {
  /**
   * Create a new CollectiveIntelligence instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.votes = new Map(); // Map of voteId -> vote
    this.insights = new Map(); // Map of taskId -> insights
    this.decisions = new Map(); // Map of decisionId -> decision
    this.logger = config.logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the CollectiveIntelligence
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing CollectiveIntelligence');
      
      // Initialize voting algorithms
      this._initializeVotingAlgorithms();
      
      // Initialize consensus algorithms
      this._initializeConsensusAlgorithms();
      
      this.initialized = true;
      this.logger.info('CollectiveIntelligence initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`CollectiveIntelligence initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the CollectiveIntelligence
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      this.logger.info('Stopping CollectiveIntelligence');
      
      // Perform cleanup if needed
      
      this.initialized = false;
      this.logger.info('CollectiveIntelligence stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`CollectiveIntelligence shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new vote
   * @param {Object} voteData - Vote data
   * @returns {Promise<Object>} - Created vote
   */
  async createVote(voteData) {
    try {
      if (!this.initialized) {
        throw new Error('CollectiveIntelligence not initialized');
      }
      
      const voteId = voteData.id || this._generateId('vote');
      
      // Check if vote already exists
      if (this.votes.has(voteId)) {
        throw new Error(`Vote ${voteId} already exists`);
      }
      
      // Create vote object
      const vote = {
        id: voteId,
        topic: voteData.topic,
        description: voteData.description || '',
        options: voteData.options || [],
        method: voteData.method || 'majority',
        participants: voteData.participants || [],
        votes: {},
        status: 'open',
        createdAt: new Date(),
        deadline: voteData.deadline ? new Date(voteData.deadline) : null,
        metadata: voteData.metadata || {},
        ...voteData
      };
      
      // Store vote
      this.votes.set(voteId, vote);
      
      this.logger.info(`Created vote ${voteId}: ${vote.topic}`);
      return vote;
    } catch (error) {
      this.logger.error(`Failed to create vote: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a vote by ID
   * @param {string} voteId - Vote ID
   * @returns {Object} - Vote object
   */
  getVote(voteId) {
    if (!this.initialized) {
      throw new Error('CollectiveIntelligence not initialized');
    }
    
    const vote = this.votes.get(voteId);
    if (!vote) {
      throw new Error(`Vote ${voteId} not found`);
    }
    
    return vote;
  }

  /**
   * Cast a vote
   * @param {string} voteId - Vote ID
   * @param {string} agentId - Agent ID
   * @param {string|number|Object} choice - Agent's choice
   * @param {number} confidence - Confidence level (0-1)
   * @returns {Promise<Object>} - Updated vote
   */
  async castVote(voteId, agentId, choice, confidence = 1.0) {
    try {
      if (!this.initialized) {
        throw new Error('CollectiveIntelligence not initialized');
      }
      
      // Get vote
      const vote = this.getVote(voteId);
      
      // Check if vote is open
      if (vote.status !== 'open') {
        throw new Error(`Vote ${voteId} is not open`);
      }
      
      // Check if deadline has passed
      if (vote.deadline && new Date() > vote.deadline) {
        vote.status = 'closed';
        throw new Error(`Vote ${voteId} deadline has passed`);
      }
      
      // Check if agent is allowed to vote
      if (vote.participants.length > 0 && !vote.participants.includes(agentId)) {
        throw new Error(`Agent ${agentId} is not allowed to vote in ${voteId}`);
      }
      
      // Check if choice is valid
      if (vote.options.length > 0 && !vote.options.includes(choice)) {
        throw new Error(`Invalid choice: ${choice}`);
      }
      
      // Record vote
      vote.votes[agentId] = {
        choice,
        confidence,
        timestamp: new Date()
      };
      
      this.logger.info(`Agent ${agentId} voted in ${voteId}`);
      
      // Check if all participants have voted
      if (vote.participants.length > 0 && 
          vote.participants.every(participant => participant in vote.votes)) {
        await this.closeVote(voteId);
      }
      
      return vote;
    } catch (error) {
      this.logger.error(`Failed to cast vote in ${voteId} by ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Close a vote and compute the result
   * @param {string} voteId - Vote ID
   * @returns {Promise<Object>} - Vote result
   */
  async closeVote(voteId) {
    try {
      if (!this.initialized) {
        throw new Error('CollectiveIntelligence not initialized');
      }
      
      // Get vote
      const vote = this.getVote(voteId);
      
      // Check if vote is already closed
      if (vote.status === 'closed') {
        return this.getVoteResult(voteId);
      }
      
      // Close vote
      vote.status = 'closed';
      vote.closedAt = new Date();
      
      // Compute result
      const result = this._computeVoteResult(vote);
      vote.result = result;
      
      this.logger.info(`Closed vote ${voteId} with result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to close vote ${voteId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get the result of a vote
   * @param {string} voteId - Vote ID
   * @returns {Object} - Vote result
   */
  getVoteResult(voteId) {
    if (!this.initialized) {
      throw new Error('CollectiveIntelligence not initialized');
    }
    
    // Get vote
    const vote = this.getVote(voteId);
    
    // Check if vote is closed
    if (vote.status !== 'closed') {
      throw new Error(`Vote ${voteId} is not closed yet`);
    }
    
    return vote.result;
  }

  /**
   * Add an insight to a task
   * @param {string} taskId - Task ID
   * @param {string} agentId - Agent ID
   * @param {Object} insightData - Insight data
   * @returns {Promise<Object>} - Added insight
   */
  async addInsight(taskId, agentId, insightData) {
    try {
      if (!this.initialized) {
        throw new Error('CollectiveIntelligence not initialized');
      }
      
      // Create insight collection if it doesn't exist
      if (!this.insights.has(taskId)) {
        this.insights.set(taskId, []);
      }
      
      // Create insight object
      const insight = {
        id: this._generateId('insight'),
        taskId,
        agentId,
        content: insightData.content,
        confidence: insightData.confidence || 1.0,
        evidence: insightData.evidence || {},
        timestamp: new Date(),
        metadata: insightData.metadata || {},
        ...insightData
      };
      
      // Add insight
      this.insights.get(taskId).push(insight);
      
      this.logger.info(`Added insight from agent ${agentId} to task ${taskId}`);
      return insight;
    } catch (error) {
      this.logger.error(`Failed to add insight to task ${taskId} from agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get insights for a task
   * @param {string} taskId - Task ID
   * @returns {Array<Object>} - List of insights
   */
  getInsights(taskId) {
    if (!this.initialized) {
      throw new Error('CollectiveIntelligence not initialized');
    }
    
    return this.insights.get(taskId) || [];
  }

  /**
   * Aggregate insights for a task
   * @param {string} taskId - Task ID
   * @param {string} method - Aggregation method
   * @returns {Promise<Object>} - Aggregated insight
   */
  async aggregateInsights(taskId, method = 'weighted') {
    try {
      if (!this.initialized) {
        throw new Error('CollectiveIntelligence not initialized');
      }
      
      // Get insights
      const insights = this.getInsights(taskId);
      
      if (insights.length === 0) {
        throw new Error(`No insights found for task ${taskId}`);
      }
      
      // Aggregate insights based on method
      let aggregatedInsight;
      
      switch (method) {
        case 'weighted':
          aggregatedInsight = this._aggregateInsightsWeighted(insights);
          break;
        
        case 'majority':
          aggregatedInsight = this._aggregateInsightsMajority(insights);
          break;
        
        case 'consensus':
          aggregatedInsight = this._aggregateInsightsConsensus(insights);
          break;
        
        default:
          throw new Error(`Unknown aggregation method: ${method}`);
      }
      
      // Create decision
      const decisionId = this._generateId('decision');
      const decision = {
        id: decisionId,
        taskId,
        method,
        insights: insights.map(insight => insight.id),
        result: aggregatedInsight,
        timestamp: new Date()
      };
      
      // Store decision
      this.decisions.set(decisionId, decision);
      
      this.logger.info(`Aggregated insights for task ${taskId} using ${method} method`);
      return decision;
    } catch (error) {
      this.logger.error(`Failed to aggregate insights for task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a decision by ID
   * @param {string} decisionId - Decision ID
   * @returns {Object} - Decision object
   */
  getDecision(decisionId) {
    if (!this.initialized) {
      throw new Error('CollectiveIntelligence not initialized');
    }
    
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    return decision;
  }

  /**
   * Initialize voting algorithms
   * @private
   */
  _initializeVotingAlgorithms() {
    this.votingAlgorithms = {
      // Simple majority vote
      majority: (votes) => {
        const tally = {};
        let maxCount = 0;
        let winner = null;
        
        // Count votes
        for (const [agentId, vote] of Object.entries(votes)) {
          const choice = vote.choice;
          tally[choice] = (tally[choice] || 0) + 1;
          
          if (tally[choice] > maxCount) {
            maxCount = tally[choice];
            winner = choice;
          }
        }
        
        return {
          winner,
          tally,
          totalVotes: Object.keys(votes).length
        };
      },
      
      // Weighted vote based on confidence
      weighted: (votes) => {
        const tally = {};
        let maxWeight = 0;
        let winner = null;
        
        // Count weighted votes
        for (const [agentId, vote] of Object.entries(votes)) {
          const choice = vote.choice;
          const weight = vote.confidence || 1.0;
          
          tally[choice] = (tally[choice] || 0) + weight;
          
          if (tally[choice] > maxWeight) {
            maxWeight = tally[choice];
            winner = choice;
          }
        }
        
        return {
          winner,
          tally,
          totalVotes: Object.keys(votes).length,
          totalWeight: Object.values(tally).reduce((sum, weight) => sum + weight, 0)
        };
      },
      
      // Ranked choice voting
      ranked: (votes) => {
        // Implementation of ranked choice voting algorithm
        // This is a simplified version that assumes choices are arrays of ranked options
        
        // Count first choices
        const firstChoiceTally = {};
        const totalVotes = Object.keys(votes).length;
        const majority = totalVotes / 2;
        
        // Get all unique options from all ballots
        const allOptions = new Set();
        for (const [agentId, vote] of Object.entries(votes)) {
          if (Array.isArray(vote.choice)) {
            vote.choice.forEach(option => allOptions.add(option));
          }
        }
        
        // Initialize tallies for all options
        for (const option of allOptions) {
          firstChoiceTally[option] = 0;
        }
        
        // Count first choices
        for (const [agentId, vote] of Object.entries(votes)) {
          if (Array.isArray(vote.choice) && vote.choice.length > 0) {
            const firstChoice = vote.choice[0];
            firstChoiceTally[firstChoice] = (firstChoiceTally[firstChoice] || 0) + 1;
          }
        }
        
        // Check if any option has majority
        for (const [option, count] of Object.entries(firstChoiceTally)) {
          if (count > majority) {
            return {
              winner: option,
              tally: firstChoiceTally,
              totalVotes,
              rounds: 1
            };
          }
        }
        
        // No majority, perform elimination rounds
        let currentRound = 1;
        let currentTally = { ...firstChoiceTally };
        let eliminated = [];
        let currentBallots = JSON.parse(JSON.stringify(votes));
        
        while (true) {
          currentRound++;
          
          // Find option with lowest count
          let minCount = Infinity;
          let lowestOption = null;
          
          for (const [option, count] of Object.entries(currentTally)) {
            if (!eliminated.includes(option) && count < minCount) {
              minCount = count;
              lowestOption = option;
            }
          }
          
          // Eliminate lowest option
          eliminated.push(lowestOption);
          
          // Redistribute votes
          for (const [agentId, ballot] of Object.entries(currentBallots)) {
            if (Array.isArray(ballot.choice) && ballot.choice.length > 0) {
              // If first choice is eliminated, move to next choice
              if (ballot.choice[0] === lowestOption) {
                // Remove eliminated options from ballot
                ballot.choice = ballot.choice.filter(option => !eliminated.includes(option));
                
                // If ballot still has choices, count the new first choice
                if (ballot.choice.length > 0) {
                  const newFirstChoice = ballot.choice[0];
                  currentTally[newFirstChoice] = (currentTally[newFirstChoice] || 0) + 1;
                }
                
                // Reduce count for eliminated option
                currentTally[lowestOption]--;
              }
            }
          }
          
          // Check if any option has majority
          for (const [option, count] of Object.entries(currentTally)) {
            if (!eliminated.includes(option) && count > majority) {
              return {
                winner: option,
                tally: currentTally,
                totalVotes,
                rounds: currentRound,
                eliminated
              };
            }
          }
          
          // Check if only one option remains
          const remainingOptions = Object.keys(currentTally).filter(option => !eliminated.includes(option));
          if (remainingOptions.length === 1) {
            return {
              winner: remainingOptions[0],
              tally: currentTally,
              totalVotes,
              rounds: currentRound,
              eliminated
            };
          }
          
          // Safety check to prevent infinite loops
          if (currentRound > 100 || eliminated.length >= Object.keys(currentTally).length) {
            throw new Error('Ranked choice voting failed to produce a winner');
          }
        }
      }
    };
  }

  /**
   * Initialize consensus algorithms
   * @private
   */
  _initializeConsensusAlgorithms() {
    this.consensusAlgorithms = {
      // Simple average of numeric values
      average: (insights) => {
        const numericInsights = insights.filter(insight => 
          typeof insight.content === 'number' || 
          (typeof insight.content === 'string' && !isNaN(parseFloat(insight.content)))
        );
        
        if (numericInsights.length === 0) {
          throw new Error('No numeric insights found for averaging');
        }
        
        const values = numericInsights.map(insight => {
          return typeof insight.content === 'number' ? 
            insight.content : 
            parseFloat(insight.content);
        });
        
        const sum = values.reduce((acc, val) => acc + val, 0);
        const average = sum / values.length;
        
        return {
          result: average,
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      },
      
      // Weighted average based on confidence
      weightedAverage: (insights) => {
        const numericInsights = insights.filter(insight => 
          typeof insight.content === 'number' || 
          (typeof insight.content === 'string' && !isNaN(parseFloat(insight.content)))
        );
        
        if (numericInsights.length === 0) {
          throw new Error('No numeric insights found for weighted averaging');
        }
        
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const insight of numericInsights) {
          const value = typeof insight.content === 'number' ? 
            insight.content : 
            parseFloat(insight.content);
          
          const weight = insight.confidence || 1.0;
          
          weightedSum += value * weight;
          totalWeight += weight;
        }
        
        const weightedAverage = weightedSum / totalWeight;
        
        return {
          result: weightedAverage,
          count: numericInsights.length,
          totalWeight
        };
      },
      
      // Text summarization for text insights
      textSummary: (insights) => {
        const textInsights = insights.filter(insight => 
          typeof insight.content === 'string' && 
          isNaN(parseFloat(insight.content))
        );
        
        if (textInsights.length === 0) {
          throw new Error('No text insights found for summarization');
        }
        
        // Simple concatenation with confidence weighting
        // In a real implementation, this would use more sophisticated NLP techniques
        const sortedInsights = [...textInsights].sort((a, b) => 
          (b.confidence || 1.0) - (a.confidence || 1.0)
        );
        
        const topInsights = sortedInsights.slice(0, 3);
        const summary = topInsights.map(insight => insight.content).join(' ');
        
        return {
          result: summary,
          count: textInsights.length,
          topContributors: topInsights.map(insight => insight.agentId)
        };
      }
    };
  }

  /**
   * Compute the result of a vote
   * @private
   * @param {Object} vote - Vote object
   * @returns {Object} - Vote result
   */
  _computeVoteResult(vote) {
    // Get voting algorithm
    const algorithm = this.votingAlgorithms[vote.method] || this.votingAlgorithms.majority;
    
    // Compute result
    const result = algorithm(vote.votes);
    
    return {
      winner: result.winner,
      method: vote.method,
      participants: Object.keys(vote.votes),
      participantCount: Object.keys(vote.votes).length,
      details: result
    };
  }

  /**
   * Aggregate insights using weighted average
   * @private
   * @param {Array<Object>} insights - List of insights
   * @returns {Object} - Aggregated insight
   */
  _aggregateInsightsWeighted(insights) {
    // Determine the type of insights
    const numericInsights = insights.filter(insight => 
      typeof insight.content === 'number' || 
      (typeof insight.content === 'string' && !isNaN(parseFloat(insight.content)))
    );
    
    const textInsights = insights.filter(insight => 
      typeof insight.content === 'string' && 
      isNaN(parseFloat(insight.content))
    );
    
    // Choose appropriate algorithm based on insight type
    if (numericInsights.length > 0) {
      return this.consensusAlgorithms.weightedAverage(insights);
    } else if (textInsights.length > 0) {
      return this.consensusAlgorithms.textSummary(insights);
    } else {
      throw new Error('Unsupported insight type for aggregation');
    }
  }

  /**
   * Aggregate insights using majority
   * @private
   * @param {Array<Object>} insights - List of insights
   * @returns {Object} - Aggregated insight
   */
  _aggregateInsightsMajority(insights) {
    // Count occurrences of each unique insight
    const tally = {};
    let maxCount = 0;
    let majorityInsight = null;
    
    for (const insight of insights) {
      const content = JSON.stringify(insight.content);
      tally[content] = (tally[content] || 0) + 1;
      
      if (tally[content] > maxCount) {
        maxCount = tally[content];
        majorityInsight = insight.content;
      }
    }
    
    return {
      result: majorityInsight,
      count: insights.length,
      majorityCount: maxCount,
      majorityPercentage: (maxCount / insights.length) * 100
    };
  }

  /**
   * Aggregate insights using consensus
   * @private
   * @param {Array<Object>} insights - List of insights
   * @returns {Object} - Aggregated insight
   */
  _aggregateInsightsConsensus(insights) {
    // Determine the type of insights
    const numericInsights = insights.filter(insight => 
      typeof insight.content === 'number' || 
      (typeof insight.content === 'string' && !isNaN(parseFloat(insight.content)))
    );
    
    const textInsights = insights.filter(insight => 
      typeof insight.content === 'string' && 
      isNaN(parseFloat(insight.content))
    );
    
    // Choose appropriate algorithm based on insight type
    if (numericInsights.length > 0) {
      // For numeric insights, use weighted average
      return this.consensusAlgorithms.weightedAverage(insights);
    } else if (textInsights.length > 0) {
      // For text insights, use text summarization
      return this.consensusAlgorithms.textSummary(insights);
    } else {
      throw new Error('Unsupported insight type for consensus');
    }
  }

  /**
   * Generate a unique ID
   * @private
   * @param {string} prefix - ID prefix
   * @returns {string} - Unique ID
   */
  _generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}_${timestamp}_${random}`;
  }
}

module.exports = CollectiveIntelligence;
