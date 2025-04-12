import { TeamCooperationEnvironment } from '../src/examples/multi-agent/TeamCooperationEnvironment';
import { CompetitiveEnvironment } from '../src/examples/multi-agent/CompetitiveEnvironment';
import { CaptureTheFlagEnvironment, Team } from '../src/examples/multi-agent/CaptureTheFlagEnvironment';
import { PuzzleSolvingEnvironment, PuzzleElementType } from '../src/examples/multi-agent/PuzzleSolvingEnvironment';
import { createRewardStructureEnvironment, RewardType } from '../src/examples/multi-agent/ResourceAllocationEnvironment';

describe('Multi-Agent Example Environments', () => {
  describe('TeamCooperationEnvironment', () => {
    let env: TeamCooperationEnvironment;
    
    beforeEach(() => {
      env = new TeamCooperationEnvironment({
        gridSize: 10,
        maxStepsPerEpisode: 100,
        numResources: 10,
        requiredResources: 5,
        agents: [
          { id: 'agent1' },
          { id: 'agent2' },
          { id: 'agent3' }
        ]
      });
    });
    
    test('should initialize correctly', () => {
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(3);
      expect(env.getAgentIds()).toContain('agent1');
      expect(env.getAgentIds()).toContain('agent2');
      expect(env.getAgentIds()).toContain('agent3');
    });
    
    test('should reset and provide initial observations', () => {
      const observations = env.reset();
      
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(3);
      
      for (const agentId of env.getAgentIds()) {
        expect(observations[agentId]).toBeDefined();
        expect(observations[agentId].state).toBeDefined();
        expect(observations[agentId].position).toBeDefined();
        expect(observations[agentId].position).toHaveLength(2);
      }
    });
    
    test('should process actions and return step results', () => {
      env.reset();
      
      const actions = {};
      for (const agentId of env.getAgentIds()) {
        actions[agentId] = {
          action: 0 // MOVE_UP
        };
      }
      
      const results = env.step(actions);
      
      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(3);
      
      for (const agentId of env.getAgentIds()) {
        expect(results[agentId]).toBeDefined();
        expect(results[agentId].observation).toBeDefined();
        expect(results[agentId].reward).toBeDefined();
        expect(results[agentId].done).toBeDefined();
        expect(results[agentId].info).toBeDefined();
      }
    });
    
    test('should add and remove agents', () => {
      expect(env.getAgentIds()).toHaveLength(3);
      
      // Add agent
      const added = env.addAgent('agent4', {});
      expect(added).toBe(true);
      expect(env.getAgentIds()).toHaveLength(4);
      expect(env.getAgentIds()).toContain('agent4');
      
      // Remove agent
      const removed = env.removeAgent('agent4');
      expect(removed).toBe(true);
      expect(env.getAgentIds()).toHaveLength(3);
      expect(env.getAgentIds()).not.toContain('agent4');
    });
    
    test('should render in different modes', () => {
      env.reset();
      
      // Human mode
      const humanRender = env.render('human');
      expect(typeof humanRender).toBe('string');
      
      // RGB array mode
      const rgbRender = env.render('rgb_array');
      expect(rgbRender).toBeDefined();
      expect(rgbRender.grid).toBeDefined();
      expect(rgbRender.agents).toBeDefined();
      expect(rgbRender.resources).toBeDefined();
    });
  });
  
  describe('CompetitiveEnvironment', () => {
    let env: CompetitiveEnvironment;
    
    beforeEach(() => {
      env = new CompetitiveEnvironment({
        gridSize: 12,
        maxStepsPerEpisode: 200,
        maxResources: 20,
        agents: [
          { id: 'agent1' },
          { id: 'agent2' },
          { id: 'agent3' },
          { id: 'agent4' }
        ]
      });
    });
    
    test('should initialize correctly', () => {
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(4);
      expect(env.getAgentIds()).toContain('agent1');
      expect(env.getAgentIds()).toContain('agent2');
      expect(env.getAgentIds()).toContain('agent3');
      expect(env.getAgentIds()).toContain('agent4');
    });
    
    test('should reset and provide initial observations', () => {
      const observations = env.reset();
      
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(4);
      
      for (const agentId of env.getAgentIds()) {
        expect(observations[agentId]).toBeDefined();
        expect(observations[agentId].state).toBeDefined();
        expect(observations[agentId].position).toBeDefined();
        expect(observations[agentId].position).toHaveLength(2);
      }
    });
    
    test('should process actions and return step results', () => {
      env.reset();
      
      const actions = {};
      for (const agentId of env.getAgentIds()) {
        actions[agentId] = {
          action: 0 // MOVE_UP
        };
      }
      
      const results = env.step(actions);
      
      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(4);
      
      for (const agentId of env.getAgentIds()) {
        expect(results[agentId]).toBeDefined();
        expect(results[agentId].observation).toBeDefined();
        expect(results[agentId].reward).toBeDefined();
        expect(results[agentId].done).toBeDefined();
        expect(results[agentId].info).toBeDefined();
      }
    });
  });
  
  describe('CaptureTheFlagEnvironment', () => {
    let env: CaptureTheFlagEnvironment;
    
    beforeEach(() => {
      env = new CaptureTheFlagEnvironment({
        gridWidth: 20,
        gridHeight: 10,
        maxStepsPerEpisode: 300,
        agents: [
          { id: 'agent1', team: Team.TEAM_A },
          { id: 'agent2', team: Team.TEAM_A },
          { id: 'agent3', team: Team.TEAM_A },
          { id: 'agent4', team: Team.TEAM_B },
          { id: 'agent5', team: Team.TEAM_B },
          { id: 'agent6', team: Team.TEAM_B }
        ]
      });
    });
    
    test('should initialize correctly', () => {
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(6);
      expect(env.getAgentIds()).toContain('agent1');
      expect(env.getAgentIds()).toContain('agent6');
    });
    
    test('should reset and provide initial observations', () => {
      const observations = env.reset();
      
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(6);
      
      for (const agentId of env.getAgentIds()) {
        expect(observations[agentId]).toBeDefined();
        expect(observations[agentId].state).toBeDefined();
        expect(observations[agentId].state.team).toBeDefined();
        expect(observations[agentId].position).toBeDefined();
        expect(observations[agentId].position).toHaveLength(2);
      }
    });
    
    test('should process actions and return step results', () => {
      env.reset();
      
      const actions = {};
      for (const agentId of env.getAgentIds()) {
        actions[agentId] = {
          action: 0, // MOVE_UP
          message: {
            to: 'team',
            content: { type: 'status', position: [0, 0] }
          }
        };
      }
      
      const results = env.step(actions);
      
      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(6);
      
      for (const agentId of env.getAgentIds()) {
        expect(results[agentId]).toBeDefined();
        expect(results[agentId].observation).toBeDefined();
        expect(results[agentId].reward).toBeDefined();
        expect(results[agentId].done).toBeDefined();
        expect(results[agentId].info).toBeDefined();
      }
    });
  });
  
  describe('PuzzleSolvingEnvironment', () => {
    let env: PuzzleSolvingEnvironment;
    
    beforeEach(() => {
      env = new PuzzleSolvingEnvironment({
        gridSize: 15,
        maxStepsPerEpisode: 150,
        numPuzzleElements: 20,
        numSolutionNodes: 4,
        agents: [
          { id: 'agent1', specialization: PuzzleElementType.SYMBOL },
          { id: 'agent2', specialization: PuzzleElementType.PATTERN },
          { id: 'agent3', specialization: PuzzleElementType.COLOR },
          { id: 'agent4', specialization: PuzzleElementType.NUMBER }
        ]
      });
    });
    
    test('should initialize correctly', () => {
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(4);
      expect(env.getAgentIds()).toContain('agent1');
      expect(env.getAgentIds()).toContain('agent2');
      expect(env.getAgentIds()).toContain('agent3');
      expect(env.getAgentIds()).toContain('agent4');
    });
    
    test('should reset and provide initial observations', () => {
      const observations = env.reset();
      
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(4);
      
      for (const agentId of env.getAgentIds()) {
        expect(observations[agentId]).toBeDefined();
        expect(observations[agentId].state).toBeDefined();
        expect(observations[agentId].state.specialization).toBeDefined();
        expect(observations[agentId].position).toBeDefined();
        expect(observations[agentId].position).toHaveLength(2);
      }
    });
    
    test('should process actions and return step results', () => {
      env.reset();
      
      const actions = {};
      for (const agentId of env.getAgentIds()) {
        actions[agentId] = {
          action: 0, // MOVE_UP
          message: {
            to: 'broadcast',
            content: { type: 'info', data: 'test message' }
          }
        };
      }
      
      const results = env.step(actions);
      
      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(4);
      
      for (const agentId of env.getAgentIds()) {
        expect(results[agentId]).toBeDefined();
        expect(results[agentId].observation).toBeDefined();
        expect(results[agentId].reward).toBeDefined();
        expect(results[agentId].done).toBeDefined();
        expect(results[agentId].info).toBeDefined();
      }
    });
  });
  
  describe('ResourceAllocationEnvironment', () => {
    test('should create individual reward environment', () => {
      const env = createRewardStructureEnvironment(RewardType.INDIVIDUAL, {
        gridSize: 8,
        maxStepsPerEpisode: 100,
        agents: [
          { id: 'agent1' },
          { id: 'agent2' },
          { id: 'agent3' },
          { id: 'agent4' }
        ]
      });
      
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(4);
      
      const observations = env.reset();
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(4);
    });
    
    test('should create team reward environment', () => {
      const env = createRewardStructureEnvironment(RewardType.TEAM, {
        gridSize: 8,
        maxStepsPerEpisode: 100,
        agents: [
          { id: 'agent1', team: 'team1' },
          { id: 'agent2', team: 'team1' },
          { id: 'agent3', team: 'team1' },
          { id: 'agent4', team: 'team1' }
        ]
      });
      
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(4);
      
      const observations = env.reset();
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(4);
      
      // Check team assignment
      for (const agentId of env.getAgentIds()) {
        expect(observations[agentId].state.team).toBe('team1');
      }
    });
    
    test('should create mixed reward environment', () => {
      const env = createRewardStructureEnvironment(RewardType.MIXED, {
        gridSize: 8,
        maxStepsPerEpisode: 100,
        agents: [
          { id: 'agent1', team: 'team1' },
          { id: 'agent2', team: 'team1' },
          { id: 'agent3', team: 'team1' },
          { id: 'agent4', team: 'team1' }
        ]
      });
      
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(4);
      
      const observations = env.reset();
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(4);
    });
    
    test('should create zero-sum reward environment', () => {
      const env = createRewardStructureEnvironment(RewardType.ZERO_SUM, {
        gridSize: 8,
        maxStepsPerEpisode: 100,
        agents: [
          { id: 'agent1' },
          { id: 'agent2' },
          { id: 'agent3' },
          { id: 'agent4' }
        ]
      });
      
      expect(env).toBeDefined();
      expect(env.getAgentIds()).toHaveLength(4);
      
      const observations = env.reset();
      expect(observations).toBeDefined();
      expect(Object.keys(observations)).toHaveLength(4);
    });
    
    test('should process actions and return step results', () => {
      const env = createRewardStructureEnvironment(RewardType.INDIVIDUAL, {
        gridSize: 8,
        maxStepsPerEpisode: 100,
        agents: [
          { id: 'agent1' },
          { id: 'agent2' }
        ]
      });
      
      env.reset();
      
      const actions = {};
      for (const agentId of env.getAgentIds()) {
        actions[agentId] = {
          action: 0 // MOVE_UP
        };
      }
      
      const results = env.step(actions);
      
      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(2);
      
      for (const agentId of env.getAgentIds()) {
        expect(results[agentId]).toBeDefined();
        expect(results[agentId].observation).toBeDefined();
        expect(results[agentId].reward).toBeDefined();
        expect(results[agentId].done).toBeDefined();
        expect(results[agentId].info).toBeDefined();
      }
    });
  });
});
