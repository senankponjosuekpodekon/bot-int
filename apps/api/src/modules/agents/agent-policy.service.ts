import { Injectable } from '@nestjs/common';
import { ToolRiskLevel } from './agent-tools.service';
import { UserRole } from '../auth/user.entity';

/**
 * Deterministic policy layer for agent tool execution and human approvals.
 * Runs outside the LLM: it decides what the agent may do on its own and
 * which actions require a human with the right role to approve/reject.
 */
@Injectable()
export class AgentPolicyService {
  /**
   * READ-risk tools can be auto-executed. Anything else (SUGGEST, WRITE, EXECUTE)
   * needs explicit human approval before it mutates systems or commits money.
   */
  canAutoExecute(riskLevel: ToolRiskLevel): boolean {
    return riskLevel === ToolRiskLevel.READ;
  }

  /**
   * VIEWER cannot resolve pending actions.
   * EXECUTE-risk actions require ADMIN or SUPER_ADMIN.
   * WRITE/SUGGEST can be resolved by MANAGER or above.
   */
  canResolveAction(role: UserRole, riskLevel: ToolRiskLevel): boolean {
    if (role === UserRole.VIEWER) return false;
    if (riskLevel === ToolRiskLevel.EXECUTE && role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
      return false;
    }
    return true;
  }
}
