import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../chat/llm.service';
import { ProductsService } from '../products/products.service';
import { AgentPolicyService } from './agent-policy.service';

// Action risk classification — enforced before any tool executes:
// READ: read-only lookup, safe to auto-execute (e.g. search, calculator).
// SUGGEST: proposes something to the user, doesn't mutate any system, safe to auto-execute.
// WRITE: mutates a business record (order, customer data) — never auto-executed, always requires human approval.
// EXECUTE: financial or destructive action (refund, payment, deletion) — never auto-executed, always requires human approval.
export enum ToolRiskLevel {
  READ = 'read',
  SUGGEST = 'suggest',
  WRITE = 'write',
  EXECUTE = 'execute',
}

export interface AgentTool {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  parameters: { name: string; type: string; description: string; required: boolean }[];
  execute: (args: Record<string, string>, tenantId: string) => Promise<string>;
}

export interface ToolCallResult {
  toolName: string;
  result: string;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
}

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);
  private readonly tools: Map<string, AgentTool> = new Map();

  constructor(
    private readonly llmService: LLMService,
    private readonly productsService: ProductsService,
    private readonly policyService: AgentPolicyService,
  ) {
    this.registerTool(this.webSearchTool());
    this.registerTool(this.calculatorTool());
    this.registerTool(this.calendarTool());
    this.registerTool(this.memoryRecallTool());
    this.registerTool(this.getProductPriceTool());
    this.registerTool(this.checkAvailabilityTool());
  }

  private registerTool(tool: AgentTool) {
    this.tools.set(tool.name, tool);
  }

  getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolsDescription(): string {
    return this.getAvailableTools()
      .map((t) => `- ${t.name}: ${t.description}. Parameters: ${t.parameters.map((p) => `${p.name}(${p.type}${p.required ? ', required' : ''})`).join(', ')}`)
      .join('\n');
  }

  async detectAndExecuteTools(
    userMessage: string,
    tenantId: string,
    availableToolNames?: string[],
    businessId?: string,
  ): Promise<ToolCallResult[]> {
    const tools = availableToolNames
      ? this.getAvailableTools().filter((t) => availableToolNames.includes(t.name))
      : this.getAvailableTools();

    if (tools.length === 0) return [];

    const toolPrompt = `You are a tool router. Given the user message, determine which tools to call and with what parameters.
Available tools:
${tools.map((t) => `- ${t.name}: ${t.description}. Parameters: ${t.parameters.map((p) => `${p.name}=${p.type}`).join(', ')}`).join('\n')}

User message: "${userMessage}"

Respond in JSON format only:
{"calls": [{"tool": "tool_name", "args": {"param": "value"}}]}

If no tool is needed, respond: {"calls": []}`;

    try {
      const response = await this.llmService.chat([
        { role: 'system', content: toolPrompt },
        { role: 'user', content: userMessage },
      ]);

      const parsed = JSON.parse(response.trim());
      if (!parsed.calls || !Array.isArray(parsed.calls)) return [];

      const results: ToolCallResult[] = [];
      for (const call of parsed.calls) {
        const tool = this.tools.get(call.tool);
        if (!tool) continue;

        // Deterministic policy: only READ tools may execute without human approval.
        if (!this.policyService.canAutoExecute(tool.riskLevel)) {
          results.push({
            toolName: call.tool,
            result: `Action "${call.tool}" en attente de validation humaine (risque: ${tool.riskLevel}). L'agent ne doit pas prétendre avoir déjà exécuté cette action.`,
            riskLevel: tool.riskLevel,
            requiresApproval: true,
          });
          continue;
        }

        try {
          const mergedArgs = { ...(call.args || {}), ...(businessId ? { businessId } : {}) };
          const result = await tool.execute(mergedArgs, tenantId);
          results.push({ toolName: call.tool, result, riskLevel: tool.riskLevel, requiresApproval: false });
        } catch (err: any) {
          this.logger.warn(`Tool ${call.tool} failed: ${err?.message}`);
          results.push({ toolName: call.tool, result: `Error: ${err?.message}`, riskLevel: tool.riskLevel, requiresApproval: false });
        }
      }
      return results;
    } catch (err: any) {
      this.logger.warn(`Tool detection failed: ${err?.message}`);
      return [];
    }
  }

  private webSearchTool(): AgentTool {
    return {
      name: 'web_search',
      description: 'Search the web for current information using DuckDuckGo',
      riskLevel: ToolRiskLevel.READ,
      parameters: [
        { name: 'query', type: 'string', description: 'Search query', required: true },
      ],
      execute: async (args) => {
        const query = args.query;
        if (!query) return 'No query provided';
        try {
          const response = await fetch(
            `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BotInt/1.0)' } },
          );
          const html = await response.text();
          const snippets: string[] = [];
          const resultRegex = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
          let match;
          while ((match = resultRegex.exec(html)) !== null && snippets.length < 3) {
            const title = match[1].replace(/<[^>]+>/g, '').trim();
            const snippet = match[2].replace(/<[^>]+>/g, '').trim();
            snippets.push(`${title}: ${snippet.slice(0, 200)}`);
          }
          return snippets.length > 0 ? snippets.join('\n') : 'No results found';
        } catch (err: any) {
          return `Search failed: ${err?.message}`;
        }
      },
    };
  }

  private calculatorTool(): AgentTool {
    return {
      name: 'calculator',
      description: 'Evaluate a mathematical expression',
      riskLevel: ToolRiskLevel.READ,
      parameters: [
        { name: 'expression', type: 'string', description: 'Math expression to evaluate (e.g. "25 * 0.20", "100 + 50")', required: true },
      ],
      execute: async (args) => {
        const expr = args.expression;
        if (!expr) return 'No expression provided';
        if (!/^[\d\s+\-*/().,%]+$/.test(expr)) return 'Invalid expression';
        try {
          const sanitized = expr.replace(/,/g, '.').replace(/%/g, '/100');
          const result = Function(`"use strict"; return (${sanitized})`)();
          return `Result: ${result}`;
        } catch {
          return 'Could not evaluate expression';
        }
      },
    };
  }

  private calendarTool(): AgentTool {
    return {
      name: 'calendar',
      description: 'Get current date and time or check day of week',
      riskLevel: ToolRiskLevel.READ,
      parameters: [
        { name: 'action', type: 'string', description: 'Action: "now" for current datetime, "day" for day of week', required: true },
      ],
      execute: async (args) => {
        const now = new Date();
        switch (args.action) {
          case 'now':
            return `Current date and time: ${now.toISOString()}`;
          case 'day':
            return `Today is: ${now.toLocaleDateString('en-US', { weekday: 'long' })}`;
          default:
            return `Current date and time: ${now.toISOString()}`;
        }
      },
    };
  }

  private memoryRecallTool(): AgentTool {
    return {
      name: 'memory_recall',
      description: 'Placeholder for memory recall — handled by ChatService directly',
      riskLevel: ToolRiskLevel.READ,
      parameters: [
        { name: 'key', type: 'string', description: 'Memory key to recall', required: false },
      ],
      execute: async () => 'Memory recall is handled by the chat service',
    };
  }

  private getProductPriceTool(): AgentTool {
    return {
      name: 'get_product_price',
      description: 'Get the real price and stock of a product by its name. Returns the matching product only if it belongs to the active business.',
      riskLevel: ToolRiskLevel.READ,
      parameters: [
        { name: 'product', type: 'string', description: 'Product name to look up', required: true },
      ],
      execute: async (args) => {
        const product = args.product?.trim();
        const businessId = args.businessId?.trim();
        if (!product) return 'Aucun produit spécifié';
        try {
          const { data } = await this.productsService.findByTenant(args.tenantId ?? '', {
            search: product,
            businessId,
            limit: 1,
          });
          if (!data || data.length === 0) return `Produit "${product}" non trouvé`;
          const item = data[0];
          return `${item.name} — ${item.price ?? 'prix non renseigné'}€ (stock: ${item.stock ?? 'non renseigné'})`;
        } catch (err: any) {
          return `Erreur lors de la récupération du prix: ${err?.message}`;
        }
      },
    };
  }

  private checkAvailabilityTool(): AgentTool {
    return {
      name: 'check_availability',
      description: 'Check real-time availability for an appointment or service.',
      riskLevel: ToolRiskLevel.READ,
      parameters: [
        { name: 'service', type: 'string', description: 'Service or appointment type', required: false },
      ],
      execute: async (args) => {
        const service = args.service?.trim() ?? 'service demandé';
        return `Aucun créneau n'est configurable automatiquement pour "${service}". La vérification en temps réel nécessite un connecteur de calendrier. Proposez la mise en relation avec un conseiller.`;
      },
    };
  }
}
