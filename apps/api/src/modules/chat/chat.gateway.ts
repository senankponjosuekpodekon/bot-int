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
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.conversationId);
    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('send')
  async handleSend(
    @MessageBody() data: { tenantId: string; agentId: string; message: string; conversationId?: string; visitorId?: string; utmParams?: any; referrerUrl?: string; landingPageUrl?: string; regionContext?: { ip?: string; phone?: string; browserLanguage?: string; timezone?: string; userSelectedRegion?: string } },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.chatService.sendMessage(
        data.tenantId,
        data.agentId,
        data.message,
        data.conversationId,
        data.visitorId,
        true,
        { utmParams: data.utmParams, referrerUrl: data.referrerUrl, landingPageUrl: data.landingPageUrl },
        data.regionContext as any,
      );

      if (result.conversationId) {
        client.join(result.conversationId);
      }

      client.emit('reply', {
        conversationId: result.conversationId,
        leadId: result.leadId,
        flow: result.flow,
        funnelStage: result.funnelStage,
        intentScore: result.intentScore,
        region: result.region,
      });

      // Stream the reply token by token
      const fullReply = result.reply;
      const tokens = fullReply.split(/(\s+)/);

      for (const token of tokens) {
        client.emit('token', { conversationId: result.conversationId, token });
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      client.emit('done', { conversationId: result.conversationId });
    } catch (err: any) {
      client.emit('error', { message: err?.message || 'Something went wrong' });
    }
  }

  @SubscribeMessage('send-public')
  async handlePublicSend(
    @MessageBody() data: { agentId: string; message: string; visitorId: string; conversationId?: string; utmParams?: any; referrerUrl?: string; landingPageUrl?: string; regionContext?: { ip?: string; phone?: string; browserLanguage?: string; timezone?: string; userSelectedRegion?: string } },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Look up tenant from agent
      const result = await this.chatService.sendMessage(
        undefined as any,
        data.agentId,
        data.message,
        data.conversationId,
        data.visitorId,
        true,
        { utmParams: data.utmParams, referrerUrl: data.referrerUrl, landingPageUrl: data.landingPageUrl },
        data.regionContext as any,
      );

      if (result.conversationId) {
        client.join(result.conversationId);
      }

      client.emit('reply', {
        conversationId: result.conversationId,
        leadId: result.leadId,
        flow: result.flow,
        funnelStage: result.funnelStage,
        intentScore: result.intentScore,
        region: result.region,
      });

      const fullReply = result.reply;
      const tokens = fullReply.split(/(\s+)/);

      for (const token of tokens) {
        client.emit('token', { conversationId: result.conversationId, token });
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      client.emit('done', { conversationId: result.conversationId });
    } catch (err: any) {
      client.emit('error', { message: err?.message || 'Something went wrong' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.conversationId).emit('user-typing', { conversationId: data.conversationId });
  }
}
