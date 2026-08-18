import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('flows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('flows')
export class FlowsController {
  constructor(private readonly service: FlowsService) {}

  @Get()
  @ApiOperation({ summary: 'List all flows' })
  @ApiResponse({ status: 200, description: 'List of flows' })
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'List flows by agent' })
  @ApiResponse({ status: 200, description: 'List of flows for agent' })
  findByAgent(@Request() req, @Param('agentId') agentId: string) {
    return this.service.findByAgent(req.user.tenantId, agentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flow by ID' })
  @ApiResponse({ status: 200, description: 'Flow details' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findById(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new flow' })
  @ApiResponse({ status: 201, description: 'Flow created' })
  create(@Request() req, @Body() dto: CreateFlowDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update flow by ID' })
  @ApiResponse({ status: 200, description: 'Flow updated' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateFlowDto) {
    return this.service.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete flow by ID' })
  @ApiResponse({ status: 200, description: 'Flow deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.delete(id, req.user.tenantId);
  }

  @Post('respond')
  @ApiOperation({ summary: 'Submit flow responses' })
  @ApiResponse({ status: 200, description: 'Flow response processed' })
  respond(@Request() req, @Body() dto: FlowResponseDto) {
    return this.service.processFlowResponse(req.user.tenantId, dto.conversationId, dto.flowId, dto.responses);
  }
}
