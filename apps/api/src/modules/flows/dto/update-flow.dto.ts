import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean, IsObject, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { FlowFieldType } from '../chat-flow.entity';

class FlowFieldDto {
  @IsString() id: string;
  @IsEnum(['buttons', 'dropdown', 'text', 'email', 'phone', 'date', 'number'] as const)
  type: FlowFieldType;
  @IsString() label: string;
  @IsString() @IsOptional() placeholder?: string;
  @IsArray() @IsOptional() options?: { label: string; value: string }[];
  @IsBoolean() @IsOptional() required?: boolean;
}

export class UpdateFlowDto {
  @IsString() @IsOptional() agentId?: string;
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => FlowFieldDto)
  fields?: FlowFieldDto[];
  @IsBoolean() @IsOptional() isActive?: boolean;
}
