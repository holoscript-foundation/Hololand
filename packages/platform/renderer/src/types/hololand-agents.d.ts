declare module '@hololand/agents' {
  export interface AccessDecision {
    allowed: boolean;
    reason?: string;
  }

  export interface AgentTokenPayload {
    agentId: string;
    role?: string;
    permissions?: unknown;
    [key: string]: unknown;
  }

  export interface RBACEnforcer {
    checkAccess(
      token: AgentTokenPayload,
      operation: string,
      resource: string
    ): Promise<AccessDecision>;
  }
}
