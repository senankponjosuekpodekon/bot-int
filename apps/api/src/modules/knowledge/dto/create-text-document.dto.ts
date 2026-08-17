import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTextDocumentDto {
  @IsString()
  @MinLength(5)
  content: string;

  @IsString()
  @IsOptional()
  filename?: string;
}
