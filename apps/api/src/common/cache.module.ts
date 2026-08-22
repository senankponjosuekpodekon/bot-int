import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CryptoService } from './crypto.service';

@Global()
@Module({
  providers: [CacheService, CryptoService],
  exports: [CacheService, CryptoService],
})
export class CacheModule {}
