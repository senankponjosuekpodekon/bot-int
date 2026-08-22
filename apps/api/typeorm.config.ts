import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const envCandidates = [process.env.API_ENV_PATH, join(__dirname, '.env')].filter(
  (candidate): candidate is string => !!candidate,
);

for (const path of envCandidates) {
  if (existsSync(path)) {
    loadEnv({ path, override: true });
    break;
  }
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stiamond_agent',
  entities: [join(__dirname, 'src/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'src/migrations/*.{ts,js}')],
  synchronize: process.env.DB_SYNC === 'true' || process.env.NODE_ENV !== 'production',
  logging: process.env.TYPEORM_LOGGING === 'true' || process.env.NODE_ENV === 'development',
});

export default dataSource;
