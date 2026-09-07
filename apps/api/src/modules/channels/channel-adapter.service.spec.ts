import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ChannelAdapterService } from './channel-adapter.service';
import { ConversationChannel } from '../chat/conversation.entity';

describe('ChannelAdapterService', () => {
  let service: ChannelAdapterService;
  let mockAgentRepo: any;
  let mockChatService: any;
  let mockConfig: any;

  beforeEach(() => {
    mockAgentRepo = { findOne: jest.fn() };
    mockChatService = { sendMessage: jest.fn() };
    mockConfig = { get: jest.fn() };
    service = new ChannelAdapterService(mockAgentRepo, mockChatService, mockConfig);
  });

  it('lists supported channels', () => {
    expect(service.getSupportedChannels()).toEqual([
      ConversationChannel.WEB,
      ConversationChannel.WHATSAPP,
      ConversationChannel.INSTAGRAM,
    ]);
  });

  describe('normalizeMessage', () => {
    it('normalizes a widget payload', async () => {
      const result = await service.normalizeMessage('web', 't-1', { visitorId: 'v-1', text: 'hello' });
      expect(result).toEqual({ visitorId: 'v-1', text: 'hello', channel: 'web', metadata: {} });
    });

    it('normalizes a WhatsApp text payload', async () => {
      const payload = {
        entry: [{
          changes: [{
            value: {
              metadata: { phone_number_id: '123' },
              messages: [{
                from: '33612345678',
                id: 'msg-1',
                type: 'text',
                timestamp: '1234567890',
                text: { body: 'Bonjour' },
              }],
            },
          }],
        }],
      };
      const result = await service.normalizeMessage('whatsapp', 't-1', payload);
      expect(result.visitorId).toBe('33612345678');
      expect(result.text).toBe('Bonjour');
      expect(result.channel).toBe('whatsapp');
    });

    it('normalizes an Instagram text payload', async () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'ig-user-1' },
            message: { mid: 'mid-1', text: 'Hello' },
            timestamp: '1234567890',
          }],
        }],
      };
      const result = await service.normalizeMessage('instagram', 't-1', payload);
      expect(result.visitorId).toBe('ig-user-1');
      expect(result.text).toBe('Hello');
      expect(result.channel).toBe('instagram');
    });

    it('throws on unsupported channel', async () => {
      await expect(service.normalizeMessage('sms', 't-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('getChallengeResponse', () => {
    it('returns the challenge when token matches', () => {
      mockConfig.get.mockReturnValue('my-token');
      const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'my-token', 'hub.challenge': '123' };
      expect(service.getChallengeResponse('whatsapp', query)).toBe('123');
    });

    it('returns null when mode is not subscribe', () => {
      mockConfig.get.mockReturnValue('my-token');
      const query = { 'hub.mode': 'denied', 'hub.verify_token': 'my-token', 'hub.challenge': '123' };
      expect(service.getChallengeResponse('whatsapp', query)).toBeNull();
    });

    it('returns null when token does not match', () => {
      mockConfig.get.mockReturnValue('my-token');
      const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '123' };
      expect(service.getChallengeResponse('whatsapp', query)).toBeNull();
    });
  });

  describe('handleInbound', () => {
    it('dispatches a widget message to ChatService with the right channel', async () => {
      mockAgentRepo.findOne.mockResolvedValue({ id: 'agent-1', tenantId: 't-1', isActive: true });
      mockChatService.sendMessage.mockResolvedValue({ reply: 'Hi', conversationId: 'c-1' });

      const result = await service.handleInbound('web', 'agent-1', { visitorId: 'v-1', text: 'hello' });

      expect(mockAgentRepo.findOne).toHaveBeenCalledWith({ where: { id: 'agent-1', isActive: true } });
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        't-1',
        'agent-1',
        'hello',
        undefined,
        'v-1',
        true,
        undefined,
        undefined,
        {},
        ConversationChannel.WEB,
      );
      expect(result).toEqual({ reply: 'Hi', conversationId: 'c-1' });
    });

    it('dispatches an Instagram message to ChatService', async () => {
      mockAgentRepo.findOne.mockResolvedValue({ id: 'agent-1', tenantId: 't-1', isActive: true });
      mockChatService.sendMessage.mockResolvedValue({ reply: 'Hi', conversationId: 'c-1' });

      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'ig-user-1' },
            message: { mid: 'mid-1', text: 'Yo' },
            timestamp: '1234567890',
          }],
        }],
      };

      await service.handleInbound('instagram', 'agent-1', payload);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        't-1',
        'agent-1',
        'Yo',
        undefined,
        'ig-user-1',
        true,
        undefined,
        undefined,
        expect.any(Object),
        ConversationChannel.INSTAGRAM,
      );
    });

    it('throws NotFoundException when agent is inactive or missing', async () => {
      mockAgentRepo.findOne.mockResolvedValue(null);
      await expect(service.handleInbound('web', 'agent-1', { visitorId: 'v-1', text: 'hi' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for unsupported channel', async () => {
      await expect(service.handleInbound('telegram', 'agent-1', {})).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid WhatsApp signature', async () => {
      mockConfig.get.mockImplementation((key: string) => key === 'WHATSAPP_WEBHOOK_SECRET' ? 'secret' : undefined);
      const payload = { object: 'whatsapp_business_account' };
      const rawBody = JSON.stringify(payload);
      const signature = 'sha256=invalid';

      await expect(service.handleInbound('whatsapp', 'agent-1', payload, signature, rawBody)).rejects.toThrow(UnauthorizedException);
    });
  });
});
