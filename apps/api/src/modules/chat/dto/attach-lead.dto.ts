import { IsUUID } from 'class-validator';

export class AttachLeadDto {
  @IsUUID()
  leadId: string;
}
