import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttachLeadDto } from './dto/attach-lead.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { OperatorReplyDto } from './dto/operator-reply.dto';

class SendMessageDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() visitorId?: string;
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  captureLead?: boolean;
  @IsOptional()
  regionContext?: { ip?: string; phone?: string; browserLanguage?: string; timezone?: string; userSelectedRegion?: string };
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a message to an agent' })
  @ApiResponse({ status: 200, description: 'AI reply with conversation + lead info' })
  send(@Request() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(
      req.user.tenantId,
      dto.agentId,
      dto.message,
      dto.conversationId,
      dto.visitorId,
      dto.captureLead,
      undefined,
      dto.regionContext as any,
    );
  }

  @Get('operator/inbox')
  @ApiOperation({ summary: 'List conversations handed off to human operators' })
  @ApiResponse({ status: 200, description: 'Paginated list of conversations needing attention' })
  getOperatorInbox(@Request() req, @Query() query: ListConversationsDto) {
    return this.chatService.getConversations(req.user.tenantId, {
      ...query,
      status: 'handed_off' as any,
    });
  }

  @Post('operator/:conversationId/take')
  @ApiOperation({ summary: 'Operator takes over a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation status set to open' })
  takeConversation(@Request() req, @Param('conversationId') id: string) {
    return this.chatService.takeConversation(id, req.user.tenantId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get dashboard KPIs and analytics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  getAnalytics(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.chatService.getDashboardMetrics(req.user.tenantId, from, to);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of conversations' })
  getConversations(@Request() req, @Query() query: ListConversationsDto) {
    return this.chatService.getConversations(req.user.tenantId, query);
  }

  @Get('history/:conversationId')
  @ApiOperation({ summary: 'Get conversation message history' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  getHistory(@Request() req, @Param('conversationId') id: string) {
    return this.chatService.getHistory(id, req.user.tenantId);
  }

  @Get('transcript/:conversationId')
  @ApiOperation({ summary: 'Export conversation transcript' })
  @ApiResponse({ status: 200, description: 'Conversation transcript with messages' })
  exportTranscript(@Request() req, @Param('conversationId') id: string) {
    return this.chatService.exportTranscript(id, req.user.tenantId);
  }

  @Patch(':conversationId/lead')
  @ApiOperation({ summary: 'Attach a lead to a conversation' })
  @ApiResponse({ status: 200, description: 'Lead attached' })
  attachLead(
    @Request() req,
    @Param('conversationId') id: string,
    @Body() dto: AttachLeadDto,
  ) {
    return this.chatService.attachLead(id, req.user.tenantId, dto.leadId);
  }

  @Patch(':conversationId/status')
  @ApiOperation({ summary: 'Update conversation status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Request() req,
    @Param('conversationId') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.chatService.updateStatus(id, req.user.tenantId, dto.status);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file attachment' })
  @ApiResponse({ status: 200, description: 'File uploaded' })
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
  @ApiOperation({ summary: 'Create feedback correction for an agent reply' })
  @ApiResponse({ status: 201, description: 'Feedback created' })
  createFeedback(
    @Request() req,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.chatService.createFeedback(
      req.user.tenantId,
      dto.agentId,
      dto.userMessage,
      dto.originalReply,
      dto.correctedReply,
      dto.reason,
    );
  }

  @Get('feedback')
  @ApiOperation({ summary: 'List feedback for a tenant' })
  @ApiResponse({ status: 200, description: 'List of feedback entries' })
  getFeedback(@Request() req, @Query('agentId') agentId?: string) {
    return this.chatService.getFeedback(req.user.tenantId, agentId);
  }

  @Delete('feedback/:id')
  @ApiOperation({ summary: 'Delete feedback by ID' })
  @ApiResponse({ status: 200, description: 'Feedback deleted' })
  deleteFeedback(@Request() req, @Param('id') id: string) {
    return this.chatService.deleteFeedback(id, req.user.tenantId);
  }

  @Post(':id/take')
  @ApiOperation({ summary: 'Operator takes over a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation status set to handed off' })
  take(@Request() req, @Param('id') id: string) {
    return this.chatService.takeConversation(id, req.user.tenantId);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Operator hands the conversation back to the AI' })
  @ApiResponse({ status: 200, description: 'Conversation status set to open' })
  release(@Request() req, @Param('id') id: string) {
    return this.chatService.releaseConversation(id, req.user.tenantId);
  }

  @Post(':id/operator')
  @ApiOperation({ summary: 'Post a human operator reply to a conversation' })
  @ApiResponse({ status: 201, description: 'Operator reply saved' })
  operatorReply(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: OperatorReplyDto,
  ) {
    return this.chatService.operatorReply(id, req.user.tenantId, dto.message);
  }

  @Post(':id/suggest')
  @ApiOperation({ summary: 'Suggest an AI reply for the operator' })
  @ApiResponse({ status: 200, description: 'AI suggestion' })
  suggestReply(@Request() req, @Param('id') id: string) {
    return this.chatService.suggestReply(id, req.user.tenantId);
  }

  @Post('stream')
  @ApiOperation({ summary: 'Send a message and stream the reply as SSE' })
  @ApiResponse({ status: 200, description: 'Server-sent events with reply chunks' })
  async stream(
    @Request() req,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await this.chatService.sendMessage(
      req.user.tenantId,
      dto.agentId,
      dto.message,
      dto.conversationId,
      dto.visitorId,
      dto.captureLead,
      undefined,
      dto.regionContext as any,
    );

    res.write(`data: ${JSON.stringify({ meta: { conversationId: result.conversationId, leadId: result.leadId, flow: result.flow, funnelStage: result.funnelStage, intentScore: result.intentScore, region: result.region } })}\n\n`);

    const words = result.reply.split(/\s+/).filter(Boolean);
    for (const chunk of words) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, reply: result.reply })}\n\n`);
    res.end();
  }
}
