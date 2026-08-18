import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, MinLength, IsArray, IsOptional } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsArray()
  @IsOptional()
  scopes?: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  list(@Request() req) {
    return this.apiKeyService.list(req.user.tenantId);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateApiKeyDto) {
    const result = await this.apiKeyService.create(req.user.tenantId, dto.name, dto.scopes);
    return {
      id: result.apiKey.id,
      name: result.apiKey.name,
      prefix: result.apiKey.prefix,
      key: result.plainKey,
      message: 'Save this key securely. It will not be shown again.',
    };
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.apiKeyService.delete(req.user.tenantId, id);
  }

  @Post(':id/revoke')
  revoke(@Request() req, @Param('id') id: string) {
    return this.apiKeyService.revoke(req.user.tenantId, id);
  }
}
