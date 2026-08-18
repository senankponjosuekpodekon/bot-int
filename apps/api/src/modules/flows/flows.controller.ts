import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { FlowsService } from './flows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateFlowDto } from './dto/update-flow.dto';

class FlowFieldDto {
  @IsString() id: string;
  @IsString() type: string;
  @IsString() label: string;
  @IsString() @IsOptional() placeholder?: string;
  @IsArray() @IsOptional() options?: { label: string; value: string }[];
  @IsBoolean() @IsOptional() required?: boolean;
}

class CreateFlowDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() fields: any[];
}

class FlowResponseDto {
  @IsString() @IsNotEmpty() conversationId: string;
  @IsString() @IsNotEmpty() flowId: string;
  @IsObject() responses: Record<string, string>;
}

@UseGuards(JwtAuthGuard)
@Controller('flows')
export class FlowsController {
  constructor(private readonly service: FlowsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('agent/:agentId')
  findByAgent(@Request() req, @Param('agentId') agentId: string) {
    return this.service.findByAgent(req.user.tenantId, agentId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findById(id, req.user.tenantId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateFlowDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateFlowDto) {
    return this.service.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.delete(id, req.user.tenantId);
  }

  @Post('respond')
  respond(@Request() req, @Body() dto: FlowResponseDto) {
    return this.service.processFlowResponse(req.user.tenantId, dto.conversationId, dto.flowId, dto.responses);
  }
}
