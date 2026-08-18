import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SuperAdminGuard } from './super-admin.guard';
import { User } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Subscription } from '../billing/subscription.entity';
import { Conversation } from '../chat/conversation.entity';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Subscription, Conversation, Agent, Lead]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret:
          process.env.JWT_SECRET ||
          (process.env.NODE_ENV !== 'production'
            ? 'dev_only_secret_change_me'
            : (() => {
                throw new Error('JWT_SECRET env var is required in production');
              })()),
      }),
    }),
  ],
  providers: [AdminService, SuperAdminGuard],
  controllers: [AdminController],
  exports: [AdminService, SuperAdminGuard],
})
export class AdminModule {}
