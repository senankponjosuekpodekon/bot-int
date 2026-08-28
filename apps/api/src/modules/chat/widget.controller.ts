import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { Agent } from '../agents/agent.entity';
import { ChatService } from './chat.service';
import { ChatEventsService } from './chat-events.service';
import { Conversation } from './conversation.entity';
import { WidgetSendDto } from './dto/widget-send.dto';

const EMBED_JS = `
(function () {
  const script = document.currentScript;
  const rawAgentId = script?.getAttribute('data-agent') || script?.getAttribute('data-agent-id') || window.BOTINT_AGENT_ID;
  const agentId = (rawAgentId || '').toString().trim();

  if (!agentId || agentId === 'undefined' || agentId === 'null') {
    console.error('BotInt widget: data-agent is required');
    return;
  }

  const baseUrl = (script?.getAttribute('data-api') || script?.getAttribute('data-api-url') || window.BOTINT_API_URL || '').replace(/\\/$/, '') || '';
  const language = script?.getAttribute('data-language') || 'fr';
  const position = script?.getAttribute('data-position') || 'right';
  const color = script?.getAttribute('data-color') || '#111';
  const title = script?.getAttribute('data-title') || 'Assistant';

  const storageKey = 'botint_' + agentId.replace(/[^a-zA-Z0-9]/g, '_');
  const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
  const visitorId = state.visitorId || ('widget_' + Math.random().toString(36).slice(2, 10));
  let conversationId = state.conversationId || undefined;
  localStorage.setItem(storageKey, JSON.stringify({ ...state, visitorId }));

  const css = document.createElement('style');
  css.textContent = \`
    .botint-widget { position: fixed; \${position === 'bottom-left' || position === 'left' ? 'left: 20px' : 'right: 20px'}; bottom: 20px; z-index: 9999; font-family: system-ui, sans-serif; }
    .botint-bubble { width: 56px; height: 56px; border-radius: 50%; background: \${color}; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .botint-panel { position: absolute; bottom: 70px; \${position === 'bottom-left' || position === 'left' ? 'left: 0' : 'right: 0'}; width: 320px; height: 420px; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; }
    .botint-header { padding: 14px 16px; background: \${color}; color: #fff; font-weight: 600; }
    .botint-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .botint-msg { max-width: 80%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
    .botint-msg.user { align-self: flex-end; background: \${color}; color: #fff; border-bottom-right-radius: 2px; }
    .botint-msg.bot { align-self: flex-start; background: #f3f4f6; color: #111; border-bottom-left-radius: 2px; }
    .botint-input-row { display: flex; padding: 10px; border-top: 1px solid #e5e7eb; gap: 8px; }
    .botint-input { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    .botint-send { padding: 10px 14px; background: \${color}; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
  \`;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.className = 'botint-widget';
  root.innerHTML = \`
    <div class="botint-panel" id="botint-panel">
      <div class="botint-header">\${title}</div>
      <div class="botint-messages" id="botint-messages"></div>
      <form class="botint-input-row" id="botint-form">
        <input class="botint-input" id="botint-input" type="text" placeholder="\${language === 'en' ? 'Type a message...' : 'Écrivez un message...'}" autocomplete="off" />
        <button class="botint-send" type="submit">→</button>
      </form>
    </div>
    <div class="botint-bubble" id="botint-bubble">💬</div>
  \`;
  document.body.appendChild(root);

  const bubble = document.getElementById('botint-bubble');
  const panel = document.getElementById('botint-panel');
  const messages = document.getElementById('botint-messages');
  const form = document.getElementById('botint-form');
  const input = document.getElementById('botint-input');

  let open = false;
  bubble.addEventListener('click', () => {
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
  });

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'botint-msg ' + (role === 'user' ? 'user' : 'bot');
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  async function send(text) {
    addMessage('user', text);
    form.querySelector('button').disabled = true;
    try {
      const res = await fetch(baseUrl + '/widget/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: text,
          conversationId,
          visitorId,
          metadata: { source: 'widget', language },
        }),
      });
      const data = await res.json();
      if (data.reply) {
        addMessage('bot', data.reply);
        if (data.conversationId && data.conversationId !== conversationId) {
          conversationId = data.conversationId;
          localStorage.setItem(storageKey, JSON.stringify({ visitorId, conversationId }));
        }
      } else {
        addMessage('bot', language === 'en' ? 'Sorry, something went wrong.' : 'Désolé, une erreur est survenue.');
      }
    } catch (err) {
      addMessage('bot', language === 'en' ? 'Unable to reach the assistant.' : 'Impossible de joindre l\'assistant.');
    } finally {
      form.querySelector('button').disabled = false;
      input.value = '';
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send(text);
  });
})();
`;

@Controller('widget')
export class WidgetController {
  constructor(
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    private readonly chatService: ChatService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  @Get('widget.js')
  getWidgetScript(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(EMBED_JS);
  }

  @Get('embed.js')
  getEmbedScript(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(EMBED_JS);
  }

  @Get('config/:agentId')
  async getWidgetConfig(@Param('agentId') agentId: string) {
    if (!/^[0-9a-fA-F-]{36}$/.test(agentId)) {
      throw new NotFoundException('Agent not found');
    }
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    return {
      id: agent.id,
      name: agent.name,
      color: '#4f46e5',
      language: 'fr',
    };
  }

  @Get('demo/:agentId')
  async getDemoPage(
    @Param('agentId') agentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
    const apiUrl = `${protocol}://${req.headers.host}/api`;
    const color = '#4f46e5';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BotInt Widget – ${agent.name}</title>
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
    <h1>${agent.name}</h1>
    <p>Page de démonstration du widget BotInt. Cliquez sur la bulle en bas à droite pour ouvrir le chat.</p>
    <a class="cta" href="${apiUrl}/widget/embed.js" target="_blank">Voir le script</a>
  </div>
  <div class="embed">
    <h2>Code d'intégration</h2>
    <pre id="code">&lt;script src="${apiUrl}/widget/embed.js"
  data-agent="${agent.id}"
  data-api="${apiUrl}"
  data-color="${color}"
  data-title="${agent.name}"
  data-position="bottom-right"&gt;
&lt;/script&gt;</pre>
  </div>
  <script src="${apiUrl}/widget/embed.js"
    data-agent="${agent.id}"
    data-api="${apiUrl}"
    data-color="${color}"
    data-title="${agent.name}"
    data-position="bottom-right"></script>
</body>
</html>`);
  }

  @Post('send')
  async widgetSend(@Body() dto: WidgetSendDto, @Headers('x-forwarded-for') ip?: string) {
    const agent = await this.agentRepo.findOne({ where: { id: dto.agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.chatService.sendMessage(
      agent.tenantId,
      agent.id,
      dto.message,
      dto.conversationId,
      dto.visitorId,
      true,
      {
        utmParams: dto.utmParams,
        referrerUrl: dto.referrerUrl,
        landingPageUrl: dto.landingPageUrl,
      },
      { ip },
      dto.clientInfo,
    );
  }

  @Get('history/:conversationId')
  async getHistory(@Param('conversationId') id: string) {
    const conversation = await this.convRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.chatService.getHistory(id, conversation.tenantId);
  }

  @Get('events/:conversationId')
  streamEvents(@Param('conversationId') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onMessage = (payload: any) => {
      res.write(`data: ${JSON.stringify({ event: 'new-message', ...payload })}
\n`);
    };
    const onTyping = (payload: any) => {
      res.write(`data: ${JSON.stringify({ event: 'typing', ...payload })}
\n`);
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
  visitorTyping(
    @Param('conversationId') id: string,
    @Body() body: { who?: string },
  ) {
    this.chatEvents.emitTyping(id, { who: body?.who || 'visitor' });
    return { ok: true };
  }
}
