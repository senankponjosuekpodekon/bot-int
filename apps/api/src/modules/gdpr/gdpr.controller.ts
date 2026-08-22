import {
  Controller,
  Get,
  Delete,
  Request,
  UseGuards,
  StreamableFile,
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/user.entity';
import { GdprService } from './gdpr.service';
import { Response } from 'express';

@ApiTags('gdpr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all tenant data as JSON (GDPR Article 20 — data portability)' })
  @ApiResponse({ status: 200, description: 'JSON file with all tenant data' })
  async exportData(@Request() req, @Res() res: Response) {
    const data = await this.gdprService.exportTenantData(req.user.tenantId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stiamond-data-export-${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Delete('delete')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete all tenant data (GDPR Article 17 — right to erasure)' })
  @ApiResponse({ status: 200, description: 'Deletion scheduled with confirmation token' })
  async deleteData(@Request() req, @Query('confirm') confirm: string) {
    if (confirm !== 'DELETE') {
      return { error: 'Pass ?confirm=DELETE to confirm deletion. This action is irreversible.' };
    }
    return this.gdprService.deleteTenantData(req.user.tenantId);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get audit log for the tenant (GDPR Article 15 — right of access)' })
  @ApiResponse({ status: 200, description: 'Audit log entries' })
  async getAuditLog(@Request() req, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.gdprService.getAuditLog(req.user.tenantId, Number(page), Number(limit));
  }
}
