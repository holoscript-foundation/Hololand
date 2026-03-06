/**
 * @hololand/agents HandshakePhase
 */

export type Phase = 'GENESIS' | 'JOIN' | 'INTERACT' | 'REFRESH' | 'EXIT';
const PHASE_ORDER: Phase[] = ['GENESIS', 'JOIN', 'INTERACT', 'REFRESH', 'EXIT'];

export class HandshakePhase {
  isValidTransition(from: Phase, to: Phase): boolean {
    const fromIdx = PHASE_ORDER.indexOf(from);
    const toIdx = PHASE_ORDER.indexOf(to);
    return toIdx === fromIdx + 1 || to === 'EXIT';
  }

  getPhaseIndex(phase: Phase): number { return PHASE_ORDER.indexOf(phase); }
  getPhases(): Phase[] { return [...PHASE_ORDER]; }
}
