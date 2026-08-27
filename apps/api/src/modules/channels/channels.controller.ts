import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '../chat/chat.service';
import { AgentsService } from '../agents/agents.service';
import { ApiKeyGuard } from '../billing/api-key.guard';
import { WebhookService } from '../webhooks/webhook.service';
import { ChannelMessageDto, ChannelWebhookDto } from './channel.dto';
import { ConversationChannel } from '../chat/conversation.entity';

@ApiTags('channels')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('channels')
export class ChannelsController {
  private readonly logger = new Logger(ChannelsController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly agentsService: AgentsService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get('agents')
  @ApiOperation({ summary: 'List available agents for this tenant' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  async listAgents(@Request() req) {
    const result = await this.agentsService.findByTenant(req.user.tenantId, 1, 100);
    return result.data.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      isActive: a.isActive,
    }));
  }

  @Post('message')
  @ApiOperation({ summary: 'Send a message from a custom channel to an agent' })
  @ApiResponse({ status: 200, description: 'Agent reply with conversation info' })
  async sendMessage(@Request() req, @Body() dto: ChannelMessageDto) {
    const channel = this.parseChannel(dto.channel || 'api');
    const visitorId = dto.visitorId || `api_${req.user.apiKeyId}`;

    const result = await this.chatService.sendMessage(
      req.user.tenantId,
      dto.agentId,
      dto.message,
      dto.conversationId,
      visitorId,
      true,
      undefined,
      undefined,
    );

    this.webhookService
      .trigger('message.replied', req.user.tenantId, {
        conversationId: result.conversationId,
        reply: result.reply,
        leadId: result.leadId,
        channel,
        visitorId,
      })
      .catch(() => {});

    return {
      reply: result.reply,
      conversationId: result.conversationId,
      leadId: result.leadId,
      funnelStage: result.funnelStage,
      intentScore: result.intentScore,
      channel,
      visitorId,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations (filterable by channel)' })
  @ApiResponse({ status: 200, description: 'Paginated conversation list' })
  async listConversations(
    @Request() req,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const params: any = { page: Number(page), limit: Math.min(Number(limit), 100) };
    if (channel) params.channel = channel;
    if (status) params.status = status;
    return this.chatService.getConversations(req.user.tenantId, params);
  }

  @Get('conversations/:id/history')
  @ApiOperation({ summary: 'Get conversation message history' })
  @ApiResponse({ status: 200, description: 'Message history' })
  async getHistory(@Request() req, @Param('id') id: string) {
    return this.chatService.getHistory(id, req.user.tenantId);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Register a webhook URL for outbound event notifications' })
  async registerWebhook(@Request() req, @Body() dto: ChannelWebhookDto) {
    const events = dto.events ? dto.events.split(',').map((e) => e.trim()) : ['*'];
    const endpoint = await this.webhookService.create(req.user.tenantId, dto.url, events);
    return { status: 'registered', id: endpoint.id, url: dto.url };
  }

  @Delete('webhooks')
  @ApiOperation({ summary: 'Remove a registered webhook' })
  async removeWebhook(@Request() req, @Query('id') id?: string) {
    if (id) {
      await this.webhookService.delete(id, req.user.tenantId);
    } else {
      const endpoints = await this.webhookService.findByTenant(req.user.tenantId);
      await Promise.all(endpoints.map((e) => this.webhookService.delete(e.id, req.user.tenantId)));
    }
    return { status: 'removed' };
  }

  private parseChannel(channel: string): ConversationChannel {
    const valid = Object.values(ConversationChannel);
    return (valid as string[]).includes(channel) ? (channel as ConversationChannel) : ConversationChannel.API;
  }

}
