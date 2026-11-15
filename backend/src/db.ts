import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'postgres',
  user: process.env.DB_USER ?? 'admin',
  password: process.env.DB_PASSWORD ?? 'Nin10112006',
  max: 10
});
