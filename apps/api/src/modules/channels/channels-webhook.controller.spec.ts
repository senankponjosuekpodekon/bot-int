import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ChannelsWebhookController } from './channels-webhook.controller';

describe('ChannelsWebhookController', () => {
  let controller: ChannelsWebhookController;
  let mockAdapterService: any;

  beforeEach(() => {
    mockAdapterService = {
      getChallengeResponse: jest.fn(),
      handleInbound: jest.fn().mockResolvedValue({ reply: 'ok', conversationId: 'c-1' }),
    };
    controller = new ChannelsWebhookController(mockAdapterService);
  });

  describe('WhatsApp', () => {
    it('echoes the challenge on GET', () => {
      mockAdapterService.getChallengeResponse.mockReturnValue('123');
      const result = controller.verifyWhatsApp({ 'hub.mode': 'subscribe', 'hub.challenge': '123' } as any);
      expect(result).toBe('123');
      expect(mockAdapterService.getChallengeResponse).toHaveBeenCalledWith('whatsapp', {
        'hub.mode': 'subscribe',
        'hub.challenge': '123',
      });
    });

    it('throws UnauthorizedException when challenge is null', () => {
      mockAdapterService.getChallengeResponse.mockReturnValue(null);
      expect(() => controller.verifyWhatsApp({} as any)).toThrow(UnauthorizedException);
    });

    it('processes inbound message on POST', async () => {
      const body = { object: 'whatsapp_business_account', entry: [] };
      const result = await controller.whatsappWebhook('agent-1', body, 'signature');
      expect(mockAdapterService.handleInbound).toHaveBeenCalledWith('whatsapp', 'agent-1', body, 'signature', JSON.stringify(body));
      expect(result).toEqual({ reply: 'ok', conversationId: 'c-1' });
    });

    it('requires agentId', async () => {
      await expect(controller.whatsappWebhook('', {}, undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Instagram', () => {
    it('echoes the challenge on GET', () => {
      mockAdapterService.getChallengeResponse.mockReturnValue('456');
      const result = controller.verifyInstagram({ 'hub.mode': 'subscribe', 'hub.challenge': '456' } as any);
      expect(result).toBe('456');
    });

    it('processes inbound message on POST', async () => {
      const body = { object: 'instagram', entry: [] };
      const result = await controller.instagramWebhook('agent-2', body, 'signature');
      expect(mockAdapterService.handleInbound).toHaveBeenCalledWith('instagram', 'agent-2', body, 'signature', JSON.stringify(body));
      expect(result).toEqual({ reply: 'ok', conversationId: 'c-1' });
    });

    it('requires agentId', async () => {
      await expect(controller.instagramWebhook('', {}, undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Widget', () => {
    it('processes inbound message', async () => {
      const body = { visitorId: 'v-1', text: 'hello' };
      const result = await controller.widgetWebhook('agent-3', body);
      expect(mockAdapterService.handleInbound).toHaveBeenCalledWith('web', 'agent-3', body);
      expect(result).toEqual({ reply: 'ok', conversationId: 'c-1' });
    });

    it('requires agentId', async () => {
      await expect(controller.widgetWebhook('', {})).rejects.toThrow(BadRequestException);
    });
  });
});
