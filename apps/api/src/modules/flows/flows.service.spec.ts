import { NotFoundException } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { FlowExecution, FlowExecutionStatus, FlowExecutionTrigger } from './flow-execution.entity';

describe('FlowsService', () => {
  let service: FlowsService;
  let mockFlowRepo: any;
  let mockExecutionRepo: any;
  let mockActionExecutor: any;

  beforeEach(() => {
    mockActionExecutor = { execute: jest.fn().mockResolvedValue([]) };
    mockFlowRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'flow-1' })),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockExecutionRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'exec-1' })),
    };
    service = new FlowsService(mockFlowRepo, mockExecutionRepo, mockActionExecutor);
  });

  describe('processFlowResponse', () => {
    it('extracts data and creates a completed execution record', async () => {
      mockFlowRepo.findOne.mockResolvedValue({
        id: 'flow-1',
        tenantId: 't-1',
        agentId: 'agent-1',
        title: 'Contact',
        fields: [
          { id: 'email', type: 'email', label: 'Email' },
          { id: 'name', type: 'text', label: 'Nom' },
        ],
      });

      const result = await service.processFlowResponse('t-1', 'conv-1', 'flow-1', {
        email: 'test@example.com',
        name: 'Alice',
      });

      expect(result.extractedData.email).toBe('test@example.com');
      expect(result.extractedData.name).toBe('Alice');
      expect(result.summary).toContain('Email: test@example.com');
      expect(result.actionResults).toEqual([]);
      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          tenantId: 't-1',
          agentId: 'agent-1',
          flowId: 'flow-1',
          conversationId: 'conv-1',
          extractedData: result.extractedData,
          summary: result.summary,
        }),
      );
      expect(mockExecutionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-1',
          flowId: 'flow-1',
          agentId: 'agent-1',
          conversationId: 'conv-1',
          status: FlowExecutionStatus.COMPLETED,
          triggeredBy: FlowExecutionTrigger.MANUAL,
          input: { email: 'test@example.com', name: 'Alice' },
        }),
      );
      expect(mockExecutionRepo.save).toHaveBeenCalled();
    });

    it('executes configured actions and includes results', async () => {
      const actionResults = [{ action: 'webhook', success: true, details: { event: 'conversation.closed' } }];
      mockActionExecutor.execute.mockResolvedValueOnce(actionResults);
      mockFlowRepo.findOne.mockResolvedValue({
        id: 'flow-1',
        tenantId: 't-1',
        agentId: 'agent-1',
        title: 'Contact',
        fields: [],
        actions: [{ type: 'webhook', config: { event: 'conversation.closed' } }],
      });

      const result = await service.processFlowResponse('t-1', 'conv-1', 'flow-1', {});

      expect(result.actionResults).toEqual(actionResults);
      expect(mockExecutionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          output: expect.objectContaining({ actionResults }),
        }),
      );
    });

    it('throws NotFoundException when flow does not exist', async () => {
      mockFlowRepo.findOne.mockResolvedValue(null);
      await expect(service.processFlowResponse('t-1', 'conv-1', 'flow-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('findExecutions', () => {
    it('returns paginated executions for a tenant', async () => {
      const executions = [{ id: 'exec-1' }] as FlowExecution[];
      mockExecutionRepo.findAndCount.mockResolvedValue([executions, 1]);

      const result = await service.findExecutions('t-1', undefined, 1, 10);

      expect(result.data).toBe(executions);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockExecutionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1' },
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('filters by flowId when provided', async () => {
      mockExecutionRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findExecutions('t-1', 'flow-1', 1, 10);
      expect(mockExecutionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', flowId: 'flow-1' },
        }),
      );
    });
  });
});
