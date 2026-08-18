import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ConversationChannel, ConversationStatus, FunnelStage, AcquisitionChannel } from '../conversation.entity';
import { LeadStatus } from '../../leads/lead.entity';

export class ListConversationsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsEnum(ConversationChannel)
  @IsOptional()
  channel?: ConversationChannel;

  @IsString()
  @IsOptional()
  search?: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  })
  @IsBoolean()
  @IsOptional()
  hasLead?: boolean;

  @IsEnum(LeadStatus)
  @IsOptional()
  leadStatus?: LeadStatus;

  @IsEnum(FunnelStage)
  @IsOptional()
  funnelStage?: FunnelStage;

  @IsEnum(AcquisitionChannel)
  @IsOptional()
  acquisitionChannel?: AcquisitionChannel;
}
