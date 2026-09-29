import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Agent } from '../agents/agent.entity';
import { Conversation } from './conversation.entity';

interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & {
    user?: { userId: string; tenantId: string };
    publicConversations?: Set<string>;
  };
}

@WebSocketGateway({
  // origin:true is required — the public widget runs on arbitrary customer domains.
  // Auth is enforced per-connection in handleConnection (JWT or visitor binding),
  // not via cookies, so credentials are disabled.
  cors: { origin: true, credentials: false },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: string; tenantId: string }>(token);
        client.data.user = { userId: payload.sub, tenantId: payload.tenantId };
      } catch {
        // Invalid token — connection stays up as anonymous (public widget path only)
      }
    }
    this.logger.log(`Client connected: ${client.id}${client.data.user ? ' (authenticated)' : ''}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private markPublicConversation(client: AuthenticatedSocket, conversationId: string) {
    if (!client.data.publicConversations) client.data.publicConversations = new Set();
    client.data.publicConversations.add(conversationId);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { conversationId: string; visitorId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const conversation = await this.convRepo.findOne({ where: { id: data.conversationId } });
    if (!conversation) return { event: 'error', data: { message: 'Conversation not found' } };

    const user = client.data.user;
    if (user) {
      if (conversation.tenantId !== user.tenantId) {
        return { event: 'error', data: { message: 'Forbidden' } };
      }
    } else {
      // Anonymous (widget visitor) — must prove visitor ownership of the conversation,
      // or be rejoining a conversation this socket already created via send-public.
      const owns =
        client.data.publicConversations?.has(data.conversationId) ||
        (conversation.visitorId && conversation.visitorId === data.visitorId);
      if (!owns) return { event: 'error', data: { message: 'Forbidden' } };
    }

    client.join(data.conversationId);
    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('send')
  async handleSend(
    @MessageBody() data: { agentId: string; message: string; conversationId?: string; visitorId?: string; utmParams?: any; referrerUrl?: string; landingPageUrl?: string; regionContext?: { ip?: string; phone?: string; browserLanguage?: string; timezone?: string; userSelectedRegion?: string } },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) {
      return client.emit('error', { message: 'Authentication required' });
    }
    if (typeof data.message !== 'string' || !data.message.trim() || data.message.length > 4000) {
      return client.emit('error', { message: 'Invalid message' });
    }
    try {
      const result = await this.chatService.sendMessage(
        user.tenantId,
        data.agentId,
        data.message,
        data.conversationId,
        data.visitorId,
        true,
        { utmParams: data.utmParams, referrerUrl: data.referrerUrl, landingPageUrl: data.landingPageUrl },
        data.regionContext as any,
      );
      await this.emitReply(client, result, false);
    } catch {
      client.emit('error', { message: 'Something went wrong' });
    }
  }

  @SubscribeMessage('send-public')
  async handlePublicSend(
    @MessageBody() data: { agentId: string; message: string; visitorId: string; conversationId?: string; utmParams?: any; referrerUrl?: string; landingPageUrl?: string; regionContext?: { ip?: string; phone?: string; browserLanguage?: string; timezone?: string; userSelectedRegion?: string } },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (typeof data.message !== 'string' || !data.message.trim() || data.message.length > 4000) {
      return client.emit('error', { message: 'Invalid message' });
    }
    try {
      // Resolve the tenant server-side — never trust a client-supplied tenantId
      const agent = await this.agentRepo.findOne({ where: { id: data.agentId, isActive: true } });
      if (!agent) return client.emit('error', { message: 'Agent not found' });

      // A public client may only continue a conversation it owns
      if (data.conversationId) {
        const conv = await this.convRepo.findOne({
          where: { id: data.conversationId, tenantId: agent.tenantId, visitorId: data.visitorId },
        });
        if (!conv) return client.emit('error', { message: 'Conversation not found' });
      }

      const result = await this.chatService.sendMessage(
        agent.tenantId,
        agent.id,
        data.message,
        data.conversationId,
        data.visitorId,
        true,
        { utmParams: data.utmParams, referrerUrl: data.referrerUrl, landingPageUrl: data.landingPageUrl },
        data.regionContext as any,
      );
      await this.emitReply(client, result, true);
    } catch {
      client.emit('error', { message: 'Something went wrong' });
    }
  }

  private async emitReply(client: AuthenticatedSocket, result: any, isPublic: boolean) {
    if (result.conversationId) {
      client.join(result.conversationId);
      if (isPublic) this.markPublicConversation(client, result.conversationId);
    }

    client.emit('reply', {
      conversationId: result.conversationId,
      leadId: result.leadId,
      flow: result.flow,
      funnelStage: result.funnelStage,
      intentScore: result.intentScore,
      region: result.region,
    });

    const tokens = String(result.reply || '').split(/(\s+)/);
    for (const token of tokens) {
      client.emit('token', { conversationId: result.conversationId, token });
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    client.emit('done', { conversationId: result.conversationId });
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user && !client.data.publicConversations?.has(data.conversationId)) return;
    client.to(data.conversationId).emit('user-typing', { conversationId: data.conversationId });
  }
}
