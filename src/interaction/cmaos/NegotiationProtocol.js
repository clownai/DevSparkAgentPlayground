/**
 * NegotiationProtocol - Facilitates negotiation between agents
 * 
 * This component is responsible for:
 * - Implementing bidding mechanisms
 * - Handling resource allocation negotiations
 * - Resolving conflicts between agents
 * - Supporting contract formation
 */

class NegotiationProtocol {
  /**
   * Create a new NegotiationProtocol instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.negotiations = new Map(); // Map of negotiationId -> negotiation
    this.bids = new Map(); // Map of taskId -> bids
    this.contracts = new Map(); // Map of contractId -> contract
    this.conflicts = new Map(); // Map of conflictId -> conflict
    this.logger = config.logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the NegotiationProtocol
   * @returns {Promise<boolean>} - Resolves to true if initialization is successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing NegotiationProtocol');
      
      // Initialize negotiation strategies
      this._initializeNegotiationStrategies();
      
      // Initialize bidding mechanisms
      this._initializeBiddingMechanisms();
      
      // Initialize conflict resolution strategies
      this._initializeConflictResolutionStrategies();
      
      this.initialized = true;
      this.logger.info('NegotiationProtocol initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`NegotiationProtocol initialization failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Stop the NegotiationProtocol
   * @returns {Promise<boolean>} - Resolves to true if shutdown is successful
   */
  async stop() {
    try {
      this.logger.info('Stopping NegotiationProtocol');
      
      // Perform cleanup if needed
      
      this.initialized = false;
      this.logger.info('NegotiationProtocol stopped successfully');
      return true;
    } catch (error) {
      this.logger.error(`NegotiationProtocol shutdown failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new task bidding
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created bidding
   */
  async createTaskBidding(taskData) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      const taskId = taskData.id || this._generateId('task');
      
      // Check if bidding already exists
      if (this.bids.has(taskId)) {
        throw new Error(`Bidding for task ${taskId} already exists`);
      }
      
      // Create bidding object
      const bidding = {
        taskId,
        name: taskData.name || `Task ${taskId}`,
        description: taskData.description || '',
        roles: taskData.roles || [],
        requirements: taskData.requirements || {},
        bids: {},
        status: 'open',
        createdAt: new Date(),
        deadline: taskData.deadline ? new Date(taskData.deadline) : null,
        biddingStrategy: taskData.biddingStrategy || 'firstComeFirstServe',
        metadata: taskData.metadata || {},
        ...taskData
      };
      
      // Store bidding
      this.bids.set(taskId, bidding);
      
      this.logger.info(`Created bidding for task ${taskId}: ${bidding.name}`);
      return bidding;
    } catch (error) {
      this.logger.error(`Failed to create task bidding: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a task bidding by ID
   * @param {string} taskId - Task ID
   * @returns {Object} - Bidding object
   */
  getTaskBidding(taskId) {
    if (!this.initialized) {
      throw new Error('NegotiationProtocol not initialized');
    }
    
    const bidding = this.bids.get(taskId);
    if (!bidding) {
      throw new Error(`Bidding for task ${taskId} not found`);
    }
    
    return bidding;
  }

  /**
   * Submit a bid for a task
   * @param {string} taskId - Task ID
   * @param {string} roleId - Role ID
   * @param {string} agentId - Agent ID
   * @param {Object} bidData - Bid data
   * @returns {Promise<Object>} - Updated bidding
   */
  async submitBid(taskId, roleId, agentId, bidData) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get bidding
      const bidding = this.getTaskBidding(taskId);
      
      // Check if bidding is open
      if (bidding.status !== 'open') {
        throw new Error(`Bidding for task ${taskId} is not open`);
      }
      
      // Check if deadline has passed
      if (bidding.deadline && new Date() > bidding.deadline) {
        bidding.status = 'closed';
        throw new Error(`Bidding for task ${taskId} deadline has passed`);
      }
      
      // Check if role exists
      if (bidding.roles.length > 0 && !bidding.roles.includes(roleId)) {
        throw new Error(`Role ${roleId} not found in task ${taskId}`);
      }
      
      // Create bid object
      const bid = {
        agentId,
        roleId,
        confidence: bidData.confidence || 1.0,
        estimatedTime: bidData.estimatedTime,
        resources: bidData.resources || {},
        proposal: bidData.proposal || {},
        timestamp: new Date(),
        ...bidData
      };
      
      // Initialize role bids if not exists
      if (!bidding.bids[roleId]) {
        bidding.bids[roleId] = [];
      }
      
      // Add bid
      bidding.bids[roleId].push(bid);
      
      this.logger.info(`Agent ${agentId} submitted bid for role ${roleId} in task ${taskId}`);
      
      // Check if all roles have bids
      const allRolesHaveBids = bidding.roles.every(role => 
        bidding.bids[role] && bidding.bids[role].length > 0
      );
      
      // Auto-close bidding if all roles have bids and strategy is first-come-first-serve
      if (allRolesHaveBids && bidding.biddingStrategy === 'firstComeFirstServe') {
        await this.closeBidding(taskId);
      }
      
      return bidding;
    } catch (error) {
      this.logger.error(`Failed to submit bid for task ${taskId} by agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Close a bidding and select winners
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Bidding result
   */
  async closeBidding(taskId) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get bidding
      const bidding = this.getTaskBidding(taskId);
      
      // Check if bidding is already closed
      if (bidding.status === 'closed') {
        return this.getBiddingResult(taskId);
      }
      
      // Close bidding
      bidding.status = 'closed';
      bidding.closedAt = new Date();
      
      // Select winners
      const result = this._selectBiddingWinners(bidding);
      bidding.result = result;
      
      // Create contract
      const contractId = this._generateId('contract');
      const contract = {
        id: contractId,
        taskId,
        assignments: result.assignments,
        terms: {},
        status: 'created',
        createdAt: new Date()
      };
      
      // Store contract
      this.contracts.set(contractId, contract);
      bidding.contractId = contractId;
      
      this.logger.info(`Closed bidding for task ${taskId} with contract ${contractId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to close bidding for task ${taskId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get the result of a bidding
   * @param {string} taskId - Task ID
   * @returns {Object} - Bidding result
   */
  getBiddingResult(taskId) {
    if (!this.initialized) {
      throw new Error('NegotiationProtocol not initialized');
    }
    
    // Get bidding
    const bidding = this.getTaskBidding(taskId);
    
    // Check if bidding is closed
    if (bidding.status !== 'closed') {
      throw new Error(`Bidding for task ${taskId} is not closed yet`);
    }
    
    return bidding.result;
  }

  /**
   * Get a contract by ID
   * @param {string} contractId - Contract ID
   * @returns {Object} - Contract object
   */
  getContract(contractId) {
    if (!this.initialized) {
      throw new Error('NegotiationProtocol not initialized');
    }
    
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }
    
    return contract;
  }

  /**
   * Accept a contract assignment
   * @param {string} contractId - Contract ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Updated contract
   */
  async acceptContract(contractId, agentId) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get contract
      const contract = this.getContract(contractId);
      
      // Check if agent is assigned in the contract
      const assignment = contract.assignments.find(a => a.agentId === agentId);
      if (!assignment) {
        throw new Error(`Agent ${agentId} is not assigned in contract ${contractId}`);
      }
      
      // Update assignment status
      assignment.status = 'accepted';
      assignment.acceptedAt = new Date();
      
      // Check if all assignments are accepted
      const allAccepted = contract.assignments.every(a => a.status === 'accepted');
      if (allAccepted) {
        contract.status = 'active';
        contract.activatedAt = new Date();
      }
      
      this.logger.info(`Agent ${agentId} accepted contract ${contractId}`);
      return contract;
    } catch (error) {
      this.logger.error(`Failed to accept contract ${contractId} by agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Reject a contract assignment
   * @param {string} contractId - Contract ID
   * @param {string} agentId - Agent ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} - Updated contract
   */
  async rejectContract(contractId, agentId, reason = '') {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get contract
      const contract = this.getContract(contractId);
      
      // Check if agent is assigned in the contract
      const assignment = contract.assignments.find(a => a.agentId === agentId);
      if (!assignment) {
        throw new Error(`Agent ${agentId} is not assigned in contract ${contractId}`);
      }
      
      // Update assignment status
      assignment.status = 'rejected';
      assignment.rejectedAt = new Date();
      assignment.rejectionReason = reason;
      
      // Update contract status
      contract.status = 'rejected';
      
      this.logger.info(`Agent ${agentId} rejected contract ${contractId}: ${reason}`);
      return contract;
    } catch (error) {
      this.logger.error(`Failed to reject contract ${contractId} by agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Complete a contract assignment
   * @param {string} contractId - Contract ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Updated contract
   */
  async completeAssignment(contractId, agentId) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get contract
      const contract = this.getContract(contractId);
      
      // Check if contract is active
      if (contract.status !== 'active') {
        throw new Error(`Contract ${contractId} is not active`);
      }
      
      // Check if agent is assigned in the contract
      const assignment = contract.assignments.find(a => a.agentId === agentId);
      if (!assignment) {
        throw new Error(`Agent ${agentId} is not assigned in contract ${contractId}`);
      }
      
      // Update assignment status
      assignment.status = 'completed';
      assignment.completedAt = new Date();
      
      // Check if all assignments are completed
      const allCompleted = contract.assignments.every(a => a.status === 'completed');
      if (allCompleted) {
        contract.status = 'completed';
        contract.completedAt = new Date();
      }
      
      this.logger.info(`Agent ${agentId} completed assignment in contract ${contractId}`);
      return contract;
    } catch (error) {
      this.logger.error(`Failed to complete assignment in contract ${contractId} by agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a conflict resolution request
   * @param {Object} conflictData - Conflict data
   * @returns {Promise<Object>} - Created conflict
   */
  async createConflict(conflictData) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      const conflictId = conflictData.id || this._generateId('conflict');
      
      // Check if conflict already exists
      if (this.conflicts.has(conflictId)) {
        throw new Error(`Conflict ${conflictId} already exists`);
      }
      
      // Create conflict object
      const conflict = {
        id: conflictId,
        parties: conflictData.parties || [],
        issue: conflictData.issue || '',
        description: conflictData.description || '',
        proposals: conflictData.proposals || [],
        status: 'open',
        createdAt: new Date(),
        resolutionStrategy: conflictData.resolutionStrategy || 'mediation',
        metadata: conflictData.metadata || {},
        ...conflictData
      };
      
      // Store conflict
      this.conflicts.set(conflictId, conflict);
      
      this.logger.info(`Created conflict ${conflictId}: ${conflict.issue}`);
      return conflict;
    } catch (error) {
      this.logger.error(`Failed to create conflict: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a conflict by ID
   * @param {string} conflictId - Conflict ID
   * @returns {Object} - Conflict object
   */
  getConflict(conflictId) {
    if (!this.initialized) {
      throw new Error('NegotiationProtocol not initialized');
    }
    
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    return conflict;
  }

  /**
   * Add a proposal to a conflict
   * @param {string} conflictId - Conflict ID
   * @param {string} agentId - Agent ID
   * @param {Object} proposalData - Proposal data
   * @returns {Promise<Object>} - Updated conflict
   */
  async addProposal(conflictId, agentId, proposalData) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get conflict
      const conflict = this.getConflict(conflictId);
      
      // Check if conflict is open
      if (conflict.status !== 'open') {
        throw new Error(`Conflict ${conflictId} is not open`);
      }
      
      // Check if agent is a party in the conflict
      if (!conflict.parties.includes(agentId)) {
        throw new Error(`Agent ${agentId} is not a party in conflict ${conflictId}`);
      }
      
      // Create proposal object
      const proposal = {
        id: this._generateId('proposal'),
        agentId,
        content: proposalData.content,
        justification: proposalData.justification || '',
        timestamp: new Date(),
        ...proposalData
      };
      
      // Add proposal
      conflict.proposals.push(proposal);
      
      this.logger.info(`Agent ${agentId} added proposal to conflict ${conflictId}`);
      return conflict;
    } catch (error) {
      this.logger.error(`Failed to add proposal to conflict ${conflictId} by agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Vote on a proposal in a conflict
   * @param {string} conflictId - Conflict ID
   * @param {string} proposalId - Proposal ID
   * @param {string} agentId - Agent ID
   * @param {boolean} approve - Whether to approve the proposal
   * @returns {Promise<Object>} - Updated conflict
   */
  async voteOnProposal(conflictId, proposalId, agentId, approve) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get conflict
      const conflict = this.getConflict(conflictId);
      
      // Check if conflict is open
      if (conflict.status !== 'open') {
        throw new Error(`Conflict ${conflictId} is not open`);
      }
      
      // Check if agent is a party in the conflict
      if (!conflict.parties.includes(agentId)) {
        throw new Error(`Agent ${agentId} is not a party in conflict ${conflictId}`);
      }
      
      // Find proposal
      const proposal = conflict.proposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found in conflict ${conflictId}`);
      }
      
      // Initialize votes if not exists
      if (!proposal.votes) {
        proposal.votes = {};
      }
      
      // Record vote
      proposal.votes[agentId] = {
        approve,
        timestamp: new Date()
      };
      
      this.logger.info(`Agent ${agentId} voted ${approve ? 'approve' : 'reject'} on proposal ${proposalId} in conflict ${conflictId}`);
      
      // Check if all parties have voted on this proposal
      const allVoted = conflict.parties.every(party => 
        proposal.votes[party] !== undefined
      );
      
      // Check if proposal is approved by all parties
      const allApproved = allVoted && conflict.parties.every(party => 
        proposal.votes[party] && proposal.votes[party].approve
      );
      
      if (allVoted && allApproved) {
        // Resolve conflict with this proposal
        await this.resolveConflict(conflictId, proposalId);
      }
      
      return conflict;
    } catch (error) {
      this.logger.error(`Failed to vote on proposal ${proposalId} in conflict ${conflictId} by agent ${agentId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Resolve a conflict
   * @param {string} conflictId - Conflict ID
   * @param {string} proposalId - Proposal ID that resolves the conflict
   * @returns {Promise<Object>} - Resolved conflict
   */
  async resolveConflict(conflictId, proposalId) {
    try {
      if (!this.initialized) {
        throw new Error('NegotiationProtocol not initialized');
      }
      
      // Get conflict
      const conflict = this.getConflict(conflictId);
      
      // Check if conflict is open
      if (conflict.status !== 'open') {
        throw new Error(`Conflict ${conflictId} is not open`);
      }
      
      // Find proposal
      const proposal = conflict.proposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found in conflict ${conflictId}`);
      }
      
      // Update conflict status
      conflict.status = 'resolved';
      conflict.resolvedAt = new Date();
      conflict.resolution = {
        proposalId,
        proposal: proposal.content
      };
      
      this.logger.info(`Resolved conflict ${conflictId} with proposal ${proposalId}`);
      return conflict;
    } catch (error) {
      this.logger.error(`Failed to resolve conflict ${conflictId} with proposal ${proposalId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Initialize negotiation strategies
   * @private
   */
  _initializeNegotiationStrategies() {
    this.negotiationStrategies = {
      // Direct negotiation between parties
      direct: {
        name: 'Direct Negotiation',
        description: 'Parties negotiate directly with each other',
        process: (conflict) => {
          // Implementation of direct negotiation process
          return {
            steps: [
              'Parties submit proposals',
              'Parties vote on proposals',
              'If all parties approve a proposal, conflict is resolved'
            ]
          };
        }
      },
      
      // Mediation by a third party
      mediation: {
        name: 'Mediation',
        description: 'A neutral third party helps facilitate negotiation',
        process: (conflict) => {
          // Implementation of mediation process
          return {
            steps: [
              'Mediator collects proposals from all parties',
              'Mediator suggests compromise proposals',
              'Parties vote on mediator proposals',
              'If all parties approve a proposal, conflict is resolved'
            ]
          };
        }
      },
      
      // Arbitration by a third party
      arbitration: {
        name: 'Arbitration',
        description: 'A neutral third party makes a binding decision',
        process: (conflict) => {
          // Implementation of arbitration process
          return {
            steps: [
              'Parties submit proposals and evidence',
              'Arbitrator evaluates all submissions',
              'Arbitrator makes a binding decision',
              'Decision is implemented regardless of party approval'
            ]
          };
        }
      }
    };
  }

  /**
   * Initialize bidding mechanisms
   * @private
   */
  _initializeBiddingMechanisms() {
    this.biddingMechanisms = {
      // First come, first serve
      firstComeFirstServe: {
        name: 'First Come, First Serve',
        description: 'First valid bid for each role is selected',
        select: (bidding) => {
          const assignments = [];
          
          // For each role, select the first bid
          for (const roleId of bidding.roles) {
            const roleBids = bidding.bids[roleId] || [];
            
            if (roleBids.length > 0) {
              // Sort bids by timestamp
              const sortedBids = [...roleBids].sort((a, b) => 
                a.timestamp.getTime() - b.timestamp.getTime()
              );
              
              // Select first bid
              const selectedBid = sortedBids[0];
              
              assignments.push({
                roleId,
                agentId: selectedBid.agentId,
                bid: selectedBid,
                status: 'pending'
              });
            }
          }
          
          return {
            assignments,
            method: 'firstComeFirstServe'
          };
        }
      },
      
      // Highest confidence
      highestConfidence: {
        name: 'Highest Confidence',
        description: 'Bid with highest confidence for each role is selected',
        select: (bidding) => {
          const assignments = [];
          
          // For each role, select the bid with highest confidence
          for (const roleId of bidding.roles) {
            const roleBids = bidding.bids[roleId] || [];
            
            if (roleBids.length > 0) {
              // Sort bids by confidence (descending)
              const sortedBids = [...roleBids].sort((a, b) => 
                (b.confidence || 0) - (a.confidence || 0)
              );
              
              // Select highest confidence bid
              const selectedBid = sortedBids[0];
              
              assignments.push({
                roleId,
                agentId: selectedBid.agentId,
                bid: selectedBid,
                status: 'pending'
              });
            }
          }
          
          return {
            assignments,
            method: 'highestConfidence'
          };
        }
      },
      
      // Lowest estimated time
      lowestTime: {
        name: 'Lowest Estimated Time',
        description: 'Bid with lowest estimated time for each role is selected',
        select: (bidding) => {
          const assignments = [];
          
          // For each role, select the bid with lowest estimated time
          for (const roleId of bidding.roles) {
            const roleBids = bidding.bids[roleId] || [];
            
            if (roleBids.length > 0) {
              // Filter bids with valid estimated time
              const validBids = roleBids.filter(bid => 
                bid.estimatedTime !== undefined && bid.estimatedTime > 0
              );
              
              if (validBids.length > 0) {
                // Sort bids by estimated time (ascending)
                const sortedBids = [...validBids].sort((a, b) => 
                  a.estimatedTime - b.estimatedTime
                );
                
                // Select lowest time bid
                const selectedBid = sortedBids[0];
                
                assignments.push({
                  roleId,
                  agentId: selectedBid.agentId,
                  bid: selectedBid,
                  status: 'pending'
                });
              }
            }
          }
          
          return {
            assignments,
            method: 'lowestTime'
          };
        }
      },
      
      // Weighted score
      weightedScore: {
        name: 'Weighted Score',
        description: 'Bid with highest weighted score for each role is selected',
        select: (bidding) => {
          const assignments = [];
          
          // Get weights from bidding configuration or use defaults
          const weights = bidding.weights || {
            confidence: 0.5,
            estimatedTime: 0.3,
            resources: 0.2
          };
          
          // For each role, select the bid with highest weighted score
          for (const roleId of bidding.roles) {
            const roleBids = bidding.bids[roleId] || [];
            
            if (roleBids.length > 0) {
              // Calculate score for each bid
              const scoredBids = roleBids.map(bid => {
                // Normalize estimated time (lower is better)
                const maxTime = Math.max(...roleBids.map(b => b.estimatedTime || 0));
                const normalizedTime = maxTime > 0 ? 
                  1 - ((bid.estimatedTime || 0) / maxTime) : 0;
                
                // Calculate resource efficiency (lower resource usage is better)
                const resourceUsage = Object.values(bid.resources || {}).reduce((sum, val) => sum + val, 0);
                const maxResources = Math.max(...roleBids.map(b => 
                  Object.values(b.resources || {}).reduce((sum, val) => sum + val, 0)
                ));
                const normalizedResources = maxResources > 0 ? 
                  1 - (resourceUsage / maxResources) : 0;
                
                // Calculate weighted score
                const score = 
                  (weights.confidence * (bid.confidence || 0)) + 
                  (weights.estimatedTime * normalizedTime) + 
                  (weights.resources * normalizedResources);
                
                return {
                  ...bid,
                  score
                };
              });
              
              // Sort bids by score (descending)
              const sortedBids = [...scoredBids].sort((a, b) => 
                b.score - a.score
              );
              
              // Select highest score bid
              const selectedBid = sortedBids[0];
              
              assignments.push({
                roleId,
                agentId: selectedBid.agentId,
                bid: selectedBid,
                status: 'pending'
              });
            }
          }
          
          return {
            assignments,
            method: 'weightedScore'
          };
        }
      }
    };
  }

  /**
   * Initialize conflict resolution strategies
   * @private
   */
  _initializeConflictResolutionStrategies() {
    this.conflictResolutionStrategies = {
      // Majority vote
      majorityVote: {
        name: 'Majority Vote',
        description: 'Proposal with most votes wins',
        resolve: (conflict) => {
          // Count votes for each proposal
          const proposalVotes = {};
          
          for (const proposal of conflict.proposals) {
            if (proposal.votes) {
              const approvalCount = Object.values(proposal.votes)
                .filter(vote => vote.approve)
                .length;
              
              proposalVotes[proposal.id] = approvalCount;
            }
          }
          
          // Find proposal with most votes
          let maxVotes = 0;
          let winningProposalId = null;
          
          for (const [proposalId, votes] of Object.entries(proposalVotes)) {
            if (votes > maxVotes) {
              maxVotes = votes;
              winningProposalId = proposalId;
            }
          }
          
          return {
            proposalId: winningProposalId,
            votes: proposalVotes,
            method: 'majorityVote'
          };
        }
      },
      
      // Consensus
      consensus: {
        name: 'Consensus',
        description: 'All parties must approve the proposal',
        resolve: (conflict) => {
          // Find proposals with unanimous approval
          const consensusProposals = conflict.proposals.filter(proposal => {
            if (!proposal.votes) return false;
            
            // Check if all parties have voted and approved
            return conflict.parties.every(party => 
              proposal.votes[party] && proposal.votes[party].approve
            );
          });
          
          // Sort by timestamp (most recent first)
          const sortedProposals = [...consensusProposals].sort((a, b) => 
            b.timestamp.getTime() - a.timestamp.getTime()
          );
          
          return {
            proposalId: sortedProposals.length > 0 ? sortedProposals[0].id : null,
            consensusCount: sortedProposals.length,
            method: 'consensus'
          };
        }
      },
      
      // Mediation
      mediation: {
        name: 'Mediation',
        description: 'Mediator helps parties reach agreement',
        resolve: (conflict) => {
          // In a real implementation, this would involve more complex mediation logic
          // For now, we'll use a simplified approach that looks for compromise proposals
          
          // Identify mediator proposals (those not from conflict parties)
          const mediatorProposals = conflict.proposals.filter(proposal => 
            !conflict.parties.includes(proposal.agentId)
          );
          
          // Find mediator proposal with most approval
          let maxApprovalCount = 0;
          let bestProposalId = null;
          
          for (const proposal of mediatorProposals) {
            if (proposal.votes) {
              const approvalCount = Object.values(proposal.votes)
                .filter(vote => vote.approve)
                .length;
              
              if (approvalCount > maxApprovalCount) {
                maxApprovalCount = approvalCount;
                bestProposalId = proposal.id;
              }
            }
          }
          
          return {
            proposalId: bestProposalId,
            approvalCount: maxApprovalCount,
            method: 'mediation'
          };
        }
      }
    };
  }

  /**
   * Select winners for a bidding
   * @private
   * @param {Object} bidding - Bidding object
   * @returns {Object} - Bidding result
   */
  _selectBiddingWinners(bidding) {
    // Get bidding mechanism
    const mechanism = this.biddingMechanisms[bidding.biddingStrategy] || 
                      this.biddingMechanisms.firstComeFirstServe;
    
    // Select winners
    const result = mechanism.select(bidding);
    
    return {
      taskId: bidding.taskId,
      assignments: result.assignments,
      method: result.method,
      timestamp: new Date()
    };
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

module.exports = NegotiationProtocol;
