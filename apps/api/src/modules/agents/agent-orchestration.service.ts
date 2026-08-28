import { Injectable } from '@nestjs/common';
import { Agent } from './agent.entity';
import { AgentsService } from './agents.service';

@Injectable()
export class AgentOrchestrationService {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Pick a sub-agent whose keyword list matches the user message.
   * Returns the parent agent itself when no sub-agent matches.
   */
  async resolveActiveAgent(
    tenantId: string,
    parentAgent: Agent,
    message: string,
  ): Promise<Agent> {
    const subAgents = parentAgent.personalityConfig?.subAgents;
    if (!subAgents || subAgents.length === 0) {
      return parentAgent;
    }

    const normalized = message.toLowerCase();
    let bestMatch: { agent: Agent | null; score: number } = { agent: null, score: 0 };

    for (const config of subAgents) {
      const score = config.keywords.reduce((acc, keyword) => {
        const regex = new RegExp(`\\b${keyword.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
        const matches = normalized.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0);

      if (score > bestMatch.score) {
        try {
          const agent = await this.agentsService.findById(config.agentId, tenantId);
          bestMatch = { agent, score };
        } catch {
          // Ignore missing or inaccessible sub-agents
        }
      }
    }

    return bestMatch.agent || parentAgent;
  }
}
