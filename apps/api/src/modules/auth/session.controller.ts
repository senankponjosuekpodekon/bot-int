import { Controller, Get, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionService } from './session.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'Active sessions' })
  async findAll(@Request() req) {
    return this.sessionService.findByUser(req.user.sub);
  }

  @Delete(':tokenId')
  @ApiOperation({ summary: 'Revoke a session by token id' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async remove(@Request() req, @Param('tokenId') tokenId: string) {
    await this.sessionService.remove(req.user.sub, tokenId);
    return { revoked: true };
  }
}
