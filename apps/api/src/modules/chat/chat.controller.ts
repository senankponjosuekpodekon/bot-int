import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class SendMessageDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() visitorId?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  send(@Request() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(
      req.user.tenantId,
      dto.agentId,
      dto.message,
      dto.conversationId,
      dto.visitorId,
    );
  }

  @Get('conversations')
  getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.tenantId);
  }

  @Get('history/:conversationId')
  getHistory(@Request() req, @Param('conversationId') id: string) {
    return this.chatService.getHistory(id, req.user.tenantId);
  }
}
