import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTextDocumentDto {
  @IsString()
  @MinLength(5)
  content: string;

  @IsString()
  @IsOptional()
  filename?: string;

  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsBoolean()
  @IsOptional()
  shared?: boolean;
}
