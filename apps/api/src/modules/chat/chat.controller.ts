import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttachLeadDto } from './dto/attach-lead.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

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
}
