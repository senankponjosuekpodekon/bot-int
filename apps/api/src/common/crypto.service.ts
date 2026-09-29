import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const CIPHERTEXT_PREFIX = 'enc:v1:';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('ENCRYPTION_KEY');
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production');
    }
    this.key = scryptSync(secret || 'dev_only_secret_change_me', 'salt', 32);
  }

  isEncrypted(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(CIPHERTEXT_PREFIX);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return CIPHERTEXT_PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const raw = ciphertext.startsWith(CIPHERTEXT_PREFIX)
      ? ciphertext.slice(CIPHERTEXT_PREFIX.length)
      : ciphertext;
    const data = Buffer.from(raw, 'base64');
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
