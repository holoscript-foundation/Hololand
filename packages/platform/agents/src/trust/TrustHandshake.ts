/**
 * @hololand/agents TrustHandshake
 *
 * 5-phase VR Trust Handshake: GENESIS, JOIN, INTERACT, REFRESH, EXIT.
 */

import { HandshakePhase, type Phase } from './HandshakePhase';
import { TrustFrameBudget } from './TrustFrameBudget';

export interface HandshakeState { agentId: string; phase: Phase; trustLevel: number; frameBudget: number; startedAt: number; lastRefresh: number; }

export class TrustHandshake {
  private states: Map<string, HandshakeState> = new Map();
  private phaseManager: HandshakePhase;
  private budgetManager: TrustFrameBudget;

  constructor() { this.phaseManager = new HandshakePhase(); this.budgetManager = new TrustFrameBudget(); }

  genesis(agentId: string): HandshakeState {
    const state: HandshakeState = { agentId, phase: 'GENESIS', trustLevel: 0, frameBudget: this.budgetManager.getBudget('GENESIS'), startedAt: Date.now(), lastRefresh: Date.now() };
    this.states.set(agentId, state);
    return state;
  }

  join(agentId: string): HandshakeState | null {
    const state = this.states.get(agentId);
    if (!state || state.phase !== 'GENESIS') return null;
    state.phase = 'JOIN';
    state.trustLevel = 0.3;
    state.frameBudget = this.budgetManager.getBudget('JOIN');
    return state;
  }

  interact(agentId: string): HandshakeState | null {
    const state = this.states.get(agentId);
    if (!state || state.phase !== 'JOIN') return null;
    state.phase = 'INTERACT';
    state.trustLevel = 0.6;
    state.frameBudget = this.budgetManager.getBudget('INTERACT');
    return state;
  }

  refresh(agentId: string): HandshakeState | null {
    const state = this.states.get(agentId);
    if (!state || state.phase !== 'INTERACT') return null;
    state.phase = 'REFRESH';
    state.trustLevel = Math.min(1, state.trustLevel + 0.1);
    state.lastRefresh = Date.now();
    state.frameBudget = this.budgetManager.getBudget('REFRESH');
    return state;
  }

  exit(agentId: string): boolean {
    const state = this.states.get(agentId);
    if (!state) return false;
    state.phase = 'EXIT';
    state.trustLevel = 0;
    this.states.delete(agentId);
    return true;
  }

  getState(agentId: string): HandshakeState | undefined { return this.states.get(agentId); }
  getActiveCount(): number { return this.states.size; }
}
