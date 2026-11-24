import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import type { DatabaseConfig } from './config';

export async function initializeSchema(config: DatabaseConfig, schemaPath: string): Promise<void> {
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(config.database)) throw new Error('Nome do banco inválido.');
  const { database, ...connectionConfig } = config;
  const connection = await mysql.createConnection({
    ...connectionConfig,
    multipleStatements: false,
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.changeUser({ database });
    const schema = await readFile(schemaPath, 'utf8');
    for (const statement of schema
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean))
      await connection.query(statement);
  } finally {
    await connection.end();
  }
}
