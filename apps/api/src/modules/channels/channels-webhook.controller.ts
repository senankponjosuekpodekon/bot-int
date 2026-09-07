import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChannelAdapterService } from './channel-adapter.service';

@ApiTags('channels-webhooks')
@Controller('channels/webhooks')
export class ChannelsWebhookController {
  constructor(private readonly adapterService: ChannelAdapterService) {}

  @Get('whatsapp')
  @ApiOperation({ summary: 'WhatsApp webhook verification (Meta challenge)' })
  @ApiResponse({ status: 200, description: 'Challenge echoed' })
  verifyWhatsApp(@Query() query: Record<string, string>) {
    const challenge = this.adapterService.getChallengeResponse('whatsapp', query);
    if (!challenge) throw new UnauthorizedException();
    return challenge;
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Receive WhatsApp inbound messages' })
  @ApiResponse({ status: 200, description: 'Message processed' })
  async whatsappWebhook(
    @Query('agentId') agentId: string,
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    if (!agentId) throw new BadRequestException('agentId is required');
    return this.adapterService.handleInbound('whatsapp', agentId, body, signature, JSON.stringify(body));
  }

  @Get('instagram')
  @ApiOperation({ summary: 'Instagram webhook verification (Meta challenge)' })
  @ApiResponse({ status: 200, description: 'Challenge echoed' })
  verifyInstagram(@Query() query: Record<string, string>) {
    const challenge = this.adapterService.getChallengeResponse('instagram', query);
    if (!challenge) throw new UnauthorizedException();
    return challenge;
  }

  @Post('instagram')
  @ApiOperation({ summary: 'Receive Instagram inbound messages' })
  @ApiResponse({ status: 200, description: 'Message processed' })
  async instagramWebhook(
    @Query('agentId') agentId: string,
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    if (!agentId) throw new BadRequestException('agentId is required');
    return this.adapterService.handleInbound('instagram', agentId, body, signature, JSON.stringify(body));
  }

  @Post('widget')
  @ApiOperation({ summary: 'Public widget webhook for external widget integrations' })
  @ApiResponse({ status: 200, description: 'Message processed' })
  async widgetWebhook(@Query('agentId') agentId: string, @Body() body: any) {
    if (!agentId) throw new BadRequestException('agentId is required');
    return this.adapterService.handleInbound('web', agentId, body);
  }
}
