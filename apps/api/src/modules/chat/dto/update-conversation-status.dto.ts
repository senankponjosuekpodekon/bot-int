import { IsEnum } from 'class-validator';
import { ConversationStatus } from '../conversation.entity';

export class UpdateConversationStatusDto {
  @IsEnum(ConversationStatus)
  status: ConversationStatus;
}
