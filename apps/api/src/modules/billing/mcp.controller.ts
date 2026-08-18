import { Controller, Post, Body, Headers, Req, Res, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService } from '../chat/chat.service';
import { AgentsService } from '../agents/agents.service';
import { ApiKeyService } from '../billing/api-key.service';
import { BillingService } from '../billing/billing.service';
import { PLAN_LIMITS, PlanType } from '../billing/subscription.entity';

@Controller('mcp')
export class McpController {
  constructor(
    private readonly chatService: ChatService,
    private readonly agentsService: AgentsService,
    private readonly apiKeyService: ApiKeyService,
    private readonly billingService: BillingService,
  ) {}

  @Post()
  async handleMcp(
    @Body() body: any,
    @Headers('authorization') auth: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate API key
    if (!auth || !auth.startsWith('Bearer stia_')) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Invalid API key. Use Bearer stia_xxx' },
        id: body?.id ?? null,
      });
    }

    const token = auth.split(' ')[1];
    const apiKey = await this.apiKeyService.validate(token);
    if (!apiKey) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Invalid or revoked API key' },
        id: body?.id ?? null,
      });
    }

    // Check MCP access
    const usage = await this.billingService.getUsageStats(apiKey.tenantId);
    if (!usage.mcpServer) {
      return res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32002, message: 'MCP Server access requires Scale plan or higher' },
        id: body?.id ?? null,
      });
    }

    const { method, params, id } = body;

    switch (method) {
      case 'initialize': {
        return res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2025-06-18',
            serverInfo: {
              name: 'stiamond-agentforge',
              version: '1.0.0',
            },
            capabilities: {
              tools: {},
              resources: {},
            },
          },
          id,
        });
      }

      case 'tools/list': {
        const { data: agents } = await this.agentsService.findByTenant(apiKey.tenantId, 1, 1000);
        const tools = agents.map((agent) => ({
          name: `agent_${agent.id.substring(0, 8)}`,
          description: agent.systemPrompt?.substring(0, 200) || `Agent: ${agent.name}`,
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The user message to send to the agent',
              },
              conversationId: {
                type: 'string',
                description: 'Optional existing conversation ID to continue',
              },
            },
            required: ['message'],
          },
          annotations: {
            agentId: agent.id,
            agentName: agent.name,
            agentType: agent.type,
          },
        }));

        return res.json({
          jsonrpc: '2.0',
          result: { tools },
          id,
        });
      }

      case 'tools/call': {
        const { name, arguments: args } = params || {};

        // Extract agentId from tool name (agent_xxxxxxxx)
        const agentId = name?.replace('agent_', '');
        if (!agentId) {
          return res.json({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid tool name' },
            id,
          });
        }

        // Find full agent ID
        const { data: agents } = await this.agentsService.findByTenant(apiKey.tenantId, 1, 1000);
        const agent = agents.find((a) => a.id.startsWith(agentId));
        if (!agent) {
          return res.json({
            jsonrpc: '2.0',
            error: { code: -32602, message: `Agent ${agentId} not found` },
            id,
          });
        }

        const result = await this.chatService.sendMessage(
          apiKey.tenantId,
          agent.id,
          args?.message || '',
          args?.conversationId,
          undefined,
          true,
        );

        return res.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: result.reply,
              },
            ],
            metadata: {
              conversationId: result.conversationId,
              leadId: result.leadId,
              funnelStage: result.funnelStage,
              intentScore: result.intentScore,
            },
          },
          id,
        });
      }

      case 'resources/list': {
        const { data: agents } = await this.agentsService.findByTenant(apiKey.tenantId, 1, 1000);
        const resources = agents.map((agent) => ({
          uri: `stiamond://agents/${agent.id}`,
          name: agent.name,
          description: agent.systemPrompt?.substring(0, 100) || `Agent ${agent.name}`,
          mimeType: 'application/json',
        }));

        return res.json({
          jsonrpc: '2.0',
          result: { resources },
          id,
        });
      }

      case 'resources/read': {
        const { uri } = params || {};
        const match = uri?.match(/^stiamond:\/\/agents\/(.+)$/);
        if (!match) {
          return res.json({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid resource URI' },
            id,
          });
        }

        const agent = await this.agentsService.findById(match[1], apiKey.tenantId);
        return res.json({
          jsonrpc: '2.0',
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  id: agent.id,
                  name: agent.name,
                  type: agent.type,
                  systemPrompt: agent.systemPrompt,
                  personality: agent.personality,
                  iceBreakers: agent.iceBreakers,
                  isActive: agent.isActive,
                }, null, 2),
              },
            ],
          },
          id,
        });
      }

      case 'ping': {
        return res.json({
          jsonrpc: '2.0',
          result: {},
          id,
        });
      }

      default: {
        return res.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        });
      }
    }
  }
}
