import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WidgetService } from './widget.service';
import { SurveysService } from '../surveys/surveys.service';
import { SurveyType } from '../surveys/survey.entity';
import { ChatEventsService } from '../chat/chat-events.service';
import { IsNotEmpty, IsOptional, IsString, IsArray, MaxLength } from 'class-validator';
import { Request, Response } from 'express';
import { EMBED_SCRIPT } from './embed-script';
import { TurnstileService } from '../../common/turnstile.service';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

class PublicSendMessageDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() @MaxLength(4000) message: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsNotEmpty() visitorId: string;
  @IsOptional() utmParams?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  @IsString() @IsOptional() referrerUrl?: string;
  @IsString() @IsOptional() landingPageUrl?: string;
  @IsString() @IsOptional() turnstileToken?: string;
}

class PublicFlowResponseDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() conversationId: string;
  @IsString() @IsNotEmpty() flowId: string;
  @IsString() @IsNotEmpty() visitorId: string;
  responses: Record<string, string>;
  @IsString() @IsOptional() turnstileToken?: string;
}

class PublicSurveySubmitDto {
  @IsString() @IsNotEmpty() surveyId: string;
  @IsString() @IsNotEmpty() visitorId: string;
  @IsString() @IsOptional() agentId?: string;
  @IsArray() answers: { questionId: string; value: string | string[] | number }[];
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() leadId?: string;
  @IsString() @IsOptional() turnstileToken?: string;
}

@Controller('widget')
export class WidgetController {
  constructor(
    private readonly service: WidgetService,
    private readonly surveysService: SurveysService,
    private readonly chatEvents: ChatEventsService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Get('config/:agentId')
  getConfig(@Param('agentId') agentId: string) {
    return this.service.getPublicConfig(agentId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('send')
  async send(@Body() dto: PublicSendMessageDto, @Req() req: Request) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    return this.service.sendPublicMessage(dto.agentId, dto.message, dto.visitorId, dto.conversationId, dto.utmParams, dto.referrerUrl, dto.landingPageUrl);
  }

  @Get('history/:id')
  history(@Param('id') id: string, @Query('visitorId') visitorId: string) {
    return this.service.resolvePublicHistory(id, visitorId);
  }

  @Get('events/:conversationId')
  async streamEvents(
    @Param('conversationId') id: string,
    @Query('visitorId') visitorId: string | undefined,
    @Res() res: Response,
  ) {
    // Visitor-bound: a public client must prove ownership of the conversation.
    await this.service.assertPublicConversation(id, visitorId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onMessage = (payload: any) => {
      res.write(`data: ${JSON.stringify({ event: 'new-message', ...payload })}\n\n`);
    };
    const onTyping = (payload: any) => {
      res.write(`data: ${JSON.stringify({ event: 'typing', ...payload })}\n\n`);
    };

    this.chatEvents.onMessage(id, onMessage);
    this.chatEvents.onTyping(id, onTyping);

    res.on('close', () => {
      this.chatEvents.offMessage(id, onMessage);
      this.chatEvents.offTyping(id, onTyping);
      res.end();
    });
  }

  @Post('typing/:conversationId')
  async visitorTyping(
    @Param('conversationId') id: string,
    @Body() body: { who?: string; visitorId?: string },
  ) {
    await this.service.assertPublicConversation(id, body?.visitorId);
    this.chatEvents.emitTyping(id, { who: body?.who || 'visitor' });
    return { ok: true };
  }

  // Legacy script path — kept for backward compatibility with existing embeds.
  @Get('widget.js')
  legacyWidgetScript(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(EMBED_SCRIPT);
  }

  @Get('demo/:agentId')
  async getDemoPage(
    @Param('agentId') agentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const agent = await this.service.getAgentConfig(agentId);

    const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
    const apiUrl = `${protocol}://${req.headers.host}/api`;
    const color = '#4f46e5';
    const name = escapeHtml(agent.name);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BotInt Widget – ${name}</title>
  <style>
    body { margin: 0; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; color: #111; background: #f8fafc; }
    .hero { padding: 80px 24px; text-align: center; }
    .hero h1 { font-size: 2rem; margin: 0 0 12px; }
    .hero p { color: #64748b; max-width: 560px; margin: 0 auto 32px; }
    .cta { display: inline-block; padding: 12px 24px; background: ${color}; color: #fff; border-radius: 999px; text-decoration: none; font-weight: 600; }
    .embed { max-width: 680px; margin: 48px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .embed h2 { margin: 0 0 12px; font-size: 1rem; }
    .embed pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 12px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${name}</h1>
    <p>Page de démonstration du widget BotInt. Cliquez sur la bulle en bas à droite pour ouvrir le chat.</p>
    <a class="cta" href="${apiUrl}/widget/embed.js" target="_blank">Voir le script</a>
  </div>
  <div class="embed">
    <h2>Code d'intégration</h2>
    <pre id="code">&lt;script src="${apiUrl}/widget/embed.js"
  data-agent="${agent.id}"
  data-api="${apiUrl}"
  data-color="${color}"
  data-title="${name}"
  data-position="bottom-right"&gt;
&lt;/script&gt;</pre>
  </div>
  <script src="${apiUrl}/widget/embed.js"
    data-agent="${agent.id}"
    data-api="${apiUrl}"
    data-color="${color}"
    data-title="${name}"
    data-position="bottom-right"></script>
</body>
</html>`);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('flow-response')
  async flowResponse(@Body() dto: PublicFlowResponseDto, @Req() req: Request) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    return this.service.submitFlowResponse(dto.agentId, dto.conversationId, dto.flowId, dto.responses, dto.visitorId);
  }

  @Get('embed.js')
  embedScript(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(EMBED_SCRIPT);
  }

  @Get('survey/:agentId')
  async getActiveSurvey(@Param('agentId') agentId: string) {
    const config = await this.service.getAgentConfig(agentId);
    const survey = await this.surveysService.getActiveByType(config.tenantId, SurveyType.PRE_PURCHASE, agentId);
    return survey || { active: false };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('survey/submit')
  async submitSurvey(@Body() dto: PublicSurveySubmitDto, @Req() req: Request) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    const config = await this.service.getAgentConfig(dto.agentId || '');
    return this.surveysService.submit(config.tenantId, dto.surveyId, dto.answers, {
      visitorId: dto.visitorId,
      conversationId: dto.conversationId,
      leadId: dto.leadId,
      source: 'widget',
    });
  }
}
