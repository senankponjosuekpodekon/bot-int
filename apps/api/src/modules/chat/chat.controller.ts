import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AttachLeadDto } from './dto/attach-lead.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';

class SendMessageDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() visitorId?: string;
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  captureLead?: boolean;
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
      dto.captureLead,
    );
  }

  @Get('conversations')
  getConversations(@Request() req, @Query() query: ListConversationsDto) {
    return this.chatService.getConversations(req.user.tenantId, query);
  }

  @Get('history/:conversationId')
  getHistory(@Request() req, @Param('conversationId') id: string) {
    return this.chatService.getHistory(id, req.user.tenantId);
  }

  @Patch(':conversationId/lead')
  attachLead(
    @Request() req,
    @Param('conversationId') id: string,
    @Body() dto: AttachLeadDto,
  ) {
    return this.chatService.attachLead(id, req.user.tenantId, dto.leadId);
  }

  @Patch(':conversationId/status')
  updateStatus(
    @Request() req,
    @Param('conversationId') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.chatService.updateStatus(id, req.user.tenantId, dto.status);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadFile(@UploadedFile() file: any) {
    if (!file) return { error: 'No file provided' };
    return {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`,
    };
  }

  @Post('feedback')
  createFeedback(
    @Request() req,
    @Body() body: { agentId: string; userMessage: string; originalReply: string; correctedReply: string; reason?: string },
  ) {
    return this.chatService.createFeedback(
      req.user.tenantId,
      body.agentId,
      body.userMessage,
      body.originalReply,
      body.correctedReply,
      body.reason,
    );
  }

  @Get('feedback')
  getFeedback(@Request() req, @Query('agentId') agentId?: string) {
    return this.chatService.getFeedback(req.user.tenantId, agentId);
  }

  @Delete('feedback/:id')
  deleteFeedback(@Request() req, @Param('id') id: string) {
    return this.chatService.deleteFeedback(id, req.user.tenantId);
  }
}
