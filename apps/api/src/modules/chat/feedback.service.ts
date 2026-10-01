import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentFeedback } from './agent-feedback.entity';

// Operator feedback on agent replies (corrections applied to the system prompt
// by the chat pipeline).
@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(AgentFeedback)
    private readonly feedbackRepo: Repository<AgentFeedback>,
  ) {}

  createFeedback(
    tenantId: string,
    agentId: string,
    userMessage: string,
    originalReply: string,
    correctedReply: string,
    reason?: string,
  ): Promise<AgentFeedback> {
    return this.feedbackRepo.save(
      this.feedbackRepo.create({ tenantId, agentId, userMessage, originalReply, correctedReply, reason }),
    );
  }

  getFeedback(tenantId: string, agentId?: string): Promise<AgentFeedback[]> {
    if (agentId) {
      return this.feedbackRepo.find({ where: { tenantId, agentId }, order: { createdAt: 'DESC' } });
    }
    return this.feedbackRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async deleteFeedback(id: string, tenantId: string): Promise<void> {
    await this.feedbackRepo.delete({ id, tenantId });
  }
}
