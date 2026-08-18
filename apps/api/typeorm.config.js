"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const path_1 = require("path");
const envCandidates = [process.env.API_ENV_PATH, (0, path_1.join)(__dirname, '.env')].filter((candidate) => !!candidate);
for (const path of envCandidates) {
    if ((0, fs_1.existsSync)(path)) {
        (0, dotenv_1.config)({ path, override: true });
        break;
    }
}
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'stiamond_agent',
    entities: [(0, path_1.join)(__dirname, 'src/**/*.entity.{ts,js}')],
    migrations: [(0, path_1.join)(__dirname, 'src/migrations/*.{ts,js}')],
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true' || process.env.NODE_ENV === 'development',
});
exports.default = dataSource;
//# sourceMappingURL=typeorm.config.js.map