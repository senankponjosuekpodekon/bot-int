import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { Conversation, ConversationChannel, ConversationStatus } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { LLMService } from './llm.service';
import { AgentsService } from '../agents/agents.service';
import { LeadsService } from '../leads/leads.service';
import { LeadTagService } from '../leads/lead-tag.service';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';
import { AgentFeedback } from './agent-feedback.entity';

type RepositoryMock<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createRepositoryMock = <T extends ObjectLiteral>(): RepositoryMock<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const noopService = () => new Proxy({}, { get: () => jest.fn().mockResolvedValue([]) });

describe('ChatService', () => {
  let service: ChatService;
  let convRepo: RepositoryMock<Conversation>;
  let msgRepo: RepositoryMock<Message>;
  let agentsService: { findById: jest.Mock };
  let llmService: { chat: jest.Mock };
  let leadsService: { create: jest.Mock; findById: jest.Mock };

  beforeEach(() => {
    convRepo = createRepositoryMock<Conversation>();
    msgRepo = createRepositoryMock<Message>();
    agentsService = { findById: jest.fn() };
    llmService = { chat: jest.fn() };
    leadsService = { create: jest.fn(), findById: jest.fn() };

    service = new ChatService(
      convRepo as unknown as Repository<Conversation>,
      msgRepo as unknown as Repository<Message>,
      { create: jest.fn(), find: jest.fn() } as any, // feedbackRepo
      agentsService as unknown as AgentsService,
      llmService as unknown as LLMService,
      leadsService as unknown as LeadsService,
      new LeadTagService(),
      noopService() as any, // knowledgeService
      noopService() as any, // productsService
      noopService() as any, // integrationsService
      noopService() as any, // flowsService
      noopService() as any, // intelligenceService
      { checkQuota: jest.fn().mockResolvedValue({ allowed: true }), incrementUsage: jest.fn().mockResolvedValue(undefined) } as any, // billingService
      { detectRegion: jest.fn().mockResolvedValue('international'), buildSystemPrompt: jest.fn().mockImplementation((base: string) => base), getProfile: jest.fn() } as any, // regionsService
      { trigger: jest.fn().mockResolvedValue(undefined) } as any, // webhookService
      { recallAsContext: jest.fn().mockResolvedValue(null), extractAndStore: jest.fn().mockResolvedValue(undefined), remember: jest.fn().mockResolvedValue(undefined) } as any, // agentMemoryService
      { detectAndExecuteTools: jest.fn().mockResolvedValue([]) } as any, // agentToolsService
      { findByTrigger: jest.fn().mockResolvedValue(null), execute: jest.fn().mockResolvedValue({ completed: true, output: '', handoff: false }) } as any, // agentWorkflowService
    );

    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('creates a new conversation, captures lead and returns the AI reply', async () => {
      const agent = { id: 'agent-1', systemPrompt: 'Helpful bot', tenantId: 't-1' } as Agent;
      const lead = { id: 'lead-1' } as Lead;
      const conversation = { id: 'conv-1', agentId: agent.id, tenantId: 't-1', leadId: undefined } as Conversation;

      agentsService.findById.mockResolvedValue(agent);
      convRepo.create?.mockReturnValue(conversation);
      convRepo.save?.mockResolvedValue(conversation);
      leadsService.create.mockResolvedValue(lead);
      convRepo.update?.mockResolvedValue(undefined);
      msgRepo.create?.mockImplementation((m: Partial<Message>) => ({ id: 'msg-1', ...m } as Message));
      msgRepo.save?.mockImplementation((m: any) => m);
      msgRepo.find?.mockImplementation((options: any) => {
        const where = options?.where ?? {};
        const conversationId = where.conversationId;
        const saved = conversationId === 'conv-1' ? [{ id: 'msg-1', role: MessageRole.USER, content: 'Salut', createdAt: new Date() }] : [];
        return Promise.resolve(saved);
      });
      llmService.chat.mockResolvedValue('Bonjour !');

      const result = await service.sendMessage('t-1', 'agent-1', 'Salut');

      expect(result.reply).toBe('Bonjour !');
      expect(result.conversationId).toBe('conv-1');
      expect(result.leadId).toBe('lead-1');
      expect(leadsService.create).toHaveBeenCalledWith('t-1', expect.objectContaining({ agentId: 'agent-1', source: 'chat' }));
    });

    it('uses an existing conversation and does not capture a second lead', async () => {
      const conversation = { id: 'conv-1', agentId: 'agent-1', tenantId: 't-1', leadId: 'lead-1' } as Conversation;
      const agent = { id: 'agent-1', systemPrompt: 'Helpful bot', tenantId: 't-1' } as Agent;

      agentsService.findById.mockResolvedValue(agent);
      convRepo.findOne?.mockResolvedValue(conversation);
      msgRepo.create?.mockImplementation((m: Partial<Message>) => ({ ...m } as Message));
      msgRepo.save?.mockImplementation((m: any) => m);
      msgRepo.find?.mockResolvedValue([
        { id: 'm-1', role: MessageRole.USER, content: 'Salut', createdAt: new Date() } as Message,
      ]);
      llmService.chat.mockResolvedValue('Comment puis-je vous aider ?');

      const result = await service.sendMessage('t-1', 'agent-1', 'Aide', 'conv-1');

      expect(result.reply).toBe('Comment puis-je vous aider ?');
      expect(result.conversationId).toBe('conv-1');
      expect(result.leadId).toBe('lead-1');
      expect(leadsService.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      const agent = { id: 'agent-1', systemPrompt: 'Helpful bot', tenantId: 't-1' } as Agent;
      agentsService.findById.mockResolvedValue(agent);
      convRepo.findOne?.mockResolvedValue(null);

      await expect(service.sendMessage('t-1', 'agent-1', 'Salut', 'missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getConversations', () => {
    it('returns paginated conversations with filters applied', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      convRepo.createQueryBuilder?.mockReturnValue(queryBuilder);

      await service.getConversations('t-1', { page: 2, limit: 12, status: ConversationStatus.OPEN, hasLead: true });

      expect(convRepo.createQueryBuilder).toHaveBeenCalledWith('conversation');
      expect(queryBuilder.skip).toHaveBeenCalledWith(12);
      expect(queryBuilder.take).toHaveBeenCalledWith(12);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('conversation.status = :status', { status: ConversationStatus.OPEN });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('conversation.leadId IS NOT NULL');
    });
  });

  describe('attachLead', () => {
    it('links a lead to a conversation', async () => {
      const conversation = { id: 'conv-1', tenantId: 't-1', leadId: undefined } as Conversation;
      const lead = { id: 'lead-1' } as Lead;

      convRepo.findOne?.mockResolvedValue(conversation);
      leadsService.findById.mockResolvedValue(lead);
      convRepo.save?.mockImplementation((c: any) => c);

      const result = await service.attachLead('conv-1', 't-1', 'lead-1');

      expect(result.leadId).toBe('lead-1');
      expect(result.lead).toBe(lead);
    });
  });

  describe('updateStatus', () => {
    it('updates the conversation status', async () => {
      const conversation = { id: 'conv-1', tenantId: 't-1', status: ConversationStatus.OPEN } as Conversation;

      convRepo.findOne?.mockResolvedValue(conversation);
      convRepo.save?.mockImplementation((c: any) => c);

      const result = await service.updateStatus('conv-1', 't-1', ConversationStatus.CLOSED);

      expect(result.status).toBe(ConversationStatus.CLOSED);
    });
  });
});
