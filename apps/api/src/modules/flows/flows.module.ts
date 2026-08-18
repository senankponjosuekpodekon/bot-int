import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatFlow } from './chat-flow.entity';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatFlow])],
  providers: [FlowsService],
  controllers: [FlowsController],
  exports: [FlowsService],
})
export class FlowsModule {}
