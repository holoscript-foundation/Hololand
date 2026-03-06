export class SafetyEvaluator {
  evaluate(boundaryViolations: number, contentFlags: number, privacyIncidents: number): { score: number; details: Record<string, unknown> } {
    const score = Math.max(0, 1 - (boundaryViolations * 0.1 + contentFlags * 0.2 + privacyIncidents * 0.3));
    return { score, details: { boundaryViolations, contentFlags, privacyIncidents } };
  }
}
