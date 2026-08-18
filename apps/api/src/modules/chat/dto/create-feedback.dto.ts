import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() userMessage: string;
  @IsString() @IsNotEmpty() originalReply: string;
  @IsString() @IsNotEmpty() correctedReply: string;
  @IsString() @IsOptional() reason?: string;
}
