import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ChatModule } from './modules/chat/chat.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ProductsModule } from './modules/products/products.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { FlowsModule } from './modules/flows/flows.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { WidgetModule } from './modules/widget/widget.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { SiteModule } from './modules/site/site.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { LoggingMiddleware } from './common/logging.middleware';
import { CacheModule } from './common/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('THROTTLE_TTL', 60000),
        limit: config.get<number>('THROTTLE_LIMIT', 100),
      }],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'stiamond_agent'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        poolSize: config.get<number>('DB_POOL_SIZE', 20),
        extra: {
          max: config.get<number>('DB_POOL_SIZE', 20),
          connectionTimeoutMillis: 10000,
        },
      }),
    }),
    CacheModule,
    AuthModule,
    TenantsModule,
    AgentsModule,
    ChatModule,
    KnowledgeModule,
    LeadsModule,
    ProductsModule,
    AnalyticsModule,
    IntegrationsModule,
    FlowsModule,
    IntelligenceModule,
    QuotesModule,
    WidgetModule,
    NotificationsModule,
    SurveysModule,
    SiteModule,
    BillingModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
