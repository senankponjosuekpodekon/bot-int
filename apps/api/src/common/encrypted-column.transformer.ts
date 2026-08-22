import { ValueTransformer } from 'typeorm';
import { CryptoService } from './crypto.service';

export class EncryptedColumnTransformer implements ValueTransformer {
  constructor(private readonly crypto: CryptoService) {}

  to(value: string | null): string | null {
    if (value == null) return null;
    return this.crypto.encrypt(value);
  }

  from(value: string | null): string | null {
    if (value == null) return null;
    return this.crypto.decrypt(value);
  }
}
